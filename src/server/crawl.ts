import "server-only";
import { matcher, type Brand } from "@/lib/match";
import { destinationForUrl } from "@/lib/plan";
import { FetchRefused, safeFetch, type Fetched } from "@/lib/safe-fetch";
import { parsePage, robotsAllows } from "@/lib/site";
import type { CitedPage, LinkKind, ListingCheck } from "@/lib/types";

/* The cited-page crawler and the listing verifier (ARCHITECTURE §9.7, §9.10). Both read pages chosen by AI answers or
   by users, so both follow every fetcher rule in §12.8: the hardened fetcher, our own user agent, robots.txt, one request
   at a time per site with a pause between, a deny-list, and only parsed facts back to the browser.

   Caches live in this server instance's memory. They are a courtesy to the sites we read, not a guarantee: a durable
   30-day cache comes with the database. */

export const BOT_TOKEN = "SurfacedBot";
const DAY = 86_400_000;
const POLITE_MS = 1000;
const SITES_AT_ONCE = 4;

/** Small time-limited cache that forgets the oldest entry when full. */
class TtlCache<T> {
  private m = new Map<string, { at: number; v: T }>();
  constructor(private max: number, private ttl: number) {}
  get(k: string, now: number): T | undefined {
    const e = this.m.get(k);
    if (!e) return undefined;
    if (now - e.at > this.ttl) { this.m.delete(k); return undefined; }
    return e.v;
  }
  set(k: string, v: T, now: number) {
    this.m.delete(k);
    this.m.set(k, { at: now, v });
    if (this.m.size > this.max) this.m.delete(this.m.keys().next().value as string);
  }
  clear() { this.m.clear(); }
}

const robotsCache = new TtlCache<string>(1000, DAY);
const pageCache = new TtlCache<CitedPage>(2000, 30 * DAY);
/** For tests. */
export function clearCrawlCaches() { robotsCache.clear(); pageCache.clear(); }

const host = (u: string) => new URL(u).hostname.toLowerCase().replace(/^www\./, "");
const under = (h: string, root: string) => h === root || h.endsWith(`.${root}`);

/** Domains whose owners asked not to be read, from `CRAWL_DENYLIST` (comma-separated). Subdomains included. */
export function deniedHost(h: string): boolean {
  const list = (process.env.CRAWL_DENYLIST ?? "").split(",").map((s) => s.trim().toLowerCase().replace(/^www\./, "")).filter(Boolean);
  return list.some((d) => under(h.toLowerCase().replace(/^www\./, ""), d));
}

export type CrawlDeps = { fetch: (url: string, opts?: { maxBytes?: number; timeoutMs?: number }) => Promise<Fetched>; sleep: (ms: number) => Promise<void>; now: () => number };
const realDeps: CrawlDeps = { fetch: (u, o) => safeFetch(u, o), sleep: (ms) => new Promise((r) => setTimeout(r, ms)), now: () => Date.now() };

/** robots.txt for an origin. Missing (4xx) allows everything; unreachable (5xx, network) is treated as "disallow all"
    for now, as the major crawlers do. */
async function robotsFor(origin: string, deps: CrawlDeps): Promise<string> {
  const hit = robotsCache.get(origin, deps.now());
  if (hit !== undefined) return hit;
  let txt: string;
  try {
    const r = await deps.fetch(`${origin}/robots.txt`, { maxBytes: 200_000, timeoutMs: 6000 });
    txt = r.status >= 500 ? "User-agent: *\nDisallow: /" : r.status >= 400 ? "" : r.body;
  } catch {
    txt = "User-agent: *\nDisallow: /";
  }
  robotsCache.set(origin, txt, deps.now());
  return txt;
}

/** Visible text of an HTML page, without scripts, styles and markup. */
export function pageText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

/** Every link on the page, resolved against its address. */
export function pageLinks(html: string, base: string): { href: string; rel: string }[] {
  const out: { href: string; rel: string }[] = [];
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = m[0];
    const raw = tag.match(/\shref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!raw) continue;
    try { out.push({ href: new URL(raw.replace(/&amp;/g, "&"), base).toString(), rel: (tag.match(/\srel\s*=\s*["']([^"']*)["']/i)?.[1] ?? "").toLowerCase() }); } catch { /* not a URL */ }
  }
  return out;
}

export type ReadResult =
  | { ok: true; finalUrl: string; html: string }
  | { ok: false; status: "blocked" | "failed"; note: string };

