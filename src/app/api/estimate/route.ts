import { z } from "zod";
import { canonicalUrl } from "@/lib/citations";
import { ESTIMATE_PAGES_PER_RUN } from "@/lib/estimate";
import { checkCitedPages } from "@/server/crawl";
import { AppError } from "@/server/http/errors";
import { route } from "@/server/http/route";

export const runtime = "nodejs";
export const maxDuration = 60;

/* Estimate mode (experimental): reads the evidence pages for a check and reports, for each, whether it names the
   product and which competitors it names. No AI is asked and nothing here costs money: it is the cited-page reader with
   a larger page allowance, under the same crawler rules (§12.8). The estimate itself is worked out from these facts by
   lib/estimate.ts. */
const Body = z.object({
  urls: z.array(z.string().min(8).max(2000)).min(1).max(60),
  brand: z.object({ name: z.string().min(1).max(120), aliases: z.array(z.string().min(1).max(120)).max(10), domain: z.string().max(253) }).strict(),
  competitors: z.array(z.string().min(1).max(120)).max(10),
}).strict();

export const POST = route({
  auth: "public",
  body: Body,
  rateLimit: { bucket: "estimate", limit: 6, windowMs: 3_600_000 },
  handler: async ({ body, signal }) => {
    const urls = [...new Set(body.urls.map(canonicalUrl).filter((u): u is string => !!u))].slice(0, ESTIMATE_PAGES_PER_RUN);
    if (!urls.length) throw new AppError("invalid_input", "None of those are web page addresses.");
    const pages = await checkCitedPages(urls, body.brand, body.competitors, { deadline: Date.now() + 45_000, signal });
    return { at: Date.now(), limit: ESTIMATE_PAGES_PER_RUN, pages };
  },
});
