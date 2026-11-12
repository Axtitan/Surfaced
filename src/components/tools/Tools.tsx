"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { jsonLd, llmsTxt } from "@/lib/fixes";
import { normaliseUrl } from "@/lib/url";
import { KINDS, type Check, type Kind, type Profile } from "@/lib/types";

/* The three free tools (§17.2). Generated files are shown as text and downloaded as text, never injected (§12.4). */

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string, hintId?: string) => React.ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {children(id, hintId)}
      {hint && <p id={hintId} className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Output({ text, filename, type }: { text: string; filename: string; type: string }) {
  const [copied, setCopied] = useState(false);
  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <span className="text-sm font-medium">{filename}</span>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost !px-3 !py-1 !text-xs" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* clipboard blocked */ } }}>
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </button>
          <button type="button" className="btn btn-ghost !px-3 !py-1 !text-xs" onClick={download}>Download</button>
        </div>
      </div>
      <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words bg-paper p-4 text-xs leading-relaxed">{text}</pre>
    </div>
  );
}

type Form = { name: string; url: string; kind: Kind; tagline: string; long: string; category: string; audience: string; location: string; pricing: string; platforms: string; competitors: string };
const EMPTY: Form = { name: "", url: "", kind: "software", tagline: "", long: "", category: "", audience: "", location: "", pricing: "", platforms: "", competitors: "" };
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10);

function toProfile(f: Form): Profile | null {
  const url = normaliseUrl(f.url);
  if (!url || !/^https?:$/.test(url.protocol) || !f.name.trim()) return null;
  return {
    url: url.href, domain: url.hostname, name: f.name.trim(), aliases: [], kind: f.kind, category: f.category.trim() || "business",
    audience: f.audience.trim(), location: f.location.trim(), competitors: list(f.competitors), categories: [],
    listing: { tagline: f.tagline.trim(), shortDescription: f.tagline.trim() || f.long.trim().slice(0, 160), longDescription: f.long.trim() || f.tagline.trim(), keywords: [], pricing: f.pricing.trim() || "See website", platforms: list(f.platforms) },
  };
}

const KIND_LABEL: Record<Kind, string> = { software: "Software or web app", "mobile-app": "Mobile app", "browser-extension": "Browser extension", ecommerce: "Online shop", "local-business": "Local business", service: "Service business", other: "Something else" };

function ProfileForm({ f, set, fields }: { f: Form; set: (f: Form) => void; fields: (keyof Form)[] }) {
  const on = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set({ ...f, [k]: e.target.value });
  const has = (k: keyof Form) => fields.includes(k);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Business or product name">{(id) => <input id={id} className="field" value={f.name} onChange={on("name")} maxLength={120} required />}</Field>
      <Field label="Website">{(id) => <input id={id} className="field" value={f.url} onChange={on("url")} placeholder="example.com" inputMode="url" maxLength={300} required />}</Field>
      {has("kind") && <Field label="What is it?">{(id) => (
        <select id={id} className="field" value={f.kind} onChange={on("kind")}>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
      )}</Field>}
      {has("category") && <Field label="Category" hint="For example: invoicing software, dental clinic">{(id, h) => <input id={id} aria-describedby={h} className="field" value={f.category} onChange={on("category")} maxLength={80} />}</Field>}
      <div className="sm:col-span-2"><Field label="One-line description">{(id) => <input id={id} className="field" value={f.tagline} onChange={on("tagline")} maxLength={200} />}</Field></div>
      {has("long") && <div className="sm:col-span-2"><Field label="Longer description" hint="Two or three plain sentences: what it is, who it's for, what makes it different.">{(id, h) => <textarea id={id} aria-describedby={h} className="field min-h-24" value={f.long} onChange={on("long")} maxLength={1200} />}</Field></div>}
      {has("audience") && <Field label="Who it's for">{(id) => <input id={id} className="field" value={f.audience} onChange={on("audience")} maxLength={120} />}</Field>}
      {has("location") && <Field label="Area served" hint="Leave blank if you serve everywhere">{(id, h) => <input id={id} aria-describedby={h} className="field" value={f.location} onChange={on("location")} maxLength={120} />}</Field>}
      {has("pricing") && <Field label="Pricing" hint="For example: Free, From $9/month">{(id, h) => <input id={id} aria-describedby={h} className="field" value={f.pricing} onChange={on("pricing")} maxLength={80} />}</Field>}
      {has("platforms") && <Field label="Platforms" hint="Comma-separated, for example: Web, iOS, Android">{(id, h) => <input id={id} aria-describedby={h} className="field" value={f.platforms} onChange={on("platforms")} maxLength={160} />}</Field>}
      {has("competitors") && <div className="sm:col-span-2"><Field label="Often compared with" hint="Comma-separated, up to 5">{(id, h) => <input id={id} aria-describedby={h} className="field" value={f.competitors} onChange={on("competitors")} maxLength={300} />}</Field></div>}
    </div>
  );
}

