/**
 * Versioned claim procedures (PRD FL-12, FL-44; LLD §11.2). Reference data, not
 * code: each procedure names its regulator source, the date it was checked and
 * a version. Every claim records the version it used. Written from
 * docs/SOURCE_VALIDATION.md §3 — change both together, and bump the version.
 *
 * Only what the source lists is "required". Anything an institution *may* ask
 * for is said in a note, never presented as a rule.
 */

export type ClaimPath = "nominee" | "joint" | "quick" | "simplified" | "succession" | "no_nominee";

export interface PackItem {
  id: string;
  label: string;
  required: boolean;
  note?: string;
}

export interface PathProcedure {
  label: string;
  /** Plain-language explanation of why this path applies and what it means. */
  explanation: string;
  items: PackItem[];
  extraDeclarations?: { id: string; text: string }[];
}

export interface Procedure {
  id: string;
  version: string;
  title: string;
  categories: string[];
  /** Institutions this applies to; null = every institution of these categories. */
  institutions: RegExp | null;
  authority: string;
  sourceUrl: string;
  checkedOn: string;
  status: "active" | "suspended";
  suspendedReason?: string;
  /** How long the institution has, and from when ("within N days of …"). */
  timeline: { days: number; from: string; ifLate: string; note?: string };
  whereToSubmit: string;
  paths: Partial<Record<ClaimPath, PathProcedure>>;
}

/** A procedure older than this must be re-checked before it is used (FL-44). */
export const MAX_PROCEDURE_AGE_DAYS = 180;

const CHECKED = "2026-10-17";

