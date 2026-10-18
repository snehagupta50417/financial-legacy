// Keeper prototype: the three journeys end to end through the reducer (synthetic data, deterministic assistant).
import { describe, expect, it } from "vitest";
import { reduce, freshState, type Action } from "@/keeper/engine";
import { sampleState } from "@/keeper/sample";
import { claimPlan, claimStep } from "@/keeper/claims";
import { STARTERS } from "@/keeper/catalog";
import type { AppState, Case, Message } from "@/keeper/types";

const run = (s: AppState, ...actions: Action[]) => actions.reduce(reduce, s);
const send = (text: string): Action => ({ t: "send", text });
const pick = (id: string, label = id): Action => ({ t: "choose", id, label });
const cur = (s: AppState): Case => s.cases[s.activeCase];
const thread = (c: Case) => c.threads.find((t) => t.id === c.activeThread)!;
const last = (s: AppState): Message => thread(cur(s)).messages.filter((m) => m.role !== "user").at(-1)!;
const texts = (s: AppState) => thread(cur(s)).messages.map((m) => m.text).join("\n");
const fresh = () => freshState("Asha", "signin");

describe("flow 1 — discover → document → correction → asset review → verification task", () => {
  it("gathers detail one question at a time, remembers it, and ends with evidence-backed assets", () => {
    let s = run(fresh(), send(STARTERS[0].text));
    expect(thread(cur(s)).journey).toBe("discover");
    expect(last(s).pending).toBe("known");

    s = run(s, send("I had an HDFC savings account and some Mirae funds"));
    expect(cur(s).assets.map((a) => a.institution)).toEqual(expect.arrayContaining(["HDFC Bank", "Mirae Asset Mutual Fund"]));
    expect(cur(s).assets.every((a) => a.evidence === "self_declared")).toBe(true);
    expect(last(s).pending).toBe("clues");

    s = run(s, send("Moved from Pune to Chennai in 2016, worked at Infosys"));
    expect(cur(s).facts.clues.value).toMatch(/Infosys/);
    expect(last(s).pending).toBe("docs");

    s = run(s, pick("s:docs:later", "I have some at home"), pick("s:consent:yes", "Yes, prepare them"));
    expect(cur(s).plan.find((p) => p.id === "udgam")?.state).toBe("ready");
    expect(cur(s).plan.find((p) => p.id === "connected")?.state).toBe("unavailable"); // never pretends to be a live connection
    expect(cur(s).tasks.some((t) => /Add the documents/.test(t.title))).toBe(true);

    // Sample document → processing → read → fields to review
    s = run(s, { t: "doc.sample", variant: "statement" });
    const doc = cur(s).docs[0];
    expect(doc.state).toBe("processing");
    s = run(s, { t: "doc.ready", id: doc.id });
    const d = cur(s).docs[0];
    expect(d.state).toBe("ready");
    const hdfc = cur(s).assets.find((a) => a.institution === "HDFC Bank")!;
    expect(hdfc.docIds).toContain(d.id);
    expect(hdfc.evidence).toBe("self_declared"); // read, but not yet reviewed
    expect(cur(s).tasks.some((t) => /Confirm with HDFC Bank/.test(t.title))).toBe(true); // verification task

    // Correct one field, accept the rest → document-backed, with a dated, labelled amount
    const holder = d.fields.find((f) => f.label === "Account holder")!;
    s = run(s, { t: "doc.field", docId: d.id, fieldId: holder.id, value: "Asha Rao" });
    expect(cur(s).docs[0].fields.find((f) => f.id === holder.id)).toMatchObject({ value: "Asha Rao", corrected: true, reviewed: true });
    for (const f of cur(s).docs[0].fields) s = run(s, { t: "doc.field", docId: d.id, fieldId: f.id, reviewed: true });
    const after = cur(s).assets.find((a) => a.institution === "HDFC Bank")!;
    expect(after.evidence).toBe("document_backed");
    expect(after.amount).toMatchObject({ value: 58240, type: expect.stringMatching(/historical/), asOf: "31 Mar 2024" });
    expect(cur(s).activity.some((a) => /corrected/.test(a.text))).toBe(true);
  });

  it("a clue found in a document stays a potential match until the user confirms it", () => {
    let s = run(fresh(), send(STARTERS[0].text), { t: "doc.sample", variant: "policy" });
    s = run(s, { t: "doc.ready", id: cur(s).docs[0].id });
    const a = cur(s).assets.find((x) => x.institution === "LIC of India")!;
    expect(a.evidence).toBe("potential_match");
    s = run(s, { t: "asset.confirm", id: a.id });
    expect(cur(s).assets[0].evidence).toBe("self_declared");
  });

  it("handles unreadable, password-protected and duplicate files honestly", () => {
    let s = fresh();
    for (const v of ["unreadable", "password"] as const) { s = run(s, { t: "doc.sample", variant: v }); s = run(s, { t: "doc.ready", id: cur(s).docs.at(-1)!.id }); }
    expect(cur(s).docs.map((d) => d.state)).toEqual(["unreadable", "password"]);
    expect(cur(s).assets).toHaveLength(0);
    expect(texts(s)).toMatch(/never asks for passwords/);
    s = run(s, { t: "doc.sample", variant: "statement" }); s = run(s, { t: "doc.ready", id: cur(s).docs.at(-1)!.id });
    s = run(s, { t: "doc.sample", variant: "duplicate" }); s = run(s, { t: "doc.ready", id: cur(s).docs.at(-1)!.id });
    expect(cur(s).docs.at(-1)!.state).toBe("duplicate");
    expect(cur(s).assets).toHaveLength(1);
  });

  it("flags a possible duplicate against a placeholder record, and merging keeps the history", () => {
    let s = run(fresh(), send("I lost track of my old bank account"));
    expect(cur(s).assets[0].institution).toMatch(/bank not named/);
    s = run(s, { t: "doc.sample", variant: "statement" });
    s = run(s, { t: "doc.ready", id: cur(s).docs[0].id });
    const real = cur(s).assets.find((a) => a.institution === "HDFC Bank")!;
    expect(real.duplicateOf).toBeTruthy();
    s = run(s, { t: "asset.dup", id: real.id, merge: true });
    expect(cur(s).assets).toHaveLength(1);
    expect(cur(s).assets[0].history.length).toBeGreaterThan(2);
  });
});

