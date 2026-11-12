import type { ProviderId } from "./types";

/* One config per provider (ARCHITECTURE §13.2). Model ids come from environment variables with safe defaults, so a
   retired model is a config change, not a code change. Costs are estimates per answer with live search, from
   published prices in November 2026; they drive the pre-flight cost check, not billing. */

const num = (v: string | undefined, d: number) => (Number(v) > 0 ? Number(v) : d);

export type ProviderConfig = { model: string; maxTokens: number; maxSearches: number; timeoutMs: number; estUsdPerAnswer: number };

export const CONFIG: Record<ProviderId, ProviderConfig> = {
  claude: {
    model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
    maxTokens: num(process.env.CLAUDE_MAX_TOKENS, 4000),
    maxSearches: num(process.env.MAX_SEARCHES, 3),
    timeoutMs: 180_000,
    estUsdPerAnswer: 0.12,
  },
  chatgpt: {
    model: process.env.OPENAI_MODEL || "gpt-5",
    maxTokens: num(process.env.OPENAI_MAX_TOKENS, 8000),
    maxSearches: num(process.env.MAX_SEARCHES, 3),
    timeoutMs: 180_000,
    estUsdPerAnswer: 0.045,
  },
  gemini: {
    model: process.env.GEMINI_MODEL || "gemini-flash-latest",
    maxTokens: num(process.env.GEMINI_MAX_TOKENS, 8000),
    maxSearches: num(process.env.MAX_SEARCHES, 3),
    timeoutMs: 180_000,
    estUsdPerAnswer: 0.03,
  },
  deepseek: {
    model: process.env.DEEPSEEK_MODEL || "deepseek-flash", // deepseek-chat was retired on 2026-07-24
    maxTokens: num(process.env.DEEPSEEK_MAX_TOKENS, 4000),
    maxSearches: 0,
    timeoutMs: 180_000,
    estUsdPerAnswer: 0.002,
  },
};

/** Largest estimated cost one scan may have before it is refused (§13.4, layer 4). */
export const MAX_SCAN_USD = num(process.env.MAX_SCAN_USD, 5);

export function estimateUsd(jobs: { provider: ProviderId }[]): number {
  return jobs.reduce((n, j) => n + CONFIG[j.provider].estUsdPerAnswer, 0);
}
