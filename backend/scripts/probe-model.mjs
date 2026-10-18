// Dev probe (never prints the key): what does a model say to a tiny request, with and without a thinking budget?
//   node --env-file=.env scripts/probe-model.mjs gemini-flash-lite-latest
import { GoogleGenAI } from "@google/genai";

const model = process.argv[2] || "gemini-flash-lite-latest";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
for (const [label, config] of [
  ["plain", {}],
  ["thinkingBudget 0", { thinkingConfig: { thinkingBudget: 0 } }],
  ["json + tokens + thinking 0", { responseMimeType: "application/json", maxOutputTokens: 700, thinkingConfig: { thinkingBudget: 0 } }],
]) {
  const t = Date.now();
  try {
    const res = await ai.models.generateContent({ model, contents: "Reply with the JSON {\"ok\":true}", config });
    console.log(`${label}: OK ${((Date.now() - t) / 1000).toFixed(1)}s`, (res.text ?? "").slice(0, 60));
  } catch (e) {
    console.log(`${label}: ERROR ${((Date.now() - t) / 1000).toFixed(1)}s`, String(e?.message ?? e).slice(0, 300));
  }
}
