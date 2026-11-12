"use client";

import { useEffect, useState } from "react";
import { exportAll } from "@/lib/store";
import type { ProviderInfo } from "./ProjectView";

export default function Settings() {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [ext, setExt] = useState(false);

  useEffect(() => {
    fetch("/api/providers").then((r) => r.json()).then((d) => setProviders(d.providers)).catch(() => setProviders([]));
    const on = (e: MessageEvent) => { if (e.source === window && e.data?.source === "surfaced-ext") setExt(true); };
    window.addEventListener("message", on);
    window.postMessage({ source: "surfaced-app", type: "ping" }, window.location.origin);
    return () => window.removeEventListener("message", on);
  }, []);

  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" }));
    a.download = `surfaced-checks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-24 pt-8 sm:px-8 sm:pt-12">
      <h1 className="font-display text-4xl tracking-tight">Settings</h1>

      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">AI connections</h2>
        <p className="mt-1 text-sm text-muted">Free mode works without any of these. Connect APIs to ask automatically, several times per question.</p>
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {(providers ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div><span className="font-medium">{p.label}</span> <span className="text-muted">· {p.vendor}</span></div>
              <span className={`chip ${p.connected ? "!bg-emerald-50 !text-good" : p.demo ? "!bg-amber-50 !text-warn" : ""}`}>{p.connected ? "Connected" : p.demo ? "Demo answers" : "Not connected"}</span>
            </li>
          ))}
          {!providers && <li className="px-4 py-3 text-sm text-muted">Checking…</li>}
        </ul>
        <p className="mt-3 text-xs text-muted">Keys are set on the server in <code>.env.local</code>: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY.</p>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Browser extension</h2>
          <span className={`chip ${ext ? "!bg-emerald-50 !text-good" : ""}`}>{ext ? "Installed" : "Not detected"}</span>
        </div>
        <p className="mt-1 text-sm text-muted">Fills directory submission forms from your listing kit in one click. You check every field and press submit yourself.</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
          <li>In Chrome, open <code>chrome://extensions</code> and turn on Developer mode.</li>
          <li>Choose <span className="font-medium">Load unpacked</span> and pick the <code>extension</code> folder from the Surfaced project.</li>
          <li>Reload this page.</li>
        </ol>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-muted">Checks, answers, listing kits and progress are stored in this browser only. Export them to keep a copy.</p>
        <button type="button" className="btn btn-ghost mt-4" onClick={download}>Export all checks (JSON)</button>
      </section>
    </div>
  );
}
