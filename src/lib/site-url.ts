/** The public address of this deployment, for canonical URLs, the sitemap and share links.
    Set NEXT_PUBLIC_SITE_URL for a custom domain; on Vercel the production URL is used automatically. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3100")
).replace(/\/$/, "");

export const BRAND = {
  name: "Surfaced",
  oneLine: "Checks whether ChatGPT, Claude, Gemini and DeepSeek recommend your business, then gets you listed on the sites they read.",
  category: "AI visibility checker",
};

/** Contact addresses come from configuration so none is hard-coded before the owner chooses them. */
export const CONTACT = {
  support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  security: process.env.SECURITY_CONTACT || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  company: process.env.NEXT_PUBLIC_COMPANY_NAME || "",
};
