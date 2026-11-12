import { describe, expect, it } from "vitest";
import { PLAN_CARDS, PLANS, can, remaining } from "@/lib/plans";
import { plan, nicheTerms } from "@/lib/plan";
import { CATALOG_COUNT, GUIDES } from "@/lib/catalog";
import { safeHref } from "@/lib/safe-href";

describe("entitlements", () => {
  it("gates features by plan", () => {
    expect(can("free", "citations")).toBe(false);
    expect(can("starter", "citations")).toBe(true);
    expect(can("growth", "whiteLabel")).toBe(false);
    expect(can("agency", "whiteLabel")).toBe(true);
  });
  it("never reports a negative allowance", () => {
    expect(remaining("starter", "autoScans", 2)).toBe(PLANS.starter.autoScansPerMonth - 2);
    expect(remaining("free", "autoScans", 3)).toBe(0);
  });
  it("only sells what exists: Free is the only plan available (F-10)", () => {
    expect(PLAN_CARDS.filter((p) => p.available).map((p) => p.id)).toEqual(["free"]);
  });
});

describe("catalog and ranking", () => {
  it("guides are detailed, linkable and unique", () => {
    expect(GUIDES.length).toBeGreaterThan(50);
    expect(GUIDES.length).toBeLessThan(CATALOG_COUNT);
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);
    for (const g of GUIDES) {
      expect(safeHref(g.url)).toBeTruthy();
      expect(g.description.length).toBeGreaterThanOrEqual(120);
    }
  });

  it("puts sites the AIs cited first", () => {
    const out = plan({ kind: "software", categories: ["productivity"], citedDomains: { "alternativeto.net": 5 } });
    expect(out.destinations[0].reasons.join(" ")).toMatch(/Cited by AI/);
  });

  it("finds niche words in a category", () => {
    expect(nicheTerms("open-source note-taking app")).toEqual(expect.arrayContaining(["notetaking", "opensource"]));
  });
});
