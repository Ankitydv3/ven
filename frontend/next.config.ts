import type { NextConfig } from "next";
import path from "node:path";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    // Monorepo has a lockfile at the parent level; pin Turbopack to this app.
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
