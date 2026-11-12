"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Analysis } from "@/lib/types";
import { track } from "@vercel/analytics";
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
  const [replace, setReplace] = useState(false);
  const reread = params.get("reread") === "1";
  const started = useRef(false);
  const busyRef = useRef(false);
  const offerRef = useRef<HTMLInputElement>(null);
  // Without Claude the questions come from a template, so the category matters more: ask for it up front.
  const [claude, setClaude] = useState<boolean | null>(null);
  // Once we know whether Claude can write the questions: coming from the landing page with a URL starts straight
  // away when it can, otherwise focuses the category field first.
  useEffect(() => {
    const ready = (hasClaude: boolean) => {
      setClaude(hasClaude);
      const u = params.get("url");
      if (started.current || !u || params.get("go") !== "1") return;
      started.current = true;
      if (hasClaude) run(u); else requestAnimationFrame(() => offerRef.current?.focus());
    };
    fetch("/api/providers").then((r) => r.json()).then((d: { providers: { id: string; connected: boolean }[] }) =>
      ready(d.providers.some((x) => x.id === "claude" && x.connected))).catch(() => ready(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- runs once on arrival

  async function run(target: string) {
    if (busyRef.current) return; // double-submit guard
    busyRef.current = true;
    setError(""); setBusy(true); setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2200);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, offer: offer || undefined, competitors: rivals ? rivals.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10) : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "Something went wrong. Try again.");
      track("check_started", { claude: !!claude });
      const analysis = data as Analysis;
      const id = projectId(analysis.profile.domain);
      const prev = getProject(id);
      const now = Date.now();
      // Re-reading a site keeps the user's profile, questions and answers, and refreshes the site checks (F-08).
      // Replacing the questions too is a separate choice, confirmed with the number of answers it removes.
      if (prev && !replace) {
        saveProject({ ...prev, analysis: { ...prev.analysis, checks: analysis.checks }, updatedAt: now });
      } else {
        const kept = prev ? prev.runs.filter((r) => analysis.prompts.includes(r.prompt)) : [];
        const lost = prev ? prev.runs.length - kept.length : 0;
        if (lost && !confirm(`Replace the questions? ${lost} saved answer${lost === 1 ? "" : "s"} to the old questions will be removed.`)) {
          busyRef.current = false; setBusy(false); return;
        }
        saveProject({ id, analysis, runs: kept, mode: prev?.mode ?? "paste", createdAt: prev?.createdAt ?? now, updatedAt: now });
      }
      router.push(`/app/p/${id}#questions`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      busyRef.current = false;
    } finally {
      clearInterval(timer);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{reread ? "Re-read website" : "New check"}</h1>
      <p className="mt-3 text-muted">Enter your website. We read it, work out what your buyers ask AI assistants, and set up the questions. Nothing is sent to the AIs until you say so.</p>

      <form onSubmit={(e) => { e.preventDefault(); run(url); }} className="card mt-8 space-y-4 p-5 sm:p-6">
        <label className="block space-y-1.5">
          <span className="label">Website</span>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the address is this page's only task, and it's labelled */}
          <input className="field !py-3 text-base" placeholder="yourproduct.com" value={url} onChange={(e) => setUrl(e.target.value)} required autoFocus={!params.get("url")} disabled={busy} inputMode="url" />
        </label>
        {claude === false && (
          <label className="block space-y-1.5">
            <span className="label">What do you offer, in a few words?</span>
            <input ref={offerRef} className="field" placeholder="e.g. note-taking app, wedding photographer in Austin" value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={120} disabled={busy} />
            <span className="block text-xs text-muted">This goes into the questions: “What is the best note-taking app?”</span>
          </label>
        )}
        {reread && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={replace} onChange={(e) => setReplace(e.target.checked)} disabled={busy} />
            <span>Also replace my questions and profile with fresh ones from the site. <span className="text-muted">Without this, only the site checks are refreshed and your questions and answers stay as they are.</span></span>
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
        <button className="btn btn-primary w-full !py-3 sm:w-auto sm:px-8" disabled={busy || !url.trim()}>{busy ? "Working…" : reread ? "Re-read the site →" : "Check my visibility →"}</button>
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
