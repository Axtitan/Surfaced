import { templateQuestions } from "./questions";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { claude, claudeClient, CLAUDE_MODEL } from "./providers/claude";
import type { PageInfo } from "./site";
import { CATEGORIES, KINDS, type Analysis, type Profile } from "./types";

const ProfileSchema = z.object({
  name: z.string().describe("The product or business name as customers would type it"),
  aliases: z.array(z.string()).describe("Other spellings or short names people use. Empty if none"),
  kind: z.enum(KINDS),
  category: z.string().describe("Short plain category, e.g. 'note-taking app', 'invoicing software for freelancers', 'bakery in Lagos'"),
  audience: z.string().describe("Who it is for, in a few words"),
  location: z.string().describe("City/country if it serves a specific place, otherwise empty"),
  competitors: z.array(z.string()).describe("6-8 well-known products or businesses an AI assistant would already recommend for this category"),
  categories: z.array(z.enum(CATEGORIES)).describe("1-4 directory categories that fit"),
  prompts: z.array(z.string()).describe("10 questions a real buyer would ask an AI assistant when looking for something like this"),
  listing: z.object({
    tagline: z.string().describe("At most 60 characters, no hype"),
    shortDescription: z.string().describe("At most 160 characters"),
    longDescription: z.string().describe("About 100-140 words, factual, mentions who it is for and what makes it different"),
    keywords: z.array(z.string()).describe("5-8 short tags"),
    pricing: z.string().describe("e.g. 'Free', 'Freemium', 'Paid', 'From $9/month', or 'Unknown'"),
    platforms: z.array(z.string()).describe("e.g. Web, iOS, Android, Chrome, Windows, macOS. Empty if not software"),
  }),
});

const SYSTEM = `You profile a product or business from its website so we can test whether AI assistants recommend it.
Use only what the page says plus general knowledge of the market. Never invent features, prices or claims.

Write buyer questions the way people actually type them into ChatGPT or Claude. Mix these intents:
- "best X for Y" questions for the category and audience
- "alternatives to <competitor>" questions, using the biggest competitors (this is how comparison sites drive AI answers)
- problem-first questions that never name a product ("how do I ...", "what app helps me ...")
- one or two head-to-head or "is there a cheaper/simpler ..." questions
- if the business serves a specific place, include the place in most questions
Never include the product's own name in any question.`;

export async function buildProfile(page: PageInfo, hint: { offer?: string; competitors?: string[] }): Promise<Analysis["profile"] & { prompts: string[]; by: "claude" | "page" }> {
  if (claude.configured()) {
    const res = await claudeClient().messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Website: ${page.finalUrl}
Title: ${page.title}
Site name: ${page.siteName}
Meta description: ${page.description}
H1: ${page.h1}
Language: ${page.lang}
Structured data types: ${page.jsonLdTypes.join(", ") || "none"}
${hint.offer ? `The owner describes it as: ${hint.offer}\n` : ""}${hint.competitors?.length ? `The owner names these competitors: ${hint.competitors.join(", ")}\n` : ""}
Page text (truncated):
${page.text.slice(0, 5000)}`,
        },
      ],
      output_config: { format: zodOutputFormat(ProfileSchema) },
    });
    const p = res.parsed_output;
    if (p) {
      const competitors = dedupe([...(hint.competitors ?? []), ...p.competitors]).slice(0, 10);
      return { ...p, competitors, url: page.finalUrl, domain: page.domain, prompts: dedupe(p.prompts).slice(0, 12), by: "claude" };
    }
  }
  return fromPage(page, hint);
}

/** Without Claude: a plain profile from the page, with template questions. */
function fromPage(page: PageInfo, hint: { offer?: string; competitors?: string[] }) {
  const name = (page.siteName || page.title.split(/\s[|\-–—:]\s/)[0] || page.domain.split(".")[0]).trim();
  const category = hint.offer?.trim() || page.description.split(/[.!]/)[0].slice(0, 80) || "this kind of product";
  const competitors = dedupe(hint.competitors ?? []);
  const prompts = templateQuestions(category, competitors);
  const profile: Profile = {
    url: page.finalUrl,
    domain: page.domain,
    name,
    aliases: [],
    kind: "other",
    category,
    audience: "",
    location: "",
    competitors,
    categories: ["software"],
    listing: {
      tagline: (page.description || page.title).slice(0, 60),
      shortDescription: page.description.slice(0, 160),
      longDescription: page.description,
      keywords: [],
      pricing: "Unknown",
      platforms: [],
    },
  };
  return { ...profile, prompts: dedupe(prompts).slice(0, 10), by: "page" as const };
}

function dedupe(list: string[]) {
  const seen = new Set<string>();
  return list.map((s) => s.trim()).filter((s) => s && !seen.has(s.toLowerCase()) && (seen.add(s.toLowerCase()), true));
}
