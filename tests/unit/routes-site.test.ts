import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryLimiter, setLimiter } from "@/server/http/rate-limit";
import { FetchRefused } from "@/lib/safe-fetch";

/* Route integration (§20) for the routes that read a website or report on the app: analyze, the free site check,
   providers, health and CSP reports. The site reader and profile builder are mocked; the AI providers are real, with no
   keys, so the providers route is tested as it would run. */

const inspectSite = vi.fn();
vi.mock("@/lib/site", async (orig) => ({ ...(await orig<typeof import("@/lib/site")>()), inspectSite: (...a: unknown[]) => inspectSite(...a) }));
const buildProfile = vi.fn();
vi.mock("@/lib/profile", () => ({ buildProfile: (...a: unknown[]) => buildProfile(...a) }));

const ORIGIN = "https://app.test";
const post = (path: string, body: unknown, headers: Record<string, string> = { origin: ORIGIN }) => {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(text)), ...headers },
    body: text,
  });
};
const get = (path: string) => new Request(`${ORIGIN}${path}`, { method: "GET" });

const page = { finalUrl: "https://acme.com/", domain: "acme.com", title: "Acme invoicing", siteName: "Acme", description: "", h1: "", lang: "en", text: "SECRET PAGE TEXT", jsonLdTypes: [], hasOg: false };
const checks = [{ id: "robots", label: "AI crawlers allowed", status: "pass", detail: "ok" }];
const logged = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.map((c) => String(c[0])).join("\n");

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  setLimiter(new MemoryLimiter());
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  inspectSite.mockReset(); buildProfile.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("POST /api/analyze", async () => {
  const { POST } = await import("@/app/api/analyze/route");

  it("reads the site, builds the profile and returns questions and checks", async () => {
    inspectSite.mockResolvedValue({ page, checks });
    buildProfile.mockResolvedValue({ name: "Acme", aliases: [], domain: "acme.com", category: "invoicing app", competitors: ["Rival"], prompts: ["What is the best invoicing app?"], by: "page" });
    const res = await POST(post("/api/analyze", { url: "acme.com", offer: "  invoicing  ", competitors: ["Rival"] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ profile: { name: "Acme", domain: "acme.com" }, prompts: ["What is the best invoicing app?"], checks, profiledBy: "page" });
    expect((inspectSite.mock.calls[0][0] as URL).href).toBe("https://acme.com/");
    expect(buildProfile.mock.calls[0][1]).toEqual({ offer: "invoicing", competitors: ["Rival"] });
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
  });

  it("refuses addresses that aren't websites before reading anything", async () => {
    const res = await POST(post("/api/analyze", { url: "javascript:alert(1)" }));
    expect(res.status).toBe(400);
    expect(inspectSite).not.toHaveBeenCalled();
  });

  it("passes on the fetcher's own refusal, and hides other errors", async () => {
    inspectSite.mockRejectedValueOnce(new FetchRefused("That address points to a private network."));
    const refused = await POST(post("/api/analyze", { url: "intranet.test" }));
    expect((await refused.json()).error.message).toBe("That address points to a private network.");
    inspectSite.mockRejectedValueOnce(new Error("ECONNRESET at 10.0.0.5:443 internal stack"));
    const failed = await POST(post("/api/analyze", { url: "acme.com" }));
    expect(failed.status).toBe(400);
    const body = await failed.text();
    expect(body).toMatch(/couldn't read that site/);
    expect(body).not.toMatch(/10\.0\.0\.5|ECONNRESET/);
  });

  it("says when the site was too slow", async () => {
    inspectSite.mockRejectedValue(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
    expect((await (await POST(post("/api/analyze", { url: "acme.com" }))).json()).error.message).toBe("The site took too long to answer.");
  });

  it("refuses unknown fields and cross-site requests", async () => {
    expect((await POST(post("/api/analyze", { url: "acme.com", admin: true }))).status).toBe(400);
    expect((await POST(post("/api/analyze", { url: "acme.com" }, { origin: "https://evil.test" }))).status).toBe(403);
    expect(inspectSite).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    inspectSite.mockResolvedValue({ page, checks });
    buildProfile.mockResolvedValue({ name: "Acme", aliases: [], domain: "acme.com", category: "", competitors: [], prompts: [], by: "page" });
    for (let i = 0; i < 20; i++) expect((await POST(post("/api/analyze", { url: "acme.com" }))).status).toBe(200);
    expect((await POST(post("/api/analyze", { url: "acme.com" }))).status).toBe(429);
  });
});

describe("POST /api/tools/site-check", async () => {
  const { POST } = await import("@/app/api/tools/site-check/route");

  it("returns parsed facts only, never the page text", async () => {
    inspectSite.mockResolvedValue({ page: { ...page, title: "T".repeat(500) }, checks });
    const res = await POST(post("/api/tools/site-check", { url: "https://acme.com" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Object.keys(data).sort()).toEqual(["checks", "domain", "title", "url"]);
    expect(data.title).toHaveLength(200);
    expect(JSON.stringify(data)).not.toContain("SECRET PAGE TEXT");
  });

  it("hides internal errors", async () => {
    inspectSite.mockRejectedValue(new Error("getaddrinfo ENOTFOUND internal.host"));
    const body = await (await POST(post("/api/tools/site-check", { url: "acme.com" }))).text();
    expect(body).not.toMatch(/ENOTFOUND|internal\.host/);
  });

  it("is rate limited at 10 an hour", async () => {
    inspectSite.mockResolvedValue({ page, checks });
    for (let i = 0; i < 10; i++) expect((await POST(post("/api/tools/site-check", { url: "acme.com" }))).status).toBe(200);
    expect((await POST(post("/api/tools/site-check", { url: "acme.com" }))).status).toBe(429);
  });
});

describe("GET /api/providers", async () => {
  const { GET } = await import("@/app/api/providers/route");

  it("lists the AIs without revealing keys", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-not-a-real-key");
    const res = await GET(get("/api/providers"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain("sk-test-not-a-real-key");
    const data = JSON.parse(text);
    expect(data.providers.map((p: { id: string }) => p.id).sort()).toEqual(["chatgpt", "claude", "deepseek", "gemini"]);
    expect(data.providers.find((p: { id: string }) => p.id === "chatgpt").connected).toBe(true);
  });

  it("shows no AI as connected in production until accounts exist, even with a key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-not-a-real-key");
    vi.stubEnv("NODE_ENV", "production");
    const data = await (await GET(get("/api/providers"))).json();
    expect(data.providers.every((p: { connected: boolean }) => !p.connected)).toBe(true);
    expect(data.demo).toBe(false);
  });

  it("honours the kill switch", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-not-a-real-key");
    vi.stubEnv("SURFACED_PAUSE_SCANS", "1");
    const data = await (await GET(get("/api/providers"))).json();
    expect(data.providers.every((p: { connected: boolean }) => !p.connected)).toBe(true);
  });
});

describe("GET /api/health", async () => {
  const { GET } = await import("@/app/api/health/route");

  it("answers ok and says nothing about configuration", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-not-a-real-key");
    const res = await GET(get("/api/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});

describe("POST /api/csp-report", async () => {
  const { POST } = await import("@/app/api/csp-report/route");
  const report = { "csp-report": { "violated-directive": "script-src", "blocked-uri": "https://evil.test/x.js", "document-uri": "https://app.test/app?token=abc#frag" } };

  it("accepts a browser report without an origin and logs it without the query string", async () => {
    const res = await POST(post("/api/csp-report", report, {}));
    expect(res.status).toBe(204);
    const out = logged(warn);
    expect(out).toMatch(/csp violation/);
    expect(out).toMatch(/script-src/);
    expect(out).toContain("https://app.test/app");
    expect(out).not.toMatch(/token=abc|frag/);
  });

  it("accepts the newer Reporting API shape", async () => {
    const res = await POST(post("/api/csp-report", [{ body: { effectiveDirective: "img-src", blockedURL: "data", documentURL: "https://app.test/" } }], {}));
    expect(res.status).toBe(204);
    expect(logged(warn)).toMatch(/img-src/);
  });

  it("ignores malformed reports and refuses large ones", async () => {
    expect((await POST(post("/api/csp-report", "{not json", {}))).status).toBe(204);
    expect((await POST(post("/api/csp-report", { pad: "x".repeat(25_000) }, {}))).status).toBe(413);
  });
});
