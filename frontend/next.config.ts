import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const backendUrl = isProd
  ? "https://api.zentaralabs.com"
  : "http://localhost:5001";

const frontendUrl = isProd
  ? "https://zentaralabs.com"
  : "http://localhost:3000";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(self), browsing-topics=()",
  },
  // ─────────────────────────────────────────────────────────────────────────
  // CSP rationale (reviewed 2026-04-19):
  //
  // `script-src` and `style-src` both retain `'unsafe-inline'`. This is a
  // deliberate, documented decision, not an oversight.
  //
  // `script-src 'unsafe-inline'`: The app has zero inline <script> tags
  // (verified). Dropping this would require moving CSP to proxy.ts with a
  // per-request nonce + 'strict-dynamic'. That forces dynamic rendering on
  // all 32 currently-static routes (disables ISR, CDN caching, and PPR),
  // trading meaningful performance and cost for a marginal security gain.
  //
  // `style-src 'unsafe-inline'`: The app has ~5 dynamic inline styles for
  // runtime values (progress bar widths, chart colors) that cannot be
  // hoisted to stylesheets. Nonces for styles have the same dynamic-render
  // cost. CSS-injection exploits via `style-src 'unsafe-inline'` require a
  // pre-existing HTML-injection vuln; if that exists, an attacker already
  // has XSS and this CSP directive is not the bottleneck.
  //
  // Revisit if: (a) an HTML-injection vector is discovered; (b) the app
  // adopts a component library that requires nonces; or (c) compliance
  // requires strict CSP. See nextjs.org/docs/app/guides/content-security-policy
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: "Content-Security-Policy",
    value: [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `img-src 'self' data: blob: https: https://smart-hr-documents.s3.ap-south-1.amazonaws.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `connect-src 'self' ${backendUrl} https://*.tile.openstreetmap.org https://smart-hr-documents.s3.ap-south-1.amazonaws.com`,
      `frame-src blob:`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;