import type { Metadata } from "next";
import Link from "next/link";
import { CallToAction, PageHead, SitePage } from "@/components/site/SiteChrome";
import { JsonLd, breadcrumbLd } from "@/components/site/JsonLd";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "For agencies",
  description: "Show clients whether ChatGPT, Claude, Gemini and DeepSeek recommend them, and hand them a ranked plan to get listed.",
  alternates: { canonical: "/for/agencies" },
};

export default function Agencies() {
  return (
    <SitePage>
      <JsonLd data={breadcrumbLd([{ path: "/", name: "Home" }, { path: "/for/agencies", name: "For agencies" }])} />
      <PageHead eyebrow="For agencies and freelancers" title="Can I offer AI visibility to my clients?"
        lead="Yes. Surfaced shows a client, answer by answer, whether AI assistants name them or a competitor, and gives you a ranked list of listings to fix it. You can use free mode for client audits today." />
      <article className="prose-page mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <h2>What you can do today, free</h2>
        <ul>
          <li>Run a check for each client site. Each check is saved separately in your browser.</li>
          <li>Show the evidence: the sentence that names the client, their position, and who was named instead.</li>
          <li>Hand over a submission plan with a listing kit, and track which listings are submitted and live.</li>
          <li>Export a check as JSON to keep a copy or move it to another browser.</li>
        </ul>
        <h2>What the Agency plan will add</h2>
        <p>Planned, not on sale yet:</p>
        <ul>
          <li>{PLANS.agency.sites} client sites with automatic checks twice a week;</li>
          <li>client workspaces and {PLANS.agency.seats} seats;</li>
          <li>white-label reports and share links your clients can open without an account.</li>
        </ul>
        <p>See <Link href="/pricing">pricing</Link> for the planned limits.</p>
        <h2>Setting expectations with clients</h2>
        <p>Be honest about what this is: AI answers vary between runs and accounts, and no one can guarantee a mention. What you can promise is a measured starting point, the sources the AIs rely on, and steady work to get the client listed there.</p>
      </article>
      <CallToAction title="Audit your first client" body="Free, no sign-up." />
    </SitePage>
  );
}
