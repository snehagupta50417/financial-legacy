import type { ExtractedDocumentData } from "@/lib/types";

/**
 * Synthetic demo data — clearly labelled everywhere in the UI as DEMO.
 * None of these persons, accounts or institutions-data pairs represent real
 * customers or real recoveries. Demo B's letter text is fictional.
 */

export interface DemoDocumentSeed {
  category: string;
  fileName: string;
  fileType: string;
  sizeLabel: string;
  rawText: string;
  extracted: ExtractedDocumentData;
}

export interface DemoCaseSeed {
  demoKey: "demo-a" | "demo-b" | "demo-c";
  caseType: string;
  scenarioLabel: string;
  holderName: string;
  relationship: string;
  holderLiving: boolean;
  summary: string;
  confirmedFacts: string[];
  assumptions: string[];
  confidence: number;
  documents: DemoDocumentSeed[];
  assets: {
    category: string;
    institution: string;
    maskedRef: string | null;
    holderName: string | null;
    evidence: string;
    confidence: number;
    verificationStatus: string;
  }[];
  completedTaskTitles: string[];
}

const DEMO_A: DemoCaseSeed = {
  demoKey: "demo-a",
  caseType: "family_death",
  scenarioLabel: "Family after the loss of a loved one",
  holderName: "Rajesh Kumar Sharma",
  relationship: "Son",
  holderLiving: false,
  summary:
    "Your father Rajesh Kumar Sharma passed away recently. You found an old bank statement, a life-insurance premium receipt and a mutual fund statement, but the full financial footprint is unknown. The journey maps each institution, prepares deceased-claim checklists, and routes you to the official discovery portals.",
  confirmedFacts: [
    "Asset holder: Rajesh Kumar Sharma",
    "Relationship of claimant: Son",
    "Holder is deceased; approximate date of loss: 3 months ago",
    "Documents found: bank statement, LIC premium receipt, mutual fund statement",
  ],
  assumptions: [
    "No will has been located yet",
    "Nomination status in each account is unknown",
  ],
  confidence: 0.93,
  documents: [
    {
      category: "bank_statement",
      fileName: "PNB_saving_statement_2016_DEMO.pdf",
      fileType: "application/pdf",
      sizeLabel: "142 KB",
      rawText: `PUNJAB NATIONAL BANK — Statement of Account (SYNTHETIC DEMO DOCUMENT)
Account Holder: RAJESH KUMAR SHARMA
A/c No: 3450XX8821  Branch: Connaught Place, New Delhi
Period: 01-Jan-2016 to 31-Mar-2016
01-Jan-2016  B/F            1,24,500.00 Cr
05-Feb-2016  Interest Cr       1,845.00
31-Mar-2016  C/F            1,26,345.00 Cr
Note: Account classified INOPERATIVE since 2019 due to no customer-induced transactions.`,
      extracted: {
        documentCategory: "bank_statement",
        summary:
          "PNB savings statement in the name of Rajesh Kumar Sharma with a credit balance of ₹1,26,345 as of March 2016; bank later marked the account inoperative.",
        extractionQuality: "good",
        fields: [
          { label: "Institution", value: "Punjab National Bank", confidence: 0.97, sourceExcerpt: "PUNJAB NATIONAL BANK — Statement of Account" },
          { label: "Account holder", value: "Rajesh Kumar Sharma", confidence: 0.98, sourceExcerpt: "Account Holder: RAJESH KUMAR SHARMA" },
          { label: "Account reference", value: "3450XX8821 (masked)", confidence: 0.94, sourceExcerpt: "A/c No: 3450XX8821" },
          { label: "Last known balance", value: "₹1,26,345.00 Cr (Mar 2016)", confidence: 0.9, sourceExcerpt: "31-Mar-2016  C/F  1,26,345.00 Cr" },
          { label: "Status flag", value: "Inoperative since 2019", confidence: 0.88, sourceExcerpt: "Account classified INOPERATIVE since 2019" },
        ],
        institutions: ["Punjab National Bank"],
        assetClues: [
          {
            category: "bank_deposit",
            institution: "Punjab National Bank",
            reference: "A/c **8821",
            holderName: "Rajesh Kumar Sharma",
            evidence: "A/c No: 3450XX8821 — C/F balance ₹1,26,345 Cr; inoperative since 2019",
            confidence: 0.91,
          },
        ],
        missingOrUnreadable: ["Exact account number (partially masked)", "Current balance after 2016"],
        warnings: ["Balance shown is from 2016 — current position must come from the bank/UDGAM"],
      },
    },
    {
      category: "policy_document",
      fileName: "LIC_premium_receipt_DEMO.jpg",
      fileType: "image/jpeg",
      sizeLabel: "88 KB",
      rawText: `LIFE INSURANCE CORPORATION OF INDIA (SYNTHETIC DEMO DOCUMENT)
Premium Receipt — Jeevan Anand (Plan 149)
Policy No: 8712-445-9021 LA
Life Assured: RAJESH KUMAR SHARMA
Premium: Rs. 18,240  Date: 12-Feb-2018  Status: PREMIUMS CEASED 2019`,
      extracted: {
        documentCategory: "policy_document",
        summary:
          "LIC Jeevan Anand premium receipt for policy 8712-445-9021 held by Rajesh Kumar Sharma; premium payments ceased in 2019, suggesting a paid-up or lapsed policy with possible claim value.",
        extractionQuality: "good",
        fields: [
          { label: "Institution", value: "Life Insurance Corporation of India", confidence: 0.97, sourceExcerpt: "LIFE INSURANCE CORPORATION OF INDIA" },
          { label: "Policy number", value: "8712-445-9021", confidence: 0.95, sourceExcerpt: "Policy No: 8712-445-9021 LA" },
          { label: "Plan", value: "Jeevan Anand (Plan 149)", confidence: 0.9, sourceExcerpt: "Jeevan Anand (Plan 149)" },
          { label: "Life assured", value: "Rajesh Kumar Sharma", confidence: 0.98, sourceExcerpt: "Life Assured: RAJESH KUMAR SHARMA" },
          { label: "Status", value: "Premiums ceased 2019", confidence: 0.85, sourceExcerpt: "Status: PREMIUMS CEASED 2019" },
        ],
        institutions: ["Life Insurance Corporation of India"],
        assetClues: [
          {
            category: "insurance",
            institution: "LIC of India",
            reference: "Policy 8712-445-9021",
            holderName: "Rajesh Kumar Sharma",
            evidence: "Jeevan Anand receipt, last premium ₹18,240 paid Feb 2018",
            confidence: 0.89,
          },
        ],
        missingOrUnreadable: ["Nominee name", "Paid-up value / survival benefit status"],
        warnings: ["A ceased premium does not confirm claim eligibility — LIC must confirm policy status"],
      },
    },
    {
      category: "bank_statement",
      fileName: "HDFC_CAS_dec2019_DEMO.pdf",
      fileType: "application/pdf",
      sizeLabel: "96 KB",
      rawText: `CONSOLIDATED ACCOUNT STATEMENT — CAMS+KFintech (SYNTHETIC DEMO DOCUMENT)
Investor: RAJESH KUMAR SHARMA  PAN: ABCDE1234F
Folio: 1234567890/44  Scheme: HDFC Top 100 Fund - Growth
Units: 2,845.112  NAV Date: 31-Dec-2019  Value: Rs. 4,12,300
Folio: 77123456789/11  Scheme: SBI Blue Chip Fund - Growth
Units: 1,204.558  Value: Rs. 96,400`,
      extracted: {
        documentCategory: "bank_statement",
        summary:
          "CAMS/KFintech consolidated statement showing two mutual fund folios held by Rajesh Kumar Sharma — HDFC Top 100 (₹4.12L) and SBI Blue Chip (₹96.4K) as of Dec 2019.",
        extractionQuality: "good",
        fields: [
          { label: "Investor", value: "Rajesh Kumar Sharma", confidence: 0.97, sourceExcerpt: "Investor: RAJESH KUMAR SHARMA" },
          { label: "Folio 1", value: "1234567890/44 — HDFC Top 100 Fund (Growth)", confidence: 0.93, sourceExcerpt: "Folio: 1234567890/44  Scheme: HDFC Top 100 Fund - Growth" },
          { label: "Folio 1 value", value: "₹4,12,300 (Dec 2019)", confidence: 0.9, sourceExcerpt: "Units: 2,845.112 ... Value: Rs. 4,12,300" },
          { label: "Folio 2", value: "77123456789/11 — SBI Blue Chip Fund (Growth)", confidence: 0.92, sourceExcerpt: "Folio: 77123456789/11  Scheme: SBI Blue Chip Fund - Growth" },
          { label: "Folio 2 value", value: "₹96,400 (Dec 2019)", confidence: 0.89, sourceExcerpt: "Units: 1,204.558  Value: Rs. 96,400" },
        ],
        institutions: ["HDFC Mutual Fund", "SBI Mutual Fund"],
        assetClues: [
          {
            category: "mutual_fund",
            institution: "HDFC Mutual Fund",
            reference: "Folio **90/44",
            holderName: "Rajesh Kumar Sharma",
            evidence: "HDFC Top 100 Growth, 2,845.112 units, ₹4,12,300 (Dec 2019)",
            confidence: 0.92,
          },
          {
            category: "mutual_fund",
            institution: "SBI Mutual Fund",
            reference: "Folio **89/11",
            holderName: "Rajesh Kumar Sharma",
            evidence: "SBI Blue Chip Growth, 1,204.558 units, ₹96,400 (Dec 2019)",
            confidence: 0.9,
          },
        ],
        missingOrUnreadable: ["Nominee registration", "Current NAV-based values"],
        warnings: ["Values are as of Dec 2019; current values must come from the RTA/AMC"],
      },
    },
  ],
  assets: [
    {
      category: "bank_deposit",
      institution: "Punjab National Bank",
      maskedRef: "A/c **8821",
      holderName: "Rajesh Kumar Sharma",
      evidence: "PNB statement: C/F ₹1,26,345 Cr (Mar 2016); inoperative since 2019",
      confidence: 0.91,
      verificationStatus: "user_confirmed",
    },
    {
      category: "insurance",
      institution: "LIC of India",
      maskedRef: "Policy **-9021",
      holderName: "Rajesh Kumar Sharma",
      evidence: "LIC Jeevan Anand premium receipt (Feb 2018), premiums ceased 2019",
      confidence: 0.89,
      verificationStatus: "user_confirmed",
    },
    {
      category: "mutual_fund",
      institution: "HDFC Mutual Fund",
      maskedRef: "Folio **90/44",
      holderName: "Rajesh Kumar Sharma",
      evidence: "CAS: HDFC Top 100 Growth — ₹4,12,300 (Dec 2019)",
      confidence: 0.92,
      verificationStatus: "user_confirmed",
    },
    {
      category: "mutual_fund",
      institution: "SBI Mutual Fund",
      maskedRef: "Folio **89/11",
      holderName: "Rajesh Kumar Sharma",
      evidence: "CAS: SBI Blue Chip Growth — ₹96,400 (Dec 2019)",
      confidence: 0.9,
      verificationStatus: "user_confirmed",
    },
  ],
  completedTaskTitles: [],
};

