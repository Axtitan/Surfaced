"use client";

import { useId, useMemo, useRef, useState } from "react";
import { calibration, estimateCheck, pagesToRead, parseUrls, evidenceFor, type Basis, type EstimateReport, type QuestionEstimate, ESTIMATE_VERSION } from "@/lib/estimate";
import { EXTERNAL_REL, safeHref } from "@/lib/safe-href";
import type { CitedPage, Profile, Run } from "@/lib/types";

/* Estimate mode (experimental): no AI is asked. For each question Surfaced reads the pages AIs lean on (pages real
   answers cited, or pages the user adds) and estimates how often the product would be named. Always labelled as an
   estimate, kept apart from real answers, and compared with them when the check has both. */

const pct = (x: number) => `${Math.round(x * 100)}%`;
const BASIS: Record<Basis, string> = {
  cited: "From pages your saved answers cited",
  added: "From pages you added",
  pooled: "Borrowed from your other questions",
  none: "No pages yet",
};

function AddPages({ prompt, added, onAdded }: { prompt: string; added: string[]; onAdded: (urls: string[]) => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const search = safeHref(`https://www.google.com/search?q=${encodeURIComponent(prompt)}`);
  function add(e: React.FormEvent) {
    e.preventDefault();
    const found = parseUrls(text);
    if (!found.length) { setNote("No web page addresses found. Paste addresses that start with https://"); return; }
    const next = [...new Set([...added, ...found])].slice(0, 12);
    onAdded(next);
    setText(""); setNote(`${next.length - added.length} page${next.length - added.length === 1 ? "" : "s"} added. Run the estimate to read ${next.length - added.length === 1 ? "it" : "them"}.`);
  }
  return (
    <form className="space-y-2" onSubmit={add}>
      <label htmlFor={id} className="block text-sm font-medium">Add pages that rank for this question</label>
      <p className="text-xs text-muted">
        {search && <><a className="underline" href={search} target="_blank" rel={EXTERNAL_REL}>Search for the question ↗</a>, then paste </>}
        {!search && "Paste "}the addresses of the top results (reviews, &quot;best of&quot; lists, comparisons), one per line.
      </p>
      <textarea id={id} className="field min-h-20 font-mono !text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder="https://…" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-ghost !px-3 !py-1.5 !text-sm" disabled={!text.trim()}>Add pages</button>
        {added.length > 0 && <button type="button" className="text-xs text-muted underline" onClick={() => { onAdded([]); setNote("Added pages removed."); }}>Remove the {added.length} added</button>}
        <span className="text-xs text-muted" aria-live="polite">{note}</span>
      </div>
    </form>
  );
}

function Question({ q, pages, added, onAdded }: { q: QuestionEstimate; pages: Map<string, CitedPage>; added: string[]; onAdded: (urls: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const tone = q.p == null ? "text-muted" : q.p >= 0.6 ? "text-good" : q.p >= 0.25 ? "text-warn" : "text-bad";
  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">{q.prompt}</p>
          <p className="mt-0.5 text-xs text-muted">
            {BASIS[q.basis]}
            {q.read > 0 && <> · named on {q.namedOn} of {q.read} page{q.read === 1 ? "" : "s"} read</>}
            {q.read === 0 && q.evidence.length > 0 && <> · {q.evidence.length} page{q.evidence.length === 1 ? "" : "s"} to read</>}
          </p>
          {q.rivals.length > 0 && <p className="mt-1 text-sm"><span className="text-muted">Likely named:</span> {q.rivals.slice(0, 4).map((r) => `${r.name} (${pct(r.share)})`).join(", ")}</p>}
        </div>
        <div className="shrink-0 sm:text-right">
          {q.p == null
            ? <span className="chip">Not estimated</span>
            : <><span className={`text-xl font-semibold tabular-nums ${tone}`}>~{pct(q.p)}</span><span className="block text-xs text-muted">likely {pct(q.lo)}–{pct(q.hi)}</span></>}
        </div>
      </div>
      <button type="button" className="mt-2 text-xs font-medium underline" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        {open ? "Hide pages" : q.evidence.length ? `Pages and evidence (${q.evidence.length})` : "Add pages"}
      </button>
      {open && (
        <div id={id} className="mt-3 space-y-4 rounded-xl border border-line bg-paper p-4">
          {q.evidence.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {q.evidence.map((e) => {
                const page = pages.get(e.url);
                const href = safeHref(e.url);
                const label = page?.title || e.url.replace(/^https?:\/\//, "");
                return (
                  <li key={e.url} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    {href ? <a className="min-w-0 truncate hover:underline" href={href} target="_blank" rel={EXTERNAL_REL}>{label}</a> : <span className="min-w-0 truncate">{label}</span>}
                    <span className="shrink-0 text-xs">
                      {!page ? <span className="text-muted">Not read yet</span>
                        : page.status !== "checked" ? <span className="text-warn" title={page.note}>{page.status === "blocked" ? "Not allowed to read" : page.status === "skipped" ? "Not reached" : "Couldn't read"}</span>
                        : page.you ? <span className="text-good">Names you</span> : <span className="text-bad">Doesn&apos;t name you</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <AddPages prompt={q.prompt} added={added} onAdded={onAdded} />
        </div>
      )}
    </li>
  );
}

export default function EstimateBoard({ profile, prompts, runs, added, report, onAdded, onReport }: {
  profile: Profile; prompts: string[];
  /** Every real answer the check holds, pasted or automatic. Read for evidence and comparison only. */
  runs: Run[];
  added: Record<string, string[]>; report?: EstimateReport;
  onAdded: (next: Record<string, string[]>) => void; onReport: (r: EstimateReport) => void;
}) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const live = useMemo(() => runs.filter((r) => prompts.includes(r.prompt)), [runs, prompts]);
  const est = useMemo(() => estimateCheck({ prompts, runs: live, added, pages: report?.pages, competitors: profile.competitors }), [prompts, live, added, report, profile.competitors]);
  const evidence = useMemo(() => evidenceFor(prompts, live, added), [prompts, live, added]);
  const next = useMemo(() => pagesToRead(evidence, report?.pages), [evidence, report]);
  const pages = useMemo(() => new Map((report?.pages ?? []).map((p) => [p.url, p])), [report]);
  const check = useMemo(() => calibration(est.questions, live), [est.questions, live]);
  const total = new Set(Object.values(evidence).flat().map((e) => e.url)).size;

  async function run() {
    if (busy.current || !next.length) return;
    busy.current = true;
    setState("busy"); setError("");
    try {
      const res = await fetch("/api/estimate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls: next, brand: { name: profile.name, aliases: profile.aliases.slice(0, 10), domain: profile.domain }, competitors: profile.competitors.slice(0, 10) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "Something went wrong. Try again.");
      const fresh = data.pages as CitedPage[];
      // Pages read earlier stay; a page read again replaces its old result.
      const keep = (report?.pages ?? []).filter((p) => !fresh.some((f) => f.url === p.url));
      onReport({ version: ESTIMATE_VERSION, at: data.at as number, pages: [...fresh, ...keep] });
      setState("idle");
    } catch (e) {
      setError((e as Error).message); setState("error");
    } finally {
      busy.current = false;
    }
  }

  if (!prompts.length) return (
    <section className="card p-6 text-center">
      <h2 className="font-semibold">No questions yet</h2>
      <p className="mt-1 text-sm text-muted">Add the questions your buyers ask on the Questions tab, then come back to estimate.</p>
    </section>
  );

  return (
    <section className="card overflow-hidden" aria-labelledby="est-h">
      <div className="space-y-3 border-b border-line p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="est-h" className="text-lg font-semibold">Estimate without asking the AIs</h2>
          <span className="chip !bg-amber-50 !text-warn">Experimental</span>
        </div>
        <p className="max-w-3xl text-sm text-muted">
          AIs mostly name the products on the pages they read. Surfaced reads those pages and estimates how often {profile.name} would be named.
          This is an estimate, not a measurement: real answers vary, and nothing here replaces or changes the answers you&apos;ve saved.
        </p>
        <div aria-live="polite" className="space-y-2">
          {est.score != null ? (
            <p className="text-sm">
              <span className="text-2xl font-semibold tabular-nums">~{est.score}</span> <span className="text-muted">estimated visibility, likely {est.lo}–{est.hi}.</span>{" "}
              From {est.pagesRead} page{est.pagesRead === 1 ? "" : "s"} across {est.estimated} of {prompts.length} question{prompts.length === 1 ? "" : "s"}.
            </p>
          ) : total ? (
            <p className="text-sm">{total} page{total === 1 ? "" : "s"} to read for your questions. Run the estimate to read them.</p>
          ) : (
            <p className="text-sm">No pages to read yet. Open a question below and add the pages that rank for it, or paste one real answer with its links on the paste tab: its sources are used here too.</p>
          )}
          {check && (
            <p className="rounded-lg bg-paper px-3 py-2 text-sm">
              <span className="font-medium">Compared with your real answers:</span> estimated {pct(check.estimated)}, measured {pct(check.measured)} on {check.questions} question{check.questions === 1 ? "" : "s"} ({check.answers} answer{check.answers === 1 ? "" : "s"}), {Math.round(check.gap * 100)} point{Math.round(check.gap * 100) === 1 ? "" : "s"} apart on average.
              <span className="text-muted"> Where the same answers supplied the pages, treat this as a sanity check.</span>
            </p>
          )}
          {state === "busy" && <p className="text-sm text-muted" role="status">Reading up to {next.length} pages, one at a time per site. This can take up to a minute…</p>}
          {state === "error" && <p className="text-sm text-bad" role="alert">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={run} disabled={state === "busy" || !next.length}>
            {state === "busy" ? "Reading pages…" : !report ? "Run the estimate" : est.unread ? `Read ${Math.min(est.unread, next.length)} more page${Math.min(est.unread, next.length) === 1 ? "" : "s"}` : "Estimate again"}
          </button>
          {report && <span className="text-xs text-muted">Last run <time dateTime={new Date(report.at).toISOString()} title={new Date(report.at).toLocaleString()}>{new Date(report.at).toLocaleDateString()}</time></span>}
        </div>
      </div>
      <ul className="divide-y divide-line">
        {est.questions.map((q) => (
          <Question key={q.prompt} q={q} pages={pages} added={added[q.prompt] ?? []}
            onAdded={(urls) => { const { [q.prompt]: _old, ...rest } = added; onAdded(urls.length ? { ...rest, [q.prompt]: urls } : rest); }} />
        ))}
      </ul>
    </section>
  );
}
