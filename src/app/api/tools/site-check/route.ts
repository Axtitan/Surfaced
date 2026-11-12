import { z } from "zod";
import { FetchRefused, normaliseUrl } from "@/lib/safe-fetch";
import { inspectSite } from "@/lib/site";
import { AppError } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { log } from "@/server/log";

export const runtime = "nodejs";
export const maxDuration = 60;

/* The free AI-readiness check behind /tools/ai-crawler-check: reads robots.txt, llms.txt, the sitemap and the homepage.
   No AI calls, so it costs almost nothing; still rate limited per IP (Turnstile is added with §12.11). Only parsed,
   length-limited facts go back to the browser, never the fetched page (§12.8 rule 8). */
const Body = z.object({ url: z.string().min(3).max(2000) }).strict();

export const POST = route({
  auth: "public",
  body: Body,
  rateLimit: { bucket: "site-check", limit: 10, windowMs: 3_600_000 },
  handler: async ({ body, requestId }) => {
    const url = normaliseUrl(body.url);
    if (!url) throw new AppError("invalid_input", "That doesn't look like a website address.");
    try {
      const { page, checks } = await inspectSite(url);
      return { url: page.finalUrl, domain: page.domain, title: page.title.slice(0, 200), checks };
    } catch (e) {
      log("warn", "site check failed", { requestId, error: e });
      throw new AppError("bad_request", e instanceof FetchRefused ? e.message : e instanceof Error && e.message.startsWith("The site") ? e.message : "We couldn't read that site. Check the address and try again.");
    }
  },
});
