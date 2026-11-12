"use client";

import dynamic from "next/dynamic";

/* A check lives in this browser's storage, so its page renders only in the browser. Loading it this way lets the view
   read storage while it initialises instead of in an effect after a server render. */
const ProjectView = dynamic(() => import("./ProjectView"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-8 sm:pt-12" aria-busy="true" aria-label="Loading the check">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-[#eceef1]" />
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-[#f4f5f7]" />
    </div>
  ),
});

export default function ProjectViewClient({ id }: { id: string }) {
  return <ProjectView key={id} id={id} />;
}
