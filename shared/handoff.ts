/** Curated public instructions, never automatic submission endpoints. Checked 2026-10-18. */
export function claimDestination(category: string, institution: string, requirementsUrl?: string): { url?: string; institutionSpecific: boolean } {
  if (category === "bank" && /^(State Bank of India|SBI)$/i.test(institution.trim())) return { url: "https://sbi.bank.in/web/personal-banking/information-services/deceased-settlement", institutionSpecific: true };
  if (category === "insurance" && /^(LIC|LIC of India|Life Insurance Corporation of India)$/i.test(institution.trim())) return { url: "https://licindia.in/en/web/guest/claims-settlement-requirements", institutionSpecific: true };
  if (category === "bank" && /^HDFC Bank$/i.test(institution.trim())) return { url: "https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?path=%2FFooter%2FResource%2FForms+Centre%2FContent%2FDetail+Page%2FForms+Center+-personal%2FDecease-Claim-Settlement-Format.pdf", institutionSpecific: true };
  if (category === "mutual_fund" && /^CAMS$/i.test(institution.trim())) return { url: "https://www.camsonline.com/Investors/Service-requests/Transmission/Transmission", institutionSpecific: true };
  return { url: requirementsUrl, institutionSpecific: false };
}
