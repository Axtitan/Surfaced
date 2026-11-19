import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, CallToAction, PageHead, SitePage } from "@/components/site/SiteChrome";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/site/JsonLd";
import { Answers, type Answer } from "@/components/site/Answers";
import { LlmsTxtTool } from "@/components/tools/Tools";
import { ToolLinks } from "@/components/tools/ToolLinks";

export const metadata: Metadata = {
  title: "llms.txt generator",
  description: "Write an llms.txt file for your website in a minute: a plain summary of what you do and your key pages, for AI assistants to read.",
  alternates: { canonical: "/tools/llms-txt-generator" },
};

const QA: Answer[] = [
  {
    q: "What is llms.txt?",
    a: "llms.txt is a proposed convention: a Markdown file at /llms.txt that tells AI tools, in plain words, what your site is and which pages matter. Think of it as a short brief for a machine reader.",
    more: <p>The proposal is at <a href="https://llmstxt.org" target="_blank" rel="noopener noreferrer nofollow">llmstxt.org</a>.</p>,
  },
  {
    q: "Does llms.txt make AIs recommend me?",
    a: "Not on its own, and support among AI companies is still uneven. It's cheap and harmless, and it makes your key facts easy to find for any tool that reads it.",
    more: <p>Being listed on the sites AIs already trust matters more.</p>,
  },
  {
    q: "How do I add llms.txt to my site?",
    a: "Download the file, check its links point at real pages, and upload it so it's served as plain text at yoursite.com/llms.txt. Then run the AI crawler check to confirm it's found.",
    more: (
      <ol>
        <li>Download the file and check the links point at real pages.</li>
        <li>Upload it so it&apos;s served at <code>https://yoursite.com/llms.txt</code> as plain text.</li>
        <li>Run the <Link href="/tools/ai-crawler-check">AI crawler check</Link> to confirm it&apos;s found.</li>
      </ol>
    ),
  },
];

export default function Page() {
  return (
    <SitePage>
      <JsonLd data={{ "@graph": [breadcrumbLd([{ path: "/", name: "Home" }, { path: "/tools/llms-txt-generator", name: "llms.txt generator" }]), faqLd(QA)] }} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "llms.txt generator" }]} />
      <PageHead eyebrow="Free tool" title="llms.txt generator"
        lead="Fill in a few facts about your business and get an llms.txt file to put at the root of your site. Nothing you type leaves your browser." />
      <section className="mx-auto max-w-4xl px-5 pb-12 sm:px-8"><LlmsTxtTool /></section>
      <article className="prose-page mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <Answers items={QA} />
      </article>
      <ToolLinks current="/tools/llms-txt-generator" />
      <CallToAction />
    </SitePage>
  );
}
