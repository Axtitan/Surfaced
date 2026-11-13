import { canonicalUrl } from "./citations";
import { interval } from "./score";
import type { CitedPage, Run } from "./types";

/* Estimate mode (experimental): predicts how often AIs would name a product without asking them.

   The idea: a search-backed AI answer is mostly a summary of the pages the AI read. A product that is on most of those
   pages tends to be named; one that is on none rarely is. So for each question we take "evidence pages" (pages real
   answers cited, or pages the user says rank for the question), read them with the polite crawler, and estimate the
   chance of being named from the share of pages that name the product.

   This is an estimate, never a measurement. It is kept apart from real answers: it has its own stored report, never
   writes a Run, and the interface always labels it. `calibration()` compares it with real answers when a check has both.
   Everything here is pure, so the same numbers come out on the server, in the browser and in tests. */

/** Bump when the formula changes, so old and new estimates are never compared silently. */
export const ESTIMATE_VERSION = 1;
/** Pages read per request (the server enforces this) and considered per question. */
export const ESTIMATE_PAGES_PER_RUN = 20;
export const PAGES_PER_QUESTION = 6;
/** With no evidence at all we assume a product is named in about 1 answer in 7; two pages' worth of evidence outweighs it. */
const PRIOR = 0.15;
const PRIOR_WEIGHT = 2;
/** Pages borrowed from the check's other questions count for half: related, but not about this question. */
const POOLED = 0.5;

export type Basis = "cited" | "added" | "pooled" | "none";
export type Evidence = { url: string; weight: number; from: Exclude<Basis, "none"> };
export type EstimateReport = { version: number; at: number; pages: CitedPage[] };

export type QuestionEstimate = {
  prompt: string;
  /** Chance an AI answer to this question names the product, 0–1. Null when no evidence page has been read. */
  p: number | null;
  lo: number;
  hi: number;
  /** Evidence pages for the question, and how many were read. */
  evidence: Evidence[];
  read: number;
  namedOn: number;
  /** Competitors on the read pages, by the weighted share of pages naming each. */
  rivals: { name: string; share: number; pages: number }[];
  basis: Basis;
};

/** A page cited by several answers matters more, with diminishing returns: 1, 2, 4, 8 answers → 1, 2, 3, 4. */
const citeWeight = (count: number) => 1 + Math.log2(Math.max(1, count));

/** Splits pasted text into page addresses: one per line or separated by spaces or commas. Keeps http(s) pages only. */
export function parseUrls(text: string, max = 12): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\s,]+/)) {
    const u = canonicalUrl(raw.trim().replace(/[.,;)\]>]+$/, ""));
    if (u && !out.includes(u)) out.push(u);
    if (out.length >= max) break;
  }
  return out;
}

/** Evidence pages for each question: pages its real answers cited (any mode), then pages the user added. A question
    with neither borrows the pages of the check's other questions at half weight. */
export function evidenceFor(prompts: string[], runs: Run[], added: Record<string, string[]> = {}): Record<string, Evidence[]> {
  const own: Record<string, Evidence[]> = {};
  for (const q of prompts) {
    const counts = new Map<string, number>();
    for (const r of runs) {
      if (!r.ok || r.prompt !== q) continue;
      for (const u of new Set(r.sources.map((s) => canonicalUrl(s.url)).filter((u): u is string => !!u))) counts.set(u, (counts.get(u) ?? 0) + 1);
    }
    const list: Evidence[] = [...counts].map(([url, n]) => ({ url, weight: citeWeight(n), from: "cited" as const }));
    for (const raw of added[q] ?? []) {
      const url = canonicalUrl(raw);
      if (url && !list.some((e) => e.url === url)) list.push({ url, weight: 1, from: "added" });
    }
    own[q] = list.sort((a, b) => b.weight - a.weight || a.url.localeCompare(b.url)).slice(0, PAGES_PER_QUESTION);
  }
  // The pool: every question's own pages, strongest first, one entry per page.
  const pool = new Map<string, number>();
  for (const list of Object.values(own)) for (const e of list) pool.set(e.url, Math.max(pool.get(e.url) ?? 0, e.weight));
  const pooled: Evidence[] = [...pool].map(([url, w]) => ({ url, weight: w * POOLED, from: "pooled" as const }))
    .sort((a, b) => b.weight - a.weight || a.url.localeCompare(b.url)).slice(0, PAGES_PER_QUESTION);
  return Object.fromEntries(prompts.map((q) => [q, own[q].length ? own[q] : pooled]));
}

