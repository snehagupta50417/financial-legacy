/**
 * Turning reviewed document fields into dated amounts (PRD FL-09, FL-28; LLD §10).
 * Only accepted or corrected fields count. Amounts are decimal strings, never floats.
 */

// BigInt constants (the TypeScript target predates bigint literals).
const ZERO = BigInt(0);
const TWO = BigInt(2);
const HUNDRED = BigInt(100);

export type AmountType =
  | "cash_balance"
  | "current_value"
  | "sum_assured"
  | "principal"
  | "maturity_value"
  | "premium"
  | "units"
  | "other";

/** What an amount means, in words, for the holding card. */
export const AMOUNT_TYPE_LABEL: Record<AmountType, string> = {
  cash_balance: "Balance",
  current_value: "Value",
  sum_assured: "Sum assured (not a current value)",
  principal: "Principal (not the current value)",
  maturity_value: "Maturity value (not the current value)",
  premium: "Premium",
  units: "Units (not a value)",
  other: "Amount",
};

const TYPES: [AmountType, RegExp][] = [
  ["units", /\bunits?\b/i],
  ["sum_assured", /sum\s*assured|cover\b|death\s*benefit/i],
  ["maturity_value", /maturity/i],
  ["principal", /principal|deposit\s*amount|fixed\s*deposit|\bfd\b/i],
  ["premium", /premium/i],
  ["cash_balance", /balance/i],
  ["current_value", /value|valuation|worth|market|nav\s*amount/i],
];

/** Classify an amount by its label. Null when the label isn't about money at all. */
export function amountTypeOf(label: string, value: string): AmountType | null {
  for (const [t, re] of TYPES) if (re.test(label)) return t;
  return /₹|\bRs\.?|\bINR\b/i.test(value) || /amount/i.test(label) ? "other" : null;
}

/**
 * "₹1,25,728.00", "Rs. 2.45 lakh", "INR 5,00,000", "-₹200" → { amount: "125728.00", currency: "INR" }.
 * Returns null when the value isn't a single clear amount.
 */
export function parseAmount(value: string, opts: { allowBare?: boolean } = {}): { amount: string; currency: string } | null {
  const v = value.replace(/\s+/g, " ").trim();
  const hasRupee = /₹|\bRs\.?|\bINR\b/i.test(v);
  if (!hasRupee && !opts.allowBare) return null;
  // Two rupee amounts in one value ("₹5,00,000 cover, premium ₹24,550") is not one clear amount.
  if ((v.match(/(?:₹|\bRs\.?|\bINR)\s*-?\s*\d/gi) ?? []).length > 1) return null;
  const m = hasRupee
    ? v.match(/(-)?\s*(?:₹|\bRs\.?|\bINR)\s*(-)?\s*([\d,]+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?)?(\s*Dr\b)?/i)
    : v.match(/^(-)?()\s*([\d,]+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?)?()$/i);
  if (!m) return null;
  // On statements "Cr" / "Dr" mean credit / debit, not crore: only spelled-out lakh or crore scale a number.
  const neg = !!(m[1] || m[2] || m[5]);
  const digits = m[3].replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(digits)) return null;
  const unit = (m[4] ?? "").toLowerCase();
  const scale = /^l/.test(unit) ? 100000 : /^c/.test(unit) ? 10000000 : 1;
  // Work in paise with BigInt so nothing is rounded through a float.
  const [whole, frac = ""] = digits.split(".");
  let paise = BigInt(whole) * HUNDRED + BigInt((frac + "00").slice(0, 2));
  if (scale !== 1) {
    // "2.45 lakh": scale the exact decimal, then round to paise.
    const exact = BigInt(whole + frac) * BigInt(scale) * HUNDRED;
    const div = BigInt(10 ** frac.length);
    paise = (exact + div / TWO) / div;
  }
  return { amount: formatPaise(neg ? -paise : paise), currency: "INR" };
}

export function formatPaise(p: bigint): string {
  const neg = p < ZERO;
  const a = neg ? -p : p;
  return `${neg ? "-" : ""}${a / HUNDRED}.${String(a % HUNDRED).padStart(2, "0")}`;
}

export function toPaise(amount: string): bigint {
  const neg = amount.startsWith("-");
  const [w, f = ""] = amount.replace("-", "").split(".");
  const p = BigInt(w || "0") * HUNDRED + BigInt((f + "00").slice(0, 2));
  return neg ? -p : p;
}

