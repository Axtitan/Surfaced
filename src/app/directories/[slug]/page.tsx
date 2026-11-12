import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, CallToAction, SitePage } from "@/components/site/SiteChrome";
import { JsonLd, breadcrumbLd } from "@/components/site/JsonLd";
import { GUIDES, TYPE_NAMES, guideBySlug } from "@/lib/catalog";
import { EXTERNAL_REL, safeHref } from "@/lib/safe-href";

export const dynamicParams = false;
export const generateStaticParams = () => GUIDES.map((d) => ({ slug: d.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = guideBySlug((await params).slug);
  if (!d) return {};
  return {
    title: `How to get listed on ${d.name}`,
    description: d.description.slice(0, 155),
    alternates: { canonical: `/directories/${d.slug}` },
  };
}

const TIPS: Record<string, string[]> = {
  directory: ["Use the same name and one-line description you use everywhere else; consistency helps AIs match you.", "Fill every optional field: categories, pricing, platforms, screenshots. Thin listings rank low on the site and get quoted less.", "Name the alternatives you compete with where the form allows it; comparison pages are what AIs read for “alternatives to” questions."],
  "product-launch-site": ["Prepare your launch copy and images before you submit; many sites feature you for one day only.", "Reply to every comment on launch day.", "Link the launch page from your own site afterwards."],
  marketplace: ["Read the eligibility rules first; marketplaces reject listings that don't fit.", "Keep your listing's facts identical to your website."],
  citation: ["Pitch a specific, checkable story or data point, not a general announcement.", "Make sure your site has a press or about page with plain facts a writer can quote."],
  community: ["Read the community rules and take part before you post about your own product.", "Answer questions with real help; promotion without context is usually removed."],
  newsletter: ["Send a short pitch with one clear reason it matters to that newsletter's readers.", "Include a link, a one-line description and an image."],
};

const PRICING = { free: "Free to submit", paid: "Paid", unknown: "Not known; check the site" } as Record<string, string>;
const LINK = { dofollow: "Followed (dofollow) link", nofollow: "Nofollow link", unknown: "Not known" } as Record<string, string>;

export default async function Guide({ params }: Props) {
  const d = guideBySlug((await params).slug);
  if (!d) notFound();
  const submit = safeHref(d.url);
  const site = safeHref(d.site);
  const rules = safeHref(d.rules);
  const related = GUIDES.filter((g) => g.type === d.type && g.slug !== d.slug).slice(0, 6);
  const typeName = TYPE_NAMES[d.type] ?? d.type;

  return (
    <SitePage>
      <JsonLd data={breadcrumbLd([{ path: "/", name: "Home" }, { path: "/directories", name: "Directories" }, { path: `/directories/${d.slug}`, name: d.name }])} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/directories", label: "Directories" }, { label: d.name }]} />
      <div className="mx-auto max-w-4xl px-5 pb-6 pt-10 sm:px-8">
        <p className="label">{typeName}</p>
        <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">How to get listed on {d.name}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{d.description}</p>
      </div>

      <section className="mx-auto max-w-4xl px-5 sm:px-8">
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm sm:grid-cols-2">
          <div className="bg-white p-4"><dt className="text-muted">Cost</dt><dd className="mt-1 font-medium">{PRICING[d.pricing] ?? d.pricing}{d.pricingNote ? <span className="mt-1 block font-normal text-muted">{d.pricingNote}</span> : null}</dd></div>
          <div className="bg-white p-4"><dt className="text-muted">Link from the listing</dt><dd className="mt-1 font-medium">{LINK[d.link] ?? d.link}</dd></div>
          {d.dr != null && <div className="bg-white p-4"><dt className="text-muted">Domain rating</dt><dd className="mt-1 font-medium">{d.dr} <span className="font-normal text-muted">(0–100; higher means more sites link to it)</span></dd></div>}
          {d.traffic != null && <div className="bg-white p-4"><dt className="text-muted">Estimated monthly visits</dt><dd className="mt-1 font-medium">{d.traffic.toLocaleString("en-US")}</dd></div>}
          {d.categories.length > 0 && <div className="bg-white p-4 sm:col-span-2"><dt className="text-muted">Good fit for</dt><dd className="mt-1 font-medium">{d.categories.join(", ")}</dd></div>}
        </dl>
      </section>

      <article className="prose-page mx-auto max-w-3xl px-5 py-12 sm:px-8">
        {d.eligibility && (<><h2>Who can list?</h2><p>{d.eligibility}</p></>)}
        <h2>How do I submit?</h2>
        <ol>
          <li>Prepare your listing: name, one-line and longer description, logo, screenshots, pricing and categories. Surfaced writes these for you as a listing kit.</li>
          <li>{submit ? <>Open the <a href={submit} target="_blank" rel={EXTERNAL_REL}>submission page</a>{rules ? <> and read the <a href={rules} target="_blank" rel={EXTERNAL_REL}>rules</a></> : null}.</> : "Find the submission page on the site."}</li>
          <li>Fill in the form, check every field, and submit. The Surfaced browser extension can fill the fields from your kit; you still review and press submit.</li>
          <li>Record it in your tracker and check back for approval.</li>
        </ol>
        <h2>Tips</h2>
        <ul>{(TIPS[d.type] ?? TIPS.directory).map((t) => <li key={t}>{t}</li>)}</ul>
        {site && <p className="text-sm text-muted">Website: <a href={site} target="_blank" rel={EXTERNAL_REL}>{new URL(site).hostname}</a>. Details come from the open Submitlist catalog and may have changed; check the site before paying for anything.</p>}
      </article>

      {related.length > 0 && (
        <nav aria-label={`More ${typeName.toLowerCase()}`} className="mx-auto max-w-4xl px-5 pb-12 sm:px-8">
          <h2 className="label">More {typeName.toLowerCase()}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {related.map((r) => <li key={r.slug}><Link href={`/directories/${r.slug}`} className="card block px-4 py-3 text-sm font-medium hover:border-ink/30">{r.name}</Link></li>)}
          </ul>
        </nav>
      )}
      <CallToAction title={`Is ${d.name} worth it for you?`} body="Run a free check to see which sites the AIs cite for your kind of business, ranked." />
    </SitePage>
  );
}
