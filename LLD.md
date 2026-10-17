# Financial Legacy — Low-Level Design (LLD)

*How the product is built.*

| | |
| --- | --- |
| **Version** | 0.6 (draft for review) |
| **Date** | 17 October 2026 |
| **Sources of truth** | [ONE_PAGER.md](ONE_PAGER.md) (vision) → [PRD.md](PRD.md) (what the product does) → this LLD (how it is built). If this LLD conflicts with the PRD, the PRD wins and this LLD is corrected. |
| **Describes** | The real codebase in [`frontend/`](frontend/): Next.js + TypeScript + Prisma + Gemini, targeting Google Cloud Run (deployment is milestone M7, not yet done). **Free tier only** — every service must be free or within existing free credits ([docs/FREE_TIER_PLAN.md](docs/FREE_TIER_PLAN.md)). |
| **Replaces** | LLD v0.4 (separate Python/FastAPI backend, Keycloak, Docker). That design is no longer the target. The separate hackathon plan (`BACKEND_PLAN.md`) was folded into §21 and removed; it remains in git history. |
| **Status** | Built: M0–M3, the document pipeline with OCR, grounded Q&A (RAG), evidence statuses and field review (B4), claims (B6), tests and CI (B1). Not built: real sign-in, a permanent database, guided search outcomes, legacy record, voice, operations — see §20. |

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
- **"Built"** means present in `frontend/` today. **"To build"** means designed here but not yet implemented.

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
| We must learn cheaply | One web app, one database, one deployable service. Mocks behind interfaces, swapped for real providers without rewrites. |

---

## 2. Architecture overview

### 2.1 One deployable app

```
 Browser (phone or laptop)
   │  React UI (Next.js App Router, client components)
   │  x-session-id header (v0) → real sign-in (MVP)
   ▼
 Next.js on Cloud Run ──────────────────────────────────────────────────
 │ app/api/**        thin route handlers: validate (Zod) → call server → respond
 │ src/server/
 │   core/           session · access guards · gate engine · masking · crypto ·
 │                   rate limit · name matching · upload validation · http
 │   domain/         case service · journey engine · gates
 │   ai/             provider interface · Gemini adapter · fixture provider (tests)
 │   ocr/            Tesseract OCR · no-AI text rules
 │   knowledge/      procedure library · hybrid search · citations (RAG)
 │   providers/      identity · death proof · relationship · entitlement (mock now)
 │   rules/          evidence · observations · totals · duplicates · claim path · pack · lifecycle
 │   connectors/     connector interface · mock connectors       (Later)
 │   pdf/            claim-pack PDF (pdf-lib)
 │   procedures/     versioned, cited claim procedures
 │   data/           official resources · demo data · synthetic registries
 ▼
 Prisma ─► SQLite (v0) ─► permanent free database (open decision — FREE_TIER_PLAN §3)
 Gemini API key, free tier (text, vision, embeddings; synthetic data only)
```

### 2.2 The one-pager's six layers, mapped to code

| Layer (one-pager §7) | Where it lives | Status |
| --- | --- | --- |
| User experience | `src/app/page.tsx`, `src/app/(app)/*`, `src/components/fl/*` | Built (one route per area, DESIGN §2.1); voice to build |
| Identity and authorisation | `src/server/core/{session,access,gate-engine}.ts`, `src/server/providers/*` | Built with mock providers and session-based identity; real sign-in to build |
| AI orchestration | `src/server/ai/*`, `src/server/domain/journey-engine.ts`, AI routes | Built (Gemini + deterministic journey engine) |
| Financial integration | `src/server/data/resources.ts`, `ResourceVisit`, connector interface | Guided official resources built; connectors Later |
| Asset and document records | Prisma models, `api/documents`, `api/assets`, masking, `rules/`, `domain/evidence-service.ts` | Built: four evidence statuses, field review with history, dated amounts, totals, duplicates (§10) |
| Claims and workflow | `JourneyTask`, journey engine; `Claim`, `ClaimPack`, `Approval`, `domain/claim-service.ts` | Built: tasks and claims to outcome (§11) |

