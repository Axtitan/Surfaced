export type ProviderId = "claude" | "chatgpt" | "gemini" | "deepseek";
/** Every AI whose answers we score. The extra ones are paste-only: they have no API adapter. */
export type AiId = ProviderId | "perplexity" | "copilot" | "googleai";
export type Mode = "search" | "memory";

export type Source = { url: string; title?: string; domain: string };

export type Answer = {
  text: string;
  sources: Source[];
  model: string;
  demo?: boolean;
};

/** What the demo provider needs to fake a plausible answer, plus the signal that cancels the call. */
export type AskContext = { brand: string; competitors: string[]; seed: number; signal?: AbortSignal };

export interface Provider {
  id: ProviderId;
  label: string;
  vendor: string;
  /** Can this provider browse the web through its API? */
  searchCapable: boolean;
  configured(): boolean;
  ask(prompt: string, mode: Mode, ctx: AskContext): Promise<Answer>;
}

/** kind is what the user may be told; message stays on the server (F-13). */
export type ProviderErrorKind = "rate_limited" | "timeout" | "unavailable" | "refused" | "empty" | "cancelled";

export class ProviderError extends Error {
  constructor(message: string, public retryable = false, public status?: number, public kind: ProviderErrorKind = "unavailable") {
    super(message);
  }
}

/** Messages safe to show in the browser, by error kind. */
export const SAFE_ERROR: Record<ProviderErrorKind | "deadline", string> = {
  rate_limited: "The AI was busy (rate limited). Try again later.",
  timeout: "The AI took too long to answer.",
  unavailable: "The AI couldn't answer right now.",
  refused: "The AI declined to answer this question.",
  empty: "The AI returned an empty answer.",
  cancelled: "Stopped before this question was answered.",
  deadline: "Not answered in time. Ask fewer questions or fewer repeats.",
};
