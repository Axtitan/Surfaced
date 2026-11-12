import { CONTACT, SITE_URL } from "@/lib/site-url";

/* RFC 9116 security.txt (§12.13). Served only once SECURITY_CONTACT (or NEXT_PUBLIC_SUPPORT_EMAIL) is configured, so
   the site never publishes a contact nobody reads. */
export function GET() {
  const c = CONTACT.security;
  if (!c) return new Response("Not found", { status: 404 });
  const contact = /^(mailto:|https:)/.test(c) ? c : `mailto:${c}`;
  const expires = new Date(Date.now() + 180 * 86_400_000).toISOString();
  const body = `Contact: ${contact}\nExpires: ${expires}\nPreferred-Languages: en\nCanonical: ${SITE_URL}/.well-known/security.txt\nPolicy: ${SITE_URL}/security\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" } });
}