/** Indian grouping for display: "125728.00" → "₹1,25,728.00". */
export function formatInr(amount: string): string {
  const neg = amount.startsWith("-");
  const [w, f = "00"] = amount.replace("-", "").split(".");
  const last3 = w.slice(-3);
  const rest = w.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}₹${rest ? `${rest},${last3}` : last3}.${f.padEnd(2, "0").slice(0, 2)}`;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Dates as people write them in India (day first) → YYYY-MM-DD. */
export function parseDate(value: string): string | null {
  const t = value.trim();
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // A period "01/01/2016 to 31/03/2016" → its end date.
  const all = [...t.matchAll(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/g)];
  if (all.length) {
    const [, d, mo, y] = all[all.length - 1];
    if (+mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31) return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return null;
  }
  const words = [...t.matchAll(/(\d{1,2})?\s*[\s\-]?([A-Za-z]{3,9})[\s\-,]+(\d{4})/g)];
  if (words.length) {
    const [, d, mon, y] = words[words.length - 1];
    const mo = MONTHS.indexOf(mon.slice(0, 3).toLowerCase());
    if (mo < 0) return null;
    // "Dec 2019" has no day: use the month's last day only if stated; otherwise the 1st is a guess — refuse.
    if (!d) return null;
    return `${y}-${String(mo + 1).padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

const AS_OF = /statement\s*date|as\s*(?:on|of|at)|valuation\s*date|period|closing\s*date|nav\s*date|date\s*of\s*statement/i;

export interface FieldForAmounts {
  id: string;
  label: string;
  value: string;
  sourceExcerpt: string;
  state: string;
}

export interface ProposedObservation {
  sourceFieldId: string;
  label: string;
  amount: string;
  currency: string;
  amountType: AmountType;
  asOfDate: string | null;
}

/**
 * Dated amounts from a reviewed document. A field's own text may carry its date
 * ("₹1,25,728.00 on 31 Mar 2016"); otherwise the document's reviewed statement
 * date applies. Unreviewed and rejected fields are ignored.
 */
export function observationsFromFields(fields: FieldForAmounts[]): ProposedObservation[] {
  const usable = fields.filter((f) => f.state === "accepted" || f.state === "corrected");
  const docDate = usable.filter((f) => AS_OF.test(f.label)).map((f) => parseDate(f.value)).find(Boolean) ?? null;
  const out: ProposedObservation[] = [];
  for (const f of usable) {
    const type = amountTypeOf(f.label, f.value);
    if (!type) continue;
    const parsed = parseAmount(f.value, { allowBare: type === "units" });
    if (!parsed) continue;
    const ownDate = parseDate(f.value.replace(/(?:₹|\bRs\.?|\bINR)?\s?[\d,]+(\.\d+)?\s*(lakhs?|crores?|Cr\b|Dr\b)?/i, " "));
    out.push({
      sourceFieldId: f.id,
      label: f.label,
      amount: parsed.amount,
      currency: parsed.currency,
      amountType: type,
      asOfDate: ownDate ?? docDate,
    });
  }
  return out;
}

/**
 * Which holding an amount belongs to when one document backs several (e.g. a
 * statement listing two funds). Match on the institution's first word or the
 * last 4 digits in the field; when it's unclear, attach to none rather than guess.
 */
export function holdingForAmount(
  field: { label: string; sourceExcerpt: string },
  holdings: { id: string; institution: string; last4: string | null }[],
  /** Sibling fields: "Folio 1" explains which holding "Folio 1 value" belongs to. */
  siblings: { label: string; value: string; sourceExcerpt: string }[] = []
): string | null {
  if (holdings.length === 1) return holdings[0].id;
  const own = field.label.toLowerCase();
  const related = siblings.filter((s) => s.label.toLowerCase() !== own && own.startsWith(s.label.toLowerCase()));
  const hay = [field.label, field.sourceExcerpt, ...related.flatMap((s) => [s.value, s.sourceExcerpt])].join(" ").toLowerCase();
  const hits = holdings.filter((h) => {
    const word = h.institution.toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, "");
    return (word.length >= 3 && new RegExp(`\\b${word}\\b`).test(hay)) || (!!h.last4 && new RegExp(`${h.last4}\\b`).test(hay));
  });
  return hits.length === 1 ? hits[0].id : null;
}
