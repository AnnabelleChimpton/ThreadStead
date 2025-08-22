import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // Custom redirects for better routing
  async redirects() {
    return [
      // DID Web specification requires DID document at /.well-known/did.json
      // Redirect to our API route that serves the DID document
      {
        source: '/.well-known/did.json',
        destination: '/api/.well-known/did.json',
        permanent: false,
      },
      // Redirect any unmatched routes to home
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
