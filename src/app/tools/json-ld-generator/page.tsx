import type { Metadata } from "next";
import { Breadcrumbs, CallToAction, PageHead, SitePage } from "@/components/site/SiteChrome";
import { JsonLd, breadcrumbLd } from "@/components/site/JsonLd";
import { JsonLdTool } from "@/components/tools/Tools";
import { ToolLinks } from "@/components/tools/ToolLinks";

export const metadata: Metadata = {
  title: "JSON-LD generator for businesses and software",
  description: "Generate schema.org structured data (Organization, SoftwareApplication, LocalBusiness and more) for your homepage. Free, runs in your browser.",
  alternates: { canonical: "/tools/json-ld-generator" },
};

export default function Page() {
  return (
    <SitePage>
      <JsonLd data={breadcrumbLd([{ path: "/", name: "Home" }, { path: "/tools/json-ld-generator", name: "JSON-LD generator" }])} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "JSON-LD generator" }]} />
      <PageHead eyebrow="Free tool" title="JSON-LD generator"
        lead="Describe your business and get a structured-data snippet for your homepage. Nothing you type leaves your browser." />
      <section className="mx-auto max-w-4xl px-5 pb-12 sm:px-8"><JsonLdTool /></section>
      <article className="prose-page mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <h2>What is JSON-LD?</h2>
        <p>JSON-LD is a small block of data in your page&apos;s <code>&lt;head&gt;</code> that states facts in a format machines read reliably: your name, what kind of business you are, your website, where you operate and what you charge. It uses the shared <a href="https://schema.org" target="_blank" rel="noopener noreferrer nofollow">schema.org</a> vocabulary.</p>
        <h2>Which type should I pick?</h2>
        <ul>
          <li><strong>Software or web app</strong>: SoftwareApplication. <strong>Mobile app</strong>: MobileApplication.</li>
          <li><strong>Local business</strong>: LocalBusiness, with the area you serve.</li>
          <li><strong>Online shop</strong>: OnlineStore. <strong>Service business</strong>: ProfessionalService.</li>
        </ul>
        <p>Every snippet also includes an Organization entry, so your name and website are tied together.</p>
        <h2>Is the output safe to paste?</h2>
        <p>Yes. Any <code>&lt;</code> in your text is escaped, so a description can&apos;t break out of the script tag.</p>
      </article>
      <ToolLinks current="/tools/json-ld-generator" />
      <CallToAction />
    </SitePage>
  );
}
