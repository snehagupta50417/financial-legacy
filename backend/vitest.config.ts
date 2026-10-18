import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@server": path.resolve(__dirname, "src/server"),
      "@api": path.resolve(__dirname, "src/api"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    env: {
      AUTH_MODE: "demo",
      DATABASE_URL: `file:${path.resolve(__dirname, "test/.tmp/test.db")}`,
      // Tests never call a real model unless LIVE_AI=1 is set explicitly.
      GEMINI_API_KEY: process.env.LIVE_AI ? (process.env.GEMINI_API_KEY ?? "") : "",
      // A key in backend/.env must never reach the tests (Prisma loads that file).
      SARVAM_API_KEY: "",
      SARVAM_FALLBACK_API_KEY: "",
      GEMINI_FALLBACK_API_KEY: "",
      GOOGLE_CLOUD_PROJECT: process.env.LIVE_AI ? (process.env.GOOGLE_CLOUD_PROJECT ?? "") : "",
    },
    // Route tests share one SQLite file; run files serially.
    fileParallelism: false,
  },
});
