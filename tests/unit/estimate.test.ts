import { describe, expect, it } from "vitest";
import { calibration, estimateCheck, estimateQuestion, evidenceFor, pagesToRead, parseUrls, ESTIMATE_PAGES_PER_RUN, PAGES_PER_QUESTION, type Evidence } from "@/lib/estimate";
import { modeRuns } from "@/lib/store";
import type { CitedPage } from "@/lib/types";
import { run } from "./helpers";

const src = (url: string) => ({ url, domain: new URL(url).hostname });
const page = (url: string, over: Partial<CitedPage> = {}): CitedPage => ({ url, domain: new URL(url).hostname, title: "", status: "checked", you: false, linksYou: false, competitors: [], ...over });
const ev = (url: string, weight = 1, from: Evidence["from"] = "added"): Evidence => ({ url, weight, from });

describe("parseUrls", () => {
  it("takes web addresses from pasted text, cleaned and de-duplicated", () => {
    expect(parseUrls("https://a.com/x?utm_source=g\nhttps://a.com/x, see https://b.com/y). javascript:alert(1) not-a-url")).toEqual(["https://a.com/x", "https://b.com/y"]);
  });
  it("stops at the limit", () => {
    expect(parseUrls(Array.from({ length: 30 }, (_, i) => `https://a.com/${i}`).join("\n"))).toHaveLength(12);
  });
});

describe("evidenceFor", () => {
  const runs = [
    run({ prompt: "q1", provider: "chatgpt", sources: [src("https://a.com/1"), src("https://b.com/1")] }),
    run({ prompt: "q1", provider: "claude", via: "paste", sources: [src("https://a.com/1?utm_source=x")] }),
    run({ prompt: "q1", ok: false, sources: [src("https://failed.com/")] }),
  ];

  it("uses pages cited by any real answer, most cited first, then pages the user added", () => {
    const e = evidenceFor(["q1"], runs, { q1: ["https://c.com/1", "https://a.com/1"] }).q1;
    expect(e.map((x) => [x.url, x.from])).toEqual([["https://a.com/1", "cited"], ["https://b.com/1", "cited"], ["https://c.com/1", "added"]]);
    expect(e[0].weight).toBe(2); // cited by two answers
    expect(e[1].weight).toBe(1);
  });

  it("lends a question without pages the check's other pages at half weight", () => {
    const e = evidenceFor(["q1", "q2"], runs);
    expect(e.q2.map((x) => [x.url, x.weight, x.from])).toEqual([["https://a.com/1", 1, "pooled"], ["https://b.com/1", 0.5, "pooled"]]);
  });

  it("has nothing when the check has no pages at all", () => {
    expect(evidenceFor(["q1"], [])).toEqual({ q1: [] });
  });

  it("caps the pages per question", () => {
    const many = { q1: Array.from({ length: 12 }, (_, i) => `https://a.com/${i}`) };
    expect(evidenceFor(["q1"], [], many).q1).toHaveLength(PAGES_PER_QUESTION);
  });
});

describe("pagesToRead", () => {
  it("takes unread pages first, a question at a time, and respects the limit", () => {
    const evidence = { q1: [ev("https://a.com/1"), ev("https://a.com/2")], q2: [ev("https://b.com/1"), ev("https://a.com/1")] };
    expect(pagesToRead(evidence)).toEqual(["https://a.com/1", "https://b.com/1", "https://a.com/2"]);
    expect(pagesToRead(evidence, [page("https://a.com/1")])).toEqual(["https://b.com/1", "https://a.com/2", "https://a.com/1"]);
    expect(pagesToRead(evidence, [], 2)).toHaveLength(2);
    const big = Object.fromEntries(Array.from({ length: 10 }, (_, q) => [`q${q}`, Array.from({ length: 6 }, (_, i) => ev(`https://s${q}.com/${i}`))]));
    expect(pagesToRead(big)).toHaveLength(ESTIMATE_PAGES_PER_RUN);
  });
  it("retries pages that couldn't be read", () => {
    expect(pagesToRead({ q: [ev("https://a.com/1")] }, [page("https://a.com/1", { status: "failed" })])).toEqual(["https://a.com/1"]);
  });
});

