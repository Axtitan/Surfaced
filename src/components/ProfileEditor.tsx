"use client";

import { useState } from "react";
import type { Analysis } from "@/lib/types";
import { templateQuestions } from "@/lib/questions";
import { questionProblem } from "@/lib/question-checks";

const list = (s: string) => s.split(",").map((x) => x.normalize("NFC").trim()).filter(Boolean);
const MAX_QUESTIONS = 12;

/** A change to the question list, and what happens to the answers of a question that was edited or removed. */
export type QuestionChange = { from: string; to: string | null; keep: boolean };

function QuestionRow({ q, i, answers, onCommit, onRemove, disabled }: {
  q: string; i: number; answers: number; disabled: boolean;
  onCommit: (next: string) => void; onRemove: () => void;
}) {
  const [draft, setDraft] = useState(q);
  // The saved text changed (another edit, or a reset): show it.
  const [shown, setShown] = useState(q);
  if (shown !== q) { setShown(q); setDraft(q); }
  const problem = draft.trim() ? questionProblem(draft) : "can't be empty";
  return (
    <li className="space-y-1">
      <div className="flex gap-2">
        <input className={`field ${problem ? "!border-warn" : ""}`} value={draft} disabled={disabled} aria-label={`Question ${i + 1}`}
          aria-invalid={!!problem} aria-describedby={problem ? `q-${i}-err` : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { const t = draft.normalize("NFC").trim(); if (t && t !== q) onCommit(t); else setDraft(q); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setDraft(q); }} />
        <button type="button" className="btn btn-ghost !px-3" disabled={disabled} onClick={onRemove} aria-label={`Remove question ${i + 1}`}>×</button>
      </div>
      {problem && <p id={`q-${i}-err`} className="text-xs text-warn">This question {problem}; it can&apos;t be sent to the AIs automatically.</p>}
      {answers > 0 && !problem && <p className="text-xs text-muted">{answers} answer{answers === 1 ? "" : "s"} saved for this question.</p>}
    </li>
  );
}

export default function ProfileEditor({ analysis, onChange, onQuestions, answersFor, locked = false }: {
  analysis: Analysis;
  onChange: (a: Analysis) => void;
  /** New question list, plus what to do with the answers of an edited or removed question (F-11). */
  onQuestions: (next: string[], change?: QuestionChange | "replace-all") => void;
  answersFor: (q: string) => number;
  /** True while a scan runs: questions can't change under it. */
  locked?: boolean;
}) {
  const { profile: p, prompts } = analysis;
  const [draft, setDraft] = useState("");
  const set = (patch: Partial<Analysis["profile"]>) => onChange({ ...analysis, profile: { ...p, ...patch } });

  const edit = (i: number, next: string) => {
    const from = prompts[i];
    if (prompts.some((x, j) => j !== i && x.toLowerCase() === next.toLowerCase())) { alert("That question is already in the list."); return; }
    const n = answersFor(from);
    const keep = n > 0 ? confirm(`Keep the ${n} saved answer${n === 1 ? "" : "s"} for this question?\n\nOK keeps them under the new wording. Cancel removes them, so you can ask again.`) : false;
    onQuestions(prompts.map((x, j) => (j === i ? next : x)), { from, to: next, keep });
  };
  const remove = (i: number) => {
    const from = prompts[i];
    const n = answersFor(from);
    if (n > 0 && !confirm(`Remove this question and its ${n} saved answer${n === 1 ? "" : "s"}?`)) return;
    onQuestions(prompts.filter((_, j) => j !== i), { from, to: null, keep: false });
  };
  const rewrite = () => {
    const n = prompts.reduce((a, q) => a + answersFor(q), 0);
    if (n > 0 && !confirm(`Replace all questions? The ${n} saved answers to the current questions will be removed.`)) return;
    onQuestions(templateQuestions(p.category, p.competitors, p.location), "replace-all");
  };

  return (
    <section id="profile" className="card scroll-mt-6 space-y-6 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">How buyers will look for you</h2>
        <p className="mt-1 text-sm text-muted">
          {analysis.profiledBy === "claude" ? "Written by Claude from your site. Edit anything before asking the AIs." : "Written from a template. Check the category reads naturally in a question (e.g. “note-taking app”), then rewrite the questions."} Names are matched exactly, so add every spelling people use.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1"><span className="label">Name</span><input className="field" value={p.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} /></label>
        <label className="space-y-1"><span className="label">Other spellings</span><input className="field" defaultValue={p.aliases.join(", ")} onBlur={(e) => set({ aliases: list(e.target.value).slice(0, 8) })} placeholder="e.g. Acme App, AcmeHQ" /></label>
        <label className="space-y-1"><span className="label">Category</span><input className="field" value={p.category} maxLength={80} onChange={(e) => set({ category: e.target.value })} /></label>
        <label className="space-y-1"><span className="label">Place (local businesses only)</span><input className="field" value={p.location} maxLength={80} placeholder="e.g. Austin, Texas" onChange={(e) => set({ location: e.target.value })} /></label>
        <label className="space-y-1 sm:col-span-2"><span className="label">Competitors AIs already recommend</span><input className="field" defaultValue={p.competitors.join(", ")} onBlur={(e) => set({ competitors: list(e.target.value).slice(0, 12) })} /></label>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label" id="questions-label">Questions we&apos;ll ask ({prompts.length}/{MAX_QUESTIONS})</span>
          <button type="button" className="text-sm font-medium underline underline-offset-2 disabled:opacity-50" disabled={locked} onClick={rewrite}>Rewrite questions from category</button>
        </div>
        {locked && <p className="text-sm text-muted" role="status">Questions can&apos;t be changed while the AIs are being asked.</p>}
        {!prompts.length && <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">No questions yet. Add one below or rewrite them from the category.</p>}
        <ul className="space-y-2" aria-labelledby="questions-label">
          {prompts.map((q, i) => (
            <QuestionRow key={`${i}:${q}`} q={q} i={i} answers={answersFor(q)} disabled={locked} onCommit={(next) => edit(i, next)} onRemove={() => remove(i)} />
          ))}
        </ul>
        {prompts.length < MAX_QUESTIONS && (
          <form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            const t = draft.normalize("NFC").trim();
            if (t.length > 2 && !prompts.some((x) => x.toLowerCase() === t.toLowerCase())) { onQuestions([...prompts, t]); setDraft(""); }
          }}>
            <input className="field" placeholder="Add a question your buyers ask…" value={draft} maxLength={300} disabled={locked} onChange={(e) => setDraft(e.target.value)} aria-label="New question" />
            <button className="btn btn-ghost shrink-0" disabled={locked}>Add</button>
          </form>
        )}
      </div>
    </section>
  );
}
