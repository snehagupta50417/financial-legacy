import type { AssetCategory, ExtractedDocumentData } from "@/lib/types";
import { redactIdentifiers } from "@/server/core/masking";

/**
 * Basic extraction without AI. When no Gemini key is configured (or the model
 * fails), plain text rules pull out what is clearly labelled on the page:
 * institution, account / policy / folio references, IFSC, names, balances and
 * dates. Quality is never "good" — the family is told to check every value.
 * References are reduced to their last four digits here; the route still runs
 * redactIdentifiers() before anything is stored.
 */

type Kind = Extract<AssetCategory, "bank_account" | "mutual_fund" | "insurance" | "shares" | "provident_fund">;

// Specific names first: "HDFC Life" and "HDFC Mutual Fund" must win over "HDFC Bank".
const INSTITUTIONS: { name: string; kind: Kind; re: RegExp }[] = [
  { name: "Life Insurance Corporation of India", kind: "insurance", re: /Life Insurance Corporation|\bLIC\b(?! Housing)/i },
  { name: "HDFC Life", kind: "insurance", re: /HDFC\s*Life/i },
  { name: "ICICI Prudential Life", kind: "insurance", re: /ICICI\s*Pru(?:dential)?\s*Life/i },
  { name: "SBI Life", kind: "insurance", re: /SBI\s*Life/i },
  { name: "Max Life", kind: "insurance", re: /Max\s*Life|Axis\s*Max\s*Life/i },
  { name: "Bajaj Allianz Life", kind: "insurance", re: /Bajaj\s*Allianz(?:\s*Life)?/i },
  { name: "Tata AIA Life", kind: "insurance", re: /Tata\s*AIA/i },
  { name: "Kotak Life", kind: "insurance", re: /Kotak\s*(?:Mahindra\s*)?Life/i },
  { name: "HDFC Mutual Fund", kind: "mutual_fund", re: /HDFC\s*(?:Mutual\s*Fund|MF\b|Asset\s*Management)/i },
  { name: "SBI Mutual Fund", kind: "mutual_fund", re: /SBI\s*(?:Mutual\s*Fund|MF\b|Funds\s*Management)/i },
  { name: "ICICI Prudential Mutual Fund", kind: "mutual_fund", re: /ICICI\s*Pru(?:dential)?\s*(?:Mutual\s*Fund|MF\b|Asset)/i },
  { name: "Axis Mutual Fund", kind: "mutual_fund", re: /Axis\s*(?:Mutual\s*Fund|MF\b|Asset)/i },
  { name: "Nippon India Mutual Fund", kind: "mutual_fund", re: /Nippon\s*India/i },
  { name: "Kotak Mahindra Mutual Fund", kind: "mutual_fund", re: /Kotak\s*(?:Mahindra\s*)?(?:Mutual\s*Fund|MF\b|Asset)/i },
  { name: "UTI Mutual Fund", kind: "mutual_fund", re: /\bUTI\b/i },
  { name: "Aditya Birla Sun Life Mutual Fund", kind: "mutual_fund", re: /Aditya\s*Birla\s*Sun\s*Life/i },
  { name: "Mirae Asset Mutual Fund", kind: "mutual_fund", re: /Mirae\s*Asset/i },
  { name: "Franklin Templeton Mutual Fund", kind: "mutual_fund", re: /Franklin\s*Templeton/i },
  { name: "DSP Mutual Fund", kind: "mutual_fund", re: /\bDSP\s*(?:Mutual|MF\b|Asset)/i },
  { name: "PPFAS Mutual Fund", kind: "mutual_fund", re: /PPFAS|Parag\s*Parikh/i },
  { name: "CAMS", kind: "mutual_fund", re: /Computer\s*Age\s*Management|\bCAMS\b/i },
  { name: "KFin Technologies", kind: "mutual_fund", re: /KFin\s*Tech|KFintech|Karvy/i },
  { name: "NSDL", kind: "shares", re: /\bNSDL\b/ },
  { name: "CDSL", kind: "shares", re: /\bCDSL\b/ },
  { name: "EPFO", kind: "provident_fund", re: /\bEPFO\b|Employees'?\s*Provident\s*Fund/i },
  { name: "State Bank of India", kind: "bank_account", re: /State\s*Bank\s*of\s*India|\bSBI\b/i },
  { name: "HDFC Bank", kind: "bank_account", re: /HDFC\s*Bank/i },
  { name: "ICICI Bank", kind: "bank_account", re: /ICICI\s*Bank/i },
  { name: "Axis Bank", kind: "bank_account", re: /Axis\s*Bank/i },
  { name: "Kotak Mahindra Bank", kind: "bank_account", re: /Kotak\s*Mahindra\s*Bank|Kotak\s*Bank/i },
  { name: "Punjab National Bank", kind: "bank_account", re: /Punjab\s*National\s*Bank|\bPNB\b/i },
  { name: "Bank of Baroda", kind: "bank_account", re: /Bank\s*of\s*Baroda/i },
  { name: "Canara Bank", kind: "bank_account", re: /Canara\s*Bank/i },
  { name: "Union Bank of India", kind: "bank_account", re: /Union\s*Bank\s*of\s*India/i },
  { name: "Bank of India", kind: "bank_account", re: /(?<!State |Union |Central )Bank\s*of\s*India/i },
  { name: "India Post", kind: "bank_account", re: /India\s*Post|Post\s*Office\s*Savings/i },
];

export interface FoundInstitution {
  name: string;
  kind: Kind;
}

/** Institutions named in the text, most specific first, one per brand family. */
export function findInstitutions(text: string): FoundInstitution[] {
  const found: FoundInstitution[] = [];
  for (const inst of INSTITUTIONS) {
    if (!inst.re.test(text)) continue;
    // "SBI Life" already found → a bare "SBI" mention is the insurer, not the bank.
    const brand = inst.name.split(" ")[0];
    if (inst.kind === "bank_account" && /^(SBI|State)$/.test(brand) && found.some((f) => f.name.startsWith("SBI"))) {
      if (!/State\s*Bank\s*of\s*India|SBI\s*(?:Bank|A\/c|Savings)/i.test(text)) continue;
    }
    if (inst.kind === "bank_account" && found.some((f) => f.name.split(" ")[0] === brand && f.kind !== "bank_account")) {
      if (!new RegExp(`${brand}\\s*Bank`, "i").test(text)) continue;
    }
    found.push({ name: inst.name, kind: inst.kind });
  }
  return found;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DATE_RE = String.raw`(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[\s\-]+[A-Za-z]{3,9}[\s\-,]+\d{4})`;

/** "12/03/2024", "12-Mar-2024", "12 March 2024", "2024-03-12" → "2024-03-12" (day first, as in India). */
export function toIsoDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    const d = Number(m[1]);
    const mo = Number(m[2]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  m = t.match(/^(\d{1,2})[\s\-]+([A-Za-z]{3,9})[\s\-,]+(\d{4})$/);
  if (m) {
    const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (mo < 0) return null;
    return `${m[3]}-${String(mo + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

const CONFUSABLE: Record<string, string> = { O: "0", D: "0", Q: "0", I: "1", l: "1", "|": "1", Z: "2", S: "5", B: "8" };

/**
 * OCR often reads 0 as O/D, 1 as I/l and 2 as Z inside numbers. In tokens that
 * are mostly digits (account, policy, folio numbers) map those letters back;
 * in IFSC codes fix the fixed "0" and a mostly-numeric branch part.
 */
export function fixOcrDigits(text: string): string {
  return text
    .replace(/\b[A-Za-z0-9|]{6,}\b/g, (tok) => {
      const digits = tok.replace(/\D/g, "").length;
      if (digits / tok.length < 0.6) return tok;
      return tok.replace(/[ODQIlZSB|]/g, (c) => CONFUSABLE[c] ?? c);
    })
    // Amounts: "2.45,310.50" → "2,45,310.50" (a dot before a comma group is a misread comma).
    .replace(/\b\d{1,3}(?:[.,]\d{2,3})+(?:\.\d{1,2})?\b/g, (amt) => amt.replace(/\.(?=\d{2,3}[.,])/g, ","))
    .replace(/\b([A-Z]{4})[0OD]([A-Z0-9]{6})\b/g, (_m, bank: string, br: string) => {
      const fixed = br.replace(/[ODQIZSB]/g, (c) => CONFUSABLE[c] ?? c);
      return `${bank}0${/^\d{6}$/.test(fixed) && (br.match(/\d/g)?.length ?? 0) >= 3 ? fixed : br}`;
    });
}

function lineOf(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const end = text.indexOf("\n", index);
  return text.slice(start, end < 0 ? undefined : end).trim().slice(0, 160);
}

function grab(text: string, re: RegExp): { value: string; excerpt: string } | null {
  const m = re.exec(text);
  if (!m || m.index === undefined) return null;
  const value = (m[m.length - 1] ?? "").trim();
  if (!value) return null;
  return { value, excerpt: lineOf(text, m.index) };
}

/** Keep only the last four digits of a reference: "XXXXXX8821" → "••••8821". */
function maskRef(ref: string): string | null {
  const digits = ref.replace(/\D/g, "");
  return digits.length >= 4 ? `••••${digits.slice(-4)}` : null;
}

function cleanName(s: string): string | null {
  const n = s.split(/\s{2,}|\t|\||,|\b(?:Date|DOB|Age|Sex|Gender|Address|Relation|S\/O|D\/O|W\/O)\b/i)[0]
    .replace(/[^A-Za-z .']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return n.length >= 3 && /[A-Za-z]{2}/.test(n) ? n : null;
}

const NAME_LABEL = String.raw`(?:Account\s*Holder(?:'s)?\s*Name|Name\s*of\s*(?:the\s*)?(?:Account\s*Holder|Deceased|Life\s*Assured|Policy\s*holder|Investor|Customer)|Life\s*Assured|Policy\s*holder(?:'s)?\s*Name|Investor\s*Name|Customer\s*Name|Account\s*Name|First\s*Holder|Sole\s*\/?\s*First\s*Holder)`;

const RULES = {
  account: /\b(?:A\/?c|Account)\s*(?:No\.?|Number|#)\s*[:\-]?\s*([X*•x\d][X*•x\d \-]{5,24}\d)/i,
  policy: /\bPolicy\s*(?:No\.?|Number|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{5,24})/i,
  folio: /\bFolio\s*(?:No\.?|Number|#)?\s*[:\-]?\s*([0-9][0-9\/ ]{4,20}[0-9])/i,
  demat: /\b(?:DP\s*ID|BO\s*ID|Client\s*ID|Demat\s*A\/?c)\s*[:\-]?\s*([A-Z0-9][A-Z0-9 ]{6,20})/i,
  ifsc: /\b([A-Z]{4}0[A-Z0-9]{6})\b/,
  name: new RegExp(`${NAME_LABEL}\\s*[:\\-]\\s*([A-Za-z][^\\n]{2,80})`, "i"),
  amount:
    /\b(Closing\s*Balance|Available\s*Balance|Balance|Sum\s*Assured|Market\s*Value|Current\s*Value|Valuation|Maturity\s*Value|Fund\s*Value)\b\s*(?:\(?(?:₹|Rs\.?|INR)\)?)?\s*[:\-]?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  statementDate: new RegExp(String.raw`\b(?:Statement\s*Date|As\s*on|Valuation\s*Date|Statement\s*Period|Period)\s*[:\-]?\s*(?:from\s*)?` + DATE_RE, "i"),
  dateOfDeath: new RegExp(String.raw`\bDate\s*of\s*Death\s*[:\-]?\s*` + DATE_RE, "i"),
  dob: new RegExp(String.raw`\b(?:Date\s*of\s*Birth|DOB|D\.O\.B\.?)\s*[:\-]?\s*` + DATE_RE, "i"),
  registrationNo: /\bRegistration\s*(?:No\.?|Number)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{3,30})/i,
  nominee: new RegExp(String.raw`\bNominee(?:\s*Name)?\s*[:\-]\s*([A-Za-z][^\n]{2,60})`, "i"),
};

function categoryOf(text: string, insts: FoundInstitution[]): string {
  if (/death\s*certificate|मृत्यु\s*प्रमाण|certificate\s*of\s*death|registration\s*of\s*death/i.test(text)) return "death_certificate";
  if (/last\s*will|will\s*and\s*testament|testament|\bexecutor\b|bequeath/i.test(text)) return "will";
  if (/\bclaim\b[\s\S]{0,200}\b(?:reject|repudiat|declin|settle|intimation)|claim\s*(?:no|number|reference)/i.test(text)) return "claim_letter";
  if (/\bpolicy\b/i.test(text) && insts.some((i) => i.kind === "insurance")) return "policy_document";
  if (/premium\s*(?:paid\s*)?receipt|\breceipt\s*(?:no|number)\b/i.test(text)) return "receipt";
  if (/statement\s*of\s*account|account\s*statement|passbook|closing\s*balance|opening\s*balance/i.test(text)) return "bank_statement";
  return "other";
}

const NO_AI_WARNING =
  "Read without AI, using simple text rules. Values may be incomplete or misread — check each one against the original document.";

/**
 * Pull clearly labelled facts out of document text (from a PDF text layer or OCR).
 * `ocrConfidence` (0..1) lowers every confidence when the text came from a photo.
 */
export function ruleExtract(input: string, opts: { ocrConfidence?: number } = {}): ExtractedDocumentData {
  const text = opts.ocrConfidence === undefined ? input : fixOcrDigits(input);
  const factor = opts.ocrConfidence === undefined ? 1 : Math.max(0.4, Math.min(1, opts.ocrConfidence));
  const conf = (base: number) => Math.round(base * factor * 100) / 100;
  const insts = findInstitutions(text);
  const fields: ExtractedDocumentData["fields"] = [];
  const add = (label: string, value: string | null, excerpt: string, base: number) => {
    if (value) fields.push({ label, value, confidence: conf(base), sourceExcerpt: redactIdentifiers(excerpt) });
  };

  const account = grab(text, RULES.account);
  const policy = grab(text, RULES.policy);
  const folio = grab(text, RULES.folio);
  const demat = grab(text, RULES.demat);
  const ifsc = grab(text, RULES.ifsc);
  const name = grab(text, RULES.name);
  const amount = RULES.amount.exec(text);
  const stmtDate = grab(text, RULES.statementDate);
  const dod = grab(text, RULES.dateOfDeath);
  const dob = grab(text, RULES.dob);
  const reg = grab(text, RULES.registrationNo);
  const nominee = grab(text, RULES.nominee);

  if (insts[0]) add("Institution", insts[0].name, lineOf(text, text.search(INSTITUTIONS.find((i) => i.name === insts[0].name)!.re)), 0.7);
  const holder = name ? cleanName(name.value) : null;
  if (name) add("Name", holder, name.excerpt, 0.6);
  if (account) add("Account number", maskRef(account.value), account.excerpt, 0.65);
  if (policy) add("Policy number", maskRef(policy.value) ?? policy.value.slice(-4), policy.excerpt, 0.65);
  if (folio) add("Folio number", maskRef(folio.value), folio.excerpt, 0.65);
  if (demat) add("Demat account", maskRef(demat.value), demat.excerpt, 0.55);
  if (ifsc) add("IFSC", ifsc.value, ifsc.excerpt, 0.75);
  if (amount) add(amount[1].replace(/\s+/g, " "), `₹${amount[2]}`, lineOf(text, amount.index), 0.55);
  if (stmtDate) add("Statement date", toIsoDate(stmtDate.value) ?? stmtDate.value, stmtDate.excerpt, 0.55);
  if (dod) add("Date of death", toIsoDate(dod.value) ?? dod.value, dod.excerpt, 0.6);
  if (dob) add("Date of birth", toIsoDate(dob.value) ?? dob.value, dob.excerpt, 0.55);
  if (reg) add("Registration number", maskRef(reg.value) ?? reg.value, reg.excerpt, 0.55);
  if (nominee) add("Nominee", cleanName(nominee.value), nominee.excerpt, 0.5);

  // An asset clue needs an institution AND a concrete reference or balance (same rule the AI follows).
  const assetClues: ExtractedDocumentData["assetClues"] = [];
  const primary = insts.find((i) => i.name !== "CAMS" && i.name !== "KFin Technologies") ?? insts[0];
  const ref = account ?? policy ?? folio ?? demat;
  if (primary && (ref || amount)) {
    const refLabel = account ? "A/c" : policy ? "Policy" : folio ? "Folio" : demat ? "Demat" : null;
    const masked = ref ? maskRef(ref.value) : null;
    assetClues.push({
      category: primary.kind,
      institution: primary.name,
      reference: refLabel && masked ? `${refLabel} ${masked}` : null,
      holderName: holder,
      evidence: `The document names ${primary.name}${ref ? ` with ${refLabel === "A/c" ? "an account" : `a ${refLabel?.toLowerCase()}`} reference` : ""}${amount ? ` and a ${amount[1].toLowerCase()}` : ""} (basic extraction, not yet checked).`,
      confidence: conf(0.5),
    });
  }

  const missing: string[] = [];
  if (!insts.length) missing.push("No known bank, fund house or insurer name was found");
  if (!ref && !dod) missing.push("No account, policy or folio number was found");
  if (!text.trim()) missing.push("No readable text");

  const quality: ExtractedDocumentData["extractionQuality"] = fields.length >= 2 ? "partial" : "poor";
  const summary = fields.length
    ? `Basic reading without AI found ${fields.length} labelled detail${fields.length === 1 ? "" : "s"}${
        insts.length ? ` and mentions ${insts.map((i) => i.name).slice(0, 3).join(", ")}` : ""
      }. Please check each value against the document.`
    : "Basic reading without AI could not find clearly labelled details. Check the text below or enter details manually.";

  return {
    documentCategory: categoryOf(text, insts),
    summary,
    extractionQuality: quality,
    fields: fields.slice(0, 14),
    institutions: insts.map((i) => i.name).slice(0, 8),
    assetClues,
    missingOrUnreadable: missing,
    warnings: [NO_AI_WARNING],
  };
}

/** Death-certificate fields from OCR text, for the scan path when AI is unavailable. */
export function ruleCertificateFields(input: string) {
  const text = fixOcrDigits(input);
  const name = grab(text, RULES.name) ?? grab(text, /\bName\s*[:\-]\s*([A-Za-z][^\n]{2,80})/i);
  const dod = grab(text, RULES.dateOfDeath);
  const dob = grab(text, RULES.dob);
  const reg = grab(text, RULES.registrationNo);
  const auth = grab(text, /\b(?:Issuing\s*Authority|Registrar[^\n:]*|Issued\s*by)\s*[:\-]?\s*([A-Za-z][^\n]{3,80})/i);
  return {
    name: name ? cleanName(name.value) : null,
    dob: toIsoDate(dob?.value),
    dateOfDeath: toIsoDate(dod?.value),
    registrationNo: reg ? reg.value : null,
    issuingAuthority: auth ? auth.value.trim().slice(0, 80) : null,
  };
}
