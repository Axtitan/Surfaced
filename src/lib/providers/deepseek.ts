import { ProviderError, type Provider } from "./types";
import { postJSON } from "./util";
import { CONFIG } from "./config";

type ChatOutput = { model?: string; choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };

export const deepseek: Provider = {
  id: "deepseek",
  label: "DeepSeek",
  vendor: "DeepSeek",
  // The DeepSeek API has no web search here, so this measures what the model already knows.
  searchCapable: false,
  configured: () => !!process.env.DEEPSEEK_API_KEY,

  async ask(prompt, _mode, ctx) {
    const c = CONFIG.deepseek;
    const json = await postJSON<ChatOutput>(
      "https://api.deepseek.com/chat/completions",
      { model: c.model, messages: [{ role: "user", content: prompt }], max_tokens: c.maxTokens, stream: false },
      { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      "DeepSeek",
      c.timeoutMs,
      ctx.signal,
    );
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new ProviderError(`DeepSeek: empty answer (${json.choices?.[0]?.finish_reason ?? "no choices"})`, true, undefined, "empty");
    return { text, sources: [], model: json.model || c.model };
  },
};
