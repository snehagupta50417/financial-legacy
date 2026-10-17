// OCR for photos and scanned PDFs, and basic extraction without an AI key (#41, FL-05/FL-06).
import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createCanvas } from "@napi-rs/canvas";
import { POST as loadDemo } from "@/app/api/demo/route";
import { POST as upload } from "@/app/api/documents/route";
import { db } from "@/server/db";
import { ocrImage, ocrPdf, terminateOcr } from "@/server/ocr/ocr";
import { findInstitutions, ruleCertificateFields, ruleExtract, toIsoDate } from "@/server/ocr/rule-extract";

// Synthetic statement: made-up holder and numbers, real public bank/IFSC format.
const STATEMENT = [
  "PUNJAB NATIONAL BANK",
  "Statement of Account",
  "Account Holder Name: RAMESH KUMAR SHARMA",
  "Account No: 0123456789018821",
  "IFSC: PUNB0123400",
  "Statement Date: 31/03/2024",
  "Closing Balance: Rs 2,45,310.50",
];

/** Render lines as a black-on-white "photo" (PNG) — what a phone scan looks like to OCR. */
function photo(lines: string[]): Uint8Array {
  const canvas = createCanvas(1400, 120 + lines.length * 70);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.font = "40px sans-serif";
  lines.forEach((l, i) => ctx.fillText(l, 60, 100 + i * 70));
  return new Uint8Array(canvas.toBuffer("image/png"));
}

/** A one-page PDF whose only content is a JPEG — a scanned PDF with no text layer. */
function scannedPdf(lines: string[]): Uint8Array {
  const canvas = createCanvas(1400, 120 + lines.length * 70);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.font = "40px sans-serif";
  lines.forEach((l, i) => ctx.fillText(l, 60, 100 + i * 70));
  const jpg = canvas.toBuffer("image/jpeg");
  const w = canvas.width / 2;
  const h = canvas.height / 2;
  const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
  const parts: (string | Buffer)[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (p: string | Buffer) => {
    parts.push(p);
    len += typeof p === "string" ? Buffer.byteLength(p, "latin1") : p.length;
  };
  const obj = (n: number, body: (string | Buffer)[]) => {
    offsets[n] = len;
    push(`${n} 0 obj\n`);
    body.forEach(push);
    push("\nendobj\n");
  };
  push("%PDF-1.4\n");
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]);
  obj(3, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`]);
  obj(4, [
    `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`,
    jpg,
    "\nendstream",
  ]);
  obj(5, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
  const xref = len;
  push(`xref\n0 6\n0000000000 65535 f \n`);
  for (let i = 1; i <= 5; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Uint8Array(Buffer.concat(parts.map((p) => (typeof p === "string" ? Buffer.from(p, "latin1") : p))));
}

afterAll(() => terminateOcr());

describe("basic extraction without AI", () => {
  it("reads labelled bank-statement facts and masks references", () => {
    const ex = ruleExtract(STATEMENT.join("\n"));
    expect(ex.documentCategory).toBe("bank_statement");
    expect(ex.extractionQuality).toBe("partial");
    expect(ex.institutions).toContain("Punjab National Bank");
    const f = Object.fromEntries(ex.fields.map((x) => [x.label, x.value]));
    expect(f["Account number"]).toBe("••••8821");
    expect(f.IFSC).toBe("PUNB0123400");
    expect(f.Name).toBe("RAMESH KUMAR SHARMA");
    expect(f["Statement date"]).toBe("2024-03-31");
    expect(f["Closing Balance"]).toBe("₹2,45,310.50");
    expect(ex.assetClues).toEqual([
      expect.objectContaining({ category: "bank_account", institution: "Punjab National Bank", reference: "A/c ••••8821" }),
    ]);
    expect(JSON.stringify(ex)).not.toContain("0123456789018821");
    expect(ex.warnings[0]).toMatch(/without AI/);
  });

  it("tells an insurer from its bank, and needs a reference before suggesting an asset", () => {
    expect(findInstitutions("HDFC Life Insurance — policy schedule").map((i) => i.name)).toEqual(["HDFC Life"]);
    expect(findInstitutions("SBI Life policy, premium paid from SBI A/c").map((i) => i.name)).toEqual([
      "SBI Life",
      "State Bank of India",
    ]);
    const policy = ruleExtract("HDFC Life\nPolicy No: 23456789\nLife Assured: Sunita Devi\nSum Assured: Rs 5,00,000");
    expect(policy.documentCategory).toBe("policy_document");
    expect(policy.assetClues[0]).toMatchObject({ category: "insurance", reference: "Policy ••••6789", holderName: "Sunita Devi" });
    expect(ruleExtract("We bank with ICICI Bank.").assetClues).toEqual([]);
  });

  it("reads death-certificate fields and Indian date formats", () => {
    expect(toIsoDate("05-Jan-2024")).toBe("2024-01-05");
    expect(toIsoDate("5 January 2024")).toBe("2024-01-05");
    expect(toIsoDate("31/13/2024")).toBeNull();
    const rec = ruleCertificateFields(
      "CERTIFICATE OF DEATH\nName of Deceased: Ramesh Kumar Sharma  Sex: Male\nDate of Death: 12/02/2024\nRegistration No: D-2024-0042"
    );
    expect(rec).toMatchObject({ name: "Ramesh Kumar Sharma", dateOfDeath: "2024-02-12", registrationNo: "D-2024-0042" });
  });
});

describe("OCR", { timeout: 180_000 }, () => {
  it("reads a photographed statement", async () => {
    const r = await ocrImage(photo(STATEMENT));
    expect(r.text).toMatch(/PUNJAB NATIONAL BANK/i);
    expect(r.text).toMatch(/8821/);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("reads a scanned PDF that has no text layer", async () => {
    const r = await ocrPdf(scannedPdf(STATEMENT));
    expect(r.pages).toBe(1);
    expect(r.text).toMatch(/Statement of Account/i);
  });

  it("extracts an uploaded photo end to end with no AI key", async () => {
    const session = "test-session-ocr-0001";
    const res = await loadDemo(
      new NextRequest("http://localhost/api/demo", {
        method: "POST",
        headers: { "x-session-id": session, "content-type": "application/json" },
        body: JSON.stringify({ scenario: "demo-a" }),
      })
    );
    const { caseId } = (await res.json()) as { caseId: string };
    const form = new FormData();
    form.set("caseId", caseId);
    form.set("file", new File([Buffer.from(photo(STATEMENT))], "passbook-photo.png", { type: "image/png" }));
    const r = await upload(new NextRequest("http://localhost/api/documents", { method: "POST", headers: { "x-session-id": session }, body: form }));
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      document: { extractionStatus: string; rawText: string | null };
      extraction: { fields: { label: string; value: string }[] } | null;
    };
    expect(body.document.extractionStatus).toBe("extracted");
    expect(body.extraction?.fields.find((f) => f.label === "Account number")?.value).toBe("••••8821");
    expect(body.document.rawText).toContain("••••8821");
    expect(body.document.rawText).not.toMatch(/\b\d{6,}\b/); // IFSC (public) may keep its digits
    const clue = await db.assetRecord.findFirst({ where: { caseId, institution: "Punjab National Bank", discoveryStatus: "possible" } });
    expect(clue).not.toBeNull();
  });
});
