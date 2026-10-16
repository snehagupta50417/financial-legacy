# Backend Plan — FinLegacy AI (`frontend/`)

> Phase 1 deliverable (read-only analysis). No backend code has been written.
> Scope: the `frontend/` folder of `tash149/financial-legacy`, plus the root docs where they conflict with it.

---

## 0. The key finding: a backend already exists inside `frontend/`

`frontend/` is not frontend-only. It's a Next.js 16 full-stack app that already has:

- **15 route handlers** under `frontend/src/app/api/**/route.ts` (intake, cases, documents, assets, tasks, AI drafts/Q&A/checklist, demo seeding, consent, resources).
- **Prisma + SQLite** (`frontend/prisma/schema.prisma`, DB file `frontend/db/custom.db`, **committed to git with test data**).
- **An AI layer** (`frontend/src/lib/ai.ts`) built on `z-ai-web-dev-sdk`, a sandbox-vendor SDK whose credentials come from a git-ignored `.z-ai-config`.
- **Domain logic** in `src/lib/journey-engine.ts` (task plans for 7 personas, next-best-action computation) and `src/lib/case-service.ts`.

The frontend calls same-origin `/api/*` URLs only. Nothing is mocked on the client. Every screen reads from and writes to these routes.

The repo root also has a **different, much larger target design**: `LLD.md`, `contracts/openapi.json` (v0.3, about 85 paths under `http://localhost:8000/v1`), and `contracts/schema.sql` (PostgreSQL 18 with RLS, Keycloak OIDC, FastAPI, a worker and ClamAV). **The current frontend calls none of those endpoints.** Section 8 starts with this, because it decides what "build the backend" means.

This plan's default: build a standalone backend that serves the **exact `/api/*` contract the frontend already uses**, so the frontend barely changes. Then harden it (real auth, Postgres, file storage) step by step. LLD alignment is an optional later track.

---

## 1. App overview

**What it does:** FinLegacy AI helps Indian families find forgotten financial assets (bank deposits, insurance, mutual funds, shares), handle claims after a death, resolve rejected claims, and plan wills. An AI intake agent classifies the user's situation and opens a "case". A rule-based journey engine generates a dependency-aware task plan with links to official portals (RBI UDGAM, IRDAI Bima Bharosa, SEBI MITRA, IEPF, Income Tax AIS). Uploaded documents are text-extracted and AI-analysed into evidence-linked "asset clues" that the user confirms or dismisses. AI drafts wills, follow-up letters and expert briefing packs. Nothing is ever submitted to an institution.

**Frontend stack:** Next.js 16 (App Router, `output: "standalone"`), React 19, TypeScript (`ignoreBuildErrors: true`), Tailwind 4, shadcn/ui (Radix), lucide icons, `react-markdown`, toasts via `use-toast`. The app is a **single route `/`** with client-side view state (`landing | intake | workspace | resources`) in `src/app/page.tsx`. There's no router-based navigation and no deep links. Installed but **unused**: next-auth, zustand, react-query, react-hook-form, next-intl, `examples/websocket`.

**Main user flows:**

