import Link from "next/link";
import { Logo } from "@/components/ui";
import { EXTERNAL_REL } from "@/lib/safe-href";

/* Header, footer and page frame shared by the marketing, tools, directory and legal pages. Server components:
   all marketing text is in the server-rendered HTML (§17.1, §17.3). */

export const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/tools/ai-crawler-check", label: "Free tools" },
  { href: "/directories", label: "Directories" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 sm:px-8">
        <Link href="/" className="text-ink" aria-label="Surfaced home"><Logo /></Link>
        <nav className="order-3 flex w-full flex-wrap gap-x-5 gap-y-1 text-sm md:order-none md:mx-auto md:w-auto" aria-label="Main">
          {NAV.map((l) => <Link key={l.href} href={l.href} className="py-1 text-ink/80 hover:text-ink">{l.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link href="/app" className="hidden px-3 text-sm font-medium sm:inline">Open app</Link>
          <Link href="/app/new" className="btn btn-primary !px-5">Start free</Link>
        </div>
      </div>
    </header>
  );
}

const FOOTER = [
  { title: "Product", links: [["/how-it-works", "How it works"], ["/pricing", "Pricing"], ["/for/agencies", "For agencies"], ["/for/local-business", "For local businesses"], ["/changelog", "Changelog"]] },
  { title: "Free tools", links: [["/tools/ai-crawler-check", "AI crawler check"], ["/tools/llms-txt-generator", "llms.txt generator"], ["/tools/json-ld-generator", "JSON-LD generator"], ["/directories", "Directory guides"]] },
  { title: "Legal", links: [["/privacy", "Privacy"], ["/terms", "Terms"], ["/cookies", "Cookies"], ["/acceptable-use", "Acceptable use"], ["/security", "Security"], ["/subprocessors", "Sub-processors"], ["/refunds", "Refunds"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 text-sm sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3 text-muted">
          <Logo className="text-ink" />
          <p>Checks whether AI assistants recommend your business, then gets you listed where they look.</p>
          <p>Not affiliated with OpenAI, Anthropic, Google or DeepSeek.</p>
          <p>Destinations from the <a className="underline" href="https://github.com/alvinunreal/awesome-submitlist" target="_blank" rel={EXTERNAL_REL}>Submitlist</a> catalog (CC0).</p>
        </div>
        {FOOTER.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="label">{g.title}</h2>
            <ul className="mt-3 space-y-2">
              {g.links.map(([href, label]) => <li key={href}><Link href={href} className="text-ink/80 hover:text-ink hover:underline">{label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}

/** A standard marketing page: header, one main landmark (the skip link's target), footer. */
export function SitePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Page title block. `eyebrow` is a short label above the one h1. */
export function PageHead({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-5 pb-10 pt-16 sm:px-8 sm:pt-20">
      {eyebrow && <p className="label">{eyebrow}</p>}
      <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">{title}</h1>
      {lead && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{lead}</p>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-4xl px-5 pt-8 text-sm text-muted sm:px-8">
      <ol className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {it.href ? <Link href={it.href} className="hover:text-ink hover:underline">{it.label}</Link> : <span aria-current="page" className="text-ink">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CallToAction({ title = "Find out what AI says about you", body }: { title?: string; body?: string }) {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
      <div className="rounded-3xl bg-ink px-6 py-12 text-center text-white sm:px-10">
        <h2 className="font-display text-3xl sm:text-4xl">{title}</h2>
        {body && <p className="mx-auto mt-3 max-w-xl text-white/75">{body}</p>}
        <Link href="/app/new" className="btn mt-7 bg-white !px-6 !py-3 text-ink hover:bg-[#eef0f4]">Check my visibility →</Link>
      </div>
    </section>
  );
}
