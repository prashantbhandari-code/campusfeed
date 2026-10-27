/** @type {import('next').NextConfig} */
// Baked into client bundles at build time; /api/keepalive reports the live
// deployment's id so stale tabs can offer a reload after a new deploy.
const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_ID_OVERRIDE ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  `build-${Date.now()}`;  const nextConfig = {
    env: {
      NEXT_PUBLIC_BUILD_ID: BUILD_ID,
    },
    // Keep Prisma's generated client out of the bundler so OpenNext can ship
    // it to workerd with its WASM query engine intact.
    serverExternalPackages: ['@prisma/client', '.prisma/client'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    // Seeded and Google-created avatars are SVGs (dicebear). Next's optimizer
    // refuses SVG unless this is enabled, which broke those avatars with
    // 'type "image/svg+xml" but dangerouslyAllowSVG is disabled'.
    // The CSP below neutralises the usual SVG script risk: no scripts, sandboxed.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' ws: wss: https:",
              "media-src 'self' blob: https://cloud.appwrite.io",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;

// Initialize OpenNext Cloudflare for development only (Freebuff/Wrangler
// local preview). On Render/Vercel production builds this must not run.
if (process.env.NODE_ENV === "development") {
  import('@opennextjs/cloudflare').then(m =>
    m.initOpenNextCloudflareForDev({ configPath: './freebuff.wrangler.jsonc' })
  );
}
