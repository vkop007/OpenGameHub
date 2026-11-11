import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@opengamehub/game-discovery",
    "@opengamehub/game-registry",
    "@opengamehub/game-bridge",
    "@opengamehub/game-player"
  ],
  async headers() {
    return [
      {
        source: "/_games/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin"
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
