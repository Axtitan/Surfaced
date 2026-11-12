/* Per-IP limit kept in memory. Good enough for one server; swap for Redis/Postgres before scaling out. */
const hits = new Map<string, number[]>();

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim();
}

export function allow(bucket: string, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const k = `${bucket}:${key}`;
  const list = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    hits.set(k, list);
    return { ok: false, retryInMin: Math.ceil((windowMs - (now - list[0])) / 60000) };
  }
  list.push(now);
  hits.set(k, list);
  return { ok: true, retryInMin: 0 };
}
