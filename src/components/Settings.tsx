"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CHANGED, clearAll, exportAll, listProjects, storageBytes } from "@/lib/store";
import type { ProviderInfo } from "./ProjectView";

/* How much this browser holds, read straight from storage and refreshed when checks change here or in another tab.
   The snapshot is a string so React can compare it cheaply. */
const subscribe = (cb: () => void) => {
  window.addEventListener(CHANGED, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(CHANGED, cb); window.removeEventListener("storage", cb); };
};
const usageSnapshot = () => `${listProjects().length}|${Math.round(storageBytes() / 1024)}`;
// This page's address, for the extension build command. The server render shows a placeholder.
const noSubscribe = () => () => {};
const originSnapshot = () => window.location.origin;

export default function Settings() {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [providersFailed, setProvidersFailed] = useState(false);
  const [ext, setExt] = useState(false);
  const usageRaw = useSyncExternalStore(subscribe, usageSnapshot, () => null);
  const origin = useSyncExternalStore(noSubscribe, originSnapshot, () => "https://your-site");
  const usage = usageRaw ? { checks: Number(usageRaw.split("|")[0]), kb: Number(usageRaw.split("|")[1]) } : null;
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    fetch("/api/providers")
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setProviders(d.providers))
      .catch(() => { setProviders([]); setProvidersFailed(true); });
    // The extension's bridge answers a ping with "hello" from this page's own origin.
    const on = (e: MessageEvent) => {
      if (e.source === window && e.origin === window.location.origin && e.data?.source === "surfaced-ext" && e.data.type === "hello") setExt(true);
    };
    window.addEventListener("message", on);
    window.postMessage({ source: "surfaced-app", type: "ping" }, window.location.origin);
    return () => window.removeEventListener("message", on);
  }, []);

  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" }));
    a.download = `surfaced-checks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function wipe() {
    const n = listProjects().length;
    if (!confirm(`Delete all Surfaced data in this browser? This removes ${n} check${n === 1 ? "" : "s"}, every saved answer and your submission progress. It can't be undone. Export first if you want a copy.`)) return;
    clearAll();
    setCleared(true);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-24 pt-8 sm:px-8 sm:pt-12">
      <h1 className="font-display text-4xl tracking-tight">Settings</h1>

      <section className="card p-5 sm:p-6" aria-labelledby="s-ai">
        <h2 id="s-ai" className="font-semibold">AI connections</h2>
        <p className="mt-1 text-sm text-muted">Free mode works without any of these. Automatic checks, which ask each question several times, need the AI services connected on the server.</p>
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {(providers ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div><span className="font-medium">{p.label}</span> <span className="text-muted">· {p.vendor}</span></div>
              <span className={`chip ${p.connected ? "!bg-emerald-50 !text-good" : p.demo ? "!bg-amber-50 !text-warn" : ""}`}>{p.connected ? "Connected" : p.demo ? "Demo answers" : "Not connected"}</span>
            </li>
          ))}
          {!providers && <li className="px-4 py-3 text-sm text-muted" role="status">Checking…</li>}
          {providersFailed && <li className="px-4 py-3 text-sm text-bad" role="alert">Couldn&apos;t check the connections. Reload to try again.</li>}
        </ul>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="s-ext">
        <div className="flex items-center justify-between gap-3">
          <h2 id="s-ext" className="font-semibold">Browser extension</h2>
          <span className={`chip ${ext ? "!bg-emerald-50 !text-good" : ""}`} role="status">{ext ? "Installed" : "Not detected"}</span>
        </div>
        <p className="mt-1 text-sm text-muted">Fills directory submission forms from your listing kit, and captures answers from the AI apps. You check every field and press submit yourself.</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
          <li>Build it for this site: <code>npm run ext:build -- {origin}</code> (it only talks to the address you give).</li>
          <li>In Chrome, open <code>chrome://extensions</code> and turn on Developer mode.</li>
          <li>Choose <span className="font-medium">Load unpacked</span> and pick the <code>extension-dist</code> folder.</li>
          <li>Reload this page.</li>
        </ol>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="s-data">
        <h2 id="s-data" className="font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-muted">
          Checks, answers, listing kits and progress are stored in this browser only.
          {usage && <> Right now: {usage.checks} check{usage.checks === 1 ? "" : "s"}, about {usage.kb} KB.</>}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={download}>Export all checks (JSON)</button>
          <button type="button" className="btn btn-ghost !text-bad" onClick={wipe}>Delete all data in this browser</button>
        </div>
        <p className="mt-3 text-sm" role="status">{cleared ? "All Surfaced data in this browser was deleted." : ""}</p>
      </section>
    </div>
  );
}
