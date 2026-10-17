/**
 * Builds the three demo cases from REAL PUBLIC reference data (real banks,
 * branches, IFSCs, fund schemes and NAVs, LIC plans, RBI rates) combined with
 * SYNTHETIC people and masked identifiers. Deterministic: same output every run.
 *
 * Every document is labelled "SYNTHETIC SAMPLE — not issued by <institution>".
 */
import type { DemoCaseSeed } from "../demo-data";
import { RBI, SNAPSHOT_DATE, branch, navInMonth, pincode, scheme } from "./reference";
import { LIC_PLANS, digits, dmy, inr, maskedAccount, maskedFolio, maskedLicPolicy, maskedPan, rng, units } from "./formats";

const SYNTH = (issuer: string) => `SYNTHETIC SAMPLE — not issued by ${issuer}`;
const rupees = (n: number) => `₹${inr(n, 0)}`;

// ---------------------------------------------------------------- Demo A
// Delhi family after a death: old PNB savings account, LIC policy, two MF folios.
function demoA(): DemoCaseSeed {
  const r = rng(1001);
  const holder = "Rajesh Kumar Sharma";
  const pnb = branch("Punjab National Bank", /DELHI/i);
  const acctLast4 = digits(r, 4);
  const acct = maskedAccount(pnb.bank, acctLast4);

  // Savings statement, Jan–Mar 2016, with the then-prevailing 4% SB interest credited quarterly.
  const opening = 124500;
  const interest = Math.round(opening * 0.04 * (90 / 365));
  const closing = opening + interest;

  // LIC Jeevan Anand (Table 149) taken in 2004; annual premium ≈ ₹49 per ₹1,000 sum assured at age 44.
  const lic = LIC_PLANS.jeevanAnand149;
  const sumAssured = 500000;
  const premium = Math.round((sumAssured / 1000) * 49.1);
  const policyLast4 = digits(r, 4);
  const policy = maskedLicPolicy(policyLast4);

  // CAS as of Dec 2019 — scheme names as they were then; values = units × real NAV.
  const hdfc = scheme(/^HDFC Flexi Cap Fund/);
  const sbi = scheme(/^SBI Large Cap Fund/);
  const hdfcNav = navInMonth(hdfc, "2019-12");
  const sbiNav = navInMonth(sbi, "2019-12");
  const hdfcUnits = units(412300, hdfcNav.nav);
  const sbiUnits = units(96400, sbiNav.nav);
  const hdfcValue = hdfcUnits * hdfcNav.nav;
  const sbiValue = sbiUnits * sbiNav.nav;
  const hdfcToday = hdfcUnits * hdfc.latest.nav;
  const sbiToday = sbiUnits * sbi.latest.nav;
  const hdfcFolio = maskedFolio(digits(r, 4), digits(r, 2));
  const sbiFolio = maskedFolio(digits(r, 4));
  const pan = maskedPan(r);

  return {
    demoKey: "demo-a",
    caseType: "family_death",
    scenarioLabel: "Family after the loss of a loved one",
    holderName: holder,
    relationship: "Son",
    holderLiving: false,
    summary:
      `Your father ${holder} passed away on 14 July 2026 in New Delhi. You found an old Punjab National Bank statement, an LIC premium receipt and a 2019 mutual fund statement, but the full financial footprint is unknown. The journey maps each institution, prepares deceased-claim checklists, and routes you to the official discovery portals.`,
    confirmedFacts: [
      `Asset holder: ${holder}`,
      "Relationship of claimant: Son",
      "Holder is deceased; date of death 14 July 2026 (New Delhi)",
      "Documents found: PNB statement (2016), LIC premium receipt (2018), CAMS/KFintech CAS (Dec 2019)",
    ],
    assumptions: ["No will has been located yet", "Nomination status in each account is unknown"],
    confidence: 0.93,
    documents: [
      {
        category: "bank_statement",
        fileName: "PNB_savings_statement_Q1_2016.pdf",
        fileType: "application/pdf",
        sizeLabel: "142 KB",
        rawText: `PUNJAB NATIONAL BANK — Statement of Account
${SYNTH("Punjab National Bank")}
Branch: ${pnb.branch} | IFSC: ${pnb.ifsc} | MICR: ${pnb.micr ?? "-"}
${pnb.address}
Account Holder: ${holder.toUpperCase()}   Account Type: Savings
A/c No: ${acct}
Period: 01-Jan-2016 to 31-Mar-2016
Date         Particulars                 Debit      Credit      Balance
01-Jan-2016  B/F                                               ${inr(opening)} Cr
31-Mar-2016  SB Interest @4.00% p.a.                ${inr(interest)}    ${inr(closing)} Cr
31-Mar-2016  C/F                                               ${inr(closing)} Cr
Note: No customer-induced transaction after 31-Mar-2016. Account classified INOPERATIVE (no transactions for 2 years).`,
        extracted: {
          documentCategory: "bank_statement",
          summary: `PNB savings statement (${pnb.branch}, ${pnb.ifsc}) in the name of ${holder}, closing balance ₹${inr(closing)} on 31 Mar 2016; later marked inoperative. With no activity for 10 years, the balance may now sit in RBI's DEA Fund.`,
          extractionQuality: "good",
          fields: [
            { label: "Institution", value: "Punjab National Bank", confidence: 0.97, sourceExcerpt: "PUNJAB NATIONAL BANK — Statement of Account" },
            { label: "Branch / IFSC", value: `${pnb.branch} / ${pnb.ifsc}`, confidence: 0.96, sourceExcerpt: `Branch: ${pnb.branch} | IFSC: ${pnb.ifsc}` },
            { label: "Account holder", value: holder, confidence: 0.98, sourceExcerpt: `Account Holder: ${holder.toUpperCase()}` },
            { label: "Account reference", value: `${acct} (masked)`, confidence: 0.94, sourceExcerpt: `A/c No: ${acct}` },
            { label: "Last known balance", value: `₹${inr(closing)} Cr (31 Mar 2016)`, confidence: 0.9, sourceExcerpt: `31-Mar-2016  C/F  ${inr(closing)} Cr` },
            { label: "Status flag", value: "Inoperative", confidence: 0.88, sourceExcerpt: "Account classified INOPERATIVE" },
          ],
          institutions: ["Punjab National Bank"],
          assetClues: [
            {
              category: "bank_deposit",
              institution: "Punjab National Bank",
              reference: `A/c **${acctLast4}`,
              holderName: holder,
              evidence: `PNB ${pnb.branch} (${pnb.ifsc}) — balance ₹${inr(closing)} Cr on 31 Mar 2016; inoperative`,
              confidence: 0.91,
            },
          ],
          missingOrUnreadable: ["Full account number (masked on statement)", "Balance after March 2016"],
          warnings: ["Balance is from 2016. Deposits untouched for 10 years move to RBI's DEA Fund — search UDGAM, then claim at the bank."],
        },
      },
      {
        category: "policy_document",
        fileName: "LIC_premium_receipt_Feb2018.jpg",
        fileType: "image/jpeg",
        sizeLabel: "88 KB",
        rawText: `LIFE INSURANCE CORPORATION OF INDIA — Premium Receipt
${SYNTH("LIC of India")}
Plan: ${lic.name} (Table ${lic.table})   Policy No: ${policy}
Life Assured: ${holder.toUpperCase()}   Date of Commencement: 28-Mar-2004
Sum Assured: Rs. ${inr(sumAssured, 0)}   Mode: Yearly
Premium received: Rs. ${inr(premium)}   Date: 12-Feb-2018   Due: 28-Mar-2018`,
        extracted: {
          documentCategory: "policy_document",
          summary: `LIC ${lic.name} (Table ${lic.table}) premium receipt for ${holder}, sum assured ₹${inr(sumAssured, 0)}, yearly premium ₹${inr(premium)} paid Feb 2018. No later receipts were found.`,
          extractionQuality: "good",
          fields: [
            { label: "Institution", value: "Life Insurance Corporation of India", confidence: 0.97, sourceExcerpt: "LIFE INSURANCE CORPORATION OF INDIA" },
            { label: "Policy number", value: `${policy} (masked)`, confidence: 0.95, sourceExcerpt: `Policy No: ${policy}` },
            { label: "Plan", value: `${lic.name} (Table ${lic.table})`, confidence: 0.92, sourceExcerpt: `Plan: ${lic.name} (Table ${lic.table})` },
            { label: "Sum assured", value: `₹${inr(sumAssured, 0)}`, confidence: 0.93, sourceExcerpt: `Sum Assured: Rs. ${inr(sumAssured, 0)}` },
            { label: "Last premium", value: `₹${inr(premium)} on 12 Feb 2018`, confidence: 0.9, sourceExcerpt: `Premium received: Rs. ${inr(premium)}   Date: 12-Feb-2018` },
          ],
          institutions: ["Life Insurance Corporation of India"],
          assetClues: [
            {
              category: "insurance",
              institution: "LIC of India",
              reference: `Policy **${policyLast4}`,
              holderName: holder,
              evidence: `${lic.name}, sum assured ₹${inr(sumAssured, 0)}, last premium Feb 2018`,
              confidence: 0.89,
            },
          ],
          missingOrUnreadable: ["Nominee name", "Whether later premiums were paid"],
          warnings: [
            "If premiums stopped after 2018 the policy may be paid-up, not lapsed — LIC must confirm the claim value.",
            "Sum assured is not cash value; the claim amount depends on policy status and bonuses.",
          ],
        },
      },
      {
        category: "bank_statement",
        fileName: "CAS_CAMS_KFintech_Dec2019.pdf",
        fileType: "application/pdf",
        sizeLabel: "96 KB",
        rawText: `CONSOLIDATED ACCOUNT STATEMENT — CAMS & KFintech
${SYNTH("CAMS or KFintech")}
Investor: ${holder.toUpperCase()}   PAN: ${pan}   Statement date: ${dmy(hdfcNav.date)}
Folio: ${hdfcFolio}   HDFC Equity Fund - Regular Plan - Growth   ISIN: ${hdfc.isin}
  Units: ${inr(hdfcUnits, 3)}   NAV (${dmy(hdfcNav.date)}): ${inr(hdfcNav.nav, 3)}   Value: Rs. ${inr(hdfcValue)}
Folio: ${sbiFolio}   SBI Blue Chip Fund - Regular Plan - Growth   ISIN: ${sbi.isin}
  Units: ${inr(sbiUnits, 3)}   NAV (${dmy(sbiNav.date)}): ${inr(sbiNav.nav, 4)}   Value: Rs. ${inr(sbiValue)}
Nominee: Not registered (Folio ${sbiFolio})`,
        extracted: {
          documentCategory: "bank_statement",
          summary: `CAS showing two folios for ${holder}: HDFC Equity Fund (now named HDFC Flexi Cap Fund) worth ₹${inr(hdfcValue, 0)} and SBI Blue Chip Fund (now SBI Large Cap Fund) worth ₹${inr(sbiValue, 0)} at December 2019 NAVs.`,
          extractionQuality: "good",
          fields: [
            { label: "Investor", value: holder, confidence: 0.97, sourceExcerpt: `Investor: ${holder.toUpperCase()}` },
            { label: "Folio 1", value: `${hdfcFolio} — HDFC Equity Fund (Growth), ISIN ${hdfc.isin}`, confidence: 0.93, sourceExcerpt: `Folio: ${hdfcFolio}   HDFC Equity Fund - Regular Plan - Growth` },
            { label: "Folio 1 value", value: `₹${inr(hdfcValue)} (${inr(hdfcUnits, 3)} units × NAV ${inr(hdfcNav.nav, 3)}, ${dmy(hdfcNav.date)})`, confidence: 0.9, sourceExcerpt: `Units: ${inr(hdfcUnits, 3)} ... Value: Rs. ${inr(hdfcValue)}` },
            { label: "Folio 2", value: `${sbiFolio} — SBI Blue Chip Fund (Growth), ISIN ${sbi.isin}`, confidence: 0.92, sourceExcerpt: `Folio: ${sbiFolio}   SBI Blue Chip Fund - Regular Plan - Growth` },
            { label: "Folio 2 value", value: `₹${inr(sbiValue)} (${inr(sbiUnits, 3)} units × NAV ${inr(sbiNav.nav, 4)}, ${dmy(sbiNav.date)})`, confidence: 0.89, sourceExcerpt: `Units: ${inr(sbiUnits, 3)} ... Value: Rs. ${inr(sbiValue)}` },
            { label: "Nominee (folio 2)", value: "Not registered", confidence: 0.86, sourceExcerpt: `Nominee: Not registered (Folio ${sbiFolio})` },
          ],
          institutions: ["HDFC Mutual Fund", "SBI Mutual Fund"],
          assetClues: [
            {
              category: "mutual_fund",
              institution: "HDFC Mutual Fund",
              reference: `Folio **${hdfcFolio.slice(-7)}`,
              holderName: holder,
              evidence: `HDFC Equity Fund (now HDFC Flexi Cap Fund), ${inr(hdfcUnits, 3)} units; ₹${inr(hdfcValue, 0)} in Dec 2019; indicative ₹${inr(hdfcToday, 0)} at AMFI NAV of ${hdfc.latest.date}`,
              confidence: 0.92,
            },
            {
              category: "mutual_fund",
              institution: "SBI Mutual Fund",
              reference: `Folio **${sbiFolio.slice(-4)}`,
              holderName: holder,
              evidence: `SBI Blue Chip Fund (now SBI Large Cap Fund), ${inr(sbiUnits, 3)} units; ₹${inr(sbiValue, 0)} in Dec 2019; indicative ₹${inr(sbiToday, 0)} at AMFI NAV of ${sbi.latest.date}; no nominee`,
              confidence: 0.9,
            },
          ],
          missingOrUnreadable: ["Transactions after December 2019"],
          warnings: [
            "Indicative values use today's NAV and the 2019 unit balance — the registrar must confirm current units.",
            "Folio 2 has no nominee: transmission needs heirship documents (simplified up to ₹10 lakh per fund house under SEBI's July 2026 rules).",
          ],
        },
      },
    ],
    assets: [
      { category: "bank_deposit", institution: "Punjab National Bank", maskedRef: `A/c **${acctLast4}`, holderName: holder, evidence: `PNB ${pnb.branch} (${pnb.ifsc}): ₹${inr(closing)} Cr on 31 Mar 2016; inoperative; check UDGAM`, confidence: 0.91, verificationStatus: "user_confirmed" },
      { category: "insurance", institution: "LIC of India", maskedRef: `Policy **${policyLast4}`, holderName: holder, evidence: `${lic.name} (Table ${lic.table}), sum assured ₹${inr(sumAssured, 0)}; last premium Feb 2018`, confidence: 0.89, verificationStatus: "user_confirmed" },
      { category: "mutual_fund", institution: "HDFC Mutual Fund", maskedRef: `Folio **${hdfcFolio.slice(-7)}`, holderName: holder, evidence: `HDFC Flexi Cap Fund (was HDFC Equity Fund): ₹${inr(hdfcValue, 0)} in Dec 2019; indicative ${rupees(hdfcToday)} today`, confidence: 0.92, verificationStatus: "user_confirmed" },
      { category: "mutual_fund", institution: "SBI Mutual Fund", maskedRef: `Folio **${sbiFolio.slice(-4)}`, holderName: holder, evidence: `SBI Large Cap Fund (was SBI Blue Chip Fund): ₹${inr(sbiValue, 0)} in Dec 2019; indicative ${rupees(sbiToday)} today; no nominee`, confidence: 0.9, verificationStatus: "user_confirmed" },
    ],
    completedTaskTitles: [],
  };
}