/** Fetches one page under the crawler rules: deny-list, then robots.txt for the exact path, then the page. */
export async function politeRead(url: string, deps: CrawlDeps = realDeps): Promise<ReadResult> {
  const u = new URL(url);
  if (deniedHost(u.hostname)) return { ok: false, status: "blocked", note: "This site asked not to be read by Surfaced." };
  const robots = await robotsFor(u.origin, deps);
  if (!robotsAllows(robots, BOT_TOKEN, `${u.pathname}${u.search}`)) return { ok: false, status: "blocked", note: "The site's robots.txt asks crawlers not to read this page." };
  await deps.sleep(POLITE_MS);
  try {
    const r = await deps.fetch(url, { maxBytes: 1_000_000, timeoutMs: 8000 });
    if (r.status === 401 || r.status === 403 || r.status === 429) return { ok: false, status: "failed", note: `The site turned away our reader (HTTP ${r.status}). Open the page to check it yourself.` };
    if (r.status >= 400) return { ok: false, status: "failed", note: `The page answered with HTTP ${r.status}.` };
    if (!r.body) return { ok: false, status: "failed", note: "The page isn't text we can read." };
    return { ok: true, finalUrl: r.url, html: r.body };
  } catch (e) {
    return { ok: false, status: "failed", note: e instanceof FetchRefused ? e.message : "We couldn't load the page." };
  }
}

const cacheKey = (url: string, brand: Brand, competitors: string[]) =>
  JSON.stringify([url, brand.name, brand.aliases, brand.domain, [...competitors].sort()]);

/** Reads one cited page and records whether it names the product, links to it, and which competitors it names. */
async function checkOne(url: string, brand: Brand, competitors: string[], deps: CrawlDeps): Promise<CitedPage> {
  const d = destinationForUrl(url);
  const base: CitedPage = {
    url, domain: host(url), title: "", status: "failed", you: false, linksYou: false, competitors: [],
    destination: d ? { slug: d.slug, name: d.name, url: d.url, type: d.type } : undefined,
  };
  const read = await politeRead(url, deps);
  if (!read.ok) return { ...base, status: read.status, note: read.note };
  const text = pageText(read.html);
  const own = brand.domain.toLowerCase().replace(/^www\./, "");
  const links = pageLinks(read.html, read.finalUrl);
  return {
    ...base,
    title: parsePage(read.html, read.finalUrl).title.slice(0, 200),
    status: "checked",
    you: matcher(brand).test(text) >= 0,
    linksYou: !!own && links.some((l) => { try { return under(host(l.href), own); } catch { return false; } }),
    competitors: competitors.filter((c) => matcher({ name: c, aliases: [], domain: "" }).test(text) >= 0),
  };
}

/** Checks cited pages, in the order given. Sites are read in parallel (a few at a time), pages on one site one after
    another with a pause. Pages not reached before `deadline` come back as "skipped". */
export async function checkCitedPages(
  urls: string[], brand: Brand, competitors: string[],
  { deadline, signal, deps = realDeps }: { deadline: number; signal?: AbortSignal; deps?: CrawlDeps },
): Promise<CitedPage[]> {
  const results = new Map<string, CitedPage>();
  const bySite = new Map<string, string[]>();
  for (const u of urls) {
    const cached = pageCache.get(cacheKey(u, brand, competitors), deps.now());
    if (cached) { results.set(u, cached); continue; }
    const h = host(u);
    bySite.set(h, [...(bySite.get(h) ?? []), u]);
  }
  const sites = [...bySite.values()];
  const worker = async () => {
    for (let site = sites.shift(); site; site = sites.shift()) {
      for (const u of site) {
        if (signal?.aborted || deps.now() > deadline) {
          results.set(u, { url: u, domain: host(u), title: "", status: "skipped", note: "Not reached in time. Check again to continue.", you: false, linksYou: false, competitors: [] });
          continue;
        }
        const page = await checkOne(u, brand, competitors, deps);
        results.set(u, page);
        if (page.status === "checked") pageCache.set(cacheKey(u, brand, competitors), page, deps.now());
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(SITES_AT_ONCE, sites.length) }, worker));
  return urls.map((u) => results.get(u)!);
}

const linkKind = (rel: string): LinkKind => {
  const r = rel.split(/\s+/);
  return r.includes("sponsored") ? "sponsored" : r.includes("ugc") ? "ugc" : r.includes("nofollow") ? "nofollow" : "follow";
};
const LINK_ORDER: LinkKind[] = ["follow", "ugc", "nofollow", "sponsored"];

/** On-demand listing verification (§9.21): the user says a listing is live and gives its address; we read that one page
    and report whether it names the product and how it links to the site. */
export async function verifyListing(url: string, brand: Brand, deps: CrawlDeps = realDeps): Promise<ListingCheck> {
  const checkedAt = deps.now();
  const read = await politeRead(url, deps);
  if (!read.ok) return { status: read.status, checkedAt, title: "", link: null, note: read.note };
  const own = brand.domain.toLowerCase().replace(/^www\./, "");
  const kinds = pageLinks(read.html, read.finalUrl)
    .filter((l) => { try { return !!own && under(host(l.href), own); } catch { return false; } })
    .map((l) => linkKind(l.rel));
  const link = LINK_ORDER.find((k) => kinds.includes(k)) ?? null;
  const named = matcher(brand).test(pageText(read.html)) >= 0;
  return {
    status: named ? "live" : "missing", checkedAt, link,
    title: parsePage(read.html, read.finalUrl).title.slice(0, 200),
    note: named ? undefined : link ? "The page links to your site but doesn't name you." : "The page loads but doesn't mention you yet. Listings can take a few days to appear.",
  };
}