`src/server/` must never import from `src/app/` or React code, so it can later move into a standalone service with the same API (§21, M9).

---

## 3. Technology stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Node.js ≥ 22 | Cloud Run buildpacks |
| Web framework | Next.js 16 (App Router), React 19, TypeScript 5 | `frontend/AGENTS.md`: read the bundled Next.js docs before changing framework code — this version has breaking changes |
| UI | Tailwind CSS 4, shadcn/ui (Radix), lucide icons, sonner toasts, framer-motion | Accessible primitives from Radix |
| Validation | Zod 4 at every API boundary | Enums enforced by Zod (SQLite has no native enums) |
| Database | Prisma 6; **SQLite in v0**; the permanent database is an open decision limited to free options ([FREE_TIER_PLAN §3](docs/FREE_TIER_PLAN.md#3-decision-needed-the-permanent-database)) — Cloud SQL is not free | Provider switch only; no raw SQL |
| AI | Google Gemini via `@google/genai`, **free-tier API key** (Vertex AI code path kept but not used — it bills) | Provider interface + fixture provider for tests (§13) |
| PDF text | `unpdf` | Text layer first; scanned pages are rendered to images (`@napi-rs/canvas`) for OCR |
| OCR | `tesseract.js` (WASM, runs on the server) | English + Hindi by default (`OCR_LANGS`); used when there is no AI key or Gemini fails (§8.1) |
| Claim pack PDF | `pdf-lib` (MIT) | Standard fonts; "₹" written "Rs." (§11.3) |
| Tests | Vitest (unit and route); Playwright (end-to-end, to add) | 106 tests in `frontend/test/`; GitHub Actions CI on every PR (§19) |
| Deploy | Google Cloud Run, **from source via buildpacks — no Docker** | `npm run build`, `npm start`, listens on `$PORT` |
| Secrets | Google Secret Manager | Never in the repo |

`next-auth` and `next-intl` were removed (unused). Real sign-in (B3) uses Google sign-in through Identity Platform / Firebase Authentication, free up to 50,000 monthly active users.

---

## 4. Code layout

```
frontend/
  prisma/schema.prisma        data model (§5)
  src/
    app/
      page.tsx                landing
      (app)/                  start · cases · cases/[id]/{records[/documents[/[docId]]], plan, claims, steps, help} · resources
                              (cases/[id]/layout.tsx loads the case once for every area — components/fl/case-shell.tsx)
      api/                    route handlers (§15)
    server/                   all server-only logic (no React imports)
      ai/                     provider.ts · gemini.ts · fixture.ts · index.ts
      knowledge/              library.ts (official procedure passages) · search.ts (BM25, vectors, fusion) · retrieve.ts · citations.ts (§13.5)
      ocr/                    ocr.ts (Tesseract, scanned-PDF pages) · rule-extract.ts (no-AI extraction) (§8.1)
      db.ts                   Prisma client
      core/                   access.ts · crypto.ts · gate-engine.ts · http.ts · masking.ts ·
                              name-match.ts · rate-limit.ts · session.ts · upload.ts
      domain/                 case-service.ts · gates.ts · journey-engine.ts · intake-fallback.ts (rule-based intake)
      providers/              identity.ts · death-proof.ts · relationship.ts · entitlement.ts · types.ts
      data/                   resources.ts · demo-data.ts · death-registry.ts (synthetic)
        reference/            real public reference snapshot: fund schemes + NAVs, bank branches, pincodes, RBI rates (SOURCES.md)
        synthetic/            demo-case generator: real reference data + synthetic, masked people and identifiers
      rules/                  evidence.ts · observations.ts · totals.ts · duplicates.ts · claim-path.ts · claim-pack.ts · claim-lifecycle.ts (pure, deterministic)
      procedures/procedures.ts  versioned claim procedures (bank, mutual fund, LIC) with sources and check dates
      domain/claim-service.ts   applies the claim rules to stored claims, packs, approvals and events
      domain/evidence-service.ts  applies the rules to stored records (fields, review history, statuses, amounts, duplicates)
      pdf/claim-pack.ts       the approved pack as a PDF the family submits themselves
      connectors/             (Later) base.ts · mock/* · real/*
    lib/                      client-shared only: client.ts (fetch + session header) · types.ts · utils.ts · field-review.ts · journey.ts (six-step journey, action cards, legacy gaps) · start-message.ts · starters.ts
    components/
      fl/                     product components: landing, intake, case-shell, area pages, field-review, gate-panel, ask-panel …
      ui/                     stock shadcn components
  test/                       Vitest unit and route tests (test/.tmp holds the test database)
  scripts/                    fetch-reference-data.mjs (public reference snapshot) · make_test_pdf.py
.github/workflows/ci.yml      type-check, lint, tests and build on every PR
```

`ClaimView` (the claim page's data) is defined in `src/server/domain/claim-service.ts` and imported by the claim page as a type only — the one exception to keeping shared types in `src/lib/types.ts`.

Housekeeping done on 17 Oct 2026: the leftover "Hello, world" route was deleted, the package renamed to `financial-legacy`, and unused models and packages removed. `DECISIONS.md` is the decision log.

---

## 5. Data model

The Prisma schema in `frontend/prisma/schema.prisma` is the **source of truth for data**. The tables below summarise it and map it to the PRD's concepts ([PRD §12.1](PRD.md#121-the-main-things-the-product-keeps-track-of)).

### 5.1 Models

| Model | Purpose | PRD concept |
| --- | --- | --- |
| `Session` | Anonymous browser session (v0 identity) | Participant (temporary) |
| `LegacyCase` | One case: type, stage, progress, next-best action, `gateReached`, `frozenReason`, `deceasedPersonId`, `linkedCaseId` | Case |
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
| `ConsentRecord` | Per case and source: purpose, scope, status, expiry, revocation | Consent |
| `CaseEvent` | Append-only case timeline with event type and actor | Audit event |
| `IntakeMessage`, `QaMessage` | Intake conversation; saved assistant answers | Conversation |

Removed on 17 Oct 2026 because no code used them: `UserProfile`, `Signal`, `Institution`, `Draft`, `ResourceVisit`, `InstitutionClaim`, `CheckResult`, and the holding fields `verificationStatus`, `sourceSignalIds`, `institutionId`. Each comes back with the build step that needs it (e.g. a search-visit model with B5).

### 5.2 Changes required for the PRD MVP

| Change | Why | PRD |
| --- | --- | --- |
| **Built (#14):** `AssetRecord.evidenceStatus`: `self_declared \| potential_match \| document_backed \| institution_verified` (§10); `duplicateOfId`, `duplicateState` | PRD requires exactly these four labels | FL-07, FL-08 |
| **Built (#14):** `Observation`: `assetId`, `amount` (decimal string), `amountType`, `currency`, `asOfDate`, `label`, `sourceDocumentId`, `sourceFieldId`, `reviewedAt`, `reviewedBy`, `supersededAt` — append-only (`signalId` when discovery signals land) | Dated amounts with history; honest totals | FL-09, FL-28, FL-29 |
| **Built (#14):** `DocumentField` (per-field `state: proposed \| accepted \| corrected \| rejected`, `proposedValue`, `value`, `critical`, reviewer, reason) + append-only `FieldReviewEvent` (from/to state and value, reason, actor). `extractedFields` JSON keeps the AI's original proposal | Critical fields must be reviewed before use | FL-06, FL-26 |
| **Built (#16):** `Approval`: exact content hash, recipient, channel, purpose, expiry, state (active / used / expired / invalidated) | Approval of exactly what is sent | FL-14 |
| **Built (#16):** `Claim` (one per holding) with status, path, situation, procedure id/version/check date, checklist, declarations, owner and due date, submission and outcome; `ClaimPack` is now a versioned snapshot per claim (content + hash); `ClaimEvent` timeline; `AssetRecord.nomineeStatus` / `jointHolderStatus` | Claims tracked independently to an outcome | FL-09, FL-12–FL-16 |
| Add a search-visit model: portal, outcome (found / not found / partial / blocked / failed), resulting potential match | Guided discovery outcomes | FL-10 |
| Add `Hold`: scope, reason, created/resolved by | Pause specific actions | FL-47 |
| Add `LegacySnapshot`: frozen record, date, known gaps; `TrustedContact` (intent only) | Legacy planning | FL-11, FL-31, FL-34 |
| Add `User` + real auth link; replace session-only ownership | Real sign-in | FL-45, FL-48 |
| **Built:** money as **decimal strings** (`Observation.amount`, `Claim.outcomeAmount`), never floats | Exact amounts | FL-29 |
| **Built:** `insurance` category with the LIC claim procedure | Life insurance is in the MVP | PRD §8.1 |

Until the permanent database is chosen, schema changes are applied with `prisma db push` (no migration files). Once it is chosen, switch to versioned migrations (`prisma migrate`). Changes are reflected in `src/lib/types.ts`.

---

## 6. Case types and journeys

The code has seven case types (plus `general`), each driven by the deterministic journey engine (`src/server/domain/journey-engine.ts`). They map onto the PRD's three journeys:

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

**PRD:** FL-03, FL-04, FL-22, FL-23, FL-47. **Built** in `src/server/core/gate-engine.ts`, `access.ts`, `masking.ts`.

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

Mock providers are replaced behind the same interface (`src/server/providers/types.ts`). What is legally open to us ([docs/FEASIBILITY_AND_COMPLIANCE.md](docs/FEASIBILITY_AND_COMPLIANCE.md) §3):

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
          (src/server/ocr/rule-extract.ts) → quality "partial" at best, warning shown
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
2. **Guided official searches** from `src/server/data/resources.ts` (RBI UDGAM, SEBI MITRA / MFCentral, IRDAI Bima Bharosa and insurer searches, the government common landing portal; **IEPF is Later**, with shares and dividends). **To build (B5)** — today only the resources directory exists; a search-visit model will be added. The product will:
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
- **PDF** (`src/server/pdf/claim-pack.ts`, pdf-lib): a checklist and summary — documents, checked values with sources, where to submit, timeline, declarations, procedure source, and the pack version and fingerprint on every page. Marked as prepared by the claimant, not an official form; the claimant writes full account numbers themselves (we never hold them). Downloadable only under a live approval.

---

## 12. Legacy planning

**PRD:** FL-11, FL-31, FL-34 (MVP); FL-32, FL-33 (Later). The AI does not draft wills (PRD §3.3): the `will` draft kind was removed and replaced by "notes for your lawyer" (`lawyer_notes`).

To build:

- **Legacy record:** the planner's reviewed inventory plus a checklist — missing nominees, missing documents, stale records (older than the configured freshness), open steps.
- **Trusted contacts:** stored as **intent only**. Adding or changing one sends nothing and grants no access.
- **Snapshot and export:** `LegacySnapshot` freezes the reviewed record with date and known gaps. Export requires owner approval, uses a short-lived download link, is audited, and warns that downloaded copies cannot be recalled.

---

## 13. AI layer

**PRD:** FL-38, FL-39, FL-40, FL-53, §10.4 guardrails. **Built** in `src/server/ai/`.

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

**PRD:** FL-38, FL-39, FL-06, FL-12. Code: `src/server/knowledge/`. Issue #43.

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
- **Storage:** `KnowledgeChunk` (scope `library` or `case`; vectors as JSON with the model name). If the permanent database is Postgres, the vector column becomes pgvector; nothing else changes.
- **Without a key:** search is keyword-only and the route returns the best-matching passages (`mode: "passages"`) instead of a 503.
- **Response:** `{ mode, answer, sources[{ n, kind, title, publisher, url, checkedOn, documentId, excerpt }], grounded, retrieval, caseDocumentsSearched }`. The panel lists the cited sources; official pages open in a new tab, documents open in the case. Answers are saved to `QaMessage`.
- **Quality:** `test/rag.test.ts` holds an evaluation set of family questions → the passage(s) that answer them; each must be in the top 3 with keyword search alone, and top-1 accuracy must stay ≥ 75%. Add a question whenever a passage is added.
- **Limits:** keyword search is English-only (Hindi questions need the embedding model); the library is only as current as SOURCE_VALIDATION.md — re-check it on every regulator circular.

---

## 14. Voice

**PRD:** FL-20, FL-41 — **MVP requirement, not built.**

### 14.1 Design

- **Typed adapters:** `SpeechInput` (speech-to-text) and `SpeechOutput` (text-to-speech) under `src/server/voice/`, same pattern as the AI provider.
- **Provider (D-09, revised 17 Oct 2026 for the free-tier rule):** recognition with **Gemini audio understanding on the free API key** (synthetic data only) or the browser's built-in speech recognition; spoken replies with **Cloud Text-to-Speech** inside its free monthly quota (4M Standard / 1M Neural2 characters) or the browser's built-in voice. The earlier plan (Gemini on Vertex AI in Mumbai) is dropped because Vertex bills; Google Speech-to-Text is not offered in India and only 60 minutes a month are free. Choose at B8 after evaluating Hindi, Hinglish and Tamil. See [docs/FEASIBILITY_AND_COMPLIANCE.md](docs/FEASIBILITY_AND_COMPLIANCE.md) §7 and [docs/FREE_TIER_PLAN.md](docs/FREE_TIER_PLAN.md).
- **Launch languages:** **English (India), Hindi, Hinglish (mixed Hindi-English) and Tamil.** Each must pass its own evaluation ([docs/AI_EVALUATION.md](docs/AI_EVALUATION.md) §3.4) before it is offered.
- **Region:** the Gemini API key endpoint doesn't let us choose a region; any processing outside India is disclosed ([docs/PRIVACY_ASSESSMENT.md](docs/PRIVACY_ASSESSMENT.md) §6).
- **Flow:** user taps the mic (explicit action + browser permission) → audio streamed to the server → transcript shown for correction → corrected text sent through the normal conversation route → reply shown and optionally spoken.
- Raw audio is **not stored** by default; transcripts follow the conversation's retention.
- Names, account numbers and amounts from speech are always shown for correction before use.
- Stop, case switch or permission revocation cancels capture and playback.
- Voice never approves an action, verifies identity or changes an accepted fact.

### 14.2 Done when

Real microphone → transcript → corrected message → spoken reply works in all three journeys on desktop and mobile browsers, including: denied permission, silence, noise, stopping mid-reply, switching to text, Indian names, mixed language and spoken numbers — measured per supported language against D-09 thresholds.

---

## 15. API design

### 15.1 Conventions

- Route handlers are thin: **validate (Zod) → call `src/server` → respond.**
- Identity: `x-session-id` header in v0 (G0); real authenticated sessions in the MVP (§16.1).
- Errors: non-2xx with `{ "error": string }` plus `nextGate` (403) or `frozen` (423) where relevant.
- Status codes: 400/422 validation, 403 gate locked, 404 not found or not yours, 409 version conflict (to add), 413 too large, 415 unsupported file, 423 frozen, 429 rate limited, 503 AI not available.
- JSON-in-string database fields are always parsed before responding.
- **To add for the MVP:** idempotency keys on retryable writes (FL-36), version checks (`If-Match`) on mutable records, cursor pagination on lists.

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
| GET | `/api/cases/:id/messages` | Restore intake chat | Owner | To build |
| GET | `/api/cases/:id/audit` | Audit trail for the user | Owner | To build |
| POST | `/api/claims` | Start a claim for a confirmed holding (idempotent) | G3 | Built |
| GET / PATCH | `/api/claims/:id` | Claim, path, pack, timeline / answers, checklist, declarations | G3 (pack shown at G4) | Built |
| POST | `/api/claims/:id/approve` | Approve the exact pack (hash) | G4 | Built |
| GET | `/api/claims/:id/pack` | Approved pack as PDF | G4 + live approval | Built |
| POST | `/api/claims/:id/submission`, `/api/claims/:id/update` | Record submission; record what the institution did, outcome, reopen | G4 | Built |
| PUT | `/api/documents/:id/review` | Per-field review decisions | G3 for deceased | Built |
| POST | `/api/resources/:id/visit`, `/api/visits/:id/outcome` | Guided official search | G0 / G3 | To build |
| POST | `/api/cases/:id/legacy/snapshot`, `/api/legacy/:id/export` | Legacy snapshot and export | Owner | To build |
| POST | `/api/voice/session`, `/api/voice/transcript` | Voice capture and transcript | Owner | To build |
| DELETE | `/api/cases/:id`, `/api/session` | Delete case / all my data | Owner | To build |
| — | `/api/cases/:id/connectors/*`, `/api/console/*` | Connectors, Verify console | — | Later (§22) |


---

## 16. Security and privacy

**PRD:** FL-18, FL-19, FL-45, FL-46, FL-48; PRD §11.

### 16.1 Authentication

- **v0 (built):** anonymous session UUID in `localStorage`, sent as `x-session-id`. Acceptable only for synthetic demo data.
- **MVP (to build, B3):** **Google sign-in** through Identity Platform / Firebase Authentication — free up to 50,000 monthly active users (3,000 a day on the Spark plan). **Phone OTP is dropped** under the free-tier rule (17 Oct 2026): SMS is billed per message beyond 10 a day and Indian DLT registration has costs. The earlier phone-OTP decisions (DECISIONS.md) are superseded. The server issues its own session after Google sign-in. Server-side session, HttpOnly + Secure + SameSite cookies, idle and absolute expiry, fresh re-authentication (≤5 minutes) for approvals, exports and consent changes. Cases owned by `User`, not by browser session.

### 16.2 Data protection (built unless noted)

| Control | Implementation |
| --- | --- |
| Masking by default | `masking.ts` on every asset response below G4 |
| PAN | Stored only as HMAC (`PAN_HASH_SECRET`, required in production) |
| Redaction before storage | Identifiers removed from stored text and extracted fields |
| No raw originals | Original files are not stored (read, extract, forget) |
| Encryption at rest | Google Cloud default encryption for whatever database is chosen (FREE_TIER_PLAN §3) |
| Encryption in transit | HTTPS only (Cloud Run) |
| Secrets | Secret Manager; never in the repo or logs |
| Upload safety | Size limit, byte sniffing (built); malware scanning (not built — no free scanner chosen yet) |
| Rate limiting | Per session on AI routes (built); in the database before more than one instance |

### 16.3 Audit

`CaseEvent` is the append-only trail (actor, event type, time). **To build:** record every sensitive read, export, approval and outside action with actor, case, object, reason and request ID; expose it to the user (`/api/cases/:id/audit`); never put secrets or document contents in audit or application logs (FL-18).

### 16.4 Deletion and retention

To build (FL-19): delete case and delete-all-my-data endpoints; deletion revokes access immediately, cancels pending work and purges derived copies; retention periods set by D-05; backups expire on a schedule and restores honour deletion markers.

### 16.5 Before real data

1. Real authentication (Google sign-in).
2. A permanent database (FREE_TIER_PLAN §3).
3. Malware scanning.
4. AI terms that allow personal data — the free Gemini tier does not (FREE_TIER_PLAN §4) — or real cases run without AI.

(`frontend/db/custom.db` was purged from git history on 17 Oct 2026.)
5. Threat model and DPDP privacy assessment reviewed — drafts in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) and [docs/PRIVACY_ASSESSMENT.md](docs/PRIVACY_ASSESSMENT.md).

---

## 17. Reliability, operations and deployment

**PRD:** FL-40, FL-51, FL-52.

### 17.1 Deployment

- **Google Cloud Run**, deployed **from source with buildpacks** (`gcloud run deploy --source .` or continuous deployment from the repository). **No Dockerfile, docker-compose or Caddy.**
- Scripts: `build` = `prisma generate && next build`; `start` = `prisma db push --skip-generate && next start` (v0 SQLite); `postinstall` = `prisma generate`.
- **Database:** on Cloud Run, SQLite in `/tmp` (`DATABASE_URL=file:/tmp/finlegacy.db`) is wiped on every restart — demos only. The permanent database is an open, free-only decision ([FREE_TIER_PLAN §3](docs/FREE_TIER_PLAN.md#3-decision-needed-the-permanent-database)); once chosen, use versioned Prisma migrations (`prisma migrate deploy`). Environments: development now; production only when real users are approved. Setup: [docs/CLOUD_SETUP.md](docs/CLOUD_SETUP.md). Cloud Run runs with minimum instances 0 so nothing bills while idle.

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

Demo cases are loaded fresh per session with `POST /api/demo`; a separate reset endpoint isn't needed while SQLite resets on restart. Every demo and mock is visibly labelled "Simulated".

---

## 18. Configuration

All variables are listed in `frontend/.env.example`. Secrets come from Secret Manager in deployed environments.

| Variable | Purpose | Used now |
| --- | --- | --- |
| `DATABASE_URL` | Prisma connection | Yes |
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

**To build:** startup should refuse to run in production when `PAN_HASH_SECRET` is missing or when demo data would be served to real users.

---

## 19. Testing and evaluation

**PRD:** FL-53, FL-55; PRD §15.1. **Current state:** 106 Vitest tests in 11 files under `frontend/test/` — route tests against a throwaway SQLite database, the fixture AI provider, and no network calls to a model. Covered: intake fallback, journey stages, synthetic demo data, document text access, OCR and no-AI extraction, RAG retrieval with an evaluation set, field review, evidence statuses, amounts and totals, duplicates, claim paths, packs, approval and the claim lifecycle. **Not yet covered by dedicated tests:** the gate engine, masking, name matching, redaction and upload validation on their own (they are exercised indirectly by route tests).

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

| Area | PRD | Built | Gap |
| --- | --- | --- | --- |
| Intake and journeys | FL-01, FL-02, FL-22 | Intake with AI + fallback; 7 case types; journey engine | Restore chat (`/messages`); user correction of journey type |
| Trust gates and authority | FL-03, FL-04, FL-23 | G0–G4 with mock providers; guards; freeze; masking | Proof expiry, reviewer/reason, operator unfreeze, real providers |
| Real sign-in | FL-45, FL-48 | Session UUID only | **Google sign-in** (free); cases owned by users |
| Database | FL-51 | SQLite (wiped on Cloud Run restart) | **Choose a free permanent database** (FREE_TIER_PLAN §3); migrations |
| Documents | FL-05, FL-06, FL-25, FL-26 | Upload, sniffing, extraction (AI, OCR, rules), redaction; per-field review with history (#14); claim packs invalidated on a material change (#16) | Malware scan (no free option chosen) |
| Discovery | FL-10 | Resources directory | Discovery plan; search-visit model; outcome logging; no-result/partial states |
| Evidence and totals | FL-07–FL-09, FL-28, FL-29 | Four evidence statuses, append-only observations, honest totals, duplicate review (#14); nominee and joint-holder information (#16) | Holds (B9) |
| Insurance in MVP | PRD §8.1 | LIC death-claim procedure and pack (#16) | Procedures for other insurers |
| Claims | FL-12–FL-17, FL-36, FL-37 | Claim model, versioned procedures, path rules, packs + PDF, hash-bound approval, manual submission, outcomes, reopen (#16) | Operator review queue for claims sent to review (B9); reminders on due dates (B9) |
| Legacy | FL-11, FL-31, FL-34 | Legacy gaps list; "notes for your lawyer" drafts (no will drafting) | Legacy record, trusted contacts (intent), snapshot, export |
| AI | FL-38–FL-40, FL-46, FL-53 | Gemini, fallbacks; grounded Q&A with retrieval and citations (§13.5); retrieval evaluation set; synthetic data only | Case-manager coordinator; full AI evaluation set (AI_EVALUATION); per-answer model logging; AI terms that allow personal data — not available on the free tier (FL-46) |
| Voice | FL-20, FL-41 | — | **Not started**; free-tier provider to choose at B8 |
| Tasks and operations | FL-42–FL-44, FL-47, FL-49 | Journey tasks; versioned claim procedures (#16) | In-app reminders; operator queue; holds; help/complaints |
| Audit, deletion | FL-18, FL-19 | `CaseEvent` timeline | User-visible audit; delete endpoints; retention |
| Quality | FL-50–FL-55 | 106 tests, GitHub Actions CI (type-check, lint, tests, build) | Dedicated unit tests for gates, masking, redaction, upload; end-to-end tests; accessibility checks; metrics |

---

## 21. Build plan

### Phase A — Hackathon (AI Builder Cup, due 18 Oct 2026)

| # | Milestone | Status |
| --- | --- | --- |
| M0 | Security cleanup (DB removed and purged from history, Docker/Caddy removed, `/api/health`, `.env.example`) | Done |
| M1 | Gemini provider, fixture provider, fallbacks, rate limits | Done |
| M2 | Schema, trust gates, masking, name matching, one case per deceased, audit events | Done |
| M3 | Gate UI: proof screens; locked, masked and frozen states | Done |
| M4 | Discovery: document pipeline (AI, OCR, rules) and realistic synthetic demo — **done**; guided search outcome logging — moved to B5 | Partly done |
| M5 | Verify console — demo of the Later capability FL-56, labelled "Simulated" | Optional |
| M6 | Claim paths (§11.1) and packs for bank, mutual fund and LIC; approve + receipt | Done (B6, #16) |
| M7 | Deploy to Cloud Run on the free tier ([docs/CLOUD_SETUP.md](docs/CLOUD_SETUP.md)) — needs the project ID | Next |

Phase A does not change PRD scope. Mock connectors and the Verify console may appear in the hackathon demo only, labelled "Simulated". The original plan (`BACKEND_PLAN.md` v3) is in git history.

### Phase B — PRD MVP (after the hackathon)

Ordered so that each step leaves a working product:

| # | Work | PRD |
| --- | --- | --- |
| B1 | **Done:** tests, CI, leftovers removed. Still open: dedicated unit tests for gates, masking, redaction, upload | FL-55 |
| B2 | **On hold:** permanent database — choose a free option (FREE_TIER_PLAN §3), then migrations | FL-51 |
| B3 | Google sign-in (free); cases owned by users; re-authentication for sensitive actions; chat restore; journey-type correction | FL-01, FL-02, FL-45, FL-48 |
| B3a | Gate completion: proof expiry, reviewer and reason on proofs, nominee/executor/joint-holder routes to G3, encrypted full identifiers for G4 | FL-03, FL-04 |
| B4 | **Done (#14):** evidence statuses, observations, field review, totals, duplicates | FL-06–FL-09, FL-26, FL-28, FL-29 |
| B5 | Guided discovery plan and search-visit outcomes | FL-10 |
| B6 | **Done (#16):** claims model, versioned procedures (bank/FD, MF, LIC), packs, approval, manual submission, outcomes. Open: procedures for other insurers | FL-12–FL-16, FL-36, FL-37, FL-44 |
| B7 | Legacy record, trusted contacts (intent), snapshot, export | FL-11, FL-31, FL-34 |
| B8 | Voice on free tiers (after D-09); case-manager coordinator and prompt-injection hardening | FL-20, FL-38, FL-39, FL-41 |
| B9 | Audit view, deletion, holds, operator queue (including unfreezing a case), help, in-app reminders | FL-17–FL-19, FL-42, FL-43, FL-47, FL-49 |
| B10 | AI evaluation set, accessibility pass, metrics, reference-workload measurement (§17.4) | FL-46, FL-50, FL-52, FL-53, FL-54 |

### Phase C — Pilot readiness

Real providers where approved, a permanent database, malware scanning, AI terms that allow personal data (or AI off for real cases), threat model, DPDP assessment, pinned AI models, runbooks — per [PRD §15.2](PRD.md#152-pilot--may-start-when), within the free-tier rule ([docs/FREE_TIER_PLAN.md](docs/FREE_TIER_PLAN.md)).

### M9 — Optional service extraction

If scale or team structure requires it, lift `src/server/**` into a standalone Node/TypeScript service with the same API, also deployed from source on Cloud Run. Not required for the MVP.

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
