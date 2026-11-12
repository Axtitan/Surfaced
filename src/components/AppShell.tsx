"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CHANGED, listProjects, type ProjectMeta } from "@/lib/store";
import { Logo } from "./ui";

const NAV = [
  { href: "/app", label: "Overview", icon: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/app/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" },
];

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = () => setProjects(listProjects());
    load();
    window.addEventListener(CHANGED, load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(CHANGED, load); window.removeEventListener("storage", load); };
  }, []);
  useEffect(() => setOpen(false), [path]);

  const item = (href: string, active: boolean, children: React.ReactNode) => (
    <Link key={href} href={href} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${active ? "bg-white font-medium text-ink shadow-[0_1px_2px_rgba(20,22,26,.06)] ring-1 ring-line" : "text-muted hover:bg-white/70 hover:text-ink"}`}>
      {children}
    </Link>
  );

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/" className="px-1.5 pt-1 text-ink"><Logo /></Link>
      <Link href="/app/new" className="btn btn-primary w-full">+ New check</Link>
      <nav className="space-y-0.5" aria-label="App">
        {NAV.map((n) => item(n.href, path === n.href, <><Icon d={n.icon} />{n.label}</>))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="label px-2.5 pb-2">Your checks</div>
        <div className="space-y-0.5">
          {projects.length === 0 && <p className="px-2.5 text-sm text-muted">None yet.</p>}
          {projects.map((m) => item(`/app/p/${m.id}`, path === `/app/p/${m.id}`, (
            <>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#eceef1] text-xs font-semibold uppercase text-ink">{m.name.slice(0, 1)}</span>
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              {m.score != null && <span className="text-xs tabular-nums text-muted">{m.score}</span>}
            </>
          )))}
        </div>
      </div>
      <div className="rounded-xl bg-white p-3 text-xs text-muted ring-1 ring-line">
        <span className="font-semibold text-ink">Free plan.</span> Checks are saved in this browser.
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-[#f2f2ef] lg:block">{sidebar}</aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/app" className="text-ink"><Logo /></Link>
        <button type="button" className="btn btn-ghost !px-3" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>Menu</button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[#f2f2ef] shadow-xl">{sidebar}</aside>
        </div>
      )}
      <main className="min-w-0">{children}</main>
    </div>
  );
}
