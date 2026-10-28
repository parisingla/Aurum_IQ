import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Same-origin API: the FastAPI engine lives in api/ (serverless function on
  // Vercel). In dev the rewrite proxies /api/* to the local engine started
  // with `python scripts/run_backend.py`; in production it lands on the
  // function itself, which receives the original /api/* path.
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination:
        process.env.NODE_ENV === "development"
          ? "http://127.0.0.1:8000/api/:path*"
          : "/api/",
    },
  ],
  // Keeps Turbopack's watcher inside the repo — the home directory also holds an
  // unrelated package-lock.json that would otherwise be scanned.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
