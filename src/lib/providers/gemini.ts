import { ProviderError, type Provider } from "./types";
import { dedupeSources, postJSON, source } from "./util";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

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

  async ask(prompt, mode) {
    const json = await postJSON<GenerateOutput>(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        ...(mode === "search" ? { tools: [{ google_search: {} }] } : {}),
      },
      { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      "Gemini",
      180_000
    );
    if (json.promptFeedback?.blockReason) throw new ProviderError(`Gemini blocked the question (${json.promptFeedback.blockReason}).`);
    const cand = json.candidates?.[0];
    const text = (cand?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("").trim();
    if (!text) throw new ProviderError(`Gemini: empty answer (${cand?.finishReason ?? "no candidates"})`, true);
    const sources = (cand?.groundingMetadata?.groundingChunks ?? [])
      .filter((c) => c.web?.uri)
      .map((c) => source(c.web!.uri!, c.web!.title));
    return { text, sources: dedupeSources(sources), model: json.modelVersion || MODEL };
  },
};
