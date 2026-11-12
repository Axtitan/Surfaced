import type { Metadata } from "next";
import Link from "next/link";
import { CallToAction, PageHead, SitePage } from "@/components/site/SiteChrome";
import { JsonLd, breadcrumbLd } from "@/components/site/JsonLd";
import { CATALOG_COUNT, GUIDES, TYPE_NAMES, formatCount, typeCounts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Where to list your business: directory and launch-site guides",
  description: `Guides to the directories, launch sites, marketplaces and press sites worth submitting to, from a catalog of ${formatCount(CATALOG_COUNT)} places.`,
  alternates: { canonical: "/directories" },
};

const ORDER = ["directory", "product-launch-site", "marketplace", "citation", "community", "newsletter"];

export default function Directories() {
  const counts = typeCounts();
  const groups = ORDER.map((t) => ({ type: t, items: GUIDES.filter((g) => g.type === t) })).filter((g) => g.items.length);
  return (
    <SitePage>
      <JsonLd data={breadcrumbLd([{ path: "/", name: "Home" }, { path: "/directories", name: "Directories" }])} />
      <PageHead eyebrow="Directory guides" title="Where should I list my business so AI finds it?"
        lead={`Start with the sites AI assistants already quote for your kind of business. Below are guides to the ${GUIDES.length} places in our catalog with enough detail to write about; the full catalog has ${formatCount(CATALOG_COUNT)}.`} />

      <section className="mx-auto max-w-4xl px-5 pb-6 sm:px-8">
        <h2 className="label">The full catalog</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
            <li key={t} className="rounded-full border border-line px-3 py-1.5">{TYPE_NAMES[t] ?? t}: {formatCount(n)}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Subreddits and GitHub lists are ranked for you inside the app, with each one&apos;s posting rules.</p>
      </section>

      {groups.map((g) => (
        <section key={g.type} className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
          <h2 className="font-display text-2xl">{TYPE_NAMES[g.type] ?? g.type}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {g.items.map((d) => (
              <li key={d.slug}>
                <Link href={`/directories/${d.slug}`} className="card flex items-center justify-between gap-3 px-4 py-3 text-sm hover:border-ink/30">
                  <span className="min-w-0 truncate font-medium">{d.name}</span>
                  <span className="shrink-0 text-xs text-muted">{d.pricing === "free" ? "Free" : d.pricing === "paid" ? "Paid" : "Price varies"}{d.dr != null ? ` · DR ${d.dr}` : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <CallToAction title="Which of these do AIs cite for you?" body="Run a free check and get this list ranked for your business, starting with the sites the AIs quoted." />
    </SitePage>
  );
}
