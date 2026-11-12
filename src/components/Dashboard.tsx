"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHANGED, deleteProject, listProjects, submittedCount, type ProjectMeta } from "@/lib/store";
import { ScoreRing } from "./ui";

function ago(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectMeta[] | null>(null);
  useEffect(() => {
    const load = () => setProjects(listProjects());
    load();
    window.addEventListener(CHANGED, load);
    return () => window.removeEventListener(CHANGED, load);
  }, []);

  const scored = projects?.filter((p) => p.score != null) ?? [];
  const avg = scored.length ? Math.round(scored.reduce((n, p) => n + (p.score ?? 0), 0) / scored.length) : null;
  const listings = projects?.reduce((n, p) => n + submittedCount(p.id), 0) ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-8 sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Overview</h1>
          <p className="mt-2 text-muted">How often AI assistants recommend each of your sites, and what you&apos;ve done about it.</p>
        </div>
        <Link href="/app/new" className="btn btn-primary">+ New check</Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { k: "Sites checked", v: projects?.length ?? "–" },
          { k: "Average score", v: avg ?? "–" },
          { k: "Listings submitted", v: listings },
        ].map((s) => (
          <div key={s.k} className="card p-5">
            <div className="text-sm text-muted">{s.k}</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{s.v}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Your checks</h2>
      {projects && projects.length === 0 && (
        <div className="card mt-4 flex flex-col items-center px-6 py-14 text-center">
          <h3 className="font-display text-2xl">Find out if AI recommends you</h3>
          <p className="mt-2 max-w-md text-sm text-muted">Start with your website. The free mode uses your own ChatGPT, Claude, Gemini and DeepSeek accounts, so it costs nothing.</p>
          <Link href="/app/new" className="btn btn-primary mt-6">Run your first check</Link>
        </div>
      )}
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {projects?.map((m) => {
          const sub = submittedCount(m.id);
          return (
            <li key={m.id} className="card group relative flex items-center gap-4 p-5 transition hover:border-[#c9cdd4]">
              <ScoreRing score={m.score} size={58} />
              <div className="min-w-0 flex-1">
                <Link href={`/app/p/${m.id}`} className="font-semibold after:absolute after:inset-0">{m.name}</Link>
                <div className="truncate text-sm text-muted">{m.domain}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{m.answers ? `${m.answers} answers` : "Not asked yet"}</span>
                  <span>{sub} listing{sub === 1 ? "" : "s"} submitted</span>
                  <span>Updated {ago(m.updatedAt)}</span>
                </div>
              </div>
              <button type="button" className="relative z-10 rounded-md px-2 py-1 text-xs text-muted opacity-100 hover:bg-[#eef0f4] hover:text-bad sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                onClick={() => { if (confirm(`Delete the check for ${m.domain}? Its answers and listing progress will be removed from this browser.`)) deleteProject(m.id); }}>
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
