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
