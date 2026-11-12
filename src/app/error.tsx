"use client";

import Link from "next/link";
import { useEffect } from "react";

/* Shown when a page fails to render. Says what happened and what to do, never internal details (§16.2). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main id="main" className="mx-auto max-w-2xl px-5 py-24 text-center sm:px-8">
      <h1 className="font-display text-4xl">Something went wrong</h1>
      <p className="mt-4 text-muted">This page hit an error. Your saved checks are safe in your browser.{error.digest ? ` Reference: ${error.digest}.` : ""}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
        <Link href="/" className="btn btn-ghost">Go to the home page</Link>
      </div>
    </main>
  );
}
