# Financial Legacy — Low-Level Design (LLD)

*How the product is built.*

| | |
| --- | --- |
| **Version** | 0.6.1 (implementation reconciliation; draft for review) |
| **Date** | 18 October 2026 |
| **Sources of truth** | [ONE_PAGER.md](ONE_PAGER.md) (vision) → [PRD.md](PRD.md) (what the product does) → this LLD (how it is built). If this LLD conflicts with the PRD, the PRD wins and this LLD is corrected. |
| **Describes** | The real codebase: [`frontend/`](frontend/) (Next.js UI), [`backend/`](backend/) (the API: Hono + TypeScript + Prisma + Gemini) and [`shared/`](shared/) (types and pure claim rules), targeting two Google Cloud Run services (deployment is milestone M7, not yet done). **Free tier only** — every service must be free or within existing free credits ([docs/FREE_TIER_PLAN.md](docs/FREE_TIER_PLAN.md)). |
| **Replaces** | LLD v0.4 (separate Python/FastAPI backend, Keycloak, Docker). That design is no longer the target. The separate hackathon plan (`BACKEND_PLAN.md`) was folded into §21 and removed; it remains in git history. |
| **Status** | Connected synthetic MVP: local Supabase persistence, saved conversations, guided searches, voice fallbacks, bounded agent work and document-to-claim continuation are implemented. Production OAuth/hosting, device voice and real institution providers remain unverified. See [CURRENT_STATE](docs/CURRENT_STATE.md). |

---

## Contents

