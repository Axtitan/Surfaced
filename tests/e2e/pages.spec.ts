import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

/* Every public page loads, has one h1 and a skip link, and passes axe's WCAG 2.2 AA rules (§16.4). */
const PAGES = [
  "/", "/pricing", "/how-it-works", "/for/agencies", "/for/local-business",
  "/tools/ai-crawler-check", "/tools/llms-txt-generator", "/tools/json-ld-generator",
  "/directories", "/directories/acquire", "/changelog",
  "/privacy", "/terms", "/cookies", "/acceptable-use", "/security", "/subprocessors", "/refunds",
  "/app", "/app/new", "/app/settings",
];

for (const path of PAGES) {
  test(`${path} is accessible`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("a.skip-link")).toHaveAttribute("href", "#main");
    await expect(page.locator("#main")).toHaveCount(1);
    // Let client-side data (provider status, saved checks) settle so axe sees the finished page.
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    // Name each failing element and why, so a failure says what to fix.
    const found = results.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} (${n.any[0]?.message ?? v.help})`));
    expect(found).toEqual([]);
  });
}

test("unknown pages are a 404 with a way home", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("link", { name: /home page/i })).toBeVisible();
});

test("robots, sitemap and llms.txt are served", async ({ request }) => {
  expect(await (await request.get("/robots.txt")).text()).toMatch(/Disallow: \/app/);
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/directories/");
  expect(await (await request.get("/llms.txt")).text()).toMatch(/^# Surfaced/);
});

test("the free crawler check reports problems in words, not only colour", async ({ page }) => {
  await page.route("**/api/tools/site-check", (r) => r.fulfill({ json: { url: "https://example-shop.test/", domain: "example-shop.test", title: "Example", checks: [{ id: "llms", label: "llms.txt", status: "fail", detail: "No llms.txt found.", fix: "Add one." }] } }));
  await page.goto("/tools/ai-crawler-check");
  await page.getByRole("textbox", { name: /website address/i }).fill("example-shop.test");
  await page.getByRole("button", { name: /check my site/i }).click();
  await expect(page.getByText("No llms.txt found.")).toBeVisible();
  await expect(page.getByText(": Failed")).toHaveCount(1);
});
