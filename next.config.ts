import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second dev server in this checkout (e.g. a preview on another port)
  // must not share .next with the first, or each rebuild breaks the other.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,

  eslint: {
    ignoreDuringBuilds: false,
  },

  // Configure webpack to handle SVG imports with SVGR
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },

  // Configure external image domains.
  // HTTPS-only: user-supplied images can come from anywhere, but proxying
  // plain-HTTP origins through the optimizer invites mixed-content abuse.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS images
      },
    ],
  },

  // Rewrite DID document paths to API routes
  async rewrites() {
    return [
      // Server DID document
      {
        source: '/.well-known/did.json',
        destination: '/api/.well-known/did.json',
      },
      // User DID documents
      {
        source: '/users/:hash/did.json',
        destination: '/api/did/:hash/document',
      },
      {
        source: '/.well-known/did/users/:hash/did.json',
        destination: '/api/did/:hash/document',
      },
    ];
  },

  // Redirects from old URLs to new patterns
  async redirects() {
    return [
      // Deprecated identity page redirects to settings
      {
        source: '/identity',
        destination: '/settings',
        permanent: true,
      },

      // Navigation refactor redirects - Discover hub
      // /feed is the real page (PRODUCT_UX_AUDIT §4). /discover/feed is NOT
      // redirected: production sent a permanent /feed → /discover/feed,
      // browsers cache 308s, and a redirect back would loop for them.
      // pages/discover/feed.tsx serves the same page with a /feed canonical.
      {
        source: '/directory',
        destination: '/neighborhood/residents',
        permanent: true,
      },
      {
        // Never existed as a page; old "Browse →" link pointed here
        source: '/community-index/discover',
        destination: '/search?scope=indie',
        permanent: true,
      },
      // The old community index pages became /indie (SEARCH_PLAN.md §3.5).
      // Not permanent: browsers cache 308s, and these paths might be reused.
      {
        source: '/community-index/:page(submit|validate|analytics)',
        destination: '/indie',
        permanent: false,
      },
      {
        source: '/community-index',
        destination: '/indie',
        permanent: false,
      },
      {
        source: '/admin/:page(community-index|crawler|auto-validation|curated-sites)',
        destination: '/admin/indie',
        permanent: false,
      },

      // Navigation refactor redirects - Build hub
      {
        source: '/templates/:path*',
        destination: '/build/templates/:path*',
        permanent: true,
      },
      {
        source: '/getting-started',
        destination: '/build/getting-started',
        permanent: true,
      },
      {
        source: '/design-tutorial',
        destination: '/build/templates',
        permanent: true,
      },

      // Navigation refactor redirects - Help hub
      {
        source: '/community-guidelines',
        destination: '/help/guidelines',
        permanent: true,
      },
      {
        source: '/privacy',
        destination: '/help/privacy',
        permanent: true,
      },
      {
        source: '/terms',
        destination: '/help/terms',
        permanent: true,
      },

      // Community is one place with tabs (PRODUCT_UX_AUDIT §4)
      {
        source: '/bulletin',
        destination: '/community',
        permanent: true,
      },
      {
        source: '/chat',
        destination: '/community/chat',
        permanent: true,
      },
      {
        source: '/news',
        destination: '/community/news',
        permanent: true,
      },
      {
        source: '/news/:id',
        destination: '/community/news/:id',
        permanent: true,
      },

      // One street at /neighborhood (PRODUCT_UX_AUDIT §4). Discover's items
      // became top-level, so /discover itself goes to the street; an old
      // search link (/discover?q=…) goes to search.
      {
        source: '/discover',
        has: [{ type: 'query', key: 'q' }],
        destination: '/search',
        permanent: false,
      },
      {
        source: '/discover',
        destination: '/neighborhood',
        permanent: true,
      },
      {
        source: '/discover/residents',
        destination: '/neighborhood/residents',
        permanent: true,
      },
      {
        // All / Recent / Popular were the same list in the same order
        source: '/neighborhood/explore/random',
        destination: '/neighborhood/random',
        permanent: true,
      },
      {
        source: '/neighborhood/explore/:sort',
        destination: '/neighborhood',
        permanent: true,
      },
      {
        // The mutual-friends streets were never finished. Not permanent, so
        // a friends street could live here one day without a cached redirect.
        source: '/neighborhood/mutual/:param',
        destination: '/neighborhood',
        permanent: false,
      },
      {
        source: '/neighborhood/mutual-friends/:username',
        destination: '/neighborhood',
        permanent: false,
      },
      {
        // ?template=, ?palette= and ?activeOnly= carry over as filters
        source: '/explore/homes',
        destination: '/neighborhood',
        permanent: true,
      },

      // Every admin page lives under /admin
      {
        source: '/settings/admin',
        destination: '/admin',
        permanent: true,
      },
      {
        source: '/settings',
        has: [{ type: 'query', key: 'tab', value: 'admin' }],
        destination: '/admin',
        permanent: false,
      },

      // Old ring-neighborhood URL
      {
        source: '/rings/:slug/neighborhood',
        destination: '/neighborhood/ring/:slug',
        permanent: true,
      },

      // Threadrings redirects
      {
        source: '/threadrings/create',
        destination: '/tr/spool/fork',
        permanent: true,
      },
      {
        // Redirect ring slugs to /tr/:slug, but exclude static pages like 'genealogy'
        source: '/threadrings/:slug((?!genealogy$).*)',
        destination: '/tr/:slug',
        permanent: true,
      },
      {
        source: '/threadrings/:slug/members',
        destination: '/tr/:slug/members',
        permanent: true,
      },
      {
        source: '/threadrings/:slug/settings',
        destination: '/tr/:slug/settings',
        permanent: true,
      },
      {
        source: '/threadrings/:slug/fork',
        destination: '/tr/:slug/fork',
        permanent: true,
      },
      {
        source: '/threadrings/:slug/prompts/:promptId/responses',
        destination: '/tr/:slug/prompts/:promptId/responses',
        permanent: true,
      },

      // Redirect 404 to home (from original next.config.ts)
      {
        source: '/404',
        destination: '/',
        permanent: false,
      },
    ];
  },

  // Handle trailing slashes consistently
  trailingSlash: false,

  // Security headers to protect against XSS, clickjacking, and other attacks
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' ${process.env.NODE_ENV !== 'production' ? "'unsafe-eval' " : ''}'unsafe-inline' https://static.cloudflareinsights.com`, // unsafe-inline needed for Next.js, unsafe-eval only for dev tooling
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // unsafe-inline needed for styled-components/CSS-in-JS
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' https: data: blob:",
              "media-src 'self' https: data:",
              "connect-src 'self' https:",
              "worker-src 'self' blob:",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
