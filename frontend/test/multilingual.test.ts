import { describe, expect, it } from "vitest";
import { CONVERSATION_LANGUAGES, SPEECH_LANGUAGES, localConfirmation, normaliseLanguage } from "@shared/languages";

describe("FL-01 multilingual conversation", () => {
  it("shares one complete speech catalogue and keeps browser language choices distinct", () => {
    expect(Object.keys(SPEECH_LANGUAGES)).toHaveLength(23);
    expect(SPEECH_LANGUAGES["ur-IN"]).toBe("Urdu");
    expect(SPEECH_LANGUAGES["as-IN"]).toBe("Assamese");
    expect(SPEECH_LANGUAGES["es-ES"]).toBeUndefined();
    expect(CONVERSATION_LANGUAGES["es-ES"]).toBe("Spanish");
  });
  it("normalises short and script-tagged language codes without inventing a locale", () => {
    expect(normaliseLanguage("ur")).toBe("ur-IN");
    expect(normaliseLanguage("ta")).toBe("ta-IN");
    expect(normaliseLanguage("ur-Arab-PK")).toBe("ur-PK");
    expect(normaliseLanguage("not a language")).toBeUndefined();
  });
  it("recognises explicit short confirmations across scripts without approving unrelated messages", () => {
    for (const word of ["हाँ।", "ஆம்", "అవును", "হ্যাঁ", "ہاں", "sí", "oui", "はい"]) expect(localConfirmation(word)).toBe("yes");
    for (const word of ["नहीं", "இல்லை", "కాదు", "না", "نہیں", "nein"]) expect(localConfirmation(word)).toBe("no");
    expect(localConfirmation("हाँ लेकिन अभी मत करो")).toBeNull();
    expect(localConfirmation("maybe")).toBeNull();
  });
});
