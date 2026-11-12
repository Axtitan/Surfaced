import "server-only";

/* Sliding-window limits behind one interface. The memory store only holds per server instance, so on Vercel it is a
   speed bump, not a limit (F-02). Swap in Upstash (`@upstash/ratelimit`) by implementing Limiter; nothing else changes. */

export type LimitResult = { ok: boolean; retryAfterSec: number };
export interface Limiter {
  hit(key: string, limit: number, windowMs: number): Promise<LimitResult>;
}

export class MemoryLimiter implements Limiter {
  private hits = new Map<string, number[]>();
  async hit(key: string, limit: number, windowMs: number): Promise<LimitResult> {
    const now = Date.now();
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length >= limit) {
      this.hits.set(key, list);
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - list[0])) / 1000)) };
    }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 50_000) this.hits.clear(); // bound memory under a flood
    return { ok: true, retryAfterSec: 0 };
  }
}

let limiter: Limiter = new MemoryLimiter();
export const getLimiter = () => limiter;
/** For tests, and for plugging in a shared store. */
export const setLimiter = (l: Limiter) => { limiter = l; };

/**
 * The client's address, from a header only the platform can set. On Vercel the edge overwrites `x-forwarded-for`
 * and adds `x-vercel-forwarded-for`, so callers cannot forge them. Elsewhere the header is only trusted when
 * TRUST_PROXY=1 says a proxy we control sets it; otherwise every caller shares one bucket.
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  if (process.env.VERCEL) return (h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (process.env.TRUST_PROXY === "1") return (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || "unknown";
  return "local";
}
