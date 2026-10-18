import type { Category, Evidence, FactState, Journey, Milestone } from "./types";

/** Institutions Keeper recognises in what people say. Specific names first. */
export const INSTITUTIONS: { re: RegExp; name: string; cat: Category }[] = [
  { re: /\bsbi\s*life\b/i, name: "SBI Life", cat: "insurance" },
  { re: /\bsbi\s*(mutual|mf)\b/i, name: "SBI Mutual Fund", cat: "mutual_fund" },
  { re: /\bhdfc\s*life\b/i, name: "HDFC Life", cat: "insurance" },
  { re: /\bhdfc\s*(mutual|mf)\b/i, name: "HDFC Mutual Fund", cat: "mutual_fund" },
  { re: /\bicici\s*pru(dential)?\s*life\b/i, name: "ICICI Prudential Life", cat: "insurance" },
  { re: /\bicici\s*pru(dential)?\b(?!\s*life)/i, name: "ICICI Prudential Mutual Fund", cat: "mutual_fund" },
  { re: /\b(lic|life insurance corporation)\b/i, name: "LIC of India", cat: "insurance" },
  { re: /\b(state bank|sbi)\b(?!\s*(life|mutual|mf))/i, name: "State Bank of India", cat: "bank" },
  { re: /\bhdfc\b(?!\s*(life|mutual|mf))/i, name: "HDFC Bank", cat: "bank" },
  { re: /\bicici\b(?!\s*pru)/i, name: "ICICI Bank", cat: "bank" },
  { re: /\baxis\b/i, name: "Axis Bank", cat: "bank" },
  { re: /\b(pnb|punjab national)\b/i, name: "Punjab National Bank", cat: "bank" },
  { re: /\bkotak\b/i, name: "Kotak Mahindra Bank", cat: "bank" },
  { re: /\bbank of baroda\b/i, name: "Bank of Baroda", cat: "bank" },
  { re: /\bcanara\b/i, name: "Canara Bank", cat: "bank" },
  { re: /\bnippon\b/i, name: "Nippon India Mutual Fund", cat: "mutual_fund" },
  { re: /\bmirae\b/i, name: "Mirae Asset Mutual Fund", cat: "mutual_fund" },
  { re: /\buti\b/i, name: "UTI Mutual Fund", cat: "mutual_fund" },
  { re: /\b(ppfas|parag parikh)\b/i, name: "PPFAS Mutual Fund", cat: "mutual_fund" },
  { re: /\b(epf|epfo|provident fund)\b(?!.*\bppf\b)/i, name: "EPFO (provident fund)", cat: "retirement" },
  { re: /\b(nps|national pension)\b/i, name: "NPS", cat: "retirement" },
  { re: /\bppf\b|public provident/i, name: "Public Provident Fund", cat: "retirement" },
  { re: /\bpost office\b/i, name: "India Post savings", cat: "bank" },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  bank: "Bank account or deposit",
  mutual_fund: "Mutual fund",
  insurance: "Life insurance",
  retirement: "Retirement and savings",
  other: "Other",
};

export const EVIDENCE_LABEL: Record<Evidence, { label: string; hint: string }> = {
  self_declared: { label: "Self-declared", hint: "You told Keeper; no document yet" },
  potential_match: { label: "Potential match", hint: "A clue suggests it; not yet confirmed" },
  document_backed: { label: "Document-backed", hint: "A document you reviewed supports it" },
  institution_verified: { label: "Institution-verified", hint: "The institution confirmed it (no live source in this prototype)" },
};

export const FACT_STATE_LABEL: Record<FactState, string> = {
  unknown: "Unknown",
  not_provided: "Not provided",
  not_applicable: "Not applicable",
  needs_confirmation: "Needs confirmation",
  confirmed: "Confirmed by you",
  document_supported: "Supported by document",
  verified: "Verified",
};

export const FACT_META: Record<string, { label: string; group: string }> = {
  goal: { label: "What you want help with", group: "Goal and scope" },
  relation: { label: "Your relationship to them (intake, not proof of authority)", group: "Person" },
  name: { label: "Name on their accounts", group: "Person" },
  known_assets: { label: "Assets you already know about", group: "Assets and institutions" },
  known: { label: "Institutions you mentioned", group: "Assets and institutions" },
  clues: { label: "Search clues (old employers, cities, addresses)", group: "Assets and institutions" },
  docs: { label: "Documents available", group: "Documents" },
  docs_where: { label: "Where key papers are kept", group: "Documents" },
  nomination: { label: "Nominees recorded", group: "Nomination" },
  nominee: { label: "Nominee on the first known account", group: "Nomination" },
  authority: { label: "Death certificate and ID ready", group: "Authority and consent" },
  consent: { label: "Permission to prepare guided searches", group: "Authority and consent" },
  contact: { label: "Trusted contact", group: "Family access" },
  instructions: { label: "Practical instructions", group: "Family access" },
  review: { label: "Review reminders", group: "Family access" },
};

export const GROUP_ORDER = ["Goal and scope", "Person", "Assets and institutions", "Documents", "Nomination", "Authority and consent", "Family access"];

export const JOURNEY_LABEL: Record<Journey, string> = {
  discover: "Discover my assets",
  prepare: "Prepare for my family",
  claim: "Find or claim assets after a death",
};

export const MILESTONES: { id: Milestone; label: string }[] = [
  { id: "understand", label: "Understanding your situation" },
  { id: "gather", label: "Gathering records" },
  { id: "review", label: "Reviewing assets" },
  { id: "prepare", label: "Preparing your family record" },
  { id: "claims", label: "Preparing claims" },
  { id: "follow", label: "Following up" },
];

export const WELCOME_NEW =
  "Hi, I'm Keeper. Tell me what you'd like help with. You can speak or type, and we'll take it step by step.";

export const STARTERS: { journey: Journey; label: string; text: string }[] = [
  { journey: "discover", label: "I've lost track of some accounts", text: "I changed jobs and cities. I've lost track of some investments." },
  { journey: "prepare", label: "I want to prepare for my family", text: "I want to put my financial affairs in order before the end of life." },
  { journey: "claim", label: "A family member has died", text: "My mother died. I need help finding and claiming her assets." },
];

/** What a trusted contact would see, in plain words — preview only in this prototype. */
export const CONTACT_VIEW = {
  assets: "A list of institutions and asset types — no balances and no account numbers",
  documents: "The names of your documents and where they are kept",
  instructions: "Your written practical instructions",
  claims: "Claim progress, if there is a claim",
};
