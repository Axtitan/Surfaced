import type { Run } from "@/lib/types";

/** A scored answer with sensible defaults. */
export function run(over: Partial<Run> = {}): Run {
  return {
    id: Math.random().toString(36).slice(2), prompt: "q", provider: "chatgpt", mode: "search", sample: 1, ok: true,
    mentioned: false, cited: false, rank: null, others: [], sources: [], text: "", model: "test", ms: 0, ...over,
  };
}
