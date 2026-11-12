import { CATALOG_COUNT, formatCount } from "@/lib/catalog";

/* Marketing copy shared by the landing page and the inner pages, so the same facts read the same everywhere (§17.3). */

export const STEPS = [
  { n: "01", t: "We ask what your buyers ask", d: "We read your site and write the questions people type into AI assistants, like “best invoicing app for freelancers” or “alternatives to a tool you compete with”. You can edit every question." },
  { n: "02", t: "You see who gets named", d: "Each answer is checked for your name. You see the exact sentence, your position in the list, who was named instead and which sites the AI quoted." },
  { n: "03", t: "We get you listed where AIs look", d: `AIs lean on comparison sites, directories and review sites. We rank ${formatCount(CATALOG_COUNT)} places to submit, starting with the ones the AIs cited, and the browser extension fills the forms for you to check and send.` },
];

export const PLACES = ["AlternativeTo", "SaaSHub", "G2", "Capterra", "Product Hunt", "GitHub awesome lists", "Google Business Profile", "Trustpilot", "Yelp", "TrustRadius", "There's An AI For That", "Hacker News"];

export const FAQ = [
  { q: "Is it really free?", a: "Yes. In free mode you ask the questions in your own ChatGPT, Claude, Gemini and DeepSeek accounts (their free plans work) and paste the answers in. Surfaced does the checking, scoring and planning. Paid plans with automatic checks are coming; nothing is for sale yet." },
  { q: "Why would an AI recommend me at all?", a: "When an assistant answers “what's the best…” it often searches the web and leans on sources it trusts: comparison sites, directories, review sites and lists. If you're not on those pages, you're rarely in the answer. Getting listed there, next to the names it already knows, is the most direct way in. It still isn't guaranteed: no one controls what an AI says." },
  { q: "Do you submit to the sites for me?", a: "No. The browser extension fills each submission form from your listing kit, and you check the details and press submit yourself. Most of these sites need an account and a human, and automated submissions get rejected. A done-for-you service is planned." },
  { q: "How do I know the results are right?", a: "Every “named you” comes with the sentence that triggered it and the full answer, so you can check it yourself. Answers vary between runs and between accounts, so treat one check as a sample, not a verdict, and re-check over time." },
  { q: "Where is my data kept?", a: "Your checks, answers and progress stay in your browser. To read your website, our server fetches its public pages; that text isn't stored. See the privacy policy for the details." },
  { q: "Is Surfaced affiliated with OpenAI, Anthropic, Google or DeepSeek?", a: "No. Surfaced is independent. It checks the answers their assistants give; it has no special access to them." },
];

export const CATALOG_LINE = `${formatCount(CATALOG_COUNT)} places from the open Submitlist catalog: comparison sites, directories, launch sites, review sites, newsletters and communities, ranked for your business.`;
