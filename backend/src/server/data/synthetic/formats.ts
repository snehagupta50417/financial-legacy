/**
 * Realistic Indian formats for SYNTHETIC identifiers. Full identifiers are never
 * produced: everything a user or model sees is masked, so a generated number can
 * never expose a real person's account.
 */

/** Deterministic PRNG (mulberry32) so demo data is identical on every run. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function digits(r: () => number, n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(r() * 10);
  return s;
}

/** Indian digit grouping: 1234567.5 → "12,34,567.50". */
export function inr(n: number, decimals = 2): string {
  const [int, frac] = Math.abs(n).toFixed(decimals).split(".");
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}${rest ? `${rest},${last3}` : last3}${decimals ? `.${frac}` : ""}`;
}

/** Statement date style: 2019-12-02 → "02-Dec-2019". */
export function dmy(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${String(d).padStart(2, "0")}-${mon}-${y}`;
}

/**
 * Savings account number lengths by bank, as commonly seen on passbooks and
 * statements. Curated (not an official spec); used only to make masks look right.
 */
export const ACCOUNT_LENGTH: Record<string, number> = {
  "State Bank of India": 11,
  "HDFC Bank": 14,
  "ICICI Bank": 12,
  "Punjab National Bank": 16,
  "Bank of Baroda": 14,
  "Axis Bank": 15,
  "Kotak Mahindra Bank": 10,
  "Canara Bank": 13,
};

/** e.g. PNB → "XXXXXXXXXXXX8821" (16 characters, last 4 visible). */
export function maskedAccount(bank: string, last4: string): string {
  const len = ACCOUNT_LENGTH[bank] ?? 12;
  return `${"X".repeat(len - 4)}${last4}`;
}

/** Masked PAN as printed on statements: "XXXXX1234X". */
export function maskedPan(r: () => number): string {
  return `XXXXX${digits(r, 4)}X`;
}

/** Masked Aadhaar: "XXXX XXXX 1234". */
export function maskedAadhaar(r: () => number): string {
  return `XXXX XXXX ${digits(r, 4)}`;
}

/** Masked folio: mutual fund folios are 8–11 digits, some with a "/NN" suffix. */
export function maskedFolio(last4: string, suffix?: string): string {
  return `XXXXXX${last4}${suffix ? `/${suffix}` : ""}`;
}

/** LIC policy numbers are 9 digits: "XXXXX9021". */
export function maskedLicPolicy(last4: string): string {
  return `XXXXX${last4}`;
}

/** Round units the way RTAs print them (3 decimals). */
export function units(value: number, nav: number): number {
  return Math.round((value / nav) * 1000) / 1000;
}

/**
 * Real LIC plans of the period our synthetic policyholders would have bought.
 * Curated from public LIC plan names and table numbers — verify against
 * licindia.in before using outside demos.
 */
export const LIC_PLANS = {
  jeevanAnand149: { name: "Jeevan Anand", table: "149", type: "Endowment with whole-life cover" },
  newEndowment814: { name: "New Endowment Plan", table: "814", type: "Endowment" },
  jeevanSaral165: { name: "Jeevan Saral", table: "165", type: "Endowment" },
} as const;
