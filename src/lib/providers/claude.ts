import Anthropic from "@anthropic-ai/sdk";
import { ProviderError, type Provider, type Source } from "./types";
import { dedupeSources, source } from "./util";

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;
export function claudeClient(): Anthropic {
  return (client ??= new Anthropic({ maxRetries: 2, timeout: 180_000 }));
}

export const claude: Provider = {
  id: "claude",
  label: "Claude",
  vendor: "Anthropic",
  searchCapable: true,
  configured: () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),

  async ask(prompt, mode) {
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
    let text = "";
    const cited: Source[] = [];
    const found: Source[] = [];
    let model = CLAUDE_MODEL;

    // A web-search turn can pause; send it back so the server continues it.
    for (let turn = 0; turn < 4; turn++) {
      let res: Anthropic.Beta.BetaMessage;
      try {
        res = await claudeClient().beta.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          ...(mode === "search" ? { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }] } : {}),
          messages,
        });
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError) throw new ProviderError(`Claude: ${e.message}`, true, e.status);
        if (e instanceof Anthropic.APIError) throw new ProviderError(`Claude: ${e.message}`, false, e.status);
        throw new ProviderError(`Claude: ${(e as Error).message}`, true);
      }
      model = res.model;
      for (const block of res.content) {
        if (block.type === "text") {
          text += block.text;
          for (const c of block.citations ?? []) if (c.type === "web_search_result_location") cited.push(source(c.url, c.title ?? undefined));
        } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const r of block.content) found.push(source(r.url, r.title));
        }
      }
      if (res.stop_reason === "refusal") throw new ProviderError("Claude declined to answer this question.");
      if (res.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: res.content });
    }
    // Cited sources first; fall back to everything the search returned.
    return { text: text.trim(), sources: dedupeSources(cited.length ? cited : found), model };
  },
};
