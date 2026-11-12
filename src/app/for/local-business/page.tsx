import type { Metadata } from "next";
import Link from "next/link";
import { CallToAction, PageHead, SitePage } from "@/components/site/SiteChrome";
import { JsonLd, breadcrumbLd } from "@/components/site/JsonLd";

export const metadata: Metadata = {
  title: "For local businesses",
  description: "When someone asks an AI for the best bakery, dentist or plumber near them, does it name you? Check for free, then get listed where the AIs look.",
  alternates: { canonical: "/for/local-business" },
};

export default function LocalBusiness() {
  return (
    <SitePage>
      <JsonLd data={breadcrumbLd([{ path: "/", name: "Home" }, { path: "/for/local-business", name: "For local businesses" }])} />
      <PageHead eyebrow="For local businesses" title="Does AI recommend my business to people nearby?"
        lead="Ask it. Surfaced writes the questions locals ask, like “best dentist in Leeds” or “who fixes boilers near me”, checks each AI answer for your name, and shows which listing and review sites the AIs relied on." />
      <article className="prose-page mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <h2>Why AI answers matter for local trade</h2>
        <p>More people ask an assistant instead of scrolling a map. When they do, the assistant usually summarises a handful of sources: map listings, review sites and local directories. If you&apos;re missing from those, or your details there are out of date, you&apos;re unlikely to be named.</p>
        <h2>What to check first</h2>
        <ul>
          <li><strong>Your map listings</strong> are claimed, with the right hours, phone number, area and category.</li>
          <li><strong>Review sites</strong> your trade uses have a profile for you with recent reviews.</li>
          <li><strong>Your website</strong> says plainly what you do and where, in text a crawler can read. Run the <Link href="/tools/ai-crawler-check">free AI crawler check</Link>.</li>
          <li><strong>Structured data</strong> tells machines your business type and service area. The <Link href="/tools/json-ld-generator">JSON-LD generator</Link> writes it for you.</li>
        </ul>
        <h2>How Surfaced helps</h2>
        <p>Enter your website and add your town or area. Surfaced writes local versions of the questions, you ask them in your own AI accounts for free, and it ranks the listing sites to fix first, starting with the ones the AIs cited.</p>
      </article>
      <CallToAction title="Check your business for free" />
    </SitePage>
  );
}
