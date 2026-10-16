# Decisions

Implementation decisions taken while following `BACKEND_PLAN.md` (v2), newest last.

## M0 — Security cleanup

- **Plan v2 replaces the Phase 1 plan** at `BACKEND_PLAN.md` (same path, so there's one source of truth).
- **Repo visibility:** `tash149/financial-legacy` is **private** (checked 16 Oct 2026).
- **npm, not bun:** `package-lock.json` added; scripts rewritten so Cloud Run buildpacks can run `npm run build` / `npm start`:
  - `build` = `prisma generate && next build`
  - `start` = `prisma db push --skip-generate && next start` (creates the SQLite schema on a fresh instance; `next start` reads `$PORT`)
  - `postinstall` = `prisma generate`
- **`output: "standalone"` removed** from `next.config.ts`. It was only for the sandbox's Caddy + `bun server.js` runtime and conflicts with `next start`.
- **`typescript.ignoreBuildErrors` removed.** `tsc --noEmit` passes. The only errors were in `examples/websocket` (unused sandbox template importing socket.io), now excluded in `tsconfig.json` pending deletion.
- **`*.db` git-ignored**; `.env.example` added and un-ignored.
- **`/api/health`** added (unauthenticated, `{ status: "ok" }`).
- **Known lint errors (not fixed):** 2 `react-hooks/set-state-in-effect` errors in stock shadcn files (`components/ui/carousel.tsx`, `hooks/use-mobile.ts`). The build does not run lint, so they don't block it.
- **`custom.db` is untracked and the sandbox leftovers are removed** (`Caddyfile`, `.zscripts/`, `examples/`, `tests/*-runtime-*.sh`, `tool-results/`, `mini-services/`, `upload/`, `bun.lock`).
- **History purge is not done by the agent.** Rewriting `main` and force-pushing is outside the agent's branch permissions. The owner runs `git filter-repo --path frontend/db/custom.db --invert-paths` on a mirror clone (see the hand-off note).

## M1 — Gemini swap

- **`z-ai-web-dev-sdk` removed; `@google/genai` added.** New layer in `src/server/ai/`: `provider.ts` (interface), `gemini.ts`, `fixture.ts` and `index.ts`. `index.ts` keeps the old `complete` / `completeJson` / `completeWithHistory` API so the routes barely changed.
- **Auth order:** `GEMINI_API_KEY` first, else Vertex AI via `GOOGLE_CLOUD_PROJECT` (ADC on Cloud Run), else "not configured". "Not configured" returns `ok:false`, so the existing graceful degradation applies.
- **Model:** `GEMINI_MODEL`, default `gemini-flash-latest` (the alias used in the SDK docs), so the model can change without a deploy.
- **Bug 4 fixed:** the system prompt goes in `config.systemInstruction`. JSON calls also set `responseMimeType: application/json`.
- **Vision-ready:** `completeJson(..., { images })` sends inline images on the last user turn (used in M4).
- **Timeout:** `AI_TIMEOUT_MS`, default 45s, through `AbortSignal`.
- **Rate limit:** in-memory fixed window per session (`RATE_LIMIT_AI_PER_MINUTE`, default 20). It covers intake, documents, ask, draft and checklist, and returns 429 `{error}`. It's per instance, which is acceptable for v0.
- **Tests:** vitest with a throwaway SQLite DB (`test/.tmp`); route handlers are called directly.
- **Fallback classifier bug fixed (found by the tests):** `\breject\b` never matched "rejected", so the built-in example "My insurance claim was rejected" was misclassified. Word stems now allow suffixes.
- **Not verified live:** no Gemini key was available in the build environment. Only the fixture and degraded paths are tested.
