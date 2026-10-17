import { OFFICIAL_RESOURCES } from "@/server/data/resources";

/**
 * The procedure library the case assistant searches (RAG). Every passage is a
 * plain-language summary of an official source recorded in
 * docs/SOURCE_VALIDATION.md, with the link and the date it was checked.
 * "Unverified" points say so in the text, so the assistant never states them
 * as fact. Change a passage only together with that document.
 */

export type Verification = "verified" | "secondary" | "unverified";

export interface LibraryPassage {
  id: string;
  title: string;
  authority: string;
  url: string;
  checkedOn: string;
  verification: Verification;
  /** Extra words people use for this topic (helps keyword search). */
  keywords?: string;
  text: string;
}

const CHECKED = "2026-10-17";
const RBI_DIRECTIONS = "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12901";
const SEBI_TRANSMISSION =
  "https://www.sebi.gov.in/legal/circulars/jul-2026/ease-of-doing-investment-and-ease-of-doing-business-simplification-and-standardisation-of-the-framework-for-transmission-of-securities_103030.html";
const IRDAI_MASTER = "https://irdai.gov.in/document-detail?documentId=5625747";

const PROCEDURES: LibraryPassage[] = [
  // ── Banks ────────────────────────────────────────────────────────────────
  {
    id: "bank-claim-nominee",
    title: "Bank deposit claim when there is a nominee or surviving joint holder",
    authority: "Reserve Bank of India — Settlement of Claims of Deceased Customers Directions, 2025",
    url: RBI_DIRECTIONS,
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "bank account savings fixed deposit FD nominee survivor joint holder claim form documents succession certificate",
    text: "Under RBI's 2025 Directions (RBI/2025-26/82, 26 September 2025, in force by 31 March 2026), a nominee or surviving joint holder claims a deceased customer's deposit with the claim form (Annex I-A), the death certificate and the claimant's officially valid ID. No succession certificate is needed, whatever the amount. The nominee receives the money; nomination does not decide who finally owns it among the legal heirs.",
  },
  {
    id: "bank-claim-no-nominee-small",
    title: "Bank deposit claim with no nominee, up to ₹15 lakh",
    authority: "Reserve Bank of India — Settlement of Claims of Deceased Customers Directions, 2025",
    url: RBI_DIRECTIONS,
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "bank account no nominee legal heir small amount simplified threshold indemnity no objection succession certificate",
    text: "When there is no nominee, commercial banks must use a simplified process for claims up to ₹15 lakh (₹5 lakh for co-operative banks); a bank may set a higher limit. Documents: claim form (I-B), death certificate, claimant ID, an indemnity bond (I-C), a no-objection from the other legal heirs (I-D), and either a legal heir certificate or a declaration by an independent person (I-E). No surety is required and no succession certificate is needed.",
  },
  {
    id: "bank-claim-no-nominee-large",
    title: "Bank deposit claim with no nominee, above the bank's limit",
    authority: "Reserve Bank of India — Settlement of Claims of Deceased Customers Directions, 2025",
    url: RBI_DIRECTIONS,
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "bank large amount succession certificate legal heir affidavit surety court",
    text: "Above the bank's simplified limit, with no nominee, the bank can ask for a succession certificate, a legal heir certificate or an affidavit, and may require a surety. This is the case where a lawyer's help is most often needed.",
  },
  {
    id: "bank-claim-timelines",
    title: "Bank claim timelines and compensation for delay",
    authority: "Reserve Bank of India — Settlement of Claims of Deceased Customers Directions, 2025",
    url: RBI_DIRECTIONS,
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "how long days time limit delay interest compensation locker submit branch online",
    text: "Banks must settle a deceased customer's deposit claim within 15 calendar days of receiving complete documents. If they are late they must pay compensation of at least Bank Rate + 4% a year. Lockers: access within 15 days, then ₹5,000 for every day of delay. Claims can be lodged at any branch; online lodging and tracking is optional for banks, and they may still ask to see originals.",
  },
  {
    id: "bank-missing-person",
    title: "Bank claim when the account holder is missing",
    authority: "Reserve Bank of India — Settlement of Claims of Deceased Customers Directions, 2025",
    url: RBI_DIRECTIONS,
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "missing person untraceable FIR police no death certificate",
    text: "For a missing person, an FIR and the police's non-traceable report can be used instead of a death certificate for amounts under ₹1 lakh.",
  },
  {
    id: "bank-limits-by-bank",
    title: "Simplified claim limits and online claims at large banks",
    authority: "Bank websites (ICICI, SBI, PNB, Bank of Baroda, HDFC, Kotak)",
    url: "https://sbi.bank.in/web/personal-banking/information-services/deceased-settlement",
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "ICICI SBI State Bank PNB Punjab National Bank of Baroda HDFC Kotak Axis limit online portal",
    text: "Bank-published limits for claims without legal representation: ICICI Bank up to ₹2 crore; SBI ₹15 lakh (from 16 December 2025) with an online portal and case ID; PNB ₹15 lakh, online with OTP and a tracking ID; Bank of Baroda ₹15 lakh with an online portal. HDFC Bank has not published its limit. Kotak takes claims at branches only. Axis Bank was not verified.",
  },
  // ── Discovery ────────────────────────────────────────────────────────────
  {
    id: "udgam-coverage",
    title: "What RBI UDGAM can and cannot find",
    authority: "Reserve Bank of India — UDGAM FAQ",
    url: "https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQonUDGAMPortal.pdf",
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "UDGAM unclaimed deposits DEA fund search find old bank account inactive dormant 10 years",
    text: "UDGAM finds deposits that were unoperated for 10 years or more and moved to RBI's Depositor Education and Awareness (DEA) Fund, at the banks that have joined (30 banks, about 90% of DEA value, as of March 2024). It does not show active accounts. A registered user searches with the holder's name, the bank, and one of PAN, driving licence, voter ID, passport or date of birth. A match gives a reference number (UDRN); the claim itself is made at the bank. There is no time limit to claim.",
  },
  {
    id: "common-portal",
    title: "Government common portal for unclaimed assets",
    authority: "Department of Financial Services (PIB release)",
    url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2266714",
    checkedOn: CHECKED,
    verification: "secondary",
    keywords: "unclaimed assets portal one place deposits insurance shares dividends mutual funds",
    text: "The common portal (unclaimedassetsportal.in), launched on 29 May 2026, is a gateway: it links to UDGAM for deposits, Bima Bharosa for insurance, SEBI MITRA for mutual funds and IEPF for shares and dividends. No search database of its own was found.",
  },
  {
    id: "mitra-search",
    title: "Finding inactive mutual fund folios with SEBI MITRA",
    authority: "SEBI — MITRA circular (12 February 2025)",
    url: "https://www.sebi.gov.in/legal/circulars/feb-2025/service-platform-for-investors-to-trace-inactive-and-unclaimed-mutual-fund-folios-mitra-mutual-fund-investment-tracing-and-retrieval-assistant-_91847.html",
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "MITRA mutual fund folio inactive unclaimed search MFCentral PAN find investments",
    text: "SEBI MITRA (through MFCentral) helps trace mutual fund folios with no transactions for 10 years and unclaimed amounts, including investments the searcher may be the rightful claimant for. You log in with your own mobile or email and OTP and search by name plus two other details. Results show only the fund house name — not the folio number or value — so the next step is contacting that fund house. Reported limit: 5 searches per name per day (secondary source).",
  },
  {
    id: "insurance-unclaimed",
    title: "Finding unclaimed life insurance (Bima Bharosa and insurer searches)",
    authority: "IRDAI / PIB (December 2025)",
    url: "https://bimabharosa.irdai.gov.in/",
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "insurance policy unclaimed LIC Bima Bharosa search senior citizens welfare fund old policy",
    text: "Unclaimed insurance money (unpaid more than 12 months after it was due) is searched on each insurer's website; IRDAI's Bima Bharosa links to all of them. LIC's search needs the name and date of birth (policy number and PAN optional) and is updated half-yearly. Money unclaimed for over 10 years moves to the Senior Citizens' Welfare Fund and can still be claimed for 25 years, with no fee.",
  },
  {
    id: "no-discovery-api",
    title: "Why searches are done by the family, not automatically",
    authority: "Financial Legacy source research",
    url: "https://udgam.rbi.org.in/unclaimed-deposits/#/login",
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "automatic search API why manual guided search portal login OTP captcha",
    text: "UDGAM, the common portal, SEBI MITRA and insurers' searches are manual websites with logins, OTPs or captchas and no public API. Financial Legacy guides the family to each official search and records what they found; it does not search on their behalf, and a search that finds nothing does not prove nothing exists. Every match is claimed at the bank, fund house or insurer.",
  },
  // ── Mutual funds ─────────────────────────────────────────────────────────
  {
    id: "mf-transmission-nominee",
    title: "Mutual fund transmission to a nominee",
    authority: "SEBI — transmission circular (23 July 2026)",
    url: SEBI_TRANSMISSION,
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "mutual fund units nominee transmission transfer death folio trustee",
    text: "A nominee claims mutual fund units with the transmission request form (Annexure-3), the death certificate (a QR-verifiable copy is accepted) and the statement of account. The nominee receives the units as a trustee for the legal heirs — being the nominee does not make them the final owner.",
  },
  {
    id: "mf-transmission-small",
    title: "Mutual fund Quick Transmission (up to ₹10,000 per fund house)",
    authority: "SEBI — transmission circular (23 July 2026); AMFI Form QTP",
    url: SEBI_TRANSMISSION,
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "mutual fund small amount quick transmission QTP no nominee spouse children parents",
    text: "With no nominee, units worth up to ₹10,000 per fund house (₹30,000 in demat) can go through Quick Transmission: a plain-paper form-cum-undertaking (Annexure-2) and proof of relationship. Only immediate relatives may use it: parents, spouse, children and parents-in-law.",
  },
  {
    id: "mf-transmission-simplified",
    title: "Mutual fund simplified transmission (up to ₹10 lakh) and above",
    authority: "SEBI — transmission circular (23 July 2026)",
    url: SEBI_TRANSMISSION,
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "mutual fund units transfer no nominee legal heir indemnity affidavit family settlement probate will succession",
    text: "With no nominee, up to ₹10 lakh per fund house (₹30 lakh demat): a notarised indemnity bond plus an affidavit-cum-NOC from all legal heirs, or a family settlement deed. Above that: an affidavit-cum-NOC plus one of — the will with an indemnity bond; a legal heir certificate (Tehsildar or above) with an indemnity bond; or a succession certificate, letter of administration or court decree. Probate is no longer mandatory.",
  },
  {
    id: "mf-transmission-timelines",
    title: "Mutual fund transmission timelines",
    authority: "SEBI — transmission circular (23 July 2026)",
    url: SEBI_TRANSMISSION,
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "how long days mutual fund transmission delay rejection NAV registrar CAMS KFintech",
    text: "Fund houses must complete transmission within 21 calendar days of complete documents and explain any delay or rejection in writing. Units are valued at the last NAV. Online lodging is optional and originals may still be asked for. Note: some registrar pages (for example KFintech's) still showed the old thresholds when checked, so the SEBI circular is the reference.",
  },
  // ── Life insurance ───────────────────────────────────────────────────────
  {
    id: "insurance-claim-nominee",
    title: "LIC death claim when there is a nominee",
    authority: "LIC claim requirements and forms",
    url: "https://licindia.in/claims-settlement-requirements",
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "LIC life insurance death claim nominee Form 3783 Claim Form A original policy documents",
    text: "A nominee claims an LIC death benefit with Claim Form A (Form 3783), plus Form 3783(A) if the policy ran 3 years or more; a certified extract of the death register; the original policy; and an NEFT mandate with a cancelled cheque. Extra forms apply for deaths within 3 years of the policy start or revival, and FIR, post-mortem and police reports for unnatural deaths.",
  },
  {
    id: "insurance-claim-no-nominee",
    title: "LIC death claim with no nominee",
    authority: "LIC claim requirements",
    url: "https://licindia.in/claims-settlement-requirements",
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "LIC no nominee legal heir evidence of title succession",
    text: "Without a nominee, LIC needs everything a nominee would submit plus evidence of title — legal proof of who is entitled. The branch may relax this in some cases. LIC has not published a small-amount threshold, and an online death-intimation route was not confirmed (unverified); written intimation to the servicing branch works.",
  },
  {
    id: "insurance-claim-timelines",
    title: "Life insurance death-claim timelines and interest for delay",
    authority: "IRDAI Master Circular (5 September 2024)",
    url: IRDAI_MASTER,
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "insurance how long days intimation delay interest reject documents",
    text: "Insurers must settle a death claim within 15 days of the claim being intimated, or 45 days if investigation is warranted. If late, interest at Bank Rate + 2% runs from intimation to payment and is paid without the claimant asking. A claim may not be rejected or closed only for want of documents. Practical step: send written intimation to the servicing branch on day 1 — the clock starts then.",
  },
  // ── Later sources ────────────────────────────────────────────────────────
  {
    id: "aa-digilocker",
    title: "Account Aggregator and DigiLocker after a death",
    authority: "Sahamati (AA) and SEBI DigiLocker circular (March 2025)",
    url: "https://www.sebi.gov.in/sebi_data/attachdocs/mar-2025/1742386353397.pdf",
    checkedOn: CHECKED,
    verification: "verified",
    keywords: "account aggregator AA DigiLocker nominee fetch statements deceased consent",
    text: "Account Aggregator works only with the account holder's own consent, so it gives no route to a deceased person's data. Since 1 April 2025, fund houses, registrars and depositories issue statements into DigiLocker, and the holder's DigiLocker nominee is notified on death and can view documents the holder fetched while alive — only if the nominee was set up before death. Transmission rules are unchanged.",
  },
];

/** Every passage: the procedures above plus the official resources directory. */
export const LIBRARY: LibraryPassage[] = [
  ...PROCEDURES,
  ...OFFICIAL_RESOURCES.map((r) => ({
    id: `resource-${r.id}`,
    title: r.name,
    authority: r.authority,
    url: r.url,
    checkedOn: r.lastVerified,
    verification: "verified" as const,
    keywords: r.category.replace(/_/g, " "),
    text: `${r.purpose} What you do: ${r.whatUserDoes}`,
  })),
];
