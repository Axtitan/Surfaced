import Link from "next/link";
import { SitePage } from "@/components/site/SiteChrome";

export default function NotFound() {
  return (
    <SitePage>
      <div className="mx-auto max-w-2xl px-5 py-24 text-center sm:px-8">
        <p className="label">404</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">We couldn&apos;t find that page</h1>
        <p className="mt-4 text-muted">The address may be mistyped, or the page has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">Go to the home page</Link>
          <Link href="/app" className="btn btn-ghost">Open your checks</Link>
        </div>
      </div>
    </SitePage>
  );
}
