import { nextWork } from "./presentation";
import { addAsset, buildPlan, docReady, emptyCase, makeDoc, refreshAsset, SAMPLE_HOOK } from "./engine";
import { claimPlan, declarationsFor, editClaim, acknowledge, approve, recordOutcome, requestApproval, startClaim, submit } from "./claims";
import type { AppState, Case, Claim, Message } from "./types";
import { addTask, iso, logActivity, setFact, uid } from "./util";

/**
 * SYNTHETIC sample workspace for "Explore an example". Every name, number and document is made up and
 * account references are masked. Nothing connects to a real institution. It is built to show the whole
 * product at once: holdings at every evidence level, documents in every state, claims at every stage
 * (open and missing papers, waiting for the bank, settled), a family record, and a real conversation.
 */

const ago = (days: number, hour = 10) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
const said = (c: Case, k: string, v: string) => setFact(c, k, v, "confirmed", "Sample record");
const line = (role: Message["role"], text: string, days: number, extra: Partial<Message> = {}): Message => ({ id: uid(), role, text, ts: ago(days, 11), ...extra });

function reviewDoc(c: Case, docId: string) {
  const d = c.docs.find((x) => x.id === docId)!;
  d.fields.forEach((f) => (f.reviewed = true));
  const a = c.assets.find((x) => x.id === d.assetId);
  if (a) refreshAsset(c, a);
}

function addDoc(c: Case, variant: Parameters<typeof makeDoc>[1], assetId: string | undefined, reviewed: boolean) {
  const d = makeDoc(c, variant, assetId);
  c.docs.push(d);
  docReady(c, d);
  if (reviewed) reviewDoc(c, d.id);
  return d;
}

/** Answer every question and gather every paper, so the package is ready to review. */
function prepareClaim(c: Case, cl: Claim, situation: Partial<Claim["situation"]>) {
  const a = c.assets.find((x) => x.id === cl.assetId)!;
  editClaim(c, cl, { situation, claimant: { relation: "Child" } });
  const plan = claimPlan(a, cl);
  editClaim(c, cl, { have: Object.fromEntries(plan.items.map((i) => [i.id, true])), declarations: declarationsFor(a.institution, plan.path).map((d) => d.id) });
}

/** Approve and "submit" (the family does that themselves; nothing is sent) and place events in the past. */
function sendClaim(c: Case, cl: Claim, daysAgo: number) {
  requestApproval(c, cl);
  approve(c, cl);
  submit(c, cl, "At the branch");
  cl.submitted = { at: ago(daysAgo), ref: "Receipt recorded by you", method: "At the branch" };
}

/** Spread activity over the past so the timeline reads like a real month, newest first. */
function age(c: Case, stepDays: number) {
  c.activity.forEach((e, k) => { e.at = ago(Math.round(k * stepDays) + 1, 9 + (k % 6)); });
}

function thread(c: Case, title: string, journey: "prepare" | "claim", messages: Message[]) {
  const th = c.threads[0];
  th.title = title;
  th.journey = journey;
  th.pending = null;
  c.focus = null;
  const work = nextWork(c);
  th.messages = [
    ...messages,
    { id: uid(), role: "keeper", ts: iso(), text: work?.text || "Everything is up to date. What would you like to look at?", card: work?.card, choices: [{ id: "m:resume", label: "Continue" }, { id: "m:something", label: "Something else" }] },
  ];
}

function mine(first: string): Case {
  const c = emptyCase("self", "My financial record", "self", `${first} (sample)`);
  logActivity(c, "confirmed", "Family record opened.");
  said(c, "goal", "Prepare for my family");
  const hdfc = addAsset(c, { institution: "HDFC Bank", category: "bank", nomination: "recorded" });
  const lic = addAsset(c, { institution: "LIC of India", category: "insurance", nomination: "recorded" });
  const sbi = addAsset(c, { institution: "SBI Mutual Fund", category: "mutual_fund" });
  const epf = addAsset(c, { institution: "EPFO (Provident Fund)", category: "retirement", ref: "••••7291" });
  hdfc.confirmed = true; lic.confirmed = true;
  addDoc(c, "statement", hdfc.id, true);
  addDoc(c, "policy", lic.id, true);
  addDoc(c, "folio", sbi.id, false);
  sbi.confirmed = true;
  sbi.next = "Review the folio details, then confirm the nominee";
  epf.next = "Add a passbook or UAN statement to back this up";
  said(c, "known", c.assets.map((a) => a.institution).join(", "));
  said(c, "docs_where", "At home, in the blue folder");
  said(c, "nomination", "Recorded for some");
  said(c, "clues", "Moved from Pune to Chennai in 2016, worked at Infosys");
  said(c, "contact", "Anita, daughter");
  c.contacts.push({ id: uid(), name: "Anita", relation: "daughter", sees: { assets: true, documents: false, instructions: true, claims: false } });
  c.contacts.push({ id: uid(), name: "Vikram", relation: "brother", sees: { assets: false, documents: false, instructions: false, claims: false } });
  c.family.instructions = "FD papers and the LIC policy are in the blue folder in the almirah. The locker key is with Anita.";
  c.family.cadence = "Every 6 months";
  c.family.reviewedAt = ago(75);
  said(c, "instructions", c.family.instructions);
  said(c, "review", "Every 6 months");
  addTask(c, "Check the nominee on the SBI Mutual Fund folio", "review", "Nomination decides who the institution deals with first.");
  addTask(c, "Add an EPFO passbook to back up the provident fund", "gather", "Without a document it stays self-declared.");
  addTask(c, "Review this record again", "follow", "Review preference: every 6 months. Notifications are not connected.");
  c.plan = buildPlan(c);
  logActivity(c, "confirmed", "You added Anita as a trusted contact. She can see assets and instructions, not documents.");
  age(c, 3);
  thread(c, "Preparing my family record", "prepare", [
    line("user", "I want to put my financial affairs in order so my daughter never has to hunt for anything.", 60, { voice: true }),
    line("keeper", "That's a kind thing to do. Which banks, funds or insurers do you have money with?", 60),
    line("user", `HDFC Bank, an LIC policy and an SBI mutual fund. Anita is my daughter. My name is ${first}.`, 60),
    line("keeper", "Thank you. I've noted all three as what you said, and added Anita as a trusted contact who sees nothing until you choose. Adding a statement or policy for each makes it document-backed.", 60),
  ]);
  return c;
}

