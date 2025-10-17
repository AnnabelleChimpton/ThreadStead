import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: false,
  },

  // Configure external image domains
  images: {
    domains: ['cdn.homepageagain.com'],
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

      // Design tutorial redirect to unified templates hub
      {
        source: '/design-tutorial',
        destination: '/templates',
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
};

export default nextConfig;
