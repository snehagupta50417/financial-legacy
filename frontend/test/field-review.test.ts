// Per-field review of extracted values (FL-06, FL-26; DESIGN §5.4).
import { describe, expect, it } from "vitest";
import {
  decide,
  initialReviews,
  isCriticalField,
  locateExcerpt,
  summarise,
  toPatchBody,
  type ExtractedField,
} from "@/lib/field-review";

const fields: ExtractedField[] = [
  { label: "Institution", value: "Punjab National Bank", confidence: 0.97, sourceExcerpt: "PUNJAB NATIONAL BANK — Statement of Account" },
  { label: "Account holder", value: "R. K. Sharma", confidence: 0.98, sourceExcerpt: "Account Holder: R. K. SHARMA" },
  { label: "Last known balance", value: "₹1,24,310.55 Cr (31 Mar 2016)", confidence: 0.9, sourceExcerpt: "31-Mar-2016 C/F 1,24,310.55 Cr" },
  { label: "Status flag", value: "Inoperative", confidence: 0.88, sourceExcerpt: "Account classified INOPERATIVE" },
];

describe("FL-06 critical fields", () => {
  it("treats names, identifiers, amounts, dates and institution as critical", () => {
    for (const l of ["Account holder", "Policy number", "Sum assured", "Last premium", "Date of death", "Institution", "Branch / IFSC"]) {
      expect(isCriticalField(l), l).toBe(true);
    }
    expect(isCriticalField("Status flag")).toBe(false);
  });

  it("lists unreviewed critical fields and is incomplete until every field has a decision", () => {
    let r = initialReviews(fields, false);
    let s = summarise(fields, r);
    expect(s.pendingCritical).toEqual(["Institution", "Account holder", "Last known balance"]);
    expect(s.complete).toBe(false);

    r = decide(r, 0, "accepted");
    r = decide(r, 1, "accepted");
    r = decide(r, 2, "accepted");
    s = summarise(fields, r);
    expect(s.pendingCritical).toEqual([]);
    expect(s.complete).toBe(false); // "Status flag" still open

    r = decide(r, 3, "rejected");
    expect(summarise(fields, r).complete).toBe(true);
  });

  it("starts fully accepted when the document was already verified", () => {
    expect(summarise(fields, initialReviews(fields, true)).complete).toBe(true);
  });
});

describe("FL-26 accept / correct / reject", () => {
  it("keeps the original value next to a correction", () => {
    const r = decide(initialReviews(fields, false), 1, "corrected", "Ramesh Kumar Sharma");
    expect(r[1]).toEqual({ decision: "corrected", original: "R. K. Sharma", corrected: "Ramesh Kumar Sharma" });
  });

  it("treats an empty or unchanged correction as an accept", () => {
    const base = initialReviews(fields, false);
    expect(decide(base, 1, "corrected", "  ")[1].decision).toBe("accepted");
    expect(decide(base, 1, "corrected", "R. K. Sharma")[1].decision).toBe("accepted");
  });

  it("builds the PATCH body: drops rejected, applies corrections, verifies only when complete", () => {
    let r = initialReviews(fields, false);
    r = decide(r, 0, "accepted");
    r = decide(r, 1, "corrected", "Ramesh Kumar Sharma");
    r = decide(r, 2, "accepted");
    const partial = toPatchBody(fields, r);
    expect(partial.userVerified).toBe(false);

    r = decide(r, 3, "rejected");
    const body = toPatchBody(fields, r);
    expect(body.userVerified).toBe(true);
    expect(body.extractedFields.map((f) => f.label)).toEqual(["Institution", "Account holder", "Last known balance"]);
    expect(body.extractedFields[1].value).toBe("Ramesh Kumar Sharma");
    expect(body.extractedFields[1].sourceExcerpt).toBe("Account Holder: R. K. SHARMA"); // citation kept
  });
});

describe("FL-06 source excerpt in the document text", () => {
  const text = "PUNJAB NATIONAL BANK — Statement of Account\nAccount Holder: R. K. SHARMA   Account Type: Savings\n31-Mar-2016  C/F            1,24,310.55 Cr";

  it("finds an excerpt despite different spacing and case", () => {
    const at = locateExcerpt(text, "31-Mar-2016 C/F 1,24,310.55 Cr");
    expect(at).not.toBeNull();
    expect(text.slice(at![0], at![1])).toBe("31-Mar-2016  C/F            1,24,310.55 Cr");
    const holder = locateExcerpt(text, "account holder: r. k. sharma")!;
    expect(text.slice(holder[0], holder[1])).toBe("Account Holder: R. K. SHARMA");
  });

  it("returns null when the excerpt is missing or too short", () => {
    expect(locateExcerpt(text, "Corrected by user")).toBeNull();
    expect(locateExcerpt(text, "C")).toBeNull();
    expect(locateExcerpt("", "anything")).toBeNull();
  });
});
