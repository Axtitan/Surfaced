"use client";

import { useMemo, useRef, useState } from "react";
import { citedUrls, gapSummary, pitchDraft, type CitedUrl } from "@/lib/citations";
import { PLANS } from "@/lib/plans";
import { EXTERNAL_REL, safeHref } from "@/lib/safe-href";
import type { CitedPage, CitedReport, Profile, Run } from "@/lib/types";
import { AI_NAME } from "@/lib/ais";

/* Cited-page gaps (ARCHITECTURE §9.7): the pages the AIs cite for these questions, whether each one names you, and
   which competitors it names. Missing from a page → Submit (it's a listing in the catalog) or Pitch (a drafted email
   the user sends themselves). Free checks the most-cited few; paid plans check 30. */

const LIMIT = PLANS.free.citedPages;
const FULL = PLANS.starter.citedPages;
const names = (xs: string[]) => xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

function Pitch({ profile, page }: { profile: Profile; page: CitedPage }) {
  const draft = pitchDraft(profile, page);
  const [copied, setCopied] = useState(false);
  const mailto = `mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-line bg-paper p-4">
      <p className="text-sm"><span className="font-medium">Subject:</span> {draft.subject}</p>
      <label className="block text-sm">
        <span className="sr-only">Email to the page&apos;s author</span>
        <textarea className="field min-h-48 font-mono text-xs" readOnly value={draft.body} />
      </label>
      <p className="text-xs text-muted">Find the author&apos;s contact on the page, add your name, and edit it to sound like you. Surfaced never sends it.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={async () => {
          try { await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
        }}><span aria-live="polite">{copied ? "Copied" : "Copy email"}</span></button>
        <a className="btn btn-ghost !px-3 !py-1.5 !text-sm" href={mailto}>Open in email app</a>
      </div>
    </div>
  );
}

function Row({ cited, page, profile }: { cited: CitedUrl; page?: CitedPage; profile: Profile }) {
  const [pitch, setPitch] = useState(false);
  const href = safeHref(cited.url);
  const submitHref = page?.destination ? safeHref(page.destination.url) : null;
  const title = page?.title || cited.title || cited.url.replace(/^https?:\/\//, "");
  const missing = page?.status === "checked" && !page.you;
  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {href ? <a href={href} target="_blank" rel={EXTERNAL_REL} className="font-medium hover:underline">{title}</a> : <span className="font-medium">{title}</span>}
          <p className="text-xs text-muted">{cited.domain} · cited in {cited.count} answer{cited.count === 1 ? "" : "s"} by {names(cited.providers.map((p) => AI_NAME[p]))}</p>
        </div>
        <div className="shrink-0">
          {!page ? <span className="chip">Not checked yet</span>
            : page.status === "checked" ? (page.you
              ? <span className="chip !bg-emerald-50 !text-good">Names you{page.linksYou ? " and links to you" : ""}</span>
              : <span className="chip !bg-red-50 !text-bad">Doesn&apos;t name you</span>)
            : <span className="chip !bg-amber-50 !text-warn">{page.status === "blocked" ? "Not read" : page.status === "skipped" ? "Not reached" : "Couldn't read"}</span>}
        </div>
      </div>
      {page && page.status !== "checked" && page.note && <p className="mt-2 text-sm text-muted">{page.note}</p>}
      {page?.status === "checked" && page.competitors.length > 0 && (
        <p className="mt-2 text-sm"><span className="text-muted">Names</span> {names(page.competitors)}</p>
      )}
      {missing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {page.destination && submitHref && (
            <a className="btn btn-primary !px-3 !py-1.5 !text-sm" href={submitHref} target="_blank" rel={EXTERNAL_REL}>{page.destination.type === "citation" ? `How to get on ${page.destination.name}` : `Submit to ${page.destination.name}`}</a>
          )}
          <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-sm" aria-expanded={pitch} onClick={() => setPitch((v) => !v)}>
            {pitch ? "Hide pitch" : "Pitch the author"}
          </button>
        </div>
      )}
      {missing && pitch && <Pitch profile={profile} page={page} />}
    </li>
  );
}

export default function CitedPages({ profile, runs, report, onReport, onAnswers }: {
  profile: Profile; runs: Run[]; report?: CitedReport; onReport: (r: CitedReport) => void; onAnswers: () => void;
}) {
  const cited = useMemo(() => citedUrls(runs, profile.domain, FULL), [runs, profile.domain]);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const byUrl = useMemo(() => new Map((report?.pages ?? []).map((p) => [p.url, p])), [report]);
  const top = cited.slice(0, LIMIT);
  const rest = cited.slice(LIMIT);
  const checkedTop = top.map((c) => byUrl.get(c.url)).filter((p): p is CitedPage => !!p);
  const gaps = gapSummary(checkedTop);
  const unchecked = top.filter((c) => byUrl.get(c.url)?.status !== "checked").length;

  async function check() {
    if (busy.current) return;
    busy.current = true;
    setState("busy"); setError("");
    try {
      const res = await fetch("/api/cited-pages", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          urls: top.map((c) => c.url),
          brand: { name: profile.name, aliases: profile.aliases.slice(0, 10), domain: profile.domain },
          competitors: profile.competitors.slice(0, 10),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "Something went wrong. Try again.");
      const fresh = data.pages as CitedPage[];
      // Keep earlier results for pages this request didn't cover.
      const keep = (report?.pages ?? []).filter((p) => !fresh.some((f) => f.url === p.url));
      onReport({ checkedAt: data.checkedAt as number, pages: [...fresh, ...keep] });
      setState("idle");
    } catch (e) {
      setError((e as Error).message); setState("error");
    } finally {
      busy.current = false;
    }
  }

  if (!cited.length) {
    return (
      <section className="card p-6 text-center">
        <h2 className="text-lg font-semibold">Cited pages</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
          When AIs answer, they often cite pages: reviews, &quot;best of&quot; lists, directories. Paste answers with their links, and this shows
          which of those pages mention your competitors but not you, with a way to get onto each one.
        </p>
        <button type="button" className="btn btn-primary mt-4" onClick={onAnswers}>Add answers</button>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="cited-h">
      <div className="space-y-3 border-b border-line p-5 sm:p-6">
        <h2 id="cited-h" className="text-lg font-semibold">Pages the AIs cite</h2>
        <div aria-live="polite">
          {checkedTop.length > 0 && gaps.checked > 0 ? (
            <p className="text-sm">
              AIs cite {cited.length === 1 ? "this page" : `these ${cited.length} pages`}. Of the {gaps.checked === 1 ? "one" : gaps.checked} we read, you&apos;re missing from <strong>{gaps.missing}</strong>.
              {gaps.competitors.length > 0 && <> Competitors on them: {names(gaps.competitors.map((c) => `${c.name} (${c.pages})`))}.</>}
            </p>
          ) : (
            <p className="text-sm text-muted">AIs cited {cited.length} page{cited.length === 1 ? "" : "s"} in your answers. Check the most-cited ones to see which name you and which name your competitors.</p>
          )}
          {state === "busy" && <p className="mt-2 text-sm text-muted" role="status">Reading up to {top.length} pages, one at a time per site. This can take up to a minute…</p>}
          {state === "error" && <p className="mt-2 text-sm text-bad" role="alert">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={check} disabled={state === "busy"}>
            {state === "busy" ? "Checking…" : unchecked < top.length ? "Check again" : `Check the top ${top.length} page${top.length === 1 ? "" : "s"}`}
          </button>
          {report && <span className="text-xs text-muted">Last checked <time dateTime={new Date(report.checkedAt).toISOString()} title={new Date(report.checkedAt).toLocaleString()}>{new Date(report.checkedAt).toLocaleDateString()}</time></span>}
        </div>
        {!profile.competitors.length && <p className="text-xs text-muted">Add competitors on the Questions tab to see which of them each page names.</p>}
      </div>
      <ul className="divide-y divide-line">
        {top.map((c) => <Row key={c.url} cited={c} page={byUrl.get(c.url)} profile={profile} />)}
      </ul>
      {rest.length > 0 && (
        <div className="border-t border-line bg-paper px-5 py-4 text-sm sm:px-6">
          <p><span className="font-medium">{rest.length} more cited page{rest.length === 1 ? "" : "s"}.</span> <span className="text-muted">Free checks the {LIMIT} most cited; paid plans check the top {FULL} (coming soon).</span></p>
          <ul className="mt-2 space-y-1 text-muted">
            {rest.slice(0, 10).map((c) => <li key={c.url} className="truncate">{c.domain} · cited {c.count}×</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
