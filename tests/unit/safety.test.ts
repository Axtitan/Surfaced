import { describe, expect, it } from "vitest";
import { safeHref } from "@/lib/safe-href";
import { jsonLd, llmsTxt } from "@/lib/fixes";
import { normaliseUrl } from "@/lib/url";
import type { Profile } from "@/lib/types";

describe("safeHref", () => {
  it.each(["https://a.com/x", "http://a.com"])("keeps %s", (u) => expect(safeHref(u)).toBeTruthy());
  it.each(["javascript:alert(1)", " JAVASCRIPT:alert(1)", "data:text/html,hi", "/relative", "", null, undefined, "vbscript:x"])("refuses %s", (u) => expect(safeHref(u)).toBeUndefined());
});

describe("normaliseUrl", () => {
  it("adds https to bare domains", () => expect(normaliseUrl("acme.com")?.href).toBe("https://acme.com/"));
  it("refuses words without a dot", () => expect(normaliseUrl("localhost")).toBeNull());
});

const profile = (desc: string): Profile => ({
  url: "https://acme.com", domain: "acme.com", name: "Acme", aliases: [], kind: "software", category: "crm", audience: "", location: "", competitors: [], categories: [],
  listing: { tagline: "t", shortDescription: "s", longDescription: desc, keywords: [], pricing: "Free", platforms: [] },
});

describe("generated site files", () => {
  it("escapes < in JSON-LD so a description can't close the script tag (F-14)", () => {
    const out = jsonLd(profile("</script><script>alert(1)</script>"));
    const inner = out.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    expect(inner).not.toContain("<");
    expect(JSON.parse(inner)["@graph"][1].description).toBe("</script><script>alert(1)</script>");
  });
  it("offers a free price only when pricing is Free", () => {
    expect(jsonLd(profile("d"))).toContain('"price": "0"');
  });
  it("writes llms.txt with the name and key pages", () => {
    const t = llmsTxt(profile("d"));
    expect(t.startsWith("# Acme")).toBe(true);
    expect(t).toContain("https://acme.com/pricing");
  });
});
