import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryLimiter, setLimiter } from "@/server/http/rate-limit";

/* Route integration (§20): each API route called the way Next.js calls it, with the AI providers and the crawler
   mocked. These check the wiring: validation, limits, what reaches the provider or crawler, and what comes back. */

const ask = vi.fn();
const usable = vi.fn((_id: string) => true);
vi.mock("@/lib/providers", () => ({ ask: (...a: unknown[]) => ask(...a), usable: (id: string) => usable(id) }));

const checkCitedPages = vi.fn();
const verifyListing = vi.fn();
vi.mock("@/server/crawl", () => ({
  checkCitedPages: (...a: unknown[]) => checkCitedPages(...a),
  verifyListing: (...a: unknown[]) => verifyListing(...a),
}));

const ORIGIN = "https://app.test";
const post = (path: string, body: unknown) => {
  const text = JSON.stringify(body);
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", "content-length": String(Buffer.byteLength(text)) },
    body: text,
  });
};
const lines = async (res: Response) => (await res.text()).trim().split("\n").map((l) => JSON.parse(l));

beforeEach(() => {
  setLimiter(new MemoryLimiter());
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  ask.mockReset(); usable.mockReset(); usable.mockImplementation(() => true);
  checkCitedPages.mockReset(); verifyListing.mockReset();
});

const brand = { name: "Acme", aliases: [], domain: "acme.com", competitors: ["Rival"] };

describe("POST /api/scan", async () => {
  const { POST } = await import("@/app/api/scan/route");
  const scan = (over: Record<string, unknown> = {}) => POST(post("/api/scan", { brand, prompts: ["What is the best CRM?"], providers: ["chatgpt", "deepseek"], samples: 1, memory: false, ...over }));

  it("asks each AI, judges each answer and streams the runs", async () => {
    ask.mockImplementation(async (id: string) => ({
      text: id === "chatgpt" ? "1. **Rival**\n2. **Acme** is simple" : "Try Rival.",
      sources: [{ url: "https://g2.com/x", domain: "g2.com" }, { url: "https://acme.com/", domain: "acme.com" }], model: `${id}-test`,
    }));
    const res = await scan();
    expect(res.status).toBe(200);
    const out = await lines(res);
    expect(out[0]).toEqual({ type: "start", total: 2 });
    const runs = out.filter((l) => l.type === "run").map((l) => l.run);
    const gpt = runs.find((r) => r.provider === "chatgpt"), ds = runs.find((r) => r.provider === "deepseek");
    expect(gpt).toMatchObject({ ok: true, mode: "search", mentioned: true, rank: 2, cited: true, model: "chatgpt-test" });
    expect(ds).toMatchObject({ ok: true, mode: "memory", mentioned: false });
    expect(out.at(-1)).toMatchObject({ type: "done", answered: 2, failed: 0, stoppedBy: null });
    // DeepSeek has no web search, so it's asked in memory mode.
    expect(ask.mock.calls.map((c) => [c[0], c[2]]).sort()).toEqual([["chatgpt", "search"], ["deepseek", "memory"]]);
  });

  it("sends a safe message for a failed AI, never the provider's own error", async () => {
    ask.mockRejectedValue(new Error("upstream said: org-1234 key sk-secret quota"));
    const out = await lines(await scan({ providers: ["chatgpt"] }));
    const run = out.find((l) => l.type === "run").run;
    expect(run.ok).toBe(false);
    expect(JSON.stringify(run)).not.toMatch(/org-1234|sk-secret/);
    expect(out.at(-1)).toMatchObject({ type: "done", answered: 0, failed: 1 });
  });

  it("refuses when no chosen AI is connected", async () => {
    usable.mockReturnValue(false);
    const res = await scan();
    expect(res.status).toBe(400);
    expect(ask).not.toHaveBeenCalled();
  });

  it("refuses a scan over the answer limit before asking anyone", async () => {
    const prompts = Array.from({ length: 30 }, (_, i) => `What is the best CRM number ${i}?`);
    const res = await scan({ prompts, providers: ["chatgpt", "claude", "gemini"], samples: 1 });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toMatch(/limit is 80/);
    expect(ask).not.toHaveBeenCalled();
  });

  it("rejects AIs that have no API (paste-only)", async () => {
    expect((await scan({ providers: ["perplexity"] })).status).toBe(400);
  });
});

describe("POST /api/cited-pages", async () => {
  const { POST } = await import("@/app/api/cited-pages/route");
  const body = (urls: string[]) => ({ urls, brand: { name: "Acme", aliases: [], domain: "acme.com" }, competitors: ["Rival"] });

  it("canonicalises, de-duplicates and caps the pages at the Free limit", async () => {
    checkCitedPages.mockImplementation(async (urls: string[]) => urls.map((url) => ({ url, status: "checked" })));
    const urls = ["https://b.com/1?utm_source=x", "https://b.com/1", "https://b.com/2#top", ...Array.from({ length: 8 }, (_, i) => `https://c.com/${i}`)];
    const res = await POST(post("/api/cited-pages", body(urls)));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.limit).toBe(5);
    const sent = checkCitedPages.mock.calls[0][0] as string[];
    expect(sent).toEqual(["https://b.com/1", "https://b.com/2", "https://c.com/0", "https://c.com/1", "https://c.com/2"]);
    expect(checkCitedPages.mock.calls[0][3].deadline).toBeGreaterThan(Date.now());
  });

  it("refuses lists with no web addresses", async () => {
    const res = await POST(post("/api/cited-pages", body(["javascript:alert(1)", "ftp://x.com/file"])));
    expect(res.status).toBe(400);
    expect(checkCitedPages).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    checkCitedPages.mockResolvedValue([]);
    for (let i = 0; i < 6; i++) expect((await POST(post("/api/cited-pages", body(["https://b.com/"])))).status).toBe(200);
    expect((await POST(post("/api/cited-pages", body(["https://b.com/"])))).status).toBe(429);
  });
});

