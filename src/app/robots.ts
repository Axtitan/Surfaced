import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/* Marketing pages are open to everyone, including the AI crawlers we tell customers to allow (§17.1, §17.3).
   Preview and development deployments ask not to be indexed at all. */
const AI_CRAWLERS = ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "Claude-SearchBot", "Claude-User", "ClaudeBot", "Google-Extended", "PerplexityBot", "CCBot"];
const PRIVATE = ["/app", "/api", "/admin", "/r/"];

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
