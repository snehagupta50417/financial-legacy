/** Sarvam Saaras supports these 22 Indian languages plus English. */
export const SPEECH_LANGUAGES: Record<string, string> = {
  "en-IN": "English", "hi-IN": "Hindi", "bn-IN": "Bengali", "gu-IN": "Gujarati", "kn-IN": "Kannada", "ml-IN": "Malayalam",
  "mr-IN": "Marathi", "od-IN": "Odia", "pa-IN": "Punjabi", "ta-IN": "Tamil", "te-IN": "Telugu",
  "as-IN": "Assamese", "ur-IN": "Urdu", "ne-IN": "Nepali", "kok-IN": "Konkani", "ks-IN": "Kashmiri",
  "sd-IN": "Sindhi", "sa-IN": "Sanskrit", "sat-IN": "Santali", "mni-IN": "Manipuri", "brx-IN": "Bodo",
  "mai-IN": "Maithili", "doi-IN": "Dogri",
};
/** Additional language choices use the browser recogniser, whose support varies by device. */
export const CONVERSATION_LANGUAGES: Record<string, string> = {
  ...SPEECH_LANGUAGES, "es-ES": "Spanish", "fr-FR": "French", "de-DE": "German", "ar-SA": "Arabic",
  "zh-CN": "Chinese", "ja-JP": "Japanese", "ko-KR": "Korean", "pt-BR": "Portuguese", "ru-RU": "Russian", "it-IT": "Italian",
};

/** Exact short confirmations; consequential actions still require the existing confirmation step. */
export function localConfirmation(text: string): "yes" | "no" | null {
  const word = text.trim().toLowerCase().replace(/[.!?।。！？，,]+$/gu, "").trim();
  if (["हाँ", "हां", "जी हाँ", "হ্যাঁ", "હા", "ಹೌದು", "അതെ", "हो", "ହଁ", "ਹਾਂ", "ஆம்", "అవును", "ہاں", "होय", "হয়", "sí", "oui", "ja", "نعم", "是", "はい", "네", "sim", "да", "sì"].includes(word)) return "yes";
  if (["नहीं", "না", "ના", "ಇಲ್ಲ", "ഇല്ല", "नको", "ନା", "ਨਹੀਂ", "இல்லை", "కాదు", "نہیں", "नाइँ", "non", "nein", "لا", "不是", "いいえ", "아니요", "não", "нет"].includes(word)) return "no";
  return null;
}

/** Normalise model language metadata, including bare codes and script subtags. */
export function normaliseLanguage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const parts = value.trim().replace(/_/g, "-").split("-");
  const base = parts[0]?.toLowerCase();
  if (!/^[a-z]{2,3}$/.test(base)) return undefined;
  const region = parts.slice(1).find(part => /^[a-z]{2}$/i.test(part));
  if (region) return `${base}-${region.toUpperCase()}`;
  return Object.keys(CONVERSATION_LANGUAGES).find(code => code.startsWith(base + "-"));
}
