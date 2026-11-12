import { z } from "zod";
import { judge } from "@/lib/match";
import { ask, usable } from "@/lib/providers";
import { ProviderError } from "@/lib/providers/types";
import { allow, clientIp } from "@/lib/rate-limit";
import type { Mode, ProviderId, Run } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_RUNS = 80;
const CONCURRENCY = 6;

const Body = z.object({
  brand: z.object({
    name: z.string().min(1).max(80),
    aliases: z.array(z.string().max(80)).max(8),
    domain: z.string().max(253),
    competitors: z.array(z.string().max(80)).max(12),
  }),
  prompts: z.array(z.string().min(3).max(300)).min(1).max(12),
  providers: z.array(z.enum(["claude", "chatgpt", "gemini", "deepseek"])).min(1),
  samples: z.number().int().min(1).max(3),
  memory: z.boolean(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid scan request." }, { status: 400 });
  const { brand, prompts, samples, memory } = parsed.data;
  const providers = parsed.data.providers.filter(usable) as ProviderId[];
  if (!providers.length) return Response.json({ error: "None of the selected AIs are connected." }, { status: 400 });

  const gate = allow("scan", clientIp(req), Number(process.env.SCANS_PER_HOUR) || 6, 3600_000);
  if (!gate.ok) return Response.json({ error: `Scan limit reached. Try again in ${gate.retryInMin} min.` }, { status: 429 });

  // Every question goes to every AI in its consumer-like mode (live web search where the API has it),
  // plus optionally once more with search off, to see what the model knows from training alone.
  type Job = { prompt: string; provider: ProviderId; mode: Mode; sample: number };
  const jobs: Job[] = [];
  for (let sample = 1; sample <= samples; sample++)
    for (const prompt of prompts)
      for (const provider of providers) {
        const searchable = provider !== "deepseek";
        jobs.push({ prompt, provider, mode: searchable ? "search" : "memory", sample });
        if (memory && searchable && sample === 1) jobs.push({ prompt, provider, mode: "memory", sample });
      }
  if (jobs.length > MAX_RUNS) return Response.json({ error: `That's ${jobs.length} questions to ask. The limit is ${MAX_RUNS}; use fewer questions or repeats.` }, { status: 400 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      send({ type: "start", total: jobs.length });
      let next = 0;
      const worker = async () => {
        while (next < jobs.length && !req.signal.aborted) {
          const i = next++;
          const j = jobs[i];
          const t0 = Date.now();
          const base = { id: `${i}`, prompt: j.prompt, provider: j.provider, mode: j.mode, sample: j.sample };
          let run: Run;
          try {
            const a = await ask(j.provider, j.prompt, j.mode, { brand: brand.name, competitors: brand.competitors, seed: i + 7 * j.sample });
            const v = judge(brand, a.text, a.sources.map((s) => s.domain));
            run = { ...base, ok: true, ...v, sources: a.sources.slice(0, 20), text: a.text.slice(0, 8000), model: a.model, demo: a.demo, ms: Date.now() - t0 };
          } catch (e) {
            const msg = e instanceof ProviderError || e instanceof Error ? e.message : "Unknown error";
            run = { ...base, ok: false, error: msg.slice(0, 300), mentioned: false, cited: false, rank: null, others: [], sources: [], text: "", model: "", ms: Date.now() - t0 };
          }
          send({ type: "run", run });
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
      send({ type: "done" });
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