1. [Design principles](#1-design-principles)
2. [Architecture overview](#2-architecture-overview)
3. [Technology stack](#3-technology-stack)
4. [Code layout](#4-code-layout)
5. [Data model](#5-data-model)
6. [Case types and journeys](#6-case-types-and-journeys)
7. [Trust gates and access control](#7-trust-gates-and-access-control)
8. [Documents and extraction](#8-documents-and-extraction)
9. [Discovery](#9-discovery)
10. [Inventory, evidence status and totals](#10-inventory-evidence-status-and-totals)
11. [Claims](#11-claims)
12. [Legacy planning](#12-legacy-planning)
13. [AI layer](#13-ai-layer)
14. [Voice](#14-voice)
15. [API design](#15-api-design)
16. [Security and privacy](#16-security-and-privacy)
17. [Reliability, operations and deployment](#17-reliability-operations-and-deployment)
18. [Configuration](#18-configuration)
19. [Testing and evaluation](#19-testing-and-evaluation)
20. [Gap analysis against the PRD MVP](#20-gap-analysis-against-the-prd-mvp)
21. [Build plan](#21-build-plan)
22. [Later capabilities](#22-later-capabilities)
23. [Change control and superseded documents](#23-change-control-and-superseded-documents)

### How to use this document

- **New engineers:** read §1–§5, then the section for the area you are working on.
- **Every task, PR and test** names the PRD requirement IDs (FL-xx) it implements. Section headings below list the IDs they cover.
- **"Built"** means present in `frontend/`, `backend/` or `shared/` today. **"To build"** means designed here but not yet implemented.

---

## 1. Design principles

These turn the PRD's product principles into engineering rules.

| Reality | Engineering rule |
| --- | --- |
| Financial records are incomplete, stale or wrong | Every fact keeps its source, date and evidence status. Critical fields are reviewed by a person before they count. |
| Knowing someone is family does not prove they may act | Access is decided by **deterministic code** (trust gates, §7), never by the AI or the UI. |
| AI output can be wrong or manipulated | The AI proposes; code validates. AI never decides access, entitlement, verification or risk. Uploaded documents are data, never instructions. |
| Sensitive data has a lifetime | Read, extract, forget: store extracted fields and short snippets, not raw documents or message bodies. Mask by default. Delete on request. |
| Sharing can be irreversible | Anything leaving the product needs an exact preview and the user's approval, recorded in the audit trail. |
| Requests repeat and things fail | Retries must be safe; unknown outcomes are recorded as unknown, never guessed. |
| We must learn cheaply | A web app and an API, each small and deployable alone, over one database. Mocks behind interfaces, swapped for real providers without rewrites. |

---

## 2. Architecture overview

### 2.1 Two services and a shared contract

```
 Browser (phone or laptop)
   │  React UI (Next.js App Router, client components)
   │  x-session-id header (v0) → real sign-in (MVP)
   ▼
 frontend/  Next.js on Cloud Run ─ pages only; rewrites /api/* to the backend (no CORS, header passes through)
   │
   ▼
 backend/   Hono on Cloud Run ──────────────────────────────────────────
 │ src/api/**        thin route handlers (Request → Response): validate (Zod) → call server → respond
 │ src/app.ts        maps src/api/**/route.ts to URLs; src/index.ts listens on $PORT
 │ backend/src/server/
 │   core/           session · access guards · gate engine · masking · crypto ·
 │                   rate limit · name matching · upload validation · http
 │   domain/         case service · journey engine · gates · claim and evidence services
 │   ai/             provider interface · Gemini adapter · fixture provider (tests) · voice-agent planner
 │   ocr/            Tesseract OCR · no-AI text rules
 │   knowledge/      procedure library · hybrid search · citations (RAG)
 │   providers/      identity · death proof · relationship · entitlement (mock now)
 │   rules/          evidence · observations · totals · duplicates
 │   connectors/     connector interface · mock connectors       (Later)
 │   pdf/            claim-pack PDF (pdf-lib)
 │   data/           official resources · demo data · synthetic registries
 ▼
 Prisma ─► Supabase PostgreSQL (validated local runtime) / SQLite (development and tests)
 Gemini API key, free tier (text, vision, embeddings; synthetic data only)

 shared/   types.ts · contracts.ts (ClaimView, agent actions) · claim-path · claim-pack · claim-lifecycle ·
           procedures · field-review · journey · starters   (imported by both; no runtime of its own)
```

### 2.2 The one-pager's six layers, mapped to code

| Layer (one-pager §7) | Where it lives | Status |
| --- | --- | --- |
| User experience | `frontend/src/app/page.tsx` (public site), `frontend/src/app/signin`, `frontend/src/app/app/*`, `frontend/src/components/keeper/*`, `frontend/src/keeper/*` | **Original Keeper UI with backend adapter**: normal Continue calls the session-scoped APIs through `src/keeper/backend.ts`; Explore a sample retains the offline engine |
| Identity and authorisation | `backend/src/server/core/{session,access,gate-engine}.ts`, `backend/src/server/providers/*` | Built with mock providers and session-based identity; real sign-in to build |
| AI orchestration | `backend/src/server/ai/*`, `backend/src/server/domain/journey-engine.ts`, AI routes | Built (Gemini + deterministic journey engine) |
| Financial integration | `backend/src/server/data/resources.ts`, `ResourceVisit`, connector interface | Guided official resources built; connectors Later |
| Asset and document records | Prisma models, `backend/src/api/documents`, `backend/src/api/assets`, masking, `backend/src/server/rules/`, `domain/evidence-service.ts` | Built: four evidence statuses, field review with history, dated amounts, totals, duplicates (§10) |
| Claims and workflow | `JourneyTask`, journey engine; `Claim`, `ClaimPack`, `Approval`, `domain/claim-service.ts` | Built: tasks and claims to outcome (§11) |

`backend/` and `frontend/` never import each other. What both need is in `shared/` (types and pure rules). The frontend talks to the API only over `/api/*`. (Done 18 Oct 2026 — see M9 and DECISIONS.md.)

---

## 3. Technology stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Node.js ≥ 22 | Cloud Run buildpacks |
| Web framework | Next.js 16 (App Router), React 19, TypeScript 5 | `frontend/AGENTS.md`: read the bundled Next.js docs before changing framework code — this version has breaking changes |
| UI | Tailwind CSS 4, shadcn/ui (Radix), lucide icons, sonner toasts, framer-motion | Accessible primitives from Radix |
| Validation | Zod 4 at every API boundary | Enums enforced by Zod (SQLite has no native enums) |
| Database | Prisma 6; Supabase PostgreSQL private `keeper` schema, separate generated client and `@prisma/adapter-pg`; SQLite remains local/test | Strict CA/hostname verification; explicit schema setup |
| AI | Google Gemini via `@google/genai`, **free-tier API key** (Vertex AI code path kept but not used — it bills) | Provider interface + fixture provider for tests (§13) |
| PDF text | `unpdf` | Text layer first; scanned pages are rendered to images (`@napi-rs/canvas`) for OCR |
| OCR | `tesseract.js` (WASM, runs on the server) | English + Hindi by default (`OCR_LANGS`); used when there is no AI key or Gemini fails (§8.1) |
| Claim pack PDF | `pdf-lib` (MIT) | Standard fonts; "₹" written "Rs." (§11.3) |
| Tests | Vitest unit/route/integration; isolated SQLite fixtures; separate live synthetic probes | 18 Oct audit: 213 backend including 6 OCR, 75 frontend; see §19 |
| Deploy | Google Cloud Run, **from source via buildpacks — no Docker** | `npm run build`, `npm start`, listens on `$PORT` |
| Secrets | Google Secret Manager | Never in the repo |

`next-auth` and `next-intl` were removed (unused). Google sign-in (B3) is implemented through Supabase Auth; provider configuration and hosted acceptance remain pending.

---

## 4. Code layout

```
backend/                      the API service (own package.json, deploys alone)
  prisma/schema.prisma        data model (§5)
  src/
    index.ts · app.ts         listen on $PORT · map src/api/**/route.ts to URLs (§15)
    api/                      route handlers (Request → Response)
    server/                   all server logic
      ai/                     provider.ts · gemini.ts · fixture.ts · index.ts · agent.ts (voice-agent prompt, schema, vetting)
      knowledge/              library.ts (official procedure passages) · search.ts (BM25, vectors, fusion) · retrieve.ts · citations.ts (§13.5)
      ocr/                    ocr.ts (Tesseract, scanned-PDF pages) · rule-extract.ts (no-AI extraction) (§8.1)
      db.ts                   Prisma client
      core/                   access.ts · crypto.ts · gate-engine.ts · http.ts · masking.ts ·
                              name-match.ts · rate-limit.ts · session.ts · upload.ts
      domain/                 case-service.ts · gates.ts · journey-engine.ts · intake-fallback.ts · claim-service.ts · evidence-service.ts · keeper-ui.ts
      providers/              identity.ts · death-proof.ts · relationship.ts · entitlement.ts · types.ts
      data/                   resources.ts · demo-data.ts · death-registry.ts (synthetic)
        reference/            real public reference snapshot: fund schemes + NAVs, bank branches, pincodes, RBI rates (SOURCES.md)
        synthetic/            demo-case generator: real reference data + synthetic, masked people and identifiers
      rules/                  evidence.ts · observations.ts · totals.ts · duplicates.ts (pure, deterministic)
      pdf/                    claim-pack.ts: the approved pack as a PDF the family submits themselves
      connectors/             (Later) base.ts · mock/* · real/*
  test/                       Vitest unit and route tests (test/.tmp holds the test database)
  scripts/                    fetch-reference-data.mjs (public reference snapshot) · make_test_pdf.py
frontend/                     the Keeper web app (own package.json, deploys alone)
  next.config.ts              rewrites /api/* to BACKEND_URL
  src/
    app/                      page.tsx landing · signin/ · app/ (conversation, assets, documents, claims, family, activity, settings)
    components/keeper/        landing, signin, shell, conversation, agent-mode (voice agent screen), panel, views, ui
    components/ui/            stock shadcn components
    keeper/                   client-side engine: types · engine (assistant + reducer) · claims · sample · store (localStorage) · backend (API adapter) · agent (voice loop) · voice · catalog · util
    lib/                      client.ts (fetch + session header) · utils.ts
  test/                       Keeper engine tests · integration/ (adapter and refinement against the real route handlers)
shared/                       imported by both: types.ts · contracts.ts · claim-path.ts · claim-pack.ts · claim-lifecycle.ts · procedures.ts · field-review.ts · journey.ts · start-message.ts · starters.ts
.github/workflows/ci.yml      type-check, lint, tests and build for both services on every PR
```

`ClaimView` and the voice-agent action types are defined in `shared/contracts.ts`; the backend returns them and the frontend reads them as types only. `shared/` has no runtime of its own and imports nothing from either service.

Housekeeping done on 17 Oct 2026: the leftover "Hello, world" route was deleted, the package renamed to `financial-legacy`, and unused models and packages removed. `DECISIONS.md` is the decision log.

---

## 5. Data model

The Prisma schema in `backend/prisma/schema.prisma` is the **source of truth for data**. The tables below summarise it and map it to the PRD's concepts ([PRD §12.1](PRD.md#121-the-main-things-the-product-keeps-track-of)).

### 5.1 Models

| Model | Purpose | PRD concept |
| --- | --- | --- |
| `Session` | Synthetic browser session locally; `supabase:<verified-user-id>` in hosted mode | Participant (temporary) |
| `LegacyCase` | One case (with `keeperUi`, Keeper's redacted saved conversation and draft state): type, stage, progress, next-best action, `gateReached`, `frozenReason`, `deceasedPersonId`, `linkedCaseId` | Case |
| `DeceasedPerson` | Name, name variants, DOB, PAN **hash**, date of death, death-proof status | Subject (deceased) |
| `Claimant` | Relationship, role (lead / co-heir), identity and relationship status | Participant + role |
| `Proof` | Identity / death / relationship / entitlement proof: provider, status, matched fields | Authority evidence |
| `AssetRecord` | Category, institution, masked ref, last-4, value band, `discoveryStatus` (possible / confirmed / dismissed), `evidenceStatus` (§10.1), duplicate review, `nomineeStatus`, `jointHolderStatus`, `entitled` (G4) | Holding |
| `Observation` | Dated amount for a holding: decimal string, type, currency, as-of date, source field; append-only (superseded, never overwritten) | Observation |
| `DocumentRecord` | Category, extraction status, redacted text, the AI's original proposal (`extractedFields`), `userVerified` (derived: every field has a decision) | Document |
| `DocumentField`, `FieldReviewEvent` | Each extracted value with its review state; append-only history of every decision (who, when, why, previous value) | Evidence + review |
| `KnowledgeChunk` | Search index for the assistant: procedure library and case document chunks, optional vectors | — (RAG, §13.5) |
| `Claim`, `ClaimPack`, `Approval`, `ClaimEvent` | One claim per holding; versioned pack snapshots with hash; approval of an exact pack; claim timeline | Claim, claim pack, approval |
| `JourneyTask` | Task with instructions, official URL, required documents, dependencies, priority, next-best flag | Task |
| `ConsentRecord` | Session-scoped purposes and optional case/source context, status and revocation | Consent |
| `CaseEvent` | Append-only case timeline with event type and actor | Audit event |
| `IntakeMessage`, `QaMessage` | Intake conversation; saved assistant answers | Conversation |
| `CaseAgentRun`, `ClaimWorkflow` | Durable case preparation and claim review: revisions, cursors, leases, receipts and retries | Agent work |

Removed on 17 Oct 2026 because no code used them: `UserProfile`, `Signal`, `Institution`, `Draft`, `ResourceVisit`, `InstitutionClaim`, `CheckResult`, and the holding fields `verificationStatus`, `sourceSignalIds`, `institutionId`. Reintroduce a removed model only when an implementation needs it; guided-search outcomes now use case events instead of restoring ResourceVisit.

### 5.2 Changes required for the PRD MVP

| Change | Why | PRD |
| --- | --- | --- |
| **Built (#14):** `AssetRecord.evidenceStatus`: `self_declared \| potential_match \| document_backed \| institution_verified` (§10); `duplicateOfId`, `duplicateState` | PRD requires exactly these four labels | FL-07, FL-08 |
| **Built (#14):** `Observation`: `assetId`, `amount` (decimal string), `amountType`, `currency`, `asOfDate`, `label`, `sourceDocumentId`, `sourceFieldId`, `reviewedAt`, `reviewedBy`, `supersededAt` — append-only (`signalId` when discovery signals land) | Dated amounts with history; honest totals | FL-09, FL-28, FL-29 |
| **Built (#14):** `DocumentField` (per-field `state: proposed \| accepted \| corrected \| rejected`, `proposedValue`, `value`, `critical`, reviewer, reason) + append-only `FieldReviewEvent` (from/to state and value, reason, actor). `extractedFields` JSON keeps the AI's original proposal | Critical fields must be reviewed before use | FL-06, FL-26 |
| **Built (#16):** `Approval`: exact content hash, recipient, channel, purpose, expiry, state (active / used / expired / invalidated) | Approval of exactly what is sent | FL-14 |
| **Built (#16):** `Claim` (one per holding) with status, path, situation, procedure id/version/check date, checklist, declarations, owner and due date, submission and outcome; `ClaimPack` is now a versioned snapshot per claim (content + hash); `ClaimEvent` timeline; `AssetRecord.nomineeStatus` / `jointHolderStatus` | Claims tracked independently to an outcome | FL-09, FL-12–FL-16 |
| **Built:** scoped dated guided-search outcomes in `guided_search` case events with request-ID deduplication | Self-reported search history, never verified ownership | FL-10 |
| Add `Hold`: scope, reason, created/resolved by | Pause specific actions | FL-47 |
| Add `LegacySnapshot`: frozen record, date, known gaps; `TrustedContact` (intent only) | Legacy planning | FL-11, FL-31, FL-34 |
| **Built:** Supabase verified-user ownership mapped to Session; Google OAuth/PKCE endpoints | Hosted/provider configuration still pending | FL-45, FL-48 |
| **Built:** money as **decimal strings** (`Observation.amount`, `Claim.outcomeAmount`), never floats | Exact amounts | FL-29 |
| **Built:** `insurance` category with the LIC claim procedure | Life insurance is in the MVP | PRD §8.1 |

Supabase PostgreSQL is selected. The canonical Prisma schema remains SQLite for tests; `scripts/database.mjs` derives a separate PostgreSQL schema/client. Setup is explicit; existing hosted data requires reviewed additive migrations. Startup never initialises or resets data. Contracts live in `shared/`.

---

## 6. Case types and journeys

The code has seven case types (plus `general`), each driven by the deterministic journey engine (`backend/src/server/domain/journey-engine.ts`). They map onto the PRD's three journeys:

| Code `caseType` | Kind | PRD journey | Gates required (§7) |
| --- | --- | --- | --- |
| `living_individual` | Personal | A — Discover my own assets | G1 |
| `estate_planning` | Personal | B — Plan my legacy | G1 |
| `caregiver` | On behalf of a living person | A or B, for a parent | G1 + recorded consent of the relative (G3 via `relative_consent`) |
| `family_death` | About a deceased person | C — Find and claim after a death | G1 → G2 → G3; G4 per asset |
| `nominee_heir` | About a deceased person | C | G1 → G2 → G3; G4 per asset |
| `rejected_claim` | About a deceased person | C (claim already rejected) | G1 → G2 → G3; G4 per asset |
| `nri_cross_border` | About a deceased person | C (claimant abroad) | G1 → G2 → G3; G4 per asset |
| `general` | Unclassified | Routed after intake | Strict path G1 → G2 → G3 |

**Intake** (`POST /api/intake`): Gemini classifies the user's situation; a rule-based classifier is the fallback when AI is unavailable. Letting the user correct the classification (FL-01) is **to build**. A known-asset claimant is never forced into discovery.

---

## 7. Trust gates and access control

**PRD:** FL-03, FL-04, FL-22, FL-23, FL-47. **Built** in `backend/src/server/core/gate-engine.ts`, `access.ts`, `masking.ts`.

### 7.1 Gates

| Gate | What it proves | v0 provider (simulated, labelled) | Unlocks |
| --- | --- | --- | --- |
| **G0 Account** | Control of a session | Anonymous `x-session-id` | Intake chat, guides, official resources, demos |
| **G1 Identity** | The user is a specific real person | Mock DigiLocker; passport + selfie for NRIs | Personal cases; opening a case about someone else |
| **G2 Death** | The named person has died | Mock DigiLocker civil-registry lookup, or certificate scan read by Gemini vision (local OCR + rules without a key) and matched by code | Case active — **still no discovery** |
| **G3 Relationship or role** | The user has an evidenced claimant role for this person — close relative, nominee, legal heir, executor or surviving joint holder — or, for a living person, that person's consent | Heir's own document naming the deceased; legal-heir certificate; nominee or joint-holder record; executor named in a will; or relative consent (mock). **Today only the relative and consent routes are built; nominee, executor and joint-holder routes are to build** | Discovery; assets visible **masked** |
| **G4 Entitlement** (per asset) | The user may claim *this* asset | Nominee / joint-holder record, legal-heir or succession certificate (mock) | Full details and claim pack for that asset |

Gates are pure functions; every case-scoped route calls the guard (`caseAccess`, `assetAccess`, `documentAccess`). The UI cannot skip a gate.

### 7.2 Guard responses

| Situation | Response |
| --- | --- |
| Case or object belongs to another session/user | **404** (never reveal it exists) |
| Gate not yet reached | **403** `{ error, nextGate }` |
| Case frozen for review | **423** `{ error, frozen: true }` |

### 7.3 Rules built into the gate layer

- **Name matching** (`name-match.ts`): drops honorifics; handles initials, phonetic folding (sh/s, ee/i, w/v, doubled letters, trailing "a") and abbreviations. A non-match goes to **review**, never to automatic rejection.
- **One case per deceased person:** a second claimant's case for the same person (same PAN hash, or same DOB + name match) **freezes both cases** and links them until an operator reviews. Demo cases are excluded.
- **Living-person guard:** activity by the "deceased" after the date of death freezes the case (implemented; to be wired to sources).
- **Masking below G4** (`masking.ts`): institution, category, value band, last-4 and statuses only; holder name hidden; identifiers and exact amounts redacted from evidence. Every asset leaving the API passes through masking.
- **Where full details come from at G4:** v0 redacts identifiers before storage, so G4 today reveals only what was kept (institution, amounts, last-4). **To build for the MVP:** store full account/policy/folio numbers and holder names as **separately encrypted fields** (application-level encryption, key in Secret Manager), readable only through the G4 guard and only for the asset the user is entitled to; and keep encrypted originals (§8.2). Claim packs need these values.

### 7.4 How gates map to the PRD's authority model

The PRD separates identity, relationship, authority and consent (FL-03, FL-04). Gates implement this: G1 = identity, G2 = death evidence, G3 = relationship (or consent for a living person), G4 = **per-asset, per-action authority**. **To build:** expiry on proofs (reference policy 90 days), reviewer and reason on each accepted proof, and an operator action to unfreeze a case.

### 7.5 Real providers (Pilot)

Mock providers are replaced behind the same interface (`backend/src/server/providers/types.ts`). What is legally open to us ([docs/FEASIBILITY_AND_COMPLIANCE.md](docs/FEASIBILITY_AND_COMPLIANCE.md) §3):

| Gate | Real route for the Pilot |
| --- | --- |
| G1 Identity | **Aadhaar offline verification** (register with UIDAI as an OVSE: QR / offline e-KYC / Aadhaar app); PAN through a **licensed KYC vendor**; DigiLocker documents once we are an approved requester. Aadhaar authentication (AUA/KUA), PAN API, CKYC and V-CIP are not open to us directly |
| G2 Death | Death certificate **QR / registration-number check on crsorgi.gov.in** (no API — operator or user check), or DigiLocker if the certificate was issued to the claimant |
| G3 Relationship or role | Legal heir certificate (state e-District; mostly manual review), nomination records, will/executor evidence — operator review |
| G4 Entitlement | Institution nomination or joint-holder evidence; legal heir/succession certificate — operator review |

Real identity evidence rules are decision D-02.

---

## 8. Documents and extraction

**PRD:** FL-05, FL-06, FL-25, FL-26. **Built:** upload, validation, extraction (Gemini, local OCR, text rules), side-by-side field review saved per field on the server with history (`PUT /api/documents/:id/review`), and invalidation of claim packs that used a changed value. **To build:** malware scanning (before real uploads).

### 8.1 Pipeline

```
upload ─► validate (size ≤ MAX_UPLOAD_MB, magic-byte type sniffing: PDF, PNG, JPEG, WebP)
       ─► images: Gemini vision when a key is set
       ─► otherwise (or if that fails) text: PDF text layer → OCR of scanned pages (≤ OCR_MAX_PDF_PAGES) → OCR of photos
       ─► OCR clean-up of number-like tokens (O/D→0, I→1, Z→2) so redaction catches them
       ─► Gemini structured extraction → proposed fields; without AI, basic text rules
          (backend/src/server/ocr/rule-extract.ts) → quality "partial" at best, warning shown
       ─► redact identifiers BEFORE storage (6+ digit runs, 8+ digit groups, Aadhaar, PAN; dates kept)
       ─► store redacted text (≤20k chars) + proposed fields; original file NOT stored in v0
       ─► each value stored as a DocumentField (redacted, critical flag)
       ─► user accepts / corrects / rejects each field — PUT /api/documents/:id/review (who, when, why, previous value kept)
       ─► the holdings the document backs re-derive their evidence status; accepted or corrected amounts become
          dated observations (corrections supersede, never overwrite); clues become potential matches,
          flagged as possible duplicates instead of merged
```

### 8.2 Rules

- Content type comes from **sniffing bytes**, not the browser's MIME type.
- Encrypted or unreadable files return a clear message and a "get help" path; we never ask for a document password (FL-25).
- **Critical fields** — names, identifiers, ownership, amounts, dates, institution — must be reviewed before they count (FL-06).
- A correction keeps the old value, who changed it and why; it invalidates any pending claim pack or approval that used it (FL-26).
- **Original files:** not stored (read, extract, forget). The family keeps their originals and attaches them to the claim themselves. Cloud Storage's free tier is US-only, so storing originals would need a decision (FREE_TIER_PLAN §2).
- **Malware scanning:** not built. No free scanner fits Cloud Run from source; until one is chosen, uploads stay limited to byte-checked types and sizes and synthetic data (FL-05).

---

## 9. Discovery

**PRD:** FL-10, FL-27. **MVP = uploaded documents + guided official searches.** Automated connectors are **Later**.

### 9.1 MVP discovery

1. **Documents** the user uploads (statements, CAS, policy bonds, passbooks) → extraction (§8) → holdings.
2. **Guided official searches:** the resources directory and saved outcomes are built. `GET/POST /api/cases/:id/searches` stores dated scoped self-reported outcomes in case events, with request-ID deduplication. The product supports:
   - proposes which searches fit this case (discovery plan, FL-10);
   - opens the official portal for the user (a visit is recorded);
   - asks the user to log the outcome — **found / not found / partial / blocked** (e.g. the portal needs an identifier the family doesn't have) **/ failed** (portal unavailable) — recorded on the visit;
   - turns a "found" outcome into a `potential_match` holding for review.
3. **Inference** from documents (e.g. recurring interest credits suggesting an FD) creates `potential_match` holdings only — never confirmed.

Each discovery attempt records what was checked and when. Results distinguish **nothing found**, **partial**, **blocked** and **failed**; the product never says "you have no other assets".

### 9.2 Connector interface (Later)

```ts
interface Connector {
  id: "email" | "tax_record" | "sms" | "statement" | "registry" | "scan";
  connect(caseId: string, consent: ConsentInput): Promise<void>;
  fetchSignals(caseId: string): Promise<Signal[]>;
  disconnect(caseId: string): Promise<void>;
}
```

- Mode per source via `CONNECTOR_MODE_<SOURCE>=mock|real`. Mock mode is allowed for demos and must be labelled "Simulated".
- Pipeline: filter (financial senders only; OTP messages dropped) → Gemini structured extraction into `Signal` → match to `Institution` → merge into `AssetRecord` (same institution + category + last-4 = one holding) → confidence → masking.
- Raw email/SMS bodies are never stored; only extracted fields and ≤300-character snippets.
- A real connector is enabled only after FL-27's checks: approved source, subject type, method, consent and (for Gmail) Google's security review.

---

## 10. Inventory, evidence status and totals

**PRD:** FL-07, FL-08, FL-09, FL-28, FL-29.

### 10.1 Evidence status (built — `rules/evidence.ts`)

| Status | Set when | Set by |
| --- | --- | --- |
| `self_declared` | The user told us | User |
| `potential_match` | A search or inference suggests it; not yet supported by a document | System (search outcome, inference) |
| `document_backed` | A reviewed document supports it | User review of extracted fields |
| `institution_verified` | Reviewed evidence **from the institution** confirms it | Operator only, with attributable institution evidence |

Rules as built: not yet confirmed by the user → `potential_match`, whatever a document says. Confirmed + a linked document whose critical fields all have a decision and whose identifying reference wasn't rejected → `document_backed`; otherwise `self_declared`. `institution_verified` is sticky and set only by an operator (no route sets it yet — B9). `dismissed` stays a separate lifecycle flag. Old rows are upgraded the first time a case is opened (`backfillCase`). `verificationStatus` is kept only for old rows and is no longer read. AI confidence and name similarity can **never** raise a status.

### 10.2 Duplicates (built — `rules/duplicates.ts`)

Same institution (normalised, with aliases such as LIC / Life Insurance Corporation of India) + same type family (bank account and bank deposit are one family) + same last 4 digits makes a **candidate**: the new holding is created with `duplicateState = candidate` and shown for review. No automatic merge, and no match without a last-4. "Same holding" sets `merged` (the duplicate's evidence and amounts count for the survivor); "Different holdings" sets `distinct`; a merge can be undone (FL-08). The old loose name merge is gone.

### 10.3 Totals (built — `rules/totals.ts`)

- Count **one** reviewed, dated observation per holding: the latest with `amountType` in {`cash_balance`, `current_value`}.
- Exclude, with a stated reason: potential matches, duplicates, conflicts, holdings on hold, undated values, historical values, FD principal/maturity, insurance sum assured, units, negative balances, and amounts hidden below G4 for this person. (Holds arrive with B9.)
- Statement "Cr" / "Dr" mean credit / debit; only spelled-out lakh / crore scale an amount. Amounts are summed in paise with BigInt.
- Amounts are **decimal strings**; currencies are never mixed.
- No eligible values → total is `null` ("unknown"), not ₹0. An evidenced zero is `0.00`.
- Label: **"Reviewed value from dated sources"** — never "your wealth".

---

## 11. Claims

**PRD:** FL-12–FL-17, FL-35–FL-37. **Built for the MVP (#16)**; direct submission (FL-35) stays Later.

### 11.1 Claim path rules (`rules/claim-path.ts`, deterministic code)

For each confirmed holding, code — not the AI — chooses the path:

| Path | When |
| --- | --- |
| `nominee` | A nominee is recorded |
| `joint` | Banks: no nominee, and a surviving joint holder exists |
| `quick` | Mutual funds only: no nominee, up to ₹10,000 per fund house, claimant is an immediate relative (SEBI circular of 23 Jul 2026) |
| `simplified` | No nominee and within the simplified threshold: bank deposits up to ₹15 lakh at commercial banks or ₹5 lakh at co-operative banks (RBI Directions 2025, banks may set higher); mutual funds up to ₹10 lakh (₹30 lakh demat) |
| `succession` | Above the threshold (for mutual funds, probate is no longer mandatory) |
| `no_nominee` | LIC: no nominee — evidence of title needed; LIC publishes no small-amount limit |
| *review* | No checked procedure for this institution (e.g. insurers other than LIC), a procedure that is suspended or older than 180 days, or a dispute — a person looks at it (FL-17, FL-44) |

Thresholds, timelines (banks: 15 days, compensation at least Bank Rate + 4%; mutual funds: 21 days; LIC: 15 days from intimation, 45 if investigated, Bank Rate + 2%) and their sources live in `procedures/procedures.ts`, not in the rule — see [docs/SOURCE_VALIDATION.md](docs/SOURCE_VALIDATION.md) §3. Bank limits use the RBI floor unless the bank publishes a higher one (ICICI ₹2 crore); co-operative banks ₹5 lakh.

When a fact is missing the rule asks one question (nominee? joint holder? roughly how much? your relationship?) instead of guessing. A checked, dated balance or value beats the family's estimate. The entitlement check (G4) fills in nominee or joint holder when that is how the person is entitled. Explanations are written into the procedure, not generated by AI.

### 11.2 Procedures (FL-12, FL-44)

Each procedure (`procedures/procedures.ts`) has a version, regulator source, check date, status (active / suspended), timeline, where to submit, and per path the documents (required vs optional, with notes) and any extra declarations. Only what the source lists is required; anything an institution *may* ask for is a note. Each claim records the procedure id, version and check date. Suspended procedures, procedures older than 180 days, and institutions without a procedure send the claim to review. Built: bank deceased-claim (RBI Directions 2025), mutual fund transmission (SEBI, 23 Jul 2026), LIC death claim (LIC + IRDAI master circular). Other insurers: to add.

### 11.3 Claim lifecycle

```
DRAFT → AUTHORITY_REVIEW → DOCUMENT_COLLECTION → PACK_REVIEW → READY_FOR_SUBMISSION
      → SUBMITTED (with receipt) | SUBMISSION_UNKNOWN (no receipt — reconcile before re-sending)
      → INSTITUTION_REVIEW → MORE_INFORMATION_REQUIRED → DOCUMENT_COLLECTION …
      → SETTLED | TRANSFERRED | PARTIALLY_SETTLED (remainder tracked) | REJECTED | UNRESOLVED_DISPUTE
```

- Before submission the status is **derived** from the facts (path chosen → entitled → required documents → declarations → approval), so it can't drift. After submission it only moves along recorded transitions (`rules/claim-lifecycle.ts`).
- The pack is shown only at G4 for that holding (FL-13). Pre-filled values come only from reviewed data: verified records, fields the family accepted, checked amounts — each with its source. A pack can't be ready while a required document or a declaration is missing.
- **Approval** (FL-14) binds the pack's SHA-256 over canonical JSON, recipient, channel and purpose; it expires after 15 minutes. Any change to the pack — including a corrected document field it uses (FL-26) — saves a new version and invalidates the approval. Unapproved drafts are updated in place; approved versions are kept.
- **MVP submission is manual:** the user downloads the approved pack and submits it; the product records the receipt or marks the submission unknown ("check before re-sending"). Repeating a submission never creates a second one (FL-36). The pack is frozen once submitted. The due date is the submission date plus the procedure's days; every open claim shows who it is waiting on.
- Outcomes need evidence; a rejection is never counted as recovery; claims progress independently (FL-16, FL-37).
- **PDF** (`backend/src/server/pdf/claim-pack.ts`, pdf-lib): a checklist and summary — documents, checked values with sources, where to submit, timeline, declarations, procedure source, and the pack version and fingerprint on every page. Marked as prepared by the claimant, not an official form; the claimant writes full account numbers themselves (we never hold them). Downloadable only under a live approval.

---

## 12. Legacy planning

**PRD:** FL-11, FL-31, FL-34 (MVP); FL-32, FL-33 (Later). The AI does not draft wills (PRD §3.3): the `will` draft kind was removed and replaced by "notes for your lawyer" (`lawyer_notes`).

Built: saved family notes, inventory gaps, planning drafts and contact-scope previews through the Keeper UI state. These are not a verified sharing or release service.

Remaining:

- **Reviewed snapshots/freshness:** a frozen reviewed inventory and consistently enforced freshness policy.
- **Trusted contacts:** current previews are intent only; verified recipients, sharing and release are not implemented.
- **Snapshot and export:** `LegacySnapshot` freezes the reviewed record with date and known gaps. Export requires owner approval, uses a short-lived download link, is audited, and warns that downloaded copies cannot be recalled.

---

## 13. AI layer

**PRD:** FL-38, FL-39, FL-40, FL-53, §10.4 guardrails. **Built** in `backend/src/server/ai/`.

### 13.1 Provider design

- `provider.ts` defines the interface; `gemini.ts` implements it; `fixture.ts` returns canned responses (and optional fake embeddings) for tests; `index.ts` exposes `complete`, `completeJson`, `completeWithHistory` and `embedTexts`.
- **Embeddings** (for §13.5): `GEMINI_EMBEDDING_MODEL` (default `gemini-embedding-001`) at `GEMINI_EMBEDDING_DIMS` (768), normalised to unit length, task type `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY`, batches of 100.
- **Auth:** `GEMINI_API_KEY` (free tier, the configuration we use), else Vertex AI (`GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, default `asia-south1`) — kept in code for a future paid setup but **not used** (it bills), else "not configured": intake uses rules, documents use OCR and text rules, questions return matching passages, drafts are off. Never fake output.
- **Free-tier terms:** Google may use unpaid-tier prompts to improve its products and human reviewers may read them; personal information must not be sent. **Synthetic data only** ([FREE_TIER_PLAN §4](docs/FREE_TIER_PLAN.md#4-what-the-free-ai-terms-mean)).
- **Models:** `GEMINI_MODEL` (default `gemini-flash-latest`), fallbacks `GEMINI_FALLBACK_MODELS` (default `gemini-3.5-flash,gemini-flash-lite-latest`). Model aliases change; pin explicit versions before the Pilot and record them per response.
- **Retries:** transient errors (429/5xx/UNAVAILABLE) get one retry after 800 ms, then the next model; 404 skips to the next model; others fail fast. Overall timeout `AI_TIMEOUT_MS` (45 s).
- System prompts go in `systemInstruction`; JSON calls set `responseMimeType: application/json` and are **validated with Zod** before use.
- **Rate limit:** per session, `RATE_LIMIT_AI_PER_MINUTE` (20). Per instance in v0; move to the database before running more than one instance (Memorystore has no free tier). The free Gemini tier also has its own per-minute and per-day limits — callers already degrade when it refuses.

### 13.2 Where AI is used

| Use | Route | AI may | AI may not |
| --- | --- | --- | --- |
| Intake classification | `/api/intake` | Classify situation, ask follow-ups | Create holdings before G3 (mentioned institutions become "assumptions") |
| Document extraction | `/api/documents` | Propose fields with page references | Accept fields; store unredacted identifiers |
| Death-certificate scan | `providers/death-proof.ts` | Read the certificate | Decide the match — code compares fields |
| Ask about this case | `/api/ai/ask` | Answer from retrieved sources (§13.5) with numbered citations | See data above the user's gate; answer procedure questions from memory |
| Checklists and drafts | `/api/ai/checklist`, `/api/ai/draft` (kinds: `followup`, `lawyer_notes`, `expert`) | Draft letters, notes for a lawyer and checklists | Send anything; give legal advice; draft a will (the `will` kind was removed) |

### 13.3 Safety rules

- **Grounding:** prompts include only the masked, gate-appropriate case view and passages retrieved for the question (§13.5).
- **Prompt injection:** document text and retrieved passages are fenced (`<<<` … `>>>`) and labelled as reference material, not instructions; model output can never trigger a tool, change a gate or alter permissions.
- **No invented facts:** if a value isn't in the evidence, the answer says so.
- **Data to AI:** synthetic data only. The free tier's terms rule out personal data, so real cases either run without AI or wait for an approved paid tier with no-training terms (D-05, FL-46; FREE_TIER_PLAN §4).
- **Logging (to build):** store model, model version and prompt template version with each answer; never log raw sensitive inputs. Today only the question and answer are saved (`QaMessage`).

### 13.4 Case manager

Today the "case manager" is the deterministic **journey engine** (next-best task, dependencies, stage) plus AI routes. The PRD's single case manager (FL-38) is built by adding a coordinator that reads saved case facts and proposes the next step as a typed action card; consequential actions always go through an approval screen.

### 13.5 Retrieval for the case assistant (RAG)

**PRD:** FL-38, FL-39, FL-06, FL-12. Code: `backend/src/server/knowledge/`. Issue #43.

```
question ─► sync procedure library (once per process; changed passages replaced by content hash)
         ─► if the discovery gate is reached: (re)chunk the case's extracted documents
             (summary + extracted fields + redacted text, ~700 chars, 120 overlap)
         ─► keyword ranking (BM25; negations like "no nominee" become their own token)
         ─► + vector ranking (cosine) when an embedding model is configured; missing vectors filled lazily (≤200 per query)
         ─► reciprocal-rank fusion (k = 60) → top 6; an off-topic question returns nothing
         ─► prompt: [1] case file + [2..n] passages, fenced as data
         ─► answer with [n] citations; citations to sources that weren't retrieved are removed
```

- **Two sources.** The **procedure library** (`library.ts`) is a plain-language summary of each official source in [docs/SOURCE_VALIDATION.md](docs/SOURCE_VALIDATION.md) — RBI, SEBI, IRDAI, LIC, discovery portals — plus the official resources directory. Each passage carries the link and the date it was checked; passages not confirmed on an official page say so in their text. **Case documents** are the same redacted text the family can open in field review, searched only once `canDiscover()` is true, and redacted again on the way out.
- **Storage:** `KnowledgeChunk` (scope `library` or `case`; vectors as JSON with the model name). PostgreSQL currently keeps these JSON vectors too; pgvector is not installed or implied by the provider switch.
- **Without a key:** search is keyword-only and the route returns the best-matching passages (`mode: "passages"`) instead of a 503.
- **Response:** `{ mode, answer, sources[{ n, kind, title, publisher, url, checkedOn, documentId, excerpt }], grounded, retrieval, caseDocumentsSearched }`. The panel lists the cited sources; official pages open in a new tab, documents open in the case. Answers are saved to `QaMessage`.
- **Quality:** `test/rag.test.ts` holds an evaluation set of family questions → the passage(s) that answer them; each must be in the top 3 with keyword search alone, and top-1 accuracy must stay ≥ 75%. Add a question whenever a passage is added.
- **Limits:** keyword search is English-only (Hindi questions need the embedding model); the library is only as current as SOURCE_VALIDATION.md — re-check it on every regulator circular.

---

## 14. Voice

**PRD:** FL-20, FL-41. Implemented with unresolved provider/device acceptance; see [VOICE](docs/VOICE.md).

### 14.1 Design

Explicit capture uses frontend recorder/SpeechInput helpers in `frontend/src/keeper/voice.ts`, server transcription in `backend/src/server/speech/` and `POST /api/stt`. Input order: Sarvam, same-recording Gemini fallback, browser recognition where available. AI consent, MIME/size limits, rate limits and bounded requests apply. Quiet nonempty recordings are sent rather than discarded by amplitude. Permission waits time out visibly and late streams are released.

Browser speech and Gemini TTS provide replies; failures preserve text and show an unavailable notice. Sarvam TTS is not integrated into reply output. No Cloud Speech/TTS or Vertex service is required. Raw audio is not stored. Typed/manual transcript input remains available; endpointing can send completed call turns automatically. Approval remains structured.

### 14.2 Done when

Latest synthetic English STT passed HTTP 200; Gemini TTS returned 429 quota exhaustion (app 503). Actual microphone capture/audible playback require device acceptance. Test each language with noise, accents, quiet speech, interruption, denial and case switching. All-language reliability/full-duplex real-time voice is not claimed.

---

## 15. API design

### 15.1 Conventions

- Route handlers are thin: **validate (Zod) → call `src/server` → respond.**
- Identity: `x-session-id` only in explicit local synthetic demo mode; hosted mode verifies Supabase identity (§16.1).
- Errors: non-2xx with `{ "error": string }` plus `nextGate` (403) or `frozen` (423) where relevant.
- Status codes: 400/422 validation, 403 gate locked, 404 not found or not yours, 409 version conflict, 413 too large, 415 unsupported file, 423 frozen, 429 rate limited, 503 AI not available.
- JSON-in-string database fields are always parsed before responding.
- Retry safety exists for search request IDs, agent turns, claim creation and workflow revisions/leases. General mutable-record versioning and cursor pagination are not universal.

### 15.2 Endpoints

| Method | Path | Purpose | Gate | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | Health check | — | Built |
| GET | `/api/resources` | Official portals directory | — | Built |
| POST | `/api/intake` | Conversational intake; creates case | G0 | Built |
| POST | `/api/demo` | Load a demo case | G0 | Built |
| GET | `/api/cases`, `/api/cases/:id` | List cases; case workspace (masked) | Owner | Built |
| POST | `/api/cases/:id/proofs/:kind` | Identity / death / relationship proof | → G1/G2/G3 | Built (mock providers) |
| POST | `/api/assets`, PATCH `/api/assets/:id` | Add / update holdings | G3 | Built |
| POST | `/api/assets/:id/entitlement` | Per-asset entitlement proof | → G4 | Built (mock) |
| POST | `/api/documents`, PATCH `/api/documents/:id` | Upload + extract (AI or OCR + rules); change a document's type (values are reviewed with PUT …/review) | G3 for deceased | Built |
| GET | `/api/documents/:id` | Stored, redacted text of one document, for field review | G3 for deceased | Built |
| PATCH | `/api/tasks/:id` | Update a journey task | Owner | Built |
| POST | `/api/ai/ask`, `/api/ai/draft`, `/api/ai/checklist` | Q&A, drafts, checklists | Owner | Built |
| GET/POST | `/api/consent` | Consent per case and source | Owner | Built |
| GET | `/api/cases/:id/messages` | Restore saved messages | Owner | Built |
| GET/PUT | `/api/cases/:id/keeper` | Saved conversation/UI state; activity is returned by the case workspace | Owner | Built |
| POST | `/api/claims` | Start a claim for a confirmed holding (idempotent) | G3 | Built |
| GET / PATCH | `/api/claims/:id` | Claim, path, pack, timeline / answers, checklist, declarations | G3 (pack shown at G4) | Built |
| POST | `/api/claims/:id/approve` | Approve the exact pack (hash) | G4 | Built |
| GET | `/api/claims/:id/pack` | Approved pack as PDF | G4 + live approval | Built |
| POST | `/api/claims/:id/submission`, `/api/claims/:id/update` | Record submission; record what the institution did, outcome, reopen | G4 | Built |
| PUT | `/api/documents/:id/review` | Per-field review decisions | G3 for deceased | Built |
| GET/POST | `/api/cases/:id/searches` | Scoped dated search outcomes/history | Discovery | Built |
| POST | `/api/cases/:id/legacy/snapshot`, `/api/legacy/:id/export` | Legacy snapshot and export | Owner | To build |
| POST | `/api/stt`, `/api/ai/speak` | Transcription / server reply audio | Session + AI consent | Built; quota/device limits |
| DELETE | `/api/privacy/data` | Delete Keeper app records after confirmation | Session/account owner | Built |
| GET/POST | `/api/documents/:id/progress` | Document checks / retry preparation | Discovery | Built |
| GET/POST | `/api/cases/:id/agent-work` | Bounded preparation, pause/resume/reconcile | Discovery | Built |
| GET | `/api/cases/:id/evidence` | Canonical evidence graph | Discovery | Built |
| GET/POST | `/api/claims/:id/workflow`; POST `/api/workflows/:id/advance` | Saved claim review | Discovery | Built |
| GET | `/api/ready` | Configured readiness | Route-specific | Built |
| — | `/api/auth/*` | OAuth/PKCE/config/session/logout; exact methods in code | Route-specific | Built; provider setup pending |
| — | `/api/cases/:id/connectors/*`, `/api/console/*` | Connectors, Verify console | — | Later (§22) |


---

## 16. Security and privacy

**PRD:** FL-18, FL-19, FL-45, FL-46, FL-48; PRD §11.

### 16.1 Authentication

Local `AUTH_MODE=demo` accepts synthetic browser sessions. Hosted mode verifies the Supabase user, uses OAuth/PKCE, state and HttpOnly cookies, and maps ownership to immutable account identity. Browser headers cannot grant hosted access. Google OAuth code is built; the inspected project has Google disabled and hosted acceptance remains pending. Do not infer a dedicated User table, completed fresh re-authentication for every sensitive operation or financial authority from login. Phone OTP is excluded.

Access denials are recognised across Response constructor realms used by the Node adapter. Foreign document/asset/claim IDs, freeze and discovery gates are enforced in code.

### 16.2 Data protection (built unless noted)

| Control | Implementation |
| --- | --- |
| Masking by default | `masking.ts` on every asset response below G4 |
| PAN | Stored only as HMAC (`PAN_HASH_SECRET`, required in production) |
| Redaction before storage | Identifiers removed from stored document text, extracted fields, the intake and Q&A logs, and Keeper's saved conversation and draft state |
| No raw originals | Original files are not stored (read, extract, forget) |
| Encryption at rest | Google Cloud default encryption for whatever database is chosen (FREE_TIER_PLAN §3) |
| Encryption in transit | HTTPS only (Cloud Run) |
| Secrets | Secret Manager; never in the repo or logs |
| Upload safety | Size limit, byte sniffing (built); malware scanning (not built — no free scanner chosen yet) |
| Rate limiting | Per session on AI routes (built); in the database before more than one instance |

### 16.3 Audit

`CaseEvent` records case activity and is displayed through the workspace/activity view. Field review and claim/agent receipts retain their own histories. General sensitive-read auditing, immutable external audit retention and operator review remain open. No `/audit` route is implemented; do not put secrets or source contents in logs.

### 16.4 Deletion and retention

**Built (FL-19):** `DELETE /api/privacy/data` requires DELETE confirmation and removes the requesting session/account's Keeper records with cascades and auth-cookie clearing. Google/Supabase identities, provider copies and all backups are outside this deletion. Retention automation, legal-hold exceptions and restore/deletion reconciliation remain open.

### 16.5 Before real data

1. Real authentication (Google sign-in).
2. Production PostgreSQL recovery, backup/retention and account-isolation acceptance (FREE_TIER_PLAN §3).
3. Malware scanning.
4. AI terms that allow personal data — the free Gemini tier does not (FREE_TIER_PLAN §4) — or real cases run without AI.

(`custom.db` was purged from git history on 17 Oct 2026.)
5. Threat model and DPDP privacy assessment reviewed — drafts in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) and [docs/PRIVACY_ASSESSMENT.md](docs/PRIVACY_ASSESSMENT.md).

---

## 17. Reliability, operations and deployment

**PRD:** FL-40, FL-51, FL-52.

### 17.1 Deployment

- **Google Cloud Run**, deployed **from source with buildpacks** (`gcloud run deploy --source .` or continuous deployment from the repository), as **two services**: `backend/` first, then `frontend/` built with `BACKEND_URL` set to the backend's URL. **No Dockerfile, docker-compose or Caddy.**
- Backend scripts: `build` generates the selected client through `scripts/database.mjs`; `start` runs `tsx --env-file-if-exists=.env src/index.ts`; `postinstall` generates the SQLite client. Setup is explicit, never part of startup. Frontend: `build` = `next build`; `start` = `next start`.
- **Database:** external Supabase PostgreSQL, private `keeper` schema, strict TLS and small pool. Hosted startup rejects SQLite. See [HOSTED_MVP_SETUP](docs/HOSTED_MVP_SETUP.md); public deployment is not established by local tests.

### 17.2 Operating

- `/api/health` for uptime checks.
- **To build:** structured JSON logs with request IDs; no sensitive values. Cloud Logging's free tier (50 GiB a month) covers it.
- Error reporting and basic metrics through Cloud Logging and Monitoring free tiers.
- AI failures degrade gracefully: the user keeps their work and sees the next usable step (FL-40).
- Long operations (extraction, pack generation) show progress; move to a job table with retries when they exceed request time limits (FL-51).
- Working targets (to confirm under D-07): assistant reply starts within ~2 s; a typical statement extracted within ~30 s.

### 17.3 Running without a cloud key

Built: without any key the app runs all three journeys — rule-based intake, local OCR and text rules for documents, keyword search returning matching passages, deterministic gates and claim rules. Only drafting (letters, lawyer notes, checklists) needs the model. A runtime fixture provider (`AI_PROVIDER=fixture`) is not needed and is no longer planned.

### 17.4 Reference workload

Used to measure FL-52 before agreeing production targets (D-07): one Cloud Run instance (1 vCPU, 2 GB), 5 concurrent synthetic users, 20 cases, 200 holdings, 100 documents of up to 20 pages. Record p95 latency for ordinary requests (working target < 1 s), time to first assistant token (< 2 s), extraction time per document (< 30 s for a typical statement), AI cost per case, and recovery after an instance restart. These are engineering acceptance targets, not customer promises.

### 17.5 Demo operations

Demo fixtures are created through `POST /api/demo`; persistent storage survives ordinary restarts. Use scoped deletion or disposable test databases for cleanup; never assume restart resets data. Every demo and mock is visibly labelled "Simulated".

---

## 18. Configuration

Backend variables are listed in `backend/.env.example`; the frontend has one, `BACKEND_URL` (`frontend/.env.example`). Secrets come from Secret Manager in deployed environments.

| Variable | Purpose | Used now |
| --- | --- | --- |
| `DATABASE_URL`, `KEEPER_DB_PROVIDER` | Select SQLite or private-schema PostgreSQL and its separate client | Yes |
| `AUTH_MODE` | Local synthetic demo or verified Supabase identity | Yes |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (legacy `SUPABASE_ANON_KEY`) | Hosted account authentication | Code built; provider setup pending |
| `PUBLIC_APP_URL` | Same-origin OAuth/cookie origin; HTTPS required in production | Yes |
| `PORT` | API listen port; Cloud Run provides it | Yes |
| `BACKEND_URL` (frontend build) | Same-origin API proxy target; rebuild when changed | Yes |
| `SARVAM_API_KEY`, `SARVAM_STT_MODEL`, `SARVAM_LANGUAGE` | Primary speech transcription and language hint | Yes |
| `GEMINI_AGENT_MODEL`, `GEMINI_STT_MODEL` | Agent/transcription model overrides | Yes |
| `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE` | Server speech output; provider quota applies | Yes |
| `GEMINI_API_KEY` | Gemini API key, free tier (Secret Manager on Cloud Run) | Yes |
| `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` | Vertex AI — kept for a future paid setup; leave empty | Read, not used |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS` | Model selection | Yes |
| `GEMINI_EMBEDDING_MODEL`, `GEMINI_EMBEDDING_DIMS` | Embeddings for the case assistant's search (§13.5) | Yes |
| `OCR_LANGS`, `OCR_MAX_PDF_PAGES` | Local OCR languages and scanned-PDF page limit (§8.1) | Yes |
| `AI_TIMEOUT_MS` | AI call timeout (45 000) | Yes |
| `RATE_LIMIT_AI_PER_MINUTE` | AI rate limit per session (20) | Yes |
| `PAN_HASH_SECRET` | HMAC key for PAN (required in production) | Yes |
| `MAX_UPLOAD_MB` | Upload size limit (8) | Yes |
| `LIVE_AI` | Tests only: `LIVE_AI=1` lets tests call the real model | Yes (tests) |

Unused variables (connector modes, console key, demo mode, log level) were removed from `.env.example` on 17 Oct 2026; they return with the feature that needs them.

Production startup validates PostgreSQL/private schema, Supabase authentication configuration and HTTPS origin. PAN hashing separately requires its configured HMAC secret in production. Passing startup is not proof of provider setup, device voice or hosted acceptance.

---

## 19. Testing and evaluation

**PRD:** FL-53, FL-55; PRD §15.1. **18 Oct audit:** 213 backend tests (207 regression + 6 OCR separately) and 75 frontend tests passed. Live synthetic probes separately exercised persistence, AI and STT; Gemini TTS exhausted quota. These do not establish real-device/all-language/security/accessibility acceptance. See [CURRENT_STATE](docs/CURRENT_STATE.md) and [AI_EVALUATION](docs/AI_EVALUATION.md).

| Level | Tool | Must cover |
| --- | --- | --- |
| Unit | Vitest | Gate engine, masking, name matching, redaction, claim-path rules, totals, evidence-status transitions |
| Route | Vitest calling route handlers with a temporary SQLite DB and the fixture AI provider | 404 for foreign IDs; 403 below gate; 423 frozen; no asset data below G3; no full identifiers below G4; duplicate-deceased freeze; upload rejection by type and size |
| End-to-end | Playwright | All three journeys on demo data, including failure paths (wrong date of death → review; frozen case; missing document; rejected claim) |
| Live AI | Vitest, only with `LIVE_AI=1` | Gemini text and JSON calls still work (never in normal CI) |
| AI evaluation | Labelled set of synthetic Indian bank statements, CAS, policy bonds, death certificates — including adversarial documents ([docs/AI_EVALUATION.md](docs/AI_EVALUATION.md)) | Critical-field accuracy reported separately; any false "verified", gate bypass or wrong disclosure fails the release (FL-53) |
| Accessibility | Playwright + axe | WCAG 2.2 AA checks on core screens (FL-50) |

**CI (built):** `.github/workflows/ci.yml` on every PR and push to main — install, type-check, lint, tests, production build. Free: GitHub Actions includes 2,000 minutes a month for private repositories. End-to-end tests to add.

**Traceability (FL-55):** each test names the FL IDs it covers.

---

## 20. Gap analysis against the PRD MVP

| Area | Built/verified locally | Open |
| --- | --- | --- |
| Conversation | AI/rules, saved messages and return briefing | Larger quality/latency corpus |
| Authority | Deterministic gates, masking, freeze, mock providers | Real providers, proof expiry, operator review/unfreeze |
| Authentication | Supabase Google OAuth/PKCE and account guards | Provider setup and hosted acceptance |
| Persistence | Supabase PostgreSQL, strict TLS, restart checks; SQLite tests | Production recovery, backup/retention policy and migrations |
| Documents | OCR/extraction/redaction/review; document-to-claim progress | Malware scan; broad handwriting/layout/language evaluation |
| Discovery/evidence | Scoped self-reported searches, four statuses, dated amounts, duplicates, evidence map | Approved live connectors; institution verification; holds |
| Claims | Bank/MF/LIC, versioned packs, approval/PDF/handoff and recorded outcomes | More insurers, operator queue, real submissions/responses |
| Legacy | Saved notes/gaps/contact previews | Snapshot export and verified sharing/release |
| Agent | Durable bounded case work/claim review | No always-on monitoring; broader adversarial acceptance |
| Voice | Sarvam/Gemini/browser input, browser/Gemini output | TTS quota, actual-device/per-language acceptance |
| Privacy/activity | Activity, AI consent and app-data deletion | Retention automation, grievance/processor/backups policy |
| Quality | 288 dated automated checks and synthetic live probes | Production OAuth/deployment, accessibility/workload/full corpus |

---

## 21. Build plan

### Phase A — Hackathon (AI Builder Cup, due 18 Oct 2026)

| # | Milestone | Status |
| --- | --- | --- |
| M0 | Security cleanup (DB removed and purged from history, Docker/Caddy removed, `/api/health`, `.env.example`) | Done |
| M1 | Gemini provider, fixture provider, fallbacks, rate limits | Done |
| M2 | Schema, trust gates, masking, name matching, one case per deceased, audit events | Done |
| M3 | Gate UI: proof screens; locked, masked and frozen states | Done |
| M4 | Discovery: document pipeline (AI, OCR, rules) and realistic synthetic demo — **done**; guided search outcome logging — built | Done locally |
| M5 | Verify console — demo of the Later capability FL-56, labelled "Simulated" | Built as a local demo: [VERIFY_DEMO](docs/VERIFY_DEMO.md) |
| M6 | Claim paths (§11.1) and packs for bank, mutual fund and LIC; approve + receipt | Done (B6, #16) |
| M7 | Deploy to Cloud Run on the free tier ([docs/CLOUD_SETUP.md](docs/CLOUD_SETUP.md)) — deployer handles account/project setup | Not verified |

Phase A does not change PRD scope. Mock connectors and the Verify console may appear in the hackathon demo only, labelled "Simulated". The original plan (`BACKEND_PLAN.md` v3) is in git history.

### Phase B — PRD MVP (after the hackathon)

Ordered so that each step leaves a working product:

| # | Work | PRD |
| --- | --- | --- |
| B1 | **Built:** test/typecheck/lint/build scripts and CI; current audit in CURRENT_STATE | FL-50–FL-55 |
| B2 | **Implemented/locally validated:** Supabase PostgreSQL; production recovery/backup and migration acceptance remain | FL-51 |
| B3 | **Implemented:** Supabase Google OAuth/PKCE; provider configuration and two-account hosted acceptance remain | FL-45, FL-48 |
| B3a | Gate completion: proof expiry, reviewer and reason on proofs, nominee/executor/joint-holder routes to G3, encrypted full identifiers for G4 | FL-03, FL-04 |
| B4 | **Done (#14):** evidence statuses, observations, field review, totals, duplicates | FL-06–FL-09, FL-26, FL-28, FL-29 |
| B5 | **Built locally:** guided search outcomes and official handoffs | FL-10 |
| B6 | **Done (#16):** claims model, versioned procedures (bank/FD, MF, LIC), packs, approval, manual submission, outcomes. Open: procedures for other insurers | FL-12–FL-16, FL-36, FL-37, FL-44 |
| B7 | Legacy record, trusted contacts (intent), snapshot, export | FL-11, FL-31, FL-34 |
| B8 | **Implemented:** voice fallbacks and bounded coordinator; quota/device/language acceptance and hardening remain | FL-20, FL-38, FL-39, FL-41 |
| B9 | **Built:** activity, app-data deletion and follow-up preferences. Open: holds, operator queue/unfreeze, help and guaranteed reminders | FL-17–FL-19, FL-42, FL-43, FL-47, FL-49 |
| B10 | AI evaluation set, accessibility pass, metrics, reference-workload measurement (§17.4) | FL-46, FL-50, FL-52, FL-53, FL-54 |

### Phase C — Pilot readiness

Real providers where approved, production database recovery/backup acceptance, malware scanning, AI terms that allow personal data (or AI off for real cases), threat model, DPDP assessment, pinned AI models, runbooks — per [PRD §15.2](PRD.md#152-pilot--may-start-when), within the free-tier rule ([docs/FREE_TIER_PLAN.md](docs/FREE_TIER_PLAN.md)).

### M9 — Service extraction (done 18 Oct 2026)

The API now runs as its own service (`backend/`, Hono), separate from the web app (`frontend/`, Next.js), with shared types and pure claim rules in `shared/`. Both deploy from source on Cloud Run. Still to decide: service-to-service protection (the backend is currently public, like the API was) and a shared store for rate limits.

---

## 22. Later capabilities

Designed but switched off in the MVP. Each needs its own gate (PRD §15.3).

| Capability | Design | PRD |
| --- | --- | --- |
| **Connectors** (Gmail read-only, tax record AIS/26AS, consolidated statements via email, Android SMS companion) | §9.2 interface; mock mode for demos | FL-27 |
| **Verify console** for banks and insurers | Institution claim queue; check results (model to add): cross-document consistency, authenticity signals (flagged, not proof), duplicate claims, completeness; **risk score computed by code**, never by the AI; approve / request documents / escalate, all logged. Access via real institution accounts | FL-56 (Later) |
| Account Aggregator, DigiLocker | Behind the provider/connector interfaces after approval | FL-27, D-03 |
| Direct claim submission | Through permitted institution channels, with execution-time checks and receipts | FL-35 |
| Family collaboration, sharing and release after death | Verified recipients, scoped and expiring access, release policy | FL-24, FL-32, FL-33 |
| External reminders and automated follow-ups | Email/SMS with opt-in; permitted calls | FL-42, FL-21 |
| More asset types | Shares/demat, IEPF, EPF, NPS, PPF/small savings, lockers — each through FL-30 | FL-30 |

---

## 23. Change control and superseded documents

- **One-pager → PRD → LLD.** Product behaviour changes in the PRD first; this LLD and the code follow in the same change.
- **Prisma schema** is the source of truth for data; **this LLD** for architecture and rules; **`DECISIONS.md`** records implementation decisions as they are made (newest last).
- **`BACKEND_PLAN.md`** (hackathon plan) and **`demo/`** (standalone hackathon demo) were removed on 17 Oct 2026 to keep the repo to what the product needs; both remain in git history. Phase A is summarised in §21.
- **`contracts/`** (`openapi.json`, `schema.sql`, `fixtures.json`) described the superseded Python/FastAPI design and was **removed** on 17 Oct 2026; it remains in git history. Once the MVP API stabilises, generate an OpenAPI spec from the Zod schemas.
- **LLD v0.4** (Python/FastAPI, Keycloak, Docker Compose, PostgreSQL RLS) is superseded by this version. Its useful rules — exact approvals, unknown-outcome reconciliation, append-only evidence, honest totals, deletion markers — are carried forward above.

### Changes in version 0.6 (17 Oct 2026)

- **Free tier only** (founder rule): Cloud SQL, Vertex AI, Memorystore, Cloud Storage for originals, phone OTP and Speech-to-Text dropped; Google sign-in; Gemini API key with synthetic data only; the permanent database is an open free-only decision. See [docs/FREE_TIER_PLAN.md](docs/FREE_TIER_PLAN.md).
- Status brought up to date: OCR, RAG, B4 and B6 built; tests and CI built; unused models, packages, env vars and the "Hello, world" route removed; model table rewritten (§5.1).

### Changes in versions 0.5 – 0.5.1

- Rewritten to describe the real codebase (Next.js/TypeScript, Prisma, Gemini, Cloud Run, no Docker), aligned to PRD v0.6 and BRD v0.3.
- Adds trust gates G0–G4 as the implementation of the PRD's authority model; four evidence statuses; claim lifecycle; voice design; API inventory with built/to-build status; gap analysis; phased build plan.
- MVP discovery is upload + guided official searches; connectors and the Verify console are Later.
- **0.5.1:** G3 accepts any evidenced claimant role (nominee, heir, executor, joint holder), not only close relatives; encrypted full identifiers designed for G4 and claim packs; IEPF moved to Later; discovery outcomes include blocked and failed; built vs to-build marked in §6, §9.1, §10.2; fixture provider at runtime and a reference workload (§17.3–17.4); every MVP requirement now has a build step in Phase B; Cloud Run described as the target, not current state.


### Keeper state adapter — 18 Oct 2026

The existing landing, sign-in, shell, conversation, voice controls, views and panels remain the application UI. The store serializes backend actions and exposes busy/error status. The adapter projects gated `CaseWorkspace` responses into the original Keeper types and calls the existing APIs for chat, assets, document extraction/review, tasks and claims. UI-only conversations, facts, family/contact-view drafts and source notes are saved through owner-scoped `/api/cases/:id/keeper` into `LegacyCase.keeperUi` (`backend/src/server/domain/keeper-ui.ts`) — **not** the `CaseEvent` audit table. Identifiers in the saved text are redacted before storage, verification states and document/sample sources are stripped, and the workspace `events` never include it; a copy left in `CaseEvent` by earlier code is moved and deleted on first read. This state cannot set gates, holdings, evidence or approvals. No actual family sharing is added.

`GET /api/cases/:id/messages` resumes historical intake/Q&A; fallback passage replies are saved. Case corrections use owner-scoped PATCH; asset owner/nomination edits use the existing discovery-gated PATCH. Original claim controls use the server path, pack and approval hash, and only record the family’s own submission. Verification forms are small cards inside the existing details panel. Failed chat retains its draft. Browser-only examples do not execute canonical case actions; consented sample conversation may use AI without accessing a canonical case.


### Refinement behavior — 18 Oct 2026

`presentation.ts` consolidates fragmented assistant turns and selects a next step from saved task/claim/document state. The original interviewer supplies focused information gathering; `backend.ts` projects authoritative server records and preserves self-reported context and follow-ups. UI metadata never grants a gate or evidence status. `attachments.ts` uses native IndexedDB for recoverable selected-file uploads; JSON metadata is scoped to its thread. Personal and example drafts use separate local caches.

`hasAiConsent` is checked before generation and semantic embedding; retrieval can explicitly use keyword-only mode. Consent is also required for image AI, drafting and checklist generation. No database schema change. Supabase account-authentication code is built but not enabled/accepted in the inspected runtime. Real financial-identity providers, institution connectors, sharing/release and direct submission remain unavailable. Personal protected-record operations remain gated; the UI explains unavailable checks rather than passing them through a mock provider.

### Voice agent — 18 Oct 2026

`src/keeper/agent.ts` (client loop), `src/components/keeper/agent-mode.tsx` (screen), `backend/src/server/ai/agent.ts` (prompt, schema, vetting), `POST/GET /api/ai/agent`. Per turn: the browser sends the utterance and the last few turns (identifiers redacted again on the server) with the case id; the server checks ownership, the AI opt-in and the rate limit, builds a snapshot from what the person may see (nothing below the discovery gate; masked holdings), asks Gemini for one JSON object `{say, actions, listen, finish}`, and returns only vetted actions with a `confirm` flag. The browser runs automatic actions through the normal `dispatch` (same owner-gated APIs as the buttons), holds the rest until a yes, records the turn with `agent.turn`, speaks the reply with the browser voice and listens again. Errors map to codes (`ai_consent_required` 403, `ai_unavailable` 503, `ai_unusable` 502) and the client falls back to the built-in interviewer.

### Calls and hand-off — 18 Oct 2026

The conversation opens in the text workspace; Call Keeper explicitly opens the voice room. Returning to typing closes that room. `frontend/src/components/keeper/agent-mode.tsx` is the call room (ringing, timer, mute, speaker, type, person, end; a sheet for the written conversation; a dialog for hand-off) and `frontend/src/keeper/agent.ts` is its loop. Keeper speaks through `speakKeeper` (`frontend/src/keeper/voice.ts`): `POST /api/ai/speak` returns Gemini speech as WAV, and any failure falls back to the browser voice for the rest of the call. `POST/GET /api/cases/:id/handoff` stores a `HandoffRequest` (`why`, redacted `note` and `transcript`, `status` requested, acknowledged or closed) and logs a case event; the planner's `handoff` flag (in `shared/contracts.ts` `AgentTurn`) and the person's own words both open the same dialog. No reviewer console exists, so the app says a request is saved and not yet picked up.

### Speech in Indian languages — 18 Oct 2026

`backend/src/server/speech/sarvam.ts` (client for Sarvam speech to text, language names, failure reasons) and `POST /api/stt` (multipart audio, 8 MB limit, same AI opt-in and rate limit, 403 / 503 / 429 / 413 / 415 with codes the app acts on). `frontend/src/keeper/sarvam-speech.ts` records one turn with `MediaRecorder`, decides when the person has stopped (`makeEndpointer`: a blip is not speech, a pause after speech ends the turn, 25 s cap, give up on a silent room), sends it, and exposes the same `SpeechInput` shape as the browser recogniser (`useSpeech` in `voice.ts`), so `useAgent` can use either. The detected language is passed to `POST /api/ai/agent` as `language`, which appends a one-line reply-in-this-language note to the planner prompt.


## Synthetic hosted MVP implementation update — 18 Oct 2026

- Supabase Auth PKCE is implemented server-side through same-origin /api/auth routes, HttpOnly access/refresh cookies and state verification. Hosted ownership uses a user verified by Supabase for every request; browser session IDs remain only in local demo mode. Financial gates are separate.
- The schema remains SQLite for local development. backend/scripts/database.mjs derives the PostgreSQL Prisma schema for hosted builds. The hosted URL must select the private keeper schema. Initial schema setup is explicit, never application startup. Local Supabase provisioning/persistence is validated. Production migration/restore and Google provider/hosted acceptance remain prerequisites.
- Guided search outcomes are structured, redacted append-only CaseEvents (guided_search_v1), keyed by request UUID; JourneyTask contains the latest completion evidence. APIs check owner, discovery gates, the case's official source and document ownership. Possible matches do not create verified holdings. Progress updates transactionally with the outcome.
- DELETE /api/privacy/data requires explicit DELETE confirmation and deletes the current account's Keeper Session and its cascading records, plus unreferenced deceased-person rows owned through those cases. Other accounts and shared public reference sources remain. The separate authentication-provider identity and processor/backups are outside this application-data deletion.
- Source-only Cloud Run staging copies each service with shared/ and excludes credentials and database files. The deployed runtime fails closed when PostgreSQL, private schema, hosted authentication or HTTPS app origin are missing.


### Durable claim-review implementation

ClaimWorkflow persists one row per claim with a cursor, JSON checkpoints, a revision, attempts, lease token/deadline and a review result. Workers claim rows by conditional update, checkpoint by matching lease token/revision, and recover expired leases. Each checkpoint rechecks the case discovery/freeze gate; pack preparation uses the existing canonical claim service. Retry replays safe review steps and never external submission. A local process timer and authenticated request-driven advancement share the same lease path. Public GETs are read-only. Schema setup is explicit, never automatic startup. Case/claim deletion cascades workflows.

### Document and case preparation continuity — 18 October 2026

`document-progress.ts` derives source-review, holding-match, authority, pack and external-institution stages. Upload returns progress; review/confirmation can idempotently create drafts. Deterministic draft IDs fence creation races. Only an eligible reviewed source policy can fill its exact requirement after entitlement. Successful review/confirmation survives preparation failure; retry is explicit. Multiple source-linked confirmed holdings receive separate drafts. Fields, ownership, authority, declarations, approval and submission remain user/institution decisions.

The distinct `CaseAgentRun` scans canonical evidence and refreshes up to five existing claims. Leased checkpoints, revisions and bounded retries fence stale work; paused runs never auto-restart. Conversation requests advance work; returning resumes eligible runs. `ClaimWorkflow` is the separate per-claim review. Neither completion means settlement. See [CASE_AGENT](docs/CASE_AGENT.md) and [EVIDENCE_WORKFLOWS](docs/EVIDENCE_WORKFLOWS.md).
