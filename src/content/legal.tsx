import Link from "next/link";
import { CONTACT } from "@/lib/site-url";

/* Legal pages (§19.1). Written to describe what the app does today: free mode, data kept in the browser, no accounts,
   no payments. They are drafts until a lawyer reviews them; the page says so. Contact details come from configuration
   (NEXT_PUBLIC_SUPPORT_EMAIL, SECURITY_CONTACT, NEXT_PUBLIC_COMPANY_NAME) and are shown as "not yet published" if unset. */

export const LEGAL_UPDATED = "12 November 2026";

function Contact({ kind = "support" }: { kind?: "support" | "security" }) {
  const v = kind === "security" ? CONTACT.security : CONTACT.support;
  if (!v) return <em>(contact address not yet published)</em>;
  const href = v.startsWith("http") || v.startsWith("mailto:") ? v : `mailto:${v}`;
  return <a href={href}>{v.replace(/^mailto:/, "")}</a>;
}
const Operator = () => <>{CONTACT.company || "the operator of Surfaced"}</>;

export type LegalDoc = { slug: string; title: string; description: string; body: React.ReactNode };

export const LEGAL: LegalDoc[] = [
  {
    slug: "privacy", title: "Privacy policy", description: "What Surfaced collects, why, where it's kept and your rights.",
    body: (<>
      <p>Surfaced is run by <Operator />. This policy explains what happens to information when you use Surfaced and its free tools. Questions: <Contact />.</p>
      <h2>The short version</h2>
      <ul>
        <li>There are no accounts. Your checks, answers, listing kits and progress are stored <strong>in your browser</strong>, not on our servers.</li>
        <li>When you enter a website address, our server reads that site&apos;s public pages to build your check. We don&apos;t keep the page text.</li>
        <li>We count page views with a cookieless analytics service. We don&apos;t sell data or use advertising trackers.</li>
      </ul>
      <h2>What we process and why</h2>
      <table>
        <thead><tr><th>What</th><th>Why</th><th>Kept</th></tr></thead>
        <tbody>
          <tr><td>The website address you enter</td><td>To fetch its public homepage, robots.txt, llms.txt and sitemap and build your profile, questions and site checks</td><td>Not stored on our servers; saved in your browser with your check</td></tr>
          <tr><td>Public text from that website</td><td>To work out what the business does and suggest questions</td><td>Used during the request, then discarded</td></tr>
          <tr><td>Your business type, categories and the domains AIs cited in your answers</td><td>To rank the places to submit</td><td>Used during the request, then discarded</td></tr>
          <tr><td>Your IP address</td><td>To limit how often each visitor can run checks, which protects the service</td><td>In server memory for up to an hour; our host also keeps standard request logs for a short period</td></tr>
          <tr><td>Page views (page address with check identifiers removed, browser type, country)</td><td>To know which pages are used</td><td>Held by our analytics provider in aggregate form</td></tr>
        </tbody>
      </table>
      <p>The answers you paste, your edited questions and your tracker are never sent to us. They stay in your browser&apos;s local storage until you delete them.</p>
      <h2>AI providers</h2>
      <p>In free mode you ask ChatGPT, Claude, Gemini or DeepSeek yourself, in your own account, under that provider&apos;s terms and privacy policy. We don&apos;t send them anything.</p>
      <p>Automatic checks, when they are offered, will send your questions (and, for building a profile, your website&apos;s public text) to the AI providers listed on the <Link href="/subprocessors">sub-processors page</Link>. This page will be updated before that is switched on.</p>
      <h2>The browser extension</h2>
      <p>The optional extension stores your listing kit and any answers you capture in the extension&apos;s own storage on your computer. It only talks to the Surfaced page; it fills forms on directory sites when you click it, and never submits them.</p>
      <h2>Legal basis</h2>
      <p>Where data protection law such as the UK or EU GDPR applies, we process the data above on the basis of legitimate interests: providing the check you asked for, and keeping the service secure and working.</p>
      <h2>Your rights and choices</h2>
      <ul>
        <li><strong>Delete your data:</strong> open <Link href="/app/settings">Settings</Link> and choose &ldquo;Delete all data in this browser&rdquo;, or clear this site&apos;s data in your browser.</li>
        <li><strong>Export your data:</strong> Settings → &ldquo;Export all checks&rdquo;.</li>
        <li>You can ask us about any data we hold (for example in logs), and ask for it to be corrected or deleted, at <Contact />. You can also complain to your data protection authority.</li>
      </ul>
      <h2>Children</h2>
      <p>Surfaced is a business tool and isn&apos;t meant for children under 16.</p>
      <h2>Changes</h2>
      <p>We&apos;ll update this page when what we collect changes, including before accounts or paid plans launch, and change the date at the top.</p>
    </>),
  },
  {
    slug: "terms", title: "Terms of service", description: "The terms for using Surfaced and its free tools.",
    body: (<>
      <p>These terms apply when you use Surfaced, run by <Operator />. By using it you agree to them. Contact: <Contact />.</p>
      <h2>What Surfaced is</h2>
      <p>Surfaced helps you see whether AI assistants mention a business and suggests places to get listed. It is provided free of charge, as it is, and may change.</p>
      <h2>Results are samples, not guarantees</h2>
      <ul>
        <li>AI answers vary between runs, accounts, places and dates. A check shows a sample of answers, not a permanent fact.</li>
        <li>We don&apos;t control any AI assistant and can&apos;t guarantee that you will be mentioned, ranked or recommended.</li>
        <li>Directory details (prices, link types, rules) come from an open catalog and may be out of date. Check each site before you pay or submit.</li>
      </ul>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Only check websites you own or have permission to analyse, and follow the <Link href="/acceptable-use">acceptable use policy</Link>.</li>
        <li>You are responsible for what you submit to other sites, and for following their rules and terms. The extension fills forms; you review and submit them.</li>
        <li>When you ask AI assistants yourself, you do so under their terms.</li>
      </ul>
      <h2>Not affiliated</h2>
      <p>Surfaced is independent and is not affiliated with, endorsed by or sponsored by OpenAI, Anthropic, Google, DeepSeek or any listed directory. Their names are used only to describe what Surfaced checks.</p>
      <h2>Your data</h2>
      <p>Your checks are stored in your browser. You can export or delete them at any time. See the <Link href="/privacy">privacy policy</Link>.</p>
      <h2>Liability</h2>
      <p>To the extent the law allows, Surfaced is provided without warranties, and we are not liable for indirect losses or for decisions you make based on its results. Nothing in these terms limits rights you have as a consumer that can&apos;t be limited by law.</p>
      <h2>Paid plans</h2>
      <p>Nothing is for sale yet. Paid plans will come with their own terms, shown before you buy.</p>
      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version.</p>
    </>),
  },
  {
    slug: "cookies", title: "Cookie policy", description: "Surfaced sets no cookies. Here's what it stores in your browser instead.",
    body: (<>
      <p><strong>Surfaced doesn&apos;t set any cookies today</strong>, so there is no cookie banner. Our analytics are cookieless.</p>
      <h2>What is stored in your browser</h2>
      <table>
        <thead><tr><th>Name</th><th>Where</th><th>Purpose</th><th>Type</th></tr></thead>
        <tbody>
          <tr><td><code>surfaced:project:*</code>, <code>surfaced:projects</code></td><td>Local storage</td><td>Your saved checks: profile, questions and answers</td><td>Essential (the app&apos;s data)</td></tr>
          <tr><td><code>surfaced:*</code> (other keys)</td><td>Local storage</td><td>Submission tracker progress and unsent drafts</td><td>Essential</td></tr>
          <tr><td>Extension storage</td><td>The extension, if installed</td><td>Your listing kit and captured answers</td><td>Essential</td></tr>
        </tbody>
      </table>
      <p>Delete all of it from <Link href="/app/settings">Settings</Link>, or by clearing this site&apos;s data in your browser.</p>
      <h2>If this changes</h2>
      <p>If we add accounts or analytics that use cookies, we&apos;ll list them here first and ask for consent where the law requires it, with &ldquo;Accept&rdquo; and &ldquo;Reject&rdquo; given equal weight.</p>
    </>),
  },
  {
    slug: "acceptable-use", title: "Acceptable use policy", description: "What you may and may not do with Surfaced.",
    body: (<>
      <p>To keep Surfaced useful and fair for everyone, don&apos;t use it to:</p>
      <ul>
        <li>attack, probe or overload any website, including by pointing the site reader or crawler check at systems you don&apos;t own;</li>
        <li>get around rate limits, run it from scripts or bots, or resell access without permission;</li>
        <li>spam directories, communities or newsletters, submit misleading listings, or break a site&apos;s posting rules;</li>
        <li>create fake reviews or impersonate another business;</li>
        <li>break the law or the terms of the AI services you use.</li>
      </ul>
      <p>We may block access that breaks this policy. Report abuse to <Contact />.</p>
    </>),
  },
  {
    slug: "security", title: "Security", description: "How Surfaced protects the service, and how to report a vulnerability.",
    body: (<>
      <h2>Reporting a vulnerability</h2>
      <p>Please report security issues to <Contact kind="security" />. Include steps to reproduce. We&apos;ll acknowledge reports, keep you updated, and credit you if you&apos;d like. Please don&apos;t access other people&apos;s data, degrade the service or run automated scanners against it.</p>
      <h2>How Surfaced is built</h2>
      <ul>
        <li><strong>Little to steal:</strong> there are no accounts and your checks stay in your browser.</li>
        <li><strong>Guarded site reader:</strong> requests to the websites you check refuse private and internal network addresses, are pinned to the address that was checked, follow few redirects, and are limited in size and time.</li>
        <li><strong>Every API endpoint</strong> validates its input strictly, checks the request&apos;s origin, limits request size and is rate limited per visitor.</li>
        <li><strong>Browser protections:</strong> a content security policy, HSTS, frame blocking and a strict referrer policy. Links to outside sites are checked to be web addresses before they are shown.</li>
        <li><strong>No keys in the browser:</strong> AI service keys, when used, stay on the server. Paid AI calls are switched off in the public deployment until accounts and spending limits exist.</li>
        <li>Errors shown to you never include internal details; logs mask secrets and email addresses.</li>
      </ul>
    </>),
  },
  {
    slug: "subprocessors", title: "Sub-processors", description: "The services Surfaced uses to run, and what each one receives.",
    body: (<>
      <p>These companies process data on our behalf. We&apos;ll update this list before adding one.</p>
      <table>
        <thead><tr><th>Service</th><th>What for</th><th>What it receives</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Vercel Inc.</td><td>Hosting and cookieless page-view analytics</td><td>Requests to the site (including IP address) and page views</td><td>In use</td></tr>
          <tr><td>Anthropic PBC</td><td>Building a profile from your website text; automatic answers from Claude</td><td>Public website text; your questions</td><td>Not in use on the public site</td></tr>
          <tr><td>OpenAI</td><td>Automatic answers from ChatGPT</td><td>Your questions</td><td>Not in use on the public site</td></tr>
          <tr><td>Google</td><td>Automatic answers from Gemini</td><td>Your questions</td><td>Not in use on the public site</td></tr>
          <tr><td>DeepSeek</td><td>Automatic answers from DeepSeek</td><td>Your questions</td><td>Not in use on the public site</td></tr>
        </tbody>
      </table>
      <p>In free mode, when you ask an AI assistant yourself, you are using that company&apos;s service directly; it isn&apos;t our sub-processor.</p>
    </>),
  },
  {
    slug: "refunds", title: "Refund policy", description: "Surfaced's refund policy.",
    body: (<>
      <p>Surfaced is free today and nothing is for sale, so there is nothing to refund.</p>
      <p>When paid plans launch, the planned policy is:</p>
      <ul>
        <li><strong>Subscriptions:</strong> a full refund if you ask within 14 days of your first payment. After that, you can cancel at any time and keep access until the end of the period you paid for.</li>
        <li><strong>Done-for-you services:</strong> refundable in full until work starts.</li>
      </ul>
      <p>This page will be confirmed before anything is sold. Questions: <Contact />.</p>
    </>),
  },
];

export const legalBySlug = (slug: string) => LEGAL.find((d) => d.slug === slug);
