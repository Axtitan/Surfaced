import { beforeEach, describe, expect, it, vi } from "vitest";
import { JUDGE_VERSION } from "@/lib/match";
import { getProject, listProjects, rejudge, saveProject, type Project } from "@/lib/store";
import type { Analysis } from "@/lib/types";
import { run } from "./helpers";

/* Saved answers are judged again, once, when the judge changes (JUDGE_VERSION). */

const analysis = {
  profile: { url: "https://notion.so", domain: "notion.so", name: "Notion", aliases: [], kind: "software", category: "notes app", audience: "", location: "", competitors: ["Coda"], categories: [],
    listing: { tagline: "", shortDescription: "", longDescription: "", keywords: [], pricing: "", platforms: [] } },
  prompts: ["q"], checks: [], profiledBy: "page",
} as unknown as Analysis;

// Verdicts as the old judge saved them: both answers "named" Notion, but the second only uses the word.
const oldRuns = () => [
  run({ id: "real", prompt: "q", via: "paste", text: "1. **Notion**\n2. **Coda**", mentioned: true, rank: 1 }),
  run({ id: "word", prompt: "q", via: "paste", text: "The notion of a wiki matters more. Try **Coda**.", mentioned: true, rank: null, evidence: "The notion of…" }),
  run({ id: "failed", prompt: "q", via: "paste", ok: false, text: "", mentioned: false }),
];
const project = (over: Partial<Project> = {}): Project => ({ id: "notion.so", analysis, runs: oldRuns(), mode: "paste", createdAt: 1, updatedAt: 1, ...over });

describe("rejudge", () => {
  it("corrects verdicts made by an older judge and says how many changed", () => {
    const p = rejudge(project());
    expect(p.judged).toBe(JUDGE_VERSION);
    expect(p.runs.find((r) => r.id === "real")).toMatchObject({ mentioned: true, rank: 1 });
    expect(p.runs.find((r) => r.id === "word")).toMatchObject({ mentioned: false, rank: null, evidence: undefined });
    expect(p.rechecked).toEqual({ answers: 2, changed: 1 });
  });

  it("leaves the answers themselves and failed runs alone", () => {
    const before = project();
    const after = rejudge(before);
    expect(after.runs.map((r) => [r.id, r.text, r.prompt, r.via])).toEqual(before.runs.map((r) => [r.id, r.text, r.prompt, r.via]));
    expect(after.runs.find((r) => r.id === "failed")).toEqual(before.runs.find((r) => r.id === "failed"));
  });

  it("does nothing to a check already judged with this version", () => {
    const p = project({ judged: JUDGE_VERSION });
    expect(rejudge(p)).toBe(p);
  });

  it("adds no notice when nothing changed", () => {
    expect(rejudge(project({ runs: [oldRuns()[0]] })).rechecked).toBeUndefined();
  });
});

describe("saved checks", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k), key: (i: number) => [...store.keys()][i] ?? null, get length() { return store.size; },
    });
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  // A check written by the previous version: old verdicts, no `judged`, and a score in the index that counts both.
  const seedOld = () => {
    store.set("surfaced:project:notion.so", JSON.stringify(project()));
    store.set("surfaced:projects", JSON.stringify([{ id: "notion.so", name: "Notion", domain: "notion.so", score: 100, answers: 2, updatedAt: 1 }]));
  };

  it("re-judges every saved check once, and updates the dashboard score", () => {
    seedOld();
    const [meta] = listProjects();
    expect(meta.score).toBeLessThan(100);
    expect(store.get("surfaced:judged")).toBe(String(JUDGE_VERSION));
    const p = getProject("notion.so")!;
    expect(p.judged).toBe(JUDGE_VERSION);
    expect(p.runs.find((r) => r.id === "word")!.mentioned).toBe(false);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it("re-judges a check the sweep didn't reach when it's opened", () => {
    store.set("surfaced:judged", String(JUDGE_VERSION));
    seedOld();
    expect(getProject("notion.so")!.runs.find((r) => r.id === "word")!.mentioned).toBe(false);
  });

  it("keeps the notice until it's dismissed, then saves normally", () => {
    seedOld();
    const p = getProject("notion.so")!;
    expect(p.rechecked).toEqual({ answers: 2, changed: 1 });
    saveProject({ ...p, rechecked: undefined });
    expect(getProject("notion.so")!.rechecked).toBeUndefined();
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
  });
});
