import type { NextConfig } from "next";

/**
 * Next.js configuration.
 *
 * `transpilePackages`: workspace packages ship as TypeScript source. Next
 *   compiles them inline; without this you'd get ESM parse errors at runtime.
 *
 * `output: "standalone"`: activated via NEXT_OUTPUT=standalone env var.
 *   Produces .next/standalone — a minimal self-contained bundle ideal for
 *   Docker/Railway/Render. Omit for Vercel (Vercel handles it natively).
 *
 * `headers()`: adds browser security headers on every response. The API
 *   already applies Helmet; the frontend needs its own layer for HTML pages.
 */
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  transpilePackages: [
    "@contextos-ai/config",
    "@contextos-ai/database",
    "@contextos-ai/validators",
    "@contextos-ai/ui",
    "@fullcalendar/core",
    "@fullcalendar/react",
    "@fullcalendar/daygrid",
    "@fullcalendar/timegrid",
    "@fullcalendar/interaction",
  ],
  typedRoutes: process.env.NODE_ENV === "production",

  // Standalone output for Docker/Railway/Render deploys.
  // Set NEXT_OUTPUT=standalone in the deployment environment.
  // Do NOT set this for Vercel — it manages the output itself.
  ...(process.env.NEXT_OUTPUT === "standalone" && { output: "standalone" }),

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS: only set on production. Vercel sets it automatically;
          // this is here as defence-in-depth for non-Vercel deploys.
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default config;