export function LlmsTxtTool() {
  const [f, set] = useState<Form>(EMPTY);
  const p = toProfile(f);
  return (
    <div className="space-y-6">
      <ProfileForm f={f} set={set} fields={["category", "long", "audience", "location", "pricing", "platforms", "competitors"]} />
      {p ? <Output text={llmsTxt(p)} filename="llms.txt" type="text/plain" /> : <p className="text-sm text-muted" role="status">Enter a name and a website to see your file.</p>}
      {p && <p className="text-sm text-muted">Check the Key pages links match pages that exist on your site, then upload the file so it&apos;s served at <code>/llms.txt</code>.</p>}
    </div>
  );
}

export function JsonLdTool() {
  const [f, set] = useState<Form>(EMPTY);
  const p = toProfile(f);
  return (
    <div className="space-y-6">
      <ProfileForm f={f} set={set} fields={["kind", "long", "location", "pricing", "platforms"]} />
      {p ? <Output text={jsonLd(p)} filename="structured-data.html" type="text/plain" /> : <p className="text-sm text-muted" role="status">Enter a name and a website to see your snippet.</p>}
      {p && <p className="text-sm text-muted">Paste the snippet into your homepage&apos;s <code>&lt;head&gt;</code>, then test it with a structured data testing tool.</p>}
    </div>
  );
}

type Result = { url: string; domain: string; title: string; checks: Check[] };
const ICON = { pass: "✓", warn: "!", fail: "×" } as const;
const WORD = { pass: "Passed", warn: "Needs attention", fail: "Failed" } as const;

export function CrawlerCheckTool() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const busy = useRef(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setState("busy"); setError("");
    try {
      const res = await fetch("/api/tools/site-check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "Something went wrong. Try again.");
      setResult(data as Result); setState("done");
    } catch (err) {
      setError((err as Error).message); setState("error");
    } finally {
      busy.current = false;
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={run} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="cc-url" className="sr-only">Website address</label>
        <input id="cc-url" className="field flex-1 !py-3" placeholder="yourwebsite.com" inputMode="url" autoComplete="url" value={url} onChange={(e) => setUrl(e.target.value)} required maxLength={2000} />
        <button className="btn btn-primary !px-6 !py-3" disabled={state === "busy" || !url.trim()}>{state === "busy" ? "Checking…" : "Check my site"}</button>
      </form>
      <div aria-live="polite">
        {state === "busy" && <p className="text-sm text-muted">Reading robots.txt, llms.txt, the sitemap and your homepage…</p>}
        {state === "error" && <p className="text-sm text-bad" role="alert">{error}</p>}
        {state === "done" && result && (
          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <p className="font-semibold">{result.title || result.domain}</p>
              <p className="text-sm text-muted">{result.url}</p>
            </div>
            <ul className="divide-y divide-line">
              {result.checks.map((c) => (
                <li key={c.id} className="flex gap-3 px-5 py-4 text-sm">
                  <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${c.status === "pass" ? "bg-emerald-50 text-good" : c.status === "warn" ? "bg-amber-50 text-warn" : "bg-red-50 text-bad"}`}>{ICON[c.status]}</span>
                  <div className="min-w-0">
                    <p className="font-medium">{c.label} <span className="sr-only">: {WORD[c.status]}</span></p>
                    <p className="text-muted">{c.detail}</p>
                    {c.fix && c.status !== "pass" && <p className="mt-1">{c.fix}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line bg-paper px-5 py-4 text-sm">
              Next: see whether the AIs actually name you. <Link href={`/app/new?url=${encodeURIComponent(result.url)}`} className="font-medium underline">Run a free visibility check →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
