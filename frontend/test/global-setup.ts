import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

/** Creates a fresh throwaway SQLite database for tests (test/.tmp, git-ignored). */
export default function setup() {
  const dir = path.resolve(__dirname, ".tmp");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: `file:${path.join(dir, "test.db")}` },
    stdio: "ignore",
  });
}
