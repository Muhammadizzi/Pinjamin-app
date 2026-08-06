import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  // Reduce cold start: standalone output for Vercel
  // Faster proxy/middleware via edge
  // Compress
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Image optimization for logo (1.6MB original, now served optimized)
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
