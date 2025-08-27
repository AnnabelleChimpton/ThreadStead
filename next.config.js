/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configure external image domains
  images: {
    domains: ['cdn.homepageagain.com'],
  },
  
  // Rewrite user DID document paths to API routes
  async rewrites() {
    return [
      {
        source: '/users/:hash/did.json',
        destination: '/api/did/:hash/document',
      },
      {
        source: '/.well-known/did/users/:hash/did.json',
        destination: '/api/did/:hash/document',
      },
    ]
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
    ]
  },
}

module.exports = nextConfig