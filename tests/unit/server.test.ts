import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { log, redact, redactText } from "@/server/log";
import { postJSON, sleep } from "@/lib/providers/util";
import { ProviderError } from "@/lib/providers/types";
import { CONFIG, estimateUsd } from "@/lib/providers/config";

describe("log redaction", () => {
  it("masks keys, bearer tokens, JWTs and emails in text", () => {
    const out = redactText("key sk-ant-abcdefghijklmnop Bearer abc.def.ghi123 eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij jane.doe@example.com AIzaSyA1234567890abcdefghijk"); // gitleaks:allow (fake values for the redaction test)
    expect(out).not.toMatch(/sk-ant|abc\.def|eyJhbGci|jane\.doe|AIzaSy/);
    expect(out).toContain("j***@example.com");
  });

  it("masks secret-named fields and errors, at any depth", () => {
    const out = redact({ headers: { Authorization: "x", cookie: "y" }, nested: [{ apiKey: "z" }], error: new Error("token sk-abcdefghijklmnopq") }) as Record<string, unknown>; // gitleaks:allow
    expect(JSON.stringify(out)).not.toMatch(/"x"|"y"|"z"|sk-abc/);
  });

  it("writes one JSON line per call", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("info", "hello", { password: "p" });
    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: "info", msg: "hello", password: "[redacted]" });
  });
});

describe("postJSON", () => {
  it("retries a 500 then returns the body", async () => {
    vi.useFakeTimers();
    const f = vi.fn()
      .mockResolvedValueOnce(new Response("down", { status: 500 }))
      .mockResolvedValueOnce(Response.json({ ok: 1 }));
    const p = postJSON<{ ok: number }>("https://x.test", {}, {}, "X", 1000, undefined, f);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ ok: 1 });
    expect(f).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("does not retry a 400 and reports it as unavailable", async () => {
    const f = vi.fn().mockResolvedValue(new Response("bad", { status: 400 }));
    await expect(postJSON("https://x.test", {}, {}, "X", 1000, undefined, f)).rejects.toMatchObject({ status: 400, retryable: false });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("stops at once when the caller aborts (F-30)", async () => {
    const ac = new AbortController();
    ac.abort();
    const f = vi.fn();
    await expect(postJSON("https://x.test", {}, {}, "X", 1000, ac.signal, f)).rejects.toMatchObject({ kind: "cancelled" });
    expect(f).not.toHaveBeenCalled();
  });

  it("sleep ends early on abort", async () => {
    const ac = new AbortController();
    const p = sleep(60_000, ac.signal);
    ac.abort();
    await expect(p).rejects.toBeInstanceOf(ProviderError);
  });
});

describe("cost estimate", () => {
  it("adds up the per-answer estimates", () => {
    expect(estimateUsd([{ provider: "claude" }, { provider: "deepseek" }])).toBeCloseTo(CONFIG.claude.estUsdPerAnswer + CONFIG.deepseek.estUsdPerAnswer);
  });
});

describe("API routes", () => {
  // Every handler under app/api must be built with route(), so no check can be forgotten (§8.1).
  const root = join(__dirname, "../../src/app/api");
  const files: string[] = [];
  const walk = (dir: string) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (f === "route.ts") files.push(p); } };
  walk(root);

  it("finds the route files", () => expect(files.length).toBeGreaterThanOrEqual(6));

  it.each(files.map((f) => [relative(root, f), f]))("%s exports only route() handlers", (_name, file) => {
    const src = readFileSync(file, "utf8");
    const methods = [...src.matchAll(/export\s+(?:const|async function|function)\s+(GET|POST|PUT|PATCH|DELETE)\b(\s*=\s*route\()?/g)];
    expect(methods.length).toBeGreaterThan(0);
    for (const m of methods) expect(m[2], `${m[1]} must be "export const ${m[1]} = route({...})"`).toBeTruthy();
  });
});
