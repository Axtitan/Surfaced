import { z } from "zod";
import { judge } from "@/lib/match";
import { ask, usable } from "@/lib/providers";
import { estimateUsd, MAX_SCAN_USD } from "@/lib/providers/config";
import { ProviderError, SAFE_ERROR } from "@/lib/providers/types";
import { questionProblem } from "@/lib/question-checks";
import type { Mode, ProviderId, Run } from "@/lib/types";
import { AppError } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { log } from "@/server/log";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_RUNS = 80;
// About three answers in flight per AI. Each provider has its own rate limits, so this scales with the AIs picked.
const PER_PROVIDER = 3;
// Stop before the platform kills the function (Vercel Hobby: 300 s), so the scan always ends with a "done" line.
const DEADLINE_MS = (Number(process.env.SCAN_DEADLINE_SECONDS) || 270) * 1000;

const Body = z.object({
  brand: z.object({
    name: z.string().min(1).max(80),
    aliases: z.array(z.string().max(80)).max(8),
    domain: z.string().max(253),
    competitors: z.array(z.string().max(80)).max(12),
  }).strict(),
  prompts: z.array(z.string().min(3).max(300)).min(1).max(30),
  providers: z.array(z.enum(["claude", "chatgpt", "gemini", "deepseek"])).min(1).max(4),
  samples: z.number().int().min(1).max(3),
  memory: z.boolean(),
}).strict();

/** Lines of the NDJSON stream. A stream that ends without "done" was cut off (F-29). */
export type ScanMessage =
  | { type: "start"; total: number }
  | { type: "run"; run: Run }
  | { type: "done"; answered: number; failed: number; skipped: number; stoppedBy: "deadline" | "client" | null };

type Job = { prompt: string; provider: ProviderId; mode: Mode; sample: number };

export const POST = route({
  auth: "public",
  body: Body,
  rateLimit: { bucket: "scan", limit: Number(process.env.SCANS_PER_HOUR) || 6, windowMs: 3_600_000 },
  handler: async ({ body, req, requestId }) => {
    const { brand, prompts, samples, memory } = body;
    const providers = [...new Set(body.providers)].filter(usable) as ProviderId[];
    if (!providers.length) throw new AppError("bad_request", "None of the selected AIs are connected.");
    const bad = prompts.map((q, i) => ({ i, why: questionProblem(q) })).find((x) => x.why);
    if (bad) throw new AppError("invalid_input", `Question ${bad.i + 1} ${bad.why}.`);

    // Every question goes to every AI in its consumer-like mode (live web search where the API has it),
    // plus optionally once more with search off, to see what the model knows from training alone.
    const jobs: Job[] = [];
    for (let sample = 1; sample <= samples; sample++)
      for (const prompt of prompts)
        for (const provider of providers) {
          const searchable = provider !== "deepseek";
          jobs.push({ prompt, provider, mode: searchable ? "search" : "memory", sample });
          if (memory && searchable && sample === 1) jobs.push({ prompt, provider, mode: "memory", sample });
        }
    if (jobs.length > MAX_RUNS) throw new AppError("invalid_input", `That's ${jobs.length} answers. The limit is ${MAX_RUNS}; use fewer questions or repeats.`);
    if (estimateUsd(jobs) > MAX_SCAN_USD) throw new AppError("invalid_input", "That scan would cost more than the per-scan limit. Use fewer questions, AIs or repeats.");

    // One signal cancels every provider call: the client leaving, or the deadline (F-28, F-30).
    const stop = new AbortController();
    let stoppedBy: "deadline" | "client" | null = null;
    const onClientAbort = () => { stoppedBy ??= "client"; stop.abort(); };
    req.signal.addEventListener("abort", onClientAbort, { once: true });
    const deadline = setTimeout(() => { stoppedBy ??= "deadline"; stop.abort(); }, DEADLINE_MS);

    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let open = true;
        const send = (o: ScanMessage) => { if (open) try { controller.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch { open = false; } };
        send({ type: "start", total: jobs.length });
        let next = 0, answered = 0, failed = 0;
        const worker = async () => {
          while (next < jobs.length && !stop.signal.aborted) {
            const i = next++;
            const j = jobs[i];
            const t0 = Date.now();
            const base = { id: `${i}`, prompt: j.prompt, provider: j.provider, mode: j.mode, sample: j.sample };
            let run: Run;
            try {
              const a = await ask(j.provider, j.prompt, j.mode, { brand: brand.name, competitors: brand.competitors, seed: i + 7 * j.sample, signal: stop.signal });
              const v = judge(brand, a.text, a.sources.map((s) => s.domain));
              run = { ...base, ok: true, ...v, sources: a.sources.slice(0, 20), text: a.text.slice(0, 8000), model: a.model, demo: a.demo, ms: Date.now() - t0 };
              answered++;
            } catch (e) {
              // Provider messages can carry account ids and internal URLs: log them, send only a safe message (F-13).
              const kind = stoppedBy === "deadline" ? "deadline" : e instanceof ProviderError ? e.kind : "unavailable";
              if (kind !== "cancelled" && kind !== "deadline") log("warn", "provider error", { requestId, provider: j.provider, error: e });
              run = { ...base, ok: false, error: SAFE_ERROR[kind], mentioned: false, cited: false, rank: null, others: [], sources: [], text: "", model: "", ms: Date.now() - t0 };
              failed++;
            }
            send({ type: "run", run });
          }
        };
        await Promise.all(Array.from({ length: Math.min(PER_PROVIDER * providers.length, jobs.length) }, worker));
        clearTimeout(deadline);
        req.signal.removeEventListener("abort", onClientAbort);
        send({ type: "done", answered, failed, skipped: jobs.length - answered - failed, stoppedBy });
        if (open) controller.close();
      },
      cancel() { stoppedBy ??= "client"; stop.abort(); },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
  },
});
