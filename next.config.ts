import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable API routes for Netlify
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Ensure proper build for Netlify
  experimental: {
    runtime: 'nodejs'
  }
};

export default nextConfig;
