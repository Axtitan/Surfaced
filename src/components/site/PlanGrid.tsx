import Link from "next/link";
import { PLAN_CARDS } from "@/lib/plans";

/** Plan cards from lib/plans. Only Free can be started; the rest say "Coming soon" and have no buy button (F-10). */
export function PlanGrid({ compact = false }: { compact?: boolean }) {
  const cards = compact ? PLAN_CARDS.filter((p) => p.id !== "sprint") : PLAN_CARDS;
  return (
    <div className={`grid gap-4 ${compact ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3"}`}>
      {cards.map((p) => (
        <div key={p.id} className={`flex flex-col rounded-3xl p-7 ${p.available ? "bg-ink text-white" : "card"}`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">{p.name}</h3>
            {!p.available && <span className="chip">Coming soon</span>}
            {p.available && <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs">Available now</span>}
          </div>
          <p className={`mt-1 text-sm ${p.available ? "text-white/75" : "text-muted"}`}>{p.tag}</p>
          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="font-display text-5xl">{p.price}</span>
            <span className={`text-sm ${p.available ? "text-white/75" : "text-muted"}`}>{p.period}</span>
          </div>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            {p.items.map((i) => <li key={i} className="flex gap-2.5"><span aria-hidden className={p.available ? "text-white/70" : "text-good"}>✓</span>{i}</li>)}
          </ul>
          {p.available
            ? <Link href="/app/new" className="btn mt-8 bg-white !py-3 text-ink hover:bg-[#eef0f4]">Start free</Link>
            : <p className="mt-8 text-center text-sm text-muted">Not on sale yet. Planned price, may change.</p>}
        </div>
      ))}
    </div>
  );
}
