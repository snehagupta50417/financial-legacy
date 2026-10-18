import { nextWork } from "./presentation";
import { addAsset, buildPlan, docReady, emptyCase, makeDoc, refreshAsset, SAMPLE_HOOK } from "./engine";
import { claimPlan, declarationsFor, editClaim, acknowledge, approve, recordOutcome, requestApproval, startClaim, submit } from "./claims";
import { PERSONAS, personaById } from "./personas";
import type { AppState, Case, Claim, Message } from "./types";
import { addTask, iso, logActivity, setFact, uid } from "./util";

/**
 * SYNTHETIC example workspaces, one per persona (see personas.ts). Every name, number and document is
 * made up and account references are masked. Nothing connects to a real institution.
 * Each is built to show the whole product through one person's eyes: holdings at different evidence
 * levels, documents in different states, claims or plans at different stages, a family record, and a
 * real conversation.
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
function prepareClaim(c: Case, cl: Claim, situation: Partial<Claim["situation"]>, relation: string) {
  const a = c.assets.find((x) => x.id === cl.assetId)!;
  editClaim(c, cl, { situation, claimant: { relation } });
  const plan = claimPlan(a, cl);
  editClaim(c, cl, { have: Object.fromEntries(plan.items.map((i) => [i.id, true])), declarations: declarationsFor(a.institution, plan.path).map((d) => d.id) });
}

/** Approve and "submit" (the family does that themselves; nothing is sent) and place it in the past. */
function sendClaim(c: Case, cl: Claim, daysAgo: number) {
  requestApproval(c, cl);
  approve(c, cl);
  submit(c, cl, "At the branch");
  cl.submitted = { at: ago(daysAgo), ref: "Receipt recorded by you", method: "At the branch" };
}

function acknowledged(c: Case, cl: Claim, note: string, daysAgo: number) {
  acknowledge(c, cl, note);
  cl.acknowledged = { at: ago(daysAgo), note };
}

/** Spread activity over the past so the timeline reads like real weeks, newest first. */
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

// ---------------------------------------------------------------------------------------------
// Arjun Sharma, Delhi: settling his father's affairs. Claims at three different stages.
function arjun(): Case {
  const c = emptyCase("estate-sample", "Estate of Rajesh Kumar Sharma", "estate", "Rajesh Kumar Sharma (sample)");
  logActivity(c, "confirmed", "Estate record opened.");
  said(c, "goal", "Find or claim assets after a death");
  said(c, "relation", "Son");
  said(c, "name", "Rajesh Kumar Sharma (sample)");
  said(c, "known_assets", "some");
  said(c, "fork", "claim first");
  said(c, "authority", "both");
  said(c, "docs_where", "In his study, in a green file");
  const pnb = addAsset(c, { institution: "Punjab National Bank", category: "bank", nomination: "none" });
  const lic = addAsset(c, { institution: "LIC of India", category: "insurance", nomination: "recorded" });
  const hdfcMf = addAsset(c, { institution: "HDFC Mutual Fund", category: "mutual_fund", confirmed: false });
  const sbiMf = addAsset(c, { institution: "SBI Mutual Fund", category: "mutual_fund", nomination: "none", ref: "••••8654" });
  const hdfc = addAsset(c, { institution: "HDFC Bank", category: "bank", nomination: "recorded", ref: "••••4412" });
  addDoc(c, "statement", pnb.id, true); pnb.confirmed = true; refreshAsset(c, pnb);
  addDoc(c, "policy", lic.id, true); lic.confirmed = true; refreshAsset(c, lic);
  addDoc(c, "folio", hdfcMf.id, false);
  addDoc(c, "unreadable", undefined, false);
  hdfcMf.next = "Confirm whether this folio belongs to the estate";
  sbiMf.confirmed = true;
  sbiMf.next = "No nominee on this folio. Ask the fund house what it needs";
  said(c, "known", c.assets.map((a) => a.institution).join(", "));

  // The oldest: a finished claim, so the outcome step is visible too.
  hdfc.confirmed = true;
  const c3 = startClaim(c, hdfc.id)!;
  prepareClaim(c, c3, { jointHolder: "none", nominee: "recorded" }, "Son");
  sendClaim(c, c3, 50);
  acknowledged(c, c3, "Claim acknowledged by the bank", 40);
  recordOutcome(c, c3, "settled", "Amount credited to the nominee's account");
  c3.outcome = { kind: "settled", at: ago(30), note: "Amount credited to the nominee's account" };

  // With the bank, waiting.
  const c1 = startClaim(c, pnb.id)!;
  prepareClaim(c, c1, { jointHolder: "none" }, "Son");
  sendClaim(c, c1, 21);
  acknowledged(c, c1, "Branch manager confirmed receipt and asked for 15 working days", 14);
  c1.nextFollowUp = ago(-3);

  // Still gathering papers.
  const c2 = startClaim(c, lic.id)!;
  c2.situation.nominee = "recorded";
  editClaim(c, c2, { claimant: { relation: "Son" } });

  addTask(c, "Find the original LIC policy bond", "claims", "The insurer asks for the original, or an indemnity if it is lost.");
  addTask(c, "Confirm whether the HDFC Mutual Fund folio belongs to the estate", "review", "It's a potential match, not confirmed.");
  addTask(c, "Upload a clearer copy of the blurred scan", "gather", "Keeper couldn't read it. Text was too blurred.", "Unreadable file");
  addTask(c, "Follow up with Punjab National Bank after 15 working days", "follow", "Record what the bank tells you; Keeper can't check for you.");
  c.plan = buildPlan(c);
  c.docs.forEach((d, k) => { d.addedAt = ago(40 - k * 6); });
  age(c, 3);
  thread(c, "Claims for my father", "claim", [
    line("user", "My father Rajesh passed away in July. He banked with PNB and had an LIC policy. I'm his only child.", 45, { voice: true }),
    line("keeper", "I'm sorry for your loss. I've opened a private record for Rajesh Kumar Sharma and noted Punjab National Bank and LIC as what you said. Do you know of any funds or other accounts?", 45),
    line("user", "There's an HDFC mutual fund and an SBI one, I think. And an HDFC savings account with me as nominee.", 44),
    line("note", "I've noted all three. The HDFC fund looks like a potential match from a document you added. Please confirm whether it belongs to the estate.", 44),
    line("keeper", "The PNB claim is with the bank, and the HDFC savings claim is settled. The LIC claim still needs a couple of papers.", 14),
  ]);
  return c;
}

