import { formatPaise, toPaise, type AmountType } from "./observations";

/**
 * Honest totals (PRD FL-29, LLD §10.3). Count one reviewed, dated amount per
 * holding — its latest balance or current value — and say why every other
 * holding is left out. No eligible amount means the total is unknown, not ₹0.
 * Currencies are never added together.
 */

const ZERO = BigInt(0);

export const TOTAL_LABEL = "Reviewed value from dated sources";

export interface TotalAsset {
  id: string;
  institution: string;
  evidenceStatus: string;
  discoveryStatus: string;
  duplicateState: string | null;
  /** Below G4 the amount is hidden, so it can't be counted for this person. */
  amountsVisible: boolean;
}

export interface TotalObservation {
  id: string;
  assetId: string;
  amount: string;
  currency: string;
  amountType: AmountType | string;
  asOfDate: string | null;
  reviewedAt: Date | string | null;
  supersededAt: Date | string | null;
}

export interface CountedAmount {
  assetId: string;
  observationId: string;
  amount: string;
  currency: string;
  amountType: string;
  asOfDate: string;
}

export interface ExcludedHolding {
  assetId: string;
  institution: string;
  reason: string;
}

export interface Totals {
  label: string;
  /** One entry per currency; empty means "unknown". */
  totals: { currency: string; amount: string }[];
  counted: CountedAmount[];
  excluded: ExcludedHolding[];
  oldestDate: string | null;
  newestDate: string | null;
}

const COUNTABLE = new Set(["cash_balance", "current_value"]);

const NOT_A_VALUE: Record<string, string> = {
  sum_assured: "Only the sum assured is known — that is what a policy pays, not a value you hold today",
  principal: "Only the amount deposited is known, not today's value",
  maturity_value: "Only the maturity value is known, not today's value",
  premium: "Only a premium payment is known",
  units: "Only the number of units is known, not their value",
  other: "The amount's meaning is unclear",
};

export function computeTotals(assets: TotalAsset[], observations: TotalObservation[]): Totals {
  const counted: CountedAmount[] = [];
  const excluded: ExcludedHolding[] = [];
  const byAsset = new Map<string, TotalObservation[]>();
  for (const o of observations) {
    if (o.supersededAt || !o.reviewedAt) continue; // history and unreviewed amounts never count
    byAsset.set(o.assetId, [...(byAsset.get(o.assetId) ?? []), o]);
  }

  for (const a of assets) {
    if (a.discoveryStatus === "dismissed" || a.duplicateState === "merged") continue;
    const skip = (reason: string) => excluded.push({ assetId: a.id, institution: a.institution, reason });
    if (a.evidenceStatus === "potential_match") {
      skip("Potential match — not confirmed yet");
      continue;
    }
    if (a.duplicateState === "candidate") {
      skip("May be a duplicate of another holding — review it first");
      continue;
    }
    if (!a.amountsVisible) {
      skip("Amount hidden until you have shown you're entitled to this holding");
      continue;
    }
    const obs = byAsset.get(a.id) ?? [];
    if (!obs.length) {
      skip("No reviewed amount yet");
      continue;
    }
    const values = obs.filter((o) => COUNTABLE.has(o.amountType));
    if (!values.length) {
      skip(NOT_A_VALUE[obs[0].amountType] ?? NOT_A_VALUE.other);
      continue;
    }
    const dated = values.filter((o): o is TotalObservation & { asOfDate: string } => !!o.asOfDate);
    if (!dated.length) {
      skip("The amount has no date, so we can't say when it was true");
      continue;
    }
    const latest = dated.sort((x, y) => y.asOfDate.localeCompare(x.asOfDate))[0];
    if (toPaise(latest.amount) < ZERO) {
      skip("The latest balance is negative (money owed), so it isn't added");
      continue;
    }
    counted.push({
      assetId: a.id,
      observationId: latest.id,
      amount: latest.amount,
      currency: latest.currency,
      amountType: latest.amountType,
      asOfDate: latest.asOfDate,
    });
  }

  const sums = new Map<string, bigint>();
  for (const c of counted) sums.set(c.currency, (sums.get(c.currency) ?? ZERO) + toPaise(c.amount));
  const dates = counted.map((c) => c.asOfDate).sort();
  return {
    label: TOTAL_LABEL,
    totals: [...sums.entries()].map(([currency, p]) => ({ currency, amount: formatPaise(p) })),
    counted,
    excluded,
    oldestDate: dates[0] ?? null,
    newestDate: dates.at(-1) ?? null,
  };
}
