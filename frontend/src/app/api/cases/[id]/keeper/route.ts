import { NextRequest } from "next/server";
import { caseAccess, isDenied } from "@/server/core/access";
import { parseJson } from "@/server/core/http";
import { KeeperUiBody, loadKeeperUi, saveKeeperUi } from "@/server/domain/keeper-ui";

export const dynamic = "force-dynamic";

/** GET /api/cases/:id/keeper — the saved conversation and draft state (identifiers already redacted). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await caseAccess(req, id, "owner");
  if (isDenied(access)) return access;
  return Response.json({ ui: await loadKeeperUi(id) });
}

/**
 * PUT /api/cases/:id/keeper — only presentation and draft state is writable here. Assets, proofs and
 * approvals use their gated APIs. Identifiers are redacted and verification statuses stripped before saving.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await caseAccess(req, id, "owner");
  if (isDenied(access)) return access;
  const body = await parseJson(req, KeeperUiBody);
  if (body instanceof Response) return body;
  await saveKeeperUi(id, body);
  return Response.json({ saved: true });
}
