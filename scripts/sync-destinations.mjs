// Pulls the Submitlist catalog (CC0, https://github.com/alvinunreal/awesome-submitlist) and writes the
// trimmed copy the app ships with. Usage: npm run sync:destinations [-- path/to/destinations.json]
import { readFile, writeFile } from "node:fs/promises";

const SOURCE = "https://raw.githubusercontent.com/alvinunreal/awesome-submitlist/main/data/destinations.json";
const local = process.argv[2];
const raw = local ? JSON.parse(await readFile(local, "utf8")) : await (await fetch(SOURCE)).json();

const out = raw.destinations
  .filter((d) => d.submission_url || d.website_url)
  .map((d) => ({
    slug: d.slug,
    name: d.name,
    type: d.type,
    url: d.submission_url || d.website_url,
    site: d.website_url || d.submission_url,
    description: (d.description || "").slice(0, 220),
    pricing: d.pricing,
    pricingNote: d.pricing_note || undefined,
    link: d.link_type,
    dr: d.domain_rating ?? undefined,
    traffic: d.monthly_traffic ?? undefined,
    categories: d.categories || [],
    eligibility: d.eligibility || undefined,
    promotion: d.subreddit?.promotion_mode,
    rules: d.subreddit?.rules_url,
  }));

await writeFile(
  new URL("../data/destinations.json", import.meta.url),
  JSON.stringify({ source: "submitlist.io (CC0)", syncedOn: raw.synced_on, destinations: out })
);
console.log(`Wrote ${out.length} destinations (synced ${raw.synced_on}).`);
