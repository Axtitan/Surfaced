import { ProviderError, type Source } from "./types";

/** Hostname without "www.", or "" if the URL can't be parsed. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Gemini returns Google redirect links whose title is the real site's domain. */
export function source(url: string, title?: string): Source {
  let domain = domainOf(url);
  if (/(^|\.)vertexaisearch\.cloud\.google\.com$/.test(domain) && title && /^[\w.-]+\.[a-z]{2,}$/i.test(title.trim())) {
    domain = title.trim().replace(/^www\./, "").toLowerCase();
  }
  return { url, title, domain };
}

export function dedupeSources(list: Source[]): Source[] {
  const seen = new Set<string>();
  return list.filter((s) => s.url && !seen.has(s.url) && (seen.add(s.url), true));
}

/** POST JSON with a timeout; retries 429 and 5xx with backoff, honouring Retry-After. */
export async function postJSON<T>(url: string, body: unknown, headers: Record<string, string>, label: string, timeoutMs = 120_000): Promise<T> {
  let lastErr: ProviderError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, Math.min(20_000, (lastErr?.status === 429 ? 4000 : 1500) * 2 ** (attempt - 1))));
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      lastErr = new ProviderError(`${label}: network error (${(e as Error).name})`, true);
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    const retryable = res.status === 429 || res.status >= 500;
    lastErr = new ProviderError(`${label}: HTTP ${res.status} ${detail}`, retryable, res.status);
    if (!retryable) break;
    const ra = Number(res.headers.get("retry-after"));
    if (ra > 0 && ra < 30) await new Promise((r) => setTimeout(r, ra * 1000));
  }
  throw lastErr ?? new ProviderError(`${label}: failed`);
}