// ---------------------------------------------------------------- Demo B
// Lucknow: LIC death claim held up for documents (a "claim requirements" letter).
function demoB(): DemoCaseSeed {
  const r = rng(2002);
  const deceased = "Mohan Lal";
  const claimant = "Sunita Devi";
  const lic = LIC_PLANS.newEndowment814;
  const sumAssured = 300000;
  const policyLast4 = digits(r, 4);
  const policy = maskedLicPolicy(policyLast4);
  const claimRef = `DC/LKO/2026/${digits(r, 5)}`;
  const sbi = branch("State Bank of India", /LUCKNOW/i);
  const pin = pincode(sbi.pincode);
  const delayRate = RBI.bankRate != null ? RBI.bankRate + 2 : null;

  return {
    demoKey: "demo-b",
    caseType: "rejected_claim",
    scenarioLabel: "Delayed insurance claim — resolution journey",
    holderName: `${claimant} (policyholder: ${deceased})`,
    relationship: "Daughter",
    holderLiving: false,
    summary:
      `${claimant}'s death claim on her father ${deceased}'s LIC policy was held up: LIC wrote asking for documents. Under IRDAI rules a claim cannot be rejected for want of documents, and death claims must be settled within 15 days of intimation (45 if investigated), with interest at Bank Rate + 2% for delay. The AI has extracted what LIC needs, built the checklist, drafted a covering letter, and lined up the official grievance path if it isn't resolved in time.`,
    confirmedFacts: [
      "LIC wrote asking for documents before settling the claim",
      "Claim intimated at the servicing branch on 02-Aug-2026",
      `Claim reference ${claimRef} available`,
      "Claimant is the daughter and the registered nominee (to be confirmed)",
    ],
    assumptions: ["Nomination was registered on the policy (to be confirmed with LIC)"],
    confidence: 0.9,
    documents: [
      {
        category: "claim_letter",
        fileName: "LIC_claim_requirements_letter_Aug2026.pdf",
        fileType: "application/pdf",
        sizeLabel: "74 KB",
        rawText: `LIFE INSURANCE CORPORATION OF INDIA — Divisional Office, Lucknow
${SYNTH("LIC of India")}
Ref: ${claimRef}   Date: 20-Aug-2026
Policy No: ${policy}   Plan: ${lic.name} (Table ${lic.table})   Sum Assured: Rs. ${inr(sumAssured, 0)}
Life Assured: Late ${deceased.toUpperCase()}   Claimant: ${claimant.toUpperCase()} (Nominee)
Dear Madam,
With reference to the intimation of death received on 02-Aug-2026, please submit the following to settle the claim:
(1) Claimant's Statement in Claim Form A (Form No. 3783)
(2) Certified extract from the Death Register (Registrar of Births & Deaths, Lucknow Nagar Nigam)
(3) Original policy document
(4) Claimant's photo ID and address proof (self-attested)
(5) NEFT mandate with cancelled cheque of the claimant's own account
Sr. Divisional Manager (Claims)`,
        extracted: {
          documentCategory: "claim_letter",
          summary: `LIC Divisional Office, Lucknow asked ${claimant} for five documents to settle the death claim on ${deceased}'s ${lic.name} policy (sum assured ₹${inr(sumAssured, 0)}). This is a requirements letter, not a rejection.`,
          extractionQuality: "good",
          fields: [
            { label: "Insurer", value: "Life Insurance Corporation of India — Divisional Office, Lucknow", confidence: 0.95, sourceExcerpt: "LIFE INSURANCE CORPORATION OF INDIA — Divisional Office, Lucknow" },
            { label: "Claim reference", value: claimRef, confidence: 0.96, sourceExcerpt: `Ref: ${claimRef}` },
            { label: "Policy", value: `${policy} — ${lic.name} (Table ${lic.table})`, confidence: 0.95, sourceExcerpt: `Policy No: ${policy}   Plan: ${lic.name} (Table ${lic.table})` },
            { label: "Date of intimation", value: "02-Aug-2026", confidence: 0.93, sourceExcerpt: "intimation of death received on 02-Aug-2026" },
            { label: "Documents requested", value: "Form 3783, death register extract, original policy, claimant ID/address proof, NEFT mandate", confidence: 0.94, sourceExcerpt: "(1) Claimant's Statement in Claim Form A (Form No. 3783) ... (5) NEFT mandate" },
          ],
          institutions: ["Life Insurance Corporation of India"],
          assetClues: [
            { category: "insurance", institution: "LIC of India", reference: `Policy **${policyLast4}`, holderName: deceased, evidence: `${lic.name}, sum assured ₹${inr(sumAssured, 0)}; death claim ${claimRef} pending documents`, confidence: 0.96 },
          ],
          missingOrUnreadable: [],
          warnings: [
            "IRDAI Master Circular (5 Sep 2024): death claims are settled within 15 days of intimation (45 if investigated), and a claim cannot be rejected for want of documents.",
            delayRate != null
              ? `If settlement is late, interest at Bank Rate + 2% applies — ${delayRate.toFixed(2)}% a year at today's RBI Bank Rate of ${RBI.bankRate}%. Confirm the applicable start date with LIC.`
              : "If settlement is late, interest at Bank Rate + 2% applies.",
            `Payout goes only to the claimant's own account — e.g. her SBI account at ${sbi.branch}, ${pin?.district ?? sbi.district} (IFSC ${sbi.ifsc}).`,
          ],
        },
      },
    ],
    assets: [
      { category: "insurance", institution: "LIC of India", maskedRef: `Policy **${policyLast4}`, holderName: deceased, evidence: `${lic.name} (Table ${lic.table}), sum assured ₹${inr(sumAssured, 0)}; claim ${claimRef} awaiting documents`, confidence: 0.96, verificationStatus: "user_confirmed" },
    ],
    completedTaskTitles: ["Upload the rejection letter and all correspondence"],
  };
}