const DEMO_B: DemoCaseSeed = {
  demoKey: "demo-b",
  caseType: "rejected_claim",
  scenarioLabel: "Rejected insurance claim — resolution journey",
  holderName: "Sunita Devi (policyholder: Mohan Lal)",
  relationship: "Daughter",
  holderLiving: false,
  summary:
    "An insurance death claim for policyholder Mohan Lal was rejected citing a missing document. The AI has extracted the stated reason, generated the exact missing-document checklist, drafted a review-ready follow-up letter, and lined up the official grievance escalation path if the insurer does not resolve in time.",
  confirmedFacts: [
    "Claim rejected by the insurer in writing",
    "Stated reason: certified death certificate copy missing",
    "Claim acknowledgement number available",
    "Claimant is the daughter of the policyholder",
  ],
  assumptions: [
    "Nomination was registered on the policy (to be confirmed with insurer)",
  ],
  confidence: 0.9,
  documents: [
    {
      category: "claim_letter",
      fileName: "Insurer_rejection_letter_DEMO.pdf",
      fileType: "application/pdf",
      sizeLabel: "74 KB",
      rawText: `BHARAT SURAKSHA INSURANCE CO. (SYNTHETIC DEMO DOCUMENT — FICTIONAL INSURER)
Claim Ref: BSI/CL/2026/00871  Policy No: 4455-6677-88
Dear Claimant,
Your death claim dated 02-Aug-2026 has not been admitted for want of:
(1) Certified copy of Death Certificate issued by Municipal Authority
(2) Proof of claimant's identity (Aadhaar/PAN copy, self-attested)
Please furnish within 30 days. Claims Manager.`,
      extracted: {
        documentCategory: "claim_letter",
        summary:
          "Fictional insurer Bharat Suraksha deferred the death claim for two missing documents: a certified municipal death certificate and self-attested claimant ID proof, with a 30-day compliance window.",
        extractionQuality: "good",
        fields: [
          { label: "Insurer", value: "Bharat Suraksha Insurance Co. (fictional)", confidence: 0.95, sourceExcerpt: "BHARAT SURAKSHA INSURANCE CO." },
          { label: "Claim reference", value: "BSI/CL/2026/00871", confidence: 0.96, sourceExcerpt: "Claim Ref: BSI/CL/2026/00871" },
          { label: "Policy number", value: "4455-6677-88", confidence: 0.95, sourceExcerpt: "Policy No: 4455-6677-88" },
          { label: "Stated reason", value: "Missing certified death certificate + claimant ID proof", confidence: 0.94, sourceExcerpt: "not admitted for want of: (1) Certified copy of Death Certificate (2) Proof of claimant's identity" },
          { label: "Deadline", value: "30 days from letter", confidence: 0.9, sourceExcerpt: "Please furnish within 30 days" },
        ],
        institutions: ["Bharat Suraksha Insurance Co. (fictional)"],
        assetClues: [],
        missingOrUnreadable: ["Date of the letter (partially illegible)"],
        warnings: ["Insurer name is fictional for demo purposes"],
      },
    },
  ],
  assets: [
    {
      category: "insurance",
      institution: "Bharat Suraksha Insurance Co. (fictional)",
      maskedRef: "Policy **6777-88",
      holderName: "Mohan Lal",
      evidence: "Rejection letter references policy 4455-6677-88 and pending death claim",
      confidence: 0.96,
      verificationStatus: "user_confirmed",
    },
  ],
  completedTaskTitles: ["Upload the rejection letter and all correspondence"],
};

