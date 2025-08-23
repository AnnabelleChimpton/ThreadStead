/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Rewrite user DID document paths to API routes
  async rewrites() {
    return [
      {
        source: '/users/:hash/did.json',
        destination: '/api/did/:hash/document',
      },
    ]
  },
}

module.exports = nextConfig