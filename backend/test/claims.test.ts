// B6 (#16): versioned procedures, claim paths, packs, approval, submission and outcomes.
// PRD FL-12, FL-13, FL-14, FL-15, FL-16, FL-36, FL-37, FL-44.
import { describe, expect, it } from "vitest";
import { POST as loadDemo } from "@api/demo/route";
import { PUT as review } from "@api/documents/[id]/review/route";
import { PATCH as patchAsset } from "@api/assets/[id]/route";
import { POST as startClaimRoute } from "@api/claims/route";
import { GET as getClaim, PATCH as patchClaim } from "@api/claims/[id]/route";
import { POST as approve } from "@api/claims/[id]/approve/route";
import { GET as downloadPack } from "@api/claims/[id]/pack/route";
import { POST as submit } from "@api/claims/[id]/submission/route";
import { POST as update } from "@api/claims/[id]/update/route";
import { db } from "@server/db";
import { getWorkspacePayload } from "@server/domain/case-service";
import type { ClaimView } from "@server/domain/claim-service";
import { PROCEDURES, procedureFor } from "@shared/procedures";
import { choosePath, EMPTY_SITUATION, type Situation } from "@shared/claim-path";
import { buildPack, packGaps, packHash } from "@shared/claim-pack";
import { canMove, recovered } from "@shared/claim-lifecycle";

const TODAY = "2026-10-17";
const sit = (over: Partial<Situation>): Situation => ({ ...EMPTY_SITUATION, ...over });
const exact = (rupees: number) => ({ min: rupees, max: rupees, source: "reviewed" as const });
const path = (holding: { category: string; institution: string }, s: Situation, today = TODAY) => {
  const d = choosePath(holding, s, today);
  return d.kind === "path" ? d.path : d.kind === "ask" ? `ask:${d.question}` : "review";
};

const PNB = { category: "bank_deposit", institution: "Punjab National Bank" };
const HDFC_MF = { category: "mutual_fund", institution: "HDFC Mutual Fund" };
const LIC = { category: "insurance", institution: "LIC of India" };

