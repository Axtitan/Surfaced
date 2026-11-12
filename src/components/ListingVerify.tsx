"use client";

import { useId, useState } from "react";
import { EXTERNAL_REL, safeHref } from "@/lib/safe-href";
import type { LinkKind, ListingCheck, Profile } from "@/lib/types";

/* On-demand listing verification (ARCHITECTURE §9.21): the user pastes the address of a listing they believe is live,
   and Surfaced reads that one page to confirm it names them and to say how it links to their site. */

export type LiveEntry = { url: string; check?: ListingCheck };

const LINK_NOTE: Record<LinkKind, string> = {
  follow: "Links to your site",
  nofollow: "Links to your site (nofollow)",
  ugc: "Links to your site (marked user content)",
  sponsored: "Links to your site (marked sponsored)",
};

export function checkLabel(c: ListingCheck): { text: string; tone: "good" | "bad" | "warn" } {
  if (c.status === "live") return { text: c.link ? `Live · ${LINK_NOTE[c.link]}` : "Live · no link to your site", tone: "good" };
  if (c.status === "missing") return { text: "Doesn't name you yet", tone: "bad" };
  return { text: c.status === "blocked" ? "Can't check this site" : "Couldn't read the page", tone: "warn" };
}

export default function ListingVerify({ slug, name, profile, entry, onEntry, onLive }: {
  slug: string; name: string; profile: Profile; entry?: LiveEntry;
  onEntry: (e: LiveEntry) => void;
  /** Called when the check finds the listing live, so the tracker can say so. */
  onLive: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(entry?.url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const check = entry?.check;
  const label = check ? checkLabel(check) : null;
  const tone = label?.tone === "good" ? "!bg-emerald-50 !text-good" : label?.tone === "bad" ? "!bg-red-50 !text-bad" : "!bg-amber-50 !text-warn";

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/verify-listing", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, url: url.trim(), brand: { name: profile.name, aliases: profile.aliases.slice(0, 10), domain: profile.domain } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "Something went wrong. Try again.");
      const c = data as ListingCheck;
      onEntry({ url: url.trim(), check: c });
      if (c.status === "live") onLive();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {label && check && (
          <span className={`chip ${tone}`} title={`Checked ${new Date(check.checkedAt).toLocaleString()}`}>{label.text}</span>
        )}
        <button type="button" className="text-xs font-medium underline" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          {open ? "Hide" : check ? "Check again" : "Verify the listing"}
        </button>
        {entry?.url && safeHref(entry.url) && <a className="text-xs text-muted underline" href={safeHref(entry.url)} target="_blank" rel={EXTERNAL_REL}>View listing</a>}
      </div>
      {open && (
        <form id={id} className="mt-2 flex flex-col gap-2 sm:flex-row" onSubmit={verify}>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Address of your listing on {name}</span>
            <input className="field !py-1.5 !text-sm" type="url" inputMode="url" required placeholder={`Your listing's address on ${name}`} value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-ghost shrink-0 !py-1.5 !text-sm" disabled={busy || !url.trim()}>{busy ? "Checking…" : "Check"}</button>
        </form>
      )}
      <div aria-live="polite">
        {error && <p className="mt-1 text-xs text-bad" role="alert">{error}</p>}
        {open && check?.note && !error && <p className="mt-1 text-xs text-muted">{check.note}</p>}
      </div>
    </div>
  );
}
