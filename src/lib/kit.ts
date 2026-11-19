import type { Destination, Profile } from "./types";

/* The listing kit (§9.9) and its per-destination variants. A variant only rearranges and shortens what the user wrote in
   their kit: it never adds a claim, a number or a feature. Limits are the ones each kind of site enforces or expects;
   where a site's exact limit isn't known, the kit's own limits (tagline 60, short description 160) apply. */

export type Kit = {
  name: string; url: string; tagline: string; shortDescription: string; longDescription: string; keywords: string;
  pricing: string; platforms: string; alternativeTo: string; email: string; logoUrl: string; twitter: string;
};

export function kitFrom(p: Profile): Kit {
  return {
    name: p.name, url: p.url, tagline: p.listing.tagline, shortDescription: p.listing.shortDescription, longDescription: p.listing.longDescription,
    keywords: p.listing.keywords.join(", "), pricing: p.listing.pricing, platforms: p.listing.platforms.join(", "),
    alternativeTo: p.competitors.slice(0, 5).join(", "), email: "", logoUrl: "", twitter: "",
  };
}

export type KitField = { label: string; text: string; max?: number; area?: boolean };
export type KitVariant = {
  /** What this version is for, shown above the fields. */
  title: string;
  fields: KitField[];
  tips: string[];
  /** Kit values to hand the extension for this site's form, when the site has a form. */
  overrides?: Partial<Kit>;
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Shortens text to `max` characters: whole sentences if they fit, else whole words with an ellipsis. */
export function fit(text: string, max: number): string {
  const t = clean(text);
  if (t.length <= max) return t;
  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [];
  let out = "";
  for (const s of sentences) {
    if ((out + s).trim().length > max) break;
    out += s;
  }
  if (out.trim()) return out.trim();
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, "") + "…";
}

