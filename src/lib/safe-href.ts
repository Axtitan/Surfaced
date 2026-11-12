/** Returns the URL only when it is http(s); anything else (javascript:, data:, relative junk) gives undefined.
    Every link built from data (AI answers, pasted text, the catalog, browser storage) must go through this. */
export function safeHref(raw: string | null | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t || t.length > 4000) return undefined;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Opens a data-derived link in a new tab with no link back to this page. Returns false when the URL was refused. */
export function openSafe(raw: string | null | undefined): boolean {
  const href = safeHref(raw);
  if (!href) return false;
  window.open(href, "_blank", "noopener,noreferrer");
  return true;
}

/** rel for every external link built from data. */
export const EXTERNAL_REL = "noopener noreferrer nofollow";
