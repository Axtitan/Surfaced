/* Plans and what each allows (ARCHITECTURE §3.3, §11.2). The one place prices and limits live: the pricing page reads
   from here, and the server will enforce from here once accounts and billing exist. Until then only Free is on sale. */

export type PlanId = "free" | "starter" | "growth" | "agency";
export type Feature = "citations" | "verify" | "whiteLabel";

export const PLANS = {
  free:    { sites: 1,  prompts: 10, autoScansPerMonth: 0,   schedule: null,      destinationsShown: 10,   seats: 1,  citations: false, verify: false, whiteLabel: false },
  starter: { sites: 1,  prompts: 15, autoScansPerMonth: 6,   schedule: "weekly",  destinationsShown: null, seats: 1,  citations: true,  verify: false, whiteLabel: false },
  growth:  { sites: 3,  prompts: 30, autoScansPerMonth: 30,  schedule: "2x-week", destinationsShown: null, seats: 3,  citations: true,  verify: true,  whiteLabel: false },
  agency:  { sites: 15, prompts: 30, autoScansPerMonth: 150, schedule: "2x-week", destinationsShown: null, seats: 10, citations: true,  verify: true,  whiteLabel: true  },
} as const;

export function can(plan: PlanId, feature: Feature): boolean {
  return PLANS[plan][feature];
}

/** How many of a monthly allowance are left, given what was used. Never negative. */
export function remaining(plan: PlanId, what: "autoScans" | "sites", used: number): number {
  const limit = what === "autoScans" ? PLANS[plan].autoScansPerMonth : PLANS[plan].sites;
  return Math.max(0, limit - used);
}

export type PlanCard = { id: PlanId | "sprint"; name: string; price: string; period: string; tag: string; items: string[]; available: boolean };

/** What the pricing page shows. `available: false` plans say "Coming soon" and can't be bought (F-10). */
export const PLAN_CARDS: PlanCard[] = [
  { id: "free", name: "Free", price: "$0", period: "forever", tag: "Ask in your own AI accounts", available: true,
    items: ["Checks saved in your browser", "ChatGPT, Claude, Gemini and DeepSeek", "Paste answers from the apps you already use", "Ranked submission list and listing kit", "Form-filling browser extension"] },
  { id: "starter", name: "Starter", price: "$29", period: "per month", tag: "Weekly automatic checks", available: false,
    items: [`${PLANS.starter.prompts} questions on 1 site`, "Asked automatically every week on 4 AIs", "The full submission list and tracker", "Pages AIs cite where competitors appear and you don't", "Email alerts when you're named or dropped"] },
  { id: "growth", name: "Growth", price: "$79", period: "per month", tag: "For small teams", available: false,
    items: [`${PLANS.growth.sites} sites, ${PLANS.growth.prompts} questions each`, "Checks twice a week", "Competitor share of voice", "Listing verification", `${PLANS.growth.seats} seats and exports`] },
  { id: "agency", name: "Agency", price: "$249", period: "per month", tag: "For agencies and freelancers", available: false,
    items: [`${PLANS.agency.sites} client sites`, "Client workspaces", "White-label reports and share links", `${PLANS.agency.seats} seats`] },
  { id: "sprint", name: "Listing Sprint", price: "$399", period: "one-off", tag: "We submit for you", available: false,
    items: ["We submit to the top 40 places for you", "Accounts created in your name, so you own them", "Re-check and report after 30 days"] },
];