| # | Flow | Screens | API calls |
|---|------|---------|-----------|
| F1 | Start journey: describe situation in chat, case gets classified and created, journey generated | `intake.tsx` | `POST /api/intake` (repeated per message) |
| F2 | Load demo case (A/B/C synthetic scenarios) | `dialogs.tsx` DemoDialog | `POST /api/demo`, then workspace load |
| F3 | Reopen a case ("My cases") | `dialogs.tsx` CasesDialog, `page.tsx` | `GET /api/cases` |
| F4 | Case workspace: overview, stats, facts/assumptions, timeline | `workspace.tsx`, `overview-tab.tsx` | `GET /api/cases/:id` (reloaded after every mutation) |
| F5 | Asset inventory: filter, confirm/dismiss/reopen clues, add manually | `assets-tab.tsx` | `PATCH /api/assets/:id`, `POST /api/assets` |
| F6 | Document centre: upload, extract, review, correct/verify fields | `documents-tab.tsx` | `POST /api/documents` (multipart), `PATCH /api/documents/:id` |
| F7 | Journey tracker: start / waiting / complete with evidence; progress and next-best recalculated | `journey-tab.tsx` | `PATCH /api/tasks/:id` |
| F8 | Estate planning: inventory snapshot, then generate draft will | `estate-tab.tsx` | `POST /api/ai/draft` (`kind: "will"`) |
| F9 | Expert escalation: generate briefing pack, copy to clipboard | `expert-tab.tsx` | `POST /api/ai/draft` (`kind: "expert"`) |
| F10 | Ask about this case (grounded Q&A) | `ask-panel.tsx` | `POST /api/ai/ask` |
| F11 | Official portals directory | `resources-page.tsx` | `GET /api/resources` (raw `fetch`, no session header) |

---

## 2. Every data touchpoint

### 2.1 Client storage

| Where | What |
|---|---|
| `src/lib/client.ts:7-10` | `localStorage["finlegacy_session"]`: random UUID generated on first use. This is the **only identity**. |
| `src/lib/client.ts:28` | Sent on every `api.*` call as header `x-session-id`. |
| `expert-tab.tsx:97` | `navigator.clipboard.writeText(pack)`: copy only, no server call. |

No cookies, no sessionStorage, no other localStorage keys. Drafts (will, expert pack), Q&A history and the intake chat transcript live only in React state and are **lost on navigation or refresh**.

### 2.2 API calls (all via `api` wrapper in `src/lib/client.ts` unless noted)

| # | File:line | Call | Sends | Expects |
|---|---|---|---|---|
| 1 | `app/page.tsx:25` | `GET /api/cases` | — | `{ cases: unknown[] }`, uses `.length` only (dot on "My cases") |
| 2 | `components/fl/dialogs.tsx:110` | `GET /api/cases` | — | `{ cases: {id, scenarioLabel, assetHolderName, progress, isDemo, updatedAt}[] }` |
| 3 | `components/fl/dialogs.tsx:49` | `POST /api/demo` | `{ scenario: "demo-a"\|"demo-b"\|"demo-c" }` | `{ caseId }` |
| 4 | `components/fl/intake.tsx:79` | `POST /api/intake` | `{ message, caseId: string\|null }` | `{ reply, classification: ClassifiedSituation, caseId, aiDegraded }` |
| 5 | `components/fl/workspace.tsx:60` | `GET /api/cases/:id` | — | `CaseWorkspace` (`src/lib/types.ts:89`). Error message shown on failure. |
| 6 | `components/fl/assets-tab.tsx:44` | `PATCH /api/assets/:id` | `{ action: "confirm"\|"dismiss"\|"reopen" }` | ignored (reloads workspace) |
| 7 | `components/fl/assets-tab.tsx:65` | `POST /api/assets` | `{ caseId, institution, category, maskedRef }` | ignored |
| 8 | `components/fl/documents-tab.tsx:41` | `POST /api/documents` (multipart) | `caseId`, `file` (UI accepts `.pdf,.txt,.csv,.md,.jpg,.jpeg,.png`) | `{ document: {extractionStatus, extractionNote, ...}, cluesAdded }` |
| 9 | `components/fl/documents-tab.tsx:75` | `PATCH /api/documents/:id` | `{ extractedFields: {label,value,confidence,sourceExcerpt}[], userVerified: true }` | ignored |
| 10 | `components/fl/journey-tab.tsx:38` | `PATCH /api/tasks/:id` | `{ status }` (`in_progress`, `waiting_institution`) | ignored (server returns full workspace) |
| 11 | `components/fl/journey-tab.tsx:53` | `PATCH /api/tasks/:id` | `{ status: "completed", completionEvidence }` | ignored |
| 12 | `components/fl/estate-tab.tsx:37` | `POST /api/ai/draft` | `{ caseId, kind: "will", context }` | `{ draft (markdown), label }` |
| 13 | `components/fl/expert-tab.tsx:31` | `POST /api/ai/draft` | `{ caseId, kind: "expert", expertType, context }` | `{ draft, label }` |
| 14 | `components/fl/ask-panel.tsx:29` | `POST /api/ai/ask` | `{ caseId, question }` | `{ answer }` |
| 15 | `components/fl/resources-page.tsx:43` | `GET /api/resources` (**raw `fetch`**) | — | `{ resources: OfficialResource[] }` |

