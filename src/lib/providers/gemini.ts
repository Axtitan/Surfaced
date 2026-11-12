import { ProviderError, type Provider } from "./types";
import { dedupeSources, postJSON, source } from "./util";
import { CONFIG } from "./config";

type GenerateOutput = {
  modelVersion?: string;
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
  }>;
};

export const gemini: Provider = {
  id: "gemini",
  label: "Gemini",
  vendor: "Google",
  searchCapable: true,
  configured: () => !!process.env.GEMINI_API_KEY,

  async ask(prompt, mode, ctx) {
    const c = CONFIG.gemini;
    const json = await postJSON<GenerateOutput>(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model)}:generateContent`,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: c.maxTokens },
        ...(mode === "search" ? { tools: [{ google_search: {} }] } : {}),
      },
      { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      "Gemini",
      c.timeoutMs,
      ctx.signal,
    );
    if (json.promptFeedback?.blockReason) throw new ProviderError(`Gemini blocked the question (${json.promptFeedback.blockReason}).`, false, undefined, "refused");
    const cand = json.candidates?.[0];
    const text = (cand?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("").trim();
    if (!text) throw new ProviderError(`Gemini: empty answer (${cand?.finishReason ?? "no candidates"})`, true, undefined, "empty");
    const sources = (cand?.groundingMetadata?.groundingChunks ?? [])
      .filter((x) => x.web?.uri)
      .map((x) => source(x.web!.uri!, x.web!.title));
    return { text, sources: dedupeSources(sources), model: json.modelVersion || c.model };
  },
};
