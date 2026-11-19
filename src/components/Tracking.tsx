"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/* Page views only on Vercel's Hobby plan (custom events need Pro), and Speed Insights for real visitors' loading times
   (§15). Both run only once enabled in the Vercel project. The sites people check never leave the browser: check URLs
   are reduced to their route. */
function scrub<E extends { url: string }>(e: E): E {
  const u = new URL(e.url);
  u.search = "";
  u.hash = "";
  u.pathname = u.pathname.replace(/^\/app\/p\/[^/]+/, "/app/p/[id]");
  return { ...e, url: u.toString() };
}

export default function Tracking() {
  return (
    <>
      <Analytics beforeSend={scrub} />
      <SpeedInsights beforeSend={scrub} />
    </>
  );
}