Error contract the client relies on (`client.ts:30-33`): non-2xx means read `body.error` (string) and throw `ApiError(message, status)`. Every endpoint must return `{ "error": "<human message>" }` on failure.

### 2.3 Endpoints the backend has but the frontend never calls

| Endpoint | Status |
|---|---|
| `POST /api/ai/checklist` | Implemented, **no UI** |
| `POST /api/ai/draft` with `kind: "followup"` | Implemented, **no UI** (journey tasks reference "AI-drafted follow-up") |
| `GET/POST /api/consent` | Implemented, **no UI** (the caregiver task says "record it in Consent settings", but no such screen exists) |
| `GET /api` | Template "Hello, world!" |
| `UserProfile` model | In schema, never read or written |

### 2.4 Hardcoded / static data in the frontend bundle

| File | Data |
|---|---|
| `components/fl/dialogs.tsx:11-33` | Demo scenario cards (copy only; keys must match server seeds) |
| `components/fl/intake.tsx:22-31` | 8 example prompts |
| `components/fl/expert-tab.tsx:15-21` | Expert type list |
| `components/fl/assets-tab.tsx:16-23, 110` | Asset filter keys and category list (must match `ASSET_CATEGORIES`) |
| `components/fl/estate-tab.tsx:15` | Default beneficiary text |
| `components/fl/landing.tsx` | Marketing copy only, no data |
| `lib/demo-data.ts` (server) | 3 synthetic case seeds with documents, extracted fields and assets |
| `lib/resources.ts` (server) | 7 official portal entries |
| `lib/case-service.ts:officialLinkFor` | Category-to-portal URL map (duplicates `resources.ts`) |

---

## 3. API contract (match exactly)

Common rules:
- **Auth header:** `x-session-id: <8–128 chars>` on every endpoint marked "Auth: yes". It's missing on `/api/resources`, which is fine because that endpoint is public.
- **Errors:** `{ "error": string }`. `401` is returned when the session header is missing or invalid, with the message "Missing or invalid session. Start a new journey from the home page."
- **Ownership:** every case-scoped lookup filters by owner, so a foreign ID gets `404`, never `403`. This prevents ID probing.
- **JSON-in-string fields** in the DB (facts, docs, fields) are **always parsed to arrays/objects** in responses.

