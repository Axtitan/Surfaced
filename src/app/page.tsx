import Link from "next/link";
import Top from "@/components/landing/Top";
import { Logo, ScoreRing } from "@/components/ui";

const STEPS = [
  { n: "01", t: "We ask what your buyers ask", d: "We read your site and write the questions people type into AI assistants, like “best invoicing app for freelancers” or “alternatives to FreshBooks”." },
  { n: "02", t: "You see who gets named", d: "Every answer is checked for your name. You see the exact sentence, your position in the list, who was named instead and which sites the AI quoted." },
  { n: "03", t: "We get you listed where AIs look", d: "AIs lean on comparison sites like AlternativeTo, G2 and Capterra. We rank 3,477 places to submit, starting with the ones the AIs cited, and fill the forms with you." },
];

const PLACES = ["AlternativeTo", "SaaSHub", "G2", "Capterra", "Product Hunt", "GitHub awesome lists", "Google Business Profile", "Trustpilot", "Yelp", "TrustRadius", "There's An AI For That", "Hacker News"];

const PLANS = [
  { name: "Free", price: "$0", note: "forever", tag: "Ask in your own AI accounts", cta: "Start free", featured: false,
    items: ["Unlimited checks", "ChatGPT, Claude, Gemini and DeepSeek", "Paste answers from the apps you already use", "Full submission plan and listing kit", "Form-filling browser extension"] },
  { name: "Pro", price: "$29", note: "per month", tag: "Ask automatically", cta: "Start free, upgrade later", featured: true,
    items: ["Everything in Free", "Automatic answers through the AI APIs", "Each question asked several times for a reliable score", "Weekly re-checks with alerts (coming soon)", "History across devices (coming soon)"] },
  { name: "Done for you", price: "$299", note: "one-off", tag: "We submit for you", cta: "Start with a free check", featured: false,
    items: ["A free check first", "We submit to the top 40 places for you", "Listings written to name you next to your competitors", "Re-check and report after 30 days"] },
];

const FAQ = [
  { q: "Is the free plan really free?", a: "Yes. In free mode you ask the questions in your own ChatGPT, Claude, Gemini and DeepSeek accounts (their free plans work) and paste the answers in. Surfaced does the checking, scoring and planning." },
  { q: "Why would an AI recommend me at all?", a: "When an assistant answers “what's the best…” it searches the web and leans on sources it trusts: comparison sites, directories, review sites and lists. If you're not on those pages, you're rarely in the answer. Getting listed there, next to the names it already knows, is the most direct way in." },
  { q: "Do you submit to the sites for me?", a: "On the free and Pro plans the browser extension fills each submission form from your listing kit and you press submit. Most of these sites need an account and a human, and automated submissions get rejected. On the Done for you plan our team handles it." },
  { q: "How do I know the results are right?", a: "Every “named you” comes with the sentence that triggered it and the full answer, so you can check it yourself. Answers vary between runs, so Pro asks each question several times and shows a likely range, not one lucky result." },
  { q: "Where is my data kept?", a: "On the free plan, everything stays in your browser. Nothing about your site is shared with anyone except the AI services you choose to ask." },
];

function Preview() {
  const rows = [
    { q: "Best open-source note-taking app?", cells: ["×", "#2", "×", "#4"] },
    { q: "Alternatives to Notion?", cells: ["#3", "×", "#4", "×"] },
    { q: "Cheaper option than Evernote?", cells: ["×", "×", "#2", "×"] },
  ];
  return (
    <div className="card overflow-hidden shadow-[0_30px_80px_-30px_rgba(20,22,26,.35)]">
      <div className="flex items-center gap-4 border-b border-line p-5">
        <ScoreRing score={31} size={64} />
        <div>
          <div className="font-semibold">AIs recommend you sometimes.</div>
          <div className="text-sm text-muted">Named in 31% of 40 answers</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-px bg-line text-center text-xs">
        {[["ChatGPT", 30], ["Claude", 40], ["Gemini", 40], ["DeepSeek", 10]].map(([n, v]) => (
          <div key={n} className="bg-white p-3"><div className="text-muted">{n}</div><div className="mt-0.5 text-lg font-semibold">{v}%</div></div>
        ))}
      </div>
      <div className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.q} className="grid grid-cols-[minmax(0,1fr)_repeat(4,2.4rem)] items-center gap-1.5 px-5 py-2.5 text-sm">
            <span className="truncate">{r.q}</span>
            {r.cells.map((c, i) => <span key={i} className={`rounded-md py-1 text-center text-xs font-semibold ${c === "×" ? "bg-red-50 text-bad" : "bg-emerald-50 text-good"}`}>{c}</span>)}
          </div>
        ))}
      </div>
      <div className="border-t border-line bg-paper p-5 text-sm">
        <span className="font-semibold">Named instead:</span> <span className="text-muted">Obsidian · Notion · Joplin · Logseq</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-white">
      <Top />

      <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-24 sm:px-8">
        <p className="label">How it works</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">From “are we even mentioned?” to listed, in an afternoon</h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="border-t border-ink pt-5">
              <div className="font-display text-xl text-muted">{s.n}</div>
              <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
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
          <p className="text-lg leading-relaxed text-muted">
            3,477 hand-checked places from the open Submitlist catalog: comparison sites, directories, launch sites, review sites, newsletters and communities, ranked for your product.
          </p>
        </div>
        <ul className="mt-12 flex flex-wrap gap-2.5">
          {PLACES.map((p) => <li key={p} className="rounded-full border border-line px-4 py-2 text-sm">{p}</li>)}
          <li className="rounded-full bg-ink px-4 py-2 text-sm text-white">+ 3,465 more</li>
        </ul>
      </section>

      <section id="pricing" className="scroll-mt-8 bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <p className="label text-center">Pricing</p>
          <h2 className="mt-3 text-center font-display text-4xl sm:text-5xl">Start free. Pay when it&apos;s worth it.</h2>
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className={`flex flex-col rounded-3xl p-7 ${p.featured ? "bg-ink text-white" : "card"}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  {p.featured && <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs">Most popular</span>}
                </div>
                <p className={`mt-1 text-sm ${p.featured ? "text-white/70" : "text-muted"}`}>{p.tag}</p>
                <div className="mt-6 flex items-baseline gap-1.5"><span className="font-display text-5xl">{p.price}</span><span className={`text-sm ${p.featured ? "text-white/70" : "text-muted"}`}>{p.note}</span></div>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {p.items.map((i) => <li key={i} className="flex gap-2.5"><span aria-hidden className={p.featured ? "text-white/60" : "text-good"}>✓</span>{i}</li>)}
                </ul>
                <Link href="/app/new" className={`btn mt-8 !py-3 ${p.featured ? "bg-white text-ink hover:bg-[#eef0f4]" : "btn-primary"}`}>{p.cta}</Link>
              </div>
            ))}
          </div>
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

      <section className="px-5 pb-8 sm:px-8">
        <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 py-20 text-center">
          <img src="/hero-sm.webp" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-bottom" loading="lazy" />
          <div className="absolute inset-0 -z-10 bg-white/55" />
          <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight sm:text-5xl">Find out what AI says about you today</h2>
          <Link href="/app/new" className="btn btn-primary mt-8 !px-7 !py-3">Check my visibility →</Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Logo className="text-ink" />
        <p>Destinations from the <a className="underline" href="https://github.com/alvinunreal/awesome-submitlist" target="_blank" rel="noopener noreferrer">Submitlist</a> catalog (CC0).</p>
      </footer>
    </div>
  );
}
