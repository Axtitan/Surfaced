"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Analysis, ProviderId, Run } from "@/lib/types";
import { summarise } from "@/lib/score";
import { getProject, saveProject, type AnswerMode, type Project } from "@/lib/store";
import ProfileEditor from "./ProfileEditor";
import PasteBoard from "./PasteBoard";
import Results from "./Results";
import FixPlan from "./FixPlan";
import { ScoreRing } from "./ui";

export type ProviderInfo = { id: ProviderId; label: string; vendor: string; searchCapable: boolean; connected: boolean; demo: boolean };
type Tab = "questions" | "answers" | "listings" | "site";
const TABS: { id: Tab; label: string }[] = [
  { id: "questions", label: "Questions" },
  { id: "answers", label: "Answers & score" },
  { id: "listings", label: "Get listed" },
  { id: "site", label: "Site fixes" },
];
const ALL: ProviderId[] = ["chatgpt", "claude", "gemini", "deepseek"];

export default function ProjectView({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("questions");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [picked, setPicked] = useState<ProviderId[]>([]);
  const [samples, setSamples] = useState(2);
  const [memory, setMemory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [ver, setVer] = useState(0);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const p = getProject(id);
    setProject(p);
    const fromHash = window.location.hash.slice(1) as Tab;
    if (TABS.some((t) => t.id === fromHash)) setTab(fromHash);
    else if (p?.runs.length) setTab("answers");
    fetch("/api/providers").then((r) => r.json()).then((d: { providers: ProviderInfo[] }) => {
      setProviders(d.providers);
      setPicked(d.providers.filter((x) => x.connected || x.demo).map((x) => x.id));
    }).catch(() => setProviders([]));
  }, [id]);

  useEffect(() => {
    const on = () => { const h = window.location.hash.slice(1) as Tab; if (TABS.some((t) => t.id === h)) setTab(h); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = (t: Tab) => { setTab(t); history.replaceState(null, "", `#${t}`); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // Save edits as they happen, but not every streamed answer mid-scan.
  const update = (patch: Partial<Project>) => setProject((p) => (p ? { ...p, ...patch, updatedAt: Date.now() } : p));
  useEffect(() => { if (project && !busy) saveProject(project); }, [project, busy]);

  // Pasted and automatic answers are kept apart: each mode scores only its own.
  const allRuns = project?.runs ?? [];
  const runs = useMemo(() => allRuns.filter((r) => (project?.mode === "paste" ? r.via === "paste" : r.via !== "paste")), [allRuns, project?.mode]);
  const shown = useMemo(() => ALL.filter((x) => runs.some((r) => r.provider === x) || (project?.mode === "auto" && picked.includes(x)) || project?.mode === "paste"), [runs, picked, project?.mode]);
  const summary = useMemo(() => summarise(runs, shown.length ? shown : ALL), [runs, shown]);

  if (project === undefined) return <div className="p-8 text-sm text-muted">Loading…</div>;
  if (project === null) return (
    <div className="mx-auto max-w-md p-8 text-center">
      <h1 className="font-display text-3xl">Check not found</h1>
      <p className="mt-2 text-muted">It may have been deleted, or it was made in another browser. Checks are saved in the browser you made them in.</p>
      <Link href="/app/new" className="btn btn-primary mt-6">Start a new check</Link>
    </div>
  );

  const { analysis } = project;
  const p = analysis.profile;
  const realKeys = providers.filter((x) => x.connected).length;
  const anyDemo = providers.some((x) => x.demo && picked.includes(x.id));
  const jobs = analysis.prompts.length * picked.length * samples + (memory ? analysis.prompts.length * picked.filter((x) => x !== "deepseek").length : 0);
  const hasResults = runs.some((r) => r.ok);

  async function scan() {
    setError(""); setBusy(true); setTotal(0);
    update({ runs: allRuns.filter((r) => r.via === "paste") });
    abort.current = new AbortController();
    try {
      const res = await fetch("/api/scan", {
        method: "POST", signal: abort.current.signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: { name: p.name, aliases: p.aliases, domain: p.domain, competitors: p.competitors }, prompts: analysis.prompts, providers: picked, samples, memory }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || "The scan failed to start.");
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.type === "start") setTotal(msg.total);
          if (msg.type === "run") setProject((cur) => cur && { ...cur, runs: [...cur.runs, { ...msg.run, via: "api" }], updatedAt: Date.now() });
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const modeCard = (m: AnswerMode, title: string, body: string, badge: string, disabled = false) => (
    <button type="button" disabled={disabled} onClick={() => update({ mode: m })}
      className={`rounded-2xl border p-5 text-left transition ${project.mode === m ? "border-ink bg-white shadow-[0_0_0_1px_var(--color-ink)]" : "border-line bg-white hover:border-[#c9cdd4]"} disabled:cursor-not-allowed disabled:opacity-50`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <span className={`chip ${m === "paste" ? "!bg-sky-50 !text-sky-800" : ""}`}>{badge}</span>
      </div>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-8 sm:pt-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ScoreRing score={hasResults ? summary.score : null} size={64} />
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl tracking-tight">{p.name}</h1>
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:underline">{p.domain} ↗</a>
          </div>
        </div>
        <Link href={`/app/new?url=${encodeURIComponent(p.url)}`} className="btn btn-ghost self-start sm:self-auto">Re-read website</Link>
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none]" aria-label="Check sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium ${tab === t.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6 space-y-6">
        {tab === "questions" && (
          <>
            <ProfileEditor key={ver} analysis={analysis} onChange={(a: Analysis) => update({ analysis: a })} />
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">How should we get the answers?</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {modeCard("paste", "Ask in your own accounts", "Open each question in ChatGPT, Claude, Gemini and DeepSeek (free plans work) and paste the answers back. About 20 minutes.", "Free")}
                {modeCard("auto", "Ask automatically", realKeys ? `Surfaced asks ${realKeys} connected AI${realKeys > 1 ? "s" : ""} through their APIs, several times each. About 3 minutes.` : "Needs API keys on the server. Without them, answers are simulated for testing.", realKeys ? "Uses API credits" : "Demo")}
              </div>
              <button type="button" className="btn btn-primary" onClick={() => go("answers")} disabled={!analysis.prompts.length}>Continue to answers →</button>
            </section>
          </>
        )}

        {tab === "answers" && (
          <>
            {project.mode === "paste" ? (
              <PasteBoard profile={p} prompts={analysis.prompts} runs={allRuns} onRuns={(next) => update({ runs: next })} />
            ) : (
              <section className="card space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Ask automatically</h2>
                    <p className="text-sm text-muted">Each question goes to each AI with live web search, the way their apps answer.</p>
                  </div>
                  <button type="button" className="text-sm font-medium underline" onClick={() => update({ mode: "paste" })}>Switch to free mode</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {providers.map((x) => {
                    const on = picked.includes(x.id), can = x.connected || x.demo;
                    return (
                      <button key={x.id} type="button" disabled={!can} onClick={() => setPicked((s) => (on ? s.filter((i) => i !== x.id) : [...s, x.id]))}
                        className={`chip !px-3 !py-1.5 !text-sm ${on && can ? "!bg-ink !text-white" : ""} ${!can ? "opacity-50" : ""}`}
                        title={!can ? `${x.label} isn't connected. Add its API key on the server.` : undefined}>
                        {x.label}{x.demo ? " (demo)" : ""}{!can ? " · not connected" : ""}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                  <label className="flex items-center gap-2">Ask each question
                    <select className="field !w-auto !py-1" value={samples} onChange={(e) => setSamples(Number(e.target.value))}>
                      <option value={1}>once</option><option value={2}>twice</option><option value={3}>3 times</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={memory} onChange={(e) => setMemory(e.target.checked)} />Also test without web search</label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {busy
                    ? <button type="button" className="btn btn-ghost" onClick={() => abort.current?.abort()}>Stop</button>
                    : <button type="button" className="btn btn-primary" onClick={scan} disabled={!picked.length || !analysis.prompts.length || jobs > 80}>Ask the AIs ({jobs} answers)</button>}
                  {jobs > 80 && <span className="text-sm text-bad">The limit is 80 answers per scan. Remove questions or repeats.</span>}
                  {error && <span className="text-sm font-medium text-bad" role="alert">{error}</span>}
                </div>
              </section>
            )}

            {(hasResults || busy) ? (
              <Results profile={p} runs={runs} total={total} running={busy} summary={summary} providers={providers.length ? providers : ALL.map((x) => ({ id: x, label: x, searchCapable: true }))} demo={anyDemo && project.mode === "auto" || runs.some((r) => r.demo)} />
            ) : (
              <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">Your score appears here as answers come in.</p>
            )}
            {hasResults && !busy && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink p-5 text-white">
                <p className="text-sm"><span className="font-semibold">Next:</span> get listed on the sites these AIs read.</p>
                <button type="button" className="btn bg-white !text-ink hover:bg-[#eef0f4]" onClick={() => go("listings")}>See where to submit →</button>
              </div>
            )}
          </>
        )}

        {tab === "listings" && <FixPlan section="listings" analysis={analysis} summary={summary} onProfile={(profile) => { update({ analysis: { ...analysis, profile } }); setVer((v) => v + 1); }} />}
        {tab === "site" && <FixPlan section="site" analysis={analysis} summary={summary} onProfile={() => {}} />}
      </div>
    </div>
  );
}
