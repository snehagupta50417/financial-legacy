import type { Phase } from "./agent";
import { personaById, type PersonaId } from "./personas";

/**
 * "Meet Keeper": a short, scripted walk through one turn of Keeper's loop, told through one persona
 * (see personas.ts), the same person whose example workspace you open at the end. It is a
 * demonstration, not a live conversation, and the screen says so. It teaches the same five beats the
 * real voice agent uses (the person speaks, Keeper understands, acts, asks before anything that
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
  persona: PersonaId;
  beats: Beat[];
}

export const STORIES: Story[] = [
  {
    persona: "arjun",
    beats: [
      { kind: "user", phase: "listening", label: "Arjun speaks", text: "My father passed away in July. I found a PNB statement and an LIC receipt in his green file, but I don’t know where to start." },
      { kind: "understood", phase: "thinking", label: "Keeper understands", say: "I’m sorry about your father. We’ll take this one step at a time.", chips: ["A family member has died", "Mentioned: PNB, LIC of India", "Not known yet: funds, other accounts"] },
      { kind: "act", phase: "acting", label: "Keeper acts", say: "Here is what I’m doing for you.", steps: ["Opened a private case: Estate of Rajesh Kumar Sharma", "Noted Punjab National Bank and LIC of India as what Arjun said", "Listed the papers banks usually ask for first"], note: "Nothing is verified yet. Keeper only records what Arjun tells it, and says so." },
      { kind: "confirm", phase: "confirming", label: "Keeper asks first", ask: "Shall I prepare the Punjab National Bank claim checklist?", will: ["List the papers PNB asks for", "Mark the ones Arjun already has"], never: "Keeper never sends a claim. Arjun reviews the checklist and submits it himself.", yes: { label: "Yes, prepare it", result: "Prepared: 6 papers listed, 2 already with Arjun, 4 still to find." }, no: { label: "Not now", result: "No problem. It stays on Arjun’s list for later." } },
      { kind: "close", phase: "speaking", label: "Loop closed", say: "That’s one full turn. Keeper listened, understood, acted, asked, and told you what changed.", did: ["Opened a case for his father", "Noted two holdings, marked as said, not verified", "Prepared the PNB checklist, if Arjun agreed"], next: "Find his father’s death certificate. Every bank and insurer asks for it.", safety: "Nothing was sent to any bank." },
    ],
  },
  {
    persona: "sunita",
    beats: [
      { kind: "user", phase: "listening", label: "Sunita speaks", text: "My father passed away in August. I’m the nominee on his LIC policy. LIC wrote asking for more papers and I’ve heard nothing since." },
      { kind: "understood", phase: "thinking", label: "Keeper understands", say: "I’m sorry for your loss, and for the wait. Let’s get this moving.", chips: ["A claim that has stalled", "Mentioned: LIC policy, Sunita is the nominee", "LIC asked for papers; no reply since"] },
      { kind: "act", phase: "acting", label: "Keeper acts", say: "Here is what I’m doing for you.", steps: ["Opened a private case: Estate of Mohan Lal", "Noted the LIC claim, its dates and what LIC asked for", "Set a follow-up date, and listed what to do if LIC stays silent"], note: "Keeper can’t contact LIC. Sunita sends the papers and tells Keeper what LIC says." },
      { kind: "confirm", phase: "confirming", label: "Keeper asks first", ask: "Shall I draft a reply to LIC’s letter?", will: ["List the three papers LIC asked for", "Write a short covering note Sunita can edit"], never: "Keeper never sends it. Sunita reads it, changes it if she likes, and sends it herself.", yes: { label: "Yes, draft it", result: "Drafted: a covering note and a checklist of the three papers. Sunita sends it herself." }, no: { label: "Not now", result: "No problem. The follow-up stays on her list." } },
      { kind: "close", phase: "speaking", label: "Loop closed", say: "That’s one full turn. Keeper listened, understood, acted, asked, and told you what changed.", did: ["Opened a case for her father", "Recorded the stalled LIC claim and set a follow-up", "Drafted a reply, if Sunita agreed"], next: "Send LIC the three papers, and keep the receipt with today’s date.", safety: "Nothing was sent to LIC." },
    ],
  },
  {
    persona: "rahul",
    beats: [
      { kind: "user", phase: "listening", label: "Rahul speaks", text: "I want my wife and son to never have to hunt for anything. I have a flat in Pune, a joint HDFC account, shares, an LIC policy and a fund from my father." },
      { kind: "understood", phase: "thinking", label: "Keeper understands", say: "That’s a kind thing to do. A clear record is the best gift for a family.", chips: ["Organising his own estate", "Mentioned: flat, HDFC, shares, LIC, a fund", "Trusted people: Meera, wife; Aditya, son"] },
      { kind: "act", phase: "acting", label: "Keeper acts", say: "Here is what I’m doing for you.", steps: ["Started Rahul’s family record", "Noted five holdings as what Rahul said", "Flagged the fund from his father: no nominee recorded"], note: "Nominees matter: the institution deals with the nominee first. Keeper reminds, but can’t change them." },
      { kind: "confirm", phase: "confirming", label: "Keeper asks first", ask: "Let Meera see a read-only list of what Rahul owns?", will: ["Show institution names and types only", "Hide balances and account numbers"], never: "Nothing is shared until Rahul says yes, and he can preview exactly what Meera would see.", yes: { label: "Yes, preview it", result: "In the real app, Rahul would see Meera’s exact view first, and could still change his mind." }, no: { label: "Not now", result: "No problem. Nothing is shared." } },
      { kind: "close", phase: "speaking", label: "Loop closed", say: "That’s one full turn. Keeper listened, understood, organised, and asked before sharing anything.", did: ["Started a family record", "Noted five holdings, marked as said", "Asked before sharing with Meera"], next: "Register a nominee on the fund he inherited from his father.", safety: "Nothing was shared with anyone." },
    ],
  },
];

export const storyFor = (personaId: string) => STORIES.find((s) => s.persona === personaId);
export const personaOfStory = (s: Story) => personaById(s.persona);
