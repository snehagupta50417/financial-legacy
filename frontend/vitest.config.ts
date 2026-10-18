import { defineConfig } from "vitest/config";
import path from "node:path";

// Most tests here are pure (the Keeper engine). `test/integration` also runs the real backend route
// handlers against a throwaway database to prove the adapter and the API still agree.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../shared"),
      "@server": path.resolve(__dirname, "../backend/src/server"),
      "@api": path.resolve(__dirname, "../backend/src/api"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/integration/global-setup.ts"],
    env: {
      DATABASE_URL: `file:${path.resolve(__dirname, "test/.tmp/test.db")}`,
      GEMINI_API_KEY: "",
      GOOGLE_CLOUD_PROJECT: "",
    },
    fileParallelism: false,
  },
});
