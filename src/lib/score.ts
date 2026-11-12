import type { ProviderId, Run } from "./types";

export type ProviderScore = { id: ProviderId; runs: number; mentioned: number; rate: number; avgRank: number | null; cited: number; errors: number };

export function summarise(runs: Run[], providers: ProviderId[]) {
  const ok = runs.filter((r) => r.ok);
  const byProvider: ProviderScore[] = providers.map((id) => {
    // Score the consumer-like runs (live search; DeepSeek has none). Memory-only runs are reported separately.
    const mine = ok.filter((r) => r.provider === id && (r.mode === "search" || id === "deepseek"));
    const ranks = mine.map((r) => r.rank).filter((x): x is number => x != null);
    return {
      id,
      runs: mine.length,
      mentioned: mine.filter((r) => r.mentioned).length,
      rate: mine.length ? mine.filter((r) => r.mentioned).length / mine.length : 0,
      avgRank: ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null,
      cited: mine.filter((r) => r.cited).length,
      errors: runs.filter((r) => r.provider === id && !r.ok).length,
    };
  });
  const scored = byProvider.filter((p) => p.runs);
  // The headline: the average mention rate across AIs, so one chatty AI can't carry the score.
  const score = scored.length ? Math.round((scored.reduce((a, p) => a + p.rate, 0) / scored.length) * 100) : 0;

  const memory = ok.filter((r) => r.mode === "memory" && r.provider !== "deepseek");
  const memoryRate = memory.length ? memory.filter((r) => r.mentioned).length / memory.length : null;

  const rivals = new Map<string, number>();
  for (const r of ok) for (const n of new Set(r.others.map((o) => o.trim()))) rivals.set(n, (rivals.get(n) ?? 0) + 1);
  const domains = new Map<string, number>();
  for (const r of ok) for (const d of new Set(r.sources.map((s) => s.domain).filter(Boolean))) domains.set(d, (domains.get(d) ?? 0) + 1);

  return {
    score,
    byProvider,
    memoryRate,
    rivals: [...rivals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
    domains: [...domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
    errors: runs.filter((r) => !r.ok).length,
  };
}

/** Wilson interval: how sure we can be of a mention rate measured from n answers. */
export function interval(k: number, n: number): [number, number] {
  if (!n) return [0, 1];
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
