import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ROUTE_MARK, normaliseInput, route, sameOrigin } from "@/server/http/route";
import { MemoryLimiter, clientIp, setLimiter } from "@/server/http/rate-limit";

const ORIGIN = "https://app.test";
const post = (body: unknown, headers: Record<string, string> = {}) => {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Request(`${ORIGIN}/api/thing`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", "content-length": String(Buffer.byteLength(text)), ...headers },
    body: text,
  });
};
const errorOf = async (res: Response) => ((await res.json()) as { error: { code: string; message: string; requestId: string } }).error;

beforeEach(() => {
  setLimiter(new MemoryLimiter());
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

describe("route()", () => {
  const echo = route({ auth: "public", body: z.object({ name: z.string().min(1).max(20) }).strict(), handler: async ({ body }) => ({ hi: body.name }) });

  it("marks the handler with its auth mode", () => {
    expect((echo as unknown as Record<symbol, string>)[ROUTE_MARK]).toBe("public");
  });

  it("validates, trims and NFC-normalises input, and answers with no-store and a request id", async () => {
    const res = await echo(post({ name: "  Café  " }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hi: "Café" });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-request-id")).toMatch(/[0-9a-f-]{36}/);
  });

  it("refuses unknown fields and bad values with a uniform error", async () => {
    const res = await echo(post({ name: "a", admin: true }));
    expect(res.status).toBe(400);
    const e = await errorOf(res);
    expect(e.code).toBe("invalid_input");
    expect(e.requestId).toBeTruthy();
  });

  it("refuses cross-site posts", async () => {
    const res = await echo(post({ name: "a" }, { origin: "https://evil.test" }));
    expect(res.status).toBe(403);
    expect((await errorOf(res)).code).toBe("forbidden");
  });

  it("accepts same-origin requests that only send Sec-Fetch-Site", () => {
    const req = new Request(`${ORIGIN}/x`, { method: "POST", headers: { "sec-fetch-site": "same-origin" } });
    expect(sameOrigin(req)).toBe(true);
    expect(sameOrigin(new Request(`${ORIGIN}/x`, { method: "POST" }))).toBe(false);
  });

  it("refuses oversized bodies with 413 before reading them", async () => {
    const small = route({ auth: "public", maxBytes: 50, body: z.object({ name: z.string() }), handler: async () => ({}) });
    const res = await small(post({ name: "x".repeat(200) }));
    expect(res.status).toBe(413);
  });

  it("refuses bodies that aren't JSON", async () => {
    const res = await echo(post("{not json"));
    expect((await errorOf(res)).code).toBe("bad_request");
  });

  it("rate limits per bucket and says when to come back", async () => {
    const limited = route({ auth: "public", rateLimit: { bucket: "t", limit: 2, windowMs: 60_000 }, handler: async () => ({ ok: true }) });
    const get = () => limited(new Request(`${ORIGIN}/api/t`));
    expect((await get()).status).toBe(200);
    expect((await get()).status).toBe(200);
    const third = await get();
    expect(third.status).toBe(429);
    expect(Number(third.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("refuses user and admin routes until accounts exist", async () => {
    const admin = route({ auth: "admin", handler: async () => ({ secret: 1 }) });
    const res = await admin(new Request(`${ORIGIN}/api/admin`));
    expect(res.status).toBe(401);
  });

  it("hides internal errors", async () => {
    const boom = route({ auth: "public", handler: async () => { throw new Error("db password is hunter2"); } });
    const res = await boom(new Request(`${ORIGIN}/api/boom`));
    expect(res.status).toBe(500);
    const e = await errorOf(res);
    expect(e.code).toBe("internal");
    expect(e.message).not.toContain("hunter2");
  });

  it("replays an idempotent request and refuses the same key with a different body", async () => {
    let calls = 0;
    const create = route({ auth: "public", idempotent: true, body: z.object({ n: z.number() }), handler: async ({ body }) => ({ n: body.n, call: ++calls }) });
    const key = { "idempotency-key": "k-" + Math.random() };
    const a = await create(post({ n: 1 }, key));
    const b = await create(post({ n: 1 }, key));
    expect(await a.json()).toEqual({ n: 1, call: 1 });
    expect(await b.json()).toEqual({ n: 1, call: 1 });
    expect(b.headers.get("idempotent-replayed")).toBe("true");
    expect((await create(post({ n: 2 }, key))).status).toBe(422);
  });
});

describe("normaliseInput", () => {
  it("normalises nested strings and leaves other values alone", () => {
    expect(normaliseInput({ a: [" x "], b: 1, c: null })).toEqual({ a: ["x"], b: 1, c: null });
  });
});

describe("clientIp", () => {
  const req = new Request("https://x.test", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8", "x-vercel-forwarded-for": "9.9.9.9" } });
  it("ignores forwarded headers unless a trusted proxy sets them", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUST_PROXY", "");
    expect(clientIp(req)).toBe("local");
  });
  it("uses the platform header on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    expect(clientIp(req)).toBe("9.9.9.9");
  });
  it("uses the first forwarded address behind a trusted proxy", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUST_PROXY", "1");
    expect(clientIp(req)).toBe("1.2.3.4");
  });
});