/** The pages to read next: unread ones first, taken a question at a time so every question gets some, up to `max`. */
export function pagesToRead(evidence: Record<string, Evidence[]>, read: CitedPage[] = [], max = ESTIMATE_PAGES_PER_RUN): string[] {
  const done = new Set(read.filter((p) => p.status === "checked").map((p) => p.url));
  const lists = Object.values(evidence);
  const pick = (want: (url: string) => boolean) => {
    const out: string[] = [];
    for (let i = 0; i < PAGES_PER_QUESTION; i++) for (const l of lists) { const u = l[i]?.url; if (u && want(u) && !out.includes(u)) out.push(u); }
    return out;
  };
  const fresh = pick((u) => !done.has(u));
  return [...fresh, ...pick((u) => done.has(u))].slice(0, max);
}

/** One question's estimate from its evidence and the pages read so far. */
export function estimateQuestion(prompt: string, evidence: Evidence[], pages: CitedPage[], competitors: string[]): QuestionEstimate {
  const byUrl = new Map(pages.filter((p) => p.status === "checked").map((p) => [p.url, p]));
  const read = evidence.filter((e) => byUrl.has(e.url));
  const n = read.reduce((a, e) => a + e.weight, 0);
  const k = read.reduce((a, e) => a + (byUrl.get(e.url)!.you ? e.weight : 0), 0);
  const basis: Basis = !evidence.length ? "none" : evidence[0].from === "pooled" ? "pooled" : evidence.some((e) => e.from === "cited") ? "cited" : "added";
  const base = { prompt, evidence, read: read.length, namedOn: read.filter((e) => byUrl.get(e.url)!.you).length, basis };
  if (!n) return { ...base, p: null, lo: 0, hi: 1, rivals: [] };
  // The prior pulls thin evidence toward "rarely named"; the range (a Wilson interval) is wide until several pages agree.
  const kk = k + PRIOR * PRIOR_WEIGHT, nn = n + PRIOR_WEIGHT;
  const [lo, hi] = interval(kk, nn);
  const rivals = competitors.map((name) => {
    const on = read.filter((e) => byUrl.get(e.url)!.competitors.some((c) => c.toLowerCase() === name.toLowerCase()));
    return { name, pages: on.length, share: on.reduce((a, e) => a + e.weight, 0) / n };
  }).filter((r) => r.pages).sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));
  return { ...base, p: kk / nn, lo, hi, rivals };
}

export type CheckEstimate = {
  /** 0–100, the average chance across the questions that could be estimated. Null when none could. */
  score: number | null;
  lo: number;
  hi: number;
  questions: QuestionEstimate[];
  estimated: number;
  pagesRead: number;
  /** Evidence pages not read yet. */
  unread: number;
};

/** The whole check: every question's estimate and the headline number. */
export function estimateCheck(input: { prompts: string[]; runs: Run[]; added?: Record<string, string[]>; pages?: CitedPage[]; competitors: string[] }): CheckEstimate {
  const pages = input.pages ?? [];
  const evidence = evidenceFor(input.prompts, input.runs, input.added);
  const questions = input.prompts.map((q) => estimateQuestion(q, evidence[q] ?? [], pages, input.competitors));
  const got = questions.filter((q) => q.p != null);
  const mean = (f: (q: QuestionEstimate) => number) => got.reduce((a, q) => a + f(q), 0) / got.length;
  const wanted = new Set(Object.values(evidence).flat().map((e) => e.url));
  const readUrls = new Set(pages.filter((p) => p.status === "checked").map((p) => p.url));
  const seen = new Set(pages.map((p) => p.url));
  return {
    score: got.length ? Math.round(mean((q) => q.p!) * 100) : null,
    lo: got.length ? Math.round(mean((q) => q.lo) * 100) : 0,
    hi: got.length ? Math.round(mean((q) => q.hi) * 100) : 100,
    questions,
    estimated: got.length,
    pagesRead: [...wanted].filter((u) => readUrls.has(u)).length,
    unread: [...wanted].filter((u) => !seen.has(u)).length,
  };
}

export type Calibration = { questions: number; answers: number; estimated: number; measured: number; gap: number };

/** How the estimate compares with real answers, over the questions that have both. Rates are 0–1; `gap` is the average
    distance per question. Null when there is nothing to compare. When the same answers supplied the evidence pages this
    is a sanity check, not an independent test. */
export function calibration(questions: QuestionEstimate[], runs: Run[]): Calibration | null {
  const rows = questions.flatMap((q) => {
    const real = runs.filter((r) => r.ok && r.prompt === q.prompt && (r.mode === "search" || r.provider === "deepseek"));
    return q.p == null || !real.length ? [] : [{ est: q.p, real: real.filter((r) => r.mentioned).length / real.length, n: real.length }];
  });
  if (!rows.length) return null;
  const avg = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0) / rows.length;
  return { questions: rows.length, answers: rows.reduce((a, r) => a + r.n, 0), estimated: avg((r) => r.est), measured: avg((r) => r.real), gap: avg((r) => Math.abs(r.est - r.real)) };
}
