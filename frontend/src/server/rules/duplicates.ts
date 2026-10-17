/**
 * Duplicate detection (PRD FL-08, LLD §10.2). Same institution + same asset
 * type + same last 4 digits makes a *candidate* for a person to review. Names
 * alone never match, and nothing is merged automatically.
 */

const ALIASES: [RegExp, string][] = [
  [/^(lic|life insurance corporation)( of india)?$/, "lic"],
  [/^(sbi|state bank of india)$/, "sbi"],
  [/^(pnb|punjab national bank)$/, "pnb"],
  [/^(bob|bank of baroda)$/, "bank of baroda"],
];

export function normaliseInstitution(name: string): string {
  const n = name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(ltd|limited|co|company|corp|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [re, canon] of ALIASES) if (re.test(n)) return canon;
  return n;
}

/** Types that describe the same kind of holding from different sources (a savings account is a deposit). */
function categoryFamily(category: string): string {
  return category === "bank_account" || category === "bank_deposit" ? "bank" : category;
}

export interface DuplicateCandidate {
  id: string;
  institution: string;
  category: string;
  last4: string | null;
  discoveryStatus: string;
  duplicateState: string | null;
}

/** The existing holding a new one may duplicate, or null. Needs a last-4 to match on. */
export function findDuplicate(
  incoming: { institution: string; category: string; last4: string | null },
  existing: DuplicateCandidate[]
): DuplicateCandidate | null {
  if (!incoming.last4) return null;
  const key = normaliseInstitution(incoming.institution);
  return (
    existing.find(
      (e) =>
        e.discoveryStatus !== "dismissed" &&
        e.duplicateState !== "merged" &&
        categoryFamily(e.category) === categoryFamily(incoming.category) &&
        e.last4 === incoming.last4 &&
        normaliseInstitution(e.institution) === key
    ) ?? null
  );
}
