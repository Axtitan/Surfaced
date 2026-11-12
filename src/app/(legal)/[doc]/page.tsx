import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHead, SitePage } from "@/components/site/SiteChrome";
import { LEGAL, LEGAL_UPDATED, legalBySlug } from "@/content/legal";

// Only the legal slugs exist at the root; anything else is a 404.
export const dynamicParams = false;
export const generateStaticParams = () => LEGAL.map((d) => ({ doc: d.slug }));

type Props = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = legalBySlug((await params).doc);
  return d ? { title: d.title, description: d.description, alternates: { canonical: `/${d.slug}` } } : {};
}

export default async function LegalPage({ params }: Props) {
  const d = legalBySlug((await params).doc);
  if (!d) notFound();
  return (
    <SitePage>
      <PageHead eyebrow="Legal" title={d.title} lead={`Last updated ${LEGAL_UPDATED}.`} />
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Draft. This describes how Surfaced works today and will be reviewed before accounts or paid plans launch.
        </p>
      </div>
      <article className="prose-page mx-auto max-w-3xl px-5 pb-20 sm:px-8">{d.body}</article>
    </SitePage>
  );
}