| Method | Path | Request | Success response | Status codes | Auth |
|---|---|---|---|---|---|
| GET | `/api/cases` | — | `{ cases: [{ id, caseType, scenarioLabel, assetHolderName, summary, stage, progress, nextBestAction, isDemo, demoKey, updatedAt }] }`, sorted by `updatedAt desc` | 200, 401 | yes |
| GET | `/api/cases/:id` | — | `CaseWorkspace` = `{ case, assets[], documents[], tasks[], events[] }` (shape in `types.ts:89-166`; assets/docs by `createdAt asc`, tasks by `priority, sortOrder`, events by `createdAt desc`) | 200, 401, 404 | yes |
| POST | `/api/intake` | `{ message: string (required), caseId?: string\|null }` | `{ reply: string, classification: ClassifiedSituation, caseId: string, aiDegraded: boolean }`. Creates the case on first message; updates classification after; adds asset clues for mentioned institutions; generates tasks once. | 200, 400 (no message), 401 | yes |
| POST | `/api/demo` | `{ scenario: "demo-a"\|"demo-b"\|"demo-c" }` | `{ caseId }`. Replaces any previous copy of the same demo for this session. | 200, 400, 401 | yes |
| POST | `/api/assets` | `{ caseId, institution, category?, maskedRef?, holderName? }` | `{ asset }` (created as `confirmed` / `user_confirmed`, confidence 1) | 200, 401, 404 | yes |
| PATCH | `/api/assets/:id` | `{ action?: "confirm"\|"dismiss"\|"reopen", institution?, maskedRef?, notes?, category? }` | `{ asset }` | 200, 401, 404 | yes |
| POST | `/api/documents` | multipart: `caseId`, `file` (≤ 8 MB) | `{ document (fields parsed), extraction: ExtractedDocumentData\|null, cluesAdded? }`. Extraction failure still returns **200** with `extractionStatus: "failed"`. | 200, 400, 401, 404, 413 | yes |
| PATCH | `/api/documents/:id` | `{ extractedFields?: Field[], userVerified?: boolean, category?: string }` | `{ document }`. Note: `extractedFields` comes back as a **raw JSON string** here; the frontend ignores it, but a new backend should parse it. | 200, 401, 404 | yes |
| PATCH | `/api/tasks/:id` | `{ status?: TaskStatus, completionEvidence?: string (≤500) }` | full `CaseWorkspace`. Server recomputes progress, `isNextBest`, case `stage` and `nextBestAction`. | 200, 401, 404 | yes |
| POST | `/api/ai/ask` | `{ caseId, question }` | `{ answer }` | 200, 400, 401, 404, 503 | yes |
| POST | `/api/ai/draft` | `{ caseId, kind: "followup"\|"will"\|"expert", context?: string(≤2000), expertType?: string }` | `{ draft: markdown, label }` | 200, 400, 401, 404, 503 | yes |
| POST | `/api/ai/checklist` | `{ caseId, institution, purpose? }` | `{ checklist: { institution, purpose, items:[{document, why, whereToGet, critical}], tips[] } }` | 200, 401, 404, 503 | yes |
| GET | `/api/consent` | — | `{ consents: ConsentRecord[] }` (latest 50) | 200, 401 | yes |
| POST | `/api/consent` | `{ purpose (≤120), status?: "granted"\|"revoked" }` | `{ consent }` | 200, 400, 401 | yes |
| GET | `/api/resources` | — | `{ resources: OfficialResource[] }` | 200 | **no** |
| GET | `/api/health` *(new)* | — | `{ status: "ok" }` | 200 | no |

**Proposed additions** (only if you approve them, see §8). These fill gaps the UI already implies:

| Method | Path | Why |
|---|---|---|
| GET | `/api/cases/:id/messages` | Restore the intake chat when returning to a case (`Intake` takes `initialCaseId` but starts with an empty transcript) |
| DELETE | `/api/cases/:id` | Intake copy promises "you can delete your data anytime" |
| DELETE | `/api/session` | Same, for the whole session |
| GET | `/api/documents/:id/file` | Only needed if we start storing original files |

---

## 4. Data model

Derived from `prisma/schema.prisma`, `src/lib/types.ts` and route validation. Enum-like columns are free `String` today; the new backend should enforce them as enums or CHECK constraints.

```
Session 1───1 UserProfile (unused)
   │ 1
   ├──* LegacyCase 1──* AssetRecord ── (sourceDocumentId → DocumentRecord, soft link)
   │        │      1──* DocumentRecord
   │        │      1──* JourneyTask   ── dependencies: JSON array of task ids
   │        │      1──* CaseEvent     ── refId: soft link to asset/doc/task/consent
   ├──* ConsentRecord
   └──* IntakeMessage ── caseId (soft link, nullable)
```
All child relations use `onDelete: Cascade`.

