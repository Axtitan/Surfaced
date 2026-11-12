#!/usr/bin/env node
/* Post-deploy smoke test (§20): `npm run smoke -- https://your-deployment.example`.
   Checks the pages and headers that matter, without calling any paid API or reading any third-party site. */

const base = (process.argv[2] || process.env.SMOKE_URL || "http://localhost:3100").replace(/\/$/, "");
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };

async function get(path, init) {
  const res = await fetch(base + path, { redirect: "manual", ...init });
  return { res, text: await res.text() };
}

const health = await get("/api/health");
check(health.res.status === 200 && health.text.includes('"ok":true'), "/api/health answers ok");

for (const path of ["/", "/pricing", "/how-it-works", "/tools/ai-crawler-check", "/directories", "/privacy", "/app", "/app/new"]) {
  const { res, text } = await get(path);
  check(res.status === 200 && /<h1[\s>]/.test(text), `${path} renders with a heading`);
}

const home = await get("/");
const h = home.res.headers;
check(!!h.get("content-security-policy") || !!h.get("content-security-policy-report-only"), "content security policy is set");
check(h.get("x-content-type-options") === "nosniff", "nosniff is set");
check(!!h.get("strict-transport-security") || base.startsWith("http://localhost"), "HSTS is set");
check(h.get("x-frame-options") === "DENY", "framing is denied");

const robots = await get("/robots.txt");
check(robots.res.status === 200 && /Disallow: \/(app|$)/m.test(robots.text), "robots.txt is served and keeps /app private");

const crossSite = await get("/api/plan", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}" });
check(crossSite.res.status === 403, "cross-site API posts are refused");

const bad = await get("/api/analyze", { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ url: "x", extra: 1 }) });
check(bad.res.status === 400 && bad.text.includes('"code":"invalid_input"'), "invalid input gets a uniform 400");

const providers = await get("/api/providers");
check(providers.res.status === 200 && providers.res.headers.get("cache-control")?.includes("no-store"), "API responses are not cached");

console.log(failed ? `\n${failed} check(s) failed against ${base}` : `\nAll checks passed against ${base}`);
process.exit(failed ? 1 : 0);