// ---------------------------------------------------------------------------------------------
// Sunita Devi, Lucknow: a death claim that LIC has gone quiet on. An overdue follow-up and what to do next.
function sunita(): Case {
  const c = emptyCase("estate-sample", "Estate of Mohan Lal", "estate", "Mohan Lal (sample)");
  logActivity(c, "confirmed", "Estate record opened.");
  said(c, "goal", "Find or claim assets after a death");
  said(c, "relation", "Daughter");
  said(c, "name", "Mohan Lal (sample)");
  said(c, "known_assets", "some");
  said(c, "fork", "claim first");
  said(c, "authority", "both");
  said(c, "docs_where", "With me, in a folder");
  const lic = addAsset(c, { institution: "LIC of India", category: "insurance", nomination: "recorded" });
  const sbi = addAsset(c, { institution: "State Bank of India", category: "bank", nomination: "recorded" });
  const post = addAsset(c, { institution: "India Post Savings (Lucknow GPO)", category: "bank", ref: "••••3307" });
  addDoc(c, "policy", lic.id, true); lic.confirmed = true; refreshAsset(c, lic);
  addDoc(c, "statement", sbi.id, true); sbi.confirmed = true; refreshAsset(c, sbi);
  addDoc(c, "duplicate", undefined, false);
  post.next = "Add a passbook to back this up";
  said(c, "known", c.assets.map((a) => a.institution).join(", "));

  // The claim that stalled: submitted, LIC wrote back asking for papers, and the follow-up date has passed.
  const c1 = startClaim(c, lic.id)!;
  prepareClaim(c, c1, { jointHolder: "none", nominee: "recorded" }, "Daughter");
  sendClaim(c, c1, 76);
  acknowledged(c, c1, "LIC wrote on 20 Aug asking for three more papers. Nothing since", 60);
  c1.nextFollowUp = ago(10);

  // The bank account: started, still gathering.
  const c2 = startClaim(c, sbi.id)!;
  c2.situation.nominee = "recorded";
  editClaim(c, c2, { claimant: { relation: "Daughter" } });

  addTask(c, "Reply to LIC's letter with the three papers it asked for", "claims", "Keep the receipt of what you send, with the date.");
  addTask(c, "Ask LIC for the claim status in writing", "follow", "A written answer gives you something to escalate with.");
  addTask(c, "If LIC stays silent, write to its Grievance Officer", "follow", "Official escalation steps and their time limits are in the claim.");
  addTask(c, "Know the next step: a complaint on IRDAI Bima Bharosa", "follow", "Keeper explains it; you file it yourself.");
  c.plan = buildPlan(c);
  c.docs.forEach((d, k) => { d.addedAt = ago(80 - k * 9); });
  age(c, 4);
  thread(c, "My father's LIC claim", "claim", [
    line("user", "My father Mohan Lal passed away in August. I'm his nominee on an LIC policy. LIC wrote asking for more papers and I've heard nothing since.", 60, { voice: true }),
    line("keeper", "I'm sorry for your loss. That wait must be hard. I've opened a record for Mohan Lal and noted the LIC policy, and I'll keep your follow-ups in one place.", 60),
    line("user", "He also had an SBI account and a post office savings book.", 59),
    line("note", "Noted both. The LIC claim is the one that has stalled: the follow-up date has passed. I've listed what to send and what to do if LIC stays quiet.", 59),
    line("keeper", "Nothing has been sent for you. You send the papers, and tell me what LIC says.", 12),
  ]);
  return c;
}

