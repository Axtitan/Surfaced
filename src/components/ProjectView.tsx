"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AiId, Analysis, ProviderId } from "@/lib/types";
import { ALL_AIS } from "@/lib/ais";
import { track } from "@vercel/analytics";
import { summarise } from "@/lib/score";
import { getProject, modeRuns, projectEstimate, projectKey, saveProject, submittedCount, type AnswerMode, type Project } from "@/lib/store";
import { autoRunsAfter } from "@/lib/scan-machine";
import { EXTERNAL_REL, safeHref } from "@/lib/safe-href";
import ProfileEditor, { type QuestionChange } from "./ProfileEditor";
import PasteBoard from "./PasteBoard";
import Results from "./Results";
import FixPlan from "./FixPlan";
import Competitors from "./Competitors";
import CitedPages from "./CitedPages";
import Overview from "./Overview";
import CheckSettings from "./CheckSettings";
import EstimateBoard from "./EstimateBoard";
import StorageWarning from "./StorageWarning";
import { useScan } from "./useScan";
import { ScoreRing } from "./ui";

export type ProviderInfo = { id: ProviderId; label: string; vendor: string; searchCapable: boolean; connected: boolean; demo: boolean };
type Tab = "overview" | "questions" | "answers" | "competitors" | "cited" | "listings" | "site" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "questions", label: "Questions" },
  { id: "answers", label: "Answers & score" },
  { id: "competitors", label: "Competitors" },
  { id: "cited", label: "Cited pages" },
  { id: "listings", label: "Get listed" },
  { id: "site", label: "Site fixes" },
  { id: "settings", label: "Settings" },
];
const ALL: ProviderId[] = ["chatgpt", "claude", "gemini", "deepseek"];
const MAX_ANSWERS = 80;

