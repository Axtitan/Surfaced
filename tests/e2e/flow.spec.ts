import { ANALYSIS, expect, startCheck, test } from "./fixtures";

/* The free-mode journey (ROADMAP Phase 0): create a check → paste an answer → see the score → open a destination →
   mark it submitted. Everything stays in the browser. */
// These journeys visit several pages, and the dev server compiles each on first visit.
test.beforeEach(() => test.slow());

test("free mode: from a website to a submitted listing", async ({ page, context }) => {
  await startCheck(page);

  // The check page loads on the client after the address changes; give the first compile in dev time.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Brightloom", { timeout: 20_000 });

  // Paste an answer that names the product.
  await page.getByRole("tab", { name: /answers/i }).click();
  const box = page.getByRole("textbox", { name: "ChatGPT's answer" });
  await box.fill("Here are good options:\n1. **Ledgerleaf** - popular\n2. **Brightloom** - simple invoicing for freelancers");
  await page.getByRole("button", { name: /save and next/i }).click();
  await expect(page.getByText(/named you|recommend you/i).first()).toBeVisible();

  // The check is in the dashboard after a reload.
  await page.goto("/app");
  await expect(page.getByRole("link", { name: "Brightloom", exact: true })).toBeVisible();

  // Open a destination and mark it submitted.
  await page.goto(`/app/p/${ANALYSIS.profile.domain}#listings`);
  // Inside main: in dev, Next.js adds its own "Open Next.js Dev Tools" button.
  const firstOpen = page.getByRole("main").getByRole("button", { name: /^Open / }).first();
  await expect(firstOpen).toBeVisible();
  const popup = context.waitForEvent("page");
  await firstOpen.click();
  await (await popup).close();
  const status = page.getByRole("combobox", { name: /^Status for / }).first();
  await status.selectOption("submitted");
  await page.reload();
  await expect(page.getByRole("combobox", { name: /^Status for / }).first()).toHaveValue("submitted");
});

test("unsaved paste survives switching questions (F-32)", async ({ page }) => {
  await startCheck(page);
  await page.getByRole("tab", { name: /answers/i }).click();

  const box = page.getByRole("textbox", { name: "ChatGPT's answer" });
  await box.fill("A draft that isn't saved yet.");
  await page.getByRole("button", { name: ANALYSIS.prompts[1] }).click();
  await expect(box).toHaveValue("");
  await page.getByRole("button", { name: ANALYSIS.prompts[0] }).click();
  await expect(box).toHaveValue("A draft that isn't saved yet.");
});

test("settings deletes everything in this browser", async ({ page }) => {
  await startCheck(page);

  await page.goto("/app/settings");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /delete all data/i }).click();
  await expect(page.getByText(/was deleted/)).toBeVisible();
  await page.goto("/app");
  await expect(page.getByText(/find out if ai recommends you/i)).toBeVisible();
});
