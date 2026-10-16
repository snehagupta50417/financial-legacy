import { completeJson, type AiImage } from "@/server/ai";
import { matchNames } from "@/server/core/name-match";
import { SYNTHETIC_DEATH_REGISTRY } from "@/server/data/death-registry";
import type { ProofOutcome } from "./types";

/**
 * DeathProofProvider (G2).
 *  - digilocker: mock fetch from the synthetic registry, then compare with
 *    what the user told us (name, DOB, date of death).
 *  - scan: Gemini reads a photographed certificate; code compares the fields.
 * Mismatches → needs_review, never auto-reject.
 */
export interface DeathInput {
  method: "digilocker" | "scan";
  deceasedName: string;
  dob?: string | null;
  dateOfDeath?: string | null;
  image?: AiImage;
}

export interface CertificateFields {
  name: string | null;
  dob: string | null;
  dateOfDeath: string | null;
  registrationNo: string | null;
  issuingAuthority: string | null;
}

export async function verifyDeath(input: DeathInput): Promise<ProofOutcome & { record: CertificateFields | null }> {
  if (input.method === "scan") return verifyFromScan(input);

  const hit = SYNTHETIC_DEATH_REGISTRY.map((r) => ({ r, m: matchNames(input.deceasedName, r.name) })).find(
    (x) => x.m.outcome === "match"
  );
  if (!hit) {
    // Not in the synthetic registry: return a labelled simulated record from the user's input.
    const record: CertificateFields = {
      name: input.deceasedName,
      dob: input.dob ?? null,
      dateOfDeath: input.dateOfDeath ?? null,
      registrationNo: "SIMULATED",
      issuingAuthority: "Simulated DigiLocker (v0 mock)",
    };
    return {
      status: input.dateOfDeath ? "verified" : "needs_review",
      provider: "mock_digilocker",
      matchedFields: { name: { expected: input.deceasedName, found: record.name, match: true } },
      note: input.dateOfDeath
        ? "Simulated DigiLocker death-certificate fetch (v0 mock)."
        : "Date of death is needed to complete this step.",
      record,
    };
  }
  const r = hit.r;
  return compare(input, { name: r.name, dob: r.dob, dateOfDeath: r.dateOfDeath, registrationNo: r.registrationNo, issuingAuthority: r.issuingAuthority }, "mock_digilocker", "Fetched from the synthetic civil-registration record (v0 mock).");
}

async function verifyFromScan(input: DeathInput): Promise<ProofOutcome & { record: CertificateFields | null }> {
  if (!input.image) {
    return { status: "failed", provider: "gemini_scan", matchedFields: {}, note: "Upload a photo or scan of the certificate.", record: null };
  }
  const res = await completeJson<CertificateFields>(
    `You read Indian death certificates. Extract ONLY what is printed. Dates as YYYY-MM-DD. Use null when a field is missing or illegible. JSON: {"name": string|null, "dob": string|null, "dateOfDeath": string|null, "registrationNo": string|null, "issuingAuthority": string|null}`,
    "Extract the fields from this death certificate image.",
    (raw) => {
      const r = raw as Partial<CertificateFields>;
      if (!r || typeof r !== "object") return null;
      const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
      return { name: s(r.name), dob: s(r.dob), dateOfDeath: s(r.dateOfDeath), registrationNo: s(r.registrationNo), issuingAuthority: s(r.issuingAuthority) };
    },
    { images: [input.image] }
  );
  if (!res.ok) {
    return { status: "needs_review", provider: "gemini_scan", matchedFields: {}, note: `The certificate could not be read automatically (${res.error}). A reviewer will check it.`, record: null };
  }
  return compare(input, res.data, "gemini_scan", "Read from the uploaded certificate by Gemini; fields compared by code.");
}

function compare(input: DeathInput, rec: CertificateFields, provider: string, note: string) {
  const nameM = rec.name ? matchNames(input.deceasedName, rec.name) : { outcome: "review" as const };
  const fields: ProofOutcome["matchedFields"] = {
    name: { expected: input.deceasedName, found: rec.name, match: nameM.outcome === "match" ? true : "review" },
  };
  let ok = nameM.outcome === "match";
  if (input.dob) {
    const m = !!rec.dob && rec.dob === input.dob;
    fields.dob = { expected: input.dob, found: rec.dob, match: m };
    ok &&= m;
  }
  if (input.dateOfDeath) {
    const m = !!rec.dateOfDeath && rec.dateOfDeath === input.dateOfDeath;
    fields.dateOfDeath = { expected: input.dateOfDeath, found: rec.dateOfDeath, match: m };
    ok &&= m;
  }
  if (!rec.dateOfDeath) ok = false;
  return {
    status: ok ? ("verified" as const) : ("needs_review" as const),
    provider,
    matchedFields: fields,
    note: ok ? note : `${note} Some details did not match — sent to manual review.`,
    record: rec,
  };
}
