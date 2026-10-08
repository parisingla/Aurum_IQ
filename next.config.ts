import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keeps Turbopack's watcher inside the repo — the home directory also holds an
  // unrelated package-lock.json that would otherwise be scanned.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
