import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true
  },
  // Exclude Supabase Edge Functions from Next.js build process
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'https://deno.land/std@0.168.0/http/server.ts': 'commonjs https://deno.land/std@0.168.0/http/server.ts',
        'https://esm.sh/@supabase/supabase-js@2': 'commonjs https://esm.sh/@supabase/supabase-js@2',
        'https://esm.sh/@google/generative-ai@0.2.1': 'commonjs https://esm.sh/@google/generative-ai@0.2.1'
      });
    }
    return config;
  },
  // Exclude Supabase functions directory from build
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./supabase/**/*']
    }
  }
};

export default nextConfig;
