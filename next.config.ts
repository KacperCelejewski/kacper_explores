import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Folder nadrzędny ma własny package-lock.json — bez tego Next bierze go za root workspace
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
  experimental: {
    // Max request body size for API routes: 64KB (quiz data + destination, nie potrzeba więcej)
    serverActions: {
      bodySizeLimit: "64kb",
    },
  },
  // Krótki link do bio na Instagramie: dopisuje UTM, żeby ruch z IG był widoczny w GA4.
  // Tymczasowy (307), żeby dało się go później skierować gdzie indziej bez cache'u w przeglądarkach.
  async redirects() {
    return [
      {
        source: "/ig",
        destination: "/?utm_source=instagram&utm_medium=social&utm_campaign=bio",
        permanent: false,
      },
      // Usunięte trasy: stare linki i zakładki nie kończą na 404
      { source: "/flights", destination: "/destinations", permanent: true },
      { source: "/start", destination: "/", permanent: true },
      // Crawlery i strony bez <link rel=icon> pytają o /favicon.ico; ikonę generuje src/app/icon.tsx
      { source: "/favicon.ico", destination: "/icon", permanent: false },
    ];
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
