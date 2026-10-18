// B4 (#14): evidence statuses, per-field review with history, dated amounts, duplicates, honest totals.
// PRD FL-06, FL-07, FL-08, FL-09, FL-26, FL-28, FL-29.
import { describe, expect, it } from "vitest";
import { POST as loadDemo } from "@api/demo/route";
import { POST as upload } from "@api/documents/route";
import { PATCH as patchDocument } from "@api/documents/[id]/route";
import { PUT as review } from "@api/documents/[id]/review/route";
import { PATCH as patchAsset } from "@api/assets/[id]/route";
import { db } from "@server/db";
import { getWorkspacePayload } from "@server/domain/case-service";
import { deriveEvidenceStatus, documentSupports } from "@server/rules/evidence";
import { findDuplicate, normaliseInstitution } from "@server/rules/duplicates";
import { formatInr, holdingForAmount, observationsFromFields, parseAmount, parseDate } from "@server/rules/observations";
import { computeTotals, type TotalAsset, type TotalObservation } from "@server/rules/totals";

// ── Pure rules ───────────────────────────────────────────────────────────────

describe("FL-07 evidence status rules", () => {
  const reviewed = [
    { label: "Institution", state: "accepted", critical: true },
    { label: "Account reference", state: "accepted", critical: true },
    { label: "Status flag", state: "proposed", critical: false },
  ];

  it("a holding the user hasn't confirmed is only a potential match, whatever the document says", () => {
    expect(deriveEvidenceStatus({ current: "potential_match", discoveryStatus: "possible", linkedDocument: reviewed })).toBe("potential_match");
  });

  it("confirmed + a reviewed supporting document = document-backed; without one = self-declared", () => {
    expect(deriveEvidenceStatus({ current: "potential_match", discoveryStatus: "confirmed", linkedDocument: reviewed })).toBe("document_backed");
    expect(deriveEvidenceStatus({ current: "potential_match", discoveryStatus: "confirmed", linkedDocument: null })).toBe("self_declared");
  });

  it("an unreviewed critical field, or a rejected reference, means the document doesn't back it", () => {
    expect(documentSupports([{ label: "Account holder", state: "proposed", critical: true }, ...reviewed])).toBe(false);
    expect(documentSupports(reviewed.map((f) => (f.label === "Account reference" ? { ...f, state: "rejected" } : f)))).toBe(false);
  });

  it("only an operator can set or clear institution-verified", () => {
    expect(deriveEvidenceStatus({ current: "institution_verified", discoveryStatus: "possible", linkedDocument: null })).toBe("institution_verified");
  });
});

describe("FL-09 amounts and dates", () => {
  it("reads Indian amounts exactly, and never mistakes 'Cr' (credit) for crore", () => {
    expect(parseAmount("₹1,25,728.00 Cr (31 Mar 2016)")).toEqual({ amount: "125728.00", currency: "INR" });
    expect(parseAmount("Rs. 2.45 lakh")?.amount).toBe("245000.00");
    expect(parseAmount("₹1.2 crore")?.amount).toBe("12000000.00");
    expect(parseAmount("₹500.00 Dr")?.amount).toBe("-500.00");
    expect(parseAmount("₹5,00,000 cover, premium ₹24,550")).toBeNull();
    expect(parseAmount("Inoperative")).toBeNull();
    expect(formatInr("12345678.50")).toBe("₹1,23,45,678.50");
  });

  it("reads dates day-first, takes a period's end, and refuses a month without a day", () => {
    expect(parseDate("31-Dec-2019")).toBe("2019-12-31");
    expect(parseDate("01/01/2016 to 31/03/2016")).toBe("2016-03-31");
    expect(parseDate("matures Mar 2027")).toBeNull();
  });

  it("builds dated amounts only from accepted or corrected fields", () => {
    const obs = observationsFromFields([
      { id: "a", label: "Statement date", value: "31/03/2016", sourceExcerpt: "", state: "accepted" },
      { id: "b", label: "Closing balance", value: "₹1,000.00", sourceExcerpt: "", state: "accepted" },
      { id: "c", label: "Sum assured", value: "₹5,00,000", sourceExcerpt: "", state: "corrected" },
      { id: "d", label: "Market value", value: "₹9,999.00", sourceExcerpt: "", state: "rejected" },
      { id: "e", label: "Last premium", value: "₹24,550.00 on 12 Feb 2018", sourceExcerpt: "", state: "proposed" },
    ]);
    expect(obs).toEqual([
      { sourceFieldId: "b", label: "Closing balance", amount: "1000.00", currency: "INR", amountType: "cash_balance", asOfDate: "2016-03-31" },
      { sourceFieldId: "c", label: "Sum assured", amount: "500000.00", currency: "INR", amountType: "sum_assured", asOfDate: "2016-03-31" },
    ]);
  });

  it("matches an amount to the right holding through its sibling field, or to none", () => {
    const holdings = [
      { id: "hdfc", institution: "HDFC Mutual Fund", last4: "4567" },
      { id: "sbi", institution: "SBI Mutual Fund", last4: "8899" },
    ];
    const siblings = [
      { label: "Folio 1", value: "••••4567 — HDFC Equity Fund", sourceExcerpt: "" },
      { label: "Folio 2", value: "••••8899 — SBI Blue Chip Fund", sourceExcerpt: "" },
    ];
    expect(holdingForAmount({ label: "Folio 1 value", sourceExcerpt: "Value: Rs. 4,12,300" }, holdings, siblings)).toBe("hdfc");
    expect(holdingForAmount({ label: "Folio 2 value", sourceExcerpt: "" }, holdings, siblings)).toBe("sbi");
    expect(holdingForAmount({ label: "Total value", sourceExcerpt: "" }, holdings, siblings)).toBeNull();
  });
});

