// Shapes shared by the API routes and the browser.
import type { Mode, ProviderId } from "./providers/types";

export type { Mode, ProviderId };

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
  provider: ProviderId;
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
