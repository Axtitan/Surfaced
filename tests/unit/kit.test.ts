import { describe, expect, it } from "vitest";
import { fit, kitFor, type Kit } from "@/lib/kit";
import type { Destination } from "@/lib/types";

const kit: Kit = {
  name: "Acme", url: "https://acme.com/", tagline: "Invoicing for freelancers who hate paperwork and want to get paid faster",
  shortDescription: "Acme sends invoices, chases late payments and tracks what you're owed. Built for freelancers and small studios.",
  longDescription: "Acme turns a timesheet into an invoice in one click. It reminds clients politely when a payment is late. ".repeat(6).trim(),
  keywords: "invoicing, freelancers", pricing: "Free plan; Pro $9 a month", platforms: "Web", alternativeTo: "FreshBooks, Wave",
  email: "", logoUrl: "", twitter: "",
};
const dest = (over: Partial<Destination>): Destination => ({ slug: "x", name: "X", type: "directory", url: "https://x.com/", site: "https://x.com/", description: "", pricing: "free", link: "unknown", categories: [], ...over });
const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
// Words the templates themselves may use; everything else must come from the kit.
const TEMPLATE = words("hi i'm sharing writing about built made it's an alternative to feedback welcome good or bad like hear how compares today honest appreciate especially what's missing pricing happy answer questions show thanks reading fits future issue send screenshots covering this space give demo");

describe("fit", () => {
  it("leaves short text alone and keeps whole sentences when it can", () => {
    expect(fit("Short.", 60)).toBe("Short.");
    expect(fit("One sentence here. Another one that is long enough to overflow.", 30)).toBe("One sentence here.");
  });
  it("cuts on a word with an ellipsis, within the limit", () => {
    const out = fit("Invoicing for freelancers who hate paperwork and want to get paid faster", 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
});

describe("kitFor", () => {
  const types = ["directory", "product-launch-site", "github", "subreddit", "community", "marketplace", "newsletter", "citation"];

  it.each(types)("keeps every limited field within its limit (%s)", (type) => {
    for (const f of kitFor(dest({ type }), kit).fields) if (f.max) expect(f.text.length, f.label).toBeLessThanOrEqual(f.max);
  });

  it.each(types)("adds no facts the kit doesn't contain (%s)", (type) => {
    const source = words(Object.values(kit).join(" ") + " X");
    for (const f of kitFor(dest({ type }), kit).fields) {
      const extra = [...words(f.text)].filter((w) => !source.has(w) && !TEMPLATE.has(w));
      expect(extra, f.label).toEqual([]);
    }
  });

  it("uses Product Hunt's limits and a maker comment", () => {
    const v = kitFor(dest({ slug: "product-hunt", name: "Product Hunt", type: "product-launch-site" }), kit);
    expect(v.fields.find((f) => f.label === "Tagline")!.max).toBe(60);
    expect(v.fields.find((f) => f.label === "Description")!.max).toBe(260);
    expect(v.fields.find((f) => f.label === "First comment from you")!.text).toMatch(/^Hi! I'm sharing Acme: invoicing for freelancers/);
    expect(v.overrides!.tagline!.length).toBeLessThanOrEqual(60);
  });

  it("writes an awesome-list entry in the usual Markdown form", () => {
    const [entry] = kitFor(dest({ type: "github", name: "someone/awesome-invoicing" }), kit).fields;
    expect(entry.text).toMatch(/^- \[Acme\]\(https:\/\/acme\.com\/\) - [A-Z].*\.$/);
    expect(entry.text).not.toMatch(/!|best|awesome/i);
  });

  it("asks for a Show HN title within Hacker News' 80 characters", () => {
    const v = kitFor(dest({ slug: "hacker-news", type: "citation" }), kit);
    const title = v.fields.find((f) => f.label === "Title")!.text;
    expect(title.startsWith("Show HN: Acme – ")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(80);
  });

  it("discloses that the poster made it on Reddit, and links the rules tip", () => {
    const v = kitFor(dest({ type: "subreddit", name: "r/freelance" }), kit);
    expect(v.fields[0].text).toMatch(/^I built Acme: invoicing for freelancers/);
    expect(v.tips.join(" ")).toMatch(/rules/);
  });

  it("treats business profiles as listings and steers away from writing a Wikipedia article", () => {
    expect(kitFor(dest({ slug: "google-business-profile", type: "citation", name: "Google Business Profile" }), kit).title).toMatch(/profile/i);
    const wiki = kitFor(dest({ slug: "wikipedia", type: "citation" }), kit);
    expect(wiki.fields).toEqual([]);
    expect(wiki.tips.join(" ")).toMatch(/conflict-of-interest/);
  });

  it("copes with an empty kit", () => {
    const empty: Kit = { ...kit, tagline: "", shortDescription: "", longDescription: "", alternativeTo: "", pricing: "" };
    for (const type of types) expect(() => kitFor(dest({ type }), empty)).not.toThrow();
  });
});
