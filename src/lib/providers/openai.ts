import { ProviderError, type Provider, type Source } from "./types";
import { dedupeSources, postJSON, source } from "./util";

const MODEL = process.env.OPENAI_MODEL || "gpt-5";

type ResponsesOutput = {
  model?: string;
  status?: string;
  error?: { message?: string } | null;
  output?: Array<{
    type: string;
    content?: Array<{ type: string; text?: string; annotations?: Array<{ type: string; url?: string; title?: string }> }>;
  }>;
};

export const chatgpt: Provider = {
  id: "chatgpt",
  label: "ChatGPT",
  vendor: "OpenAI",
  searchCapable: true,
  configured: () => !!process.env.OPENAI_API_KEY,

  async ask(prompt, mode) {
    const json = await postJSON<ResponsesOutput>(
      "https://api.openai.com/v1/responses",
      { model: MODEL, input: prompt, ...(mode === "search" ? { tools: [{ type: "web_search" }] } : {}) },
      { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      "ChatGPT",
      180_000
    );
    if (json.error?.message) throw new ProviderError(`ChatGPT: ${json.error.message}`);
    let text = "";
    const sources: Source[] = [];
    for (const item of json.output ?? []) {
      if (item.type !== "message") continue;
      for (const part of item.content ?? []) {
        if (part.type === "refusal") throw new ProviderError("ChatGPT declined to answer this question.");
        if (part.type !== "output_text") continue;
        text += part.text ?? "";
        for (const a of part.annotations ?? []) if (a.type === "url_citation" && a.url) sources.push(source(a.url, a.title));
      }
    }
    if (!text) throw new ProviderError(`ChatGPT: empty answer (status ${json.status ?? "unknown"})`, true);
    return { text: text.trim(), sources: dedupeSources(sources), model: json.model || MODEL };
  },
};
