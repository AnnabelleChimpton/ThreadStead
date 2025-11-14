import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: false,
  },

  // Configure external image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS images
      },
      {
        protocol: 'http',
        hostname: '**', // Allow all HTTP images
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
      {
        source: '/feed',
        destination: '/discover/feed',
        permanent: true,
      },
      {
        source: '/directory',
        destination: '/discover/residents',
        permanent: true,
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

      // Threadrings redirects
      {
        source: '/threadrings/create',
        destination: '/tr/spool/fork',
        permanent: true,
      },
      {
        source: '/threadrings/:slug',
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline needed for Next.js, unsafe-eval for dev
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // unsafe-inline needed for styled-components/CSS-in-JS
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' https: data: blob:",
              "media-src 'self' https: data:",
              "connect-src 'self' https:",
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
