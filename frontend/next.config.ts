import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Monorepo has a lockfile at the parent level; pin Turbopack to this app.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
