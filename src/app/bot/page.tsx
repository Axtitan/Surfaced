import type { Metadata } from "next";
import { PageHead, SitePage } from "@/components/site/SiteChrome";
import { CONTACT } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "SurfacedBot",
  description: "What SurfacedBot reads, how often, and how to stop it.",
  alternates: { canonical: "/bot" },
};

/* The page our user agent points to (§12.8 rule 6), so a site owner who sees SurfacedBot in their logs can find out
   what it is and how to block it. */
export default function Bot() {
  return (
    <SitePage>
      <PageHead eyebrow="For site owners" title="SurfacedBot"
        lead="SurfacedBot is how Surfaced reads web pages. It only fetches a page when a Surfaced user asks it to, and it obeys robots.txt." />
      <div className="prose-page mx-auto max-w-3xl px-5 pb-20 sm:px-8">
        <h2>What it reads</h2>
        <ul>
          <li><strong>A user&apos;s own website</strong>, when they run a check or the free AI crawler check: the homepage, robots.txt, llms.txt and the sitemap.</li>
          <li><strong>Pages that AI assistants cited</strong> in answers to a user&apos;s questions, to see whether the page mentions their business or its competitors.</li>
          <li><strong>A listing page a user says is live</strong>, to confirm it loads, names their business and links to their site.</li>
        </ul>
        <p>It does not follow links, index sites, collect personal data or store your pages. It keeps a few facts about a page (its title, and whether it names or links to a business), never the page itself.</p>

        <h2>How often</h2>
        <p>One request at a time to any site, with at least a second between requests. Results for a cited page are reused for up to 30 days.</p>

        <h2>How to stop it</h2>
        <p>Add this to your robots.txt. SurfacedBot checks it before reading any page other than robots.txt itself:</p>
        <pre><code>User-agent: SurfacedBot{"\n"}Disallow: /</code></pre>
        <p>A site check a user runs on their own site still reads its homepage, robots.txt, llms.txt and sitemap, because they asked to check their own site.</p>

        <h2>How to recognise it</h2>
        <p>The user agent contains <code>SurfacedBot</code> and a link to this page.{CONTACT.support ? <> To ask for your site to be excluded entirely, write to <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a>.</> : null}</p>
      </div>
    </SitePage>
  );
}
