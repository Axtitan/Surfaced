import type { Answer, AskContext, Mode, ProviderId } from "./types";

/** Simulated answers for local UI work (SURFACED_DEMO=1). Every one is flagged demo: true. */
export function demoAnswer(id: ProviderId, prompt: string, mode: Mode, ctx: AskContext): Answer {
  let s = (ctx.seed * 2654435761 + hash(id + prompt)) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const odds = { claude: 0.45, chatgpt: 0.35, gemini: 0.25, deepseek: 0.1 }[id];
  const pool = [...ctx.competitors].sort(() => rnd() - 0.5).slice(0, 4);
  if (rnd() < odds) pool.splice(Math.floor(rnd() * (pool.length + 1)), 0, ctx.brand);
  const lines = pool.map((n, i) => `${i + 1}. **${n}** - ${["well known and easy to start with", "strong on features", "good value", "popular with small teams", "a newer option worth a look"][i % 5]}.`);
  const domains = ["alternativeto.net", "saashub.com", "g2.com", "capterra.com", "producthunt.com", "reddit.com"];
  const sources = mode === "search" ? domains.filter(() => rnd() < 0.5).map((d) => ({ url: `https://${d}/`, title: d, domain: d })) : [];
  return {
    text: `Here are some good options for "${prompt}":\n\n${lines.join("\n")}\n\nThe best choice depends on your budget and team size.`,
    sources,
    model: `demo-${id}`,
    demo: true,
  };
}

function hash(t: string) {
  let h = 0;
  for (const c of t) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h >>> 0;
}
