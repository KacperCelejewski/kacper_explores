import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Max request body size for API routes: 64KB (quiz data + destination, nie potrzeba więcej)
    serverActions: {
      bodySizeLimit: "64kb",
    },
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
