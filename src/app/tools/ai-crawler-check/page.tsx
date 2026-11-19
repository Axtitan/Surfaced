import type { Metadata } from "next";
import { Breadcrumbs, CallToAction, PageHead, SitePage } from "@/components/site/SiteChrome";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/site/JsonLd";
import { Answers, type Answer } from "@/components/site/Answers";
import { CrawlerCheckTool } from "@/components/tools/Tools";
import { ToolLinks } from "@/components/tools/ToolLinks";

export const metadata: Metadata = {
  title: "AI crawler check: can ChatGPT, Claude and Gemini read your site?",
  description: "Free check: does your robots.txt let GPTBot, ClaudeBot, Google-Extended and the other AI crawlers in? Plus llms.txt, sitemap, structured data and server-rendered text.",
  alternates: { canonical: "/tools/ai-crawler-check" },
};

const QA: Answer[] = [
  {
    q: "What does the AI crawler check test?",
    a: "It reads your robots.txt, homepage, llms.txt and sitemap, and tells you whether AI crawlers may fetch your site and whether they'll find text worth quoting. It covers the crawlers behind ChatGPT, Claude, Gemini, Perplexity and Common Crawl.",
    more: (
      <ul>
        <li><strong>robots.txt</strong>: whether rules block the AI crawlers: OAI-SearchBot and GPTBot (OpenAI), Claude-SearchBot and ClaudeBot (Anthropic), Google-Extended (Gemini), PerplexityBot and CCBot (Common Crawl).</li>
        <li><strong>Server-rendered text</strong>: whether your homepage has readable text in the HTML, not only after JavaScript runs.</li>
        <li><strong>Description and structured data</strong>: a meta description and JSON-LD that say what you are.</li>
        <li><strong>llms.txt and sitemap</strong>: files that point machines at your key pages.</li>
      </ul>
    ),
  },
  {
    q: "Why does it matter whether AI crawlers can read my site?",
    a: "An assistant that searches the web can only quote pages its crawler may fetch. If robots.txt blocks it, or your page is empty until scripts run, you're hard to recommend.",
    more: <p>Allowing the crawlers is the cheapest fix there is.</p>,
  },
  {
    q: "Should I block AI training crawlers like GPTBot?",
    a: "That's your choice, and it's separate from being recommended. Training crawlers such as GPTBot and ClaudeBot gather text for future models; search crawlers such as OAI-SearchBot and Claude-SearchBot fetch pages for live answers, so allow those if you want to be named.",
  },
  {
    q: "Is it safe to run on any site?",
    a: "Yes. It makes a handful of ordinary requests to public pages, the same as a visitor, and the results aren't stored.",
    more: <p>It&apos;s limited to a few checks an hour per visitor.</p>,
  },
];

export default function Page() {
  return (
    <SitePage>
      <JsonLd data={{ "@graph": [breadcrumbLd([{ path: "/", name: "Home" }, { path: "/tools/ai-crawler-check", name: "AI crawler check" }]), faqLd(QA)] }} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "AI crawler check" }]} />
      <PageHead eyebrow="Free tool" title="Can AI assistants read your website?"
        lead="Enter your address. We read your robots.txt, llms.txt, sitemap and homepage and tell you whether the AI crawlers are allowed in and whether they'll find text worth quoting." />
      <section className="mx-auto max-w-4xl px-5 pb-12 sm:px-8"><CrawlerCheckTool /></section>
      <article className="prose-page mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <Answers items={QA} />
      </article>
      <ToolLinks current="/tools/ai-crawler-check" />
      <CallToAction />
    </SitePage>
  );
}
