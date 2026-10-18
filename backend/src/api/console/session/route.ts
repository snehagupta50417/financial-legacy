import { randomUUID } from "node:crypto";
import { INSTITUTIONS, type InstitutionKey } from "@server/data/verify/claims";
import { consoleEnabled, signIn } from "@server/domain/verify-console";
import { disabled, requireConsole, validConsoleId } from "@server/core/console-guard";
import { db } from "@server/db";

/** Passwordless demo sign-in: picks the reviewer identity and makes (or reuses) this browser's private demo desk. */
export async function POST(req: Request) {
  if (!consoleEnabled()) return disabled();
  const body = await req.json().catch(() => null);
  const institution = String(body?.institution ?? "lic");
  if (!(institution in INSTITUTIONS)) return Response.json({ error: "Choose an institution from the list." }, { status: 400 });
  const id = validConsoleId(body?.consoleId) ? body.consoleId : randomUUID();
  const console = await signIn(id, institution as InstitutionKey);
  return Response.json({ consoleId: console.id, institution: console.institution, institutionLabel: INSTITUTIONS[institution as InstitutionKey].label, reviewer: console.reviewer });
}

export async function GET(req: Request) {
  const ctx = await requireConsole(req);
  if (ctx.response) return ctx.response;
  const info = INSTITUTIONS[ctx.console.institution as InstitutionKey];
  return Response.json({ consoleId: ctx.console.id, institution: ctx.console.institution, institutionLabel: info?.label ?? ctx.console.institution, reviewer: ctx.console.reviewer });
}

/** Sign out and discard this demo desk. */
export async function DELETE(req: Request) {
  const ctx = await requireConsole(req);
  if (ctx.response) return ctx.response;
  await db.verifyConsole.delete({ where: { id: ctx.console.id } });
  return Response.json({ ok: true });
}