const DEMO_C: DemoCaseSeed = {
  demoKey: "demo-c",
  caseType: "estate_planning",
  scenarioLabel: "Estate organisation & will preparation",
  holderName: "You (organising your own estate)",
  relationship: "Self",
  holderLiving: true,
  summary:
    "You hold several assets, have located your father's physical will, and your own beneficiary records are incomplete. The AI has built the estate inventory, flagged missing beneficiary information, prepared a will-preparation checklist, and marked items that need a qualified lawyer.",
  confirmedFacts: [
    "User is organising their own estate",
    "A physical will of the user's father has been found",
    "Beneficiary records are incomplete",
  ],
  assumptions: [
    "Executor has not yet been formally appointed",
    "No existing registered will located",
  ],
  confidence: 0.88,
  documents: [
    {
      category: "other",
      fileName: "Family_asset_notes_DEMO.txt",
      fileType: "text/plain",
      sizeLabel: "4 KB",
      rawText: `MY FAMILY ASSETS — rough notes (SYNTHETIC DEMO)
- HDFC Savings + FD ₹11.5L joint with wife
- ICICI demat: TCS 40 shares, Reliance 60 shares (dividends not updated since 2021)
- SBI Mutual Fund folio from father, nominee not registered
- Flat in Pune (loan closed 2023, release deed pending)
- Father's physical will found in almirah, unregistered, two witnesses`,
      extracted: {
        documentCategory: "other",
        summary:
          "Personal notes listing an HDFC joint account with FD, an ICICI demat holding TCS/Reliance shares, an SBI MF folio without nomination, a Pune flat with pending release deed, and the father's unregistered physical will.",
        extractionQuality: "good",
        fields: [
          { label: "Bank", value: "HDFC — savings + FD ₹11.5L (joint)", confidence: 0.88, sourceExcerpt: "HDFC Savings + FD ₹11.5L joint with wife" },
          { label: "Demat", value: "ICICI — TCS 40, Reliance 60", confidence: 0.9, sourceExcerpt: "ICICI demat: TCS 40 shares, Reliance 60 shares" },
          { label: "Mutual fund", value: "SBI MF folio — nominee not registered", confidence: 0.87, sourceExcerpt: "SBI Mutual Fund folio from father, nominee not registered" },
          { label: "Property", value: "Pune flat — loan closed, release deed pending", confidence: 0.85, sourceExcerpt: "Flat in Pune (loan closed 2023, release deed pending)" },
          { label: "Will", value: "Father's will — physical, unregistered, witnessed", confidence: 0.86, sourceExcerpt: "Father's physical will found in almirah, unregistered, two witnesses" },
        ],
        institutions: ["HDFC Bank", "ICICI Bank", "SBI Mutual Fund"],
        assetClues: [
          { category: "bank_deposit", institution: "HDFC Bank", reference: "Savings + FD", holderName: null, evidence: "Savings + FD ₹11.5L joint with wife", confidence: 0.85 },
          { category: "shares", institution: "ICICI Bank (demat)", reference: "Demat a/c", holderName: null, evidence: "TCS 40 shares, Reliance 60 shares; dividends not updated since 2021", confidence: 0.84 },
          { category: "mutual_fund", institution: "SBI Mutual Fund", reference: "Folio (inherited)", holderName: null, evidence: "Folio from father; nominee not registered", confidence: 0.8 },
        ],
        missingOrUnreadable: ["Account numbers", "Property title documents"],
        warnings: ["Notes are informal; each item needs document-level verification"],
      },
    },
  ],
  assets: [
    { category: "bank_deposit", institution: "HDFC Bank", maskedRef: null, holderName: "Joint holding", evidence: "Savings + FD ₹11.5L joint with wife (notes)", confidence: 0.85, verificationStatus: "unverified" },
    { category: "shares", institution: "ICICI Bank (demat)", maskedRef: null, holderName: null, evidence: "TCS 40, Reliance 60 shares; dividends not updated since 2021", confidence: 0.84, verificationStatus: "unverified" },
    { category: "mutual_fund", institution: "SBI Mutual Fund", maskedRef: null, holderName: "Father (transferred)", evidence: "Folio from father; nominee not registered", confidence: 0.8, verificationStatus: "unverified" },
    { category: "other", institution: "Pune flat (immovable property)", maskedRef: null, holderName: null, evidence: "Loan closed 2023; release deed pending", confidence: 0.8, verificationStatus: "unverified" },
  ],
  completedTaskTitles: ["Build the complete asset & liability inventory"],
};

export const DEMO_CASES: DemoCaseSeed[] = [DEMO_A, DEMO_B, DEMO_C];
