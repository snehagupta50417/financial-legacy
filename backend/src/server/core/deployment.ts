import { authConfig, appOrigin } from "./supabase-auth";
export function checkDeployment() {
  if (process.env.NODE_ENV !== "production") return;
  if (!/^postgres(ql)?:/.test(process.env.DATABASE_URL || "")) throw new Error("Hosted Keeper requires external PostgreSQL. Local SQLite is not durable on Cloud Run.");
  if (new URL(process.env.DATABASE_URL!).searchParams.get("schema") !== "keeper") throw new Error("Hosted PostgreSQL must use the private keeper schema (?schema=keeper).");
  if (!authConfig()) throw new Error("Hosted Keeper requires configured Supabase authentication.");
  if (!process.env.PUBLIC_APP_URL || !appOrigin().startsWith("https:")) throw new Error("Set PUBLIC_APP_URL to the HTTPS frontend URL.");
}