function estate(): Case {
  const c = emptyCase("estate-sample", "Estate of Ramesh Iyer", "estate", "Ramesh Iyer (sample)");
  logActivity(c, "confirmed", "Estate record opened.");
  said(c, "goal", "Find or claim assets after a death");
  said(c, "relation", "Child");
  said(c, "name", "Ramesh Iyer (sample)");
  said(c, "known_assets", "some");
  said(c, "fork", "claim first");
  said(c, "authority", "both");
  said(c, "docs_where", "In his study, in a green file");
  const pnb = addAsset(c, { institution: "Punjab National Bank", category: "bank", nomination: "none" });
  const lic = addAsset(c, { institution: "LIC of India", category: "insurance", nomination: "recorded" });
  const mf = addAsset(c, { institution: "Nippon India Mutual Fund", category: "mutual_fund", confirmed: false });
  const hdfc = addAsset(c, { institution: "HDFC Bank", category: "bank", nomination: "recorded", ref: "••••4412" });
  const epf = addAsset(c, { institution: "EPFO (Provident Fund)", category: "retirement", ref: "••••7291" });
  addDoc(c, "statement", pnb.id, true); pnb.confirmed = true; refreshAsset(c, pnb);
  addDoc(c, "policy", lic.id, true); lic.confirmed = true; refreshAsset(c, lic);
  addDoc(c, "folio", mf.id, false);
  addDoc(c, "unreadable", undefined, false);
  mf.next = "Confirm whether this folio belongs to the estate";
  hdfc.next = "Add a statement to back this up";
  epf.next = "Ask EPFO about a claim. Add the UAN if you find it";
  said(c, "known", c.assets.map((a) => a.institution).join(", "));

  // Claim 3: a finished one, so the outcome step is visible too.
  const c3 = startClaim(c, hdfc.id)!;
  hdfc.confirmed = true;
  prepareClaim(c, c3, { jointHolder: "none", nominee: "recorded" });
  sendClaim(c, c3, 50);
  acknowledge(c, c3, "Claim acknowledged by the bank");
  c3.acknowledged = { at: ago(40), note: "Claim acknowledged by the bank" };
  recordOutcome(c, c3, "settled", "Amount credited to the nominee's account");
  c3.outcome = { kind: "settled", at: ago(30), note: "Amount credited to the nominee's account" };

  // Claim 1: prepared, approved, "submitted" by the family and acknowledged by the bank.
  const c1 = startClaim(c, pnb.id)!;
  prepareClaim(c, c1, { jointHolder: "none" });
  sendClaim(c, c1, 21);
  acknowledge(c, c1, "Branch manager confirmed receipt and asked for 15 working days");
  c1.acknowledged = { at: ago(14), note: "Branch manager confirmed receipt and asked for 15 working days" };
  c1.nextFollowUp = ago(-3);

  // Claim 2: started, still missing papers.
  const c2 = startClaim(c, lic.id)!;
  c2.situation.nominee = "recorded";
  editClaim(c, c2, { claimant: { relation: "Child" } });

  addTask(c, "Find the original LIC policy bond", "claims", "The insurer asks for the original, or an indemnity if it is lost.");
  addTask(c, "Confirm whether the Nippon India folio belongs to the estate", "review", "It's a potential match, not confirmed.");
  addTask(c, "Upload a clearer copy of the blurred scan", "gather", "Keeper couldn't read it. Text was too blurred.", "Unreadable file");
  addTask(c, "Follow up with Punjab National Bank on 15 working days", "follow", "Record what the bank tells you; Keeper can't check for you.");
  c.plan = buildPlan(c);
  c.docs.forEach((d, k) => { d.addedAt = ago(40 - k * 6); });
  age(c, 3);
  thread(c, "Claims for Ramesh Iyer", "claim", [
    line("user", "My father Ramesh passed away in August. He banked with PNB and had an LIC policy. I'm his only child.", 45, { voice: true }),
    line("keeper", "I'm sorry for your loss. I've opened a private record for Ramesh Iyer and noted Punjab National Bank and LIC as what you said. Do you know of any funds or other accounts?", 45),
    line("user", "There may be a Nippon India fund, and an HDFC savings account with me as nominee.", 44),
    line("note", "I've noted both. The fund looks like a potential match from a document you added. Please confirm whether it belongs to the estate.", 44),
    line("keeper", "The PNB claim package is with the bank, and the HDFC claim is settled. The LIC claim still needs a couple of papers.", 14),
  ]);
  return c;
}

export const SAMPLE_VERSION = 2;

export function sampleState(name = "Asha Rao"): AppState {
  const first = name.replace(/\s*\(sample\)/, "").trim() || "Asha Rao";
  const me = mine(first);
  const es = estate();
  // The estate record opens first: it shows claims, documents and follow-ups, the whole product.
  return { v: 1, sampleV: SAMPLE_VERSION, session: { mode: "sample", name: first }, activeCase: es.id, order: [es.id, me.id], cases: { [me.id]: me, [es.id]: es }, voiceDisclosed: false, speakReplies: false };
}

SAMPLE_HOOK.load = sampleState;
