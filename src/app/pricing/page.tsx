import type { Metadata } from "next";
import Link from "next/link";
import { CallToAction, PageHead, SitePage } from "@/components/site/SiteChrome";
import { PlanGrid } from "@/components/site/PlanGrid";
import { JsonLd, appLd, breadcrumbLd } from "@/components/site/JsonLd";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Surfaced is free in paste-in mode. Planned paid plans add automatic weekly checks, more sites and agency features.",
  alternates: { canonical: "/pricing" },
};

const yes = "✓", no = "–";
const ROWS: [string, (id: keyof typeof PLANS) => string][] = [
  ["Sites", (id) => String(PLANS[id].sites)],
  ["Questions per site", (id) => String(PLANS[id].prompts)],
  ["Automatic checks per month", (id) => (PLANS[id].autoScansPerMonth ? String(PLANS[id].autoScansPerMonth) : "Paste-in only")],
  ["Places to submit shown", (id) => (PLANS[id].destinationsShown == null ? "All" : "All, for now")],
  ["Cited-page gaps", (id) => (PLANS[id].citations ? yes : no)],
  ["Listing verification", (id) => (PLANS[id].verify ? yes : no)],
  ["White-label reports", (id) => (PLANS[id].whiteLabel ? yes : no)],
  ["Seats", (id) => String(PLANS[id].seats)],
];
const COLS = ["free", "starter", "growth", "agency"] as const;

export default function Pricing() {
  return (
    <SitePage>
      <JsonLd data={{ "@graph": [appLd(), breadcrumbLd([{ path: "/", name: "Home" }, { path: "/pricing", name: "Pricing" }])] }} />
      <PageHead eyebrow="Pricing" title="Free while we build the rest"
        lead="Free mode is complete: ask in your own AI accounts, paste the answers, get a score and a ranked list of places to submit. Paid plans are planned and not on sale yet; the prices below may change before launch." />
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8" aria-labelledby="plans">
        {/* Plan names are h3s, so the section needs an h2 to keep headings in order. */}
        <h2 id="plans" className="sr-only">Plans</h2>
        <PlanGrid />
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        <h2 className="font-display text-3xl">Compare plans</h2>
        {/* Scrolls sideways on small screens, so it takes keyboard focus. */}
        <div className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Compare plans table">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">What each plan includes</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-3 pr-4 font-semibold">Feature</th>
                {COLS.map((c) => <th key={c} scope="col" className="py-3 pr-4 font-semibold capitalize">{c}{c !== "free" && <span className="ml-1.5 font-normal text-muted">(soon)</span>}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, f]) => (
                <tr key={label} className="border-b border-line">
                  <th scope="row" className="py-3 pr-4 font-medium">{label}</th>
                  {COLS.map((c) => { const v = f(c); return <td key={c} className="py-3 pr-4">{v === yes ? <><span aria-hidden>✓</span><span className="sr-only">Included</span></> : v === no ? <><span aria-hidden>–</span><span className="sr-only">Not included</span></> : v}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="prose-page mt-10 text-muted">
          <h2 className="!text-ink">Good to know</h2>
          <ul>
            <li>Results are samples of how AI assistants answer. No plan can guarantee that an AI will name you.</li>
            <li>When paid plans launch, the first subscription payment will have a 14-day money-back guarantee. See the <Link href="/refunds">refund policy</Link>.</li>
            <li>Free mode will stay free.</li>
          </ul>
        </div>
      </section>
      <CallToAction body="Free, no sign-up. Your checks stay in your browser." />
    </SitePage>
  );
}
