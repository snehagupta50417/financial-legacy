import { createHash } from "node:crypto";
import type { ClaimPath, Procedure } from "@/server/procedures/procedures";

/**
 * Claim pack contents (PRD FL-13, FL-14; LLD §11.3) as pure functions. The pack
 * is rebuilt from reviewed case data every time; its hash changes whenever any
 * of that data changes, which is what invalidates an approval (FL-26).
 */

export type ItemState = "missing" | "have" | "linked";

export interface ChecklistEntry {
  state: ItemState;
  documentId?: string;
}

export interface PrefillField {
  label: string;
  value: string;
  /** Where the value comes from, shown next to it. */
  source: string;
}

export interface PackContent {
  procedure: { id: string; version: string; title: string; authority: string; sourceUrl: string; checkedOn: string };
  path: ClaimPath;
  pathLabel: string;
  explanation: string;
  institution: string;
  recipient: string;
  whereToSubmit: string;
  timeline: string;
  items: { id: string; label: string; required: boolean; note?: string; state: ItemState; documentId?: string; documentName?: string }[];
  prefill: PrefillField[];
  declarations: { id: string; text: string; accepted: boolean }[];
  /** What the family fills in themselves: we never hold full account numbers. */
  notes: string[];
}

export function baseDeclarations(institution: string) {
  return [
    { id: "true", text: "The information in this pack is true to the best of my knowledge." },
    {
      id: "self-submit",
      text: `I will submit this pack to ${institution} myself. Financial Legacy does not submit claims for me.`,
    },
    { id: "no-guarantee", text: `I understand ${institution} decides the claim; this pack does not guarantee payment.` },
  ];
}

export function buildPack(input: {
  procedure: Procedure;
  path: ClaimPath;
  institution: string;
  checklist: Record<string, ChecklistEntry>;
  documentNames: Record<string, string>;
  prefill: PrefillField[];
  accepted: string[];
}): PackContent {
  const { procedure: p, path } = input;
  const pp = p.paths[path];
  if (!pp) throw new Error(`Procedure ${p.id} has no ${path} path`);
  const declarations = [...baseDeclarations(input.institution), ...(pp.extraDeclarations ?? [])].map((d) => ({
    ...d,
    accepted: input.accepted.includes(d.id),
  }));
  return {
    procedure: { id: p.id, version: p.version, title: p.title, authority: p.authority, sourceUrl: p.sourceUrl, checkedOn: p.checkedOn },
    path,
    pathLabel: pp.label,
    explanation: pp.explanation,
    institution: input.institution,
    recipient: input.institution,
    whereToSubmit: p.whereToSubmit,
    timeline: `${input.institution} should settle within ${p.timeline.days} days of ${p.timeline.from}; if late, ${p.timeline.ifLate}.${p.timeline.note ? ` ${p.timeline.note}` : ""}`,
    items: pp.items.map((it) => {
      const e = input.checklist[it.id];
      const state: ItemState = e?.state ?? "missing";
      return {
        ...it,
        state,
        ...(e?.documentId && input.documentNames[e.documentId] ? { documentId: e.documentId, documentName: input.documentNames[e.documentId] } : {}),
      };
    }),
    prefill: input.prefill,
    declarations,
    notes: [
      "Account, policy and folio numbers are shown with the last 4 digits only. Write the full number on the institution's form yourself.",
      "Forms named here are the institution's own. Use their current version; this pack is a checklist and summary, not an official form.",
    ],
  };
}

/** What still stops the pack being ready (FL-13). Empty = ready. */
export function packGaps(c: PackContent): string[] {
  const gaps = c.items.filter((i) => i.required && i.state === "missing").map((i) => `Missing: ${i.label}`);
  const unsigned = c.declarations.filter((d) => !d.accepted).length;
  if (unsigned) gaps.push(`${unsigned} declaration${unsigned === 1 ? "" : "s"} still to confirm`);
  return gaps;
}

/** Canonical JSON (sorted keys) so the same content always gives the same hash. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

export function packHash(c: PackContent): string {
  return createHash("sha256").update(canonical(c)).digest("hex");
}
