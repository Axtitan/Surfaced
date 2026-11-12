"use client";

import { Fragment, useState } from "react";
import type { AiId, Profile, Run } from "@/lib/types";
import { AI_NAME } from "@/lib/ais";
import { interval, type summarise } from "@/lib/score";
import { EXTERNAL_REL, safeHref } from "@/lib/safe-href";

type Summary = ReturnType<typeof summarise>;
type ProviderInfo = { id: AiId; label: string; searchCapable: boolean };

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function Results({ profile, runs, total, running, summary, providers, demo }: {
  profile: Profile; runs: Run[]; total: number; running: boolean; summary: Summary; providers: ProviderInfo[]; demo: boolean;
}) {
  const [open, setOpen] = useState<{ prompt: string; provider: AiId } | null>(null);
  const prompts = [...new Set(runs.map((r) => r.prompt))];
  const cols = summary.byProvider.filter((p) => p.runs || runs.some((r) => r.provider === p.id));
  const label = (id: AiId) => providers.find((p) => p.id === id)?.label ?? AI_NAME[id] ?? id;
  const verdict = summary.score >= 60 ? "AIs recommend you often." : summary.score >= 25 ? "AIs recommend you sometimes." : summary.score > 0 ? "AIs rarely recommend you." : "AIs don't recommend you yet.";
  const detail = open ? runs.filter((r) => r.prompt === open.prompt && r.provider === open.provider) : [];

  return (
    <section id="results" className="card scroll-mt-6 space-y-6 p-5 sm:p-6">
      {demo && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-warn">
          Demo data: some answers below are simulated because those AIs aren&apos;t connected. Add API keys for real results.
        </p>
      )}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div role="img" aria-label={`Score ${summary.score} out of 100`} className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-ink) ${summary.score * 3.6}deg, #e9ebef 0)` }}>
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
            <div aria-hidden><div className="text-3xl font-bold">{summary.score}</div><div className="text-xs text-muted">out of 100</div></div>
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{running ? "Asking the AIs…" : verdict}</h2>
          <p className="text-sm text-muted">
            {running ? `${runs.length} of ${total || "…"} answers in.` : `Share of answers that name ${profile.name}, averaged across AIs, from ${runs.filter((r) => r.ok).length} answers.`}
            {summary.errors > 0 && ` ${summary.errors} questions failed and aren't counted.`}
          </p>
          {summary.memoryRate != null && <p className="text-sm text-muted">Without web search, the AIs named you in {pct(summary.memoryRate)} of answers. That reflects what the models learned in training.</p>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cols.map((p) => {
          const [lo, hi] = interval(p.mentioned, p.runs);
          return (
            <div key={p.id} className="rounded-xl border border-line p-4">
              <div className="flex items-baseline justify-between"><span className="font-semibold">{label(p.id)}</span><span className="text-2xl font-bold">{p.runs ? pct(p.rate) : "–"}</span></div>
              <div className="mt-2 h-1.5 rounded-full bg-[#e9ebef]"><div className="h-full rounded-full bg-ink" style={{ width: pct(p.rate) }} /></div>
              <p className="mt-2 text-xs text-muted">
                {p.mentioned} of {p.runs} answers{p.runs >= 4 ? `, likely ${pct(lo)}–${pct(hi)}` : ""}
                {p.avgRank ? ` · avg position ${p.avgRank.toFixed(1)}` : ""}
                {p.cited ? ` · linked your site ${p.cited}×` : ""}
                {p.id === "deepseek" && runs.some((r) => r.provider === "deepseek" && r.mode === "memory") ? " · no web search" : ""}
              </p>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm sm:min-w-[560px]">
          <thead><tr className="text-left text-muted"><th className="hidden py-2 pr-3 font-medium sm:table-cell">Question</th>{cols.map((c) => <th key={c.id} className="px-1 py-2 text-center text-xs font-medium sm:px-2 sm:text-sm">{label(c.id)}</th>)}</tr></thead>
          <tbody>
            {prompts.map((q) => (
              <Fragment key={q}>
              {/* On phones the question sits on its own line above its results. */}
              <tr className="border-t border-line sm:hidden"><td colSpan={cols.length} className="pt-2.5 pb-1">{q}</td></tr>
              <tr className="border-line sm:border-t">
                <td className="hidden py-2 pr-3 sm:table-cell">{q}</td>
                {cols.map((c) => {
                  const cell = runs.filter((r) => r.prompt === q && r.provider === c.id && (r.mode === "search" || c.id === "deepseek"));
                  const ok = cell.filter((r) => r.ok), hit = ok.filter((r) => r.mentioned).length;
                  const best = ok.map((r) => r.rank).filter(Boolean).sort((a, b) => a! - b!)[0];
                  const tone = !cell.length ? "text-muted" : !ok.length ? "text-bad" : hit === ok.length ? "bg-emerald-50 text-good" : hit ? "bg-amber-50 text-warn" : "bg-red-50 text-bad";
                  return (
                    <td key={c.id} className="px-1 py-1 text-center">
                      <button type="button" disabled={!cell.length} onClick={() => setOpen({ prompt: q, provider: c.id })}
                        className={`w-full rounded-md px-2 py-1.5 font-semibold ${tone}`} title="See the answers"
                        aria-label={`${label(c.id)}: ${!cell.length ? "no answer yet" : !ok.length ? "failed" : `named you in ${hit} of ${ok.length}`}. Show answers`}>
                        {!cell.length ? "…" : !ok.length ? "error" : `${hit}/${ok.length}${best ? ` · #${best}` : ""}`}
                      </button>
                    </td>
                  );
                })}
              </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="space-y-3 rounded-xl border border-line bg-paper p-4">
          <div className="flex items-start justify-between gap-3">
            <div><div className="label">{label(open.provider)}</div><div className="font-semibold">{open.prompt}</div></div>
            <button type="button" className="btn btn-ghost !px-3 !py-1" onClick={() => setOpen(null)}>Close</button>
          </div>
          {detail.map((r) => (
            <article key={r.id} className="space-y-2 rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`chip ${r.mentioned ? "!bg-emerald-50 !text-good" : "!bg-red-50 !text-bad"}`}>{!r.ok ? "Failed" : r.mentioned ? `Named you${r.rank ? ` at #${r.rank}` : ""}` : "Didn't name you"}</span>
                <span className="chip">{r.mode === "search" ? "web search" : "no web search"}</span>
                <span className="chip">try {r.sample}</span>
                {r.model && <span className="chip">{r.model}</span>}
                {r.demo && <span className="chip !bg-amber-50 !text-warn">simulated</span>}
                {r.via === "paste" && <span className="chip !bg-sky-50 !text-sky-800">pasted from the app</span>}
              </div>
              {r.error && <p className="text-sm text-bad">{r.error}</p>}
              {r.evidence && <blockquote className="border-l-2 border-good pl-3 text-sm">{r.evidence}</blockquote>}
              {!r.mentioned && r.others.length > 0 && <p className="text-sm"><span className="text-muted">Named instead: </span>{r.others.slice(0, 8).join(", ")}</p>}
              {r.text && <details className="text-sm"><summary className="cursor-pointer text-muted">Full answer</summary><pre className="mt-2 whitespace-pre-wrap font-sans">{r.text}</pre></details>}
              {r.sources.length > 0 && (
                <p className="text-xs text-muted">Sources: {r.sources.slice(0, 8).map((s, i) => {
                  const href = safeHref(s.url);
                  return href ? <a key={i} className="mr-2 underline" href={href} target="_blank" rel={EXTERNAL_REL}>{s.domain}</a> : <span key={i} className="mr-2">{s.domain}</span>;
                })}</p>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold">Who the AIs recommend instead</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.rivals.length ? summary.rivals.map(([n, c]) => <span key={n} className="chip">{n} · {c}</span>) : <span className="text-sm text-muted">Nothing yet.</span>}
          </div>
        </div>
        <div>
          <h3 className="font-semibold">Sites the AIs cite for these questions</h3>
          <p className="text-xs text-muted">Being listed on these is the most direct way into the answers.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.domains.length ? summary.domains.map(([d, c]) => <span key={d} className="chip">{d} · {c}</span>) : <span className="text-sm text-muted">No sources returned yet.</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
