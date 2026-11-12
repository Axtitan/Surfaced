"use client";

import { useEffect, useMemo, useState } from "react";
import type { Analysis, PlannedDestination, Profile } from "@/lib/types";
import type { summarise } from "@/lib/score";
import { jsonLd, llmsTxt } from "@/lib/fixes";
import { track as trackEvent } from "@vercel/analytics";
import { EXTERNAL_REL, safeHref } from "@/lib/safe-href";

type Summary = ReturnType<typeof summarise>;
type Status = "todo" | "opened" | "submitted" | "live" | "rejected" | "skip";
export type Kit = { name: string; url: string; tagline: string; shortDescription: string; longDescription: string; keywords: string; pricing: string; platforms: string; alternativeTo: string; email: string; logoUrl: string; twitter: string };

const GROUPS: { id: string; label: string; types: string[] }[] = [
  { id: "top", label: "Best first", types: [] },
  { id: "dir", label: "Comparison & directories", types: ["directory"] },
  { id: "launch", label: "Launch sites", types: ["product-launch-site"] },
  { id: "press", label: "Press & citations", types: ["citation", "newsletter"] },
  { id: "community", label: "Communities", types: ["community", "subreddit", "github"] },
  { id: "market", label: "Marketplaces", types: ["marketplace"] },
];
const STATUS_LABEL: Record<Status, string> = { todo: "To do", opened: "Opened", submitted: "Submitted", live: "Live", rejected: "Rejected", skip: "Skip" };
type PlanData = { destinations: PlannedDestination[]; extraCited: { domain: string; count: number }[]; total: number };
const TYPE_LABEL: Record<string, string> = { directory: "Directory", "product-launch-site": "Launch", citation: "Press/citation", newsletter: "Newsletter", community: "Community", subreddit: "Subreddit", github: "GitHub list", marketplace: "Marketplace" };

const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

function kitFrom(p: Profile): Kit {
  return {
    name: p.name, url: p.url, tagline: p.listing.tagline, shortDescription: p.listing.shortDescription, longDescription: p.listing.longDescription,
    keywords: p.listing.keywords.join(", "), pricing: p.listing.pricing, platforms: p.listing.platforms.join(", "),
    alternativeTo: p.competitors.slice(0, 5).join(", "), email: "", logoUrl: "", twitter: "",
  };
}

function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-ghost !px-2.5 !py-1 !text-xs" aria-live="polite" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); } catch { /* clipboard blocked */ } }}>
      {done ? "Copied" : label}
    </button>
  );
}

