import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { judge, type Brand } from "@/lib/match";

/* Judge accuracy eval (ARCHITECTURE §13.3): precision and recall of "named", and exact position match, against answers
   labelled by hand. Run with `npm run eval:judge`. Cases come from evals/judge/cases.json (written to cover the hard
   cases) and from evals/judge/private/*.json (real pasted answers, not committed; see `npm run eval:judge:import`).
   Pass marks: precision ≥ 0.99, recall ≥ 0.97. Any change to the matcher must report this before and after. */

type Case = { id: string; brand: Brand; text: string; mentioned: boolean | null; rank: number | null; source?: string };

const DIR = join(process.cwd(), "evals", "judge");
const read = (f: string): Case[] => (JSON.parse(readFileSync(f, "utf8")) as { cases: Case[] }).cases.map((c) => ({ ...c, source: c.source ?? f.split(/[\\/]/).pop() }));
const priv = join(DIR, "private");
const all = [
  ...read(join(DIR, "cases.json")),
  ...(existsSync(priv) ? readdirSync(priv).filter((f) => f.endsWith(".json")).flatMap((f) => read(join(priv, f))) : []),
];
// A case whose "mentioned" is still null hasn't been labelled yet.
const cases = all.filter((c) => typeof c.mentioned === "boolean");

function score(list: Case[]) {
  let tp = 0, fp = 0, fn = 0, tn = 0, rankOk = 0, rankTotal = 0;
  const misses: string[] = [];
  for (const c of list) {
    const v = judge(c.brand, c.text, []);
    if (v.mentioned && c.mentioned) tp++;
    else if (v.mentioned && !c.mentioned) { fp++; misses.push(`false "named"   ${c.id}`); }
    else if (!v.mentioned && c.mentioned) { fn++; misses.push(`missed           ${c.id}`); }
    else tn++;
    if (c.mentioned) {
      rankTotal++;
      if (v.rank === c.rank) rankOk++;
      else misses.push(`position ${v.rank ?? "none"} vs ${c.rank ?? "none"}  ${c.id}`);
    }
  }
  return {
    cases: list.length, tp, fp, fn, tn,
    precision: tp + fp ? tp / (tp + fp) : 1,
    recall: tp + fn ? tp / (tp + fn) : 1,
    position: rankTotal ? rankOk / rankTotal : 1,
    misses,
  };
}

describe("judge accuracy", () => {
  const r = score(cases);
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  console.log([
    `Judge eval: ${r.cases} labelled cases (${all.length - cases.length} still to label)`,
    `  precision ${pct(r.precision)} (mark 99%)   recall ${pct(r.recall)} (mark 97%)   exact position ${pct(r.position)}`,
    `  named: ${r.tp} right, ${r.fp} wrongly, ${r.fn} missed; not named: ${r.tn} right`,
    ...r.misses.map((m) => `  - ${m}`),
  ].join("\n"));

  it("has cases", () => expect(r.cases).toBeGreaterThan(0));
  it("meets the precision mark", () => expect(r.precision).toBeGreaterThanOrEqual(0.99));
  it("meets the recall mark", () => expect(r.recall).toBeGreaterThanOrEqual(0.97));
});