/** The first sentence of a text, without its closing punctuation. */
const firstSentence = (s: string) => clean(s).split(/(?<=[.!?])\s/)[0]?.replace(/[.!?]+$/, "") ?? "";
const sentence = (s: string) => { const t = clean(s).replace(/[\s.!?]+$/, ""); return t ? `${t[0].toUpperCase()}${t.slice(1)}.` : ""; };
const lower = (s: string) => (s && !/^[A-Z]{2}/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
/** A short "what it is" phrase for titles: the tagline, else the first sentence of the short description. */
const what = (k: Kit) => {
  const t = clean(k.tagline).replace(/[.!?]+$/, "") || firstSentence(k.shortDescription);
  return t.toLowerCase().startsWith(k.name.toLowerCase()) ? t : lower(t);
};

const LISTING_PROFILES = new Set(["google-business-profile", "bing-places", "yelp", "tripadvisor", "hotfrog", "show-me-local", "crunchbase", "tracxn", "pitchbook"]);
// Launch sites whose limits are known; others get the same shape with the kit's own limits.
const LAUNCH_LIMITS: Record<string, { tagline: number; description: number }> = {
  "product-hunt": { tagline: 60, description: 260 },
};

function directory(d: Destination, k: Kit): KitVariant {
  const tagline = fit(k.tagline, 60), short = fit(k.shortDescription, 160);
  return {
    title: `The standard listing for ${d.name}`,
    fields: [
      { label: "Name", text: k.name }, { label: "Website", text: k.url },
      { label: "Tagline", text: tagline, max: 60 }, { label: "Short description", text: short, max: 160 },
      { label: "Full description", text: clean(k.longDescription), area: true },
      ...(k.alternativeTo ? [{ label: "Alternative to", text: k.alternativeTo }] : []),
      { label: "Categories and tags", text: k.keywords }, { label: "Pricing", text: k.pricing },
    ],
    tips: [
      "Pick the most specific category the site offers; it decides which comparison pages you appear on.",
      ...(k.alternativeTo ? [`If the site has an "alternative to" field, add ${k.alternativeTo.split(",")[0].trim()}: that is the page AIs often quote.`] : []),
      "Use the same name, tagline and description everywhere, so AIs see one consistent story.",
    ],
    overrides: { tagline, shortDescription: short },
  };
}

function launch(d: Destination, k: Kit): KitVariant {
  const lim = LAUNCH_LIMITS[d.slug] ?? { tagline: 60, description: 260 };
  const tagline = fit(k.tagline, lim.tagline);
  const description = fit(k.longDescription || k.shortDescription, lim.description);
  const comment = [
    what(k) ? `Hi! I'm sharing ${k.name}: ${what(k)}.` : `Hi! I'm sharing ${k.name}.`,
    k.longDescription ? fit(k.longDescription, 400) : "",
    k.alternativeTo ? `If you use ${k.alternativeTo.split(",")[0].trim()} today, I'd like to hear how it compares.` : "",
    "Feedback welcome, good or bad.",
  ].filter(Boolean).join("\n\n");
  return {
    title: `A launch post for ${d.name}`,
    fields: [
      { label: "Name", text: k.name }, { label: "Tagline", text: tagline, max: lim.tagline },
      { label: "Description", text: description, max: lim.description, area: true },
      { label: "First comment from you", text: comment, area: true },
      { label: "Topics", text: k.keywords },
    ],
    tips: [
      "Launch early in the site's day (Product Hunt resets at 12:01 a.m. Pacific) and stay around to answer comments.",
      "Ask people to try it and comment, not to upvote: most launch sites penalise vote requests.",
      "Add 3–5 screenshots or a short video; listings without images get little attention.",
    ],
    overrides: { tagline, shortDescription: fit(k.shortDescription, Math.min(160, lim.description)) },
  };
}

function awesomeList(d: Destination, k: Kit): KitVariant {
  const desc = sentence(fit(firstSentence(k.shortDescription) || k.tagline, 100));
  return {
    title: `A one-line entry for ${d.name}`,
    fields: [{ label: "List entry (Markdown)", text: `- [${k.name}](${k.url}) - ${desc}` }],
    tips: [
      "Read the list's CONTRIBUTING file first: most want one entry per pull request, in alphabetical order, in the right section.",
      "Keep the description plain: no \"best\", \"awesome\" or exclamation marks. Maintainers reject marketing copy.",
      "Only suggest lists your product genuinely fits; off-topic entries are closed and can get you blocked.",
    ],
  };
}

function subreddit(d: Destination, k: Kit): KitVariant {
  const title = fit(what(k) ? `I built ${k.name}: ${what(k)}` : `I built ${k.name}`, 120);
  const body = [
    `I made ${k.name} (${k.url}). ${sentence(k.shortDescription || k.tagline)}`,
    k.longDescription ? fit(k.longDescription, 600) : "",
    k.pricing ? `Pricing: ${k.pricing}.`.replace(/\.\.$/, ".") : "",
    "I'd appreciate honest feedback, especially on what's missing.",
  ].filter(Boolean).join("\n\n");
  return {
    title: `A post for ${d.name}`,
    fields: [{ label: "Post title", text: title, max: 300 }, { label: "Post body", text: body, area: true }],
    tips: [
      "Read the subreddit's rules first: many ban self-promotion outright or allow it only in a weekly thread.",
      "Say plainly that you made it. Hidden promotion gets removed and can get the domain banned across Reddit.",
      "Reply to every comment in the first few hours; that's what keeps the post visible.",
    ],
  };
}

function community(d: Destination, k: Kit): KitVariant {
  const body = [`${sentence(k.shortDescription || k.tagline)}`, k.longDescription ? fit(k.longDescription, 600) : "", `${k.url}`].filter(Boolean).join("\n\n");
  return {
    title: `An introduction for ${d.name}`,
    fields: [{ label: "Title", text: fit(`${k.name}: ${k.tagline}`, 100) }, { label: "Post", text: body, area: true }],
    tips: [
      "Lead with what you learned or what problem you solved; communities reward useful posts, not announcements.",
      "Fill in your profile with a link to your site first: that's the link that lasts.",
    ],
  };
}

function marketplace(d: Destination, k: Kit): KitVariant {
  const v = directory(d, k);
  return {
    ...v,
    title: `A store listing for ${d.name}`,
    tips: [
      "Marketplaces review each listing: have the privacy policy link, support contact and screenshots ready before you start.",
      "Write the short description for someone searching the store: what it does and who it's for, in plain words.",
      ...v.tips.slice(-1),
    ],
  };
}

function pitch(d: Destination, k: Kit, kind: "newsletter" | "press"): KitVariant {
  const subject = fit(`${k.name}: ${k.tagline}`, 78);
  const body = [
    "Hi,",
    `I'm writing about ${k.name} (${k.url}). ${sentence(k.shortDescription || k.tagline)}`,
    [k.alternativeTo ? `It's an alternative to ${k.alternativeTo.split(",").slice(0, 2).map((s) => s.trim()).join(" and ")}.` : "", k.pricing ? `Pricing: ${k.pricing.replace(/\.$/, "")}.` : ""].filter(Boolean).join(" "),
    kind === "newsletter"
      ? `If it fits a future issue of ${d.name}, I'm happy to send screenshots or answer questions.`
      : `If you're covering this space, I'm happy to give you a demo or answer questions.`,
    "Thanks for reading,",
  ].filter(Boolean).join("\n\n");
  return {
    title: kind === "newsletter" ? `A pitch to ${d.name}` : `A pitch to ${d.name}'s editors`,
    fields: [{ label: "Subject", text: subject, max: 78 }, { label: "Email", text: body, area: true }],
    tips: [
      kind === "newsletter" ? "Many newsletters list a tips address or a sponsorship page; use the tips address for free mentions." : "Find the writer who covers your category and email them, not a general inbox.",
      "Keep it under 150 words and send one follow-up at most, a week later.",
    ],
  };
}

function hackerNews(k: Kit): KitVariant {
  const title = fit(what(k) ? `Show HN: ${k.name} – ${what(k)}` : `Show HN: ${k.name}`, 80);
  const text = [sentence(k.shortDescription || k.tagline), k.longDescription ? fit(k.longDescription, 800) : "", "Happy to answer questions."].filter(Boolean).join("\n\n");
  return {
    title: "A Show HN post",
    fields: [{ label: "Title", text: title, max: 80 }, { label: "URL", text: k.url }, { label: "Text", text, area: true }],
    tips: [
      "Show HN is for things people can try now: no sign-up walls or waiting lists.",
      "Write the text as the maker, plainly; marketing language does badly. Stay to answer comments.",
    ],
  };
}

/** The version of the kit to use on one destination. */
export function kitFor(d: Destination, k: Kit): KitVariant {
  if (d.slug === "hacker-news") return hackerNews(k);
  if (d.slug === "wikipedia") return {
    title: "Wikipedia",
    fields: [],
    tips: [
      "Don't write or edit an article about your own company: Wikipedia's conflict-of-interest rules forbid it, and such articles are deleted.",
      "Articles follow independent coverage. Earn press first; an editor may then write one.",
    ],
  };
  if (LISTING_PROFILES.has(d.slug)) return { ...directory(d, k), title: `Your profile on ${d.name}` };
  switch (d.type) {
    case "product-launch-site": return launch(d, k);
    case "github": return awesomeList(d, k);
    case "subreddit": return subreddit(d, k);
    case "community": return community(d, k);
    case "marketplace": return marketplace(d, k);
    case "newsletter": return pitch(d, k, "newsletter");
    case "citation": return pitch(d, k, "press");
    default: return directory(d, k);
  }
}
