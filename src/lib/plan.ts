import data from "../../data/destinations.json";
import type { Destination, Kind, PlannedDestination } from "./types";

const ALL = (data as { destinations: Destination[] }).destinations;
export const CATALOG_SYNCED = (data as { syncedOn?: string }).syncedOn;

/* Sites that compare products and list "alternatives to X". AI answers about software lean on these
   heavily (the trick in the video), so they go to the top for software, apps and extensions. */
const COMPARISON = new Set(["alternativeto", "saashub", "g2", "capterra", "getapp", "software-advice", "trustradius", "alternative-me", "crozdesk", "stackshare", "sourceforge", "european-alternatives", "product-hunt", "theres-an-ai-for-that", "futurepedia", "toolify-ai"]);
const LOCAL = /google business|bing places|apple business|yelp|tripadvisor|nextdoor|better business|yellow pages|foursquare|trustpilot|facebook|provenexpert/i;

const TYPE_WEIGHT: Record<string, number> = {
  directory: 30, "product-launch-site": 24, citation: 14, community: 12, newsletter: 10, marketplace: 6, subreddit: 6, github: 4,
};

const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };

function slugKey(d: Destination) {
  return d.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const hostKey = (d: Destination) => hostOf(d.site) || hostOf(d.url);
// Hosts shared by many entries (reddit.com, github.com). A citation of the host says nothing about one subreddit.
const HOST_COUNT = ALL.reduce<Record<string, number>>((m, d) => { const h = hostKey(d); if (h) m[h] = (m[h] ?? 0) + 1; return m; }, {});
// Categories so broad that sharing one says little about fit.
const BROAD = new Set(["software", "startup", "indie", "saas", "business", "community"]);
const GENERIC = new Set(["app", "apps", "tool", "tools", "software", "best", "free", "online", "platform", "service", "services", "simple", "cheap", "based", "with", "your", "that", "open", "source", "taking", "management", "small", "business", "company", "solution", "solutions"]);
const MAX_SUBREDDITS = 12;

/** Niche words from the product's category ("open-source note-taking app" -> note, notetaking, opensource). */
export function nicheTerms(category: string) {
  const lower = category.toLowerCase();
  const words = lower.split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !GENERIC.has(w));
  const joined = (lower.match(/[a-z0-9]+(?:-[a-z0-9]+)+/g) ?? []).map((w) => w.replace(/-/g, ""));
  return [...new Set([...words, ...joined])].slice(0, 12);
}

