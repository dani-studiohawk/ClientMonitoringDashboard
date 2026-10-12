import type { NextConfig } from "next";

// The Content-Security-Policy is set per request in src/middleware.ts (it needs a nonce).

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // Moved under Settings; Slack messages already sent link to the old path
    return [
      { source: "/dashboard/removed-clients", destination: "/dashboard/settings/removed-clients", permanent: true },
    ];
  },
};

export default nextConfig;