function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function FixPlan({ analysis, summary, section }: { analysis: Analysis; summary: Summary; onProfile: (p: Profile) => void; section: "listings" | "site" }) {
  const p = analysis.profile;
  const key = p.domain;
  // Rendered only in the browser inside ProjectView, so saved progress is read while initialising.
  const [kit, setKit] = useState<Kit>(() => ({ ...kitFrom(p), ...load<Partial<Kit>>(`surfaced:kit:${key}`, {}) }));
  const [track, setTrack] = useState<Record<string, Status>>(() => load(`surfaced:track:${key}`, {}));
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [planState, setPlanState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [group, setGroup] = useState("top");
  const [freeOnly, setFreeOnly] = useState(false);
  const [ext, setExt] = useState<"unknown" | "ready" | "sent">("unknown");

  useEffect(() => save(`surfaced:kit:${key}`, kit), [kit, key]);
  useEffect(() => save(`surfaced:track:${key}`, track), [track, key]);

  const citedKey = summary.domains.map(([d, c]) => `${d}:${c}`).join(",");
  useEffect(() => {
    let live = true;
    fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: p.kind, categories: p.categories, citedDomains: Object.fromEntries(summary.domains), ai: p.categories.includes("ai"), category: p.category }),
    }).then(async (r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<PlanData>; })
      .then((d) => { if (live) { setPlan(d); setPlanState("ready"); } })
      .catch(() => { if (live) setPlanState("error"); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citedKey, p.kind, p.categories.join(), p.category, retry]);

  // The Surfaced browser extension announces itself and confirms when it has the kit.
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== window || e.data?.source !== "surfaced-ext") return;
      if (e.data.type === "hello") setExt((s) => (s === "sent" ? s : "ready"));
      if (e.data.type === "kit-saved") setExt("sent");
    };
    window.addEventListener("message", on);
    window.postMessage({ source: "surfaced-app", type: "ping" }, window.location.origin);
    return () => window.removeEventListener("message", on);
  }, []);

  const list = useMemo(() => {
    if (!plan) return [];
    const g = GROUPS.find((x) => x.id === group)!;
    let l = g.types.length ? plan.destinations.filter((d) => g.types.includes(d.type)) : plan.destinations;
    if (freeOnly) l = l.filter((d) => d.pricing !== "paid");
    return group === "top" ? l.slice(0, 25) : l.slice(0, 60);
  }, [plan, group, freeOnly]);

  const st = (slug: string): Status => track[slug] ?? "todo";
  const done = list.filter((d) => ["submitted", "live", "rejected"].includes(st(d.slug))).length;
  const nextUp = list.find((d) => st(d.slug) === "todo");

  function openDest(d: PlannedDestination) {
    const href = safeHref(d.url);
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
    trackEvent("listing_opened", { type: d.type });
    setTrack((t) => ({ ...t, [d.slug]: t[d.slug] && t[d.slug] !== "todo" ? t[d.slug] : "opened" }));
  }

  const kitText = `Name: ${kit.name}\nWebsite: ${kit.url}\nTagline: ${kit.tagline}\nShort description: ${kit.shortDescription}\n\n${kit.longDescription}\n\nCategories/tags: ${kit.keywords}\nPricing: ${kit.pricing}\nPlatforms: ${kit.platforms}\nAlternative to: ${kit.alternativeTo}${kit.email ? `\nContact: ${kit.email}` : ""}${kit.twitter ? `\nX/Twitter: ${kit.twitter}` : ""}${kit.logoUrl ? `\nLogo: ${kit.logoUrl}` : ""}`;
  const failing = analysis.checks.filter((c) => c.status !== "pass");
  const llms = llmsTxt(p), ld = jsonLd(p);

  const field = (k: keyof Kit, label: string, opts: { area?: boolean; max?: number; placeholder?: string } = {}) => (
    <label className="space-y-1">
      <span className="flex items-center justify-between"><span className="label">{label}{opts.max ? ` (${kit[k].length}/${opts.max})` : ""}</span><Copy text={kit[k]} /></span>
      {opts.area
        ? <textarea className="field min-h-28" value={kit[k]} onChange={(e) => setKit({ ...kit, [k]: e.target.value })} />
        : <input className={`field ${opts.max && kit[k].length > opts.max ? "!border-bad" : ""}`} value={kit[k]} placeholder={opts.placeholder} onChange={(e) => setKit({ ...kit, [k]: e.target.value })} />}
    </label>
  );

  return (
    <section className="card space-y-8 p-5 sm:p-6">
      {section === "listings" && <>
      <div>
        <h2 className="text-lg font-semibold">Get listed where the AIs look</h2>
        <p className="mt-1 text-sm text-muted">
          AIs repeat what trusted sources say. The fastest route in is a listing on the comparison sites and directories they read,
          ideally one that names you as an alternative to {p.competitors[0] ?? "the big names"}.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Your listing kit</h3>
        <p className="text-sm text-muted">Write it once and use it everywhere. With the Surfaced browser extension, one click fills each submission form; you check it and press submit.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Product name")}
          {field("url", "Website")}
          {field("tagline", "Tagline", { max: 60 })}
          {field("pricing", "Pricing")}
          <div className="sm:col-span-2">{field("shortDescription", "Short description", { max: 160 })}</div>
          <div className="sm:col-span-2">{field("longDescription", "Full description", { area: true })}</div>
          {field("alternativeTo", "Alternative to")}
          {field("keywords", "Categories and tags")}
          {field("platforms", "Platforms")}
          {field("email", "Contact email", { placeholder: "you@company.com" })}
          {field("logoUrl", "Logo URL", { placeholder: "https://…/logo.png" })}
          {field("twitter", "X / Twitter", { placeholder: "@handle" })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Copy text={kitText} label="Copy the whole kit" />
          <button type="button" className="btn btn-primary !py-1.5 !text-sm" onClick={() => window.postMessage({ source: "surfaced-app", type: "kit", kit }, window.location.origin)}>
            {ext === "sent" ? "Kit sent to the extension ✓" : "Send kit to the extension"}
          </button>
          <span className="text-xs text-muted">{ext === "unknown" ? "Extension not detected. Install it from the extension folder to fill forms in one click." : ext === "ready" ? "Extension detected." : "Open a submission page and click the Surfaced icon, then Fill this page."}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold">Where to submit</h3>
            <p className="text-sm text-muted">
              {plan?.total ?? "…"} places in the hand-checked Submitlist catalog fit you. Sites the AIs cited in your scan come first.
            </p>
          </div>
          <div className="text-sm font-semibold">{done} of {list.length} done</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {GROUPS.map((g) => (
            <button key={g.id} type="button" onClick={() => setGroup(g.id)} className={`chip !px-3 !py-1.5 !text-sm ${group === g.id ? "!bg-ink !text-white" : ""}`}>{g.label}</button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />Free only</label>
        </div>
        {nextUp && (
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => openDest(nextUp)}>
            Open next: {nextUp.name} →
          </button>
        )}
        <ul className="divide-y divide-line rounded-xl border border-line">
          {planState === "loading" && !plan && <li className="p-4 text-sm text-muted" role="status">Ranking destinations…</li>}
          {planState === "error" && (
            <li className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm" role="alert">
              <span className="text-bad">Couldn&apos;t load the list of places to submit.</span>
              <button type="button" className="btn btn-ghost !py-1.5 !text-sm" onClick={() => { setPlanState("loading"); setRetry((n) => n + 1); }}>Try again</button>
            </li>
          )}
          {planState === "ready" && !list.length && <li className="p-4 text-sm text-muted">Nothing in this group{freeOnly ? " is free" : ""}. Try another group.</li>}
          {list.map((d) => (
            <li key={d.slug} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${["submitted", "live", "rejected", "skip"].includes(st(d.slug)) ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{d.name}</span>
                  <span className="chip">{TYPE_LABEL[d.type] ?? d.type}</span>
                  {d.dr != null && <span className="chip">DR {d.dr}</span>}
                  <span className={`chip ${d.pricing === "free" ? "!bg-emerald-50 !text-good" : d.pricing === "paid" ? "!bg-amber-50 !text-warn" : ""}`}>{d.pricing === "unknown" ? "price unknown" : d.pricing}</span>
                  {d.citedByAI > 0 && <span className="chip !bg-ink !text-white">AI cites this</span>}
                </div>
                <p className="mt-1 truncate text-sm text-muted">{d.reasons.filter((r) => !/^DR|^Free$/.test(r)).join(" · ") || d.description}</p>
                {safeHref(d.rules) && <a className="text-xs underline" href={safeHref(d.rules)} target="_blank" rel={EXTERNAL_REL}>Read the posting rules first</a>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" className="btn btn-ghost !py-1.5 !text-sm" onClick={() => openDest(d)} disabled={!safeHref(d.url)} aria-label={`Open ${d.name}`}>Open</button>
                <select className="field !w-auto !py-1.5 !text-sm" value={st(d.slug)} onChange={(e) => setTrack((t) => ({ ...t, [d.slug]: e.target.value as Status }))} aria-label={`Status for ${d.name}`}>
                  {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>
        {plan && plan.extraCited.length > 0 && (
          <div className="rounded-xl bg-paper p-4 text-sm">
            <p className="font-semibold">Also cited by the AIs, but not open for submissions</p>
            <p className="mt-1 text-muted">Pitch these directly: offer the author a demo, a quote or data, or ask to be added to their comparison.</p>
            <div className="mt-2 flex flex-wrap gap-2">{plan.extraCited.map((x) => { const href = safeHref(`https://${x.domain}`); return href ? <a key={x.domain} className="chip underline" href={href} target="_blank" rel={EXTERNAL_REL}>{x.domain} · {x.count}</a> : null; })}</div>
          </div>
        )}
      </div>

      </>}

      {section === "site" && (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Make your site easy for AIs to read</h2>
          <p className="mt-1 text-sm text-muted">What we found when we read {p.domain}. Fix the red and amber items first.</p>
        </div>
        <ul className="space-y-2">
          {analysis.checks.map((c) => (
            <li key={c.id} className="flex gap-3 text-sm">
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${c.status === "pass" ? "bg-good" : c.status === "warn" ? "bg-warn" : "bg-bad"}`}>{c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "×"}</span>
              <div><span className="font-semibold">{c.label}.</span> <span className="text-muted">{c.detail}</span>{c.fix && <div className="mt-0.5">{c.fix}</div>}</div>
            </li>
          ))}
        </ul>
        {failing.some((c) => c.id === "llms" || c.id === "schema") && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[{ t: "llms.txt", body: llms, file: "llms.txt", note: "Upload to your site root." }, { t: "JSON-LD", body: ld, file: "structured-data.html", note: "Paste into your homepage <head>." }].map((x) => (
              <div key={x.t} className="min-w-0 space-y-2">
                <div className="flex items-center justify-between"><span className="label">{x.t}</span><span className="flex gap-2"><Copy text={x.body} /><button type="button" className="btn btn-ghost !px-2.5 !py-1 !text-xs" onClick={() => download(x.file, x.body)}>Download</button></span></div>
                <pre className="max-h-56 overflow-auto rounded-lg bg-ink p-3 text-xs text-white">{x.body}</pre>
                <p className="text-xs text-muted">{x.note} Check the facts before publishing.</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted">Re-run the check 2–4 weeks after your listings go live. Search-backed answers (ChatGPT, Claude, Gemini) can change within days; what a model knows without search changes only when it is retrained.</p>
      </div>
      )}
    </section>
  );
}
