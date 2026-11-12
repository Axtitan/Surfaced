"use client";

import Link from "next/link";
import { exportAll } from "@/lib/store";

/** Shown when the browser refuses to save (storage full or blocked), so work isn't lost silently (F-12). */
export default function StorageWarning() {
  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" }));
    a.download = `surfaced-checks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bad/30 bg-red-50 px-4 py-3 text-sm text-bad">
      <p><span className="font-semibold">Your latest changes weren&apos;t saved.</span> This browser&apos;s storage is full or blocked. Export your checks, then delete old ones.</p>
      <span className="flex gap-2">
        <button type="button" className="btn btn-ghost !py-1.5 !text-sm" onClick={download}>Export</button>
        <Link href="/app" className="btn btn-ghost !py-1.5 !text-sm">Delete old checks</Link>
      </span>
    </div>
  );
}
