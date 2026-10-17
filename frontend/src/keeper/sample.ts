import { nextWork } from "./presentation";
import { addAsset, docReady, emptyCase, makeDoc, refreshAsset, SAMPLE_HOOK, newThread } from "./engine";
import { startClaim } from "./claims";
import type { AppState, Case, Message } from "./types";
import { addTask, iso, logActivity, setFact, uid } from "./util";

/**
 * SYNTHETIC sample cases for "Explore a sample" and "Reset demo". Every name, number and
 * document here is made up; account references are masked. Nothing connects to a real institution.
 */

const keeperMsg = (text: string, extra: Partial<Message> = {}): Message => ({ id: uid(), role: "keeper", text, ts: iso(), ...extra });

function reviewDoc(c: Case, docId: string) {
  const d = c.docs.find((x) => x.id === docId)!;
  d.fields.forEach((f) => (f.reviewed = true));
  const a = c.assets.find((x) => x.id === d.assetId);
  if (a) refreshAsset(c, a);
}

function mine(name: string): Case {
  const c = emptyCase("self", "My financial record", "self", `${name} (sample)`);
  const f = (k: string, v: string) => setFact(c, k, v, "confirmed", "Sample record");
  f("goal", "Prepare for my family");
  const hdfc = addAsset(c, { institution: "HDFC Bank", category: "bank" });
  const lic = addAsset(c, { institution: "LIC of India", category: "insurance", nomination: "recorded" });
  addAsset(c, { institution: "SBI Mutual Fund", category: "mutual_fund" });
  const d = makeDoc(c, "statement", hdfc.id);
  c.docs.push(d);
  docReady(c, d);
  hdfc.confirmed = true;
  reviewDoc(c, d.id);
  void lic;
  c.assets.find((a) => a.institution === "SBI Mutual Fund")!.next = "Confirm the nominee on this folio";
  f("known", c.assets.map((a) => a.institution).join(", "));
  f("docs_where", "At home, in the blue folder");
  f("nomination", "Recorded for some");
  setFact(c, "contact", "Anita, daughter", "confirmed", "Sample record");
  c.contacts.push({ id: uid(), name: "Anita", relation: "daughter", sees: { assets: false, documents: false, instructions: false, claims: false } });
  f("instructions", "FD papers and the LIC policy are in the blue folder in the almirah.");
  c.family.instructions = "FD papers and the LIC policy are in the blue folder in the almirah.";
  f("review", "Every 6 months");
  c.family.cadence = "Every 6 months";
  c.family.reviewedAt = "2026-04-02T10:00:00.000Z";
  addTask(c, "Check nominees on each account and policy", "review", "Nomination decides who the institution deals with first.");
  addTask(c, "Choose what Anita can see", "prepare", "Nothing is shared until you choose, and you can preview her exact view.");
  addTask(c, "Review this record again", "follow", "Review preference: every 6 months. Notifications are not connected.");
  logActivity(c, "confirmed", "Family record opened.");
  const th = c.threads[0];
  th.title = "Preparing my family record";
  th.journey = "prepare";
  th.messages.length = 0; // building the sample read a document; start the thread clean
  c.focus = null;
  th.messages.push(keeperMsg(nextWork(c)?.text || "Your family record is ready for review.", {
    card: nextWork(c)?.card,
    choices: [{ id: "m:resume", label: "Continue" }, { id: "m:something", label: "Something else" }],
  }));
  return c;
}

function estate(): Case {
  const c = emptyCase("estate-sample", "Estate of Ramesh Iyer", "estate", "Ramesh Iyer (sample)");
  const f = (k: string, v: string) => setFact(c, k, v, "confirmed", "Sample record");
  f("goal", "Find or claim assets after a death");
  f("relation", "Child");
  f("name", "Ramesh Iyer (sample)");
  setFact(c, "known_assets", "some", "confirmed", "Sample record");
  f("fork", "claim first");
  f("authority", "both");
  const pnb = addAsset(c, { institution: "Punjab National Bank", category: "bank", nomination: "none" });
  addAsset(c, { institution: "LIC of India", category: "insurance", nomination: "recorded" });
  const mf = addAsset(c, { institution: "Nippon India Mutual Fund", category: "mutual_fund", confirmed: false });
  mf.next = "Confirm whether this folio belongs to the estate";
  const d = makeDoc(c, "statement", pnb.id);
  c.docs.push(d);
  docReady(c, d);
  pnb.confirmed = true;
  reviewDoc(c, d.id);
  f("known", c.assets.map((a) => a.institution).join(", "));
  const cl = startClaim(c, pnb.id)!;
  cl.claimant.relation = "Child";
  cl.situation.jointHolder = "none";
  addTask(c, "Gather the documents for the Punjab National Bank claim", "claims", "Each claim has its own checklist.");
  addTask(c, "Confirm whether the Nippon India folio belongs to the estate", "review", "It's a potential match, not confirmed.");
  addTask(c, "Choose which claim to start next", "claims", "Each institution has its own requirements.");
  logActivity(c, "confirmed", "Estate record opened.");
  c.focus = null;
  const th = c.threads[0];
  th.title = "Claims for Ramesh Iyer";
  th.journey = "claim";
  th.messages.length = 0;
  th.messages.push(keeperMsg(nextWork(c)?.text || "Your estate record is ready for review.", {
    card: nextWork(c)?.card,
    choices: [{ id: "m:resume", label: "Continue where we left off" }, { id: "m:something", label: "Something else" }],
  }));
  return c;
}

export function sampleState(name = "Asha Rao"): AppState {
  const first = name.replace(/\s*\(sample\)/, "").trim() || "Asha Rao";
  const me = mine(first);
  const es = estate();
  void newThread;
  return { v: 1, session: { mode: "sample", name: first }, activeCase: me.id, order: [me.id, es.id], cases: { [me.id]: me, [es.id]: es }, voiceDisclosed: false, speakReplies: false };
}

SAMPLE_HOOK.load = sampleState;