export const PROCEDURES: Procedure[] = [
  {
    id: "bank-deceased-claim",
    version: "2026-10-17.1",
    title: "Bank deposit claim after a death",
    categories: ["bank_account", "bank_deposit"],
    institutions: null,
    authority: "RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025 — RBI/2025-26/82",
    sourceUrl: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12901",
    checkedOn: CHECKED,
    status: "active",
    timeline: {
      days: 15,
      from: "receiving complete documents",
      ifLate: "compensation of at least Bank Rate + 4% a year",
      note: "Lockers: 15 days, then ₹5,000 for each day of delay.",
    },
    whereToSubmit:
      "Any branch of the bank. Some banks also take claims online (SBI, PNB and Bank of Baroda run portals); the bank may still ask to see originals.",
    paths: {
      nominee: {
        label: "Claim as the nominee",
        explanation:
          "A nominee is recorded, so the bank pays the nominee without a succession certificate, whatever the amount. Being the nominee does not decide who finally owns the money among the legal heirs.",
        items: [
          { id: "claim-form-ia", label: "Claim form (Annex I-A of the RBI Directions)", required: true },
          { id: "death-certificate", label: "Death certificate", required: true },
          { id: "claimant-id", label: "Your officially valid ID document", required: true },
        ],
      },
      joint: {
        label: "Claim as the surviving joint holder",
        explanation:
          "There is a surviving joint holder, so the bank deals with them directly, without a succession certificate.",
        items: [
          { id: "claim-form-ia", label: "Claim form (Annex I-A of the RBI Directions)", required: true },
          { id: "death-certificate", label: "Death certificate", required: true },
          { id: "claimant-id", label: "Your officially valid ID document", required: true },
        ],
      },
      simplified: {
        label: "Simplified claim without a nominee",
        explanation:
          "No nominee is recorded and the amount is within the bank's simplified limit, so no succession certificate is needed and no surety may be asked for.",
        items: [
          { id: "claim-form-ib", label: "Claim form (Annex I-B)", required: true },
          { id: "death-certificate", label: "Death certificate", required: true },
          { id: "claimant-id", label: "Your officially valid ID document", required: true },
          { id: "indemnity-ic", label: "Indemnity bond (Annex I-C)", required: true },
          { id: "noc-id", label: "No-objection from the other legal heirs (Annex I-D)", required: true },
          {
            id: "heir-proof-ie",
            label: "Legal heir certificate, or a declaration by an independent person (Annex I-E)",
            required: true,
          },
        ],
      },
      succession: {
        label: "Claim above the simplified limit",
        explanation:
          "No nominee is recorded and the amount is above the bank's simplified limit, so the bank can ask for a succession certificate, a legal heir certificate or an affidavit. This is where a lawyer's help is most often needed.",
        items: [
          { id: "claim-form-ib", label: "Claim form (Annex I-B)", required: true },
          { id: "death-certificate", label: "Death certificate", required: true },
          { id: "claimant-id", label: "Your officially valid ID document", required: true },
          {
            id: "succession-proof",
            label: "Succession certificate, legal heir certificate or affidavit — whichever the bank asks for",
            required: true,
          },
          { id: "surety", label: "Surety", required: false, note: "Only if the bank asks for one." },
        ],
      },
    },
  },
  {
    id: "mf-transmission",
    version: "2026-10-17.1",
    title: "Mutual fund transmission after a death",
    categories: ["mutual_fund"],
    institutions: null,
    authority: "SEBI circular on transmission of securities, 23 July 2026 (HO/38/13/11(14)2026-MIRSD-POD/I/17111/2026)",
    sourceUrl:
      "https://www.sebi.gov.in/legal/circulars/jul-2026/ease-of-doing-investment-and-ease-of-doing-business-simplification-and-standardisation-of-the-framework-for-transmission-of-securities_103030.html",
    checkedOn: CHECKED,
    status: "active",
    timeline: {
      days: 21,
      from: "receiving complete documents",
      ifLate: "the fund house must explain any delay or rejection in writing",
      note: "Units are valued at the last NAV. Some registrar pages still show older limits; the SEBI circular is the reference.",
    },
    whereToSubmit:
      "The fund house or its registrar (CAMS or KFintech). Online lodging may be offered; originals may still be asked for.",
    paths: {
      nominee: {
        label: "Transmission to the nominee",
        explanation:
          "A nominee is recorded, so the units move to the nominee. The nominee holds them as a trustee for the legal heirs — being the nominee does not make them the owner.",
        items: [
          { id: "mf-annex-3", label: "Transmission request form (Annexure-3)", required: true },
          { id: "death-certificate", label: "Death certificate (a QR-verifiable copy is accepted)", required: true },
          { id: "mf-soa", label: "Statement of account for the folio", required: true },
        ],
        extraDeclarations: [
          { id: "nominee-trustee", text: "I understand that as the nominee I receive these units as a trustee for the legal heirs." },
        ],
      },
      quick: {
        label: "Quick transmission (up to ₹10,000 per fund house)",
        explanation:
          "No nominee is recorded, the value is up to ₹10,000 at this fund house, and you are an immediate relative (parent, spouse, child or parent-in-law), so a short form is enough.",
        items: [
          { id: "mf-annex-2", label: "Form-cum-undertaking on plain paper (Annexure-2)", required: true },
          { id: "relationship-proof", label: "Proof of your relationship", required: true },
        ],
      },
      simplified: {
        label: "Simplified transmission (up to ₹10 lakh per fund house)",
        explanation:
          "No nominee is recorded and the value is up to ₹10 lakh at this fund house (₹30 lakh in demat), so no court document is needed.",
        items: [
          {
            id: "mf-simplified-proof",
            label: "Notarised indemnity bond + affidavit-cum-NOC from all legal heirs, or a family settlement deed",
            required: true,
          },
        ],
      },
      succession: {
        label: "Transmission above ₹10 lakh",
        explanation:
          "No nominee is recorded and the value is above the simplified limit. Probate is no longer mandatory, but an affidavit-cum-NOC and one heirship document are needed.",
        items: [
          { id: "mf-affidavit-noc", label: "Affidavit-cum-NOC from the legal heirs", required: true },
          {
            id: "mf-heirship",
            label:
              "One of: the will with an indemnity bond; a legal heir certificate (Tehsildar or above) with an indemnity bond; or a succession certificate, letter of administration or court decree",
            required: true,
          },
        ],
      },
    },
  },
  {
    id: "lic-death-claim",
    version: "2026-10-17.1",
    title: "LIC death claim",
    categories: ["insurance"],
    institutions: /\bLIC\b|Life Insurance Corporation/i,
    authority: "LIC claim requirements; IRDAI Master Circular IRDAI/PP&GR/CIR/MISC/117/9/2024 (5 Sep 2024)",
    sourceUrl: "https://licindia.in/claims-settlement-requirements",
    checkedOn: CHECKED,
    status: "active",
    timeline: {
      days: 15,
      from: "the claim being intimated in writing (45 days if the insurer investigates)",
      ifLate: "interest at Bank Rate + 2% from intimation, paid without you asking",
      note: "A claim cannot be rejected or closed only for want of documents. Send written intimation to the servicing branch on day 1 — the clock starts then.",
    },
    whereToSubmit: "The LIC branch that services the policy. Written intimation of the death starts the claim.",
    paths: {
      nominee: {
        label: "Claim as the nominee",
        explanation: "A nominee is recorded on the policy, so the nominee claims the death benefit with LIC's standard forms.",
        items: [
          { id: "lic-form-3783", label: "Claim Form A (Form 3783)", required: true },
          {
            id: "lic-form-3783a",
            label: "Form 3783(A)",
            required: false,
            note: "Needed if the policy had run for 3 years or more.",
          },
          { id: "lic-death-extract", label: "Certified extract from the death register", required: true },
          { id: "lic-policy", label: "Original policy document", required: true },
          { id: "lic-neft", label: "NEFT mandate with a cancelled cheque", required: true },
        ],
      },
      no_nominee: {
        label: "Claim without a nominee",
        explanation:
          "No nominee is recorded, so LIC also needs evidence of title — legal proof of who is entitled. The branch may relax this in some cases; LIC has not published a small-amount limit.",
        items: [
          { id: "lic-form-3783", label: "Claim Form A (Form 3783)", required: true },
          { id: "lic-form-3783a", label: "Form 3783(A)", required: false, note: "Needed if the policy had run for 3 years or more." },
          { id: "lic-death-extract", label: "Certified extract from the death register", required: true },
          { id: "lic-policy", label: "Original policy document", required: true },
          { id: "lic-neft", label: "NEFT mandate with a cancelled cheque", required: true },
          { id: "lic-title", label: "Evidence of title (legal proof of who is entitled)", required: true },
        ],
      },
    },
  },
];

