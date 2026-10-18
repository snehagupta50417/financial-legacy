// Stores an API key in backend/.env (git-ignored) without ever printing it, then checks that the provider
// accepts it. Run it yourself from the repository root:
//   npm run set-key          (Gemini: Keeper's brain and voice)
//   npm run set-sarvam-key   (Sarvam: speech to text in Indian languages)
//   npm run set-key-backup / set-sarvam-key-backup   (a second key, used only if the first is rejected or out of quota)
// A key is never written to any other file, and is sent only to its own provider, to be checked.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(dir, ".env");
const examplePath = path.join(dir, ".env.example");

const PROVIDERS = {
  gemini: {
    label: "Gemini",
    env: "GEMINI_API_KEY",
    restart: "Then turn on AI help in the app when it asks.",
    async check(key) {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": key } });
      return res.ok ? "accepted" : res.status === 400 || res.status === 401 || res.status === 403 ? "rejected" : "unknown";
    },
  },
  sarvam: {
    label: "Sarvam",
    env: "SARVAM_API_KEY",
    restart: "Then turn on AI help in the app, and speak in any Indian language on a call.",
    // An empty request is refused either way; whether it is refused as unauthorised tells us if the key is real.
    async check(key) {
      const res = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": key }, body: new FormData() });
      return res.status === 401 || res.status === 403 ? "rejected" : "accepted";
    },
  },
};

const which = (process.argv[2] || "gemini").toLowerCase();
const provider = PROVIDERS[which];
if (!provider) {
  console.error(`Unknown provider "${which}". Use: ${Object.keys(PROVIDERS).join(", ")}`);
  process.exit(1);
}

// "backup" stores the secondary key (<PROVIDER>_FALLBACK_API_KEY), used only when the primary is rejected or out of quota.
const backup = (process.argv[3] || "").toLowerCase() === "backup";
const envName = backup ? provider.env.replace("_API_KEY", "_FALLBACK_API_KEY") : provider.env;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let hidden = false;
rl._writeToOutput = (s) => { if (!hidden) process.stdout.write(s); else if (s.includes("\n")) process.stdout.write("\n"); };

process.stdout.write(`Paste your ${backup ? "backup " : ""}${provider.label} API key (it will not be shown), then press Enter: `);
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
  const line = `${envName}="${key}"`;
  const pattern = new RegExp(`^${envName}=.*$`, "m");
  const next = pattern.test(base) ? base.replace(pattern, () => line) : base + (base && !base.endsWith("\n") ? eol : "") + line + eol;
  fs.writeFileSync(envPath, next);
  console.log("Saved to backend/.env (this file is git-ignored).");

  try {
    const verdict = await provider.check(key);
    console.log(verdict === "accepted" ? `${provider.label} accepted the key.` : verdict === "rejected" ? `${provider.label} did not accept the key. Check it and run this again.` : `Could not tell whether ${provider.label} accepts the key. It is saved; try Keeper and see.`);
  } catch {
    console.log(`Could not reach ${provider.label} to check the key. It is saved; you can try Keeper and see.`);
  }
  console.log(`Restart the API (npm run dev) so it picks the key up. ${provider.restart}`);
});
