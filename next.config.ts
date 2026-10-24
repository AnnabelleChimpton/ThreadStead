import type { NextConfig } from "next";
import { OLD_TUTORIALS } from "./lib/templates-docs/lessons";

const nextConfig: NextConfig = {
  // A second dev server in this checkout (e.g. a preview on another port)
  // must not share .next with the first, or each rebuild breaks the other.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  // Cloudflare compresses what node sends (Brotli for browsers that take it),
  // so node doesn't spend the one process's time gzipping every response,
  // and a cache in front of it keeps one copy, not one per encoding.
  // After a deploy: `curl -sI -H 'Accept-Encoding: br' <a page or chunk>`
  // shows content-encoding: br.
  compress: false,

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
      // Ring strips on residents' own sites (pages/api/ring/[slug]/[action].ts)
      {
        source: '/ring/:slug/:action',
        destination: '/api/ring/:slug/:action',
      },
      // RSS: a resident's public posts, and a public ring's (pages/api/feeds/*)
      {
        source: '/resident/:username/feed.xml',
        destination: '/api/feeds/resident/:username',
      },
      {
        source: '/tr/:slug/feed.xml',
        destination: '/api/feeds/ring/:slug',
      },
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
        destination: '/build',
        permanent: true,
      },

      // The docs' one front door (2026-10): /build, /build/css, /build/html.
      // Not permanent: browsers keep permanent redirects, and these may move again.
      {
        source: '/build/templates',
        destination: '/build',
        permanent: false,
      },
      {
        source: '/design-css-tutorial',
        destination: '/build/css',
        permanent: false,
      },
      {
        source: '/build/templates/tutorials',
        destination: '/build/html',
        permanent: false,
      },
      ...Object.entries(OLD_TUTORIALS).map(([slug, destination]) => ({
        source: `/build/templates/tutorials/${slug}`,
        destination,
        permanent: false,
      })),

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

      // One way into profile editing (design/profile-editing-audit PLAN
      // Phase 2). Not permanent: these paths might be reused.
      {
        source: '/resident/:username/edit',
        destination: '/settings',
        permanent: false,
      },
      {
        source: '/settings/profile',
        destination: '/settings',
        permanent: false,
      },
      {
        // The template editor is the HTML editor; CSS-only editing is the CSS editor
        source: '/resident/:username/template-editor',
        has: [{ type: 'query', key: 'mode', value: 'css' }],
        destination: '/resident/:username/css-editor',
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
              // unsafe-inline needed for Next.js, unsafe-eval only for dev tooling. No analytics hosts: the site promises no tracking.
              // wasm-unsafe-eval lets WebAssembly compile (not JS eval): the music sampler's audio thread
              // starts its decoder before it will load any sound bank (lib/audio/engines/sampler.ts)
              `script-src 'self' 'wasm-unsafe-eval' ${process.env.NODE_ENV !== 'production' ? "'unsafe-eval' " : ''}'unsafe-inline'`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // unsafe-inline needed for styled-components/CSS-in-JS
              // Fonts from any https host: a page's own @font-face (its Neocities pixel font) loads, like its images
              "font-src 'self' https: data:",
              "img-src 'self' https: data: blob:",
              "media-src 'self' https: data:",
              "connect-src 'self' https:",
              "worker-src 'self' blob:",
              // <Embed>'s players, loaded only after a visitor clicks (lib/templates/embeds.ts EMBED_HOSTS)
              "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://bandcamp.com https://w.soundcloud.com https://open.spotify.com",
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