describe("flow 2 — prepare for family → known assets and gaps → family record → contact preview", () => {
  it("builds the family record without a questionnaire, and shares nothing by default", () => {
    let s = run(fresh(), send(STARTERS[1].text));
    expect(thread(cur(s)).journey).toBe("prepare");
    expect(texts(s)).toMatch(/does not replace a will/);
    s = run(s, send("SBI savings, LIC policy and some HDFC mutual fund"));
    expect(cur(s).assets.map((a) => a.category).sort()).toEqual(["bank", "insurance", "mutual_fund"]);
    s = run(s, pick("s:docs_where:home", "At home"));
    s = run(s, pick("s:nomination:some", "For some"));
    expect(cur(s).tasks.some((t) => /nominees/.test(t.title))).toBe(true); // missing information becomes a task
    s = run(s, send("Anita, daughter"));
    expect(cur(s).contacts[0]).toMatchObject({ name: "Anita", relation: "daughter", sees: { assets: false, documents: false, instructions: false, claims: false } });
    s = run(s, send("The FD papers are in the blue folder"), pick("s:review:6m", "Every 6 months"));
    expect(cur(s).family).toMatchObject({ cadence: "Every 6 months", instructions: expect.stringMatching(/blue folder/) });
    expect(last(s).card?.type).toBe("family");
    s = run(s, { t: "contact.toggle", id: cur(s).contacts[0].id, key: "assets" });
    expect(cur(s).contacts[0].sees.assets).toBe(true);
    expect(cur(s).contacts[0].sees.documents).toBe(false);
  });
});