/**
 * Simplified-claim limits for banks without a nominee, in rupees. RBI's floor
 * is ₹15 lakh for commercial banks and ₹5 lakh for co-operative banks; some
 * banks publish higher limits (docs/SOURCE_VALIDATION.md §8, question 6).
 */
export const BANK_LIMITS = {
  commercial: 1_500_000,
  cooperative: 500_000,
  overrides: [
    { institution: /\bICICI\b/i, limit: 20_000_000, source: "ICICI Bank deceased-claim policy" },
  ] as { institution: RegExp; limit: number; source: string }[],
};

export const MF_LIMITS = { quick: 10_000, simplified: 1_000_000, simplifiedDemat: 3_000_000 };

/** Immediate relatives who may use mutual fund Quick Transmission. */
export const IMMEDIATE_RELATIVES = ["spouse", "child", "parent", "parent_in_law"];

/** The procedure for a holding, if we have a checked one. */
export function procedureFor(category: string, institution: string): Procedure | null {
  return PROCEDURES.find((p) => p.categories.includes(category) && (!p.institutions || p.institutions.test(institution))) ?? null;
}

/** Is this procedure usable today? Suspended or out-of-date procedures send the claim to review (FL-44). */
export function procedureProblem(p: Procedure, today: string): string | null {
  if (p.status === "suspended") return `This procedure is paused for review${p.suspendedReason ? `: ${p.suspendedReason}` : ""}.`;
  const age = (Date.parse(today) - Date.parse(p.checkedOn)) / 86_400_000;
  if (age > MAX_PROCEDURE_AGE_DAYS) return `This procedure was last checked on ${p.checkedOn} and must be re-checked before it is used.`;
  return null;
}
