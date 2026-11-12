"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Analysis } from "@/lib/types";
import { getProject, projectId, saveProject } from "@/lib/store";

const STEPS = ["Reading your homepage", "Checking what AI crawlers can see", "Working out what buyers ask"];

export default function NewCheck() {
  const router = useRouter();
  const params = useSearchParams();
  const [url, setUrl] = useState(params.get("url") ?? "");
  const [offer, setOffer] = useState("");
  const [rivals, setRivals] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const started = useRef(false);
  const offerRef = useRef<HTMLInputElement>(null);
  // Without Claude the questions come from a template, so the category matters more: ask for it up front.
  const [claude, setClaude] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/providers").then((r) => r.json()).then((d: { providers: { id: string; connected: boolean }[] }) =>
      setClaude(d.providers.some((x) => x.id === "claude" && x.connected))).catch(() => setClaude(false));
  }, []);

  async function run(target: string) {
    setError(""); setBusy(true); setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2200);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, offer: offer || undefined, competitors: rivals ? rivals.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      const analysis = data as Analysis;
      const id = projectId(analysis.profile.domain);
      const prev = getProject(id);
      const now = Date.now();
      // Re-reading a site keeps earlier answers only if the questions didn't change.
      const sameQuestions = prev && JSON.stringify(prev.analysis.prompts) === JSON.stringify(analysis.prompts);
      saveProject({ id, analysis, runs: sameQuestions ? prev.runs : [], mode: prev?.mode ?? "paste", createdAt: prev?.createdAt ?? now, updatedAt: now });
      router.push(`/app/p/${id}#questions`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    } finally {
      clearInterval(timer);
    }
  }

  // Coming from the landing page with a URL: start straight away when Claude can write the questions,
  // otherwise wait for the category.
  useEffect(() => {
    const u = params.get("url");
    if (claude === null || started.current || !u || params.get("go") !== "1") return;
    started.current = true;
    if (claude) run(u); else offerRef.current?.focus();
  }, [claude]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">New check</h1>
      <p className="mt-3 text-muted">Enter your website. We read it, work out what your buyers ask AI assistants, and set up the questions. Nothing is sent to the AIs until you say so.</p>

      <form onSubmit={(e) => { e.preventDefault(); run(url); }} className="card mt-8 space-y-4 p-5 sm:p-6">
        <label className="block space-y-1.5">
          <span className="label">Website</span>
          <input className="field !py-3 text-base" placeholder="yourproduct.com" value={url} onChange={(e) => setUrl(e.target.value)} required autoFocus={!params.get("url")} disabled={busy} inputMode="url" />
        </label>
        {claude === false && (
          <label className="block space-y-1.5">
            <span className="label">What do you offer, in a few words?</span>
            <input ref={offerRef} className="field" placeholder="e.g. note-taking app, wedding photographer in Austin" value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={120} disabled={busy} />
            <span className="block text-xs text-muted">This goes into the questions: “What is the best note-taking app?”</span>
          </label>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">{claude ? "Add details (optional, makes the questions sharper)" : "Add competitors (optional)"}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {claude && <label className="space-y-1"><span className="label">What you offer</span>
              <input className="field" placeholder="e.g. invoicing app for freelancers" value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={200} disabled={busy} /></label>}
            <label className="space-y-1"><span className="label">Competitors (comma separated)</span>
              <input className="field" placeholder="e.g. FreshBooks, Wave" value={rivals} onChange={(e) => setRivals(e.target.value)} disabled={busy} /></label>
          </div>
        </details>
        <button className="btn btn-primary w-full !py-3 sm:w-auto sm:px-8" disabled={busy || !url.trim()}>{busy ? "Working…" : "Check my visibility →"}</button>
        {busy && (
          <ol className="space-y-2 border-t border-line pt-4 text-sm" aria-live="polite">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-2.5 ${i > step ? "text-muted/60" : i === step ? "font-medium" : "text-muted"}`}>
                <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${i < step ? "bg-good text-white" : i === step ? "animate-pulse bg-ink" : "border border-line"}`}>{i < step ? "✓" : ""}</span>
                {s}
              </li>
            ))}
          </ol>
        )}
        {error && <p className="text-sm font-medium text-bad" role="alert">{error}</p>}
      </form>
    </div>
  );
}
