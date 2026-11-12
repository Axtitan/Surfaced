import type { Profile } from "./types";

/** A starter /llms.txt (https://llmstxt.org) built from the profile. */
export function llmsTxt(p: Profile) {
  const origin = new URL(p.url).origin;
  return `# ${p.name}

> ${p.listing.shortDescription || p.listing.tagline}

${p.listing.longDescription}

- Category: ${p.category}
- For: ${p.audience || "see description"}${p.location ? `\n- Serves: ${p.location}` : ""}
- Pricing: ${p.listing.pricing}${p.listing.platforms.length ? `\n- Platforms: ${p.listing.platforms.join(", ")}` : ""}${p.competitors.length ? `\n- Often compared with: ${p.competitors.slice(0, 5).join(", ")}` : ""}

## Key pages

- [Home](${origin}/): what ${p.name} is and who it's for
- [Pricing](${origin}/pricing): plans and prices
- [About](${origin}/about): the team behind ${p.name}
`;
}

/** JSON-LD for the homepage <head>. */
export function jsonLd(p: Profile) {
  const origin = new URL(p.url).origin;
  const org = { "@type": "Organization", "@id": `${origin}/#org`, name: p.name, url: origin, description: p.listing.shortDescription };
  let item: Record<string, unknown>;
  if (p.kind === "local-business") {
    item = { "@type": "LocalBusiness", name: p.name, url: origin, description: p.listing.longDescription, areaServed: p.location || undefined };
  } else if (p.kind === "ecommerce") {
    item = { "@type": "OnlineStore", name: p.name, url: origin, description: p.listing.longDescription };
  } else if (p.kind === "service") {
    item = { "@type": "ProfessionalService", name: p.name, url: origin, description: p.listing.longDescription, areaServed: p.location || undefined };
  } else {
    item = {
      "@type": p.kind === "mobile-app" ? "MobileApplication" : "SoftwareApplication",
      name: p.name,
      url: origin,
      description: p.listing.longDescription,
      applicationCategory: "BusinessApplication",
      operatingSystem: p.listing.platforms.join(", ") || "Web",
      publisher: { "@id": `${origin}/#org` },
      ...(/^free$/i.test(p.listing.pricing) ? { offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } } : {}),
    };
  }
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": [org, item] }, null, 2);
  return `<script type="application/ld+json">\n${json}\n</script>`;
}
