import { nextWork, refineTurns } from "./presentation";
import { INSTITUTIONS, JOURNEY_LABEL, WELCOME_NEW } from "./catalog";
import * as K from "./claims";
import type {
  Activity, AppState, Asset, Case, Category, Choice, Doc, DocField, Journey, Message, PlanSource, Session, Thread,
} from "./types";
import { addTask, cap, isAnswered, iso, logActivity, maskRef, poss, setFact, uid } from "./util";

/**
 * Keeper's DETERMINISTIC DEMO ASSISTANT. It is not a live AI and not connected to any institution:
 * it recognises what people say with simple rules, asks one question at a time, remembers answers
 * as facts, and keeps the conversation and the structured views on the same case record.
 */

// ─── construction ────────────────────────────────────────────────────────────────────────────

export const newThread = (title = "New conversation"): Thread => ({ id: uid(), title, journey: null, pending: null, messages: [], });

export function emptyCase(id: string, name: string, kind: Case["kind"], subject: string): Case {
  const th = newThread();
  return {
    id, name, kind, subject, facts: {}, assets: [], docs: [], tasks: [], contacts: [], claims: [], activity: [], plan: [],
    threads: [th], activeThread: th.id, family: { instructions: "", reviewedAt: null, cadence: null }, context: [], focus: null,
  };
}

const msg = (role: Message["role"], text: string, extra: Partial<Message> = {}): Message => ({ id: uid(), role, text, ts: iso(), ...extra });
const say = (th: Thread, text: string, extra: Partial<Message> = {}) => th.messages.push(msg("keeper", text, extra));

export const START_CHOICES: Choice[] = [
  { id: "j:discover", label: "Find my assets" },
  { id: "j:prepare", label: "Prepare for my family" },
  { id: "j:claim", label: "Get help after a death" },
];

export function welcome(c: Case, th: Thread) {
  th.messages.push(msg("keeper", WELCOME_NEW, { choices: [...START_CHOICES, { id: "m:sample", label: "Explore a sample" }] }));
  th.title = "New conversation";
  void c;
}

export function freshState(name: string, mode: Session["mode"]): AppState {
  const self = emptyCase("self", "My financial record", "self", name || "You");
  welcome(self, self.threads[0]);
  if (mode === "signin") self.threads[0].messages[0].choices = START_CHOICES;
  return { v: 1, session: { mode, name: name || "You" }, activeCase: "self", order: ["self"], cases: { self }, voiceDisclosed: false, speakReplies: false };
}

// ─── reading what people say ─────────────────────────────────────────────────────────────────

const REL: Record<string, { claimant: string; label: string }> = {
  father: { claimant: "Child", label: "your father" }, dad: { claimant: "Child", label: "your father" },
  mother: { claimant: "Child", label: "your mother" }, mom: { claimant: "Child", label: "your mother" }, mum: { claimant: "Child", label: "your mother" },
  husband: { claimant: "Spouse", label: "your husband" }, wife: { claimant: "Spouse", label: "your wife" }, spouse: { claimant: "Spouse", label: "your spouse" },
  brother: { claimant: "Sibling", label: "your brother" }, sister: { claimant: "Sibling", label: "your sister" },
  son: { claimant: "Parent", label: "your son" }, daughter: { claimant: "Parent", label: "your daughter" },
  grandfather: { claimant: "Grandchild", label: "your grandfather" }, grandmother: { claimant: "Grandchild", label: "your grandmother" },
};

export function detect(t: string): Journey | null {
  if (/\b(passed away|passed on|died|death of|deceased|late (father|mother|husband|wife)|after (his|her|their) death|lost (my|our) (father|mother|husband|wife))\b/i.test(t)) return "claim";
  if (/\b(end of life|end-of-life|serious(ly)? ill|retir(e|ing|ement)|prepare|(put|get) my .{0,30} in order|for my family|leave behind|estate plan)/i.test(t)) return "prepare";
  if (/\b(lost track|forgot|forgotten|old (account|investment|policy|policies)|find my|unclaimed|discover|changed jobs|moved cit)/i.test(t)) return "discover";
  return null;
}

