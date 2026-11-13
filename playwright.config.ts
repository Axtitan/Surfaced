import { defineConfig, devices } from "@playwright/test";

/* End-to-end tests (§20). Locally they reuse a running `npm run dev`; in CI they run against the production build.
   No test reaches a real AI or a third-party site: /api/analyze is mocked in the browser and outside links are blocked. */
const PORT = 3100;
// Locally, drive the Chrome already installed on the machine (no browser download). CI uses Playwright's own Chromium.
const channel = process.env.CI ? undefined : "chrome";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // Locally every browser shares one dev server, which compiles pages on demand: more than a few at once makes the
  // journeys slower and flaky, not faster. CI runs against the production build and keeps Playwright's default.
  workers: process.env.CI ? undefined : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel } },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
