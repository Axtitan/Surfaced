import { test as base, expect, type Page } from "@playwright/test";

/* Shared setup: block every request that leaves this site, and mock the site reader so tests never fetch a real site. */

export const ANALYSIS = {
  profile: {
    url: "https://example-shop.test", domain: "example-shop.test", name: "Brightloom", aliases: [], kind: "software",
    category: "invoicing app", audience: "freelancers", location: "", competitors: ["Ledgerleaf", "Quillworks"], categories: ["productivity", "business"],
    listing: { tagline: "Invoices in a minute", shortDescription: "Simple invoicing for freelancers.", longDescription: "Brightloom sends invoices and chases late payments for freelancers.", keywords: ["invoicing"], pricing: "Free", platforms: ["Web"] },
  },
  prompts: ["What is the best invoicing app?", "Can you recommend a good invoicing app?", "What are the best alternatives to Ledgerleaf?"],
  checks: [{ id: "robots", label: "AI crawlers can read the site", status: "pass", detail: "No AI crawler is blocked." }],
  profiledBy: "page",
};

export async function isolate(page: Page) {
  // Routes go on the context so popups (directory and chat tabs) are blocked too.
  const ctx = page.context();
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await ctx.route("**/api/analyze", (r) => r.fulfill({ json: ANALYSIS }));
}

export const test = base.extend<{ isolated: void }>({
  isolated: [async ({ page }, use) => { await isolate(page); await use(); }, { auto: true }],
});
export { expect };

/* Starts a free check for the mocked site and waits for its page. The "What do you offer" field appears only once
   /api/providers has answered, so wait for that before filling the form. The first visit to a check page compiles
   it in dev, hence the longer wait for the address. */
export async function startCheck(page: Page) {
  const providers = page.waitForResponse("**/api/providers");
  await page.goto("/app/new");
  await providers;
  await page.getByRole("textbox", { name: /website/i }).fill(ANALYSIS.profile.domain);
  const offer = page.getByRole("textbox", { name: /what do you offer/i });
  if (await offer.isVisible()) await offer.fill("invoicing app");
  await page.getByRole("button", { name: /check my visibility/i }).click();
  await expect(page).toHaveURL(new RegExp(`/app/p/${ANALYSIS.profile.domain.replace(/\./g, "\.")}`), { timeout: 30_000 });
}
