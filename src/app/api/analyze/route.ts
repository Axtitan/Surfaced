import { z } from "zod";
import { buildProfile } from "@/lib/profile";
import { FetchRefused, normaliseUrl } from "@/lib/safe-fetch";
import { inspectSite } from "@/lib/site";
import type { Analysis } from "@/lib/types";
import { AppError } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { log } from "@/server/log";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  url: z.string().min(3).max(2000),
  offer: z.string().max(200).optional(),
  competitors: z.array(z.string().max(80)).max(10).optional(),
}).strict();

export const POST = route({
  auth: "public",
  body: Body,
  rateLimit: { bucket: "analyze", limit: 20, windowMs: 3_600_000 },
  handler: async ({ body, requestId }) => {
    const url = normaliseUrl(body.url);
    if (!url) throw new AppError("invalid_input", "That doesn't look like a website address.");
    try {
      const { page, checks } = await inspectSite(url);
      const { prompts, by, ...profile } = await buildProfile(page, { offer: body.offer || undefined, competitors: body.competitors });
      const result: Analysis = { profile, prompts, checks, profiledBy: by };
      return result;
    } catch (e) {
      const msg = e instanceof FetchRefused ? e.message
        : e instanceof Error && /timeout|abort/i.test(e.name + e.message) ? "The site took too long to answer."
        : e instanceof Error && e.message.startsWith("The site") ? e.message
        : "We couldn't read that site. Check the address and try again.";
      log("warn", "analyze failed", { requestId, error: e });
      throw new AppError("bad_request", msg);
    }
  },
});
