import { hasAiConsent } from "@/server/core/ai-consent";
import { NextRequest } from "next/server";
import { z } from "zod";
import { caseAccess, isDenied } from "@/server/core/access";
import { errorResponse, parseJson } from "@/server/core/http";
import { aiRateLimit } from "@/server/core/rate-limit";
import { IMAGE_MIME, readUpload } from "@/server/core/upload";
import { submitDeath, submitIdentity, submitRelationship, type GateResult } from "@/server/domain/gates";

export const dynamic = "force-dynamic";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");

const IdentityBody = z.object({
  method: z.enum(["digilocker", "passport_selfie"]),
  fullName: z.string().trim().min(2).max(120),
  dob: date.nullish(),
});

const DeathBody = z.object({
  method: z.literal("digilocker"),
  deceasedName: z.string().trim().min(2).max(120),
  dob: date.nullish(),
  dateOfDeath: date.nullish(),
  pan: z.string().trim().max(12).nullish(),
});

const RelationshipBody = z.object({
  method: z.enum(["own_document", "legal_heir_certificate", "relative_consent"]),
  relationship: z.string().trim().min(2).max(60),
  nameOnDocument: z.string().trim().max(120).nullish(),
  documentType: z.string().trim().max(60).nullish(),
  relativeName: z.string().trim().max(120).nullish(),
});

/** POST /api/cases/:id/proofs/{identity|death|relationship} → G1 / G2 / G3 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await params;
  const access = await caseAccess(req, id, "owner");
  if (isDenied(access)) return access;
  const { session, legacyCase } = access;

  let result: GateResult;
  if (kind === "identity") {
    const body = await parseJson(req, IdentityBody);
    if (body instanceof Response) return body;
    result = await submitIdentity(legacyCase, session.id, body);
  } else if (kind === "death") {
    const isMultipart = (req.headers.get("content-type") ?? "").includes("multipart/form-data");
    if (isMultipart) {
      if (!await hasAiConsent(session.id)) return errorResponse(403, "AI processing needs your permission in Settings.");
      // Scan path: certificate photo read by Gemini vision.
      const limited = aiRateLimit(session.id);
      if (limited) return limited;
      const form = await req.formData().catch(() => null);
      const file = form?.get("file");
      if (!(file instanceof File)) return errorResponse(400, "Certificate image required (field 'file')");
      const up = await readUpload(file, ["png", "jpeg", "webp"]);
      if (!up.ok) return errorResponse(up.status, up.error);
      const fields = DeathBody.omit({ method: true }).safeParse({
        deceasedName: form?.get("deceasedName"),
        dob: form?.get("dob") || null,
        dateOfDeath: form?.get("dateOfDeath") || null,
        pan: form?.get("pan") || null,
      });
      if (!fields.success) return errorResponse(400, `Invalid request — ${fields.error.issues[0]?.message}`);
      result = await submitDeath(legacyCase, session.id, {
        method: "scan",
        ...fields.data,
        image: { mimeType: IMAGE_MIME[up.kind]!, data: Buffer.from(up.bytes).toString("base64") },
      });
    } else {
      const body = await parseJson(req, DeathBody);
      if (body instanceof Response) return body;
      result = await submitDeath(legacyCase, session.id, body);
    }
  } else if (kind === "relationship") {
    const body = await parseJson(req, RelationshipBody);
    if (body instanceof Response) return body;
    result = await submitRelationship(legacyCase, session.id, body);
  } else {
    return errorResponse(404, "Unknown proof type");
  }

  if (!result.ok) return errorResponse(result.status, result.error);
  return Response.json({ proof: result.proof, gate: result.gate });
}
