import { z } from "zod";
import { nicheTerms, plan } from "@/lib/plan";
import { KINDS } from "@/lib/types";
import { route } from "@/server/http/route";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(KINDS),
  categories: z.array(z.string().max(40)).max(14),
  citedDomains: z.record(z.string().max(253), z.number().int().min(0).max(10_000)),
  ai: z.boolean().optional(),
  category: z.string().max(200).optional(),
}).strict();

export const POST = route({
  auth: "public",
  body: Body,
  rateLimit: { bucket: "plan", limit: 120, windowMs: 3_600_000 },
  handler: async ({ body }) => {
    const cited = Object.fromEntries(Object.entries(body.citedDomains).slice(0, 300));
    const { kind, categories, ai, category } = body;
    return plan({ kind, categories, citedDomains: cited, aiProduct: ai, terms: nicheTerms(category ?? "") });
  },
});