// ---------------------------------------------------------------------------------------------
// Rahul Deshmukh, Pune: organising his own estate before it is anyone else's problem.
function rahul(first: string): Case {
  const c = emptyCase("self", "My financial record", "self", `${first} (sample)`);
  logActivity(c, "confirmed", "Family record opened.");
  said(c, "goal", "Prepare for my family");
  const hdfc = addAsset(c, { institution: "HDFC Bank", category: "bank", nomination: "recorded" });
  const lic = addAsset(c, { institution: "LIC of India", category: "insurance", nomination: "recorded" });
  const sbi = addAsset(c, { institution: "SBI Mutual Fund", category: "mutual_fund", nomination: "none" });
  const demat = addAsset(c, { institution: "ICICI Bank (demat)", category: "other" });
  const flat = addAsset(c, { institution: "Pune flat (immovable property)", category: "other" });
  hdfc.confirmed = true; lic.confirmed = true;
  addDoc(c, "statement", hdfc.id, true);
  addDoc(c, "policy", lic.id, true);
  addDoc(c, "folio", sbi.id, false);
  sbi.confirmed = true;
  sbi.next = "No nominee on this folio. Register one";
  demat.next = "Add a holding statement to back this up";
  flat.next = "Release deed is still pending. Add the title papers";
  said(c, "known", c.assets.map((a) => a.institution).join(", "));
  said(c, "docs_where", "In the almirah, in the blue folder");
  said(c, "nomination", "Recorded for some");
  said(c, "contact", "Meera, wife");
  c.contacts.push({ id: uid(), name: "Meera", relation: "wife", sees: { assets: true, documents: true, instructions: true, claims: false } });
  c.contacts.push({ id: uid(), name: "Aditya", relation: "son", sees: { assets: true, documents: false, instructions: false, claims: false } });
  c.family.instructions = "Papers are in the blue folder in the almirah. My father's unregistered will is in the same folder. The locker key is with Meera.";
  c.family.cadence = "Every 6 months";
  c.family.reviewedAt = ago(75);
  said(c, "instructions", c.family.instructions);
  said(c, "review", "Every 6 months");
  addTask(c, "Register a nominee on the SBI Mutual Fund folio", "review", "Nomination decides who the fund house deals with first.");
  addTask(c, "Collect the flat's loan release deed", "gather", "Without it, the flat can't be shown as clear.");
  addTask(c, "Register your father's will and write your own", "prepare", "Keeper doesn't give legal advice; a lawyer can help with both.");
  addTask(c, "Review this record again", "follow", "Review preference: every 6 months. Notifications are not connected.");
  c.plan = buildPlan(c);
  logActivity(c, "confirmed", "You added Meera and Aditya as trusted contacts. Meera sees assets, documents and instructions; Aditya sees assets only.");
  age(c, 3);
  thread(c, "Putting my affairs in order", "prepare", [
    line("user", "I want my wife and son to never have to hunt for anything. I have a flat in Pune, a joint HDFC account, shares, an LIC policy and a fund from my father.", 60, { voice: true }),
    line("keeper", "That's a kind thing to do. I'll record each as what you said, and ask before sharing anything. Is there a nominee on each?", 60),
    line("user", "Not on the fund. I never changed it after it came to me.", 60),
    line("keeper", "Thank you. I've flagged the fund with no nominee, and added Meera and Aditya as trusted contacts who see nothing until you choose.", 60),
  ]);
  return c;
}

export const SAMPLE_VERSION = 3;

/** The example workspace for one persona. Defaults to the first. */
export function sampleState(name?: string, personaId: string = PERSONAS[0].id): AppState {
  const persona = personaById(personaId);
  const first = (name ?? "").replace(/\s*\(sample\)/, "").trim() || persona.name;
  const c = persona.id === "arjun" ? arjun() : persona.id === "sunita" ? sunita() : rahul(first);
  return { v: 1, sampleV: SAMPLE_VERSION, session: { mode: "sample", name: first, persona: persona.id }, activeCase: c.id, order: [c.id], cases: { [c.id]: c }, voiceDisclosed: false, speakReplies: false };
}

SAMPLE_HOOK.load = (name, persona) => sampleState(name, persona);
