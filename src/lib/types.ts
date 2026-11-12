// Shapes shared by the API routes and the browser.
import type { AiId, Mode, ProviderId } from "./providers/types";

export type { AiId, Mode, ProviderId };

export const CATEGORIES = [
  "ai", "analytics", "business", "community", "design", "developer-tools", "ecommerce",
  "indie", "marketing", "productivity", "saas", "social", "software", "startup",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const KINDS = ["software", "mobile-app", "browser-extension", "ecommerce", "local-business", "service", "other"] as const;
export type Kind = (typeof KINDS)[number];

export type Listing = {
  tagline: string;
  shortDescription: string;
  longDescription: string;
  keywords: string[];
  pricing: string;
  platforms: string[];
};

export type Profile = {
  url: string;
  domain: string;
  name: string;
  aliases: string[];
  kind: Kind;
  category: string;
  audience: string;
  location: string;
  competitors: string[];
  categories: Category[];
  listing: Listing;
};

export type Check = { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string; fix?: string };

export type Analysis = { profile: Profile; prompts: string[]; checks: Check[]; profiledBy: "claude" | "page" };

export type Run = {
  id: string;
  prompt: string;
  provider: AiId;
  mode: Mode;
  sample: number;
  ok: boolean;
  error?: string;
  /** The answer names the product. */
  mentioned: boolean;
  /** One of the answer's sources is the product's own site. */
  cited: boolean;
  /** 1-based position among the products the answer lists, when it lists them. */
  rank: number | null;
  evidence?: string;
  /** Products named instead of (or as well as) this one. */
  others: string[];
  sources: { url: string; title?: string; domain: string }[];
  text: string;
  model: string;
  demo?: boolean;
  /** "paste": the user asked in the consumer app and pasted the answer (free mode). */
  via?: "api" | "paste";
  ms: number;
};

export type Destination = {
  slug: string;
  name: string;
  type: string;
  url: string;
  site: string;
  description: string;
  pricing: string;
  pricingNote?: string;
  link: string;
  dr?: number;
  traffic?: number;
  categories: string[];
  eligibility?: string;
  promotion?: string;
  rules?: string;
};

export type PlannedDestination = Destination & { score: number; reasons: string[]; citedByAI: number };

/** One page the AIs cited, after Surfaced fetched it (§9.7). Only parsed facts, never the page itself (§12.8 rule 8). */
export type CitedPage = {
  url: string;
  domain: string;
  title: string;
  /** checked: fetched and read. blocked: robots.txt or the deny-list asks us not to. failed: couldn't read it.
      skipped: not reached before the time limit. */
  status: "checked" | "blocked" | "failed" | "skipped";
  note?: string;
  /** The page names the product. */
  you: boolean;
  /** The page links to the product's site. */
  linksYou: boolean;
  /** Tracked competitors the page names. */
  competitors: string[];
  /** The catalog listing this page belongs to, when there is one: the "Submit" action. */
  /** The catalog listing this page belongs to. `type` "citation" means an editorial site with its own rules (Wikipedia), not a form. */
  destination?: { slug: string; name: string; url: string; type?: string };
};

export type CitedReport = { checkedAt: number; pages: CitedPage[] };

/** How a listing links to the product's site. "follow" passes search credit; the others are marked as not vouching. */
export type LinkKind = "follow" | "nofollow" | "ugc" | "sponsored";

export type ListingCheck = {
  /** live: the page loads and names the product. missing: it loads but doesn't. blocked/failed: couldn't read it. */
  status: "live" | "missing" | "blocked" | "failed";
  checkedAt: number;
  title: string;
  /** The strongest link to the product's site on the page, or null if there is none. */
  link: LinkKind | null;
  note?: string;
};
