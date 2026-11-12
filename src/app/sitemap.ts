import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/catalog";
import { LEGAL } from "@/content/legal";
import { SITE_URL } from "@/lib/site-url";

/* Marketing, tools, guide and legal pages only. Never /app, /api or share pages (§17.1). */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") =>
    ({ url: `${SITE_URL}${path}`, changeFrequency, priority });
  return [
    page("", 1, "weekly"),
    page("/how-it-works", 0.8),
    page("/pricing", 0.8),
    page("/for/agencies", 0.6),
    page("/for/local-business", 0.6),
    page("/tools/ai-crawler-check", 0.8),
    page("/tools/llms-txt-generator", 0.7),
    page("/tools/json-ld-generator", 0.7),
    page("/directories", 0.7, "weekly"),
    ...GUIDES.map((d) => page(`/directories/${d.slug}`, 0.5)),
    page("/changelog", 0.4, "weekly"),
    ...LEGAL.map((d) => page(`/${d.slug}`, 0.2, "yearly")),
  ];
}
