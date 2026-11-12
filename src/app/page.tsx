import Link from "next/link";
import type { Metadata } from "next";
import Top from "@/components/landing/Top";
import { BandBackdrop, HeroBackdrop } from "@/components/landing/HeroBackdrop";
import { SiteFooter } from "@/components/site/SiteChrome";
import { PlanGrid } from "@/components/site/PlanGrid";
import { JsonLd, appLd, faqLd, orgLd } from "@/components/site/JsonLd";
import { ScoreRing } from "@/components/ui";
import { CATALOG_COUNT, formatCount } from "@/lib/catalog";
import { CATALOG_LINE, FAQ, PLACES, STEPS } from "@/content/marketing";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** A made-up example so the landing page never shows a real company's results (F-19). */
function Preview() {
  const rows = [
    { q: "Best note-taking app for researchers?", cells: ["×", "#2", "×", "#4"] },
    { q: "Alternatives to Folio Pad?", cells: ["#3", "×", "#4", "×"] },
    { q: "Cheaper option than Brightpage?", cells: ["×", "×", "#2", "×"] },
  ];
  const label = (c: string) => (c === "×" ? "not named" : `named, position ${c.slice(1)}`);
  const apps = ["ChatGPT", "Claude", "Gemini", "DeepSeek"];
  return (
    <figure className="card overflow-hidden shadow-[0_30px_80px_-30px_rgba(20,22,26,.35)]">
      <div className="flex items-center gap-4 border-b border-line p-5">
        <ScoreRing score={31} size={64} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">AIs recommend you sometimes.</div>
          <div className="text-sm text-muted">Named in 31% of 40 answers</div>
        </div>
        <span className="chip">Example</span>
      </div>
      <div className="grid grid-cols-4 gap-px bg-line text-center text-xs">
        {([["ChatGPT", 30], ["Claude", 40], ["Gemini", 40], ["DeepSeek", 10]] as const).map(([n, v]) => (
          <div key={n} className="bg-white p-3"><div className="text-muted">{n}</div><div className="mt-0.5 text-lg font-semibold">{v}%</div></div>
        ))}
      </div>
      <div className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.q} className="grid grid-cols-[minmax(0,1fr)_repeat(4,2.4rem)] items-center gap-1.5 px-5 py-2.5 text-sm">
            <span className="truncate">{r.q}</span>
            {r.cells.map((c, i) => (
              <span key={i} aria-label={`${apps[i]}: ${label(c)}`} className={`rounded-md py-1 text-center text-xs font-semibold ${c === "×" ? "bg-red-50 text-bad" : "bg-emerald-50 text-good"}`}>{c}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-line bg-paper p-5 text-sm">
        <span className="font-semibold">Named instead:</span> <span className="text-muted">Brightpage · Folio Pad · Quillworks · Ledgerleaf</span>
      </div>
      <figcaption className="border-t border-line px-5 py-3 text-xs text-muted">Example results for an invented product. Names are made up.</figcaption>
    </figure>
  );
}

export default function Home() {
  return (
    <div className="bg-white">
      <JsonLd data={{ "@graph": [orgLd(), appLd(), faqLd(FAQ)] }} />
      <Top backdrop={<HeroBackdrop />} />

      <main id="main" tabIndex={-1} className="outline-none">
        <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-24 sm:px-8">
          <p className="label">How it works</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">From “are we even mentioned?” to listed, in an afternoon</h2>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t border-ink pt-5">
                <div className="font-display text-xl text-muted" aria-hidden>{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 leading-relaxed text-muted">{s.d}</p>
              </div>
            ))}
          </div>
          <Link href="/how-it-works" className="mt-10 inline-block text-sm font-medium underline underline-offset-4">More on how it works →</Link>
        </section>

        <section className="bg-paper">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 sm:px-8 md:grid-cols-2">
            <div>
              <p className="label">Proof, not guesses</p>
              <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">See exactly what each AI says about you</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                A score you can check: every answer, the sentence that names you, where you rank, and the competitors that got the spot.
                The sites the AIs quote become your submission list.
              </p>
              <Link href="/app/new" className="btn btn-primary mt-8 !px-6 !py-3">Check my visibility →</Link>
            </div>
            <Preview />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-end">
            <div>
              <p className="label">Where we get you listed</p>
              <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">The sources AIs trust</h2>
            </div>
            <p className="text-lg leading-relaxed text-muted">{CATALOG_LINE}</p>
          </div>
          <ul className="mt-12 flex flex-wrap gap-2.5">
            {PLACES.map((p) => <li key={p} className="rounded-full border border-line px-4 py-2 text-sm">{p}</li>)}
            <li><Link href="/directories" className="block rounded-full bg-ink px-4 py-2 text-sm text-white">+ {formatCount(CATALOG_COUNT - PLACES.length)} more</Link></li>
          </ul>
        </section>

        <section id="pricing" className="scroll-mt-8 bg-paper">
          <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
            <p className="label text-center">Pricing</p>
            <h2 className="mt-3 text-center font-display text-4xl sm:text-5xl">Free while we build the rest</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted">Free mode is complete and stays free. Paid plans with automatic weekly checks are planned and not on sale yet.</p>
            <div className="mt-14"><PlanGrid compact /></div>
            <p className="mt-6 text-center text-sm"><Link href="/pricing" className="underline underline-offset-4">Compare plans</Link></p>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-8 px-5 py-24 sm:px-8">
          <h2 className="text-center font-display text-4xl sm:text-5xl">Questions</h2>
          <div className="mt-12 divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
                  {f.q}<span className="text-2xl font-light text-muted transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8">
          <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 py-20 text-center">
            <BandBackdrop />
            <div className="absolute inset-0 -z-10 bg-white/60" />
            <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight sm:text-5xl">Find out what AI says about you today</h2>
            <Link href="/app/new" className="btn btn-primary mt-8 !px-7 !py-3">Check my visibility →</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
