export type ProviderId = "claude" | "chatgpt" | "gemini" | "deepseek";
export type Mode = "search" | "memory";

export type Source = { url: string; title?: string; domain: string };

export type Answer = {
  text: string;
  sources: Source[];
  model: string;
  demo?: boolean;
};

/** What the demo provider needs to fake a plausible answer. Real providers ignore it. */
export type AskContext = { brand: string; competitors: string[]; seed: number };

export interface Provider {
  id: ProviderId;
  label: string;
  vendor: string;
  /** Can this provider browse the web through its API? */
  searchCapable: boolean;
  configured(): boolean;
  ask(prompt: string, mode: Mode, ctx: AskContext): Promise<Answer>;
}

export class ProviderError extends Error {
  constructor(message: string, public retryable = false, public status?: number) {
    super(message);
  }
}