describe("FL-29 honest totals", () => {
  const asset = (id: string, over: Partial<TotalAsset> = {}): TotalAsset => ({
    id,
    institution: id.toUpperCase(),
    evidenceStatus: "document_backed",
    discoveryStatus: "confirmed",
    duplicateState: null,
    amountsVisible: true,
    ...over,
  });
  const obs = (assetId: string, amount: string, over: Partial<TotalObservation> = {}): TotalObservation => ({
    id: `${assetId}-${amount}`,
    assetId,
    amount,
    currency: "INR",
    amountType: "cash_balance",
    asOfDate: "2016-03-31",
    reviewedAt: new Date(),
    supersededAt: null,
    ...over,
  });

  it("adds one latest dated value per holding, exactly, and explains every exclusion", () => {
    const t = computeTotals(
      [
        asset("a"),
        asset("b"),
        asset("c", { evidenceStatus: "potential_match" }),
        asset("d"),
        asset("e"),
        asset("f", { duplicateState: "candidate" }),
        asset("g", { amountsVisible: false }),
        asset("h"),
        asset("i"),
      ],
      [
        obs("a", "125728.10"),
        obs("a", "100.00", { asOfDate: "2015-01-01" }), // older: ignored
        obs("a", "999.00", { asOfDate: "2020-01-01", supersededAt: new Date() }), // history: ignored
        obs("b", "411300.90", { amountType: "current_value", asOfDate: "2019-12-31" }),
        obs("c", "50000.00"),
        obs("d", "500000.00", { amountType: "sum_assured" }),
        obs("e", "1000.00", { asOfDate: null }),
        obs("f", "1.00"),
        obs("g", "1.00"),
        obs("h", "-200.00"),
      ]
    );
    expect(t.label).toBe("Reviewed value from dated sources");
    expect(t.totals).toEqual([{ currency: "INR", amount: "537029.00" }]);
    expect(t.counted.map((c) => c.assetId)).toEqual(["a", "b"]);
    expect(Object.fromEntries(t.excluded.map((x) => [x.assetId, x.reason]))).toEqual({
      c: "Potential match — not confirmed yet",
      d: expect.stringMatching(/sum assured/),
      e: expect.stringMatching(/no date/),
      f: expect.stringMatching(/duplicate/),
      g: expect.stringMatching(/hidden/),
      h: expect.stringMatching(/negative/),
      i: "No reviewed amount yet",
    });
    expect([t.oldestDate, t.newestDate]).toEqual(["2016-03-31", "2019-12-31"]);
  });

  it("is unknown, not ₹0, when nothing qualifies — but an evidenced zero counts as 0.00", () => {
    expect(computeTotals([asset("a")], []).totals).toEqual([]);
    expect(computeTotals([asset("a")], [obs("a", "0.00")]).totals).toEqual([{ currency: "INR", amount: "0.00" }]);
  });

  it("never adds different currencies together", () => {
    const t = computeTotals([asset("a"), asset("b")], [obs("a", "10.00"), obs("b", "5.00", { currency: "USD" })]);
    expect(t.totals).toEqual([
      { currency: "INR", amount: "10.00" },
      { currency: "USD", amount: "5.00" },
    ]);
  });
});

