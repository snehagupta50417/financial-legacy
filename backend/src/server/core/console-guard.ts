import { db } from "@server/db";
import { ConsoleError, consoleEnabled } from "@server/domain/verify-console";

const ID = /^[A-Za-z0-9_-]{8,64}$/;

export const validConsoleId = (id: unknown): id is string => typeof id === "string" && ID.test(id);

/** The demo console is off where real sign-in is required, and when CONSOLE_DEMO=0. */
export const disabled = () => Response.json({ error: "The claims console demo is not available here." }, { status: 404 });

/** Turn a ConsoleError into a response; anything else is a real fault and propagates. */
export function fail(err: unknown): Response {
  if (err instanceof ConsoleError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
  throw err;
}

/** The signed-in demo console for this request (x-console-id), or the response to send instead. */
export async function requireConsole(req: Request) {
  if (!consoleEnabled()) return { response: disabled() };
  const id = req.headers.get("x-console-id");
  if (!validConsoleId(id)) return { response: Response.json({ error: "Sign in to the demo first." }, { status: 401 }) };
  const console = await db.verifyConsole.findUnique({ where: { id } });
  if (!console) return { response: Response.json({ error: "Sign in to the demo first." }, { status: 401 }) };
  return { console };
}
