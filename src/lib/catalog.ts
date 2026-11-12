import data from "../../data/destinations.json";
import type { Destination } from "./types";
import { safeHref } from "./safe-href";

/* The Submitlist catalog (CC0) as the marketing pages see it. Counts come from the data at build time, so they can't
   drift from what the app ranks (F-20). */

const all = (data as { destinations: Destination[]; syncedOn?: string }).destinations;

export const CATALOG_COUNT = all.length;
export const CATALOG_SYNCED_ON = (data as { syncedOn?: string }).syncedOn ?? "";
export const formatCount = (n: number) => n.toLocaleString("en-US");

export const TYPE_NAMES: Record<string, string> = {
  directory: "Directories and comparison sites", "product-launch-site": "Launch sites", citation: "Press and citation sites",
  newsletter: "Newsletters", community: "Communities", marketplace: "Marketplaces", subreddit: "Subreddits", github: "GitHub awesome lists",
};

/** Entries with enough real detail for a guide page of their own; thin entries are skipped (§17.2). */
export const GUIDES: Destination[] = all
  .filter((d) => d.type !== "subreddit" && d.type !== "github" && (d.description?.length ?? 0) >= 120 && d.dr != null && safeHref(d.url))
  .sort((a, b) => (b.dr ?? 0) - (a.dr ?? 0));

export const guideBySlug = (slug: string) => GUIDES.find((d) => d.slug === slug);

export const typeCounts = () => {
  const out: Record<string, number> = {};
  for (const d of all) out[d.type] = (out[d.type] ?? 0) + 1;
  return out;
};