describe("FL-08 duplicate candidates", () => {
  const existing = [{ id: "x", institution: "LIC of India", category: "insurance", last4: "1234", discoveryStatus: "possible", duplicateState: null }];
  it("needs the same institution, type family and last 4 — names alone never match", () => {
    expect(normaliseInstitution("Life Insurance Corporation of India")).toBe("lic");
    expect(findDuplicate({ institution: "Life Insurance Corporation of India", category: "insurance", last4: "1234" }, existing)?.id).toBe("x");
    expect(findDuplicate({ institution: "LIC of India", category: "insurance", last4: null }, existing)).toBeNull();
    expect(findDuplicate({ institution: "LIC of India", category: "insurance", last4: "9999" }, existing)).toBeNull();
    expect(
      findDuplicate({ institution: "Punjab National Bank", category: "bank_account", last4: "1" + "234" }, [
        { ...existing[0], institution: "PNB", category: "bank_deposit" },
      ])?.id
    ).toBe("x");
  });
});

// ── Through the routes, on the synthetic demo case ──────────────────────────

const session = "test-session-evidence-0001";
function req(url: string, method: string, body?: unknown, sid = session) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "x-session-id": sid, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function demo() {
  const res = await loadDemo(req("/api/demo", "POST", { scenario: "demo-a" }));
  const { caseId } = (await res.json()) as { caseId: string };
  const ws = (await getWorkspacePayload(caseId, session))!;
  const pnbDoc = ws.documents.find((d) => d.fileName.startsWith("PNB"))!;
  const pnb = ws.assets.find((a) => a.institution === "Punjab National Bank")!;
  return { caseId, ws, pnbDoc, pnb };
}