describe("flow 3 — after a death → known asset → authority → checklist → approval → simulated submission → outcome", () => {
  const HERO = "My father passed away. We know about his bank account, but not his investments.";

  it("reads the situation, offers the three choices, and keeps what it inferred separate from what was said", () => {
    const s = run(fresh(), send(HERO));
    expect(Object.keys(s.cases)).toHaveLength(2); // a separate estate record, never mixed with your own
    expect(cur(s).kind).toBe("estate");
    expect(cur(s).assets.map((a) => a.institution)).toEqual(["Bank account (bank not named)"]); // investments not invented
    expect(cur(s).facts.relation.value).toBe("Child");
    expect(cur(s).facts.known_assets).toMatchObject({ value: "some", source: "Keeper inferred", state: "needs_confirmation" });
    expect(last(s).choices?.map((c) => c.label)).toEqual(["Start the bank claim", "Look for investments", "Help me decide"]);
  });

  it("runs a claim from start to a recorded outcome, with approval bound to the exact package", () => {
    let s = run(fresh(), send(HERO));
    const bank = cur(s).assets[0];
    s = run(s, pick(`a:startClaim:${bank.id}`, "Start the bank claim"));
    const cl = cur(s).claims[0];
    expect(cur(s).focus).toEqual({ type: "claim", id: cl.id });
    expect(last(s).pending).toBe("name");

    s = run(s, send("Ramesh Iyer"), pick("s:nominee:none", "No nominee"), pick("s:authority:both", "Yes, both"));
    expect(cur(s).name).toBe("Estate of Ramesh Iyer");
    expect(cur(s).claims[0].have["death-certificate"]).toBe(true); // already said they have it

    // Path comes from the cited RBI procedure; a missing amount is asked, not guessed.
    let plan = claimPlan(cur(s).assets[0], cur(s).claims[0]);
    expect(plan.decision.kind).toBe("ask");
    s = run(s, { t: "claim.edit", id: cl.id, edit: { situation: { jointHolder: "none", amountBand: "10001-500000" } } });
    plan = claimPlan(cur(s).assets[0], cur(s).claims[0]);
    expect(plan.path).toBe("simplified");
    expect(plan.procedure?.authority).toMatch(/RBI/);
    expect(claimStep(cur(s), cur(s).claims[0])).toBe("authority"); // Having a certificate is not authority verification.

    // Can't request approval until required items and declarations are in.
    s = run(s, { t: "claim.request", id: cl.id });
    expect(cur(s).claims[0].approval).toBeNull();
    const have = Object.fromEntries(plan.items.filter((i) => i.required).map((i) => [i.id, true]));
    s = run(s, { t: "claim.edit", id: cl.id, edit: { have, declarations: ["true", "self-submit", "no-guarantee"] } });
    expect(cur(s).claims[0].prepared).toBe(true);
    s = run(s, { t: "claim.request", id: cl.id });
    expect(cur(s).claims[0].approval).toMatchObject({ state: "requested", recipient: expect.stringMatching(/bank not named/) });

    // Changing the package after approval invalidates it, and submission is refused.
    s = run(s, { t: "claim.approve", id: cl.id });
    expect(cur(s).claims[0].approval?.state).toBe("approved");
    s = run(s, { t: "claim.edit", id: cl.id, edit: { have: { "indemnity-ic": false } } });
    expect(cur(s).claims[0].approval?.state).toBe("invalidated");
    s = run(s, { t: "claim.submit", id: cl.id, method: "branch" });
    expect(cur(s).claims[0].submitted).toBeNull();
    expect(cur(s).activity[0].text).toMatch(/no longer applies/);

    // Re-prepare, re-approve, simulate submission, record acknowledgement and outcome.
    s = run(s, { t: "claim.edit", id: cl.id, edit: { have: { "indemnity-ic": true } } }, { t: "claim.request", id: cl.id }, { t: "claim.approve", id: cl.id }, { t: "claim.submit", id: cl.id, method: "branch" });
    expect(cur(s).claims[0].submitted?.ref).toBe("Not submitted");
    expect(cur(s).claims[0].nextFollowUp).toBeNull();
    expect(cur(s).activity.some((a) => a.kind === "sent" && /Nothing was sent/.test(a.text))).toBe(true);
    s = run(s, { t: "claim.ack", id: cl.id, note: "Counter receipt 42" }, { t: "claim.outcome", id: cl.id, kind: "rejected", note: "Needs a succession certificate" });
    expect(cur(s).claims[0].outcome?.kind).toBe("rejected");
    expect(claimStep(cur(s), cur(s).claims[0])).toBe("outcome");
    expect(cur(s).activity.map((a) => a.kind)).toEqual(expect.arrayContaining(["prepared", "approved", "sent", "institution"]));
  });

  it("'Look for investments' starts a separate search without repeating what it knows", () => {
    let s = run(fresh(), send(HERO));
    s = run(s, pick("a:investigate", "Look for investments"));
    expect(thread(cur(s)).journey).toBe("discover");
    expect(cur(s).threads).toHaveLength(2);
    expect(texts(s)).not.toMatch(/bank account.*bank account/i);
  });
});

