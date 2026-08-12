import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Hide the Next.js development indicator (the floating "N" badge) for a
  // cleaner, production-like preview.
  devIndicators: false,
};

export default nextConfig;
