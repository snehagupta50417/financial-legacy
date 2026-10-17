// Six-step journey and action cards from saved case data (one-pager §4; FL-01, FL-07, FL-09, FL-22).
import { describe, expect, it } from "vitest";
import { caseActions, currentStage, journeyStages } from "@/lib/journey";
import type { CaseWorkspace } from "@/lib/types";

type Ws = Parameters<typeof journeyStages>[0];

function ws(over: Partial<{ unlocked: boolean; frozen: string | null; living: boolean | null }> = {}, data: Partial<Pick<Ws, "assets" | "documents" | "tasks">> = {}): Ws {
  return {
    gate: {
      reached: over.unlocked === false ? "G1" : "G3",
      next: over.unlocked === false ? "G2" : null,
      nextLabel: over.unlocked === false ? "Proof of death" : null,
      journeyKind: "third_party",
      discoveryUnlocked: over.unlocked ?? true,
      frozenReason: over.frozen ?? null,
      linkedCaseId: null,
    },
    case: { holderLiving: over.living ?? false, scenarioLabel: "Family after a death" } as CaseWorkspace["case"],
    assets: data.assets ?? [],
    documents: data.documents ?? [],
    tasks: data.tasks ?? [],
  };
}

// Evidence status follows the server rule: unconfirmed holdings are potential matches.
const asset = (discoveryStatus: string, evidenceStatus = discoveryStatus === "possible" ? "potential_match" : "self_declared") =>
  ({ id: Math.random().toString(), discoveryStatus, evidenceStatus }) as CaseWorkspace["assets"][number];
const doc = (over: Partial<CaseWorkspace["documents"][number]>) =>
  ({ id: "d1", fileName: "PNB.pdf", extractionStatus: "extracted", userVerified: false, extractedFields: [{ label: "A", value: "B", confidence: 1, sourceExcerpt: "" }], extractionNote: null, ...over }) as CaseWorkspace["documents"][number];
const task = (status: string, isNextBest = false) => ({ id: status + isNextBest, title: `Task ${status}`, status, isNextBest, rationale: "why", instructions: "do" }) as CaseWorkspace["tasks"][number];

describe("one-pager journey stages", () => {
  it("keeps everything after verification upcoming while the gate is locked", () => {
    const s = journeyStages(ws({ unlocked: false }));
    expect(s.map((x) => x.state)).toEqual(["done", "current", "upcoming", "upcoming", "upcoming", "upcoming"]);
    expect(currentStage(s).key).toBe("verify");
  });

  it("FL-07: never marks discovery done, and potential matches keep checking open", () => {
    const s = journeyStages(ws({}, { assets: [asset("possible"), asset("confirmed")] }));
    expect(s[2]).toMatchObject({ key: "discover", state: "ongoing", detail: "2 holdings found so far" });
    expect(s[3]).toMatchObject({ key: "consolidate", state: "current", detail: "1 item to check" });
    expect(s[4].state).toBe("upcoming");
  });

  it("moves to claims once everything found is checked, and names the step by the goal", () => {
    const claims = journeyStages(ws({ living: false }, { assets: [asset("confirmed")] }));
    expect(claims[4]).toMatchObject({ title: "Prepare claims", state: "current" });
    const legacy = journeyStages(ws({ living: true }, { assets: [asset("confirmed")] }));
    expect(legacy[4].title).toBe("Prepare your legacy");
  });

  it("shows a frozen case as on hold", () => {
    const s = journeyStages(ws({ frozen: "Duplicate case" }));
    expect(s[1].state).toBe("on_hold");
    expect(currentStage(s).key).toBe("verify");
  });

  it("tracks waiting institutions and completion", () => {
    expect(journeyStages(ws({}, { tasks: [task("waiting_institution"), task("ready")] }))[5].detail).toBe("Waiting on 1 institution");
    expect(journeyStages(ws({}, { tasks: [task("completed")] }))[5].state).toBe("done");
  });
});

describe("action cards", () => {
  it("only offers verification while locked — nothing about assets", () => {
    const a = caseActions(ws({ unlocked: false }, { assets: [asset("possible")], tasks: [task("ready", true)] }));
    expect(a.map((x) => x.kind)).toEqual(["gate"]);
  });

  it("only offers help while frozen", () => {
    expect(caseActions(ws({ frozen: "Review" })).map((x) => x.kind)).toEqual(["hold"]);
  });

  it("FL-06: puts documents to check first, then matches, failures and the next step", () => {
    const a = caseActions(
      ws({}, {
        documents: [doc({ id: "a" }), doc({ id: "b", extractionStatus: "failed", extractionNote: "Unreadable", extractedFields: [] }), doc({ id: "c", userVerified: true })],
        assets: [asset("possible")],
        tasks: [task("ready", true)],
      })
    );
    expect(a.map((x) => x.kind)).toEqual(["review_document", "check_matches", "failed_document", "next_step"]);
    expect(a[0].to).toBe("records/documents/a");
  });

  it("suggests adding records to an empty case", () => {
    expect(caseActions(ws()).map((x) => x.kind)).toEqual(["add_records"]);
  });
});

describe("legacy gaps (DESIGN §7.1)", () => {
  it("lists matches to confirm, documents to check, holdings without a document, assumptions and missing info once", async () => {
    const { legacyGaps } = await import("@/lib/journey");
    const w = ws({ living: true }, {
      assets: [asset("possible"), { ...asset("confirmed"), institution: "HDFC Bank", sourceDocumentId: null } as CaseWorkspace["assets"][number]],
      documents: [doc({ id: "a" })],
      tasks: [
        { ...task("ready"), missingInfo: ["Nominee name"] },
        { ...task("in_progress"), id: "t2", missingInfo: ["Nominee name", "Folio number"] },
        { ...task("completed"), id: "t3", missingInfo: ["Old item"] },
      ] as CaseWorkspace["tasks"],
    });
    w.case.assumptions = ["No will has been located yet"];
    expect(legacyGaps(w).map((g) => g.kind)).toEqual(["confirm_matches", "review_document", "add_document", "check", "missing_info", "missing_info"]);
    expect(legacyGaps(w).filter((g) => g.kind === "missing_info").map((g) => g.text)).toEqual(["Nominee name", "Folio number"]);
  });
});

describe("claims in the journey (FL-15)", () => {
  const claim = (assetId: string, status: string) => ({ id: assetId + status, assetId, status }) as CaseWorkspace["claims"][number];

  it("shows claims being prepared, then tracked, then closed", () => {
    const a1 = { ...asset("confirmed"), id: "a1" };
    const a2 = { ...asset("confirmed"), id: "a2" };
    const base = { assets: [a1, a2] };
    const stage = (claims: CaseWorkspace["claims"]) => {
      const s = journeyStages({ ...ws({ living: false }, base), claims });
      return [s.find((x) => x.key === "act")!.state, s.find((x) => x.key === "track")!.state];
    };
    expect(stage([claim("a1", "document_collection")])).toEqual(["current", "upcoming"]);
    expect(stage([claim("a1", "submitted"), claim("a2", "pack_review")])).toEqual(["current", "ongoing"]);
    expect(stage([claim("a1", "settled"), claim("a2", "rejected")])).toEqual(["done", "done"]);
  });
});
