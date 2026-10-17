# Decisions

Implementation decisions taken while following `BACKEND_PLAN.md` (v2), newest last.

> **Note (17 Oct 2026):** the tests described under M1–M3 (Vitest route tests with a temporary SQLite DB, `test/live-ai.test.ts`, the Playwright run) were **not committed** — `frontend/test/` does not exist in the repository. Treat those results as unverified until the tests are committed (LLD §19, build step B1).

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
- **Schema:** all §5 models were added in one migration: `DeceasedPerson`, `Claimant`, `Proof`, `Signal`, `Institution`, `ClaimPack`, `Draft`, `QaMessage`, `ResourceVisit`, `InstitutionClaim`, `CheckResult`. Later milestones add no further schema churn. *(Superseded 17 Oct 2026: LLD §5.2 adds `Observation`, `FieldReview`, `Approval`, `Claim`, `Hold`, `LegacySnapshot`, `TrustedContact`, `User` and `AssetRecord.evidenceStatus` for the PRD MVP.)* Enums are documented in the schema and enforced by Zod at the API.
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
  - Unfreezing needs a reviewer action. That's not built yet and is planned with the M5 console. *(Updated 17 Oct 2026: unfreezing is an MVP operator action — LLD build step B9 — not part of the Later Verify console.)*
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

## M3 — Gate UI

- **`components/fl/gate-panel.tsx`:** a stepper with Identity (DigiLocker, or passport + selfie for NRIs) → Death (DigiLocker fetch, or certificate scan) → Relationship (own document or legal-heir certificate; relative consent for caregivers).
  - Each step shows its latest proof. A review shows a "You entered / Record says" table.
  - Every mock is labelled "Simulated".
- **Workspace:** the gate panel sits above the tabs until discovery is unlocked. The Assets and Documents tabs show a locked state; a frozen case shows a "paused for review" card.
- **Asset cards:** masked assets show "Masked — full details after you prove you may claim this asset" and a **Prove entitlement** dialog (G4).
- **Intake:** the side panel shows the next gate as soon as the case opens.
- **Verified in a browser (Playwright, live Gemini):** intake → G1 → wrong date of death (manual review with a field table) → corrected → relationship via "R. K. Sharma" → discovery unlocked.

## Documentation alignment — 17 Oct 2026

Decisions taken while rewriting the document set (ONE_PAGER → PRD v0.6.2 → BRD v0.3.1 / LLD v0.5.1 → DESIGN v0.3.1):

- **Source of truth:** `ONE_PAGER.md`. The PRD defines product behaviour; the LLD defines how it is built and now describes this Next.js codebase. The old Python/FastAPI LLD and `contracts/` are superseded.
- **Audience:** everyone with Indian financial assets. **Pilot:** bereaved families (PRD D-01). HNI/UHNI/NRI families are a later segment.
- **MVP assets:** bank accounts and FDs, mutual funds, and life insurance. IEPF, shares, EPF, NPS, PPF and lockers are Later.
- **MVP discovery:** uploaded documents plus guided official searches (UDGAM, MITRA/MFCentral, insurer searches, the government common portal). Email, tax-record and SMS connectors are Later; mock connectors only in demos, labelled "Simulated".
- **Verify console:** Later (PRD FL-56); demo-only for the hackathon.
- **G3:** accepts any evidenced claimant role (relative, nominee, legal heir, executor, surviving joint holder) or a living person's consent.
- **Evidence statuses:** four statuses (`SELF_DECLARED`, `POTENTIAL_MATCH`, `DOCUMENT_BACKED`, `INSTITUTION_VERIFIED`) replace the current two fields (LLD §10.1).
- **Full identifiers:** stored as separately encrypted fields, readable only through the G4 guard (LLD §7.3) — to build.
- **Will drafting:** the Estate Planning tab's AI will draft becomes "Notes for your lawyer"; the product does not draft binding wills (PRD §3.3).
- **Claim submission:** the user approves the exact pack and submits it; the product records the receipt. `claim-packs/:id/submit` is replaced by `/approve` plus a receipt.
- **Running without a key:** add `AI_PROVIDER=fixture` so the reference build runs locally without cloud credentials (LLD §17.3).
- **Theme:** the app's current navy/teal theme is the standard (DESIGN §3.1); three contrast fixes are required (teal text on accent, gold as text, input borders).
- **Pre-Pilot documents** added in `docs/`: threat model, privacy (DPDP) assessment, AI evaluation plan, source-by-source validation matrix.
- **Claim rules verified (17 Oct 2026):** bank claims follow RBI Directions 2025 (₹15 lakh / ₹5 lakh simplified thresholds, 15 days, Bank Rate + 4%); mutual fund transmission follows SEBI's 23 Jul 2026 circular (quick ≤ ₹10,000, simplified ≤ ₹10 lakh, 21 days). Mutual funds gain a `quick` claim path (LLD §11.1).

## Platform decisions — 17 Oct 2026

- **Git history:** `frontend/db/custom.db` purged from all history with `git filter-branch`; `main` force-pushed (118 commits kept, current files identical); merged branches deleted. Copies may remain in the fork, in `tash149/financial-legacy`, and in GitHub's stored pull-request refs (GitHub Support must clear those).
- **Voice (D-09):** Google Cloud Speech-to-Text (Chirp) and Text-to-Speech. Launch languages: English (India), Hindi, Hinglish, Tamil. No raw audio retained.
- **Sign-in:** Google Identity Platform — phone OTP as the main method, Google sign-in as an option. `next-auth` not needed.
- **Google Cloud:** existing project for development; a separate production project before the Pilot; region `asia-south1`. Setup in `docs/CLOUD_SETUP.md`.
- **Process:** every PR follows `CONTRIBUTING.md` (tests pass, FL IDs named, docs updated). The MVP build steps are issues #10–#20.

## Non-code files aligned — 17 Oct 2026

- `contracts/` deleted (superseded Python/FastAPI design; still in git history). References removed from PRD, LLD and README.
- Old prototype screenshots (`frontend/scripts/verify-*.png`), `frontend/worklog.md` and `frontend/download/README.md` deleted as sandbox leftovers.
- `BACKEND_PLAN.md` rewritten as v3 to match the one-pager, PRD and LLD: bereaved-family story first, upload + guided search before connectors, Verify and mock connectors labelled as demo-only Later capabilities, approve + receipt instead of "submit", MVP claim-pack templates (bank, mutual fund, LIC) with cited thresholds, bug and milestone status updated.
- `frontend/AGENTS.md` gains project rules for coding agents (outside the auto-generated Next.js block).
- `demo/README.md` rewritten: maps the demo's seven journeys to the PRD's three and lists what differs.

## Repo trimmed to what the product needs — 17 Oct 2026

- Removed `demo/` (standalone hackathon demo, not the product) and `BACKEND_PLAN.md` (hackathon plan; its milestones are summarised in LLD §21). Both remain in git history; to restore the demo locally: `git checkout 7672340 -- demo`.
- Everything else was reviewed and is needed: the documents, `docs/`, `frontend/` app and configuration, the banner and the PR template.
