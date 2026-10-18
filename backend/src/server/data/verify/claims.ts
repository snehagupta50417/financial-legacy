import type { ClaimRoute, DocKind } from "@shared/verify-rules";

/**
 * Synthetic claims for the Verify console demo. Every name, number and document is made up.
 * Each planted discrepancy is listed in ./README.md; keep the two in step.
 */

export interface FixtureField { key: string; label: string; value: string }
export interface FixtureSignal { fieldKey: string; kind: "date_field_edit" | "modified_after_issue"; note: string }
export interface FixtureDoc { kind: DocKind; title: string; issuer: string; fields: FixtureField[]; signals?: FixtureSignal[]; readable?: boolean }
export interface FixtureClaim {
  key: "A" | "B" | "C" | "D";
  code: string;
  institution: string;
  deceasedName: string;
  claimantName: string;
  relationship: string;
  contactMasked: string;
  productLabel: string;
  productLast4: string;
  amountMin: number;
  amountMax: number;
  route: ClaimRoute;
  source: "FinLegacy" | "Branch";
  /** Days before the demo starts that the claim arrived; the 15-day window is counted from here. */
  receivedDaysAgo: number;
  /** One line for the receipt event in the audit timeline. */
  receipt: string;
  docs: FixtureDoc[];
}

export const INSTITUTIONS = {
  lic: { label: "LIC · Claims desk", reviewer: "R. Menon (demo reviewer)" },
  sbi: { label: "SBI · Deceased claims cell", reviewer: "S. Banerjee (demo reviewer)" },
} as const;
export type InstitutionKey = keyof typeof INSTITUTIONS;

const rajesh = { deceasedName: "Rajesh Kumar Sharma", deceasedDob: "14 Jul 1958" };

const deathCertificate = (name: string, dob: string, dod: string, age: string, serial: string, place: string, signals?: FixtureSignal[]): FixtureDoc => ({
  kind: "death_certificate",
  title: "Death certificate",
  issuer: `Registrar of Births and Deaths, ${place} (synthetic)`,
  fields: [
    { key: "deceasedName", label: "Name of deceased", value: name },
    { key: "deceasedDob", label: "Date of birth", value: dob },
    { key: "dateOfDeath", label: "Date of death", value: dod },
    { key: "ageAtDeath", label: "Age at death", value: age },
    { key: "placeOfDeath", label: "Place of death", value: place },
    { key: "registrationNo", label: "Registration no.", value: serial },
  ],
  signals,
});
const claimantId = (name: string, last4: string, dob: string): FixtureDoc => ({
  kind: "claimant_id",
  title: "Claimant ID",
  issuer: "Demo identity card (synthetic)",
  fields: [
    { key: "claimantName", label: "Name", value: name },
    { key: "idRef", label: "ID number", value: `•••• •••• ${last4}` },
    { key: "claimantDob", label: "Date of birth", value: dob },
  ],
});
const claimForm = (deceased: string, dod: string, claimant: string, relationship: string, product: string): FixtureDoc => ({
  kind: "claim_form",
  title: "Claim form",
  issuer: "Claimant's declaration (synthetic)",
  fields: [
    { key: "deceasedName", label: "Name of deceased", value: deceased },
    { key: "dateOfDeath", label: "Date of death (as declared)", value: dod },
    { key: "claimantName", label: "Name of claimant", value: claimant },
    { key: "relationship", label: "Relationship to deceased", value: relationship },
    { key: "productRef", label: "Product", value: product },
  ],
});

