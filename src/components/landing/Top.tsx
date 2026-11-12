"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "../ui";

type Audience = "products" | "local";
const COPY: Record<Audience, { sub: string; placeholder: string }> = {
  products: {
    sub: "Surfaced asks ChatGPT, Claude, Gemini and DeepSeek the questions your buyers ask, shows whether they recommend you or a competitor, and gets you listed on the comparison sites they read.",
    placeholder: "yourproduct.com",
  },
  local: {
    sub: "When someone asks an AI for the best bakery, dentist or agency near them, does it say your name? Surfaced checks, then gets you onto the listings and review sites the AIs trust.",
    placeholder: "yourbusiness.com",
  },
};

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/tools/ai-crawler-check", label: "Free tools" },
  { href: "#faq", label: "FAQ" },
];

/** Landing hero. The illustration is rendered on the server and passed in as `backdrop`. */
export default function Top({ backdrop }: { backdrop?: React.ReactNode }) {
  const router = useRouter();
  const [aud, setAud] = useState<Audience>("products");
  const [url, setUrl] = useState("");
  const c = COPY[aud];

  return (
    <div className="relative isolate overflow-hidden">
      {backdrop}

      <header className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-5 sm:px-8">
        <Link href="/" className="text-ink" aria-label="Surfaced home"><Logo /></Link>
        <div className="hidden items-center gap-1 rounded-full p-0.5 md:flex" role="group" aria-label="Who it's for">
          {(["products", "local"] as Audience[]).map((a) => (
            <button key={a} type="button" onClick={() => setAud(a)} aria-pressed={aud === a}
              className={`rounded-full px-3.5 py-1.5 text-sm ${aud === a ? "border border-ink" : "border border-transparent text-ink/80 hover:text-ink"}`}>
              {a === "products" ? "Products" : "Local businesses"}
            </button>
          ))}
        </div>
        <nav className="mx-auto hidden items-center gap-8 text-sm lg:flex" aria-label="Main">
          {LINKS.map((l) => <Link key={l.href} href={l.href} className="text-ink/80 hover:text-ink">{l.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {/* There are no accounts yet, so this opens the app rather than promising a sign-in (F-18). */}
          <Link href="/app" className="hidden px-3 text-sm font-medium sm:inline">Open app</Link>
          <Link href="/app/new" className="btn border border-ink bg-white/70 !px-5 text-ink backdrop-blur hover:bg-white">Start free</Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[640px] max-w-4xl flex-col items-center px-5 pb-40 pt-14 text-center sm:min-h-[760px] sm:pt-24 sm:pb-56">
        <Link href="/how-it-works" className="rounded-full bg-sky-100/90 px-3.5 py-1.5 text-xs text-sky-950 sm:text-sm">
          <span className="font-semibold">Free:</span> check with your own AI accounts
        </Link>
        <h1 className="mt-6 font-display text-[2.6rem] leading-[1.05] tracking-tight text-ink sm:text-6xl md:text-7xl">
          Be the answer when<br className="hidden sm:block" /> buyers ask AI
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink/75 sm:text-lg">{c.sub}</p>

        <form className="mt-9 flex w-full max-w-xl flex-col gap-2 rounded-[28px] bg-white p-1.5 shadow-[0_10px_40px_-12px_rgba(20,22,26,.35)] ring-1 ring-ink/10 sm:flex-row sm:rounded-full"
          onSubmit={(e) => { e.preventDefault(); router.push(`/app/new?url=${encodeURIComponent(url)}&go=1`); }}>
          <input className="min-w-0 flex-1 rounded-full bg-transparent px-5 py-3 text-base outline-none placeholder:text-muted" placeholder={c.placeholder}
            value={url} onChange={(e) => setUrl(e.target.value)} required aria-label="Your website" inputMode="url" autoComplete="url" />
          <button className="btn btn-primary !px-6 !py-3 text-[0.95rem]">Check my visibility <span aria-hidden>→</span></button>
        </form>
        <p className="mt-3 text-sm text-ink/70">Free. No sign-up. <Link href="/how-it-works" className="underline underline-offset-2 hover:text-ink">See how it works</Link></p>

        <div className="mt-14">
          <p className="text-sm text-ink/70">Checks the answers from</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-lg font-semibold tracking-tight text-ink/85 sm:text-xl">
            <span>ChatGPT</span><span className="font-display font-medium">Claude</span><span>Gemini</span><span>DeepSeek</span>
          </div>
        </div>
      </section>
    </div>
  );
}
