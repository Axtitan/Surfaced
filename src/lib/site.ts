import { safeFetch } from "./safe-fetch";
import type { Check } from "./types";

export type PageInfo = {
  finalUrl: string;
  domain: string;
  title: string;
  siteName: string;
  description: string;
  h1: string;
  lang: string;
  text: string;
  jsonLdTypes: string[];
  hasOg: boolean;
};

// Crawlers and fetchers behind the assistants we check, and the training crawlers next to them.
const AI_BOTS: { token: string; who: string; role: string }[] = [
  { token: "OAI-SearchBot", who: "ChatGPT", role: "search" },
  { token: "ChatGPT-User", who: "ChatGPT", role: "browsing" },
  { token: "GPTBot", who: "OpenAI", role: "training" },
  { token: "Claude-SearchBot", who: "Claude", role: "search" },
  { token: "Claude-User", who: "Claude", role: "browsing" },
  { token: "ClaudeBot", who: "Anthropic", role: "training" },
  { token: "Google-Extended", who: "Gemini", role: "training and grounding" },
  { token: "Googlebot", who: "Google Search (feeds Gemini)", role: "search" },
  { token: "PerplexityBot", who: "Perplexity", role: "search" },
  { token: "CCBot", who: "Common Crawl (used by many models, including DeepSeek)", role: "training" },
];

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

function meta(html: string, key: string) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag ? decode(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "") : "";
}

export function parsePage(html: string, finalUrl: string): PageInfo {
  const jsonLdTypes = new Set<string>();
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (n: unknown): void => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (n && typeof n === "object") {
          const t = (n as Record<string, unknown>)["@type"];
          (Array.isArray(t) ? t : [t]).forEach((x) => typeof x === "string" && jsonLdTypes.add(x));
          Object.values(n).forEach(walk);
        }
      };
      walk(JSON.parse(m[1]));
    } catch { /* ignore invalid JSON-LD */ }
  }
  const body = html.replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
  return {
    finalUrl,
    domain: new URL(finalUrl).hostname.replace(/^www\./, ""),
    title: decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    siteName: meta(html, "og:site_name") || meta(html, "application-name"),
    description: meta(html, "description") || meta(html, "og:description"),
    h1: decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/<[^>]+>/g, " ")),
    lang: html.match(/<html[^>]+lang=["']([^"']+)/i)?.[1] ?? "",
    text: decode(body).slice(0, 6000),
    jsonLdTypes: [...jsonLdTypes],
    hasOg: !!meta(html, "og:title") && !!(meta(html, "og:description") || meta(html, "description")),
  };
}

/** Is "/" blocked for this user agent? Uses the most specific matching group, as crawlers do. */
export function robotsBlocks(robots: string, token: string): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, k, v] = m;
    if (k.toLowerCase() === "user-agent") {
      if (!cur || !lastWasAgent) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && /^(dis)?allow$/i.test(k)) cur.rules.push({ allow: k.toLowerCase() === "allow", path: v });
    }
  }
  const t = token.toLowerCase();
  const group = groups.find((g) => g.agents.includes(t)) ?? groups.find((g) => g.agents.includes("*"));
  if (!group) return false;
  // Longest matching rule wins; "/" (or "/*") disallowed with no equal-or-longer allow means blocked.
  const matches = group.rules.filter((r) => r.path && ("/".startsWith(r.path.replace(/\*$/, "")) || r.path === "/*"));
  if (!matches.length) return false;
  const best = matches.sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow))[0];
  return !best.allow;
}

async function tryText(url: string) {
  try {
    const r = await safeFetch(url, { maxBytes: 300_000, timeoutMs: 6000 });
    return r.status === 200 && !/text\/html/i.test(r.contentType) ? r.body : r.status === 200 && !/<html/i.test(r.body) ? r.body : null;
  } catch {
    return null;
  }
}

