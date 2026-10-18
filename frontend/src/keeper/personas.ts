import type { Journey } from "./types";

/**
 * The people the demo data is about. Every example, tour and demo case in Keeper belongs to one of
 * these fictional people, so you always know whose records you are looking at and why they are there.
 * They match the backend's synthetic demo cases (backend/src/server/data/synthetic/demo-cases.ts):
 * the same family, city and institutions. Everyone here is made up.
 */

export type PersonaId = "arjun" | "sunita" | "rahul";

export interface Persona {
  id: PersonaId;
  name: string;
  initials: string;
  age: number;
  city: string;
  /** One line on who they are in this story. */
  role: string;
  /** What is going on in their life, in a sentence or two. */
  situation: string;
  /** What they want from Keeper. */
  goal: string;
  journey: Journey;
  /** The backend demo case that tells the same story (POST /api/demo). */
  demoKey: "demo-a" | "demo-b" | "demo-c";
  /** What to look at, in this persona's example. */
  tryThis: string[];
  /** Tailwind classes for the avatar. */
  tone: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "arjun",
    name: "Arjun Sharma",
    initials: "AS",
    age: 38,
    city: "Delhi",
    role: "Son, settling his father’s affairs",
    situation: "His father Rajesh died in July. Arjun found an old PNB statement, an LIC receipt and a fund statement in a green file, and has no idea what else there is or where to start.",
    goal: "Find what his father left, and claim it one institution at a time without mixing anything up.",
    journey: "claim",
    demoKey: "demo-a",
    tryThis: ["Open Claims and see three at different stages", "Open Documents and check a statement against its original", "Ask: what does PNB need for a claim?"],
    tone: "bg-moss text-white",
  },
  {
    id: "sunita",
    name: "Sunita Devi",
    initials: "SD",
    age: 44,
    city: "Lucknow",
    role: "Daughter, waiting on an insurance claim",
    situation: "Her father Mohan Lal died in August. She is his nominee, but LIC wrote asking for more papers and she has heard nothing since.",
    goal: "Get the LIC claim moving again, and know what to do if it stays stuck.",
    journey: "claim",
    demoKey: "demo-b",
    tryThis: ["Open Claims and see an overdue follow-up", "Read the steps if LIC stays silent", "Ask: how long does LIC have to settle a death claim?"],
    tone: "bg-apricot text-ink",
  },
  {
    id: "rahul",
    name: "Rahul Deshmukh",
    initials: "RD",
    age: 52,
    city: "Pune",
    role: "Organising his own estate",
    situation: "Rahul owns a flat, a joint bank account, shares and a fund inherited from his father. His nominees are patchy and nobody else knows where anything is.",
    goal: "Put everything in one place, fix the gaps, and decide what his wife and son should see.",
    journey: "prepare",
    demoKey: "demo-c",
    tryThis: ["Open Family record and see who can see what", "Open Assets and find the fund with no nominee", "Ask: what happens to a joint account?"],
    tone: "bg-ink text-ivory",
  },
];

export const personaById = (id?: string | null): Persona => PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
export const personaForDemo = (key?: string | null): Persona | undefined => PERSONAS.find((p) => p.demoKey === key);
