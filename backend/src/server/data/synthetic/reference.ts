/**
 * Typed access to the REAL PUBLIC reference snapshot in ../reference/*.json
 * (fetched by scripts/fetch-reference-data.mjs). Contains institutions, branches,
 * schemes, NAVs, pincodes and RBI rates — never personal data.
 */
import mutualFunds from "../reference/mutual-funds.json";
import bankBranches from "../reference/bank-branches.json";
import pincodes from "../reference/pincodes.json";
import rbiRates from "../reference/rbi-rates.json";

export interface Scheme {
  schemeCode: number;
  isin: string;
  name: string;
  plan: string;
  option: string;
  fundHouse: string;
  category: string;
  latest: { date: string; nav: number };
  firstNavDate: string | null;
  monthlyNav: [string, number][];
}

export interface Branch {
  bank: string;
  ifsc: string;
  branch: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  micr: string | null;
}

export interface Pincode {
  pincode: string;
  district: string;
  state: string;
  postOffices: string[];
}

export const SNAPSHOT_DATE: string = mutualFunds.fetchedOn;
export const SCHEMES = mutualFunds.schemes as unknown as Scheme[];
export const BRANCHES = bankBranches.branches as Branch[];
export const PINCODES = pincodes.pincodes as Pincode[];
export const RBI = rbiRates as { fetchedOn: string; policyRepoRate: number | null; bankRate: number | null; source: string };

/** A real scheme whose name matches the pattern. Throws if the snapshot lacks it. */
export function scheme(pattern: RegExp): Scheme {
  const s = SCHEMES.find((x) => pattern.test(x.name));
  if (!s) throw new Error(`Reference snapshot has no scheme matching ${pattern}`);
  return s;
}

/** NAV on the first trading day of the given month (YYYY-MM), from real history. */
export function navInMonth(s: Scheme, yearMonth: string): { date: string; nav: number } {
  const hit = s.monthlyNav.find(([d]) => d.startsWith(yearMonth));
  if (!hit) throw new Error(`No NAV for ${s.name} in ${yearMonth}`);
  return { date: hit[0], nav: hit[1] };
}

// Branches a family would not hold a personal savings account at.
const NOT_RETAIL = /GOVERNMENT|GOVT|CPPC|CENTRALI[SZ]ED|TREASURY|CORPORATE|SME|CURRENCY|CLEARING|SERVICE BRANCH|PROCESSING/i;

/**
 * A real retail branch of the bank in the city. Raw CITY tags can be wrong, so
 * prefer branches whose district and address both name the city.
 */
export function branch(bank: string, city: RegExp): Branch {
  const all = BRANCHES.filter((b) => b.bank === bank && !NOT_RETAIL.test(b.branch));
  const b =
    all.find((x) => city.test(x.district) && city.test(x.address)) ??
    all.find((x) => city.test(x.address)) ??
    all.find((x) => city.test(`${x.city} ${x.district}`));
  if (!b) throw new Error(`Reference snapshot has no ${bank} branch in ${city}`);
  return b;
}

export function pincode(pin: string): Pincode | undefined {
  return PINCODES.find((p) => p.pincode === pin);
}
