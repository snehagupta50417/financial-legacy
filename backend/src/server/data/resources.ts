import type { OfficialResource } from "@shared/types";

/**
 * Official Resources registry — REAL, verified public destinations only.
 * Every entry corresponds to an actual government / regulator portal.
 * Financial Legacy never claims an API that does not exist: where a portal requires
 * interactive login / CAPTCHA / OTP, we route the user there (official_website),
 * we do not bypass it.
 */
export const OFFICIAL_RESOURCES: OfficialResource[] = [
  {
    id: "rbi-udgam",
    name: "UDGAM — Unclaimed Deposits Portal",
    authority: "Reserve Bank of India (RBI)",
    category: "bank_deposit",
    purpose:
      "Search for unclaimed deposits across banks on RBI's centralised portal, then follow the relevant bank's claim process.",
    url: "https://udgam.rbi.org.in/unclaimed-deposits/#/login",
    integrationType: "official_website",
    whatUserDoes:
      "Register on UDGAM, enter the depositor's name and approximate details, review matching unclaimed deposits, then claim with the specific bank.",
    lastVerified: "2026-10-01",
  },
  {
    id: "irdai-bima-bharosa-unclaimed",
    name: "Bima Bharosa — Unclaimed Amount Query",
    authority: "Insurance Regulatory and Development Authority of India (IRDAI)",
    category: "insurance",
    purpose:
      "Query unclaimed insurance amounts across insurers and prepare an official enquiry with the required consent details.",
    url: "https://bimabharosa.irdai.gov.in/Home/UnclaimedAmountsQuery",
    integrationType: "official_website",
    whatUserDoes:
      "Provide policyholder / policy details on the official form to trace unclaimed insurance amounts with the insurer.",
    lastVerified: "2026-10-01",
  },
  {
    id: "irdai-bima-bharosa-grievance",
    name: "Bima Bharosa — Grievance Portal",
    authority: "Insurance Regulatory and Development Authority of India (IRDAI)",
    category: "grievance",
    purpose:
      "Escalate an unresolved insurance grievance to the regulator after using the insurer's own grievance channel.",
    url: "https://bimabharosa.irdai.gov.in/",
    integrationType: "official_website",
    whatUserDoes:
      "File a complaint against the insurer with your policy details and prior correspondence.",
    lastVerified: "2026-10-01",
  },
  {
    id: "sebi-mitra",
    name: "MITRA — Mutual Fund Investment Tracing & Retrieval Assistant (info via SEBI)",
    authority: "Securities and Exchange Board of India (SEBI)",
    category: "mutual_fund",
    purpose:
      "Official information on MITRA, the platform to trace inactive or unclaimed mutual fund folios.",
    url: "https://www.sebi.gov.in/",
    integrationType: "official_website",
    whatUserDoes:
      "Review SEBI's MITRA circulars and follow the MITRA platform route published by MF Utilities / AMFI to search for forgotten folios.",
    lastVerified: "2026-10-01",
  },
  {
    id: "iepf",
    name: "Investor Education and Protection Fund (IEPF)",
    authority: "Ministry of Corporate Affairs, Government of India",
    category: "shares",
    purpose:
      "Recover unclaimed shares, dividends and other investor amounts transferred to IEPF.",
    url: "https://www.iepf.gov.in/",
    integrationType: "official_website",
    whatUserDoes:
      "Check unclaimed amounts, file Form IEPF-5 online and prepare the physical document set for the company's Nodal Officer.",
    lastVerified: "2026-10-01",
  },
  {
    id: "rbi-main",
    name: "Reserve Bank of India",
    authority: "Reserve Bank of India (RBI)",
    category: "multi",
    purpose:
      "Official circulars and deposit-related guidance including unclaimed deposit rules and inoperative account policy.",
    url: "https://www.rbi.org.in/",
    integrationType: "official_website",
    whatUserDoes: "Consult official notifications and bank-facing instructions.",
    lastVerified: "2026-10-01",
  },
  {
    id: "incometax",
    name: "Income Tax Department e-Filing",
    authority: "Income Tax Department, Government of India",
    category: "multi",
    purpose:
      "Trace past filings, PAN-linked records and annual information statements useful for discovery.",
    url: "https://www.incometax.gov.in/",
    integrationType: "official_website",
    whatUserDoes:
      "Log in to e-filing, view AIS/TIS to spot interest, dividends or capital gains you may have forgotten.",
    lastVerified: "2026-10-01",
  },
  {
    id: "indiagov",
    name: "National Portal of India",
    authority: "Government of India",
    category: "multi",
    purpose:
      "Directory of official government services including succession certificates and legal heir procedures.",
    url: "https://www.india.gov.in/",
    integrationType: "official_website",
    whatUserDoes: "Locate state-specific procedures for legal heirship and succession.",
    lastVerified: "2026-10-01",
  },
];

export function findResourcesForCategories(
  categories: string[]
): OfficialResource[] {
  if (!categories.length) return OFFICIAL_RESOURCES;
  const scored = OFFICIAL_RESOURCES.map((r) => ({
    r,
    hit: categories.includes(r.category) || r.category === "multi",
  }));
  return [
    ...scored.filter((s) => s.hit && s.r.category !== "multi").map((s) => s.r),
    ...scored.filter((s) => !s.hit || s.r.category === "multi").map((s) => s.r),
  ];
}

export function resourceForTask(
  category: string | null
): OfficialResource | null {
  if (!category) return null;
  const direct = OFFICIAL_RESOURCES.find((r) => r.category === category);
  if (direct) return direct;
  return OFFICIAL_RESOURCES.find((r) => r.category === "multi") ?? null;
}
