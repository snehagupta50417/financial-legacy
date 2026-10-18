// Compose a private connection URL from the local draft; never prints credentials or activates it.
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env.hosted");
let source = readFileSync(file, "utf8");
const values = parseEnv(source);
if (!values.SUPABASE_DB_PASSWORD && !values.DATABASE_URL) {
  console.log("Waiting for the database password in the private .env.hosted file."); process.exit(2);
}
if (values.SUPABASE_DB_PASSWORD) {
  if (!/^[a-z0-9.-]+\.pooler\.supabase\.com$/i.test(values.SUPABASE_DB_HOST || "")) throw new Error("Invalid Supabase pooler host");
  const url = new URL("postgresql://" + values.SUPABASE_DB_HOST + ":5432/postgres");
  url.username = values.SUPABASE_DB_USER || "postgres";
  url.password = values.SUPABASE_DB_PASSWORD;
  url.searchParams.set("schema", "keeper"); url.searchParams.set("connection_limit", "3"); url.searchParams.set("sslmode", "require");
  const line = "DATABASE_URL=" + JSON.stringify(url.href);
  source = /^DATABASE_URL=.*$/m.test(source) ? source.replace(/^DATABASE_URL=.*$/m, () => line) : source + "\n" + line + "\n";
  source = source.replace(/^SUPABASE_DB_PASSWORD=.*$/m, 'SUPABASE_DB_PASSWORD=""');
  writeFileSync(file, source);
}
console.log("Private hosted connection URL is prepared. Local demo configuration has not been activated or changed.");
