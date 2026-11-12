import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import zlib from "node:zlib";
export { normaliseUrl } from "./url";

/* Fetches a page the user (or an AI answer) named without letting anyone point us at our own network (SSRF, §12.8):
   http(s) only, standard ports, no credentials; the host is resolved ONCE, every address must be public, and the
   connection goes to that exact address (so a second, different DNS answer cannot redirect it: DNS rebinding, F-04);
   redirects are followed by hand and re-checked; timeout; size cap applied after decompression; text types only. */

export class FetchRefused extends Error {}

function privateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}
export function privateIp(ip: string) {
  if (isIP(ip) === 4) return privateV4(ip);
  const v = ip.toLowerCase();
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateV4(mapped[1]);
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff") || v.startsWith("64:ff9b") || v.startsWith("2001:db8") || v.startsWith("::ffff:");
}

export type Address = { address: string; family: number };
export type Resolver = (host: string) => Promise<Address[]>;
const systemResolver: Resolver = (host) => lookup(host, { all: true, verbatim: true });

/** Checks the URL and resolves its host once. Returns the address to connect to. */
export async function checkTarget(url: URL, resolve: Resolver = systemResolver): Promise<Address> {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchRefused("Only http and https links are supported.");
  if (url.port && !["80", "443"].includes(url.port)) throw new FetchRefused("Only standard web ports are supported.");
  if (url.username || url.password) throw new FetchRefused("Links with a username or password are not supported.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw new FetchRefused("That address is not on the public internet.");
  const addrs = isIP(host) ? [{ address: host, family: isIP(host) }] : await resolve(host).catch(() => []);
  if (!addrs.length) throw new FetchRefused(`Couldn't find ${host}. Check the address.`);
  if (addrs.some((a) => privateIp(a.address))) throw new FetchRefused("That address is not on the public internet.");
  return addrs[0];
}

type Raw = { status: number; location: string | null; contentType: string; body: Buffer };
export type Transport = (url: URL, address: Address, opts: { maxBytes: number; timeoutMs: number }) => Promise<Raw>;

const TEXTUAL = /^(text\/|application\/(xhtml\+xml|xml|json|ld\+json|rss\+xml|atom\+xml)|$)/i;

/** One HTTP request to a fixed address, keeping the hostname for TLS (SNI, certificate) and the Host header. */
export const nodeTransport: Transport = (url, address, { maxBytes, timeoutMs }) => new Promise<Raw>((resolve, reject) => {
  const mod = url.protocol === "https:" ? https : http;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const req = mod.request(url, {
    method: "GET",
    signal: AbortSignal.timeout(timeoutMs),
    // Pin the connection to the address we already checked.
    lookup: ((_h: string, opts: { all?: boolean }, cb: (...args: unknown[]) => void) =>
      opts?.all ? cb(null, [address]) : cb(null, address.address, address.family)) as never,
    servername: isIP(host) ? undefined : host,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SurfacedBot/0.2; +https://github.com/Axtitan/Surfaced)",
      Accept: "text/html,text/plain;q=0.9,*/*;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
    },
  }, (res) => {
    const status = res.statusCode ?? 0;
    const location = typeof res.headers.location === "string" ? res.headers.location : null;
    const contentType = String(res.headers["content-type"] ?? "");
    if ((status >= 300 && status < 400 && location) || !TEXTUAL.test(contentType.split(";")[0].trim())) {
      res.resume();
      return resolve({ status, location, contentType, body: Buffer.alloc(0) });
    }
    const enc = String(res.headers["content-encoding"] ?? "").toLowerCase();
    const stream = enc === "gzip" ? res.pipe(zlib.createGunzip()) : enc === "deflate" ? res.pipe(zlib.createInflate()) : enc === "br" ? res.pipe(zlib.createBrotliDecompress()) : res;
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve({ status, location, contentType, body: Buffer.concat(chunks) }); } };
    stream.on("data", (c: Buffer) => {
      size += c.length;
      if (size > maxBytes) { chunks.push(c.subarray(0, Math.max(0, c.length - (size - maxBytes)))); finish(); res.destroy(); return; }
      chunks.push(c);
    });
    stream.on("end", finish);
    stream.on("error", (e) => (done ? undefined : (size ? finish() : reject(e))));
  });
  req.on("error", reject);
  req.end();
});

export type Fetched = { url: string; status: number; contentType: string; body: string };

export async function safeFetch(input: string, { maxBytes = 1_500_000, timeoutMs = 9000, resolve = systemResolver, transport = nodeTransport }: { maxBytes?: number; timeoutMs?: number; resolve?: Resolver; transport?: Transport } = {}): Promise<Fetched> {
  let url = new URL(input);
  for (let hop = 0; hop < 6; hop++) {
    const address = await checkTarget(url, resolve);
    const res = await transport(url, address, { maxBytes, timeoutMs });
    if (res.status >= 300 && res.status < 400 && res.location) {
      url = new URL(res.location, url);
      continue;
    }
    return { url: url.toString(), status: res.status, contentType: res.contentType, body: new TextDecoder().decode(res.body) };
  }
  throw new FetchRefused("Too many redirects.");
}

