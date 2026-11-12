import type { Metadata } from "next";
import { Suspense } from "react";
import NewCheck from "@/components/NewCheck";

export const metadata: Metadata = { title: "New check" };

/* NewCheck reads the query string, so it renders in the browser. Until then the server sends the same heading and
   intro, so the page is never blank. */
function Placeholder() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">New check</h1>
      <p className="mt-3 text-muted">Enter your website. We read it, work out what your buyers ask AI assistants, and set up the questions. Nothing is sent to the AIs until you say so.</p>
      <div className="card mt-8 h-48 animate-pulse" aria-hidden />
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<Placeholder />}><NewCheck /></Suspense>;
}
