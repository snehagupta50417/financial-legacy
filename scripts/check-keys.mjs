// Printed at the start of `npm run dev`: is the backend set up, and is Keeper's AI switched on?
// Never prints a key, only whether one is set. Stops before starting anything if setup is incomplete.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../backend");
const envPath = path.join(backend, ".env");
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

// Setup that `npm run setup` and copying .env.example normally do. Missing pieces crash the API at startup.
const missing = [];
if (!env) missing.push(["backend/.env not found", "copy backend/.env.example to backend/.env"]);
if (!fs.existsSync(path.join(backend, "node_modules/.prisma/client/schema.prisma")))
  missing.push(["Database client not generated", "npm run db:push --prefix backend   (after creating backend/.env)"]);
const dbUrl = env.match(/^DATABASE_URL="?file:([^"\s]+)"?/m)?.[1];
if (dbUrl && !fs.existsSync(path.resolve(backend, "prisma", dbUrl)))
  missing.push(["Local database not created", "npm run db:push --prefix backend"]);
if (missing.length) {
  console.log("\nKeeper isn't set up yet");
  for (const [problem, fix] of missing) console.log(`  [ ] ${problem}\n      Fix: ${fix}`);
  console.log("\nRun the fixes above, then npm run dev again.\n");
  process.exit(1);
}
const isSet = (name) => new RegExp(`^${name}="[^"\\s]{10,}"`, "m").test(env);

const gemini = isSet("GEMINI_API_KEY");
const sarvam = isSet("SARVAM_API_KEY");
const line = (ok, name, good, bad) => console.log(`  ${ok ? "[x]" : "[ ]"} ${name.padEnd(8)} ${ok ? good : bad}`);

console.log("\nKeeper's AI");
line(gemini, "Gemini", "set: Keeper can hold a real conversation and speak naturally", "NOT set: Keeper will only follow a script, so calls won't feel like a conversation.\n             Fix: stop this, run  npm run set-key  then start again.");
line(sarvam, "Sarvam", "set: Keeper understands Indian languages", "not set (optional): calls use your browser's speech recognition.\n             To add: npm run set-sarvam-key");
console.log("");