describe("rules that hold across the app", () => {
  it("unknown answers become follow-ups and never block; skipped questions are remembered", () => {
    let s = run(fresh(), send(STARTERS[0].text), pick("m:unknown", "I don't know"));
    expect(cur(s).facts.known.state).toBe("unknown");
    expect(cur(s).tasks.some((t) => /Find out/.test(t.title))).toBe(true);
    expect(last(s).pending).toBe("clues"); // moved on
    s = run(s, send("skip for now"));
    expect(cur(s).facts.clues.state).toBe("not_provided");
    s = run(s, pick("m:why", "Why do you need this?"));
    expect(last(s).text).toMatch(/strongest evidence/);
  });

  it("never asks again for something already confirmed, and a new conversation remembers", () => {
    let s = run(fresh(), send(STARTERS[1].text), send("LIC and HDFC mutual fund"));
    const asked = thread(cur(s)).messages.filter((m) => m.pending === "known").length;
    expect(asked).toBe(1);
    s = run(s, { t: "newThread" }, pick("j:discover", "Find my assets"));
    expect(thread(cur(s)).messages.some((m) => m.pending === "known")).toBe(false);
    expect(thread(cur(s)).messages.at(-1)?.pending).toBe("clues");
  });

  it("switching cases never mixes information", () => {
    let s = run(fresh(), send("My mother died. She had an SBI account."));
    const estateId = s.activeCase;
    expect(cur(s).assets[0].institution).toBe("State Bank of India");
    s = run(s, { t: "switchCase", id: "self" });
    expect(cur(s).assets).toHaveLength(0);
    expect(cur(s).facts.relation).toBeUndefined();
    s = run(s, { t: "switchCase", id: estateId });
    expect(cur(s).assets).toHaveLength(1);
  });

  it("manual changes show up in conversation context; conversation changes show up in views", () => {
    let s = run(fresh(), { t: "asset.add", institution: "Bank A", category: "bank", ref: "1234 5678 9012" });
    expect(cur(s).assets[0].ref).toBe("••••9012"); // only the last four digits are ever kept
    expect(thread(cur(s)).messages).toHaveLength(1);
    expect(cur(s).context).toContain("added Bank A");
    s = run(s, { t: "asset.edit", id: cur(s).assets[0].id, patch: { institution: "Bank A Ltd" } });
    expect(cur(s).context).toContain("updated Bank A Ltd");
    s = run(s, send(STARTERS[1].text));
    expect(texts(s)).toMatch(/updated Bank A Ltd/);
    s = run(s, send("and HDFC"));
    expect(cur(s).assets.map((a) => a.institution)).toContain("HDFC Bank");
  });

  it("explores a sample, preserves it, and resets it", () => {
    let s = run(fresh(), pick("m:sample", "Explore a sample"));
    expect(s.session?.mode).toBe("sample");
    expect(s.order).toHaveLength(1); // one persona's world at a time
    expect(s.cases["estate-sample"].name).toBe("Estate of Rajesh Kumar Sharma");
    const before = JSON.stringify(sampleState("Arjun Sharma").order);
    s = run(s, { t: "switchCase", id: "estate-sample" }, pick("m:resume", "Continue where we left off"));
    expect(last(s).text.length).toBeGreaterThan(20); // Keeper picks the next open question or step
    s = run(s, { t: "reset" });
    expect(JSON.stringify(s.order)).toBe(before);
    expect(s.activeCase).toBe("estate-sample"); // the example opens on the estate record
  });

  it("never stores a full account number, and sample documents are labelled", () => {
    let s = run(fresh(), { t: "doc.sample", variant: "statement" });
    expect(cur(s).docs[0].text).toMatch(/SAMPLE DOCUMENT/);
    s = run(s, { t: "doc.ready", id: cur(s).docs[0].id });
    expect(JSON.stringify(s)).not.toMatch(/\d{9,}/);
  });
});
