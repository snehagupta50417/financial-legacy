// Prepare source-only buildpack inputs. No credentials, databases, uploaded files or Git history.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2];
if (!target) throw new Error("Usage: node scripts/prepare-cloud.mjs <new-output-directory>");
const out = path.resolve(target);
if (fs.existsSync(out)) throw new Error("Choose a new output directory; existing files are never overwritten.");
fs.mkdirSync(out, { recursive: true });
const excluded = new Set(["node_modules", ".git", ".next", ".generated", "test", "db", ".env", ".env.local", ".env.production", ".env.development"]);
for (const service of ["backend", "frontend"]) {
  const dir = path.join(out, service); fs.mkdirSync(dir);
  for (const part of [service, "shared"]) {
    fs.cpSync(path.join(root, part), path.join(dir, part), { recursive: true, filter: file => {
      const name = path.basename(file);
      return !excluded.has(name) && (!name.startsWith(".env") || name === ".env.example") && !/\.(db|db-journal|db-wal|db-shm|log|bak)$/.test(name);
    } });
  }
  const commands = service === "backend" ? "npm ci --include=dev --prefix backend && npm run build --prefix backend" : "npm ci --include=dev --prefix frontend && npm run build --prefix frontend";
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "keeper-" + service + "-deploy", private: true, engines: { node: ">=22" }, scripts: { "gcp-build": commands, start: "npm start --prefix " + service } }, null, 2));
  fs.writeFileSync(path.join(dir, ".gcloudignore"), ".git\n**/node_modules\n**/.env\n**/.env.*\n**/*.db\n**/*.log\n");
}
console.log("Prepared source directories: " + out);