describe("FL-12 claim paths are chosen by code from the facts", () => {
  it("banks: nominee, joint holder, then the ₹15 lakh simplified limit", () => {
    expect(path(PNB, sit({}))).toBe("ask:nominee");
    expect(path(PNB, sit({ nominee: "recorded" }))).toBe("nominee");
    expect(path(PNB, sit({ nominee: "none" }))).toBe("ask:jointHolder");
    expect(path(PNB, sit({ nominee: "none", jointHolder: "surviving" }))).toBe("joint");
    expect(path(PNB, sit({ nominee: "none", jointHolder: "none" }))).toBe("ask:amount");
    expect(path(PNB, sit({ nominee: "none", jointHolder: "none", amount: exact(125_728) }))).toBe("simplified");
    expect(path(PNB, sit({ nominee: "none", jointHolder: "none", amount: exact(2_000_000) }))).toBe("succession");
    // A band that straddles the limit can't decide it.
    expect(path(PNB, sit({ nominee: "none", jointHolder: "none", amount: { min: 1_000_001, max: null, source: "family" } }))).toBe("ask:amount");
  });

  it("banks: published higher limits and the lower co-operative limit", () => {
    const none = { nominee: "none" as const, jointHolder: "none" as const, amount: exact(2_000_000) };
    expect(path({ category: "bank_account", institution: "ICICI Bank" }, sit(none))).toBe("simplified");
    expect(path({ category: "bank_account", institution: "Saraswat Co-operative Bank" }, sit({ ...none, amount: exact(600_000) }))).toBe("succession");
  });

  it("mutual funds: quick transmission only for immediate relatives up to ₹10,000; then ₹10 lakh (₹30 lakh demat)", () => {
    const none = { nominee: "none" as const };
    expect(path(HDFC_MF, sit({ ...none, amount: exact(8_000) }))).toBe("ask:relationship");
    expect(path(HDFC_MF, sit({ ...none, amount: exact(8_000), relationship: "spouse" }))).toBe("quick");
    expect(path(HDFC_MF, sit({ ...none, amount: exact(8_000), relationship: "sibling" }))).toBe("simplified");
    expect(path(HDFC_MF, sit({ ...none, amount: exact(412_300) }))).toBe("simplified");
    expect(path(HDFC_MF, sit({ ...none, amount: exact(2_500_000) }))).toBe("succession");
    expect(path(HDFC_MF, sit({ ...none, amount: exact(2_500_000), demat: true }))).toBe("simplified");
  });

  it("insurance: LIC without a nominee needs evidence of title; an insurer without a checked procedure goes to review", () => {
    expect(path(LIC, sit({ nominee: "none" }))).toBe("no_nominee");
    expect(path(LIC, sit({ nominee: "recorded" }))).toBe("nominee");
    expect(path({ category: "insurance", institution: "HDFC Life" }, sit({ nominee: "none" }))).toBe("review");
  });

  it("disputes and out-of-date procedures go to a person, never a guess (FL-17, FL-44)", () => {
    expect(path(PNB, sit({ nominee: "recorded", disputed: true }))).toBe("review");
    expect(path(PNB, sit({ nominee: "recorded" }), "2027-06-01")).toBe("review");
  });

  it("every procedure is versioned, dated and cited", () => {
    for (const p of PROCEDURES) {
      expect(p.version).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
      expect(p.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.sourceUrl).toMatch(/^https:\/\//);
      for (const pp of Object.values(p.paths)) expect(pp!.items.some((i) => i.required)).toBe(true);
    }
  });
});

describe("FL-13 / FL-14 pack contents and fingerprint", () => {
  const procedure = procedureFor("bank_deposit", "Punjab National Bank")!;
  const base = {
    procedure,
    path: "nominee" as const,
    institution: "Punjab National Bank",
    checklist: {},
    documentNames: {},
    prefill: [{ label: "Institution", value: "Punjab National Bank", source: "Holding you confirmed" }],
    accepted: [] as string[],
  };

  it("isn't ready while a required document or a declaration is missing", () => {
    const empty = buildPack(base);
    expect(packGaps(empty)).toEqual(expect.arrayContaining(["Missing: Death certificate", "3 declarations still to confirm"]));
    const full = buildPack({
      ...base,
      checklist: Object.fromEntries(procedure.paths.nominee!.items.map((i) => [i.id, { state: "have" as const }])),
      accepted: ["true", "self-submit", "no-guarantee"],
    });
    expect(packGaps(full)).toEqual([]);
    expect(full.declarations.find((d) => d.id === "self-submit")?.text).toMatch(/myself\. Financial Legacy does not submit/);
  });

  it("gives the same fingerprint for the same content, and a new one when anything changes", () => {
    expect(packHash(buildPack(base))).toBe(packHash(buildPack({ ...base })));
    expect(packHash(buildPack(base))).not.toBe(
      packHash(buildPack({ ...base, prefill: [{ label: "Institution", value: "PNB", source: "Holding you confirmed" }] }))
    );
  });
});

describe("FL-16 lifecycle", () => {
  it("only allows recorded moves that make sense, and never counts a rejection as recovery", () => {
    expect(canMove("submitted", "institution_review")).toBe(true);
    expect(canMove("rejected", "settled")).toBe(false);
    expect(canMove("rejected", "document_collection")).toBe(true);
    expect(canMove("draft", "settled")).toBe(false);
    expect(
      recovered([
        { outcome: "rejected", outcomeAmount: null },
        { outcome: "settled", outcomeAmount: "1000.00" },
        { outcome: "partially_settled", outcomeAmount: "200.00" },
      ])
    ).toEqual(["1000.00", "200.00"]);
  });
});

// ── A whole claim through the routes, on the synthetic demo case ─────────────

const session = "test-session-claims-0001";
function req(url: string, method: string, body?: unknown, sid = session) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "x-session-id": sid, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const claimOf = async (r: Response) => {
  const j = (await r.json()) as { claim?: ClaimView; error?: string };
  if (!j.claim) throw new Error(j.error ?? `status ${r.status}`);
  return j.claim;
};

async function demoWithReviewedPnb(sid = session, scenario = "demo-a") {
  const res = await loadDemo(req("/api/demo", "POST", { scenario }, sid));
  const { caseId } = (await res.json()) as { caseId: string };
  const ws = (await getWorkspacePayload(caseId, sid))!;
  const doc = ws.documents.find((d) => d.fileName.startsWith("PNB"));
  const pnb = ws.assets.find((a) => a.institution === "Punjab National Bank");
  return { caseId, ws, doc, pnb };
}

describe("a bank claim from start to outcome", () => {
  it("runs the whole lifecycle with approval bound to the pack", async () => {
    const { caseId, doc, pnb } = await demoWithReviewedPnb();
    // Not before the holding is confirmed.
    const early = await startClaimRoute(req("/api/claims", "POST", { caseId, assetId: pnb!.id }));
    expect(early.status).toBe(409);

    await review(req(`/api/documents/${doc!.id}/review`, "PUT", { decisions: doc!.fields.map((f) => ({ fieldId: f.id, decision: "accepted" })) }), params(doc!.id));
    await patchAsset(req(`/api/assets/${pnb!.id}`, "PATCH", { action: "confirm" }), params(pnb!.id));
    let claim = await claimOf(await startClaimRoute(req("/api/claims", "POST", { caseId, assetId: pnb!.id })));
    // Starting again returns the same claim.
    expect((await claimOf(await startClaimRoute(req("/api/claims", "POST", { caseId, assetId: pnb!.id })))).id).toBe(claim.id);
    expect(claim.status).toBe("draft");
    expect(claim.decision).toMatchObject({ kind: "ask", question: "nominee" });

    claim = await claimOf(await patchClaim(req(`/api/claims/${claim.id}`, "PATCH", { situation: { nominee: "none", jointHolder: "none" } }), params(claim.id)));
    // The checked balance (₹1,25,728) decides the path; entitlement is still missing, so no pack is shown.
    expect(claim.decision).toMatchObject({ kind: "path", path: "simplified" });
    expect(claim.status).toBe("authority_review");
    expect(claim.pack).toBeNull();
    expect((await db.assetRecord.findUniqueOrThrow({ where: { id: pnb!.id } })).nomineeStatus).toBe("none");

    await db.assetRecord.update({ where: { id: pnb!.id }, data: { entitled: true } }); // G4 for this holding
    claim = await claimOf(await getClaim(req(`/api/claims/${claim.id}`, "GET"), params(claim.id)));
    expect(claim.status).toBe("document_collection");
    expect(claim.procedure).toMatchObject({ id: "bank-deceased-claim", version: "2026-10-17.1" });
    expect(claim.pack!.prefill.find((f) => f.label === "Balance")?.value).toMatch(/₹1,25,728\.00 as of 2016-03-31/);

    const items = Object.fromEntries(claim.pack!.items.map((i) => [i.id, { state: "have" }]));
    const declarations = claim.pack!.declarations.map((d) => d.id);
    claim = await claimOf(await patchClaim(req(`/api/claims/${claim.id}`, "PATCH", { checklist: items, declarations }), params(claim.id)));
    expect(claim.status).toBe("pack_review");
    expect(claim.pack!.ready).toBe(true);

    // No download before approval; approval must name the exact pack.
    expect((await downloadPack(req(`/api/claims/${claim.id}/pack`, "GET"), params(claim.id))).status).toBe(403);
    expect((await approve(req(`/api/claims/${claim.id}/approve`, "POST", { contentHash: "0".repeat(64) }), params(claim.id))).status).toBe(409);
    claim = await claimOf(await approve(req(`/api/claims/${claim.id}/approve`, "POST", { contentHash: claim.pack!.contentHash }), params(claim.id)));
    expect(claim.status).toBe("ready_for_submission");
    const pdf = await downloadPack(req(`/api/claims/${claim.id}/pack`, "GET"), params(claim.id));
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");

    // FL-26: correcting a value the pack uses makes a new version and cancels the approval.
    const balField = doc!.fields.find((f) => /balance/i.test(f.label))!;
    await review(
      req(`/api/documents/${doc!.id}/review`, "PUT", { decisions: [{ fieldId: balField.id, decision: "corrected", value: "₹1,30,000.00 (31 Mar 2016)" }] }),
      params(doc!.id)
    );
    const oldHash = claim.pack!.contentHash;
    claim = await claimOf(await getClaim(req(`/api/claims/${claim.id}`, "GET"), params(claim.id)));
    expect(claim.pack!.contentHash).not.toBe(oldHash);
    expect(claim.pack!.version).toBeGreaterThan(1);
    expect(claim.status).toBe("pack_review");
    expect(claim.approval).toBeNull();
    expect(claim.events.some((e) => e.kind === "pack_changed" && /no longer applies/.test(e.note))).toBe(true);

    claim = await claimOf(await approve(req(`/api/claims/${claim.id}/approve`, "POST", { contentHash: claim.pack!.contentHash }), params(claim.id)));

    // FL-36: no receipt → "not sure it was received"; repeating changes nothing; a receipt confirms it.
    claim = await claimOf(await submit(req(`/api/claims/${claim.id}/submission`, "POST", { channel: "branch", date: "2026-10-20" }), params(claim.id)));
    expect(claim.status).toBe("submission_unknown");
    claim = await claimOf(await submit(req(`/api/claims/${claim.id}/submission`, "POST", { channel: "branch", date: "2026-10-20" }), params(claim.id)));
    expect(claim.status).toBe("submission_unknown");
    expect(claim.events.filter((e) => e.kind === "submitted")).toHaveLength(1);
    claim = await claimOf(await submit(req(`/api/claims/${claim.id}/submission`, "POST", { channel: "branch", date: "2026-10-20", receiptRef: "PNB-ACK-0042" }), params(claim.id)));
    expect(claim).toMatchObject({ status: "submitted", receiptRef: "PNB-ACK-0042", waitingOn: "institution", dueDate: "2026-11-04" });
    expect(claim.events.find((e) => e.kind === "submitted")!.note).toMatch(/^You recorded submitting/);
    // The submitted pack is frozen.
    expect((await patchClaim(req(`/api/claims/${claim.id}`, "PATCH", { declarations: [] }), params(claim.id))).status).toBe(409);

    // Outcomes: a rejection isn't a recovery; reopening keeps history.
    claim = await claimOf(await update(req(`/api/claims/${claim.id}/update`, "POST", { to: "rejected", outcomeDate: "2026-11-02", note: "Asked for a succession certificate" }), params(claim.id)));
    expect(claim).toMatchObject({ status: "rejected", outcome: "rejected", outcomeAmount: null });
    expect((await update(req(`/api/claims/${claim.id}/update`, "POST", { to: "settled", outcomeDate: "2026-11-03", outcomeAmount: "₹1,30,000" }), params(claim.id))).status).toBe(409);
    claim = await claimOf(await update(req(`/api/claims/${claim.id}/update`, "POST", { to: "document_collection", note: "Gathering the certificate" }), params(claim.id)));
    expect(claim.status).not.toBe("rejected");
    expect(claim.packVersions.length).toBeGreaterThan(1);
    expect(claim.events.map((e) => e.kind)).toEqual(expect.arrayContaining(["created", "approved", "submitted", "rejected", "document_collection"]));

    const ws = (await getWorkspacePayload(caseId, session))!;
    expect(ws.claims.find((c) => c.id === claim.id)?.assetId).toBe(pnb!.id);
  });

  it("reads 'Nominee: Not registered' from a reviewed statement into the holding", async () => {
    const { ws } = await demoWithReviewedPnb("test-session-claims-0002");
    const cas = ws.documents.find((d) => d.fileName.startsWith("CAS"))!;
    await review(
      req(`/api/documents/${cas.id}/review`, "PUT", { decisions: cas.fields.map((f) => ({ fieldId: f.id, decision: "accepted" })) }, "test-session-claims-0002"),
      params(cas.id)
    );
    const sbi = await db.assetRecord.findFirstOrThrow({ where: { caseId: ws.case.id, institution: "SBI Mutual Fund" } });
    const hdfc = await db.assetRecord.findFirstOrThrow({ where: { caseId: ws.case.id, institution: "HDFC Mutual Fund" } });
    expect(sbi.nomineeStatus).toBe("none");
    expect(hdfc.nomineeStatus).toBe("unknown");
  });

  it("refuses claims on a living person's own holdings and on someone else's case", async () => {
    const sid = "test-session-claims-0003";
    const res = await loadDemo(req("/api/demo", "POST", { scenario: "demo-c" }, sid));
    const { caseId } = (await res.json()) as { caseId: string };
    const asset = await db.assetRecord.findFirstOrThrow({ where: { caseId } });
    await db.assetRecord.update({ where: { id: asset.id }, data: { discoveryStatus: "confirmed", evidenceStatus: "self_declared" } });
    expect((await startClaimRoute(req("/api/claims", "POST", { caseId, assetId: asset.id }, sid))).status).toBe(409);
    expect((await startClaimRoute(req("/api/claims", "POST", { caseId, assetId: asset.id }, "test-session-claims-9999"))).status).toBe(404);
  });
});
