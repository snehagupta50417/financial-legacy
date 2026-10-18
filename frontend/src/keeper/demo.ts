/**
 * The backend's synthetic demo cases (POST /api/demo). People and identifiers are made up; the banks,
 * branches, fund schemes and NAVs behind them are real public reference data. Keep in step with
 * backend/src/server/data/synthetic/demo-cases.ts.
 */
export const DEMO_SCENARIOS: { key: "demo-a" | "demo-b" | "demo-c"; title: string; blurb: string; has: string }[] = [
  { key: "demo-a", title: "A family after a loss", blurb: "A son is settling his father's affairs.", has: "Bank deposit, LIC policy, two mutual funds, with documents to review." },
  { key: "demo-b", title: "A delayed insurance claim", blurb: "A daughter's insurance claim has stalled.", has: "A resolution journey with the papers and the steps to escalate." },
  { key: "demo-c", title: "Organising my own estate", blurb: "Someone plans ahead for their family.", has: "Holdings, nominees and papers in one record." },
];