const isUnknown = (t: string) => /^(i )?(don'?t|do not) (know|remember|have)|^not sure|^no idea|^unknown|^i have no idea/i.test(t.trim());
const isSkip = (t: string) => /^skip|skip for now|^later$|^not now$/i.test(t.trim());
const isWhy = (t: string) => /^why\b|why do you need|^what for\b/i.test(t.trim());

const negated = (t: string, re: RegExp) => {
  const m = re.exec(t);
  return !!m && /\b(not|no|never|without|unaware|don'?t know about|n't)\b[^.,;]{0,25}$/i.test(t.slice(Math.max(0, m.index - 30), m.index));
};

export function addAsset(c: Case, p: { institution: string; category: Category; ref?: string | null; confirmed?: boolean; nomination?: Asset["nomination"]; owner?: string }): Asset {
  const confirmed = p.confirmed ?? true;
  const a: Asset = {
    id: uid(), institution: p.institution, category: p.category, ref: p.ref ?? null, owner: p.owner ?? c.subject,
    evidence: confirmed ? "self_declared" : "potential_match", confirmed, amount: null, nomination: p.nomination ?? "unknown",
    docIds: [], lastChecked: null, next: "Add a statement or policy to back this up", history: [{ at: iso(), text: confirmed ? "Added from what you told Keeper" : "Found as a clue in a document" }],
  };
  c.assets.push(a);
  return a;
}

/** Pull institutions and relationship out of free text, whatever question is pending. */
function absorb(c: Case, text: string): { added: Asset[]; someUnknown: boolean } {
  const added: Asset[] = [];
  const hits = INSTITUTIONS.filter((i) => i.re.test(text));
  for (const h of hits) if (!c.assets.some((a) => a.institution === h.name)) added.push(addAsset(c, { institution: h.name, category: h.cat }));
  const generic: { re: RegExp; name: string; cat: Category }[] = [
    { re: /\b(bank account|savings account|current account|fixed deposit|\bfd\b)/i, name: "Bank account (bank not named)", cat: "bank" },
    { re: /\b(mutual funds?|sip)\b/i, name: "Mutual funds (fund house not named)", cat: "mutual_fund" },
    { re: /\b(insurance|policy|policies)\b/i, name: "Insurance policy (insurer not named)", cat: "insurance" },
  ];
  for (const g of generic) {
    if (g.re.test(text) && !negated(text, g.re) && !hits.some((h) => h.cat === g.cat) && !c.assets.some((a) => a.category === g.cat)) added.push(addAsset(c, { institution: g.name, category: g.cat }));
  }
  const someUnknown = /\b(not|don'?t know|no idea|unaware|unsure)\b[^.]{0,40}\b(investments?|mutual|shares?|insurance|funds?)/i.test(text);
  if (added.length || hits.length) {
    const names = c.assets.map((a) => a.institution);
    setFact(c, "known", names.join(", "), "confirmed");
    if (c.kind === "estate" && !isAnswered(c, "known_assets")) {
      setFact(c, "known_assets", someUnknown ? "some" : "yes", "needs_confirmation", "Keeper inferred", someUnknown ? "You also said some assets are not known yet" : undefined);
    }
  }
  const rel = /\b(my|our)\s+(father|dad|mother|mom|mum|husband|wife|spouse|brother|sister|son|daughter|grandfather|grandmother)\b/i.exec(text);
  if (rel && c.kind === "estate" && !c.facts.relation) {
    const r = REL[rel[2].toLowerCase()];
    setFact(c, "relation", r.claimant, "confirmed", "You said", `You referred to ${r.label}.`);
    if (!c.facts.name) {
      c.subject = r.label;
      c.name = `Estate of ${r.label}`;
    }
  }
  const location = /\b(?:papers|statements|documents|policies|passbooks)\b.{0,20}\b(?:kept|stored|are|is)\s+(?:in|at|with)\s+([^.!?]{2,120})/i.exec(text);
  if (location) setFact(c, "docs_where", location[1].trim(), "confirmed");
  const named = /\b(?:name is|name was|named|called)\s+([\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+){0,3})/u.exec(text);
  if (named && c.kind === "estate") { setFact(c, "name", named[1], "confirmed"); c.subject = named[1]; c.name = "Estate of " + named[1]; }
  if (/\b(?:all (?:my )?(?:accounts|policies).{0,20}(?:have|named|recorded) nominees|nominees.{0,20}(?:all|every) (?:account|policy))/i.test(text)) setFact(c, "nomination", "Recorded for all", "confirmed");
  if (/\b(?:have|got).{0,15}death certificate/i.test(text)) setFact(c, "authority", /\b(?:my|claimant|own) (?:id|identity)/i.test(text) ? "both" : "death", "confirmed", "You said", "Availability only. Authority is checked separately.");
  return { added, someUnknown };
}

// ─── the questions ───────────────────────────────────────────────────────────────────────────

interface Parsed { value: string | null; state?: "confirmed" | "unknown" | "not_applicable" | "needs_confirmation"; note?: string }
interface Slot {
  key: string;
  ask: (c: Case) => string;
  why: string;
  choices?: (c: Case) => Choice[];
  parse: (t: string, c: Case, choice?: string) => Parsed | null;
  after?: (c: Case, th: Thread, p: Parsed) => void;
  when?: (c: Case) => boolean;
}

const pick = (choice: string | undefined, map: Record<string, string>): Parsed | null => (choice && map[choice] ? { value: map[choice] } : null);
const free = (t: string): Parsed | null => (t.trim() ? { value: t.trim().slice(0, 200) } : null);
const unnamedNomination = (c: Case) => c.assets.find((a) => a.confirmed && a.nomination === "unknown");

const SLOTS: Record<string, Slot> = {
  known: {
    key: "known",
    when: (c) => !(c.kind === "estate" && c.facts.known_assets?.value === "none"),
    ask: (c) => c.kind === "self" ? "Which banks, fund houses or insurers do you remember?" : `Which banks, fund houses or insurers do you know ${poss(c).replace(/’s$/, "")} used? Rough names are fine.`,
    why: "Named institutions let Keeper prepare the right searches and requirements. Keeper only uses names. never passwords, PINs or OTPs.",
    parse: (t) => (t.trim().length > 2 ? { value: t.trim().slice(0, 200), state: "needs_confirmation", note: "No institution name was recognised. please confirm the exact name." } : null),
    after: (c, _th, p) => { if (p.state === "needs_confirmation") addTask(c, "Confirm the institution names you mentioned", "gather", "Keeper didn't recognise a name in what you said."); },
  },
  clues: {
    key: "clues",
    ask: () => "Have you changed jobs, cities or phone numbers over the years? Old employers and addresses help narrow a search.",
    why: "Old accounts are often tied to a former employer, address or phone number, so these clues point the searches in the right direction.",
    choices: () => [{ id: "s:clues:none", label: "No big changes" }],
    parse: (t, _c, ch) => (ch === "none" ? { value: "No major changes", state: "not_applicable" } : free(t)),
  },
  docs: {
    key: "docs",
    ask: (c) => `Do you have statements, policies or passbooks for ${c.kind === "self" ? "your accounts" : poss(c) + " accounts"} that you can add?`,
    why: "A document is the strongest evidence. Keeper reads it, shows you what it found next to the original, and you correct anything wrong.",
    choices: () => [
      { id: "s:docs:now", label: "Add a document" },
      { id: "s:docs:later", label: "I have some at home" },
      { id: "s:docs:none", label: "Not right now" },
    ],
    parse: (t, _c, ch) => pick(ch, { now: "Adding a document now", later: "Some documents, to add later", none: "None right now" }) ?? (/\b(no|none|nothing)\b/i.test(t) ? { value: "None right now" } : /\b(yes|have|statement|passbook|policy)\b/i.test(t) ? { value: "Some documents" } : null),
    after: (c, th, p) => {
      if (p.value === "None right now") addTask(c, "Look for old statements, passbooks or policy papers", "gather", "Documents make findings stronger.");
      if (p.value === "Some documents, to add later") addTask(c, "Add the documents you have at home", "gather", "Upload one at a time; Keeper reads each and you check it.");
      if (p.value === "Adding a document now") say(th, "Use the paperclip to add a document.");
    },
  },
  consent: {
    key: "consent",
    ask: () => "Guided searches use the details you've shared. May Keeper prepare them for you to run yourself? Nothing is sent anywhere.",
    why: "Each official portal asks for personal details. Keeper only prepares what to enter and where. you run the search on the official site.",
    choices: () => [{ id: "s:consent:yes", label: "Yes, prepare them" }, { id: "s:consent:no", label: "Not yet" }],
    parse: (t, _c, ch) => pick(ch, { yes: "Allowed", no: "Not yet" }) ?? (/\b(yes|ok|okay|sure|go ahead)\b/i.test(t) ? { value: "Allowed" } : /\b(no|not)\b/i.test(t) ? { value: "Not yet" } : null),
  },
  docs_where: {
    key: "docs_where",
    ask: () => "Where are your important papers kept. policies, passbooks, property papers, your will if you have one?",
    why: "Your family can only use documents they can find. This tells them where to look.",
    choices: () => [{ id: "s:docs_where:home", label: "At home" }, { id: "s:docs_where:family", label: "With a family member" }, { id: "s:docs_where:locker", label: "In a bank locker" }],
    parse: (t, _c, ch) => pick(ch, { home: "At home", family: "With a family member", locker: "In a bank locker" }) ?? free(t),
  },
  nomination: {
    key: "nomination",
    ask: () => "For your main accounts and policies, have you named nominees?",
    why: "A nominee is who the institution deals with first. Missing or outdated nominations are one of the most common causes of delay for families.",
    choices: () => [{ id: "s:nomination:all", label: "Yes, for all" }, { id: "s:nomination:some", label: "For some" }, { id: "s:nomination:none", label: "No, or not sure" }],
    parse: (t, _c, ch) => pick(ch, { all: "Recorded for all", some: "Recorded for some", none: "Not recorded or not sure" }) ?? (/\ball\b/i.test(t) ? { value: "Recorded for all" } : /\bsome\b/i.test(t) ? { value: "Recorded for some" } : /\b(no|none|not sure)\b/i.test(t) ? { value: "Not recorded or not sure" } : null),
    after: (c, _th, p) => {
      if (p.value === "Recorded for all") c.assets.forEach((a) => (a.nomination = "recorded"));
      else addTask(c, "Check nominees on each account and policy", "review", "Nomination decides who the institution deals with first.");
    },
  },
  contact: {
    key: "contact",
    ask: () => "Is there someone who should know where to begin? Give a name and relationship, like “Anita, daughter”.",
    why: "A trusted contact is told where your record is. It does not make them an owner or heir. inheritance is decided by law and your will.",
    parse: (t) => {
      const [name, rel] = t.split(/[,–—(]|\s-\s/).map((s) => s.replace(/[)]/g, "").trim());
      return name && name.length < 60 ? { value: rel ? `${name}, ${rel}` : name } : null;
    },
    after: (c, _th, p) => {
      if (!p.value) return;
      const [name, rel] = p.value.split(", ");
      c.contacts.push({ id: uid(), name, relation: rel ?? "Not stated", sees: { assets: false, documents: false, instructions: false, claims: false } });
      addTask(c, `Choose what ${name} can see`, "prepare", "Nothing is shared until you choose, and you can preview their exact view.");
      c.focus = { type: "family" };
    },
  },
  instructions: {
    key: "instructions",
    ask: () => "Any practical instructions your family should have. for example “the FD papers are in the blue folder”?",
    why: "Small practical details save families days of searching.",
    parse: (t) => free(t),
    after: (c, _th, p) => { if (p.value) c.family.instructions = [c.family.instructions, p.value].filter(Boolean).join("\n"); },
  },
  review: {
    key: "review",
    ask: () => "How often would you like to review this record?",
    why: "A review preference helps keep the record current. Notifications are not connected.",
    choices: () => [{ id: "s:review:6m", label: "Every 6 months" }, { id: "s:review:1y", label: "Every year" }, { id: "s:review:none", label: "No schedule" }],
    parse: (t, _c, ch) => pick(ch, { "6m": "Every 6 months", "1y": "Every year", none: "No reminders" }) ?? (/6|six/i.test(t) ? { value: "Every 6 months" } : /year|annual/i.test(t) ? { value: "Every year" } : null),
    after: (c, _th, p) => { c.family.cadence = p.value; },
  },
  relation: {
    key: "relation",
    ask: () => "How were you related to them? This is intake only. institutions decide who has authority.",
    why: "Different relationships follow different steps. Keeper records this to prepare the right checklist; it isn't proof of authority.",
    choices: () => [{ id: "s:relation:spouse", label: "Spouse" }, { id: "s:relation:child", label: "Child" }, { id: "s:relation:parent", label: "Parent" }, { id: "s:relation:sibling", label: "Sibling" }, { id: "s:relation:other", label: "Executor or other" }],
    parse: (t, _c, ch) => pick(ch, { spouse: "Spouse", child: "Child", parent: "Parent", sibling: "Sibling", other: "Executor or other" }) ?? (/spouse|husband|wife/i.test(t) ? { value: "Spouse" } : /son|daughter|child/i.test(t) ? { value: "Child" } : /mother|father|parent/i.test(t) ? { value: "Parent" } : /brother|sister|sibling/i.test(t) ? { value: "Sibling" } : /executor|other/i.test(t) ? { value: "Executor or other" } : null),
  },
  name: {
    key: "name",
    ask: () => "What was their name, as it appears on their accounts?",
    why: "Institutions match claims by the name on the account, so the exact spelling matters.",
    parse: (t) => {
      const m = /(?:named|called|name was|name is)\s+([A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+){0,3})/u.exec(t) ?? /([A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+){0,3})/u.exec(t);
      return { value: (m?.[1] ?? t).trim().slice(0, 80) };
    },
    after: (c, _th, p) => {
      if (!p.value) return;
      c.subject = p.value;
      c.name = `Estate of ${p.value}`;
    },
  },
  known_assets: {
    key: "known_assets",
    ask: () => "Do you already know about any of their assets?",
    why: "If you already know about an asset, Keeper starts its claim right away. If not, it helps you look.",
    choices: () => [{ id: "s:known_assets:yes", label: "Yes. help me with claims" }, { id: "s:known_assets:some", label: "Some. help me find the rest" }, { id: "s:known_assets:none", label: "No. I need help starting" }],
    parse: (t, _c, ch) => pick(ch, { yes: "yes", some: "some", none: "none" }) ?? (/\bsome\b/i.test(t) ? { value: "some" } : /\b(yes|know)\b/i.test(t) ? { value: "yes" } : /\b(no|none|nothing)\b/i.test(t) ? { value: "none" } : null),
  },
  fork: {
    key: "fork",
    when: (c) => c.assets.length > 0 && c.facts.known_assets?.value === "some",
    ask: () => "We can work through both. Do you want to begin with the claim for what you know, or look for the rest?",
    why: "They run independently. you can do one now and the other later without repeating anything.",
    choices: (c) => {
      const a = c.assets.find((x) => x.confirmed) ?? c.assets[0];
      const word = a.category === "bank" ? "bank" : a.category === "mutual_fund" ? "fund" : a.category === "insurance" ? "insurance" : "asset";
      return [{ id: `a:startClaim:${a.id}`, label: `Start the ${word} claim` }, { id: "a:investigate", label: "Look for investments" }, { id: "a:decide", label: "Help me decide" }];
    },
    parse: () => null,
  },
  nominee: {
    key: "nominee",
    when: (c) => !!unnamedNomination(c) && c.assets.length > 0,
    ask: (c) => `Is a nominee recorded on ${unnamedNomination(c)?.institution ?? "that account"}?`,
    why: "Nominated accounts follow a shorter path. Keeper uses this to choose the right claim steps.",
    choices: () => [{ id: "s:nominee:recorded", label: "Yes, a nominee is recorded" }, { id: "s:nominee:none", label: "No nominee" }],
    parse: (t, _c, ch) => pick(ch, { recorded: "Recorded", none: "None recorded" }) ?? (/\bno\b|none/i.test(t) ? { value: "None recorded" } : /yes|record|nominee/i.test(t) ? { value: "Recorded" } : null),
    after: (c, _th, p) => {
      const a = unnamedNomination(c);
      if (a) a.nomination = p.value === "Recorded" ? "recorded" : "none";
    },
  },
  authority: {
    key: "authority",
    ask: () => "Before any claim, institutions check who you are and your authority to act. A death certificate alone doesn't authorise every action. Do you have a death certificate and your ID ready?",
    why: "Institutions protect accounts by checking identity and authority first. Knowing what you have lets Keeper prepare the right checklist.",
    choices: () => [{ id: "s:authority:both", label: "Yes, both" }, { id: "s:authority:one", label: "One of them" }, { id: "s:authority:none", label: "Not yet" }],
    parse: (t, _c, ch) => pick(ch, { both: "both", one: "one", none: "none" }) ?? (/\bboth\b/i.test(t) ? { value: "both" } : /\b(one|only)\b/i.test(t) ? { value: "one" } : /\b(no|not yet|neither)\b/i.test(t) ? { value: "none" } : null),
    after: (c, _th, p) => {
      if (p.value === "both") for (const cl of c.claims) K.editClaim(c, cl, { have: { "death-certificate": true, "claimant-id": true } });
      if (p.value !== "both") addTask(c, "Get certified copies of the death certificate", "gather", "Institutions need it before acting.", "Needed before any claim");
      if (p.value !== "both") addTask(c, "Have your own ID ready (officially valid)", "gather", "Institutions verify you separately from the person who died.");
    },
  },
};

const JOURNEY_SLOTS: Record<Journey, string[]> = {
  discover: ["known", "clues", "docs", "consent"],
  prepare: ["known", "docs_where", "nomination", "contact", "instructions", "review"],
  claim: ["relation", "known_assets", "known", "fork", "name", "nominee", "authority"],
};

function nextSlot(c: Case, th: Thread): Slot | null {
  if (!th.journey) return null;
  for (const key of JOURNEY_SLOTS[th.journey]) {
    const s = SLOTS[key];
    if (s.when && !s.when(c)) continue;
    if (!isAnswered(c, key)) return s;
  }
  return null;
}

// ─── summaries ───────────────────────────────────────────────────────────────────────────────

export function milestoneNote(c: Case): string {
  const reviewed = c.docs.filter((d) => d.state === "ready" && d.fields.length && d.fields.every((f) => f.reviewed)).length;
  const toCheck = c.docs.filter((d) => d.state === "ready" && d.fields.some((f) => !f.reviewed)).length;
  const potential = c.assets.filter((a) => a.evidence === "potential_match").length;
  const parts = [`${c.docs.filter((d) => d.state === "ready").length} uploaded ${c.docs.length === 1 ? "document" : "documents"}, ${reviewed} fully reviewed`];
  if (toCheck) parts.push(`${toCheck} still to check`);
  if (potential) parts.push(`${potential} possible ${potential === 1 ? "reference needs" : "references need"} confirming`);
  return parts.join(" · ");
}

function summary(c: Case): string {
  const told = Object.values(c.facts).filter((f) => f.value && (f.state === "confirmed" || f.state === "document_supported")).length;
  const open = Object.values(c.facts).filter((f) => f.state === "unknown" || f.state === "needs_confirmation" || f.state === "not_provided").length;
  const names = c.assets.map((a) => a.institution);
  return `So far: ${told} ${told === 1 ? "detail" : "details"} you've confirmed${names.length ? `, and ${names.length} ${names.length === 1 ? "asset" : "assets"} noted (${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""})` : ""}. ${open ? `${open} ${open === 1 ? "thing is" : "things are"} still open. I've turned them into tasks rather than blocking you.` : "Nothing is blocking you right now."}`;
}

// ─── the discovery plan (honest about what each source is) ───────────────────────────────────

export function buildPlan(c: Case): PlanSource[] {
  const consent = c.facts.consent?.value === "Allowed";
  const hasNames = c.assets.length > 0 || !!c.facts.known?.value;
  const guided = (id: string, label: string, note: string, url: string): PlanSource => {
    const prev = c.plan.find((p) => p.id === id);
    return { id, label, type: "guided", state: prev?.state === "completed" || prev?.state === "in_progress" ? prev.state : consent ? "ready" : "awaiting_consent", note, url, result: prev?.result };
  };
  const readyDocs = c.docs.filter((d) => d.state === "ready").length;
  return [
    { id: "uploaded", label: "Records you upload", type: "uploaded", state: readyDocs ? "completed" : "needs_info", note: readyDocs ? `${readyDocs} uploaded ${readyDocs === 1 ? "document" : "documents"} analysed. this covers only what those documents mention.` : "Add a statement or policy and Keeper will read it." },
    { id: "connected", label: "Institution connections", type: "connected", state: "unavailable", note: "This source is not connected." },
    guided("udgam", "RBI UDGAM. unclaimed bank deposits", "A guided search on the official site: you enter the details, Keeper tells you what to use.", "https://udgam.rbi.org.in/unclaimed-deposits/#/login"),
    guided("mitra", "SEBI MITRA. inactive mutual fund folios", "A guided search through MFCentral. Results show the fund name only.", "https://www.sebi.gov.in/"),
    guided("bima", "IRDAI Bima Bharosa. unclaimed insurance", "A guided search of insurers' unclaimed-amount pages.", "https://bimabharosa.irdai.gov.in/"),
    { id: "manual", label: "Ask an institution directly", type: "manual", state: hasNames ? "ready" : "needs_info", note: hasNames ? "Write to or visit the institutions you named and ask what they hold." : "Needs at least one institution name." },
    { id: "iepf", label: "IEPF. unclaimed shares and dividends", type: "guided", state: "planned", note: "This source is not connected." },
  ];
}

// ─── finishing a journey ─────────────────────────────────────────────────────────────────────

function finish(c: Case, th: Thread) {
  th.pending = null;
  const j = th.journey;
  if (j === "discover") {
    c.plan = buildPlan(c);
    addTask(c, "Run the guided searches Keeper prepared", "follow", "A no-match result only covers that portal and the details you gave.");
    c.focus = { type: "plan" };
    say(th, `${summary(c)}\n\nYour discovery plan is ready. Review the sources before searching.`, {
      card: { type: "plan" },
      choices: [{ id: "m:something", label: "Something else" }],
    });
  } else if (j === "prepare") {
    addTask(c, "Review this record again", "follow", c.family.cadence && c.family.cadence !== "No reminders" ? `Review preference: ${c.family.cadence.toLowerCase()}. Notifications are not connected.` : "Records go stale.");
    c.focus = { type: "family" };
    say(th, `${summary(c)}\n\nYour family record is ready for review.`, {
      card: { type: "family" },
      choices: [{ id: "m:something", label: "Something else" }],
    });
  } else if (j === "claim") {
    addTask(c, "Choose which claim to start first", "claims", "Each institution has its own requirements.");
    const starters = c.assets.filter((a) => a.confirmed).slice(0, 3).map((a) => ({ id: `a:startClaim:${a.id}`, label: `Start claim: ${a.institution}` }));
    c.focus = { type: "know" };
    say(th, `${summary(c)}\n\nEach institution gets its own claim. Start with a known holding.`, {
      card: { type: "know" },
      choices: [...starters, { id: "a:sampleDoc:statement", label: "Add document" }, { id: "j:discover", label: "Look for other assets" }],
    });
  }
}

function askNext(c: Case, th: Thread, lead: string[] = []) {
  const s = nextSlot(c, th);
  if (c.context.length) {
    lead.unshift(`I noticed you ${c.context.join("; ")}.`);
    c.context = [];
  }
  if (!s) {
    if (lead.length) say(th, lead.join("\n\n"));
    finish(c, th);
    return;
  }
  th.pending = s.key;
  say(th, [...lead, s.ask(c)].join("\n\n"), { choices: s.choices?.(c), pending: s.key });
}

function begin(c: Case, th: Thread, journey: Journey) {
  th.journey = journey;
  th.title = JOURNEY_LABEL[journey];
  setFact(c, "goal", JOURNEY_LABEL[journey], "confirmed");
  if (journey === "prepare") {
    say(th, "This record helps your family find what they need. It does not replace a will.");
  } else if (journey === "claim") {
    say(th, "We can work on known assets first. Each institution checks the authority to claim.");
  }
}

// ─── handling one turn ───────────────────────────────────────────────────────────────────────

function ensureCaseFor(s: AppState, journey: Journey): Case {
  const cur = s.cases[s.activeCase];
  if (journey === "claim" && cur.kind !== "estate") {
    const id = `estate-${uid()}`;
    const e = emptyCase(id, "Estate of the person who died", "estate", "the person who died");
    s.cases[id] = e;
    s.order.push(id);
    s.activeCase = id;
    return e;
  }
  if (journey === "prepare" && cur.kind === "estate") {
    let self = s.cases[s.order.find((i) => s.cases[i].kind === "self")!];
    if (!self) { self = emptyCase(uid(), "My financial record", "self", s.session?.name || "You"); s.cases[self.id] = self; s.order.push(self.id); }
    s.activeCase = self.id;
    return self;
  }
  return cur;
}

function activeThread(c: Case): Thread { return c.threads.find((t) => t.id === c.activeThread) ?? c.threads[0]; }

function startJourney(s: AppState, journey: Journey, label: string, userText?: string, voice?: boolean) {
  const from = s.cases[s.activeCase];
  const fromTh = activeThread(from);
  const c = ensureCaseFor(s, journey);
  let th = activeThread(c);
  if (c !== from) {
    // New case: carry the opening message across so nothing has to be repeated.
    th = activeThread(c);
    const said = userText ?? label;
    if (said) th.messages.push(msg("user", said, { voice }));
    fromTh.messages.push(msg("keeper", `I've opened a separate record for ${c.name.toLowerCase()} so nothing gets mixed with your own. You can switch between them any time.`));
  } else {
    if (th.journey && th.journey !== journey) { th = newThread(); c.threads.unshift(th); c.activeThread = th.id; }
    th.messages.push(msg("user", userText ?? label, { voice }));
  }
  begin(c, th, journey);
  if (userText) { const r = absorb(c, userText); noteAdded(th, r.added); }
  askNext(c, th);
}

function noteAdded(th: Thread, added: Asset[]) {
  if (!added.length) return;
  const names = added.map((a) => a.institution).join(", ");
  say(th, `You mentioned ${names}.`);
}

export function converse(s: AppState, input: { text?: string; choice?: string; label?: string; voice?: boolean }) {
  const text = (input.text ?? "").trim();
  const choice = input.choice;
  const c = s.cases[s.activeCase];
  const th = activeThread(c);
  const shown = input.label ?? text;
  const userSays = () => { if (shown) th.messages.push(msg("user", shown, { voice: input.voice })); };

  // Journey buttons and menu actions
  if (choice?.startsWith("j:")) return startJourney(s, choice.slice(2) as Journey, input.label ?? "", undefined, input.voice);
  if (choice === "m:something" || (!choice && /^something else$/i.test(text))) {
    userSays();
    return say(th, "Of course. What would you like to do?", { choices: START_CHOICES });
  }
  if (choice === "m:resume") {
    userSays();
    if (!th.journey) return say(th, "What would you like help with?", { choices: START_CHOICES });
    return askNext(c, th);
  }
  if (choice === "m:know") { userSays(); c.focus = { type: "know" }; return say(th, "Review the saved details.", { card: { type: "know" } }); }
  if (choice?.startsWith("a:")) return action(s, c, th, choice, input.label ?? "");

  // No journey yet: read the situation from what they said.
  if (!th.journey) {
    const j = detect(text);
    if (j) return startJourney(s, j, text, text, input.voice);
    userSays();
    const r = absorb(c, text);
    noteAdded(th, r.added);
    return say(th, "What would you like help with?", { choices: START_CHOICES });
  }

  userSays();
  const pending = th.pending ? SLOTS[th.pending] : null;

  // Meta answers about the pending question
  if (pending && (choice === "m:why" || (!choice && isWhy(text)))) return say(th, `${pending.why}\n\n${pending.ask(c)}`, { choices: pending.choices?.(c), pending: pending.key });
  if (pending && (choice === "m:unknown" || (!choice && isUnknown(text)))) {
    setFact(c, pending.key, null, "unknown", "You said", "You weren't sure.");
    addTask(c, `Find out: ${pending.key.replace(/_/g, " ")}`, "gather", "You said you weren't sure. this is a follow-up, not a blocker.");
    return askNext(c, th, ["Saved for later."]);
  }
  if (pending && (choice === "m:skip" || (!choice && isSkip(text)))) {
    setFact(c, pending.key, null, "not_provided", "You said", "Skipped for now.");
    return askNext(c, th, ["Skipped for now."]);
  }

  // Changing direction mid-conversation: ask rather than silently switching.
  const other = !choice ? detect(text) : null;
  if (other && other !== th.journey && (other === "claim" || /\b(also|actually|instead)\b/i.test(text))) {
    return say(th, `That sounds like “${JOURNEY_LABEL[other]}”. Switch to that? Nothing you've told me will be lost.`, { choices: [{ id: `j:${other}`, label: `Yes. ${JOURNEY_LABEL[other].toLowerCase()}` }, { id: "m:resume", label: "No, keep going here" }] });
  }

  const absorbed = absorb(c, text);
  if (absorbed.added.length) noteAdded(th, absorbed.added);

  if (pending && !isAnswered(c, pending.key)) {
    const val = choice?.startsWith("s:") ? choice.split(":")[2] : undefined;
    const p = pending.parse(text, c, val);
    if (!p) return say(th, `${pending.ask(c)}`, { choices: pending.choices?.(c), pending: pending.key });
    setFact(c, pending.key, p.value, p.state ?? "confirmed", "You said", p.note);
    pending.after?.(c, th, p);
  }
  askNext(c, th);
}

function action(s: AppState, c: Case, th: Thread, choice: string, label: string) {
  th.messages.push(msg("user", label));
  const [, kind, arg] = choice.split(":");
  if (kind === "startClaim") {
    const cl = K.startClaim(c, arg);
    if (!cl) return say(th, "I couldn't find that asset.");
    setFact(c, "fork", "claim first", "confirmed");
    c.focus = { type: "claim", id: cl.id };
    const a = c.assets.find((x) => x.id === arg)!;
    addTask(c, `Gather the documents for the ${a.institution} claim`, "claims", "Each claim has its own checklist.");
    say(th, `I’ve opened the ${a.institution} claim. Review the requirements before preparing the package.`, { card: { type: "claim", id: cl.id } });
    return askNext(c, th);
  }
  if (kind === "investigate") {
    setFact(c, "fork", "look for the rest", "confirmed");
    const t = newThread("Looking for other assets");
    c.threads.unshift(t);
    c.activeThread = t.id;
    t.messages.push(msg("user", label));
    begin(c, t, "discover");
    return askNext(c, t, ["I'll keep the claim and this search separate. What you've already told me carries over."]);
  }
  if (kind === "decide") {
    setFact(c, "fork", null, "unknown", "You said");
    delete c.facts.fork;
    const a = c.assets.find((x) => x.confirmed) ?? c.assets[0];
    return say(th, `If you already know about an asset, starting its claim moves things forward fastest. claims take weeks, so beginning early helps. Searching for the rest can run alongside. A good order: start the ${a.institution} claim, then look for other assets.`, { choices: [{ id: `a:startClaim:${a.id}`, label: `Start the ${a.institution} claim` }, { id: "a:investigate", label: "Look for investments first" }] });
  }
  if (kind === "sampleDoc") {
    const d = makeDoc(c, arg as DocVariant, undefined);
    c.docs.push(d);
    return say(th, `I’ve opened the ${d.kind.toLowerCase()} (${d.name}). Review the extracted details against the source.`, { card: { type: "doc", id: d.id } });
  }
  if (kind === "previewContact") {
    c.focus = { type: "family" };
    return say(th, c.contacts.length ? "Preview the intended access. Nothing is shared yet." : "Add a trusted contact first, then you can preview exactly what they would see.", { card: { type: "family" } });
  }
  if (kind === "linkStatement") {
    const d = makeDoc(c, "statement", arg);
    c.docs.push(d);
    return say(th, `I'm reading a statement for that asset. Open it to compare each detail with the original.`, { card: { type: "doc", id: d.id } });
  }
  askNext(c, th);
}

// ─── sample documents (synthetic, labelled) ──────────────────────────────────────────────────

export type DocVariant = "statement" | "policy" | "folio" | "unreadable" | "password" | "duplicate";

export function makeDoc(c: Case, variant: DocVariant, assetId?: string): Doc {
  const a = c.assets.find((x) => x.id === assetId);
  const holder = (c.kind === "self" ? c.subject : c.subject.replace(/^your /, "")).replace(/\s*\(sample\)$/, "");
  const holderName = `${/^[a-z]/.test(holder) ? cap(holder) : holder} (sample)`;
  const last4 = String(1000 + Math.floor(Math.random() * 8999));
  const id = uid();
  const base = { id, sample: true as const, state: "processing" as Doc["state"], assetId: a?.id, addedAt: iso() };
  const F = (label: string, value: string, excerpt: string): DocField => ({ id: uid(), label, value, excerpt, reviewed: false });
  if (variant === "unreadable") return { ...base, name: "scan-page-2-blurred.jpg", kind: "Scan", state: "processing", text: "", fields: [] };
  if (variant === "password") return { ...base, name: "locked-statement.pdf", kind: "Password-protected PDF", text: "", fields: [] };
  if (variant === "duplicate") {
    const existing = c.docs.find((d) => d.fields.length);
    return { ...base, name: existing ? `copy-of-${existing.name}` : "statement-copy.pdf", kind: "Duplicate", text: existing?.text ?? "", fields: [] };
  }
  const cat = variant === "policy" ? "insurance" : variant === "folio" ? "mutual_fund" : (a?.category ?? "bank");
  const inst = a?.institution ?? (cat === "insurance" ? "LIC of India" : cat === "mutual_fund" ? "HDFC Mutual Fund" : "HDFC Bank");
  if (cat === "insurance") {
    return { ...base, name: "policy-schedule-SAMPLE.pdf", kind: "Insurance policy", text: `${inst.toUpperCase()}\nPolicy schedule. SAMPLE DOCUMENT\nPolicy holder: ${holderName}\nPolicy no: ••••${last4}\nSum assured: ₹5,00,000\nNominee: Not registered\nStatement date: 31 Mar 2024`, fields: [F("Institution", inst, `${inst.toUpperCase()}`), F("Policy holder", holderName, `Policy holder: ${holderName}`), F("Policy reference", `••••${last4}`, `Policy no: ••••${last4}`), F("Sum assured", "₹5,00,000", "Sum assured: ₹5,00,000"), F("Nominee", "Not registered", "Nominee: Not registered"), F("Statement date", "31 Mar 2024", "Statement date: 31 Mar 2024")] };
  }
  if (cat === "mutual_fund") {
    return { ...base, name: "cas-statement-SAMPLE.pdf", kind: "Mutual fund statement", text: `${inst.toUpperCase()}\nAccount statement. SAMPLE DOCUMENT\nInvestor: ${holderName}\nFolio: ••••${last4}\nValue: ₹1,86,420\nNominee: Not registered\nStatement date: 31 Mar 2024`, fields: [F("Institution", inst, inst.toUpperCase()), F("Investor", holderName, `Investor: ${holderName}`), F("Folio reference", `••••${last4}`, `Folio: ••••${last4}`), F("Value", "₹1,86,420", "Value: ₹1,86,420"), F("Nominee", "Not registered", "Nominee: Not registered"), F("Statement date", "31 Mar 2024", "Statement date: 31 Mar 2024")] };
  }
  return { ...base, name: "savings-statement-SAMPLE.pdf", kind: "Bank statement", text: `${inst.toUpperCase()}\nSavings account statement. SAMPLE DOCUMENT\nAccount holder: ${holderName}\nAccount no: ••••${last4}\nClosing balance: ₹58,240\nNominee: Registered\nStatement date: 31 Mar 2024`, fields: [F("Institution", inst, inst.toUpperCase()), F("Account holder", holderName, `Account holder: ${holderName}`), F("Account reference", `••••${last4}`, `Account no: ••••${last4}`), F("Closing balance", "₹58,240", "Closing balance: ₹58,240"), F("Nominee", "Registered", "Nominee: Registered"), F("Statement date", "31 Mar 2024", "Statement date: 31 Mar 2024")] };
}

const CAT_OF = (kind: string): Category => (/insurance/i.test(kind) ? "insurance" : /mutual/i.test(kind) ? "mutual_fund" : "bank");

export function docReady(c: Case, d: Doc) {
  const th = activeThread(c);
  if (d.kind === "Scan") { d.state = "unreadable"; addTask(c, "Upload a clearer copy of the blurred scan", "gather", "Keeper couldn't read it. text was too blurred.", "Unreadable file"); logActivity(c, "prepared", `Keeper couldn't read ${d.name}. It stays attached for you to replace.`); return noteIn(th, "I couldn't read that scan. it's too blurred. Try a clearer photo, or upload the PDF. I've added a task."); }
  if (d.kind === "Password-protected PDF") { d.state = "password"; logActivity(c, "prepared", `${d.name} is password-protected.`); return noteIn(th, "That PDF is password-protected. Keeper never asks for passwords. remove the protection in your PDF viewer, then upload the unlocked copy."); }
  if (d.kind === "Duplicate") { d.state = "duplicate"; logActivity(c, "prepared", `${d.name} looks like a copy of a document already added.`); return noteIn(th, "That looks like a copy of a document you already added, so I haven't added a second set of details."); }
  d.state = "ready";
  const inst = d.fields.find((f) => f.label === "Institution")?.value ?? "";
  const ref = d.fields.find((f) => /reference/i.test(f.label))?.value ?? null;
  let a = c.assets.find((x) => x.id === d.assetId) ?? c.assets.find((x) => x.institution.toLowerCase() === inst.toLowerCase());
  if (a) { if (!a.ref) a.ref = ref; }
  else {
    const generic = c.assets.find((x) => x.category === CAT_OF(d.kind) && /not named\)$/.test(x.institution));
    a = addAsset(c, { institution: inst, category: CAT_OF(d.kind), ref, confirmed: false });
    if (generic) a.duplicateOf = generic.id;
  }
  d.assetId = a.id;
  if (!a.docIds.includes(d.id)) a.docIds.push(d.id);
  a.history.push({ at: iso(), text: `Linked ${d.name}` });
  a.lastChecked = iso();
  a.next = "Review the document details, then confirm with the institution";
  addTask(c, `Confirm with ${a.institution} that the account is still active`, "review", "A document shows what existed on its date. Only the institution can confirm today's status.");
  logActivity(c, "prepared", `Keeper read the sample document ${d.name} and found ${d.fields.length} details to check.`);
  c.focus = { type: "doc", id: d.id };
  noteIn(th, `I've read ${d.name}. ${d.fields.length} details need your check. open it to compare each one with the original. ${a.evidence === "potential_match" ? `${a.institution} is a potential match until you confirm it.` : ""}`, { card: { type: "doc", id: d.id } });
}

function noteIn(th: Thread, text: string, extra: Partial<Message> = {}) { th.messages.push(msg("note", text, extra)); }

/** Recompute an asset's evidence status and amounts from the documents the user has reviewed. */
export function refreshAsset(c: Case, a: Asset) {
  if (a.evidence === "institution_verified") return;
  const docs = a.docIds.map((id) => c.docs.find((d) => d.id === id)).filter((d): d is Doc => !!d && d.state === "ready");
  const reviewed = docs.filter((d) => d.fields.length > 0 && d.fields.every((f) => f.reviewed));
  a.evidence = !a.confirmed ? "potential_match" : reviewed.length ? "document_backed" : "self_declared";
  if (reviewed.length) a.next = `Ask ${a.institution} to confirm it's still active. a document only shows the past`;
  for (const d of reviewed) {
    const num = (label: RegExp) => { const f = d.fields.find((x) => label.test(x.label)); const n = f ? Number(f.value.replace(/[^\d]/g, "")) : NaN; return Number.isFinite(n) && f ? { n, f } : null; };
    const asOf = d.fields.find((f) => /statement date/i.test(f.label))?.value ?? "date unknown";
    const bal = num(/closing balance/i), sum = num(/sum assured/i), val = num(/^value$/i);
    if (bal) a.amount = { value: bal.n, type: "Closing balance (historical)", asOf };
    else if (val) a.amount = { value: val.n, type: "Value on statement date", asOf };
    else if (sum) a.amount = { value: sum.n, type: "Sum assured (what a policy pays. not a current value)", asOf };
    const nom = d.fields.find((f) => /nominee/i.test(f.label));
    if (nom) a.nomination = /not registered|none/i.test(nom.value) ? "none" : "recorded";
  }
}

// ─── the reducer ─────────────────────────────────────────────────────────────────────────────

export type Action =
  | { t: "signIn"; name: string; mode: Session["mode"]; persona?: string }
  | { t: "load"; state: AppState }
  | { t: "signOut" }
  | { t: "reset" }
  | { t: "switchCase"; id: string }
  | { t: "newThread" }
  | { t: "switchThread"; id: string }
  | { t: "send"; text: string; voice?: boolean }
  /** One turn of the voice agent: what the person said and what Keeper said back. Changes nothing else. */
  | { t: "agent.turn"; user: string; reply: string; voice?: boolean; card?: Message["card"]; note?: boolean }
  | { t: "choose"; id: string; label: string }
  | { t: "focus"; focus: Case["focus"] }
  | { t: "fact.edit"; key: string; value: string | null }
  | { t: "asset.add"; institution: string; category: Category; ref: string }
  | { t: "asset.edit"; id: string; patch: Partial<Pick<Asset, "institution" | "owner" | "nomination">> & { ref?: string } }
  | { t: "asset.confirm"; id: string }
  | { t: "asset.remove"; id: string }
  | { t: "asset.dup"; id: string; merge: boolean }
  | { t: "doc.upload"; file: File; threadId?: string }
  | { t: "doc.sample"; variant: DocVariant }
  | { t: "doc.ready"; id: string }
  | { t: "doc.field"; docId: string; fieldId: string; value?: string; reviewed?: boolean }
  | { t: "task.toggle"; id: string }
  | { t: "contact.add"; name: string; relation: string }
  | { t: "contact.toggle"; id: string; key: keyof Case["contacts"][number]["sees"] }
  | { t: "family.set"; instructions?: string; cadence?: string; reviewed?: boolean }
  | { t: "plan.record"; id: string; result: string }
  | { t: "claim.start"; assetId: string }
  | { t: "claim.edit"; id: string; edit: Parameters<typeof K.editClaim>[2] }
  | { t: "claim.request"; id: string }
  | { t: "claim.approve"; id: string }
  | { t: "claim.cancel"; id: string }
  | { t: "claim.submit"; id: string; method: string; date?: string; receiptRef?: string }
  | { t: "claim.ack"; id: string; note: string }
  | { t: "claim.outcome"; id: string; kind: Parameters<typeof K.recordOutcome>[2]; note: string; amount?: string; date?: string; documentId?: string };

export const SAMPLE_HOOK: { load: ((name: string, persona?: string) => AppState) | null } = { load: null };

export function reduce(prev: AppState, a: Action): AppState {
  return refineTurns(reduceState(prev, a), prev);
}

function reduceState(prev: AppState, a: Action): AppState {
  if (a.t === "load") return a.state;
  if (a.t === "signIn") return freshState(a.name, a.mode);
  if (a.t === "signOut") return prev;
  const s: AppState = structuredClone(prev);
  const c = s.cases[s.activeCase];
  const th = c ? activeThread(c) : null;

  switch (a.t) {
    case "reset": return s.session?.mode === "sample" && SAMPLE_HOOK.load ? SAMPLE_HOOK.load(s.session.name, s.session.persona) : freshState(s.session?.name ?? "", s.session?.mode ?? "signin");
    case "switchCase": if (s.cases[a.id]) s.activeCase = a.id; break;
    case "newThread": { const t = newThread(); const work = nextWork(c); c.threads.unshift(t); c.activeThread = t.id; t.messages.push(msg("keeper", work?.text || WELCOME_NEW, { ...(work ? { card: work.card } : {}), choices: work ? [{ id: "m:resume", label: "Continue" }, { id: "m:something", label: "Something else" }] : START_CHOICES })); break; }
    case "switchThread": if (c.threads.some((t) => t.id === a.id)) c.activeThread = a.id; break;
    case "send": converse(s, { text: a.text, voice: a.voice }); break;
    case "agent.turn": {
      if (!th) break;
      th.messages.push(msg("user", a.user, { voice: a.voice }), msg(a.note ? "note" : "keeper", a.reply, a.card ? { card: a.card } : {}));
      if (a.card) c.focus = a.card;
      break;
    }
    case "choose":
      if (a.id === "m:sample" && SAMPLE_HOOK.load) return SAMPLE_HOOK.load(s.session?.name ?? "Arjun Sharma", s.session?.persona);
      converse(s, { choice: a.id, label: a.label });
      break;
    case "focus": c.focus = a.focus; break;
    case "fact.edit": {
      if (a.value === null) { delete c.facts[a.key]; logActivity(c, "confirmed", `You removed what Keeper knew about “${a.key.replace(/_/g, " ")}”.`); }
      else {
        setFact(c, a.key, a.value.trim() || null, a.value.trim() ? "confirmed" : "not_provided");
        if (a.key === "name" && a.value.trim()) { c.subject = a.value.trim(); if (c.kind === "estate") c.name = `Estate of ${a.value.trim()}`; }
        logActivity(c, "confirmed", `You corrected “${a.key.replace(/_/g, " ")}”.`);
        c.context.push(`corrected ${a.key.replace(/_/g, " ")}`);
      }
      break;
    }
    case "asset.add": {
      const asset = addAsset(c, { institution: a.institution.trim() || "Unnamed institution", category: a.category, ref: maskRef(a.ref) });
      logActivity(c, "confirmed", `You added ${asset.institution}.`);
      c.context.push(`added ${asset.institution}`);
      break;
    }
    case "asset.edit": {
      const x = c.assets.find((q) => q.id === a.id); if (!x) break;
      if (a.patch.institution) x.institution = a.patch.institution;
      if (a.patch.owner) x.owner = a.patch.owner;
      if (a.patch.nomination) x.nomination = a.patch.nomination;
      if (a.patch.ref !== undefined) x.ref = maskRef(a.patch.ref);
      x.history.push({ at: iso(), text: "You edited this record" });
      logActivity(c, "confirmed", `You updated ${x.institution}.`);
      c.context.push(`updated ${x.institution}`);
      break;
    }
    case "asset.confirm": { const x = c.assets.find((q) => q.id === a.id); if (x) { x.confirmed = true; x.history.push({ at: iso(), text: "You confirmed this belongs here" }); refreshAsset(c, x); logActivity(c, "confirmed", `You confirmed ${x.institution}.`); } break; }
    case "asset.remove": { const x = c.assets.find((q) => q.id === a.id); if (x) { c.assets = c.assets.filter((q) => q.id !== a.id); c.claims = c.claims.filter((q) => q.assetId !== a.id); logActivity(c, "confirmed", `You removed ${x.institution}. Original documents stay in Documents.`); } break; }
    case "asset.dup": {
      const x = c.assets.find((q) => q.id === a.id); if (!x?.duplicateOf) break;
      const old = c.assets.find((q) => q.id === x.duplicateOf);
      if (a.merge && old) { x.history.push(...old.history); x.confirmed = x.confirmed || old.confirmed; c.assets = c.assets.filter((q) => q.id !== old.id); logActivity(c, "confirmed", `You merged “${old.institution}” into ${x.institution}. History was kept.`); }
      else logActivity(c, "confirmed", `You kept ${x.institution} separate from “${old?.institution ?? "another record"}”.`);
      delete x.duplicateOf; refreshAsset(c, x);
      break;
    }
    case "doc.sample": { const d = makeDoc(c, a.variant); c.docs.push(d); logActivity(c, "confirmed", `You added the sample document ${d.name}.`); break; }
    case "doc.ready": {
      // The document may belong to a case other than the one currently open.
      const owner = Object.values(s.cases).find((q) => q.docs.some((x) => x.id === a.id));
      const d = owner?.docs.find((q) => q.id === a.id);
      if (owner && d && d.state === "processing") docReady(owner, d);
      break;
    }
    case "doc.field": {
      const d = c.docs.find((q) => q.id === a.docId); const f = d?.fields.find((q) => q.id === a.fieldId); if (!d || !f) break;
      if (a.value !== undefined && a.value !== f.value) { f.value = a.value; f.corrected = true; f.reviewed = true; logActivity(c, "confirmed", `You corrected “${f.label}” in ${d.name}.`); }
      if (a.reviewed !== undefined) f.reviewed = a.reviewed;
      const x = c.assets.find((q) => q.id === d.assetId); if (x) refreshAsset(c, x);
      if (d.fields.every((q) => q.reviewed)) { logActivity(c, "confirmed", `You reviewed every detail in ${d.name}.`); c.context.push(`reviewed ${d.name}`); }
      break;
    }
    case "task.toggle": { const t = c.tasks.find((q) => q.id === a.id); if (t) t.state = t.state === "done" ? "open" : "done"; break; }
    case "contact.add": c.contacts.push({ id: uid(), name: a.name, relation: a.relation || "Not stated", sees: { assets: false, documents: false, instructions: false, claims: false } }); logActivity(c, "confirmed", `You added ${a.name} as a trusted contact. They can see nothing until you choose.`); break;
    case "contact.toggle": { const k = c.contacts.find((q) => q.id === a.id); if (k) { k.sees[a.key] = !k.sees[a.key]; logActivity(c, "confirmed", `You changed what ${k.name} would see.`); } break; }
    case "family.set":
      if (a.instructions !== undefined) c.family.instructions = a.instructions;
      if (a.cadence !== undefined) c.family.cadence = a.cadence;
      if (a.reviewed) { c.family.reviewedAt = iso(); logActivity(c, "confirmed", "You marked the family record as reviewed."); }
      break;
    case "plan.record": { const p = c.plan.find((q) => q.id === a.id); if (p) { p.state = /couldn.t|could not|needed details/i.test(a.result) ? "needs_info" : "completed"; p.result = a.result; logActivity(c, "confirmed", `You recorded a search result for ${p.label}: ${a.result}`); } break; }
    case "claim.start": { const cl = K.startClaim(c, a.assetId); if (cl) c.focus = { type: "claim", id: cl.id }; break; }
    default: return claimAction(s, c, a);
  }
  return s;
}

function claimAction(s: AppState, c: Case, a: Action): AppState {
  const cl = "id" in a ? c.claims.find((q) => q.id === a.id) : undefined;
  if (!cl) return s;
  switch (a.t) {
    case "claim.edit": K.editClaim(c, cl, a.edit); break;
    case "claim.request": K.requestApproval(c, cl); break;
    case "claim.approve": K.approve(c, cl); break;
    case "claim.cancel": if (cl.approval) { cl.approval.state = "cancelled"; logActivity(c, "prepared", "You cancelled the approval request."); } break;
    case "claim.submit": K.submit(c, cl, a.method); break;
    case "claim.ack": K.acknowledge(c, cl, a.note); break;
    case "claim.outcome": K.recordOutcome(c, cl, a.kind, a.note); break;
  }
  return s;
}

