import { route } from "@/server/http/route";
import { log } from "@/server/log";

export const runtime = "nodejs";

/* Receives Content-Security-Policy violation reports while the policy is in report-only mode (§12.5).
   Browsers send these cross-site-free but without an Origin we can rely on, so this is a "webhook"-style endpoint:
   no cookies, no state change beyond a log line, small bodies only. */
async function handle(req: Request) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 20_000) return new Response(null, { status: 413 });
  const text = (await req.text().catch(() => "")).slice(0, 20_000);
  try {
    const body = JSON.parse(text);
    const r = body["csp-report"] ?? body?.[0]?.body ?? body;
    log("warn", "csp violation", { directive: r["violated-directive"] ?? r.effectiveDirective, blocked: String(r["blocked-uri"] ?? r.blockedURL ?? "").slice(0, 200), page: String(r["document-uri"] ?? r.documentURL ?? "").replace(/[?#].*$/, "").slice(0, 200) });
  } catch { /* ignore malformed reports */ }
  return new Response(null, { status: 204 });
}

export const POST = route({ auth: "public", originCheck: false, maxBytes: 20_000, rateLimit: { bucket: "csp", limit: 300, windowMs: 3_600_000 }, handler: async ({ req }) => handle(req) });
