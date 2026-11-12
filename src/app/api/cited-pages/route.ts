import { z } from "zod";
import { canonicalUrl } from "@/lib/citations";
import { PLANS } from "@/lib/plans";
import { checkCitedPages } from "@/server/crawl";
import { AppError } from "@/server/http/errors";
import { route } from "@/server/http/route";

export const runtime = "nodejs";
export const maxDuration = 60;

/* Cited-page gaps (§9.7): reads the pages the AIs cited and reports, for each, whether it names the product, links to
   it, and which competitors it names. Everyone is on Free until accounts exist, so the server checks at most Free's
   number of pages per request; that also bounds what one request can make us fetch. */
const Body = z.object({
  urls: z.array(z.string().min(8).max(2000)).min(1).max(30),
  brand: z.object({ name: z.string().min(1).max(120), aliases: z.array(z.string().min(1).max(120)).max(10), domain: z.string().max(253) }).strict(),
  competitors: z.array(z.string().min(1).max(120)).max(10),
}).strict();

export const POST = route({
  auth: "public",
  body: Body,
  rateLimit: { bucket: "cited-pages", limit: 6, windowMs: 3_600_000 },
  handler: async ({ body, signal }) => {
    const limit = PLANS.free.citedPages;
    const urls = [...new Set(body.urls.map(canonicalUrl).filter((u): u is string => !!u))].slice(0, limit);
    if (!urls.length) throw new AppError("invalid_input", "None of those are web page addresses.");
    const pages = await checkCitedPages(urls, body.brand, body.competitors, { deadline: Date.now() + 45_000, signal });
    return { checkedAt: Date.now(), limit, pages };
  },
});
