"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Profile, ProviderId, Run } from "@/lib/types";
import { judge } from "@/lib/match";
import { dedupeSources, source } from "@/lib/providers/util";

/* Free mode: the user asks each question in their own ChatGPT, Claude, Gemini and DeepSeek accounts and pastes the
   answer back. We score it exactly like an API answer. Links in the pasted answer (copied as HTML or markdown) become
   its sources, which feed the submission plan. */

type App = { id: ProviderId; name: string; open: (q: string) => string; prefill: boolean; tip: string };
export const APPS: App[] = [
  { id: "chatgpt", name: "ChatGPT", open: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`, prefill: true, tip: "The question opens ready in a new chat. The free plan works and searches the web on its own for questions like these." },
  { id: "claude", name: "Claude", open: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}`, prefill: true, tip: "The question opens in a new chat. Press send. If web search is off, turn it on in the chat's tools menu first." },
  { id: "gemini", name: "Gemini", open: () => "https://gemini.google.com/app", prefill: false, tip: "The question is on your clipboard. Paste it into Gemini and send." },
  { id: "deepseek", name: "DeepSeek", open: () => "https://chat.deepseek.com/", prefill: false, tip: "Turn on Search, then paste the question (it's on your clipboard) and send." },
];
// Links to the chat apps themselves aren't sources.
const CHAT_HOSTS = /(^|\.)(chatgpt\.com|claude\.ai|gemini\.google\.com|chat\.deepseek\.com)$/;

type Link = { url: string; title?: string };

function linksFromText(text: string): Link[] {
  const out: Link[] = [];
  for (const m of text.matchAll(/\[([^\]]{0,200})\]\((https?:\/\/[^)\s]+)\)/g)) out.push({ url: m[2], title: m[1] });
  for (const m of text.matchAll(/https?:\/\/[^\s)\]>"'<]+/g)) out.push({ url: m[0].replace(/[.,;:]+$/, "") });
  return out;
}

function linksFromHtml(html: string): Link[] {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return [...doc.querySelectorAll("a[href]")]
      .map((a) => ({ url: (a as HTMLAnchorElement).href, title: a.textContent?.trim() || undefined }))
      .filter((l) => /^https?:/.test(l.url));
  } catch {
    return [];
  }
}

