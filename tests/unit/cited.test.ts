import { beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalUrl, citedUrls, gapSummary, pitchDraft } from "@/lib/citations";
import { destinationBySlug, destinationForUrl, onListingSite } from "@/lib/plan";
import { robotsAllows, robotsBlocks } from "@/lib/site";
import { FetchRefused, type Fetched } from "@/lib/safe-fetch";
import { checkCitedPages, clearCrawlCaches, deniedHost, pageLinks, pageText, politeRead, verifyListing, type CrawlDeps } from "@/server/crawl";
import type { CitedPage, Profile } from "@/lib/types";
import { run } from "./helpers";

describe("robotsAllows", () => {
  const robots = [
    "User-agent: *",
    "Disallow: /private",
    "Allow: /private/ok",
    "Disallow: /*.pdf$",
    "",
    "User-agent: SurfacedBot",
    "Disallow: /no-surfaced",
  ].join("\r\n");

  it("uses the named group over * when one exists", () => {
    // The SurfacedBot group replaces the * rules entirely.
    expect(robotsAllows(robots, "SurfacedBot", "/private")).toBe(true);
    expect(robotsAllows(robots, "SurfacedBot", "/no-surfaced/x")).toBe(false);
  });
  it("falls back to * for other agents", () => {
    expect(robotsAllows(robots, "OtherBot", "/private/x")).toBe(false);
    expect(robotsAllows(robots, "OtherBot", "/public")).toBe(true);
  });
  it("lets the longest rule win, and allow win a tie", () => {
    expect(robotsAllows(robots, "OtherBot", "/private/ok/page")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow: /a\nAllow: /a", "X", "/a")).toBe(true);
  });
  it("supports * and $ in paths", () => {
    expect(robotsAllows(robots, "OtherBot", "/files/report.pdf")).toBe(false);
    expect(robotsAllows(robots, "OtherBot", "/files/report.pdf?x=1")).toBe(true);
  });
  it("allows everything for an empty file or an empty Disallow", () => {
    expect(robotsAllows("", "X", "/anything")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow:", "X", "/anything")).toBe(true);
  });
  it("keeps robotsBlocks as a whole-site check", () => {
    expect(robotsBlocks("User-agent: *\nDisallow: /", "X")).toBe(true);
    expect(robotsBlocks("User-agent: *\nDisallow: /admin", "X")).toBe(false);
  });
});

describe("canonicalUrl and citedUrls", () => {
  it("strips tracking parameters and the fragment", () => {
    expect(canonicalUrl("https://a.com/p?utm_source=x&id=2&fbclid=y#top")).toBe("https://a.com/p?id=2");
  });
  it("refuses non-web addresses and credentials", () => {
    expect(canonicalUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalUrl("https://user:pw@a.com/")).toBeNull();
    expect(canonicalUrl("not a url")).toBeNull();
  });
  it("counts each page once per answer, leaves out the product's own site, and sorts by count", () => {
    const src = (url: string, title?: string) => ({ url, title, domain: new URL(url).hostname });
    const runs = [
      run({ provider: "chatgpt", sources: [src("https://b.com/x?utm_medium=1", "B page"), src("https://b.com/x"), src("https://www.acme.com/pricing")] }),
      run({ provider: "claude", sources: [src("https://b.com/x"), src("https://c.com/y")] }),
      run({ provider: "gemini", ok: false, sources: [src("https://c.com/y")] }),
      run({ provider: "gemini", sources: [src("https://docs.acme.com/z")] }),
    ];
    const out = citedUrls(runs, "acme.com");
    expect(out.map((c) => [c.url, c.count])).toEqual([["https://b.com/x", 2], ["https://c.com/y", 1]]);
    expect(out[0].title).toBe("B page");
    expect(out[0].providers).toEqual(["chatgpt", "claude"]);
    expect(citedUrls(runs, "acme.com", 1)).toHaveLength(1);
  });
});

const page = (over: Partial<CitedPage>): CitedPage => ({ url: "https://x.com/", domain: "x.com", title: "", status: "checked", you: false, linksYou: false, competitors: [], ...over });

describe("gapSummary", () => {
  it("counts only pages that were read", () => {
    const g = gapSummary([
      page({ you: true, competitors: ["Wave"] }),
      page({ competitors: ["Wave", "Xero"] }),
      page({ competitors: ["Xero"] }),
      page({ status: "failed", competitors: ["Zoho"] }),
    ]);
    expect(g.checked).toBe(3);
    expect(g.missing).toBe(2);
    expect(g.competitors).toEqual([{ name: "Wave", pages: 2 }, { name: "Xero", pages: 2 }]);
  });
});

describe("pitchDraft", () => {
  const profile: Profile = {
    url: "https://acme.com", domain: "acme.com", name: "Acme", aliases: [], kind: "software", category: "crm", audience: "small agencies", location: "", competitors: [], categories: [],
    listing: { tagline: "A simple CRM.", shortDescription: "", longDescription: "", keywords: [], pricing: "Free", platforms: [] },
  };
  it("names the page and the rivals on it, and never claims to be sent", () => {
    const d = pitchDraft(profile, { url: "https://b.com/best-crm", title: "Best CRMs", domain: "b.com", competitors: ["HubSpot", "Pipedrive"] });
    expect(d.subject).toBe("A suggestion for Best CRMs");
    expect(d.body).toContain('"Best CRMs" (https://b.com/best-crm)');
    expect(d.body).toContain("HubSpot and Pipedrive");
    expect(d.body).toContain("Acme (https://acme.com): A simple CRM.");
    expect(d.body).toContain("built for small agencies");
    expect(d.body).toContain("[Your name]");
  });
  it("falls back to the domain without a title or rivals", () => {
    const d = pitchDraft(profile, { url: "https://b.com/", title: "", domain: "b.com", competitors: [] });
    expect(d.subject).toBe("A suggestion for b.com");
    expect(d.body).toContain("adding it to the page");
  });
});

describe("destinationForUrl", () => {
  it("matches a site by host", () => {
    expect(destinationForUrl("https://alternativeto.net/software/freshbooks/about/")?.slug).toBe("alternativeto");
    expect(destinationForUrl("https://www.g2.com/products/x/reviews")?.slug).toBe("g2");
  });
  it("doesn't match a shared host by itself", () => {
    expect(destinationForUrl("https://www.reddit.com/r/this-subreddit-is-not-listed-anywhere/")).toBeNull();
    expect(destinationForUrl("https://github.com/someone/some-repo")).toBeNull();
  });
  it("returns null for unknown pages and bad input", () => {
    expect(destinationForUrl("https://example-not-in-catalog.test/page")).toBeNull();
    expect(destinationForUrl("nope")).toBeNull();
  });
  it("marks Wikipedia as a citation site, not a form", () => {
    expect(destinationForUrl("https://en.wikipedia.org/wiki/Invoice")?.type).toBe("citation");
  });
});

describe("page parsing", () => {
  it("keeps visible text only", () => {
    const t = pageText("<head><title>T</title></head><body><script>var Wave=1</script><style>.x{}</style><p>Acme &amp; Xero</p></body>");
    expect(t).toContain("Acme & Xero");
    expect(t).not.toContain("Wave");
  });
  it("resolves links and keeps rel", () => {
    expect(pageLinks('<a href="/p?a=1&amp;b=2" rel="nofollow UGC">x</a><a name="n">y</a>', "https://b.com/dir/")).toEqual([{ href: "https://b.com/p?a=1&b=2", rel: "nofollow ugc" }]);
  });
});

/* A fake web for the crawler: robots.txt and pages by URL, with a clock that only moves when we say. */
function fakeWeb(pages: Record<string, Partial<Fetched> | Error>, { stepMs = 0 } = {}) {
  let t = 1_000_000;
  const calls: string[] = [];
  const deps: CrawlDeps = {
    fetch: async (url) => {
      calls.push(url);
      const p = pages[url];
      if (p instanceof Error) throw p;
      if (!p) return { url, status: 404, contentType: "text/html", body: "" };
      return { url, status: 200, contentType: "text/html", body: "", ...p };
    },
    sleep: async (ms) => { t += ms; },
    now: () => (t += stepMs),
  };
  return { deps, calls };
}

const brand = { name: "Acme", aliases: [], domain: "acme.com" };

describe("politeRead", () => {
  beforeEach(() => { clearCrawlCaches(); vi.unstubAllEnvs(); });

  it("doesn't fetch a page robots.txt disallows for SurfacedBot", async () => {
    const { deps, calls } = fakeWeb({ "https://b.com/robots.txt": { body: "User-agent: SurfacedBot\nDisallow: /reviews" } });
    const r = await politeRead("https://b.com/reviews/1", deps);
    expect(r).toMatchObject({ ok: false, status: "blocked" });
    expect(calls).toEqual(["https://b.com/robots.txt"]);
  });
  it("treats an unreachable robots.txt as disallow, and a missing one as allow", async () => {
    const down = fakeWeb({ "https://b.com/robots.txt": { status: 503 } });
    expect(await politeRead("https://b.com/x", down.deps)).toMatchObject({ ok: false, status: "blocked" });
    clearCrawlCaches();
    const missing = fakeWeb({ "https://b.com/x": { body: "<p>hi</p>" } });
    expect(await politeRead("https://b.com/x", missing.deps)).toMatchObject({ ok: true });
  });
  it("skips deny-listed sites without any request", async () => {
    vi.stubEnv("CRAWL_DENYLIST", "b.com, other.org");
    expect(deniedHost("www.sub.b.com")).toBe(true);
    const { deps, calls } = fakeWeb({});
    expect(await politeRead("https://sub.b.com/x", deps)).toMatchObject({ ok: false, status: "blocked" });
    expect(calls).toEqual([]);
  });
  it("reports HTTP errors and refused fetches as failed", async () => {
    const { deps } = fakeWeb({ "https://b.com/x": { status: 403 }, "https://b.com/y": new FetchRefused("That address points to a private network.") });
    expect(await politeRead("https://b.com/x", deps)).toMatchObject({ ok: false, status: "failed", note: "The site turned away our reader (HTTP 403). Open the page to check it yourself." });
    expect(await politeRead("https://b.com/y", deps)).toMatchObject({ ok: false, status: "failed", note: "That address points to a private network." });
  });
});

describe("checkCitedPages", () => {
  beforeEach(() => clearCrawlCaches());

  const html = (body: string) => `<html><head><title>Best invoicing apps</title></head><body>${body}</body></html>`;

  it("records whether each page names and links the product, and which competitors it names", async () => {
    const { deps } = fakeWeb({
      "https://b.com/best": { body: html('<p>Acme, Xero and Wave.</p><a href="https://www.acme.com/?ref=b">Acme</a>') },
      "https://c.com/list": { body: html("<p>QuickBooks and Wave are popular.</p>") },
    });
    const out = await checkCitedPages(["https://b.com/best", "https://c.com/list"], brand, ["Xero", "Wave", "QuickBooks"], { deadline: Infinity, deps });
    expect(out[0]).toMatchObject({ status: "checked", title: "Best invoicing apps", you: true, linksYou: true, competitors: ["Xero", "Wave"] });
    expect(out[1]).toMatchObject({ status: "checked", you: false, linksYou: false, competitors: ["Wave", "QuickBooks"] });
  });

  it("reads pages on one site one after another, pausing between them", async () => {
    const order: string[] = [];
    const { deps } = fakeWeb({ "https://b.com/1": { body: "a" }, "https://b.com/2": { body: "b" } });
    const sleep = vi.fn(deps.sleep);
    const fetch = vi.fn(async (u: string, o?: { maxBytes?: number; timeoutMs?: number }) => { order.push(u); return deps.fetch(u, o); });
    await checkCitedPages(["https://b.com/1", "https://b.com/2"], brand, [], { deadline: Infinity, deps: { ...deps, sleep, fetch } });
    expect(order).toEqual(["https://b.com/robots.txt", "https://b.com/1", "https://b.com/2"]);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("marks pages past the deadline as skipped and keeps the input order", async () => {
    const { deps } = fakeWeb({ "https://b.com/1": { body: "Acme" }, "https://b.com/2": { body: "Acme" } }, { stepMs: 0 });
    const out = await checkCitedPages(["https://b.com/1", "https://b.com/2"], brand, [], { deadline: 0, deps });
    expect(out.map((p) => [p.url, p.status])).toEqual([["https://b.com/1", "skipped"], ["https://b.com/2", "skipped"]]);
  });

  it("caches pages it read, so a second check makes no requests", async () => {
    const { deps, calls } = fakeWeb({ "https://b.com/1": { body: "Acme" } });
    await checkCitedPages(["https://b.com/1"], brand, [], { deadline: Infinity, deps });
    const before = calls.length;
    const again = await checkCitedPages(["https://b.com/1"], brand, [], { deadline: Infinity, deps });
    expect(calls.length).toBe(before);
    expect(again[0].you).toBe(true);
  });

  it("attaches the catalog listing for a known site", async () => {
    const { deps } = fakeWeb({ "https://alternativeto.net/software/x/": { status: 403 } });
    const [p] = await checkCitedPages(["https://alternativeto.net/software/x/"], brand, [], { deadline: Infinity, deps });
    expect(p.status).toBe("failed");
    expect(p.destination?.slug).toBe("alternativeto");
  });
});

describe("listing verification", () => {
  beforeEach(() => clearCrawlCaches());

  it("only accepts addresses on the listing's own site", () => {
    const d = { url: "https://alternativeto.net/manage/new/", site: "https://alternativeto.net" };
    expect(onListingSite("https://alternativeto.net/software/acme/", d)).toBe(true);
    expect(onListingSite("https://www.alternativeto.net/software/acme/", d)).toBe(true);
    expect(onListingSite("https://evil.test/alternativeto.net", d)).toBe(false);
    expect(onListingSite("https://alternativeto.net.evil.test/", d)).toBe(false);
    expect(destinationBySlug("alternativeto")?.slug).toBe("alternativeto");
    expect(destinationBySlug("nope-nope")).toBeNull();
  });

  it("reports live with the strongest link kind", async () => {
    const { deps } = fakeWeb({ "https://b.com/acme": { body: '<title>Acme on B</title><p>Acme is great</p><a rel="nofollow" href="https://acme.com">x</a><a href="https://www.acme.com/pricing">y</a>' } });
    expect(await verifyListing("https://b.com/acme", brand, deps)).toMatchObject({ status: "live", title: "Acme on B", link: "follow" });
  });
  it("reads rel values: sponsored, ugc, nofollow", async () => {
    const { deps } = fakeWeb({
      "https://b.com/1": { body: '<p>Acme</p><a rel="sponsored nofollow" href="https://acme.com">x</a>' },
      "https://b.com/2": { body: '<p>Acme</p><a rel="ugc" href="https://acme.com">x</a><a rel="sponsored" href="https://acme.com">x</a>' },
      "https://b.com/3": { body: "<p>Acme</p>" },
    });
    expect((await verifyListing("https://b.com/1", brand, deps)).link).toBe("sponsored");
    expect((await verifyListing("https://b.com/2", brand, deps)).link).toBe("ugc");
    expect((await verifyListing("https://b.com/3", brand, deps)).link).toBeNull();
  });
  it("says missing when the page doesn't name the product, and passes through read failures", async () => {
    const { deps } = fakeWeb({ "https://b.com/new": { body: "<p>Other tools</p>" }, "https://b.com/gone": { status: 404 } });
    expect(await verifyListing("https://b.com/new", brand, deps)).toMatchObject({ status: "missing", link: null });
    expect(await verifyListing("https://b.com/gone", brand, deps)).toMatchObject({ status: "failed", note: "The page answered with HTTP 404." });
  });
});
