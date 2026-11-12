import { BRAND, SITE_URL } from "@/lib/site-url";
import { PLAN_CARDS } from "@/lib/plans";

/** Structured data for our own pages (§17.1). The only place in the app allowed to set inner HTML: the data is ours,
    and "<" is escaped so no string in it can close the script tag (§12.4). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c");
  // eslint-disable-next-line react/no-danger -- escaped JSON-LD built from our own constants
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export const orgLd = () => ({
  "@type": "Organization", "@id": `${SITE_URL}/#org`, name: BRAND.name, url: SITE_URL, description: BRAND.oneLine,
});

export const appLd = () => ({
  "@type": "SoftwareApplication",
  name: BRAND.name,
  url: SITE_URL,
  description: BRAND.oneLine,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  publisher: { "@id": `${SITE_URL}/#org` },
  // Only plans that can actually be bought are offered (F-10).
  offers: PLAN_CARDS.filter((p) => p.available).map((p) => ({ "@type": "Offer", name: p.name, price: p.price.replace("$", ""), priceCurrency: "USD" })),
});

export const faqLd = (faq: { q: string; a: string }[]) => ({
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export const breadcrumbLd = (items: { path: string; name: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
});
