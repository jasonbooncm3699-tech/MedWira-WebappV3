import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true
  },
  webpack: (config) => {
    // Exclude Supabase Edge Functions from Next.js build
    config.externals = config.externals || [];
    config.externals.push({
      'supabase/functions/analyze-medicine/index.ts': 'commonjs supabase/functions/analyze-medicine/index.ts'
    });
    return config;
  }
};

export default nextConfig;
