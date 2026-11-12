"use client";

import type { Profile, Run } from "@/lib/types";
import { citationRate, shareOfVoice } from "@/lib/score";

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Share of voice against the competitors on the Questions tab (ARCHITECTURE §9.6). */
export default function Competitors({ profile, runs }: { profile: Profile; runs: Run[] }) {
  const rows = shareOfVoice(runs, { name: profile.name, aliases: profile.aliases, domain: profile.domain }, profile.competitors);
  const scored = runs.filter((r) => r.ok && (r.mode === "search" || r.provider === "deepseek")).length;
  const cite = citationRate(runs);

  if (!scored) {
    return (
      <section className="card p-6 text-center">
        <h2 className="text-lg font-semibold">Competitors</h2>
        <p className="mt-2 text-sm text-muted">Once answers come in, this shows how often the AIs name you next to each competitor.</p>
      </section>
    );
  }
  if (!profile.competitors.length) {
    return (
      <section className="card p-6">
        <h2 className="text-lg font-semibold">Competitors</h2>
        <p className="mt-2 text-sm text-muted">Add competitors on the Questions tab to compare your share of the answers with theirs.</p>
      </section>
    );
  }

  return (
    <section className="card space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Share of voice</h2>
        <p className="mt-1 text-sm text-muted">
          In {scored} answers, how often each name came up. Share is that name&apos;s mentions out of all mentions of the names below.
          {cite != null && ` Answers linked to your own site ${pct(cite)} of the time.`}
        </p>
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">Share of voice by name</caption>
        <thead>
          <tr className="text-left text-muted">
            <th scope="col" className="py-2 font-medium">Name</th>
            <th scope="col" className="py-2 text-right font-medium">Answers</th>
            <th scope="col" className="py-2 text-right font-medium">Share</th>
            <th scope="col" className="hidden py-2 text-right font-medium sm:table-cell">Avg position</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-line">
              <th scope="row" className={`py-2.5 pr-3 text-left ${r.isYou ? "font-semibold" : "font-normal"}`}>
                {r.name}{r.isYou && <span className="chip ml-2">you</span>}
                <div className="mt-1.5 h-1.5 rounded-full bg-[#e9ebef]" aria-hidden><div className={`h-full rounded-full ${r.isYou ? "bg-brand" : "bg-ink/70"}`} style={{ width: pct(r.share) }} /></div>
              </th>
              <td className="py-2.5 text-right tabular-nums">{r.answers} of {scored}</td>
              <td className="py-2.5 text-right font-semibold tabular-nums">{pct(r.share)}</td>
              <td className="hidden py-2.5 text-right tabular-nums sm:table-cell">{r.avgRank ? `#${r.avgRank.toFixed(1)}` : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted">Names are matched exactly as written on the Questions tab. Add other spellings there if a competitor is missing.</p>
    </section>
  );
}
