import { z } from "zod";
import { buildProfile } from "@/lib/profile";
import { allow, clientIp } from "@/lib/rate-limit";
import { FetchRefused, normaliseUrl } from "@/lib/safe-fetch";
import { inspectSite } from "@/lib/site";
import type { Analysis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  url: z.string().min(3).max(2000),
  offer: z.string().max(200).optional(),
  competitors: z.array(z.string().max(80)).max(10).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter your website address." }, { status: 400 });
  const url = normaliseUrl(parsed.data.url);
  if (!url) return Response.json({ error: "That doesn't look like a website address." }, { status: 400 });

  const gate = allow("analyze", clientIp(req), 20, 3600_000);
  if (!gate.ok) return Response.json({ error: `Too many checks from your network. Try again in ${gate.retryInMin} min.` }, { status: 429 });

  try {
    const { page, checks } = await inspectSite(url);
    const { prompts, by, ...profile } = await buildProfile(page, { offer: parsed.data.offer, competitors: parsed.data.competitors });
    const result: Analysis = { profile, prompts, checks, profiledBy: by };
    return Response.json(result);
  } catch (e) {
    const msg = e instanceof FetchRefused ? e.message
      : e instanceof Error && /timeout|abort/i.test(e.name + e.message) ? "The site took too long to answer."
      : e instanceof Error && e.message.startsWith("The site") ? e.message
      : "We couldn't read that site. Check the address and try again.";
    console.error("analyze failed", e);
    return Response.json({ error: msg }, { status: 400 });
  }
}
