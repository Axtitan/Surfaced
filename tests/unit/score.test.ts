import { describe, expect, it } from "vitest";
import { citationRate, interval, shareOfVoice, summarise } from "@/lib/score";
import { run } from "./helpers";

describe("summarise", () => {
  it("averages the mention rate across AIs so one AI can't carry the score", () => {
    const runs = [
      run({ provider: "chatgpt", mentioned: true }), run({ provider: "chatgpt", mentioned: true }),
      run({ provider: "claude", mentioned: false }), run({ provider: "claude", mentioned: false }),
    ];
    expect(summarise(runs, ["chatgpt", "claude"]).score).toBe(50);
  });

  it("leaves failed and memory-only answers out of the score", () => {
    const runs = [run({ mentioned: true }), run({ ok: false }), run({ mode: "memory", mentioned: false })];
    const s = summarise(runs, ["chatgpt"]);
    expect(s.score).toBe(100);
    expect(s.errors).toBe(1);
    expect(s.memoryRate).toBe(0);
  });

  it("counts each rival and cited domain once per answer", () => {
    const r = run({ others: ["Foo", "Foo"], sources: [{ url: "https://g2.com/a", domain: "g2.com" }, { url: "https://g2.com/b", domain: "g2.com" }] });
    const s = summarise([r], ["chatgpt"]);
    expect(s.rivals).toEqual([["Foo", 1]]);
    expect(s.domains).toEqual([["g2.com", 1]]);
  });
});

describe("shareOfVoice", () => {
  const brand = { name: "Acme", aliases: [], domain: "acme.com" };
  it("shares add up to 100% and the brand is marked", () => {
    const runs = [
      run({ mentioned: true, rank: 1, text: "Acme and Foo", others: ["Foo"] }),
      run({ mentioned: false, text: "Foo is best", others: ["Foo"] }),
    ];
    const rows = shareOfVoice(runs, brand, ["Foo", "Bar"]);
    expect(rows.map((r) => [r.name, r.answers])).toEqual([["Foo", 2], ["Acme", 1], ["Bar", 0]]);
    expect(rows.reduce((n, r) => n + r.share, 0)).toBeCloseTo(1);
    expect(rows.find((r) => r.isYou)?.avgRank).toBe(1);
    expect(rows.find((r) => r.name === "Foo")?.avgRank).toBe(1);
  });

  it("is all zeros with no answers", () => {
    expect(shareOfVoice([], brand, ["Foo"]).every((r) => r.share === 0)).toBe(true);
  });
});

describe("citationRate and interval", () => {
  it("is null with nothing to measure", () => expect(citationRate([])).toBeNull());
  it("measures cited answers", () => expect(citationRate([run({ cited: true }), run()])).toBe(0.5));
  it("gives a wide interval for few answers and the full range for none", () => {
    expect(interval(0, 0)).toEqual([0, 1]);
    const [lo, hi] = interval(1, 2);
    expect(lo).toBeLessThan(0.2);
    expect(hi).toBeGreaterThan(0.8);
  });
});
