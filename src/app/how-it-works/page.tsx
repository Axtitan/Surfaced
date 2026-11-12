import type { Metadata } from "next";
import Link from "next/link";
import { CallToAction, PageHead, SitePage } from "@/components/site/SiteChrome";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/site/JsonLd";
import { CATALOG_LINE, FAQ, STEPS } from "@/content/marketing";

export const metadata: Metadata = {
  title: "How it works",
  description: "How Surfaced checks whether AI assistants recommend your business, scores the answers, and ranks the places to get listed.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorks() {
  return (
    <SitePage>
      <JsonLd data={{ "@graph": [faqLd(FAQ), breadcrumbLd([{ path: "/", name: "Home" }, { path: "/how-it-works", name: "How it works" }])] }} />
      <PageHead eyebrow="How it works" title="How does Surfaced check what AI says about you?"
        lead="It asks the AI assistants the questions your buyers ask, checks each answer for your name, and turns the sites the AIs quote into a ranked list of places to get listed." />

      <section className="mx-auto max-w-4xl px-5 sm:px-8">
        <ol className="grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="border-t border-ink pt-5">
              <div className="font-display text-xl text-muted" aria-hidden>{s.n}</div>
              <h2 className="mt-3 text-lg font-semibold">{s.t}</h2>
              <p className="mt-2 leading-relaxed text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <article className="prose-page mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <h2>1. Reading your site</h2>
        <p>You enter your website address. Our server fetches the public homepage, robots.txt, llms.txt and sitemap through a guarded fetcher that refuses private network addresses. From that it works out what you sell, who it&apos;s for and who you compete with, and writes 10 questions a buyer might ask an AI. You can edit, add or remove any question and any competitor before asking.</p>
        <p>It also runs readiness checks: whether robots.txt lets the AI crawlers in, whether the page has server-rendered text, a description, structured data and an llms.txt file. You can run that part on its own with the <Link href="/tools/ai-crawler-check">free AI crawler check</Link>.</p>

        <h2>2. Asking the AIs</h2>
        <p><strong>Free mode.</strong> Surfaced opens each question in ChatGPT, Claude, Gemini or DeepSeek in your own account (free accounts work). You paste the answer back, or capture it with the browser extension. Nothing is sent to the AI providers by us.</p>
        <p><strong>Automatic mode</strong> (planned for paid plans). Surfaced asks the AI services directly, with web search on, and asks each question more than once, because answers vary from run to run.</p>

        <h2>3. Checking each answer</h2>
        <p>Each answer is checked for your name and the other names you gave (with accents and different scripts handled). For each one you see:</p>
        <ul>
          <li>whether you were named, and the exact sentence that named you;</li>
          <li>your position when the answer is a list;</li>
          <li>which competitors were named instead;</li>
          <li>which websites the AI cited as sources.</li>
        </ul>
        <p>Your score is the share of answers that name you. Competitor share of voice shows how often each name appears across all answers.</p>

        <h2>4. Getting listed where AIs look</h2>
        <p>{CATALOG_LINE} Places the AIs actually cited in your answers go to the top, then places that fit your kind of business. Surfaced writes a listing kit (tagline, short and long description, keywords) once, and the browser extension fills each submission form from it. You check every field and press submit yourself. A tracker keeps your progress.</p>

        <h2>5. Fixing your own site</h2>
        <p>Surfaced suggests site fixes that help AIs read you: allowing AI crawlers, adding an llms.txt file and adding structured data. The <Link href="/tools/llms-txt-generator">llms.txt generator</Link> and <Link href="/tools/json-ld-generator">JSON-LD generator</Link> are free.</p>

        <h2>What it can&apos;t do</h2>
        <ul>
          <li>It can&apos;t make an AI recommend you. It shows where you stand and the most direct ways in.</li>
          <li>One check is a sample. Answers change with time, with the account and with the wording of the question.</li>
          <li>It doesn&apos;t create accounts or submit forms for you.</li>
        </ul>
      </article>
      <CallToAction />
    </SitePage>
  );
}
