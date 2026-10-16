import type { z } from "zod";

/** Parse a JSON body against a Zod schema; returns data or a 400 {error}. */
export async function parseJson<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T> | Response> {
  const body = await req.json().catch(() => undefined);
  const r = schema.safeParse(body);
  if (!r.success) {
    const first = r.error.issues[0];
    const where = first?.path?.length ? `${first.path.join(".")}: ` : "";
    return Response.json({ error: `Invalid request — ${where}${first?.message ?? "bad input"}` }, { status: 400 });
  }
  return r.data;
}

export function errorResponse(status: number, error: string) {
  return Response.json({ error }, { status });
}
