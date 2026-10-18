import { expect, it } from "vitest";
import { claimDestination } from "@shared/handoff";
it("routes only exact institution/category matches and labels regulatory fallbacks honestly", () => {
  expect(claimDestination("bank", "State Bank of India").institutionSpecific).toBe(true);
  expect(claimDestination("bank", "HDFC Bank").url).toContain("Decease-Claim-Settlement");
  expect(claimDestination("insurance", "LIC of India").url).toContain("licindia.in");
  expect(claimDestination("insurance", "HDFC Bank", "https://example.gov.in/rules")).toEqual({ url: "https://example.gov.in/rules", institutionSpecific: false });
  expect(claimDestination("mutual_fund", "Unknown fund").institutionSpecific).toBe(false);
});
