import { CATALOG_COUNT, formatCount } from "@/lib/catalog";
import { PLAN_CARDS } from "@/lib/plans";
import { BRAND, SITE_URL } from "@/lib/site-url";

export const dynamic = "force-static";

/* Our own llms.txt (§17.3): the same name, one-liner and category words used everywhere. */
export function GET() {
  const plans = PLAN_CARDS.map((p) => `- ${p.name}: ${p.price} ${p.period}${p.available ? "" : " (planned, not on sale yet)"}`).join("\n");
  const body = `# ${BRAND.name}

> ${BRAND.oneLine}

${BRAND.name} is an ${BRAND.category}. It writes the questions buyers ask AI assistants about a business's category, checks each answer from ChatGPT, Claude, Gemini and DeepSeek for the business's name, shows who was named instead and which sites were cited, and ranks ${formatCount(CATALOG_COUNT)} directories, launch sites, review sites and communities to get listed on. Free mode uses the person's own AI accounts; checks are stored in their browser. ${BRAND.name} is not affiliated with OpenAI, Anthropic, Google or DeepSeek.

## Plans

${plans}

## Key pages

- [How it works](${SITE_URL}/how-it-works): the method, step by step, and its limits
- [Pricing](${SITE_URL}/pricing): plans and what each includes
- [AI crawler check](${SITE_URL}/tools/ai-crawler-check): free robots.txt check for AI crawlers
- [llms.txt generator](${SITE_URL}/tools/llms-txt-generator): free llms.txt writer
- [JSON-LD generator](${SITE_URL}/tools/json-ld-generator): free structured data writer
- [Directory guides](${SITE_URL}/directories): where to list a business and how
- [Privacy](${SITE_URL}/privacy): what is collected and where it is kept
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
