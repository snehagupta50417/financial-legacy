import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  // OCR runs native/WASM code and worker threads; load it from node_modules, not the bundle.
  serverExternalPackages: ["tesseract.js", "@napi-rs/canvas"],
};

export default nextConfig;