export default function PasteBoard({ profile, prompts, runs, onRuns }: {
  profile: Profile; prompts: string[]; runs: Run[]; onRuns: (next: Run[]) => void;
}) {
  const [app, setApp] = useState<ProviderId>("chatgpt");
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [links, setLinks] = useState<Link[]>([]);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const pasted = useMemo(() => runs.filter((r) => r.via === "paste"), [runs]);
  const find = (p: ProviderId, q: string) => pasted.find((r) => r.provider === p && r.prompt === q);
  const doneFor = (p: ProviderId) => prompts.filter((q) => find(p, q)).length;
  const meta = APPS.find((a) => a.id === app)!;
  const question = prompts[index] ?? "";
  const existing = question ? find(app, question) : undefined;

  // Load the saved answer when moving to a question that already has one.
  useEffect(() => { setText(existing?.text ?? ""); setLinks(existing?.sources.map((s) => ({ url: s.url, title: s.title })) ?? []); setCopied(false); }, [app, index]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ask() {
    try { await navigator.clipboard.writeText(question); setCopied(true); } catch { setCopied(false); }
    // A named window keeps one tab per chat app instead of opening a new one each time.
    window.open(meta.open(question), `surfaced-${meta.id}`);
    requestAnimationFrame(() => box.current?.focus());
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData("text/html");
    if (html) setLinks((l) => [...l, ...linksFromHtml(html)]);
  }

  function next() {
    // Next unanswered question for this app, then the next app with gaps.
    const after = prompts.findIndex((q, i) => i > index && !find(app, q));
    if (after >= 0) return setIndex(after);
    const first = prompts.findIndex((q) => !find(app, q));
    if (first >= 0 && first !== index) return setIndex(first);
    const other = APPS.find((a) => a.id !== app && doneFor(a.id) < prompts.length);
    if (other) { setApp(other.id); setIndex(Math.max(0, prompts.findIndex((q) => !find(other.id, q)))); }
  }

  function saveAnswer() {
    const answer = text.trim();
    if (answer.length < 20 || !question) return;
    const sources = dedupeSources([...links, ...linksFromText(answer)].map((l) => source(l.url, l.title)))
      .filter((s) => s.domain && !CHAT_HOSTS.test(s.domain))
      .slice(0, 20);
    const v = judge({ name: profile.name, aliases: profile.aliases, domain: profile.domain }, answer, sources.map((s) => s.domain));
    const run: Run = {
      id: `paste-${app}-${question}`, prompt: question, provider: app, mode: "search", sample: 1, ok: true, ...v,
      sources, text: answer.slice(0, 8000), model: `${meta.name} app`, via: "paste", ms: 0,
    };
    onRuns([...runs.filter((r) => !(r.via === "paste" && r.provider === app && r.prompt === question)), run]);
    next();
  }

  function remove() {
    if (!existing) return;
    onRuns(runs.filter((r) => r !== existing));
    setText(""); setLinks([]);
  }

  const total = prompts.length * APPS.length;
  const done = APPS.reduce((n, a) => n + doneFor(a.id), 0);
  const sourceCount = new Set([...links, ...linksFromText(text)].filter((l) => !CHAT_HOSTS.test(source(l.url).domain)).map((l) => l.url)).size;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-semibold">Ask in your own AI accounts</h2>
          <p className="text-sm text-muted">Free. About 30 seconds per answer. Use a temporary or logged-out chat so your history doesn&apos;t sway the answer.</p>
        </div>
        <div className="text-sm font-semibold">{done} of {total} answers</div>
      </div>

      <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-3 pt-2 [scrollbar-width:none]" role="tablist">
        {APPS.map((a) => {
          const n = doneFor(a.id);
          return (
            <button key={a.id} role="tab" aria-selected={app === a.id} type="button"
              onClick={() => { setApp(a.id); setIndex(Math.max(0, prompts.findIndex((q) => !find(a.id, q)))); }}
              className={`-mb-px flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3.5 py-2 text-sm font-medium ${app === a.id ? "border-line bg-white" : "border-transparent text-muted hover:text-ink"}`}>
              {a.name}
              <span className={`rounded-full px-1.5 text-xs ${n === prompts.length ? "bg-emerald-50 text-good" : "bg-[#eef0f4] text-muted"}`}>{n}/{prompts.length}</span>
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ol className="max-h-[560px] overflow-y-auto border-t border-line md:border-r md:border-t-0">
          {prompts.map((q, i) => {
            const r = find(app, q);
            return (
              <li key={q}>
                <button type="button" onClick={() => { setIndex(i); if (window.innerWidth < 768) panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className={`flex w-full items-start gap-3 border-b border-line px-5 py-3 text-left text-sm ${i === index ? "bg-paper" : "hover:bg-[#fafafa]"}`}>
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${!r ? "border border-line text-muted" : r.mentioned ? "bg-good text-white" : "bg-bad text-white"}`}>
                    {!r ? i + 1 : r.mentioned ? "✓" : "×"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={i === index ? "font-medium" : ""}>{q}</span>
                    {r && <span className="mt-0.5 block text-xs text-muted">{r.mentioned ? `Named you${r.rank ? ` at #${r.rank}` : ""}` : r.others.length ? `Named ${r.others.slice(0, 3).join(", ")}` : "Didn't name you"}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div ref={panel} className="order-first scroll-mt-20 space-y-4 p-5 md:order-none">
          <div>
            <div className="label">Question {index + 1} of {prompts.length} · {meta.name}</div>
            <p className="mt-1 text-lg font-medium leading-snug">{question}</p>
          </div>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">1</span>
              <div className="min-w-0 flex-1 space-y-2">
                <button type="button" className="btn btn-primary" onClick={ask}>Ask {meta.name} ↗</button>
                <p className="text-muted">{meta.tip}{copied && !meta.prefill ? " Copied." : ""}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">2</span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-muted">Copy the whole answer (the copy button under it keeps the links) and paste it here.</p>
                <textarea ref={box} className="field min-h-44 font-mono !text-xs leading-relaxed" value={text} onPaste={onPaste}
                  onChange={(e) => { setText(e.target.value); if (!e.target.value) setLinks([]); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveAnswer(); }}
                  placeholder={`Paste ${meta.name}'s answer…`} aria-label={`${meta.name}'s answer`} />
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className="btn btn-primary" onClick={saveAnswer} disabled={text.trim().length < 20}>
                    {existing ? "Update and next" : "Save and next"}
                  </button>
                  {existing && <button type="button" className="btn btn-ghost" onClick={remove}>Remove answer</button>}
                  <span className="text-xs text-muted">{text.trim() ? `${sourceCount} link${sourceCount === 1 ? "" : "s"} found · Ctrl+Enter saves` : "Ctrl+Enter saves"}</span>
                </div>
              </div>
            </li>
          </ol>
          {existing && (
            <p className={`rounded-lg px-3 py-2 text-sm font-medium ${existing.mentioned ? "bg-emerald-50 text-good" : "bg-red-50 text-bad"}`}>
              {existing.mentioned ? `${meta.name} named ${profile.name}${existing.rank ? ` at #${existing.rank}` : ""}.` : `${meta.name} didn't name ${profile.name}.`}
              {existing.evidence && <span className="mt-1 block font-normal text-ink">“{existing.evidence}”</span>}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
