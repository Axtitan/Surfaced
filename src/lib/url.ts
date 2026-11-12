/** Turns what a person typed ("example.com", "https://x.io/a") into a URL, or null. Safe in the browser; the
    network rules live in safe-fetch. */
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