| Entity | Fields (type, default) | Constraints / notes |
|---|---|---|
| **Session** | `id` string PK (client UUID), `isDemo` bool=false, `createdAt` | Upserted on every request. This is the de facto "user". |
| **UserProfile** | `preferredName?`, `country`="India", `state?`, `language`="English", `relationship?`, timestamps | Unique `sessionId`. Unused. |
| **LegacyCase** | `caseType` enum(8)¹, `assetHolderName?`, `relationship?`, `holderLiving?` bool, `jurisdiction`="India", `summary`, `stage` enum(`understanding\|discovery\|documentation\|action\|resolution`)="understanding", `progress` float 0–100, `nextBestAction?`, `scenarioLabel?`, `confidence?` 0–1, `confirmedFacts?` JSON string[], `assumptions?` JSON string[], `isDemo`, `demoKey?` (`demo-a\|b\|c`), timestamps | Unique (sessionId, demoKey) is effectively enforced by the demo route |
| **AssetRecord** | `category` enum(8)², `institution` (≤120), `maskedRef?` (≤60), `holderName?` (≤120), `evidence?`, `sourceDocumentId?`, `discoveryStatus` enum(`possible\|confirmed\|dismissed`)="possible", `verificationStatus` enum(`unverified\|user_confirmed\|institution_verified`)="unverified", `confidence` 0–1 =0.5, `notes?` (≤500) | Must never hold full account numbers (masked only) |
| **DocumentRecord** | `category` enum(`bank_statement\|policy_document\|death_certificate\|will\|claim_letter\|receipt\|other`), `fileName`, `fileType`, `sizeLabel?` ("12 KB"), `extractionStatus` enum(`pending\|processing\|extracted\|failed`), `extractionNote?`, `rawText?` (≤20k chars), `extractedFields?` JSON `[{label,value,confidence,sourceExcerpt}]`, `userVerified`, `isSynthetic` | **The original file is not stored**, only the extracted text |
| **JourneyTask** | `title`, `instructions`, `rationale?`, `institution?`, `assetCategory?` (category or `multi`/`grievance`), `officialUrl?`, `officialName?`, `integrationType` enum(`guided_workflow\|official_website\|public_api`), `requiredDocs?`/`missingInfo?`/`dependencies?` JSON string[], `status` enum(6)³ ="ready", `priority` int (lower = earlier), `isNextBest`, `sortOrder`, `completionEvidence?` (≤500), `completedAt?` | Exactly one `isNextBest=true` per case (or none if all done) |
| **CaseEvent** | `eventType` enum(`created\|document\|asset\|task\|ai\|consent\|evidence\|status`), `description`, `actor` enum(`ai\|user\|system`), `refId?`, `createdAt` | Append-only audit timeline |
| **ConsentRecord** | `purpose` (≤120), `status` (`granted\|revoked`), `createdAt` | Append-only; scoped to session, not case |
| **IntakeMessage** | `caseId?`, `role` (`user\|assistant`), `content`, `meta?` JSON `{classification, caseId, aiDegraded}` | |

¹ `living_individual, family_death, nominee_heir, estate_planning, rejected_claim, caregiver, nri_cross_border, general`
² `bank_deposit, bank_account, insurance, mutual_fund, shares, provident_fund, other, unknown`
³ `not_started, ready, in_progress, waiting_institution, needs_expert, completed`

Non-persisted DTOs: `ClassifiedSituation`, `ExtractedDocumentData`, `OfficialResource`, `CaseWorkspace` (all in `src/lib/types.ts`).

---

## 5. Auth and permissions (as the frontend sees it)

