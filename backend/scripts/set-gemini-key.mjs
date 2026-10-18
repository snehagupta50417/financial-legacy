// Stores your Gemini API key in backend/.env (git-ignored) without ever printing it, then checks that
// Google accepts it. Run it yourself from the repository root:   npm run set-key
// The key is never written to any other file, and is not sent anywhere except to Google to check it.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(dir, ".env");
const examplePath = path.join(dir, ".env.example");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let hidden = false;
rl._writeToOutput = (s) => { if (!hidden) process.stdout.write(s); else if (s.includes("\n")) process.stdout.write("\n"); };

process.stdout.write("Paste your Gemini API key (it will not be shown), then press Enter: ");
hidden = true;
rl.question("", async (answer) => {
  rl.close();
  const key = answer.trim().replace(/^["']|["']$/g, "");
  if (key.length < 20 || /\s/.test(key)) {
    console.error("That doesn't look like an API key. Nothing was saved.");
    process.exit(1);
  }
  const base = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : fs.existsSync(examplePath) ? fs.readFileSync(examplePath, "utf8") : "";
  const eol = base.includes("\r\n") ? "\r\n" : "\n";
  const line = `GEMINI_API_KEY="${key}"`;
  const next = /^GEMINI_API_KEY=.*$/m.test(base) ? base.replace(/^GEMINI_API_KEY=.*$/m, line) : base + (base && !base.endsWith("\n") ? eol : "") + line + eol;
  fs.writeFileSync(envPath, next);
  console.log("Saved to backend/.env (this file is git-ignored).");

  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": key } });
    console.log(res.ok ? "Google accepted the key." : `Google did not accept the key (status ${res.status}). Check it and run this again.`);
  } catch {
    console.log("Could not reach Google to check the key. It is saved; you can try Keeper and see.");
  }
  console.log("Restart the API (npm run dev) so it picks the key up. Then turn on AI help in the app when it asks.");
});
