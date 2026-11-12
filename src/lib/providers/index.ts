import { claude } from "./claude";
import { chatgpt } from "./openai";
import { gemini } from "./gemini";
import { deepseek } from "./deepseek";
import { demoAnswer } from "./demo";
import type { Answer, AskContext, Mode, Provider, ProviderId } from "./types";

export const PROVIDERS: Provider[] = [chatgpt, claude, gemini, deepseek];
export const demoMode = () => process.env.SURFACED_DEMO === "1" && process.env.NODE_ENV !== "production";

export function providerStatus() {
  return PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    vendor: p.vendor,
    searchCapable: p.searchCapable,
    connected: p.configured(),
    demo: !p.configured() && demoMode(),
  }));
}

export function usable(id: ProviderId) {
  const p = PROVIDERS.find((x) => x.id === id);
  return !!p && (p.configured() || demoMode());
}

export async function ask(id: ProviderId, prompt: string, mode: Mode, ctx: AskContext): Promise<Answer> {
  const p = PROVIDERS.find((x) => x.id === id)!;
  if (!p.configured()) {
    if (demoMode()) return demoAnswer(id, prompt, mode, ctx);
    throw new Error(`${p.label} is not connected.`);
  }
  return p.ask(prompt, p.searchCapable ? mode : "memory", ctx);
}

export type { ProviderId, Mode, Answer };
