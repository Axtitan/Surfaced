import { z } from "zod";
import { canonicalUrl } from "@/lib/citations";
import { destinationBySlug, onListingSite } from "@/lib/plan";
import { verifyListing } from "@/server/crawl";
import { AppError } from "@/server/http/errors";
import { route } from "@/server/http/route";

export const runtime = "nodejs";
export const maxDuration = 30;

/* On-demand listing verification (§9.21). The user marks a listing live and gives its address; we read that one page
   under the crawler rules. The address must be on the listing site's own domain, so this can't be used to make us
   fetch arbitrary pages. */
const Body = z.object({
  slug: z.string().min(1).max(120),
  url: z.string().min(8).max(2000),
  brand: z.object({ name: z.string().min(1).max(120), aliases: z.array(z.string().min(1).max(120)).max(10), domain: z.string().max(253) }).strict(),
}).strict();

const bare = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

export const POST = route({
  auth: "public",
  body: Body,
  rateLimit: { bucket: "verify-listing", limit: 30, windowMs: 3_600_000 },
  handler: async ({ body }) => {
    const d = destinationBySlug(body.slug);
    if (!d) throw new AppError("invalid_input", "We don't know that listing site.");
    const url = canonicalUrl(body.url);
    if (!url) throw new AppError("invalid_input", "That isn't a web page address.");
    if (!onListingSite(url, d)) throw new AppError("invalid_input", `Paste the address of your listing on ${bare(d.site) || bare(d.url)}.`);
    return verifyListing(url, body.brand);
  },
});
