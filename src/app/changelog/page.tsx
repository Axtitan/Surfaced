import type { Metadata } from "next";
import { PageHead, SitePage } from "@/components/site/SiteChrome";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What's new in Surfaced.",
  alternates: { canonical: "/changelog" },
};

const ENTRIES = [
  { date: "2026-11-12", title: "Cited pages, an overview and PDF reports", items: [
    "Cited pages: see which pages the AIs cite, which of them name you, and which name your competitors. Submit or pitch the ones you're missing from.",
    "Overview tab: your score with its likely range, where you're named, and what to do next.",
    "Check your listings: paste the address of a live listing and Surfaced confirms it names you and how it links to your site.",
    "Save any tab of a check as a PDF.",
    "Paste answers from Perplexity, Copilot and Google's AI Mode too (optional).",
    "Each check has its own settings: export it or delete it.",
    "SurfacedBot, the reader behind cited pages and listing checks, follows robots.txt. See /bot.",
  ] },
  { date: "2026-11-12", title: "Free tools, guides and a safer app", items: [
    "Three free tools: AI crawler check, llms.txt generator and JSON-LD generator.",
    "Guides to the directories, launch sites and marketplaces worth submitting to.",
    "Competitor share of voice: how often each name appears across all answers.",
    "Stopping a check now stops it everywhere, and a check that ends early says so.",
    "Editing a question asks whether to keep its answers; re-reading your site keeps your questions unless you choose to replace them.",
    "Unsent pasted answers are kept per question when you switch tabs.",
    "Brand matching handles accents and languages written without spaces.",
    "Browser extension: capture an answer from ChatGPT, Claude, Gemini or DeepSeek and send it to Surfaced.",
    "Delete all data in this browser from Settings.",
    "Pricing page, how-it-works page and draft legal pages.",
  ] },
  { date: "2026-11-12", title: "Surfaced launches with free mode", items: [
    "Check whether ChatGPT, Claude, Gemini and DeepSeek name your business, using your own AI accounts.",
    "A score you can check, with the sentence that named you and who was named instead.",
    "A ranked list of places to submit, a listing kit, and a form-filling browser extension.",
  ] },
];

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function Changelog() {
  return (
    <SitePage>
      <PageHead eyebrow="Changelog" title="What's new" />
      <div className="mx-auto max-w-3xl space-y-12 px-5 pb-20 sm:px-8">
        {ENTRIES.map((e, i) => (
          <section key={i} aria-labelledby={`cl-${i}`} className="border-t border-line pt-6">
            <time dateTime={e.date} className="text-sm text-muted">{fmt(e.date)}</time>
            <h2 id={`cl-${i}`} className="mt-1 text-xl font-semibold">{e.title}</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">{e.items.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
        ))}
      </div>
    </SitePage>
  );
}
