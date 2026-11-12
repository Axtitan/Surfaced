import type { AiId, Run } from "./types";
import { matcher, type Brand } from "./match";

/** Bump when the score formula changes, so old and new scores are never compared silently (§9.6). */
export const SCORE_VERSION = 1;

export type ProviderScore = { id: AiId; runs: number; mentioned: number; rate: number; avgRank: number | null; cited: number; errors: number };

export function summarise(runs: Run[], providers: AiId[]) {
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

export type VoiceRow = { name: string; isYou: boolean; answers: number; share: number; avgRank: number | null };

/**
 * Share of voice (§9.6): in how many scored answers each name appears, for the brand and each tracked competitor.
 * `share` is that name's mentions over all mentions of the tracked names, so the column adds up to 100%.
 */
export function shareOfVoice(runs: Run[], brand: Brand, competitors: string[]): VoiceRow[] {
  const ok = runs.filter((r) => r.ok && (r.mode === "search" || r.provider === "deepseek"));
  const names = [{ name: brand.name, isYou: true, m: matcher(brand) },
    ...competitors.slice(0, 12).map((c) => ({ name: c, isYou: false, m: matcher({ name: c, aliases: [], domain: "" }) }))];
  const rows = names.map(({ name, isYou, m }) => {
    const hits = ok.filter((r) => (isYou ? r.mentioned : m.test(r.text) >= 0));
    const ranks = isYou
      ? hits.map((r) => r.rank).filter((x): x is number => x != null)
      : hits.map((r) => r.others.findIndex((o) => m.test(o) >= 0)).filter((i) => i >= 0).map((i) => i + 1);
    return { name, isYou, answers: hits.length, avgRank: ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null };
  });
  const all = rows.reduce((n, r) => n + r.answers, 0);
  return rows.map((r) => ({ ...r, share: all ? r.answers / all : 0 })).sort((a, b) => b.answers - a.answers || Number(b.isYou) - Number(a.isYou));
}

/** Share of scored answers that link to the brand's own site. */
export function citationRate(runs: Run[]): number | null {
  const ok = runs.filter((r) => r.ok && (r.mode === "search" || r.provider === "deepseek"));
  return ok.length ? ok.filter((r) => r.cited).length / ok.length : null;
}
