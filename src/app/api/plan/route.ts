import { z } from "zod";
import { nicheTerms, plan } from "@/lib/plan";
import { KINDS } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(KINDS),
  categories: z.array(z.string().max(40)).max(14),
  citedDomains: z.record(z.string().max(253), z.number().int().min(0).max(10_000)),
  ai: z.boolean().optional(),
  category: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const cited = Object.fromEntries(Object.entries(parsed.data.citedDomains).slice(0, 300));
  const { kind, categories, ai, category } = parsed.data;
  return Response.json(plan({ kind, categories, citedDomains: cited, aiProduct: ai, terms: nicheTerms(category ?? "") }));
}
