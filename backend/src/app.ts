import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Response | Promise<Response>;

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? routeFiles(full) : name === "route.ts" ? [full] : [];
  });
}

/** `api/cases/[id]/keeper/route.ts` serves `/api/cases/:id/keeper`. */
function patternOf(root: string, file: string) {
  const parts = path.relative(root, path.dirname(file)).split(path.sep).filter(Boolean);
  return "/api" + (parts.length ? "/" + parts.map((p) => p.replace(/^\[(.+)\]$/, ":$1")).join("/") : "");
}

/**
 * The API. Each `src/api/**\/route.ts` exports standard `Request -> Response` handlers (GET, POST, ...),
 * so no web framework is needed inside them. This file only maps URLs to those handlers.
 */
export async function createApp() {
  const app = new Hono();
  const root = path.resolve(__dirname, "api");
  // Uploads are capped at MAX_UPLOAD_MB (default 8) in the document route; this is a coarse outer limit.
  app.use("/api/*", bodyLimit({ maxSize: 16 * 1024 * 1024, onError: () => Response.json({ error: "Request too large." }, { status: 413 }) }));
  for (const file of routeFiles(root).sort()) {
    const mod = (await import(pathToFileURL(file).href)) as Partial<Record<(typeof METHODS)[number], Handler>>;
    const pattern = patternOf(root, file);
    for (const method of METHODS) {
      const handler = mod[method];
      if (typeof handler === "function") app.on(method, pattern, (c) => handler(c.req.raw, { params: Promise.resolve(c.req.param() as Record<string, string>) }));
    }
  }
  app.notFound((c) => c.json({ error: "Not found" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "Something went wrong. Your data is unaffected." }, 500);
  });
  return app;
}
