// Generate the correct Prisma client without replacing the local SQLite schema or database.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const action = process.argv[2] || "generate";
const postgres = process.env.KEEPER_DB_PROVIDER === "postgres" || /^postgres(ql)?:/.test(process.env.DATABASE_URL || "") || process.env.NODE_ENV === "production";
let schema = path.join(root, "prisma/schema.prisma");
if (postgres) {
  const dir = path.join(root, "prisma/.generated"); mkdirSync(dir, { recursive: true });
  schema = path.join(dir, "schema.prisma");
  writeFileSync(schema, readFileSync(path.join(root, "prisma/schema.prisma"), "utf8").replace('provider = "sqlite"', 'provider = "postgresql"'));
}
const prisma = path.join(root, "node_modules/prisma/build/index.js");
function run(args, env = process.env) {
  const result = spawnSync(process.execPath, [prisma, ...args, "--schema", schema], { cwd: root, env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
if (action === "schema") { console.log(schema); process.exit(0); }
if (action === "push") {
  if (postgres && !/^postgres(ql)?:/.test(process.env.DATABASE_URL || "")) throw new Error("Set the hosted PostgreSQL connection URL in backend/.env first.");
  if (postgres && new URL(process.env.DATABASE_URL).searchParams.get("schema") !== "keeper") throw new Error("Use ?schema=keeper on the PostgreSQL URL so application tables stay out of the public API schema.");
  // No --accept-data-loss. This is explicit setup, never part of application startup.
  run(["db", "push", "--skip-generate"]);
} else if (action === "generate") {
  run(["generate"], postgres ? { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "postgresql://build:build@localhost:5432/build?schema=keeper" } : process.env);
} else throw new Error("Use generate or push");
