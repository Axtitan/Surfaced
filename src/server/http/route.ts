import "server-only";
import { z } from "zod";
import { AppError, errorResponse } from "./errors";
import { clientIp, getLimiter } from "./rate-limit";
import { log } from "../log";

/* Every API handler is built with route() so no step can be forgotten (ARCHITECTURE §8.1, §12.2):
   request id → size limit → origin check → auth → rate limit → validation → idempotency → handler → uniform response.
   A unit test fails if any file under app/api exports a handler that isn't built with it. */

export type AuthMode = "public" | "user" | "admin" | "webhook" | "job";

export type Ctx<B> = { req: Request; body: B; requestId: string; ip: string; signal: AbortSignal };

type Options<S extends z.ZodType | undefined> = {
  /** Required, no default. "user" and "admin" refuse every request until accounts exist. */
  auth: AuthMode;
  body?: S;
  rateLimit?: { bucket: string; limit: number; windowMs: number };
  /** Honour the Idempotency-Key header (JSON responses only). */
  idempotent?: boolean;
  maxBytes?: number;
  /** Only for endpoints that change nothing a cookie could authorise (CSP reports). Default true. */
  originCheck?: boolean;
  handler: (ctx: Ctx<S extends z.ZodType ? z.infer<S> : undefined>) => Promise<Response | unknown>;
};

export const ROUTE_MARK = Symbol.for("surfaced.route");
const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_MAX = 100_000;

/** Trim and NFC-normalise every string in a parsed body. */
export function normaliseInput(v: unknown): unknown {
  if (typeof v === "string") return v.normalize("NFC").trim();
  if (Array.isArray(v)) return v.map(normaliseInput);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normaliseInput(x)]));
  return v;
}

/** Same-origin check for state-changing requests (CSRF, §12.3). */
export function sameOrigin(req: Request): boolean {
  const own = new Set([new URL(req.url).origin]);
  if (process.env.NEXT_PUBLIC_SITE_URL) try { own.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin); } catch { /* ignore */ }
  const origin = req.headers.get("origin");
  if (origin) return own.has(origin);
  const site = req.headers.get("sec-fetch-site");
  return site === "same-origin";
}

async function readBody(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new AppError("payload_too_large", "That request is too large.");
  if (!req.body) return undefined;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new AppError("payload_too_large", "That request is too large."); }
    chunks.push(value);
  }
  if (!size) return undefined;
  const text = new TextDecoder().decode(Buffer.concat(chunks));
  try { return JSON.parse(text); } catch { throw new AppError("bad_request", "The request body isn't valid JSON."); }
}

// Idempotency results, per instance, for 24 h. Moves to the idempotency_keys table with the database (§6).
const idem = new Map<string, { hash: string; status: number; body: string; at: number }>();
const DAY = 86_400_000;
const hashOf = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h >>> 0) + ":" + s.length; };

export function route<S extends z.ZodType | undefined = undefined>(opts: Options<S>) {
  const handle = async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const t0 = Date.now();
    const path = new URL(req.url).pathname;
    let status = 500;
    try {
      if (STATE_CHANGING.has(req.method) && opts.auth !== "webhook" && opts.auth !== "job" && opts.originCheck !== false && !sameOrigin(req))
        throw new AppError("forbidden", "This request must come from the Surfaced site.");
      if (opts.auth === "user" || opts.auth === "admin") throw new AppError("unauthenticated", "Sign in to do this.");
      if (opts.auth === "webhook" || opts.auth === "job") throw new AppError("unauthenticated", "Not available.");

      // Bodies are read (with the size cap) only when the route declares a schema; otherwise the handler reads them.
      if (Number(req.headers.get("content-length") ?? 0) > (opts.maxBytes ?? DEFAULT_MAX)) throw new AppError("payload_too_large", "That request is too large.");
      const raw = STATE_CHANGING.has(req.method) && (opts.body || opts.idempotent) ? await readBody(req, opts.maxBytes ?? DEFAULT_MAX) : undefined;
      const ip = clientIp(req);
      if (opts.rateLimit) {
        const r = await getLimiter().hit(`${opts.rateLimit.bucket}:${ip}`, opts.rateLimit.limit, opts.rateLimit.windowMs);
        if (!r.ok) {
          const mins = Math.ceil(r.retryAfterSec / 60);
          status = 429;
          return errorResponse(new AppError("rate_limited", `Limit reached. Try again in ${mins} min.`), requestId, { "Retry-After": String(r.retryAfterSec) });
        }
      }

      let body: unknown = undefined;
      if (opts.body) {
        const parsed = (opts.body as z.ZodType).safeParse(normaliseInput(raw));
        if (!parsed.success) {
          const fields = parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path.join("."), message: i.message }));
          throw new AppError("invalid_input", "Some of the request is missing or invalid.", { fields });
        }
        body = parsed.data;
      }

      const key = opts.idempotent ? req.headers.get("idempotency-key") : null;
      const bodyHash = key ? hashOf(JSON.stringify(raw ?? null)) : "";
      if (key) {
        const prev = idem.get(`${path}:${key}`);
        if (prev && Date.now() - prev.at < DAY) {
          if (prev.hash !== bodyHash) throw new AppError("invalid_input", "This idempotency key was used with a different request.", undefined, 422);
          status = prev.status;
          return new Response(prev.body, { status: prev.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", "X-Request-Id": requestId, "Idempotent-Replayed": "true" } });
        }
      }

      const out = await opts.handler({ req, body: body as never, requestId, ip, signal: req.signal });
      const res = out instanceof Response ? out : Response.json(out);
      res.headers.set("X-Request-Id", requestId);
      if (!res.headers.has("Cache-Control")) res.headers.set("Cache-Control", "private, no-store");
      status = res.status;
      if (key && res.headers.get("content-type")?.includes("application/json")) {
        const text = await res.clone().text();
        idem.set(`${path}:${key}`, { hash: bodyHash, status: res.status, body: text, at: Date.now() });
        if (idem.size > 10_000) idem.clear();
      }
      return res;
    } catch (e) {
      if (e instanceof AppError) {
        status = e.status;
        if (e.status >= 500) log("error", "request failed", { requestId, path, error: e });
        return errorResponse(e, requestId);
      }
      status = 500;
      log("error", "unhandled error", { requestId, path, error: e });
      return errorResponse(new AppError("internal", "Something went wrong on our side. Try again."), requestId);
    } finally {
      log("info", "request", { requestId, method: req.method, path, status, ms: Date.now() - t0 });
    }
  };
  return Object.assign(handle, { [ROUTE_MARK]: opts.auth });
}
