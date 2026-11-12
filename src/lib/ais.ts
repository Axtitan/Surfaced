import type { AiId, ProviderId } from "./types";

/* The AIs Surfaced scores. The core four can be asked automatically (through their APIs) or by pasting; the extras are
   paste-only and optional, so a complete free check stays at four answers per question. */

export const CORE_AIS: ProviderId[] = ["chatgpt", "claude", "gemini", "deepseek"];
export const EXTRA_AIS: AiId[] = ["perplexity", "copilot", "googleai"];
export const ALL_AIS: AiId[] = [...CORE_AIS, ...EXTRA_AIS];

export const AI_NAME: Record<AiId, string> = {
  chatgpt: "ChatGPT", claude: "Claude", gemini: "Gemini", deepseek: "DeepSeek",
  perplexity: "Perplexity", copilot: "Copilot", googleai: "Google AI Mode",
};
