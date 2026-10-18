import { claimAccess, isDenied } from "@server/core/access";
import { errorResponse } from "@server/core/http";
import { approvedPack, ClaimError } from "@server/domain/claim-service";
import { renderClaimPack } from "@server/pdf/claim-pack";

/** GET /api/claims/:id/pack — the approved pack as a PDF, for the family to submit themselves. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await claimAccess(req, id);
  if (isDenied(access)) return access;
  try {
    const { view, content } = await approvedPack(id);
    const bytes = await renderClaimPack(content, {
      version: view.pack!.version,
      contentHash: view.pack!.contentHash,
      approvedAt: new Date().toISOString().slice(0, 10),
      demo: access.legacyCase.isDemo,
    });
    const name = `claim-pack-${view.institution.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}-v${view.pack!.version}.pdf`;
    return new Response(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${name}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof ClaimError) return errorResponse(e.status, e.message);
    throw e;
  }
}