// ---------------------------------------------------------------- Demo C
// Pune: organising your own estate — joint HDFC savings + FD, demat, inherited MF folio.
function demoC(): DemoCaseSeed {
  const r = rng(3003);
  const hdfc = branch("HDFC Bank", /PUNE/i);
  const acctLast4 = digits(r, 4);
  const savings = 250000;
  const fd = 900000;
  const fdRate = 7.1;
  const mf = scheme(/^SBI Large Cap Fund/);
  const mfNav = navInMonth(mf, "2015-06");
  const mfUnits = units(150000, mfNav.nav);
  const mfToday = mfUnits * mf.latest.nav;

  return {
    demoKey: "demo-c",
    caseType: "estate_planning",
    scenarioLabel: "Estate organisation & will preparation",
    holderName: "You (organising your own estate)",
    relationship: "Self",
    holderLiving: true,
    summary:
      "You hold several assets in Pune, have located your father's physical will, and your own nominee records are incomplete. The AI has built the estate inventory, flagged missing nominee information, prepared a will-preparation checklist, and marked items that need a qualified lawyer.",
    confirmedFacts: ["User is organising their own estate", "A physical will of the user's father has been found", "Nominee records are incomplete"],
    assumptions: ["Executor has not yet been formally appointed", "No existing registered will located"],
    confidence: 0.88,
    documents: [
      {
        category: "other",
        fileName: "Family_asset_notes.txt",
        fileType: "text/plain",
        sizeLabel: "4 KB",
        rawText: `MY FAMILY ASSETS — rough notes (SYNTHETIC SAMPLE)
- HDFC Bank, ${hdfc.branch} branch (IFSC ${hdfc.ifsc}): savings ~Rs ${inr(savings, 0)} + FD Rs ${inr(fd, 0)} @ ${fdRate}% (matures Mar 2027), joint with wife. A/c ${maskedAccount("HDFC Bank", acctLast4)}
- ICICI demat: TCS 40 shares, Reliance 60 shares (dividends not updated since 2021)
- SBI Mutual Fund folio from father — SBI Blue Chip (now SBI Large Cap), ~${inr(mfUnits, 3)} units, nominee not registered
- Flat in Pune (loan closed 2023, release deed pending)
- Father's physical will found in almirah, unregistered, two witnesses`,
        extracted: {
          documentCategory: "other",
          summary: `Personal notes listing a joint HDFC account (savings ≈ ₹${inr(savings, 0)} + FD ₹${inr(fd, 0)}) at ${hdfc.branch}, Pune, an ICICI demat with TCS and Reliance shares, an inherited SBI Large Cap Fund folio (indicative ₹${inr(mfToday, 0)} today) without a nominee, a Pune flat with a pending release deed, and the father's unregistered will.`,
          extractionQuality: "good",
          fields: [
            { label: "Bank", value: `HDFC Bank, ${hdfc.branch} (${hdfc.ifsc}) — savings + FD, joint`, confidence: 0.88, sourceExcerpt: `HDFC Bank, ${hdfc.branch} branch (IFSC ${hdfc.ifsc})` },
            { label: "Fixed deposit", value: `₹${inr(fd, 0)} @ ${fdRate}% p.a., matures Mar 2027`, confidence: 0.86, sourceExcerpt: `FD Rs ${inr(fd, 0)} @ ${fdRate}% (matures Mar 2027)` },
            { label: "Demat", value: "ICICI — TCS 40, Reliance 60", confidence: 0.9, sourceExcerpt: "ICICI demat: TCS 40 shares, Reliance 60 shares" },
            { label: "Mutual fund", value: `SBI Large Cap Fund (was SBI Blue Chip) — ${inr(mfUnits, 3)} units, no nominee`, confidence: 0.87, sourceExcerpt: "SBI Mutual Fund folio from father — SBI Blue Chip (now SBI Large Cap)" },
            { label: "Property", value: "Pune flat — loan closed, release deed pending", confidence: 0.85, sourceExcerpt: "Flat in Pune (loan closed 2023, release deed pending)" },
            { label: "Will", value: "Father's will — physical, unregistered, witnessed", confidence: 0.86, sourceExcerpt: "Father's physical will found in almirah, unregistered, two witnesses" },
          ],
          institutions: ["HDFC Bank", "ICICI Bank", "SBI Mutual Fund"],
          assetClues: [
            { category: "bank_deposit", institution: "HDFC Bank", reference: `A/c **${acctLast4}`, holderName: null, evidence: `Savings ≈ ₹${inr(savings, 0)} + FD ₹${inr(fd, 0)} @ ${fdRate}%, joint with wife, ${hdfc.branch} (${hdfc.ifsc})`, confidence: 0.85 },
            { category: "shares", institution: "ICICI Bank (demat)", reference: "Demat a/c", holderName: null, evidence: "TCS 40 shares, Reliance 60 shares; dividends not updated since 2021", confidence: 0.84 },
            { category: "mutual_fund", institution: "SBI Mutual Fund", reference: "Folio (inherited)", holderName: null, evidence: `SBI Large Cap Fund, ${inr(mfUnits, 3)} units; indicative ₹${inr(mfToday, 0)} at AMFI NAV of ${mf.latest.date}; no nominee`, confidence: 0.8 },
          ],
          missingOrUnreadable: ["Demat account number", "Property title documents"],
          warnings: [
            "Notes are informal; each item needs document-level verification.",
            "Joint FD: confirm whether it is 'either or survivor' — that decides who can claim without heirship papers.",
          ],
        },
      },
    ],
    assets: [
      { category: "bank_deposit", institution: "HDFC Bank", maskedRef: `A/c **${acctLast4}`, holderName: "Joint holding", evidence: `Savings ≈ ₹${inr(savings, 0)} + FD ₹${inr(fd, 0)} @ ${fdRate}%, ${hdfc.branch} (${hdfc.ifsc})`, confidence: 0.85, verificationStatus: "unverified" },
      { category: "shares", institution: "ICICI Bank (demat)", maskedRef: null, holderName: null, evidence: "TCS 40, Reliance 60 shares; dividends not updated since 2021", confidence: 0.84, verificationStatus: "unverified" },
      { category: "mutual_fund", institution: "SBI Mutual Fund", maskedRef: null, holderName: "Father (transferred)", evidence: `SBI Large Cap Fund, ${inr(mfUnits, 3)} units; indicative ${rupees(mfToday)} today; no nominee`, confidence: 0.8, verificationStatus: "unverified" },
      { category: "other", institution: "Pune flat (immovable property)", maskedRef: null, holderName: null, evidence: "Loan closed 2023; release deed pending", confidence: 0.8, verificationStatus: "unverified" },
    ],
    completedTaskTitles: ["Build the complete asset & liability inventory"],
  };
}

export function buildDemoCases(): DemoCaseSeed[] {
  return [demoA(), demoB(), demoC()];
}

/** When the reference data behind the demos was fetched. */
export const DEMO_DATA_AS_OF = SNAPSHOT_DATE;