export default function ProjectView({ id }: { id: string }) {
  // This component only renders in the browser (ProjectViewClient), so it can read storage while initialising.
  const [project, setProject] = useState<Project | null | undefined>(() => getProject(id));
  const [deletedElsewhere, setDeletedElsewhere] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [tab, setTab] = useState<Tab>(() => {
    const fromHash = window.location.hash.slice(1) as Tab;
    if (TABS.some((t) => t.id === fromHash)) return fromHash;
    return getProject(id)?.runs.length ? "overview" : "questions";
  });
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [providersFailed, setProvidersFailed] = useState(false);
  const [picked, setPicked] = useState<ProviderId[]>([]);
  const [samples, setSamples] = useState(2);
  const [memory, setMemory] = useState(false);
  const [ver, setVer] = useState(0);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const projectRef = useRef(project);
  useEffect(() => { projectRef.current = project; });

  // A finished scan replaces the automatic answers only if new ones arrived (F-26). It writes to storage directly,
  // so answers that came in before the user left the page are still kept (F-28).
  const { state: scan, start, stop, running } = useScan((received) => {
    if (!received.length) return;
    const cur = getProject(id) ?? projectRef.current;
    if (!cur) return;
    const next = { ...cur, runs: [...cur.runs.filter((r) => r.via === "paste"), ...received], updatedAt: Date.now() };
    setSaveFailed(!saveProject(next));
    setProject(next);
  });

  useEffect(() => {
    fetch("/api/providers").then((r) => r.json()).then((d: { providers: ProviderInfo[] }) => {
      setProviders(d.providers);
      setPicked(d.providers.filter((x) => x.connected || x.demo).map((x) => x.id));
    }).catch(() => { setProviders([]); setProvidersFailed(true); });
  }, [id]);

  useEffect(() => {
    const on = () => { const h = window.location.hash.slice(1) as Tab; if (TABS.some((t) => t.id === h)) setTab(h); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // Another tab deleted or changed this check (F-34).
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key !== projectKey(id) && e.key !== null) return;
      if (e.key === null || e.newValue === null) { setDeletedElsewhere(true); return; }
      try {
        const p = JSON.parse(e.newValue) as Project;
        setProject((cur) => (!cur || p.updatedAt > cur.updatedAt ? p : cur));
      } catch { /* ignore */ }
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, [id]);

  const go = (t: Tab, focus = false) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
    if (focus) tabRefs.current[t]?.focus();
  };

  // Save edits as they happen; never recreate a check that was deleted in another tab.
  const update = (patch: Partial<Project> | ((p: Project) => Partial<Project>)) =>
    setProject((p) => (p ? { ...p, ...(typeof patch === "function" ? patch(p) : patch), updatedAt: Date.now() } : p));
  const first = useRef(true);
  useEffect(() => {
    if (!project || deletedElsewhere) return;
    if (first.current) { first.current = false; return; }
    setSaveFailed(!saveProject(project));
  }, [project, deletedElsewhere]);

  const allRuns = useMemo(() => project?.runs ?? [], [project?.runs]);
  const prompts = project?.analysis.prompts;
  // Pasted and automatic answers are kept apart; each mode scores only its own, and only for current questions.
  const runs = useMemo(() => {
    if (!project) return [];
    // Estimate mode has no answers of its own; the other tabs show the real ones the check holds.
    if (project.mode !== "auto") return modeRuns(project);
    const live = new Set(prompts);
    const prevAuto = allRuns.filter((r) => r.via !== "paste");
    return (running ? autoRunsAfter(scan, prevAuto) : prevAuto).filter((r) => live.has(r.prompt));
  }, [project, allRuns, prompts, running, scan]);
  // Columns: AIs with answers, plus the ones about to be asked (auto) or the core four (paste). Optional paste-only AIs
  // appear once they have answers.
  const shown = useMemo<AiId[]>(() => ALL_AIS.filter((x) => runs.some((r) => r.provider === x) || (project?.mode === "auto" && picked.includes(x as ProviderId)) || (project?.mode === "paste" && ALL.includes(x as ProviderId))), [runs, picked, project?.mode]);
  const summary = useMemo(() => summarise(runs, shown.length ? shown : ALL), [runs, shown]);

  if (project === undefined) return <div className="p-8 text-sm text-muted" role="status">Loading…</div>;
  if (project === null || deletedElsewhere) return (
    <div className="mx-auto max-w-md p-8 text-center">
      <h1 className="font-display text-3xl">{deletedElsewhere ? "This check was deleted" : "Check not found"}</h1>
      <p className="mt-2 text-muted">{deletedElsewhere ? "It was deleted in another tab or window, so changes here aren't saved." : "It may have been deleted, or it was made in another browser. Checks are saved in the browser you made them in."}</p>
      <Link href="/app/new" className="btn btn-primary mt-6">Start a new check</Link>
    </div>
  );

  const { analysis } = project;
  const p = analysis.profile;
  const list = providers ?? [];
  const realKeys = list.filter((x) => x.connected).length;
  const anyDemo = list.some((x) => x.demo && picked.includes(x.id));
  const jobs = analysis.prompts.length * picked.length * samples + (memory ? analysis.prompts.length * picked.filter((x) => x !== "deepseek").length : 0);
  const hasResults = runs.some((r) => r.ok);
  const estimating = project.mode === "estimate";
  const est = estimating ? projectEstimate(project) : null;
  const answersFor = (q: string) => allRuns.filter((r) => r.prompt === q && (project.mode === "paste" ? r.via === "paste" : r.via !== "paste")).length;

  const onQuestions = (next: string[], change?: QuestionChange | "replace-all") => update((cur) => {
    let nextRuns = cur.runs;
    if (change === "replace-all") nextRuns = cur.runs.filter((r) => next.includes(r.prompt));
    else if (change) nextRuns = cur.runs.flatMap((r) => {
      if (r.prompt !== change.from) return [r];
      if (!change.keep || !change.to) return [];
      return [{ ...r, prompt: change.to, id: r.via === "paste" ? `paste-${r.provider}-${change.to}` : r.id }];
    });
    return { analysis: { ...cur.analysis, prompts: next }, runs: nextRuns };
  });

  function scan_() {
    track("auto_scan_started", { ais: picked.length });
    start({ brand: { name: p.name, aliases: p.aliases, domain: p.domain, competitors: p.competitors }, prompts: analysis.prompts, providers: picked, samples, memory });
  }

  const modeCard = (m: AnswerMode, title: string, body: string, badge: string) => (
    <button type="button" disabled={running} onClick={() => update({ mode: m })} aria-pressed={project.mode === m}
      className={`rounded-2xl border p-5 text-left transition ${project.mode === m ? "border-ink bg-white shadow-[0_0_0_1px_var(--color-ink)]" : "border-line bg-white hover:border-[#c9cdd4]"} disabled:cursor-not-allowed disabled:opacity-50`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <span className={`chip ${m === "paste" ? "!bg-sky-50 !text-sky-800" : m === "estimate" ? "!bg-amber-50 !text-warn" : ""}`}>{badge}</span>
      </div>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </button>
  );

  const onTabKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const to = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    go(TABS[to].id, true);
  };

  const scanBanner = scan.status === "running" ? null
    : scan.status === "failed" ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-bad" role="alert">{scan.error || scan.note}</p>
    : scan.status === "partial" ? <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-warn" role="status">Partial result. {scan.note}</p>
    : scan.status === "cancelled" ? <p className="rounded-lg bg-paper px-4 py-3 text-sm text-muted" role="status">{scan.note}</p>
    : null;

  const siteHref = safeHref(p.url);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-8 sm:pt-8">
      {saveFailed && <StorageWarning />}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ScoreRing score={estimating ? est?.score ?? null : hasResults ? summary.score : null} size={64} />
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl tracking-tight">{p.name}</h1>
            {siteHref ? <a href={siteHref} target="_blank" rel={EXTERNAL_REL} className="text-sm text-muted hover:underline">{p.domain} ↗</a> : <span className="text-sm text-muted">{p.domain}</span>}
            {estimating && est?.score != null && <span className="chip ml-2 !bg-amber-50 !text-warn">Estimated score</span>}
          </div>
        </div>
        <div className="no-print flex flex-wrap gap-2 self-start sm:self-auto">
          {(hasResults || est?.score != null) && <button type="button" className="btn btn-ghost" onClick={() => window.print()} title="Opens the print dialog. Choose “Save as PDF” as the printer.">Save as PDF</button>}
          <Link href={`/app/new?url=${encodeURIComponent(p.url)}&reread=1`} className="btn btn-ghost" aria-disabled={running} onClick={(e) => running && e.preventDefault()}>Re-read website</Link>
        </div>
      </div>
      <p className="print-only mt-2 text-xs text-muted">Surfaced report · {TABS.find((t) => t.id === tab)?.label} · {p.domain} · {new Date().toLocaleDateString()}</p>

      <div role="tablist" aria-label="Check sections" onKeyDown={onTabKey} className="mt-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none]">
        {TABS.map((t) => (
          <button key={t.id} ref={(el) => { tabRefs.current[t.id] = el; }} id={`tab-${t.id}`} role="tab" type="button" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1} onClick={() => go(t.id)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium ${tab === t.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className="mt-6 space-y-6 focus-visible:outline-none">
        {tab === "questions" && (
          <>
            <ProfileEditor key={ver} analysis={analysis} locked={running} answersFor={answersFor} onQuestions={onQuestions} onChange={(a: Analysis) => update({ analysis: a })} />
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">How should we get the answers?</h2>
              {running && <p className="text-sm text-muted" role="status">The AIs are being asked automatically. Stop the scan on the Answers tab to switch.</p>}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {modeCard("paste", "Ask in your own accounts", "Open each question in ChatGPT, Claude, Gemini and DeepSeek (free plans work) and paste the answers back. About 20 minutes.", "Free")}
                {modeCard("auto", "Ask automatically", realKeys ? `Surfaced asks ${realKeys} connected AI${realKeys > 1 ? "s" : ""} through their APIs, several times each. About 3 minutes.` : providers === null ? "Checking which AIs are connected…" : "Not available yet: automatic checks need accounts and API keys on the server. Free mode works now.", realKeys ? "Uses API credits" : "Not available")}
                {modeCard("estimate", "Estimate from the pages AIs read", "No AI is asked. Surfaced reads the pages AIs lean on for your questions and estimates how often you'd be named. Quick, free and approximate; your saved answers stay as they are.", "Experimental")}
              </div>
              <button type="button" className="btn btn-primary" onClick={() => go("answers")} disabled={!analysis.prompts.length}>Continue to answers →</button>
            </section>
          </>
        )}

        {tab === "answers" && (
          <>
            {estimating ? (
              <EstimateBoard profile={p} prompts={analysis.prompts} runs={allRuns} added={project.evidence ?? {}} report={project.estimate}
                onAdded={(evidence) => update({ evidence })} onReport={(estimate) => update({ estimate })} />
            ) : project.mode === "paste" ? (
              <PasteBoard profile={p} prompts={analysis.prompts} runs={allRuns} onRuns={(next) => update({ runs: next })} />
            ) : (
              <section className="card space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Ask automatically</h2>
                    <p className="text-sm text-muted">Each question goes to each AI with live web search, the way their apps answer.</p>
                  </div>
                  <button type="button" className="text-sm font-medium underline disabled:opacity-50" disabled={running} onClick={() => update({ mode: "paste" })}>Switch to free mode</button>
                </div>
                {providersFailed && <p className="text-sm text-bad" role="alert">Couldn&apos;t check which AIs are connected. Reload the page to try again.</p>}
                <div className="flex flex-wrap gap-2">
                  {providers === null && <span className="text-sm text-muted" role="status">Checking connections…</span>}
                  {list.map((x) => {
                    const on = picked.includes(x.id), can = x.connected || x.demo;
                    return (
                      <button key={x.id} type="button" disabled={!can || running} aria-pressed={on && can} onClick={() => setPicked((s) => (on ? s.filter((i) => i !== x.id) : [...s, x.id]))}
                        className={`chip !px-3 !py-1.5 !text-sm ${on && can ? "!bg-ink !text-white" : ""} ${!can ? "opacity-50" : ""}`}
                        title={!can ? `${x.label} isn't connected.` : undefined}>
                        {x.label}{x.demo ? " (demo)" : ""}{!can ? " · not connected" : ""}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                  <label className="flex items-center gap-2">Ask each question
                    <select className="field !w-auto !py-1" value={samples} disabled={running} onChange={(e) => setSamples(Number(e.target.value))}>
                      <option value={1}>once</option><option value={2}>twice</option><option value={3}>3 times</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={memory} disabled={running} onChange={(e) => setMemory(e.target.checked)} />Also test without web search</label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {running
                    ? <button type="button" className="btn btn-ghost" onClick={stop}>Stop</button>
                    : <button type="button" className="btn btn-primary" onClick={scan_} disabled={!picked.length || !analysis.prompts.length || jobs > MAX_ANSWERS}>Ask the AIs ({jobs} answers)</button>}
                  {jobs > MAX_ANSWERS && <span className="text-sm text-bad">The limit is {MAX_ANSWERS} answers per scan. Remove questions or repeats.</span>}
                </div>
                {scanBanner}
              </section>
            )}

            {estimating ? (
              hasResults && <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">This check also has {runs.filter((r) => r.ok).length} real answer{runs.filter((r) => r.ok).length === 1 ? "" : "s"}. They are untouched: switch the mode on the Questions tab to see their score.</p>
            ) : (hasResults || running) ? (
              <Results profile={p} runs={runs} total={scan.total} running={running} summary={summary} providers={list.length ? list : ALL.map((x) => ({ id: x, label: x, searchCapable: true }))} demo={(anyDemo && project.mode === "auto") || runs.some((r) => r.demo)} />
            ) : (
              <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">Your score appears here as answers come in.</p>
            )}
            {(estimating ? est?.score != null : hasResults) && !running && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink p-5 text-white">
                <p className="text-sm"><span className="font-semibold">Next:</span> get listed on the sites these AIs read.</p>
                <button type="button" className="btn bg-white !text-ink hover:bg-[#eef0f4]" onClick={() => go("listings")}>See where to submit →</button>
              </div>
            )}
          </>
        )}

        {tab === "overview" && (
          <Overview profile={p} runs={runs} prompts={analysis.prompts} summary={summary} checks={analysis.checks} cited={project.cited}
            submitted={submittedCount(project.id)}
            expected={estimating ? 0 : analysis.prompts.length * (project.mode === "paste" ? ALL.length : Math.max(1, picked.length) * samples)}
            estimate={est ?? undefined}
            onGo={(t) => go(t, true)} />
        )}
        {tab === "competitors" && <Competitors profile={p} runs={runs} />}
        {tab === "cited" && <CitedPages profile={p} runs={runs} report={project.cited} onReport={(cited) => update({ cited })} onAnswers={() => go("answers", true)} />}
        {tab === "settings" && <CheckSettings project={project} locked={running} />}
        {tab === "listings" && <FixPlan section="listings" analysis={analysis} summary={summary} onProfile={(profile) => { update({ analysis: { ...analysis, profile } }); setVer((v) => v + 1); }} />}
        {tab === "site" && <FixPlan section="site" analysis={analysis} summary={summary} onProfile={() => {}} />}
      </div>
    </div>
  );
}