- **No login, no accounts, no tokens.** Identity is a client-generated UUID in `localStorage`, sent as `x-session-id`. The server **upserts** a `Session` for any 8–128 char value (`src/lib/session.ts`).
- **Consequences:**
  - Anyone who learns the ID (it's visible in DevTools and logs) owns those cases.
  - Clearing browser storage or switching device means cases are lost.
  - There's no rate limit, so any string creates a session row.
- **Protection today:** every route except `/api/resources` requires the header. Every case, asset, document and task query is scoped through `case.sessionId`. Cross-session access returns 404 (verified in `worklog.md`).
- **Actions that must stay protected:** everything in §3 marked "Auth: yes". The AI endpoints (`intake`, `ask`, `draft`, `checklist`, `documents` upload) are also **cost-bearing** and need rate limiting.
- `next-auth` is installed but unused. The root `LLD.md` §5 specifies Keycloak OIDC through a Next.js BFF with HttpOnly cookies and CSRF, which is a very different model (see Q1–Q2).

**Recommended path:** keep `x-session-id` working first so the frontend runs unchanged. Then add real auth behind the same ownership checks: the `sessionId` foreign key becomes `ownerId`, and there's an optional "claim this anonymous session" step on sign-up.

---

## 6. Other needs

| Need | Current state | Backend requirement |
|---|---|---|
| **File uploads** | Multipart, ≤8 MB, synchronous. Text/CSV/MD read directly; PDF via `unpdf` text layer; **images accepted by the UI (`.jpg/.png`) but always fail** (no OCR). The original file is discarded. | Keep synchronous extraction for v1 (`maxDuration` 120s). Validate MIME type and magic bytes. Decide on OCR and on storing originals (Q6, Q7). |
| **AI / LLM** | `z-ai-web-dev-sdk` (sandbox vendor), used for classify, extract, reply, ask, draft and checklist. Graceful degradation: intake falls back to a regex classifier; other routes return 503 with a friendly message. Bug: the system prompt is sent with `role: "assistant"`. | A provider adapter with the same `complete / completeJson / completeWithHistory` interface. The provider needs a decision (Q4). Keep the fallback behaviour and timeouts. |
| **Real-time** | None. The UI reloads the whole workspace after each mutation. | None needed. Upload is synchronous; a spinner covers it. |
| **Pagination** | None. Workspace returns all events; consent is limited to 50. | Not needed at current volumes. Optionally cap events at 200. |
| **Search / filter** | Asset category filter is client-side only. | None. |
| **Emails / notifications** | None. Task copy mentions "yearly review reminder" and "follow-ups after 30 days". | Out of scope unless requested (Q10). |
| **Third-party integrations** | Official portals are **links only** (no APIs). | None. Keep the static registry. |
| **Background jobs** | None. Demo seeding and extraction are inline. | None for v1. A future async extraction or OCR worker is optional. |
| **Clipboard / markdown** | Client-side only. | None. |
| **Demo data** | 3 seeds, re-seed replaces. | Port as-is; keep the `isSynthetic` / DEMO labels. |

---

## 7. Proposed backend architecture

`[My preferences: language/framework = ___, database = ___, deployment target = ___]`. **Not filled in**, so these are recommendations pending your answers to Q3–Q5.

### Recommendation (default if you have no preference)

| Concern | Choice | Why |
|---|---|---|
| Runtime / framework | **Node 22 + TypeScript + Fastify** (or Hono) | About 70% of the logic already exists in TS (journey engine, prompts, validators, demo seeds) and can be ported nearly verbatim. Zod already exists in `package.json`. |
| ORM | **Prisma** | The existing schema carries over; only the provider changes. |
| Database | **PostgreSQL 16+** (SQLite allowed for local dev) | Concurrent writes, JSONB for facts/fields, real enums/CHECKs. Matches the LLD direction. |
| Validation | Zod schemas per endpoint | Replaces the hand-rolled `typeof` checks |
| AI | Provider adapter (`AiProvider` interface) + `FixtureProvider` for tests | Removes the vendor lock-in to `z-ai-web-dev-sdk` |
| PDF text | `unpdf` (as today) | Proven in the current code |
| Tests | Vitest + Supertest; contract tests asserting response shapes against `types.ts` | |
| Deployment | One Docker image + managed Postgres (Render, Fly or Railway) | Simple. The frontend's Caddy and standalone setup is sandbox-specific. |

**Alternative (if you want to follow `LLD.md`):** Python 3.13 + FastAPI + Pydantic 2 + SQLAlchemy/Alembic + Postgres. This is more work: all TS domain logic gets rewritten, and the frontend still calls `/api/*`, not `/v1/*`.

### Folder structure (new top-level `backend/`)

```
backend/
  src/
    server.ts            # Fastify bootstrap, CORS, error handler → { error }
    config.ts            # typed env (zod)
    plugins/session.ts   # x-session-id → request.session (later: real auth)
    plugins/rateLimit.ts
    routes/              # cases, intake, demo, assets, documents, tasks, ai, consent, resources, health
    domain/              # journey-engine.ts, case-service.ts, classification fallback (ported)
    ai/                  # provider interface, prompts.ts, z-ai/openai/anthropic/fixture adapters
    extraction/          # text + pdf extractors
    data/                # resources.ts, demo-data.ts
    db.ts
  prisma/schema.prisma   # ported, provider=postgresql, enums, indexes
  prisma/seed.ts
  test/
  Dockerfile
  .env.example
```

### How the frontend connects (minimal change)

**Option A, recommended: same-origin proxy (no CORS, no client code change).**
- Add to `frontend/next.config.ts`: `rewrites: [{ source: "/api/:path*", destination: \`${process.env.BACKEND_URL}/api/:path*\` }]`.
- Delete `frontend/src/app/api/**` and the server-only libs (`db.ts`, `ai.ts`, `session.ts`, `case-service.ts`, `journey-engine.ts`, `demo-data.ts`, `resources.ts`). `types.ts` and `client.ts` stay.
- Env: `BACKEND_URL=http://localhost:4000` (server-side only).

**Option B: direct calls.**
- `client.ts`: prefix with `process.env.NEXT_PUBLIC_API_BASE_URL`. `resources-page.tsx:43` must switch to `api.get`.
- Backend CORS: allow `WEB_ORIGIN` and header `x-session-id`.

Backend env vars: `PORT=4000`, `DATABASE_URL`, `WEB_ORIGIN`, `AI_PROVIDER` (`zai|openai|anthropic|fixture`), provider API key, `MAX_UPLOAD_MB=8`, `RATE_LIMIT_*`, `LOG_LEVEL`.

---

## 8. Gaps and questions for you

**Scope and direction**
1. **What is "the backend"?** The frontend already ships a working backend (Next.js API routes + SQLite). Which do you want?
   - (a) Extract it into a standalone service with the same `/api/*` contract (my default).
   - (b) Harden it in place inside `frontend/`.
   - (c) Implement the root `LLD.md` / `contracts/openapi.json` reference API (FastAPI, `/v1/*`, Postgres RLS, Keycloak). That would need major frontend rewiring, because none of those endpoints are called today.
2. **Should `contracts/` and `LLD.md` constrain this work at all,** or are they a separate future track?

**Preferences (the blanks in your template)**

3. Language/framework: Node/TS (Fastify) or Python/FastAPI?
4. Database: Postgres (recommended) or keep SQLite?
5. Deployment target: Docker on Render/Fly/Railway, Vercel + managed DB, or something else?

**AI**

6. **Which LLM provider?** `z-ai-web-dev-sdk` is a sandbox SDK with credentials in a git-ignored `.z-ai-config` that isn't in the repo. Should I switch to Anthropic, OpenAI, or keep z-ai? Also, may real user documents be sent to an external model? The README and LLD say "synthetic only".

**Auth and data**

7. Is the anonymous `x-session-id` model acceptable for this phase, or do you want real sign-in now (email OTP, OAuth, Keycloak)?
8. Should original uploaded files be stored (and where: local disk or S3), or only the extracted text as today?
9. Images: the upload accepts `.jpg/.png`, but extraction always fails. Should I add OCR, or remove images from the `accept` list?
10. Should I add a data-deletion endpoint (case and/or session), as the UI copy promises?
11. `frontend/db/custom.db` is **committed with data**: 6 sessions, 9 cases, and 2 non-synthetic uploaded documents. Should I remove it from git and add it to `.gitignore`?

**Features with no UI**

12. Should I keep, drop or expose `/api/ai/checklist`, `/api/ai/draft?kind=followup`, `/api/consent` and the `UserProfile` model? They have backend support but no screens.
13. Should generated drafts (will, expert pack) and Ask Q&A be **persisted**? Today they're lost on refresh.
14. Restoring the intake chat when you reopen a case needs `GET /api/cases/:id/messages` plus a small frontend change. Do you want that?
15. Any reminders or notifications (the "follow up after 30 days" and "yearly review" tasks), or out of scope?

**Bugs I'd fix while porting** (say if you want any left as-is)

- Intake conversation history isn't filtered by `caseId` (`intake/route.ts:118`). History from one case leaks into another case's prompt.
- `POST /api/consent` attaches the event to "most recently updated case", not a specified case.
- `PATCH /api/documents/:id` returns `extractedFields` as an unparsed JSON string.
- The AI system prompt is sent with `role: "assistant"` instead of `system` (`ai.ts:49, 97`).
- Demo route crashes (`next.id` of undefined) if every seeded task is completed (`demo/route.ts:151`).
- Asset de-duplication matches on `institution contains first 12 chars` (`documents/route.ts:207`), so different banks with the same prefix get merged.
- No rate limiting on AI endpoints; no upload MIME or magic-byte validation.

---

## 9. Build order (small milestones)

Each milestone ends with tests passing and the frontend working against it.

1. **M0 – Scaffold:** `backend/` project, config, `/api/health`, error handler (`{error}`), CORS/proxy decision, Dockerfile, `.env.example`, CI lint and tests.
2. **M1 – Schema:** Port Prisma schema to Postgres with enums, indexes (`caseId`, `sessionId`, `updatedAt`) and JSONB. Migrations; seed script.
3. **M2 – Session and read paths:** `x-session-id` plugin, `GET /api/resources`, `GET /api/cases`, `GET /api/cases/:id` (workspace payload). Contract tests vs `CaseWorkspace`.
4. **M3 – Demo seeding:** port `demo-data` and `journey-engine`; `POST /api/demo`. This unblocks clicking through the whole UI with no AI key.
5. **M4 – Mutations:** `PATCH /api/tasks/:id` (progress / next-best / stage recalculation), `POST /api/assets`, `PATCH /api/assets/:id`, `PATCH /api/documents/:id`, `GET/POST /api/consent`. Unit tests for `recalcProgress`.
6. **M5 – AI adapter:** provider interface, fixture provider, chosen real provider, timeouts, rate limiting.
7. **M6 – Intake:** `POST /api/intake` with classification, rule-based fallback, case create/update, clue creation and journey generation.
8. **M7 – Documents:** `POST /api/documents` multipart, text/PDF extraction, AI extraction, clue de-duplication, honest failure states. Size and type validation.
9. **M8 – AI drafting:** `/api/ai/ask`, `/api/ai/draft` (will / expert / followup), `/api/ai/checklist`.
10. **M9 – Cut-over:** point the frontend at the backend (rewrite or base URL), delete `frontend/src/app/api` and server libs, remove Prisma/z-ai from frontend deps, run an end-to-end smoke test of flows F1–F11.
11. **M10 – Hardening (per your answers):** real auth, deletion endpoints, file storage and OCR, persisted drafts, message history endpoint, deployment.
