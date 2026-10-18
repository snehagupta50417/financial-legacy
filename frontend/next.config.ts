import type { NextConfig } from "next";
import path from "node:path";

// The API is a separate service. The browser keeps calling same-origin /api/*, and this proxy forwards
// those calls to it, so there is no CORS setup and the session header passes straight through.
// BACKEND_URL is read at BUILD time (Next compiles rewrites into the build); set it when building.
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  // Types and pure claim rules shared with the backend live in ../shared.
  turbopack: { root: path.join(__dirname, "..") },
  outputFileTracingRoot: path.join(__dirname, ".."),
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
