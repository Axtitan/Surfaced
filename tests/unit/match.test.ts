import { describe, expect, it } from "vitest";
import { brandTerms, judge, listedNames, matcher } from "@/lib/match";

const acme = { name: "Acme", aliases: [], domain: "acme.com" };

describe("matcher", () => {
  it("finds the name as a whole word, case-insensitively", () => {
    expect(matcher(acme).test("I'd pick ACME for this.")).toBe(9);
    expect(matcher(acme).test("Acmeville and Superacme are different")).toBe(-1);
  });

  it("folds accents and quotes the right place in the original text", () => {
    const m = matcher({ name: "Café Noir", aliases: [], domain: "" });
    const text = "Try Cafe Noir today";
    expect(m.test(text)).toBe(4);
    const accented = "→ Try Café Noir";
    expect(accented.slice(m.test(accented))).toBe("Café Noir");
  });

  it("uses letters in any script as word boundaries", () => {
    const m = matcher({ name: "Мир", aliases: [], domain: "" });
    expect(m.test("лучший — Мир")).toBeGreaterThan(0);
    expect(m.test("Мирный")).toBe(-1);
  });

  it("matches scripts written without spaces as a substring", () => {
    const m = matcher({ name: "東京ラーメン", aliases: [], domain: "" });
    expect(m.test("おすすめは東京ラーメンです")).toBe(5);
  });

  it("adds the domain and its distinctive root", () => {
    expect(brandTerms({ name: "Invoicely", aliases: [], domain: "getinvoicely.com" })).toContain("invoicely");
    expect(brandTerms({ name: "X", aliases: [], domain: "app.io" })).not.toContain("app");
  });

  it("counts sources on the brand's own site and subdomains as citations", () => {
    expect(matcher(acme).citesOwnSite(["blog.acme.com"])).toBe(true);
    expect(matcher(acme).citesOwnSite(["notacme.com"])).toBe(false);
  });
});

describe("judge", () => {
  it("reports position in a list and who else was named", () => {
    const text = "Here are options:\n1. **Foo** - fast\n2. **Acme** - simple\n3. **Bar**: cheap";
    const v = judge(acme, text, []);
    expect(v.mentioned).toBe(true);
    expect(v.rank).toBe(2);
    expect(v.others).toEqual(["Foo", "Bar"]);
    expect(v.evidence).toContain("Acme");
  });

  it("says not mentioned with no evidence", () => {
    const v = judge(acme, "1. Foo\n2. Bar", []);
    expect(v).toMatchObject({ mentioned: false, rank: null, evidence: undefined });
  });
});

describe("listedNames", () => {
  it("skips section headings like Pros and Pricing", () => {
    expect(listedNames("## Foo\n- Pros: fast\n- **Pricing**: $5\n- Bar")).toEqual(["Foo", "Bar"]);
  });
});
