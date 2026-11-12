import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, CallToAction, PageHead, SitePage } from "@/components/site/SiteChrome";
import { JsonLd, breadcrumbLd } from "@/components/site/JsonLd";
import { LlmsTxtTool } from "@/components/tools/Tools";
import { ToolLinks } from "@/components/tools/ToolLinks";

export const metadata: Metadata = {
  title: "llms.txt generator",
  description: "Write an llms.txt file for your website in a minute: a plain summary of what you do and your key pages, for AI assistants to read.",
  alternates: { canonical: "/tools/llms-txt-generator" },
};

export default function Page() {
  return (
    <SitePage>
      <JsonLd data={breadcrumbLd([{ path: "/", name: "Home" }, { path: "/tools/llms-txt-generator", name: "llms.txt generator" }])} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "llms.txt generator" }]} />
      <PageHead eyebrow="Free tool" title="llms.txt generator"
        lead="Fill in a few facts about your business and get an llms.txt file to put at the root of your site. Nothing you type leaves your browser." />
      <section className="mx-auto max-w-4xl px-5 pb-12 sm:px-8"><LlmsTxtTool /></section>
      <article className="prose-page mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <h2>What is llms.txt?</h2>
        <p>llms.txt is a proposed convention (see <a href="https://llmstxt.org" target="_blank" rel="noopener noreferrer nofollow">llmstxt.org</a>): a Markdown file at <code>/llms.txt</code> that tells AI tools, in plain words, what your site is and which pages matter. It&apos;s like a short brief for a machine reader.</p>
        <h2>Does it make AIs recommend me?</h2>
        <p>Not on its own, and support among AI companies is still uneven. It&apos;s cheap, harmless, and makes your key facts easy to find for any tool that does read it. Being listed on the sites AIs already trust matters more.</p>
        <h2>How do I add it?</h2>
        <ol>
          <li>Download the file and check the links point at real pages.</li>
          <li>Upload it so it&apos;s served at <code>https://yoursite.com/llms.txt</code> as plain text.</li>
          <li>Run the <Link href="/tools/ai-crawler-check">AI crawler check</Link> to confirm it&apos;s found.</li>
        </ol>
      </article>
      <ToolLinks current="/tools/llms-txt-generator" />
      <CallToAction />
    </SitePage>
  );
}
