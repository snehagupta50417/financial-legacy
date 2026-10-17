// Case areas and URLs (DESIGN §2.2–2.3; FL-02 resumable, bookmarkable case pages).
import { describe, expect, it } from "vitest";
import { areaOf, caseHref, goalArea, hrefForTab } from "@/components/fl/case-nav";

describe("FL-02 case routes", () => {
  it("shows Claims for a deceased holder and Plan otherwise — never both", () => {
    expect(goalArea(false)).toBe("claims");
    expect(goalArea(true)).toBe("plan");
    expect(goalArea(null)).toBe("plan");
  });

  it("builds and reads area URLs", () => {
    expect(caseHref("abc")).toBe("/cases/abc");
    expect(caseHref("abc", "records")).toBe("/cases/abc/records");
    expect(areaOf("/cases/abc", "abc")).toBe("conversation");
    expect(areaOf("/cases/abc/records/documents/d1", "abc")).toBe("records");
    expect(areaOf("/cases/abc/steps", "abc")).toBe("steps");
  });

  it("maps the old workspace tabs to the new routes", () => {
    expect(hrefForTab("abc", "documents")).toBe("/cases/abc/records/documents");
    expect(hrefForTab("abc", "journey")).toBe("/cases/abc/steps");
    expect(hrefForTab("abc", "assets")).toBe("/cases/abc/records");
  });
});
