import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/* Fetches a page the user named without letting them point us at our own network (SSRF):
   http(s) only, standard ports, every hop's host must resolve to public addresses only,
   redirects followed by hand and re-checked, small timeout and size cap. */

export class FetchRefused extends Error {}

function privateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}
function privateIp(ip: string) {
  if (isIP(ip) === 4) return privateV4(ip);
  const v = ip.toLowerCase();
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateV4(mapped[1]);
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff") || v.startsWith("64:ff9b") || v.startsWith("2001:db8");
}

async function assertPublic(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchRefused("Only http and https links are supported.");
  if (url.port && !["80", "443"].includes(url.port)) throw new FetchRefused("Only standard web ports are supported.");
  if (url.username || url.password) throw new FetchRefused("Links with a username or password are not supported.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw new FetchRefused("That address is not on the public internet.");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new FetchRefused(`Couldn't find ${host}. Check the address.`);
  if (addrs.some((a) => privateIp(a.address))) throw new FetchRefused("That address is not on the public internet.");
}

export type Fetched = { url: string; status: number; contentType: string; body: string };

export async function safeFetch(input: string, { maxBytes = 1_500_000, timeoutMs = 9000 } = {}): Promise<Fetched> {
  let url = new URL(input);
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SurfacedBot/0.1; AI visibility check)", Accept: "text/html,text/plain;q=0.9,*/*;q=0.5" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      await res.body?.cancel();
      continue;
    }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); break; }
      chunks.push(value);
    }
    const body = new TextDecoder().decode(Buffer.concat(chunks));
    return { url: url.toString(), status: res.status, contentType: res.headers.get("content-type") ?? "", body };
  }
  throw new FetchRefused("Too many redirects.");
}

/** Normalises what a user typed ("acme.com", "https://acme.com/pricing") to an https URL, or null. */
export function normaliseUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t || t.length > 2000) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`);
    return u.hostname.includes(".") ? u : null;
  } catch {
    return null;
  }
}
