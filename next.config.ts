import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove 'export' to enable API routes
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
