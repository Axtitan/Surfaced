import { ProviderError, type Provider } from "./types";
import { postJSON } from "./util";

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-flash"; // deepseek-chat was retired on 2026-07-24

type ChatOutput = { model?: string; choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };

export const deepseek: Provider = {
  id: "deepseek",
  label: "DeepSeek",
  vendor: "DeepSeek",
  // The DeepSeek API has no web search, so this measures what the model already knows.
  searchCapable: false,
  configured: () => !!process.env.DEEPSEEK_API_KEY,

  async ask(prompt) {
    const json = await postJSON<ChatOutput>(
      "https://api.deepseek.com/chat/completions",
      { model: MODEL, messages: [{ role: "user", content: prompt }], stream: false },
      { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      "DeepSeek",
      180_000
    );
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new ProviderError(`DeepSeek: empty answer (${json.choices?.[0]?.finish_reason ?? "no choices"})`, true);
    return { text, sources: [], model: json.model || MODEL };
  },
};
