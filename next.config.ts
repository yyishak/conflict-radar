import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Page uses Supabase real-time — skip static pre-rendering
  output: 'standalone',
};

export default nextConfig;