export function plan(input: { kind: Kind; categories: string[]; citedDomains: Record<string, number>; aiProduct?: boolean; terms?: string[] }) {
  const cats = new Set(input.categories);
  const specific = input.categories.filter((c) => !BROAD.has(c));
  const terms = (input.terms ?? []).map((t) => t.toLowerCase()).filter((t) => t.length >= 4 && /^[a-z0-9]+$/.test(t));
  const software = ["software", "mobile-app", "browser-extension", "other"].includes(input.kind);
  const local = input.kind === "local-business" || input.kind === "service";
  const out: PlannedDestination[] = [];

  for (const d of ALL) {
    const reasons: string[] = [];
    let score = TYPE_WEIGHT[d.type] ?? 5;
    const host = hostKey(d);
    const shared = (HOST_COUNT[host] ?? 0) > 2;
    const hostCites = Object.entries(input.citedDomains).reduce((n, [dom, c]) => (dom === host || dom.endsWith(`.${host}`) || host.endsWith(`.${dom}`) ? n + c : n), 0);
    const cited = shared ? 0 : hostCites;
    if (cited) { score += 50 + Math.min(60, cited * 2.5); reasons.push(`Cited by AI ${cited}× in your scan`); }

    const overlap = d.categories.filter((c) => cats.has(c)).length;
    // A term in the name counts; the description needs two different terms (one word like "note" is too loose).
    const has = (s: string) => { const low = s.toLowerCase(); const joined = low.replace(/-/g, ""); return terms.filter((t) => new RegExp(`(^|[^a-z0-9])${t}`).test(low) || new RegExp(`(^|[^a-z0-9])${t}`).test(joined)); };
    const inName = has(`${d.name} ${d.slug}`);
    const inDesc = has(d.description ?? "");
    const matched = [...new Set([...inName, ...(inDesc.length >= 2 ? inDesc : [])])];

    if (d.type === "subreddit") {
      const fits = matched.length > 0 || d.categories.some((c) => specific.includes(c));
      if (!fits || !["direct_post", "promo_thread", "mod_approval"].includes(d.promotion ?? "")) continue;
      if (matched.length) { score += 20 + Math.min(20, matched.length * 10); reasons.push(`About ${matched.slice(0, 3).join(", ")}`); }
      if (hostCites) { score += 12; reasons.push("AIs cite Reddit for these questions"); }
      reasons.push(d.promotion === "direct_post" ? "Allows posts" : d.promotion === "promo_thread" ? "Has a promo thread" : "Posts need mod approval");
    } else if (shared && hostCites) {
      score += 12; reasons.push(`AIs cite ${host} for these questions`);
    }
    if (d.type !== "subreddit" && matched.length) { score += Math.min(20, matched.length * 8); reasons.push(`About ${matched.slice(0, 3).join(", ")}`); }

    if (d.type !== "subreddit" && (COMPARISON.has(slugKey(d)) || /alternative/i.test(d.name))) {
      if (!software && !d.categories.some((c) => specific.includes(c))) continue;
      if (/futurepedia|ai-for-that|toolify/.test(slugKey(d)) && !cats.has("ai") && !input.aiProduct) continue;
      score += software ? 45 : 15;
      reasons.push("Comparison site AIs read");
    }
    if (LOCAL.test(d.name)) {
      if (local) { score += 40; reasons.push("Local listing assistants check"); } else score -= 10;
    }
    if (d.type === "github") { if (!overlap || !software) continue; reasons.push("Open a pull request to be added"); }
    // AI-tool directories only list AI products.
    if (d.type !== "subreddit" && /AI\b|GPTs?\b/.test(d.name) && !cats.has("ai") && !input.aiProduct) continue;
    // A marketplace only takes products built for that platform.
    if (d.type === "marketplace") {
      const store = (input.kind === "browser-extension" && /add-?ons|extension|chrome web store/i.test(d.name)) || (input.kind === "mobile-app" && /app store|google play|play store/i.test(d.name));
      if (!store && !matched.length) continue;
    }
    if (overlap) {
      const fit = d.categories.filter((c) => cats.has(c));
      score += Math.min(30, fit.reduce((n, c) => n + (BROAD.has(c) ? 6 : 15), 0));
      if (fit.some((c) => !BROAD.has(c)) || !matched.length) reasons.push(`Fits ${fit.join(", ")}`);
    } else if (d.categories.length && !reasons.length) score -= 15;

    if (d.dr) { score += d.dr / 4; if (d.dr >= 80) reasons.push(`DR ${d.dr}`); }
    if (d.pricing === "free") { score += 6; reasons.push("Free"); }
    if (d.pricing === "paid") score -= 8;
    if (d.link === "dofollow") { score += 3; reasons.push("Dofollow link"); }
    out.push({ ...d, score: Math.round(score), reasons, citedByAI: cited });
  }
  out.sort((a, b) => b.score - a.score);
  // Keep the best few subreddits so communities don't crowd out directories.
  let subs = 0;
  const kept = out.filter((d) => d.type !== "subreddit" || ++subs <= MAX_SUBREDDITS);
  out.length = 0;
  out.push(...kept);

  // Domains AIs cited that aren't in the catalog: pages worth getting featured on directly.
  const known = new Set(ALL.map((d) => hostOf(d.site)).concat(ALL.map((d) => hostOf(d.url))));
  const extra = Object.entries(input.citedDomains)
    .filter(([dom]) => dom && ![...known].some((k) => k && (dom === k || dom.endsWith(`.${k}`))))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([domain, count]) => ({ domain, count }));

  return { destinations: out.slice(0, 150), extraCited: extra, total: out.length };
}
