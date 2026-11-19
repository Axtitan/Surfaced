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

describe("capitalisation", () => {
  const notion = { name: "Notion", aliases: [], domain: "notion.so" };

  it("doesn't count a capitalised brand used as an ordinary word", () => {
    expect(matcher(notion).test("The notion of a single source of truth matters.")).toBe(-1);
    expect(matcher({ name: "Wave", aliases: [], domain: "" }).test("A new wave of tools")).toBe(-1);
  });

  it("finds the capitalised mention after an ordinary use of the word", () => {
    const text = "The notion of a wiki is old; Notion made it pleasant.";
    expect(text.slice(matcher(notion).test(text))).toMatch(/^Notion made/);
  });

  it("still counts all caps, the domain, and brands written in lower case", () => {
    expect(matcher(notion).test("## NOTION")).toBe(3);
    expect(matcher(notion).test("see notion.so/templates")).toBe(4);
    expect(matcher({ name: "monday.com", aliases: [], domain: "" }).test("we use monday.com daily")).toBe(7);
    expect(matcher({ name: "hey", aliases: [], domain: "" }).test("try hey for email")).toBe(4);
  });

  it("needs a capital for a domain root on its own", () => {
    const harvest = { name: "Get Harvest", aliases: [], domain: "getharvest.com" };
    expect(matcher(harvest).test("the harvest season")).toBe(-1);
    expect(matcher(harvest).test("Try Harvest")).toBe(4);
  });

  it("leaves scripts without capitals alone", () => {
    expect(matcher({ name: "東京ラーメン", aliases: [], domain: "" }).test("おすすめは東京ラーメン")).toBe(5);
    expect(matcher({ name: "نون", aliases: [], domain: "" }).test("من نون")).toBe(3);
  });

  it("ignores capitalisation entirely when asked, for filters that must catch every spelling", () => {
    expect(matcher(notion, { anyCase: true }).test("is notion worth it")).toBe(3);
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
