// Printed at the start of `npm run dev`: is Keeper's AI switched on? Never prints a key, only whether one is set.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../backend/.env");
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const isSet = (name) => new RegExp(`^${name}="[^"\\s]{10,}"`, "m").test(env);

const gemini = isSet("GEMINI_API_KEY");
const sarvam = isSet("SARVAM_API_KEY");
const line = (ok, name, good, bad) => console.log(`  ${ok ? "[x]" : "[ ]"} ${name.padEnd(8)} ${ok ? good : bad}`);

console.log("\nKeeper's AI");
line(gemini, "Gemini", "set: Keeper can hold a real conversation and speak naturally", "NOT set: Keeper will only follow a script, so calls won't feel like a conversation.\n             Fix: stop this, run  npm run set-key  then start again.");
line(sarvam, "Sarvam", "set: Keeper understands Indian languages", "not set (optional): calls use your browser's speech recognition.\n             To add: npm run set-sarvam-key");
console.log("");