export const FIXTURES: FixtureClaim[] = [
  {
    key: "A",
    code: "VER-0412",
    institution: "LIC of India",
    deceasedName: rajesh.deceasedName,
    claimantName: "Ananya Sharma",
    relationship: "Daughter and nominee",
    contactMasked: "+91 ••••• ••284",
    productLabel: "LIC Jeevan Anand policy",
    productLast4: "4821",
    amountMin: 500000,
    amountMax: 620000,
    route: "nominee",
    source: "FinLegacy",
    receivedDaysAgo: 6,
    receipt: "Claim pack received from the heir through FinLegacy.",
    docs: [
      deathCertificate(rajesh.deceasedName, rajesh.deceasedDob, "03 Mar 2026", "67", "DEL/2026/0418837", "New Delhi"),
      claimantId("Ananya Sharma", "5530", "02 Nov 1991"),
      claimForm(rajesh.deceasedName, "03 Mar 2026", "Ananya Sharma", "Daughter (nominee)", "LIC policy ending 4821"),
      { kind: "policy_document", title: "Policy document", issuer: "LIC of India (synthetic)", fields: [
        { key: "deceasedName", label: "Policy holder", value: rajesh.deceasedName },
        { key: "deceasedDob", label: "Date of birth", value: rajesh.deceasedDob },
        { key: "productRef", label: "Policy", value: "LIC policy ending 4821" },
        { key: "nominee", label: "Nominee", value: "Ananya Sharma (daughter)" },
      ] },
    ],
  },
  {
    // Planted: the death certificate's date was edited (12 Mar vs 3 Mar), it duplicates claim A, and proof of relationship is missing.
    key: "B",
    code: "VER-0415",
    institution: "LIC of India",
    deceasedName: rajesh.deceasedName,
    claimantName: "Vikram Sharma",
    relationship: "Claimed nephew",
    contactMasked: "+91 ••••• ••716",
    productLabel: "LIC Jeevan Anand policy",
    productLast4: "4821",
    amountMin: 500000,
    amountMax: 620000,
    route: "succession",
    source: "Branch",
    receivedDaysAgo: 5,
    receipt: "Claim pack submitted at a branch.",
    docs: [
      deathCertificate(rajesh.deceasedName, rajesh.deceasedDob, "12 Mar 2026", "67", "DEL/2026/0418837", "New Delhi", [
        { fieldKey: "dateOfDeath", kind: "date_field_edit", note: "Demo metadata: the date field's character spacing and compression differ from the rest of the certificate." },
        { fieldKey: "dateOfDeath", kind: "modified_after_issue", note: "Demo metadata: the file was saved again after the certificate's issue date." },
      ]),
      claimantId("Vikram Sharma", "7718", "21 Apr 1989"),
      claimForm(rajesh.deceasedName, "03 Mar 2026", "Vikram Sharma", "Nephew", "LIC policy ending 4821"),
      { kind: "policy_document", title: "Policy document", issuer: "LIC of India (synthetic)", fields: [
        { key: "deceasedName", label: "Policy holder", value: rajesh.deceasedName },
        { key: "deceasedDob", label: "Date of birth", value: rajesh.deceasedDob },
        { key: "productRef", label: "Policy", value: "LIC policy ending 4821" },
      ] },
    ],
  },
  {
    // Planted: the indemnity form is not in the pack.
    key: "C",
    code: "VER-0398",
    institution: "State Bank of India",
    deceasedName: "Sunita Verma",
    claimantName: "Arjun Verma",
    relationship: "Son",
    contactMasked: "+91 ••••• ••905",
    productLabel: "SBI fixed deposit",
    productLast4: "3307",
    amountMin: 310000,
    amountMax: 335000,
    route: "deceased_deposit",
    source: "Branch",
    receivedDaysAgo: 9,
    receipt: "Claim pack submitted at a branch.",
    docs: [
      deathCertificate("Sunita Verma", "09 Jan 1960", "21 Feb 2026", "66", "LKO/2026/0071204", "Lucknow"),
      claimantId("Arjun Verma", "3392", "30 Sep 1986"),
      { kind: "relationship_proof", title: "Proof of relationship (birth record)", issuer: "Municipal birth register (synthetic)", fields: [
        { key: "claimantName", label: "Child", value: "Arjun Verma" },
        { key: "motherName", label: "Mother", value: "Sunita Verma" },
      ] },
      claimForm("Sunita Verma", "21 Feb 2026", "Arjun Verma", "Son", "SBI fixed deposit ending 3307"),
    ],
  },
  {
    key: "D",
    code: "VER-0391",
    institution: "HDFC Bank",
    deceasedName: "Mohan Iyer",
    claimantName: "Lakshmi Iyer",
    relationship: "Spouse and joint holder",
    contactMasked: "+91 ••••• ••150",
    productLabel: "HDFC savings account",
    productLast4: "9150",
    amountMin: 86000,
    amountMax: 92000,
    route: "joint_survivor",
    source: "FinLegacy",
    receivedDaysAgo: 13,
    receipt: "Claim pack received from the heir through FinLegacy.",
    docs: [
      deathCertificate("Mohan Iyer", "03 Jun 1957", "27 Sep 2026", "69", "CHE/2026/0239941", "Chennai"),
      claimantId("Lakshmi Iyer", "4471", "12 Dec 1960"),
      claimForm("Mohan Iyer", "27 Sep 2026", "Lakshmi Iyer", "Spouse (surviving joint holder)", "HDFC savings account ending 9150"),
    ],
  },
];
