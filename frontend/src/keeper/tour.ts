import type { Journey } from "./types";
import type { Phase } from "./agent";

/**
 * "Meet Keeper": a short, scripted walk through one turn of Keeper's loop, with fictional people.
 * It is a demonstration, not a live conversation, and the screen says so. It teaches the same five
 * beats the real voice agent uses (you speak, Keeper understands, acts, asks before anything that
 * matters, then closes the loop), one at a time, so nothing else is on screen to distract.
 * Copy follows the product rules: nothing is called verified, nothing is sent for the family,
 * guided searches are run by the person.
 */

export type Beat =
  | { kind: "user"; phase: Phase; label: string; text: string }
  | { kind: "understood"; phase: Phase; label: string; say: string; chips: string[] }
  | { kind: "act"; phase: Phase; label: string; say: string; steps: string[]; note: string }
  | { kind: "confirm"; phase: Phase; label: string; ask: string; will: string[]; never: string; yes: { label: string; result: string }; no: { label: string; result: string } }
  | { kind: "close"; phase: Phase; label: string; say: string; did: string[]; next: string; safety: string };

export interface Story {
  journey: Journey;
  title: string;
  blurb: string;
  who: string;
  beats: Beat[];
}

export const STORIES: Story[] = [
  {
    journey: "claim",
    title: "A family member has died",
    blurb: "Asha’s father passed away. She doesn’t know where to start.",
    who: "Asha, whose father Ramesh has died",
    beats: [
      { kind: "user", phase: "listening", label: "Asha speaks", text: "My father passed away last month. I think he had an HDFC account and an LIC policy, but I don’t know where to start." },
      { kind: "understood", phase: "thinking", label: "Keeper understands", say: "I’m sorry about your father. We’ll take this one step at a time.", chips: ["A family member has died", "Mentioned: HDFC Bank, LIC of India", "Not known yet: mutual funds, other accounts"] },
      { kind: "act", phase: "acting", label: "Keeper acts", say: "Here is what I’m doing for you.", steps: ["Opened a private case: Estate of Ramesh Iyer", "Noted HDFC Bank and LIC of India as what Asha said", "Listed the papers banks usually ask for first"], note: "Nothing is verified yet. Keeper only records what Asha tells it, and says so." },
      { kind: "confirm", phase: "confirming", label: "Keeper asks first", ask: "Shall I prepare the HDFC Bank claim checklist?", will: ["List the papers HDFC Bank asks for", "Mark the ones Asha already has"], never: "Keeper never sends a claim. Asha reviews the checklist and submits it herself.", yes: { label: "Yes, prepare it", result: "Prepared: 6 papers listed, 2 already with Asha, 4 still to find." }, no: { label: "Not now", result: "No problem. It stays on Asha’s list for later." } },
      { kind: "close", phase: "speaking", label: "Loop closed", say: "That’s one full turn. Keeper listened, understood, acted, asked, and told you what changed.", did: ["Opened a case for Ramesh Iyer", "Noted two holdings, marked as said, not verified", "Prepared the HDFC Bank checklist, if Asha agreed"], next: "Find Ramesh’s death certificate. Every bank and insurer asks for it.", safety: "Nothing was sent to any bank." },
    ],
  },
  {
    journey: "discover",
    title: "I’ve lost track of some accounts",
    blurb: "Asha changed jobs and cities. Some money is probably forgotten.",
    who: "Asha, looking for her own forgotten accounts",
    beats: [
      { kind: "user", phase: "listening", label: "Asha speaks", text: "I changed jobs and cities a few times. I think I had an SBI account and some mutual funds, but I’ve lost track." },
      { kind: "understood", phase: "thinking", label: "Keeper understands", say: "That’s very common. Let’s find a way to look, without guessing.", chips: ["Looking for her own assets", "Mentioned: SBI, mutual funds", "Moved cities, which can hide old accounts"] },
      { kind: "act", phase: "acting", label: "Keeper acts", say: "Here is what I’m doing for you.", steps: ["Noted SBI and mutual funds as what Asha said", "Picked the official searches that fit: RBI UDGAM for old bank deposits, SEBI MITRA for inactive fund folios", "Wrote down what each search will ask for"], note: "Keeper can’t search those sites for Asha. She runs each search herself, and tells Keeper what she found." },
      { kind: "confirm", phase: "confirming", label: "Keeper asks first", ask: "Open the official RBI UDGAM search?", will: ["Open the real RBI page in a new tab", "Keep Asha’s place here until she’s back"], never: "Keeper doesn’t see the results unless Asha chooses to tell it.", yes: { label: "Yes, open it", result: "In the real app, the official page would open now. Asha searches, then reports back." }, no: { label: "Not now", result: "No problem. The search stays ready on her list." } },
      { kind: "close", phase: "speaking", label: "Loop closed", say: "That’s one full turn. Keeper listened, understood, prepared the searches, and asked before sending Asha anywhere.", did: ["Noted two things Asha remembered, marked as said", "Prepared the two official searches", "Asked before opening anything"], next: "Search RBI UDGAM with her old addresses, then tell Keeper what turned up.", safety: "Keeper does not claim to find everything. It says what was and wasn’t checked." },
    ],
  },
  {
    journey: "prepare",
    title: "I want to prepare for my family",
    blurb: "Asha wants her daughter to never have to hunt for anything.",
    who: "Asha, preparing a record for her daughter Anita",
    beats: [
      { kind: "user", phase: "listening", label: "Asha speaks", text: "I want my daughter Anita to never have to hunt for my accounts. I have an HDFC fixed deposit, an LIC policy and an SBI mutual fund." },
      { kind: "understood", phase: "thinking", label: "Keeper understands", say: "That’s a kind thing to do. A clear record is the best gift for a family.", chips: ["Preparing a record for her family", "Mentioned: HDFC FD, LIC, SBI Mutual Fund", "Trusted person: Anita, her daughter"] },
      { kind: "act", phase: "acting", label: "Keeper acts", say: "Here is what I’m doing for you.", steps: ["Started Asha’s family record", "Noted three holdings as what Asha said", "Added a reminder to check who is named as nominee on each"], note: "Nominees matter: the institution deals with the nominee first. Keeper only reminds, it can’t change them." },
      { kind: "confirm", phase: "confirming", label: "Keeper asks first", ask: "Let Anita see a read-only list of institutions?", will: ["Show institution names and types only", "Hide balances and account numbers"], never: "Nothing is shared until Asha says yes, and she can preview exactly what Anita would see.", yes: { label: "Yes, preview it", result: "In the real app, Asha would see Anita’s exact view first, and could still change her mind." }, no: { label: "Not now", result: "No problem. Nothing is shared." } },
      { kind: "close", phase: "speaking", label: "Loop closed", say: "That’s one full turn. Keeper listened, understood, organised, and asked before sharing anything.", did: ["Started a family record", "Noted three holdings, marked as said", "Asked before sharing with Anita"], next: "Check the nominee on the HDFC fixed deposit.", safety: "Nothing was shared with anyone." },
    ],
  },
];

export const storyFor = (journey: string) => STORIES.find((s) => s.journey === journey);
