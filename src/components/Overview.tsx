"use client";

import { useMemo } from "react";
import { citedUrls, gapSummary } from "@/lib/citations";
import { citationRate, interval, type summarise } from "@/lib/score";
import type { Check, CitedReport, Profile, Run } from "@/lib/types";
import type { CheckEstimate } from "@/lib/estimate";
import { AI_NAME } from "@/lib/ais";

/* The first tab of a check (§16.1): where things stand and the few things worth doing next, each linking to the tab
   that does it. Everything here is derived from data the other tabs already hold. */

type Summary = ReturnType<typeof summarise>;
export type OverviewTab = "questions" | "answers" | "competitors" | "cited" | "listings" | "site";

const pct = (x: number) => `${Math.round(x * 100)}%`;

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {note && <dd className="mt-0.5 text-xs text-muted">{note}</dd>}
    </div>
  );
}

export default function Overview({ profile, runs, prompts, summary, checks, cited, submitted, expected, estimate, onGo }: {
  profile: Profile; runs: Run[]; prompts: string[]; summary: Summary; checks: Check[]; cited?: CitedReport;
  /** Listings marked submitted or live. */
  submitted: number;
  /** Answers a complete free check would have (questions × AIs). */
  expected: number;
  /** Set in estimate mode: the estimate is shown first, and always labelled as one. */
  estimate?: CheckEstimate;
  onGo: (t: OverviewTab) => void;
}) {
  const scored = summary.byProvider.filter((p) => p.runs);
  const n = scored.reduce((a, p) => a + p.runs, 0);
  const k = scored.reduce((a, p) => a + p.mentioned, 0);
  const [lo, hi] = interval(k, n);
  const ranks = runs.filter((r) => r.ok && r.rank != null).map((r) => r.rank as number);
  const avgRank = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;
  const cite = citationRate(runs);
  const answered = runs.filter((r) => r.ok).length;
  const failing = checks.filter((c) => c.status !== "pass");
  const citedTop = useMemo(() => citedUrls(runs, profile.domain), [runs, profile.domain]);
  const gaps = cited ? gapSummary(cited.pages.filter((p) => citedTop.some((c) => c.url === p.url))) : null;
  const topRival = summary.rivals.find(([name]) => !profile.competitors.some((c) => c.toLowerCase() === name.toLowerCase())) ?? summary.rivals[0];

  const steps: { text: string; action: string; tab: OverviewTab }[] = [];
  if (answered < expected) steps.push({ text: `Collect the rest of the answers: ${answered} of ${expected} so far. More answers make the score steadier.`, action: "Add answers", tab: "answers" });
  if (failing.length) steps.push({ text: `Fix ${failing.length} site issue${failing.length === 1 ? "" : "s"} that can stop AIs reading or describing you.`, action: "See site fixes", tab: "site" });
  if (gaps && gaps.missing) steps.push({ text: `You're missing from ${gaps.missing} page${gaps.missing === 1 ? "" : "s"} the AIs cite. Submit or pitch to get on them.`, action: "See cited pages", tab: "cited" });
  else if (!gaps && citedTop.length) steps.push({ text: `The AIs cited ${citedTop.length} page${citedTop.length === 1 ? "" : "s"}. See which mention your competitors but not you.`, action: "Check cited pages", tab: "cited" });
  steps.push({ text: submitted ? `Keep going with listings: ${submitted} submitted so far.` : "Get listed on the sites AIs read, starting with the top of your list.", action: "Open the list", tab: "listings" });
  if (!profile.competitors.length) steps.push({ text: "Add a few competitors to compare your share of the answers with theirs.", action: "Add competitors", tab: "questions" });

  const estimateBlock = estimate && (
    <section aria-labelledby="ov-est" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="ov-est" className="text-lg font-semibold">Estimated visibility</h2>
        <span className="chip !bg-amber-50 !text-warn">Experimental</span>
      </div>
      {estimate.score != null ? (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Estimate" value={`~${estimate.score}`} note={`Likely ${estimate.lo}–${estimate.hi}`} />
          <Stat label="Questions estimated" value={`${estimate.estimated} of ${prompts.length}`} />
          <Stat label="Pages read" value={`${estimate.pagesRead}`} note={estimate.unread ? `${estimate.unread} more to read` : undefined} />
          <Stat label="Based on" value="Pages" note="no AI was asked" />
        </dl>
      ) : (
        <p className="text-sm text-muted">No estimate yet. Run it on the Answers tab: Surfaced reads the pages AIs lean on for your questions and estimates how often they&apos;d name {profile.name}.</p>
      )}
      <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => onGo("answers")}>{estimate.score != null ? "Open the estimate" : "Run the estimate"}</button>
    </section>
  );

  if (!answered && estimate) {
    return (
      <div className="space-y-6">
        {estimateBlock}
        {failing.length > 0 && <p className="text-sm">{failing.length} site issue{failing.length === 1 ? "" : "s"} to fix. <button type="button" className="font-medium underline" onClick={() => onGo("site")}>See site fixes</button></p>}
      </div>
    );
  }

  if (!answered) {
    return (
      <section className="card p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Start with the answers</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Ask your {prompts.length} questions in ChatGPT, Claude, Gemini and DeepSeek and paste what they say. Surfaced then scores whether they
          name {profile.name}, who they name instead, and which pages they rely on.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => onGo("answers")}>Add answers</button>
          <button type="button" className="btn btn-ghost" onClick={() => onGo("questions")}>Review the questions</button>
        </div>
        {failing.length > 0 && <p className="mt-4 text-sm">Meanwhile: {failing.length} site issue{failing.length === 1 ? "" : "s"} to fix. <button type="button" className="font-medium underline" onClick={() => onGo("site")}>See site fixes</button></p>}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {estimateBlock}
      <section aria-labelledby="ov-where" className="space-y-3">
        <h2 id="ov-where" className="text-lg font-semibold">{estimate ? "Where you stand in your real answers" : "Where you stand"}</h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Visibility" value={`${summary.score}`} note={n ? `Likely ${Math.round(lo * 100)}–${Math.round(hi * 100)}, from ${n} answer${n === 1 ? "" : "s"}` : undefined} />
          <Stat label="Named in" value={`${k} of ${n}`} note="answers" />
          <Stat label="Average position" value={avgRank != null ? `#${avgRank.toFixed(1)}` : "–"} note={avgRank != null ? "when named in a list" : "not named in a list yet"} />
          <Stat label="Links to your site" value={cite != null ? pct(cite) : "–"} note="of answers with sources" />
        </dl>
        {scored.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {scored.map((p) => <li key={p.id} className="chip">{AI_NAME[p.id]}: {pct(p.rate)} ({p.mentioned}/{p.runs})</li>)}
          </ul>
        )}
        {topRival && <p className="text-sm text-muted">Named most often instead of you: <span className="font-medium text-ink">{topRival[0]}</span> ({topRival[1]} answer{topRival[1] === 1 ? "" : "s"}).</p>}
      </section>

      <section aria-labelledby="ov-next" className="card p-5 sm:p-6">
        <h2 id="ov-next" className="text-lg font-semibold">What to do next</h2>
        <ol className="mt-3 divide-y divide-line">
          {steps.map((s, i) => (
            <li key={s.tab + i} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm"><span className="mr-2 font-semibold text-muted">{i + 1}.</span>{s.text}</span>
              <button type="button" className="btn btn-ghost shrink-0 !px-3 !py-1.5 !text-sm" onClick={() => onGo(s.tab)}>{s.action}</button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
