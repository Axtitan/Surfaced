import Link from "next/link";

const TOOLS = [
  { href: "/tools/ai-crawler-check", title: "AI crawler check", body: "Does your robots.txt let the AI crawlers in?" },
  { href: "/tools/llms-txt-generator", title: "llms.txt generator", body: "A plain summary of your site for AI assistants." },
  { href: "/tools/json-ld-generator", title: "JSON-LD generator", body: "Structured data that says what your business is." },
];

export function ToolLinks({ current }: { current: string }) {
  return (
    <nav aria-label="Other free tools" className="mx-auto max-w-4xl px-5 pb-16 sm:px-8">
      <h2 className="label">Other free tools</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {TOOLS.filter((t) => t.href !== current).map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="card block p-5 hover:border-ink/30">
              <span className="font-semibold">{t.title}</span>
              <span className="mt-1 block text-sm text-muted">{t.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
