import type { AiId, CitedPage, Profile, Run } from "./types";

/* Cited-page gaps (ARCHITECTURE §9.7), the parts that run in the browser: which pages the AIs cite most, the summary
   line, and the drafted pitch. Fetching the pages happens on the server (server/crawl.ts). */

export type CitedUrl = { url: string; domain: string; title: string; count: number; providers: AiId[] };

const TRACKING = /^(utm_.*|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|ref|ref_src|srsltid|_hsenc|_hsmi)$/i;

/** One form per page: http(s) only, no fragment, no tracking parameters, no credentials. Null for anything else. */
export function canonicalUrl(u: string): string | null {
  try {
    const url = new URL(u);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    url.hash = "";
    for (const k of [...url.searchParams.keys()]) if (TRACKING.test(k)) url.searchParams.delete(k);
    return url.toString();
  } catch {
    return null;
  }
}

const bareHost = (u: string) => new URL(u).hostname.toLowerCase().replace(/^www\./, "");

/** The most-cited pages across these answers, most cited first. Each answer counts a page once; the product's own site
    is left out, since the question is where else the AIs look. */
export function citedUrls(runs: Run[], ownDomain: string, limit = 30): CitedUrl[] {
  const own = ownDomain.toLowerCase().replace(/^www\./, "");
  const found = new Map<string, CitedUrl>();
  for (const r of runs) {
    if (!r.ok) continue;
    const seen = new Set<string>();
    for (const s of r.sources ?? []) {
      const url = canonicalUrl(s.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const domain = bareHost(url);
      if (own && (domain === own || domain.endsWith(`.${own}`))) continue;
      const cur = found.get(url) ?? { url, domain, title: "", count: 0, providers: [] };
      cur.count++;
      if (!cur.title && s.title) cur.title = s.title.slice(0, 200);
      if (!cur.providers.includes(r.provider)) cur.providers.push(r.provider);
      found.set(url, cur);
    }
  }
  return [...found.values()].sort((a, b) => b.count - a.count || a.url.localeCompare(b.url)).slice(0, limit);
}

export type GapSummary = { checked: number; missing: number; competitors: { name: string; pages: number }[] };

/** "AIs cite these 12 pages. You are missing from 7 of them. Competitors on them: …" */
export function gapSummary(pages: CitedPage[]): GapSummary {
  const checked = pages.filter((p) => p.status === "checked");
  const counts = new Map<string, number>();
  for (const p of checked) for (const c of p.competitors) counts.set(c, (counts.get(c) ?? 0) + 1);
  return {
    checked: checked.length,
    missing: checked.filter((p) => !p.you).length,
    competitors: [...counts].map(([name, n]) => ({ name, pages: n })).sort((a, b) => b.pages - a.pages || a.name.localeCompare(b.name)),
  };
}

const list = (names: string[]) => names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** A short outreach email the user edits and sends themselves (the "Pitch" action). Built from the profile, not by an
    AI, so it says nothing the user hasn't told us. */
export function pitchDraft(profile: Profile, page: Pick<CitedPage, "url" | "title" | "domain" | "competitors">): { subject: string; body: string } {
  const where = page.title ? `"${page.title}"` : `your page on ${page.domain}`;
  const what = profile.listing.tagline || profile.listing.shortDescription || profile.category;
  const rivals = page.competitors.slice(0, 3);
  const lines = [
    "Hi,",
    "",
    `I came across ${where} (${page.url}) and found it useful.${rivals.length ? ` I noticed it covers ${list(rivals)}.` : ""}`,
    "",
    `I work on ${profile.name} (${profile.url})${what ? `: ${what.replace(/\.$/, "")}` : ""}.${profile.audience ? ` It's built for ${profile.audience}.` : ""}`,
    `If it's a fit, would you consider ${rivals.length ? `mentioning it alongside ${rivals[0]}` : "adding it to the page"}? I'm happy to send screenshots, a demo account or anything else that helps you judge it.`,
    "",
    "Thanks for your time,",
    "[Your name]",
  ];
  return { subject: `A suggestion for ${page.title ? page.title.slice(0, 80) : page.domain}`, body: lines.join("\n") };
}
