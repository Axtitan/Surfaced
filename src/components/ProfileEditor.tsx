"use client";

import { useState } from "react";
import type { Analysis } from "@/lib/types";
import { templateQuestions } from "@/lib/questions";

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function ProfileEditor({ analysis, onChange, scanBar }: { analysis: Analysis; onChange: (a: Analysis) => void; scanBar?: React.ReactNode }) {
  const { profile: p, prompts } = analysis;
  const [draft, setDraft] = useState("");
  const set = (patch: Partial<Analysis["profile"]>) => onChange({ ...analysis, profile: { ...p, ...patch } });
  const setPrompts = (next: string[]) => onChange({ ...analysis, prompts: next });

  return (
    <section id="profile" className="card scroll-mt-6 space-y-6 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">How buyers will look for you</h2>
        <p className="mt-1 text-sm text-muted">
          {analysis.profiledBy === "claude" ? "Written by Claude from your site. Edit anything before asking the AIs." : "Written from a template. Check the category reads naturally in a question (e.g. “note-taking app”), then rewrite the questions."} Names are matched exactly, so add every spelling people use.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1"><span className="label">Name</span><input className="field" value={p.name} onChange={(e) => set({ name: e.target.value })} /></label>
        <label className="space-y-1"><span className="label">Other spellings</span><input className="field" defaultValue={p.aliases.join(", ")} onBlur={(e) => set({ aliases: list(e.target.value) })} placeholder="e.g. Acme App, AcmeHQ" /></label>
        <label className="space-y-1"><span className="label">Category</span><input className="field" value={p.category} onChange={(e) => set({ category: e.target.value })} /></label>
        <label className="space-y-1"><span className="label">Competitors AIs already recommend</span><input className="field" defaultValue={p.competitors.join(", ")} onBlur={(e) => set({ competitors: list(e.target.value) })} /></label>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label">Questions we&apos;ll ask ({prompts.length}/12)</span>
          <button type="button" className="text-sm font-medium underline underline-offset-2" onClick={() => setPrompts(templateQuestions(p.category, p.competitors))}>Rewrite questions from category</button>
        </div>
        <ul className="space-y-2">
          {prompts.map((q, i) => (
            <li key={i} className="flex gap-2">
              <input className="field" value={q} onChange={(e) => setPrompts(prompts.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Question ${i + 1}`} />
              <button type="button" className="btn btn-ghost !px-3" onClick={() => setPrompts(prompts.filter((_, j) => j !== i))} aria-label="Remove question">×</button>
            </li>
          ))}
        </ul>
        {prompts.length < 12 && (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim().length > 2) { setPrompts([...prompts, draft.trim()]); setDraft(""); } }}>
            <input className="field" placeholder="Add a question your buyers ask…" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button className="btn btn-ghost shrink-0">Add</button>
          </form>
        )}
      </div>
      {scanBar}
    </section>
  );
}
