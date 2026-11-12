import { claude } from "./claude";
import { chatgpt } from "./openai";
import { gemini } from "./gemini";
import { deepseek } from "./deepseek";
import { demoAnswer } from "./demo";
import { sleep } from "./util";
import type { Answer, AskContext, Mode, Provider, ProviderId } from "./types";

export const PROVIDERS: Provider[] = [chatgpt, claude, gemini, deepseek];
export const demoMode = () => process.env.SURFACED_DEMO === "1" && process.env.NODE_ENV !== "production";

/**
 * Paid AI calls are refused in production until accounts, quotas and the spend guard exist (F-01, Phase 0):
 * set AUTH_ENABLED=1 only once they do. SURFACED_PAUSE_SCANS=1 is the kill switch for every environment.
 */
export function paidCallsAllowed() {
  if (process.env.SURFACED_PAUSE_SCANS === "1") return false;
  return process.env.NODE_ENV !== "production" || process.env.AUTH_ENABLED === "1";
}

export function providerStatus() {
  const allowed = paidCallsAllowed();
  return PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    vendor: p.vendor,
    searchCapable: p.searchCapable,
    connected: allowed && p.configured(),
    demo: (!p.configured() || !allowed) && demoMode(),
  }));
}

export function usable(id: ProviderId) {
  const p = PROVIDERS.find((x) => x.id === id);
  if (!p) return false;
  return (p.configured() && paidCallsAllowed()) || demoMode();
}

export async function ask(id: ProviderId, prompt: string, mode: Mode, ctx: AskContext): Promise<Answer> {
  const p = PROVIDERS.find((x) => x.id === id)!;
  if (!p.configured() || !paidCallsAllowed()) {
    if (demoMode()) {
      // An optional, cancellable pause so the demo behaves like a real scan.
      const delay = Number(process.env.SURFACED_DEMO_DELAY_MS) || 0;
      if (delay) await sleep(delay, ctx.signal);
      return demoAnswer(id, prompt, mode, ctx);
    }
    throw new Error(`${p.label} is not connected.`);
  }
  return p.ask(prompt, p.searchCapable ? mode : "memory", ctx);
}

export type { ProviderId, Mode, Answer };