describe("estimateQuestion", () => {
  const urls = ["https://a.com/1", "https://b.com/1", "https://c.com/1", "https://d.com/1"];
  const evidence = urls.map((u) => ev(u));

  it("has no number until a page is read", () => {
    const q = estimateQuestion("q", evidence, [page(urls[0], { status: "failed" })], []);
    expect(q).toMatchObject({ p: null, read: 0, basis: "added" });
  });

  it("rises with the share of pages that name the product", () => {
    const at = (named: number) => estimateQuestion("q", evidence, urls.map((u, i) => page(u, { you: i < named })), []).p!;
    expect(at(0)).toBeLessThan(0.1);
    expect(at(2)).toBeCloseTo(0.38, 2);
    expect(at(4)).toBeGreaterThan(0.7);
    expect(at(0)).toBeLessThan(at(1));
    expect(at(1)).toBeLessThan(at(2));
    expect(at(3)).toBeLessThan(at(4));
  });

  it("never claims certainty, and narrows its range as pages agree", () => {
    const few = estimateQuestion("q", evidence.slice(0, 1), [page(urls[0], { you: true })], []);
    const many = estimateQuestion("q", evidence, urls.map((u) => page(u, { you: true })), []);
    expect(few.p!).toBeLessThan(many.p!);
    expect(many.p!).toBeLessThan(1);
    expect(few.hi - few.lo).toBeGreaterThan(many.hi - many.lo);
    expect(few.lo).toBeLessThanOrEqual(few.p!);
    expect(few.hi).toBeGreaterThanOrEqual(few.p!);
  });

  it("weights a page by how many answers cited it", () => {
    const pages = [page(urls[0], { you: true }), page(urls[1])];
    const even = estimateQuestion("q", [ev(urls[0], 1, "cited"), ev(urls[1], 1, "cited")], pages, []).p!;
    const heavy = estimateQuestion("q", [ev(urls[0], 3, "cited"), ev(urls[1], 1, "cited")], pages, []).p!;
    expect(heavy).toBeGreaterThan(even);
  });

  it("lists the competitors on the pages, by share", () => {
    const pages = [page(urls[0], { competitors: ["Xero", "Wave"] }), page(urls[1], { competitors: ["xero"] }), page(urls[2]), page(urls[3])];
    const q = estimateQuestion("q", evidence, pages, ["Wave", "Xero", "Zoho"]);
    expect(q.rivals).toEqual([{ name: "Xero", pages: 2, share: 0.5 }, { name: "Wave", pages: 1, share: 0.25 }]);
  });
});

describe("estimateCheck", () => {
  it("averages the questions it could estimate and counts what is left to read", () => {
    const runs = [run({ prompt: "q1", sources: [src("https://a.com/1"), src("https://b.com/1")] })];
    const before = estimateCheck({ prompts: ["q1", "q2"], runs, competitors: [] });
    expect(before).toMatchObject({ score: null, estimated: 0, pagesRead: 0, unread: 2 });
    const after = estimateCheck({ prompts: ["q1", "q2"], runs, competitors: [], pages: [page("https://a.com/1", { you: true }), page("https://b.com/1", { you: true })] });
    expect(after.estimated).toBe(2);
    expect(after.unread).toBe(0);
    expect(after.pagesRead).toBe(2);
    // q2 borrows q1's pages at half weight, so it is less sure and scores lower.
    expect(after.questions[0].p!).toBeGreaterThan(after.questions[1].p!);
    expect(after.questions[1].basis).toBe("pooled");
    expect(after.score).toBe(Math.round(((after.questions[0].p! + after.questions[1].p!) / 2) * 100));
    expect(after.lo).toBeLessThan(after.score!);
    expect(after.hi).toBeGreaterThan(after.score!);
  });
});

describe("calibration", () => {
  it("compares the estimate with real answers on questions that have both", () => {
    const runs = [
      run({ prompt: "q1", mentioned: true }), run({ prompt: "q1", mentioned: false }),
      run({ prompt: "q2", mentioned: true, ok: false }),
      run({ prompt: "q3", mentioned: true }),
    ];
    const q = (prompt: string, p: number | null) => ({ prompt, p, lo: 0, hi: 1, evidence: [], read: 1, namedOn: 0, rivals: [], basis: "added" as const });
    const c = calibration([q("q1", 0.7), q("q2", 0.4), q("q3", null), q("q4", 0.2)], runs)!;
    expect(c).toMatchObject({ questions: 1, answers: 2 });
    expect(c.estimated).toBeCloseTo(0.7);
    expect(c.measured).toBeCloseTo(0.5);
    expect(c.gap).toBeCloseTo(0.2);
  });
  it("is null with nothing to compare", () => {
    expect(calibration([], [run()])).toBeNull();
  });
});

describe("estimate mode and saved answers", () => {
  const runs = [run({ id: "p", prompt: "q", via: "paste" }), run({ id: "a", prompt: "q" }), run({ id: "old", prompt: "removed", via: "paste" })];
  const analysis = { prompts: ["q"] };

  it("leaves paste and automatic modes exactly as they were", () => {
    expect(modeRuns({ runs, mode: "paste", analysis }).map((r) => r.id)).toEqual(["p"]);
    expect(modeRuns({ runs, mode: "auto", analysis }).map((r) => r.id)).toEqual(["a"]);
  });
  it("shows the real answers a check has, pasted first, without mixing the two kinds", () => {
    expect(modeRuns({ runs, mode: "estimate", analysis }).map((r) => r.id)).toEqual(["p"]);
    expect(modeRuns({ runs: runs.filter((r) => r.via !== "paste"), mode: "estimate", analysis }).map((r) => r.id)).toEqual(["a"]);
    expect(modeRuns({ runs: [], mode: "estimate", analysis })).toEqual([]);
  });
});
