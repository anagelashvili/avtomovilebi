import type { NextConfig } from "next";

// The Django API. The browser never calls it directly: /api/* and /media/*
// on this site are proxied to it, so login cookies stay on one domain.
const apiUrl = new URL(process.env.API_URL ?? "http://127.0.0.1:8000");
const api = apiUrl.origin;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Django URLs end in "/"; keep them as they are when proxying.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/:path*/", destination: `${api}/api/:path*/` },
      { source: "/api/:path*", destination: `${api}/api/:path*` },
      { source: "/media/:path*", destination: `${api}/media/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: "/media/**",
      },
      // Production photos come from S3/R2; set PHOTOS_HOST to its public host.
      ...(process.env.PHOTOS_HOST
        ? [{ protocol: "https" as const, hostname: process.env.PHOTOS_HOST }]
        : []),
    ],
    // Local dev API runs on 127.0.0.1, which next/image blocks by default.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
