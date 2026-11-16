/** @type {import('next').NextConfig} */
// Baked into client bundles at build time; /api/keepalive reports the live
// deployment's id so stale tabs can offer a reload after a new deploy.
// Falls back to a timestamp, so every build has a distinct id on any host.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID_OVERRIDE || `build-${Date.now()}`;

// Hosts allowed to load dev-only resources (HMR, dev chunks). Set through the
// ALLOWED_DEV_ORIGINS env var so a preview hostname never gets baked into the
// repo; empty in production.
const devOrigins = (process.env.ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig = {
    allowedDevOrigins: devOrigins,
    env: {
      NEXT_PUBLIC_BUILD_ID: BUILD_ID,
    },
    // Keep Prisma's generated client out of the bundler so its native query
    // engine is loaded at runtime rather than traced into the server bundle.
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
