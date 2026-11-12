"use client";

import { Analytics } from "@vercel/analytics/next";

/* Page views only on Vercel's Hobby plan (custom events need Pro).
   The sites people check never leave the browser: check URLs are reduced to their route. */
export default function Tracking() {
  return (
    <Analytics
      beforeSend={(e) => {
        const u = new URL(e.url);
        u.search = "";
        u.hash = "";
        u.pathname = u.pathname.replace(/^\/app\/p\/[^/]+/, "/app/p/[id]");
        return { ...e, url: u.toString() };
      }}
    />
  );
}
