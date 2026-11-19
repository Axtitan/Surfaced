import type { Metadata } from "next";
import { Breadcrumbs, CallToAction, PageHead, SitePage } from "@/components/site/SiteChrome";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/site/JsonLd";
import { Answers, type Answer } from "@/components/site/Answers";
import { JsonLdTool } from "@/components/tools/Tools";
import { ToolLinks } from "@/components/tools/ToolLinks";

export const metadata: Metadata = {
  title: "JSON-LD generator for businesses and software",
  description: "Generate schema.org structured data (Organization, SoftwareApplication, LocalBusiness and more) for your homepage. Free, runs in your browser.",
  alternates: { canonical: "/tools/json-ld-generator" },
};

const QA: Answer[] = [
  {
    q: "What is JSON-LD?",
    a: "JSON-LD is a small block of data in your page's head that states facts in a form machines read reliably: your name, what kind of business you are, your website and what you charge. It uses the shared schema.org vocabulary.",
    more: <p>The vocabulary is documented at <a href="https://schema.org" target="_blank" rel="noopener noreferrer nofollow">schema.org</a>.</p>,
  },
  {
    q: "Which schema.org type should my business use?",
    a: "Use SoftwareApplication for software, MobileApplication for a mobile app, LocalBusiness for a local business, OnlineStore for a shop and ProfessionalService for a service business. Every snippet also includes an Organization entry, so your name and website are tied together.",
  },
  {
    q: "Does structured data help AI assistants recommend me?",
    a: "It makes your key facts unambiguous to any system that reads it, including the search engines many assistants draw on. It won't get you recommended on its own: being listed on the sites AIs trust matters more.",
  },
  {
    q: "Is the JSON-LD output safe to paste into my page?",
    a: "Yes. Any < in your text is escaped, so a description can't break out of the script tag.",
  },
];

export default function Page() {
  return (
    <SitePage>
      <JsonLd data={{ "@graph": [breadcrumbLd([{ path: "/", name: "Home" }, { path: "/tools/json-ld-generator", name: "JSON-LD generator" }]), faqLd(QA)] }} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "JSON-LD generator" }]} />
      <PageHead eyebrow="Free tool" title="JSON-LD generator"
        lead="Describe your business and get a structured-data snippet for your homepage. Nothing you type leaves your browser." />
      <section className="mx-auto max-w-4xl px-5 pb-12 sm:px-8"><JsonLdTool /></section>
      <article className="prose-page mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <Answers items={QA} />
      </article>
      <ToolLinks current="/tools/json-ld-generator" />
      <CallToAction />
    </SitePage>
  );
}
