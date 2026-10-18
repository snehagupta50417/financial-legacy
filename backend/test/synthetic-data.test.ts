// Realistic demo data: real reference data + synthetic, masked identifiers (FL-53, FL-55).
import { describe, expect, it } from "vitest";
import { DEMO_CASES } from "@server/data/demo-data";
import { BRANCHES, RBI, SCHEMES, navInMonth, scheme } from "@server/data/synthetic/reference";
import { inr, maskedAccount, rng, units } from "@server/data/synthetic/formats";

const allText = JSON.stringify(DEMO_CASES);

describe("reference snapshot", () => {
  it("has real schemes with NAV history, real branches and RBI rates", () => {
    expect(SCHEMES.length).toBeGreaterThanOrEqual(10);
    for (const s of SCHEMES) {
      expect(s.isin).toMatch(/^INF[A-Z0-9]{9}$/);
      expect(s.monthlyNav.length).toBeGreaterThan(12);
    }
    expect(BRANCHES.length).toBeGreaterThan(50);
    for (const b of BRANCHES) expect(b.ifsc).toMatch(/^[A-Z]{4}0[A-Z0-9]{6}$/);
    expect(RBI.bankRate).toBeGreaterThan(0);
  });
});

describe("formats", () => {
  it("formats rupees with Indian grouping", () => {
    expect(inr(1234567.5)).toBe("12,34,567.50");
    expect(inr(999, 0)).toBe("999");
    expect(inr(100000, 0)).toBe("1,00,000");
  });

  it("masks account numbers to the bank's length", () => {
    expect(maskedAccount("Punjab National Bank", "8821")).toBe("XXXXXXXXXXXX8821");
    expect(maskedAccount("State Bank of India", "8821")).toHaveLength(11);
  });

  it("is deterministic", () => {
    const a = rng(42);
    const b = rng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("demo cases (FL-53)", () => {
  it("keeps the three demo scenarios", () => {
    expect(DEMO_CASES.map((d) => d.demoKey)).toEqual(["demo-a", "demo-b", "demo-c"]);
  });

  it("never contains an unmasked PAN, Aadhaar or long account number", () => {
    expect(allText).not.toMatch(/\b(?!XXXXX)[A-Z]{5}\d{4}[A-Z]\b/); // full PAN (masked "XXXXX1234X" is fine)
    expect(allText).not.toMatch(/\b\d{4}\s?\d{4}\s?\d{4}\b/); // full Aadhaar
    expect(allText).not.toMatch(/\b\d{9,18}\b/); // full account / policy / folio numbers
  });

  it("labels every document as a synthetic sample", () => {
    for (const d of DEMO_CASES) for (const doc of d.documents) expect(doc.rawText).toMatch(/SYNTHETIC SAMPLE/);
  });

  it("uses real branches that exist in the snapshot", () => {
    const ifscs = allText.match(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g) ?? [];
    expect(ifscs.length).toBeGreaterThan(0);
    for (const code of ifscs) expect(BRANCHES.some((b) => b.ifsc === code)).toBe(true);
  });

  it("computes fund values from real NAVs (units × NAV)", () => {
    const hdfc = scheme(/^HDFC Flexi Cap Fund/);
    const nav = navInMonth(hdfc, "2019-12");
    const u = units(412300, nav.nav);
    expect(allText).toContain(inr(u * nav.nav));
    expect(allText).toContain(hdfc.isin);
  });

  it("uses only valid asset categories and confidences", () => {
    for (const d of DEMO_CASES)
      for (const a of d.assets) {
        expect(["bank_deposit", "insurance", "mutual_fund", "shares", "other"]).toContain(a.category);
        expect(a.confidence).toBeGreaterThan(0);
        expect(a.confidence).toBeLessThanOrEqual(1);
      }
  });
});
