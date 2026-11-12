import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
// Preview and staging deployments must not be indexed (§5.2).
const indexable = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";

/* Content-Security-Policy (§12.5). Shipped in report-only mode first; after a week with no unexpected reports set
   CSP_ENFORCE=1 to enforce it. Marketing pages are static, so there are no per-request nonces: Next.js's inline
   bootstrap scripts need 'unsafe-inline' until the app moves to nonces via proxy.ts. */
const csp = [
  "default-src 'self'",
  // In development Vercel Analytics loads its debug script from its CDN; in production it is served from this site.
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
  "report-uri /api/csp-report",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: process.env.CSP_ENFORCE === "1" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // "allow-popups" keeps free mode's one-tab-per-AI reuse working; the opened tab's opener is cleared in PasteBoard (F-15).
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-Frame-Options", value: "DENY" },
          ...(indexable ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