/** Fetches the homepage plus robots.txt, llms.txt and sitemap, and grades AI readiness. */
export async function inspectSite(url: URL): Promise<{ page: PageInfo; checks: Check[] }> {
  const home = await safeFetch(url.toString());
  if (home.status >= 400) throw new Error(`The site answered with HTTP ${home.status}.`);
  const page = parsePage(home.body, home.url);
  const origin = new URL(home.url).origin;
  const [robots, llms, sitemap] = await Promise.all([tryText(`${origin}/robots.txt`), tryText(`${origin}/llms.txt`), tryText(`${origin}/sitemap.xml`)]);

  const checks: Check[] = [];
  const blocked = robots ? AI_BOTS.filter((b) => robotsBlocks(robots, b.token)) : [];
  const blockedSearch = blocked.filter((b) => b.role !== "training");
  checks.push({
    id: "crawlers",
    label: "AI crawlers can read the site",
    status: blockedSearch.length ? "fail" : blocked.length ? "warn" : "pass",
    detail: blocked.length ? `robots.txt blocks ${blocked.map((b) => `${b.token} (${b.who}, ${b.role})`).join(", ")}.` : "robots.txt doesn't block any of the AI crawlers we check.",
    fix: blocked.length ? `Remove the Disallow rules for ${blocked.map((b) => b.token).join(", ")} in ${origin}/robots.txt. Blocking search and browsing bots stops assistants from reading or citing you.` : undefined,
  });
  checks.push({
    id: "https",
    label: "Served over HTTPS",
    status: home.url.startsWith("https:") ? "pass" : "fail",
    detail: home.url.startsWith("https:") ? "The site uses HTTPS." : "The site is served over plain HTTP.",
    fix: home.url.startsWith("https:") ? undefined : "Turn on HTTPS. Most hosts do it for free.",
  });
  const readable = page.text.length > 400;
  checks.push({
    id: "readable",
    label: "Content is readable without JavaScript",
    status: readable ? "pass" : "fail",
    detail: readable ? "The homepage HTML carries readable text." : "The homepage HTML has almost no text. AI crawlers mostly don't run JavaScript, so they see an empty page.",
    fix: readable ? undefined : "Render key pages on the server (SSR or static), or at least put the product name, what it does and who it's for in the HTML.",
  });
  checks.push({
    id: "description",
    label: "Clear title and description",
    status: page.title && page.description.length >= 50 ? "pass" : "warn",
    detail: page.description ? `Description: "${page.description.slice(0, 160)}"` : "No meta description.",
    fix: page.description.length >= 50 ? undefined : 'Add a meta description that says plainly what the product is and who it is for, e.g. "Acme is a note-taking app for students."',
  });
  const usefulLd = page.jsonLdTypes.filter((t) => /Organization|Product|SoftwareApplication|MobileApplication|WebApplication|LocalBusiness|Service|Store/i.test(t));
  checks.push({
    id: "schema",
    label: "Structured data (JSON-LD)",
    status: usefulLd.length ? "pass" : "warn",
    detail: usefulLd.length ? `Found ${usefulLd.join(", ")}.` : page.jsonLdTypes.length ? `Found ${page.jsonLdTypes.join(", ")}, but nothing describing the business or product.` : "No JSON-LD found.",
    fix: usefulLd.length ? undefined : "Add Organization plus SoftwareApplication, Product or LocalBusiness JSON-LD. Surfaced generates a snippet for you below.",
  });
  checks.push({
    id: "llms",
    label: "llms.txt",
    status: llms ? "pass" : "warn",
    detail: llms ? "Found /llms.txt." : "No /llms.txt. It's an emerging convention, not a confirmed ranking factor, but it's cheap and gives assistants a clean summary.",
    fix: llms ? undefined : "Publish /llms.txt. Surfaced generates one for you below.",
  });
  const hasSitemap = !!sitemap || /^sitemap:/im.test(robots ?? "");
  checks.push({
    id: "sitemap",
    label: "Sitemap",
    status: hasSitemap ? "pass" : "warn",
    detail: hasSitemap ? "A sitemap is published." : "No sitemap at /sitemap.xml or in robots.txt.",
    fix: hasSitemap ? undefined : "Publish /sitemap.xml and list it in robots.txt so search-backed assistants find every page.",
  });
  checks.push({
    id: "og",
    label: "Social preview tags",
    status: page.hasOg ? "pass" : "warn",
    detail: page.hasOg ? "Open Graph title and description are set." : "Open Graph tags are missing.",
    fix: page.hasOg ? undefined : "Add og:title, og:description and og:image. Directories and aggregators pull from them.",
  });
  return { page, checks };
}
