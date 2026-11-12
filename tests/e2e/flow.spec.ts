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

test("check tabs: overview, cited pages, listing verification, print view and delete", async ({ page }) => {
  await startCheck(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Brightloom", { timeout: 20_000 });

  // An answer that cites a comparison page. The crawler and the verifier are mocked: these tests never fetch real sites.
  await page.route("**/api/cited-pages", (r) => r.fulfill({ json: { checkedAt: Date.now(), limit: 5, pages: [
    { url: "https://alternativeto.net/software/ledgerleaf/", domain: "alternativeto.net", title: "Ledgerleaf alternatives", status: "checked", you: false, linksYou: false, competitors: ["Ledgerleaf", "Quillworks"],
      destination: { slug: "alternativeto", name: "AlternativeTo", url: "https://alternativeto.net/", type: "directory" } },
  ] } }));
  await page.route("**/api/verify-listing", (r) => r.fulfill({ json: { status: "live", checkedAt: Date.now(), title: "Brightloom", link: "nofollow" } }));

  await page.getByRole("tab", { name: /answers/i }).click();
  await page.getByRole("textbox", { name: "ChatGPT's answer" }).fill("1. **Ledgerleaf**\n2. **Quillworks**\nSee https://alternativeto.net/software/ledgerleaf/");
  await page.getByRole("button", { name: /save and next/i }).click();

  // Overview: the score and a next step that leads to the cited pages.
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { name: "Where you stand" })).toBeVisible();
  await page.getByRole("button", { name: "Check cited pages" }).click();
  await expect(page.getByRole("tab", { name: "Cited pages" })).toHaveAttribute("aria-selected", "true");

  // Cited pages: check, see the gap, open the pitch.
  await page.getByRole("button", { name: /check the top 1 page/i }).click();
  await expect(page.getByText(/you're missing from/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Submit to AlternativeTo" })).toBeVisible();
  await page.getByRole("button", { name: "Pitch the author" }).click();
  await expect(page.getByRole("textbox", { name: /email to the page's author/i })).toHaveValue(/Ledgerleaf and Quillworks/);

  // Print view: navigation and controls are left out, the report header is shown.
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("tablist")).toBeHidden();
  await expect(page.getByText(/^Surfaced report · Cited pages/)).toBeVisible();
  await page.emulateMedia({ media: "screen" });

  // Listing verification on a submitted listing.
  await page.getByRole("tab", { name: "Get listed" }).click();
  const status = page.getByRole("combobox", { name: /^Status for / }).first();
  await status.selectOption("submitted");
  await page.getByRole("button", { name: "Verify the listing" }).first().click();
  await page.getByRole("textbox", { name: /address of your listing/i }).fill("https://alternativeto.net/software/brightloom/");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByText("Live · Links to your site (nofollow)")).toBeVisible();
  await expect(status).toHaveValue("live");

  // The check's own settings delete just this check.
  await page.getByRole("tab", { name: "Settings" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete this check" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("link", { name: "Brightloom", exact: true })).toHaveCount(0);
});
