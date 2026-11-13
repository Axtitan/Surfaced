"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteProject, type Project } from "@/lib/store";

/* A check's own settings (§16.1): what is stored for it, export, and delete. Account-wide data controls are on
   /app/settings. */

const read = (key: string) => { try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; } };

export default function CheckSettings({ project, locked }: { project: Project; locked: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const p = project.analysis.profile;
  const answers = project.runs.filter((r) => r.ok).length;

  function exportCheck() {
    const data = { version: 1, exportedAt: new Date().toISOString(), check: project, kit: read(`surfaced:kit:${project.id}`), tracker: read(`surfaced:track:${project.id}`), listings: read(`surfaced:live:${project.id}`) };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = `surfaced-${project.id}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function remove() {
    if (!confirm(`Delete the check for ${p.name}? This removes its ${project.analysis.prompts.length} questions, ${answers} saved answer${answers === 1 ? "" : "s"}, listing kit and submission progress from this browser. It can't be undone.`)) return;
    try {
      deleteProject(project.id);
      router.push("/app");
    } catch {
      setError("Couldn't delete the check. Reload and try again.");
    }
  }

  const when = (t: number) => <time dateTime={new Date(t).toISOString()} title={new Date(t).toLocaleString()}>{new Date(t).toLocaleDateString()}</time>;

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6" aria-labelledby="cs-about">
        <h2 id="cs-about" className="text-lg font-semibold">This check</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="text-muted">Website</dt><dd>{p.domain}</dd>
          <dt className="text-muted">Questions</dt><dd>{project.analysis.prompts.length}</dd>
          <dt className="text-muted">Saved answers</dt><dd>{answers}</dd>
          <dt className="text-muted">Answers from</dt><dd>{project.mode === "paste" ? "Your own AI accounts (pasted)" : project.mode === "estimate" ? "Estimate from pages (experimental)" : "Automatic checks"}</dd>
          <dt className="text-muted">Created</dt><dd>{when(project.createdAt)}</dd>
          <dt className="text-muted">Last changed</dt><dd>{when(project.updatedAt)}</dd>
        </dl>
        <p className="mt-3 text-sm text-muted">Saved in this browser only. To change the questions or competitors, use the Questions tab; to read the site again, use Re-read website.</p>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="cs-data">
        <h2 id="cs-data" className="text-lg font-semibold">Export or delete</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={exportCheck}>Export this check (JSON)</button>
          <button type="button" className="btn btn-ghost !text-bad" onClick={remove} disabled={locked}>Delete this check</button>
        </div>
        {locked && <p className="mt-2 text-sm text-muted">Stop the running check before deleting it.</p>}
        {error && <p className="mt-2 text-sm text-bad" role="alert">{error}</p>}
      </section>
    </div>
  );
}
