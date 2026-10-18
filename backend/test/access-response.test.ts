import { expect, it, vi } from "vitest";
import { isDenied } from "@server/core/access";

it("preserves access denials when the HTTP adapter replaces Response", () => {
  const NativeResponse = Response;
  const denied = NativeResponse.json({ error: "Document not found" }, { status: 404 });
  try {
    vi.stubGlobal("Response", class AdapterResponse extends NativeResponse {});
    expect(denied instanceof Response).toBe(false);
    expect(isDenied(denied)).toBe(true);
    expect(isDenied({ session: { id: "synthetic" } })).toBe(false);
  } finally { vi.unstubAllGlobals(); }
});