describe("review → evidence → amounts → totals", () => {
  it("demo holdings start as potential matches with reviewable fields", async () => {
    const { ws, pnbDoc } = await demo();
    expect(ws.assets.every((a) => a.evidenceStatus === "potential_match")).toBe(true);
    expect(pnbDoc.fields.length).toBeGreaterThan(3);
    expect(pnbDoc.fields.every((f) => f.state === "proposed")).toBe(true);
    expect(ws.totals.totals).toEqual([]);
  });

  it("confirming + reviewing makes a holding document-backed with a dated balance; corrections keep history", async () => {
    const { caseId, pnbDoc, pnb } = await demo();
    const accept = pnbDoc.fields.map((f) => ({ fieldId: f.id, decision: "accepted" as const }));
    const r1 = await review(req(`/api/documents/${pnbDoc.id}/review`, "PUT", { decisions: accept }), params(pnbDoc.id));
    expect(await r1.json()).toMatchObject({ complete: true });
    // Re-sending the same decisions changes nothing (no duplicate history).
    const again = await review(req(`/api/documents/${pnbDoc.id}/review`, "PUT", { decisions: accept }), params(pnbDoc.id));
    expect(await again.json()).toMatchObject({ changed: [] });

    await patchAsset(req(`/api/assets/${pnb.id}`, "PATCH", { action: "confirm" }), params(pnb.id));
    await db.assetRecord.update({ where: { id: pnb.id }, data: { entitled: true } }); // G4 for this holding

    let ws = (await getWorkspacePayload(caseId, session))!;
    let a = ws.assets.find((x) => x.id === pnb.id)!;
    expect(a.evidenceStatus).toBe("document_backed");
    expect(a.amount).toMatchObject({ amountType: "cash_balance", asOfDate: "2016-03-31", meaning: "Balance" });
    const balance = a.amount!.amount;
    expect(ws.totals.counted.map((c) => c.assetId)).toEqual([pnb.id]);
    expect(ws.totals.totals[0].amount).toBe(balance);

    // Correct the balance, with a reason: the old amount is superseded, never overwritten.
    const balField = pnbDoc.fields.find((f) => /balance/i.test(f.label))!;
    await review(
      req(`/api/documents/${pnbDoc.id}/review`, "PUT", {
        decisions: [{ fieldId: balField.id, decision: "corrected", value: "₹1,30,000.00 (31 Mar 2016)", reason: "Passbook shows a later entry" }],
      }),
      params(pnbDoc.id)
    );
    ws = (await getWorkspacePayload(caseId, session))!;
    a = ws.assets.find((x) => x.id === pnb.id)!;
    expect(a.amount?.amount).toBe("130000.00");
    const history = await db.fieldReviewEvent.findMany({ where: { fieldId: balField.id }, orderBy: { createdAt: "asc" } });
    expect(history.map((h) => [h.fromState, h.toState])).toEqual([["proposed", "accepted"], ["accepted", "corrected"]]);
    expect(history[1]).toMatchObject({ fromValue: balField.proposedValue, toValue: "₹1,30,000.00 (31 Mar 2016)", reason: "Passbook shows a later entry", actor: session });
    const all = await db.observation.findMany({ where: { assetId: pnb.id }, orderBy: { createdAt: "asc" } });
    expect(all).toHaveLength(2);
    expect(all[0].supersededAt).not.toBeNull();
    expect(all[0].amount).toBe(balance);

    // Rejecting the account reference means the document no longer backs the holding.
    const refField = pnbDoc.fields.find((f) => /reference/i.test(f.label))!;
    await review(req(`/api/documents/${pnbDoc.id}/review`, "PUT", { decisions: [{ fieldId: refField.id, decision: "rejected", reason: "Different account" }] }), params(pnbDoc.id));
    ws = (await getWorkspacePayload(caseId, session))!;
    expect(ws.assets.find((x) => x.id === pnb.id)!.evidenceStatus).toBe("self_declared");
  });

  it("hides amounts below G4 and leaves them out of the total, saying why", async () => {
    const { caseId, pnbDoc, pnb } = await demo();
    await review(req(`/api/documents/${pnbDoc.id}/review`, "PUT", { decisions: pnbDoc.fields.map((f) => ({ fieldId: f.id, decision: "accepted" })) }), params(pnbDoc.id));
    await patchAsset(req(`/api/assets/${pnb.id}`, "PATCH", { action: "confirm" }), params(pnb.id));
    const ws = (await getWorkspacePayload(caseId, session))!;
    const a = ws.assets.find((x) => x.id === pnb.id)!;
    expect(a.amount).toBeNull();
    expect(a.amountHidden).toBe(true);
    expect(ws.totals.excluded.find((x) => x.assetId === pnb.id)?.reason).toMatch(/hidden/);
  });

  it("refuses to rewrite values through the old PATCH, and rejects unknown fields", async () => {
    const { pnbDoc } = await demo();
    const r = await patchDocument(req(`/api/documents/${pnbDoc.id}`, "PATCH", { extractedFields: [] }), params(pnbDoc.id));
    expect(r.status).toBe(400);
    const bad = await review(req(`/api/documents/${pnbDoc.id}/review`, "PUT", { decisions: [{ fieldId: "nope", decision: "accepted" }] }), params(pnbDoc.id));
    expect(bad.status).toBe(400);
    const foreign = await review(
      req(`/api/documents/${pnbDoc.id}/review`, "PUT", { decisions: [{ fieldId: pnbDoc.fields[0].id, decision: "accepted" }] }, "test-session-evidence-9999"),
      params(pnbDoc.id)
    );
    expect(foreign.status).toBe(404);
  });

  it("flags a re-uploaded statement as a possible duplicate; merging is reviewed and undoable", async () => {
    const { caseId, pnb } = await demo();
    const form = new FormData();
    form.set("caseId", caseId);
    form.set(
      "file",
      new File(
        [`PUNJAB NATIONAL BANK\nStatement of Account\nAccount No: XXXXXXXX${pnb.last4}\nStatement Date: 30/06/2016\nClosing Balance: Rs 1,000.00\n`],
        "pnb-again.txt",
        { type: "text/plain" }
      )
    );
    const up = await upload(new Request("http://localhost/api/documents", { method: "POST", headers: { "x-session-id": session }, body: form }));
    expect(up.status).toBe(200);

    let ws = (await getWorkspacePayload(caseId, session))!;
    const dup = ws.assets.find((a) => a.duplicateOfId === pnb.id)!;
    expect(dup).toMatchObject({ duplicateState: "candidate", evidenceStatus: "potential_match" });
    // Never merged automatically: both still listed.
    expect(ws.assets.filter((a) => a.institution === "Punjab National Bank" && a.discoveryStatus !== "dismissed")).toHaveLength(2);

    await patchAsset(req(`/api/assets/${dup.id}`, "PATCH", { action: "same_holding" }), params(dup.id));
    ws = (await getWorkspacePayload(caseId, session))!;
    expect(ws.assets.find((a) => a.id === dup.id)!.duplicateState).toBe("merged");

    await patchAsset(req(`/api/assets/${dup.id}`, "PATCH", { action: "undo_merge" }), params(dup.id));
    ws = (await getWorkspacePayload(caseId, session))!;
    expect(ws.assets.find((a) => a.id === dup.id)!.duplicateState).toBe("candidate");

    const wrong = await patchAsset(req(`/api/assets/${pnb.id}`, "PATCH", { action: "same_holding" }), params(pnb.id));
    expect(wrong.status).toBe(409);
  });
});
