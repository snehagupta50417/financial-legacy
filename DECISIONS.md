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
- **Bug 4 fixed:** the system prompt goes in `config.systemInstruction`. JSON calls also set `responseMimeType: application/json`.
- **Vision-ready:** `completeJson(..., { images })` sends inline images on the last user turn (used in M4).
- **Timeout:** `AI_TIMEOUT_MS`, default 45s, through `AbortSignal`.
- **Rate limit:** in-memory fixed window per session (`RATE_LIMIT_AI_PER_MINUTE`, default 20). It covers intake, documents, ask, draft and checklist, and returns 429 `{error}`. It's per instance, which is acceptable for v0.
- **Tests:** vitest with a throwaway SQLite DB (`test/.tmp`); route handlers are called directly.
- **Fallback classifier bug fixed (found by the tests):** `\breject\b` never matched "rejected", so the built-in example "My insurance claim was rejected" was misclassified. Word stems now allow suffixes.
- **Model:** `GEMINI_MODEL` (default `gemini-flash-latest`) plus `GEMINI_FALLBACK_MODELS` (default `gemini-3.5-flash,gemini-flash-lite-latest`). On 16 Oct the `*-latest` aliases often returned 503 "high demand" and `gemini-2.5-flash` returned 404 (retired); `gemini-3.5-flash` answered in about 1s.
- **Retry policy:** transient errors (429/5xx/UNAVAILABLE) get one retry after 800 ms, then the next model; 404 skips straight to the next model; anything else fails fast. All of it stays inside the 45s timeout.
- **Verified live:** `test/live-ai.test.ts` (runs only with `LIVE_AI=1`) passed against the Gemini API for both text and JSON. Normal test runs never call a model.

## M2 — Schema and trust gates

- **Layout:** server-only code moved to `src/server/` (plan §12). `src/lib/` keeps only client-shared code (`types.ts`, `client.ts`, `utils.ts`).
- **Schema:** all §5 models were added in one migration: `DeceasedPerson`, `Claimant`, `Proof`, `Signal`, `Institution`, `ClaimPack`, `Draft`, `QaMessage`, `ResourceVisit`, `InstitutionClaim`, `CheckResult`. Later milestones add no further schema churn. Enums are documented in the schema and enforced by Zod at the API.
- **Journey kinds:** `living_individual` and `estate_planning` are **personal**; they need only G1, and the user's own assets are shown in full. `caregiver` needs G1 and then G3, where G3 is the relative's recorded consent (`method: relative_consent`, which also writes a `ConsentRecord`). Everything else, including unclassified `general`, takes the strict G1 → G2 → G3 path.
- **Guard:** `src/server/core/access.ts` (`caseAccess` / `assetAccess` / `documentAccess` with `owner | discovery`).
  - Foreign IDs return 404.
  - Locked gates return **403** `{error, nextGate}`.
  - Frozen cases return **423** `{error, frozen: true}`.
- **What "no asset data below G3" means:**
  - The workspace returns `assets: []` and `documents: []`.
  - Asset and document write routes return 403.
  - AI prompts (ask, draft, checklist) only see the masked, visible view.
  - Intake no longer creates asset clues before discovery; institutions mentioned in chat are appended to `assumptions` ("to be checked once discovery is unlocked").
- **Masking below G4:** the API keeps institution, category, value band, last-4, statuses and confidence. `maskedRef` becomes `••••1234` and `holderName` is hidden. `evidence` has identifiers and exact amounts redacted. `notes` (the user's own text) is kept.
- **Read, extract, forget:**
  - Document `rawText`, extracted field values/excerpts and clue references are passed through `redactIdentifiers` **before storage**.
  - What gets redacted: digit runs of 6+, grouped numbers of 8+ digits, Aadhaar, and PAN.
  - What is kept: dates.
- **PAN:** stored only as an HMAC (`PAN_HASH_SECRET`, required in production).
- **One case per deceased:**
  - The same person means the same PAN hash, or the same DOB plus a name match.
  - A different session's case for the same person freezes **both** cases and links them (`linkedCaseId`). The same session re-submitting does not freeze.
  - **Demo cases are excluded** from cross-session matching; otherwise every visitor replaying the demo persona would freeze everyone else. The impostor story is shown in the Verify console instead (§8).
  - Unfreezing needs a reviewer action. That's not built yet and is planned with the M5 console.
- **Mock providers:**
  - Identity: DigiLocker and passport + selfie, both simulated.
  - Death: the mock DigiLocker looks up a synthetic civil registry in `server/data/death-registry.ts`. Names not in that registry get a clearly-labelled simulated record built from the user's input. Scanned certificates are read by Gemini vision and compared by code.
  - Relationship: the heir's own document naming the deceased, checked with the name matcher. A legal-heir certificate or relative consent is simulated.
  - Entitlement: a simulated nominee or joint-holder record.
  - Every proof row stores its `provider` and a note saying it was simulated.
- **Name matching:** honorifics are dropped; initials, phonetic folding (sh/s, ee/i, w/v, doubled letters, trailing "a") and abbreviations (Mohd) are handled. A non-match always goes to `needs_review` and is never rejected.
- **Living-person guard:** `livingPersonActivity()` is implemented and tested (person-initiated events only). It gets wired to connector signals in M4.
- **Demos A/B/C** are seeded with their gates passed, using `demo_seed` proofs and a claimant, so they stay fully explorable.
- **Bugs fixed here instead of in their scheduled milestone:**
  - Bug 1 (history leak): history is now per case, and the reply uses the 6 *most recent* turns.
  - Bug 3: document PATCH responses now return parsed `extractedFields`.
  - Bug 5 (demo crash when all tasks are done).
  - Half of bug 7: magic-byte upload validation (`server/core/upload.ts`).
- **Images (Q9):** document uploads accept PNG, JPEG and WebP and are extracted by Gemini vision. Content type comes from sniffing the bytes, not from the client's MIME type.