describe("POST /api/verify-listing", async () => {
  const { POST } = await import("@/app/api/verify-listing/route");
  const body = (slug: string, url: string) => ({ slug, url, brand: { name: "Acme", aliases: [], domain: "acme.com" } });

  it("reads a listing on the listing site", async () => {
    verifyListing.mockResolvedValue({ status: "live", checkedAt: 1, title: "Acme", link: "follow" });
    const res = await POST(post("/api/verify-listing", body("alternativeto", "https://alternativeto.net/software/acme/?utm_source=x")));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "live", link: "follow" });
    expect(verifyListing.mock.calls[0][0]).toBe("https://alternativeto.net/software/acme/");
  });

  it("refuses addresses off the listing site, and unknown listings", async () => {
    const off = await POST(post("/api/verify-listing", body("alternativeto", "https://evil.test/alternativeto.net")));
    expect(off.status).toBe(400);
    expect((await off.json()).error.message).toMatch(/alternativeto\.net/);
    expect((await POST(post("/api/verify-listing", body("no-such-listing", "https://x.com/")))).status).toBe(400);
    expect(verifyListing).not.toHaveBeenCalled();
  });
});

describe("POST /api/plan (golden ranking)", async () => {
  const { POST } = await import("@/app/api/plan/route");

  /* The top of the submission list for a fixed product. If this changes, the ranking changed: check the new order is
     intended (a catalog sync or a weight change), then update the snapshot with `npx vitest -u`. */
  it("ranks a software product's destinations the same way", async () => {
    const res = await POST(post("/api/plan", { kind: "software", categories: ["productivity", "business"], citedDomains: { "alternativeto.net": 3, "g2.com": 2, "reddit.com": 5 }, ai: false, category: "invoicing app" }));
    expect(res.status).toBe(200);
    const data = await res.json() as { destinations: { slug: string; citedByAI: number }[]; total: number };
    expect(data.destinations.slice(0, 15).map((d) => d.slug)).toMatchSnapshot();
    // Cited sites lead; a shared host (reddit.com) doesn't boost every subreddit.
    expect(data.destinations.slice(0, 2).map((d) => d.slug).sort()).toEqual(["alternativeto", "g2"]);
    expect(data.destinations.filter((d) => d.citedByAI > 0).every((d) => !d.slug.startsWith("r-"))).toBe(true);
  });

  it("ranks a local business differently", async () => {
    const res = await POST(post("/api/plan", { kind: "local-business", categories: ["local"], citedDomains: {}, category: "plumber" }));
    const data = await res.json() as { destinations: { slug: string }[] };
    expect(data.destinations.slice(0, 10).map((d) => d.slug)).toMatchSnapshot();
  });
});

describe("POST /api/estimate", async () => {
  const { POST } = await import("@/app/api/estimate/route");
  const body = (urls: string[]) => ({ urls, brand: { name: "Acme", aliases: [], domain: "acme.com" }, competitors: ["Rival"] });

  it("reads the evidence pages with the crawler, cleaned and capped, and asks no AI", async () => {
    checkCitedPages.mockImplementation(async (urls: string[]) => urls.map((url) => ({ url, status: "checked" })));
    const urls = ["https://b.com/1?utm_source=x", "https://b.com/1", "javascript:alert(1)", ...Array.from({ length: 40 }, (_, i) => `https://c.com/${i}`)];
    const res = await POST(post("/api/estimate", body(urls)));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.limit).toBe(20);
    expect(data.pages).toHaveLength(20);
    const sent = checkCitedPages.mock.calls[0][0] as string[];
    expect(sent[0]).toBe("https://b.com/1");
    expect(new Set(sent).size).toBe(20);
    expect(checkCitedPages.mock.calls[0][1]).toEqual({ name: "Acme", aliases: [], domain: "acme.com" });
    expect(ask).not.toHaveBeenCalled();
  });

  it("refuses bad input and unknown fields", async () => {
    expect((await POST(post("/api/estimate", body(["ftp://x.com/a"])))).status).toBe(400);
    expect((await POST(post("/api/estimate", { ...body(["https://b.com/"]), extra: 1 }))).status).toBe(400);
    expect((await POST(post("/api/estimate", body([])))).status).toBe(400);
    expect(checkCitedPages).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    checkCitedPages.mockResolvedValue([]);
    for (let i = 0; i < 6; i++) expect((await POST(post("/api/estimate", body(["https://b.com/"])))).status).toBe(200);
    expect((await POST(post("/api/estimate", body(["https://b.com/"])))).status).toBe(429);
  });
});
