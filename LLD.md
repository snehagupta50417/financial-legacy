# Financial Legacy — Low-Level Design (LLD)

*How the product is built.*

| | |
| --- | --- |
| **Version** | 0.5.1 (draft for review) |
| **Date** | 17 October 2026 |
| **Sources of truth** | [ONE_PAGER.md](ONE_PAGER.md) (vision) → [PRD.md](PRD.md) (what the product does) → this LLD (how it is built). If this LLD conflicts with the PRD, the PRD wins and this LLD is corrected. |
| **Describes** | The real codebase in [`frontend/`](frontend/): Next.js + TypeScript + Prisma + Gemini, targeting Google Cloud Run (deployment is milestone M7, not yet done). |
| **Replaces** | LLD v0.4 (separate Python/FastAPI backend, Keycloak, Docker). That design is no longer the target. [BACKEND_PLAN.md](BACKEND_PLAN.md) remains the milestone plan for the hackathon build and is referenced from §21. |
| **Status** | Milestones M0–M3 of BACKEND_PLAN are built. Large parts of the PRD MVP are not built yet — see the gap analysis in §20. |

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
 │   ai/             provider interface · Gemini adapter · fixture provider
 │   providers/      identity · death proof · relationship · entitlement (mock now)
 │   rules/          claim path · confidence · totals            (to build)
 │   connectors/     connector interface · mock connectors       (Later)
 │   pdf/            claim-pack templates                        (to build)
 │   data/           official resources · demo data · synthetic registries
 ▼
 Prisma ─► SQLite (v0) ─► Cloud SQL PostgreSQL (MVP)
 Gemini API / Vertex AI  (text + vision; synthetic data only until Pilot)
```

### 2.2 The one-pager's six layers, mapped to code

| Layer (one-pager §7) | Where it lives | Status |
| --- | --- | --- |
| User experience | `src/app/page.tsx`, `src/components/fl/*` | Built (single-page views); voice to build |
| Identity and authorisation | `src/server/core/{session,access,gate-engine}.ts`, `src/server/providers/*` | Built with mock providers and session-based identity; real sign-in to build |
| AI orchestration | `src/server/ai/*`, `src/server/domain/journey-engine.ts`, AI routes | Built (Gemini + deterministic journey engine) |
| Financial integration | `src/server/data/resources.ts`, `ResourceVisit`, connector interface | Guided official resources built; connectors Later |
| Asset and document records | Prisma models, `api/documents`, `api/assets`, masking | Built; evidence-status model to update (§10) |
| Claims and workflow | `JourneyTask`, journey engine; `ClaimPack` model | Tasks built; claim packs to build |

`src/server/` must never import from `src/app/` or React code, so it can later move into a standalone service with the same API (§21, M9).

---

## 3. Technology stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Node.js ≥ 22 | Cloud Run buildpacks |
| Web framework | Next.js 16 (App Router), React 19, TypeScript 5 | `frontend/AGENTS.md`: read the bundled Next.js docs before changing framework code — this version has breaking changes |
| UI | Tailwind CSS 4, shadcn/ui (Radix), lucide icons, sonner toasts, framer-motion | Accessible primitives from Radix |
| Validation | Zod 4 at every API boundary | Enums enforced by Zod (SQLite has no native enums) |
| Database | Prisma 6; **SQLite in v0**, **Cloud SQL PostgreSQL for the MVP** | Provider switch only; no raw SQL |
| AI | Google Gemini via `@google/genai` (API key or Vertex AI) | Provider interface + fixture provider for tests (§13) |
| PDF text | `unpdf` | Images go to Gemini vision |
| Tests | Vitest (unit and route), Playwright (end-to-end, to add) | No tests are committed yet (§19) |
| Deploy | Google Cloud Run, **from source via buildpacks — no Docker** | `npm run build`, `npm start`, listens on `$PORT` |
| Secrets | Google Secret Manager | Never in the repo |

Installed but unused: `next-auth` (candidate for real sign-in), `next-intl` (candidate for Indian-language UI). Remove what is not adopted.

---

## 4. Code layout

```
frontend/
  prisma/schema.prisma        data model (§5)
  src/
    app/
      page.tsx                single page; client view state: landing | intake | workspace | resources
      api/                    route handlers (§15)
    server/                   all server-only logic (no React imports)
      ai/                     provider.ts · gemini.ts · fixture.ts · index.ts
      core/                   access.ts · crypto.ts · gate-engine.ts · http.ts · masking.ts ·
                              name-match.ts · rate-limit.ts · session.ts · upload.ts
      domain/                 case-service.ts · gates.ts · journey-engine.ts
      providers/              identity.ts · death-proof.ts · relationship.ts · entitlement.ts · types.ts
      data/                   resources.ts · demo-data.ts · death-registry.ts (synthetic)
      rules/                  (to build) claim-path.ts · evidence.ts · totals.ts
      pdf/                    (to build) claim-pack templates
      connectors/             (Later) base.ts · mock/* · real/*
    lib/                      client-shared only: client.ts (fetch + session header) · types.ts · utils.ts
    components/
      fl/                     product components: landing, intake, workspace tabs, gate-panel, ask-panel …
      ui/                     stock shadcn components
  test/                       (to add) unit, route and live-AI tests
```

**Housekeeping to do:** delete the leftover `src/app/api/route.ts` ("Hello, world"); rename the package from `nextjs_tailwind_shadcn_ts`; bring `worklog.md` up to date or remove it in favour of `DECISIONS.md`.

---

## 5. Data model

The Prisma schema in `frontend/prisma/schema.prisma` is the **source of truth for data**. The tables below summarise it and map it to the PRD's concepts ([PRD §12.1](PRD.md#121-the-main-things-the-product-keeps-track-of)).

### 5.1 Existing models

| Model | Purpose | PRD concept |
| --- | --- | --- |
| `Session` | Anonymous browser session (v0 identity) | Participant (temporary) |
| `UserProfile` | Preferred name, state, language, relationship (unused) | Participant |
| `LegacyCase` | One case: type, stage, progress, next-best action, `gateReached`, `frozenReason`, `deceasedPersonId`, `linkedCaseId` | Case |
| `DeceasedPerson` | Name, name variants, DOB, PAN **hash**, date of death, death-proof status | Subject (deceased) |
| `Claimant` | Relationship, role (lead / co-heir), identity and relationship status | Participant + role |
| `Proof` | Identity / death / relationship / entitlement proof: provider, status, matched fields | Authority evidence |
| `AssetRecord` | Category, institution, masked ref, last-4, value band, discovery and verification status, `entitled` | Holding |
| `DocumentRecord` | Category, extraction status, redacted text, extracted fields, user-verified flag | Document + evidence |
| `Signal` | Extracted fields and a ≤300-character snippet from a source; no raw bodies | Evidence (from sources) |
| `Institution` | Reference data: names, aliases, sender IDs, email domains, claim template | Institution |
| `JourneyTask` | Task with instructions, official URL, required documents, dependencies, priority, next-best flag | Task |
| `ClaimPack` | Claim path, checklist, generated forms, status | Claim pack |
| `ConsentRecord` | Per case and source: purpose, scope, status, expiry, revocation | Consent |
| `CaseEvent` | Append-only timeline with event type and actor | Audit event |
| `IntakeMessage`, `QaMessage`, `Draft` | Conversation, questions and answers, drafted letters | Conversation |
| `ResourceVisit` | User opened an official portal; outcome logged back | Discovery attempt |
| `InstitutionClaim`, `CheckResult` | Institution-side claim review (Verify) | Later (§22) |

Models defined but not yet used by code: `ClaimPack`, `Signal`, `QaMessage`, `ResourceVisit`, `InstitutionClaim`, `CheckResult`.

### 5.2 Changes required for the PRD MVP

| Change | Why | PRD |
| --- | --- | --- |
| Add `AssetRecord.evidenceStatus`: `SELF_DECLARED \| POTENTIAL_MATCH \| DOCUMENT_BACKED \| INSTITUTION_VERIFIED` (§10) | PRD requires exactly these four labels | FL-07 |
| Add `Observation` model: `assetId`, `amount` (decimal string), `amountType`, `currency`, `asOfDate`, `sourceDocumentId`/`signalId`, `reviewedAt`, `reviewedBy` — append-only | Dated amounts with history; honest totals | FL-09, FL-28, FL-29 |
| Add `FieldReview` (or extend `DocumentRecord.extractedFields`) with per-field `state: proposed \| accepted \| corrected \| rejected`, reviewer and reason | Critical fields must be reviewed before use | FL-06, FL-26 |
| Add `Approval`: exact content hash, recipient, channel, purpose, expiry, state | Approval of exactly what is sent | FL-14 |
| Add `Claim` (one per asset) with states and outcomes (§11); link `ClaimPack` to it | Claims tracked independently to an outcome | FL-12–FL-16 |
| Add `Hold`: scope, reason, created/resolved by | Pause specific actions | FL-47 |
| Add `LegacySnapshot`: frozen record, date, known gaps; `TrustedContact` (intent only) | Legacy planning | FL-11, FL-31, FL-34 |
| Add `User` + real auth link; replace session-only ownership | Real sign-in | FL-45, FL-48 |
| Store money as **decimal strings**, never floats | Exact amounts | FL-29 |
| Add `insurance` asset category and claim paths (if not already covered) | Life insurance is in the MVP | PRD §8.1 |

Every change ships with a Prisma migration and is reflected in `src/lib/types.ts`.

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
| **G2 Death** | The named person has died | Mock DigiLocker civil-registry lookup, or certificate scan read by Gemini vision and matched by code | Case active — **still no discovery** |
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

Mock providers are replaced behind the same interface (`src/server/providers/types.ts`) — e.g. DigiLocker for identity and death certificates once partner approval exists (D-03). Real identity evidence rules are decision D-02.

---

## 8. Documents and extraction

**PRD:** FL-05, FL-06, FL-25, FL-26. **Built:** upload, validation, extraction. **To build:** per-field review states and invalidation of dependants.

### 8.1 Pipeline

```
upload ─► validate (size ≤ MAX_UPLOAD_MB, magic-byte type sniffing: PDF, PNG, JPEG, WebP)
       ─► extract text (unpdf for PDFs) or Gemini vision (images)
       ─► Gemini structured extraction → proposed fields
       ─► redact identifiers BEFORE storage (6+ digit runs, 8+ digit groups, Aadhaar, PAN; dates kept)
       ─► store redacted text (≤20k chars) + proposed fields; original file NOT stored in v0
       ─► user reviews each critical field (accept / correct / reject)        ◄── to build
       ─► accepted fields create/update holdings and observations             ◄── to build
```

### 8.2 Rules

- Content type comes from **sniffing bytes**, not the browser's MIME type.
- Encrypted or unreadable files return a clear message and a "get help" path; we never ask for a document password (FL-25).
- **Critical fields** — names, identifiers, ownership, amounts, dates, institution — must be reviewed before they count (FL-06).
- A correction keeps the old value, who changed it and why; it invalidates any pending claim pack or approval that used it (FL-26).
- **Original files:** not stored in v0. For the MVP with real users, store originals encrypted in Cloud Storage with a retention policy (D-05), because claim packs need them.
- **Malware scanning:** to add before real uploads (Cloud Storage + a scanning service) (FL-05).

---

## 9. Discovery

**PRD:** FL-10, FL-27. **MVP = uploaded documents + guided official searches.** Automated connectors are **Later**.

### 9.1 MVP discovery

1. **Documents** the user uploads (statements, CAS, policy bonds, passbooks) → extraction (§8) → holdings.
2. **Guided official searches** from `src/server/data/resources.ts` (RBI UDGAM, SEBI MITRA / MFCentral, IRDAI Bima Bharosa and insurer searches, the government common landing portal; **IEPF is Later**, with shares and dividends). **To build** — today only the resources directory exists and `ResourceVisit` is unused. The product will:
   - proposes which searches fit this case (discovery plan, FL-10);
   - opens the official portal for the user (`ResourceVisit` created);
   - asks the user to log the outcome — **found / not found / partial / blocked** (e.g. the portal needs an identifier the family doesn't have) **/ failed** (portal unavailable) — recorded on the visit;
   - turns a "found" outcome into a `POTENTIAL_MATCH` holding for review.
3. **Inference** from documents (e.g. recurring interest credits suggesting an FD) creates `POTENTIAL_MATCH` holdings only — never confirmed.

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

### 10.1 Evidence status (to build — replaces the current two status fields)

| Status | Set when | Set by |
| --- | --- | --- |
| `SELF_DECLARED` | The user told us | User |
| `POTENTIAL_MATCH` | A search or inference suggests it; not yet supported by a document | System (search outcome, inference) |
| `DOCUMENT_BACKED` | A reviewed document supports it | User review of extracted fields |
| `INSTITUTION_VERIFIED` | Reviewed evidence **from the institution** confirms it | Operator only, with attributable institution evidence |

Migration from today's fields: `discoveryStatus=possible` → `POTENTIAL_MATCH`; `confirmed` + `verificationStatus=user_confirmed` → `DOCUMENT_BACKED` if a reviewed document is linked, else `SELF_DECLARED`; `institution_verified` → `INSTITUTION_VERIFIED` only with linked institution evidence. `dismissed` stays as a separate lifecycle flag. AI confidence and name similarity can **never** set `INSTITUTION_VERIFIED`.

### 10.2 Duplicates (to build)

Today documents merge into an existing asset by a loose institution-name match (BACKEND_PLAN bug 6, not yet fixed). Target: same institution + category + last-4 is a **candidate** duplicate, shown for review. No automatic merge on name alone; merges keep all evidence and can be undone (FL-08).

### 10.3 Totals (to build, `rules/totals.ts`)

- Count **one** reviewed, dated observation per holding: the latest with `amountType` in {`CASH_BALANCE`, `CURRENT_VALUE`}.
- Exclude, with a stated reason: potential matches, duplicates, conflicts, holdings on hold, undated values, historical values, FD principal/maturity, insurance sum assured, units, negative balances.
- Amounts are **decimal strings**; currencies are never mixed.
- No eligible values → total is `null` ("unknown"), not ₹0. An evidenced zero is `0.00`.
- Label: **"Reviewed value from dated sources"** — never "your wealth".

---

## 11. Claims

**PRD:** FL-12–FL-17, FL-35–FL-37. **Mostly to build** (`ClaimPack` model exists; no code uses it).

### 11.1 Claim path rules (`rules/claim-path.ts`, deterministic code)

For each confirmed holding, code — not the AI — chooses the path:

| Path | When |
| --- | --- |
| `nominee` | A nominee is recorded and alive |
| `joint` | A surviving joint holder exists |
| `simplified` | No nominee; bank deposit within the bank's simplified-settlement threshold (per current RBI directions; threshold values held in versioned config and checked against the source before use) |
| `succession` | Above threshold, disputed, or required by the institution |

The AI only writes the plain-language explanation of the chosen path.

### 11.2 Procedures (FL-12, FL-44)

Each institution + asset type + path has a **versioned procedure**: required documents, forms, where to submit, source URL and the date it was checked. Stored as reference data with a version number; each claim records the version it used. Out-of-date or missing procedures send the claim to review instead of guessing. MVP procedures: bank/FD deceased-claim, mutual fund transmission (via fund house/registrar), life insurance death claim.

### 11.3 Claim lifecycle

```
DRAFT → AUTHORITY_REVIEW → DOCUMENT_COLLECTION → PACK_REVIEW → READY_FOR_SUBMISSION
      → SUBMITTED (with receipt) | SUBMISSION_UNKNOWN (no receipt — reconcile before re-sending)
      → INSTITUTION_REVIEW → MORE_INFORMATION_REQUIRED → DOCUMENT_COLLECTION …
      → SETTLED | TRANSFERRED | PARTIALLY_SETTLED (remainder tracked) | REJECTED | UNRESOLVED_DISPUTE
```

- A pack can be built only after current authority (G4 for that asset) and required evidence are in place (FL-13).
- **Approval** (FL-14) binds the exact pack bytes (hash), recipient, channel and purpose; it expires (reference: 15 minutes) and is invalidated by any change.
- **MVP submission is manual:** the user downloads the approved pack and submits it; the product records the receipt or marks the submission unknown. It never claims it submitted on the user's behalf.
- Outcomes need evidence; a rejection is never counted as recovery; claims progress independently (FL-16, FL-37).
- **PDF templates** (`src/server/pdf/`): pre-filled from reviewed case data; full identifiers only at G4. Clearly marked as prepared by the user with our help — not official forms.

---

## 12. Legacy planning

**PRD:** FL-11, FL-31, FL-34 (MVP); FL-32, FL-33 (Later). The existing "estate" tab drafts a will with AI; **the PRD says we do not draft legally binding wills** (PRD §3.3), so that feature must be relabelled as "notes for your lawyer" or removed.

To build:

- **Legacy record:** the planner's reviewed inventory plus a checklist — missing nominees, missing documents, stale records (older than the configured freshness), open steps.
- **Trusted contacts:** stored as **intent only**. Adding or changing one sends nothing and grants no access.
- **Snapshot and export:** `LegacySnapshot` freezes the reviewed record with date and known gaps. Export requires owner approval, uses a short-lived download link, is audited, and warns that downloaded copies cannot be recalled.

---

## 13. AI layer

**PRD:** FL-38, FL-39, FL-40, FL-53, §10.4 guardrails. **Built** in `src/server/ai/`.

### 13.1 Provider design

- `provider.ts` defines the interface; `gemini.ts` implements it; `fixture.ts` returns canned responses for tests; `index.ts` exposes `complete`, `completeJson` and `completeWithHistory`.
- **Auth order:** `GEMINI_API_KEY`, else Vertex AI (`GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, Application Default Credentials on Cloud Run), else "not configured" — callers degrade gracefully, never fake output.
- **Models:** `GEMINI_MODEL` (default `gemini-flash-latest`), fallbacks `GEMINI_FALLBACK_MODELS` (default `gemini-3.5-flash,gemini-flash-lite-latest`). Model aliases change; pin explicit versions before the Pilot and record them per response.
- **Retries:** transient errors (429/5xx/UNAVAILABLE) get one retry after 800 ms, then the next model; 404 skips to the next model; others fail fast. Overall timeout `AI_TIMEOUT_MS` (45 s).
- System prompts go in `systemInstruction`; JSON calls set `responseMimeType: application/json` and are **validated with Zod** before use.
- **Rate limit:** per session, `RATE_LIMIT_AI_PER_MINUTE` (20). Per instance in v0; move to a shared store (e.g. the database or Memorystore) before scaling.

### 13.2 Where AI is used

| Use | Route | AI may | AI may not |
| --- | --- | --- | --- |
| Intake classification | `/api/intake` | Classify situation, ask follow-ups | Create holdings before G3 (mentioned institutions become "assumptions") |
| Document extraction | `/api/documents` | Propose fields with page references | Accept fields; store unredacted identifiers |
| Death-certificate scan | `providers/death-proof.ts` | Read the certificate | Decide the match — code compares fields |
| Ask about this case | `/api/ai/ask` | Answer from the masked case view, citing evidence | See data above the user's gate |
| Checklists and drafts | `/api/ai/checklist`, `/api/ai/draft` | Draft letters and checklists | Send anything; give legal advice; draft a binding will |

### 13.3 Safety rules

- **Grounding:** prompts include only the masked, gate-appropriate case view.
- **Prompt injection:** document text is wrapped and labelled as untrusted data; model output can never trigger a tool, change a gate or alter permissions.
- **No invented facts:** if a value isn't in the evidence, the answer says so.
- **Data to AI:** synthetic data only until the Pilot; for the Pilot, an approved provider configuration with data-residency, retention and no-training terms (D-05, FL-46).
- **Logging:** store model, model version, prompt template version and output; never log raw sensitive inputs.

### 13.4 Case manager

Today the "case manager" is the deterministic **journey engine** (next-best task, dependencies, stage) plus AI routes. The PRD's single case manager (FL-38) is built by adding a coordinator that reads saved case facts and proposes the next step as a typed action card; consequential actions always go through an approval screen.

---

## 14. Voice

**PRD:** FL-20, FL-41 — **MVP requirement, not built.**

### 14.1 Design

- **Typed adapters:** `SpeechInput` (speech-to-text) and `SpeechOutput` (text-to-speech) under `src/server/voice/`, same pattern as the AI provider.
- **Candidate provider:** Google Cloud Speech-to-Text and Text-to-Speech, or Gemini's native audio — chosen under decision D-09 (languages, latency, cost, privacy).
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
| POST | `/api/documents`, PATCH `/api/documents/:id` | Upload + extract; review fields | G3 for deceased | Built |
| PATCH | `/api/tasks/:id` | Update a journey task | Owner | Built |
| POST | `/api/ai/ask`, `/api/ai/draft`, `/api/ai/checklist` | Q&A, drafts, checklists | Owner | Built |
| GET/POST | `/api/consent` | Consent per case and source | Owner | Built |
| GET | `/api/cases/:id/messages` | Restore intake chat | Owner | To build |
| GET | `/api/cases/:id/audit` | Audit trail for the user | Owner | To build |
| GET | `/api/cases/:id/plan` | Claim path per asset + ordered plan | G3 | To build |
| POST | `/api/assets/:id/claim-pack` | Generate claim pack | G4 | To build |
| GET | `/api/claim-packs/:id/:form.pdf` | Download a pre-filled form (approved scope) | G4 | To build |
| POST | `/api/claim-packs/:id/approve` | Approve exact handoff | G4 | To build |
| POST | `/api/claims/:id/receipt`, `/api/claims/:id/outcome` | Record submission and outcome | G4 | To build |
| POST | `/api/resources/:id/visit`, `/api/visits/:id/outcome` | Guided official search | G0 / G3 | To build |
| POST | `/api/cases/:id/legacy/snapshot`, `/api/legacy/:id/export` | Legacy snapshot and export | Owner | To build |
| POST | `/api/voice/session`, `/api/voice/transcript` | Voice capture and transcript | Owner | To build |
| DELETE | `/api/cases/:id`, `/api/session` | Delete case / all my data | Owner | To build |
| — | `/api/cases/:id/connectors/*`, `/api/console/*` | Connectors, Verify console | — | Later (§22) |

Remove the leftover `/api` "Hello, world" route.

---

## 16. Security and privacy

**PRD:** FL-18, FL-19, FL-45, FL-46, FL-48; PRD §11.

### 16.1 Authentication

- **v0 (built):** anonymous session UUID in `localStorage`, sent as `x-session-id`. Acceptable only for synthetic demo data.
- **MVP (to build):** real sign-in — email OTP or Google sign-in (candidate: `next-auth`, already installed). Server-side session, HttpOnly + Secure + SameSite cookies, idle and absolute expiry, fresh re-authentication (≤5 minutes) for approvals, exports and consent changes. Cases owned by `User`, not by browser session.

### 16.2 Data protection (built unless noted)

| Control | Implementation |
| --- | --- |
| Masking by default | `masking.ts` on every asset response below G4 |
| PAN | Stored only as HMAC (`PAN_HASH_SECRET`, required in production) |
| Redaction before storage | Identifiers removed from stored text and extracted fields |
| No raw originals | v0 stores no original files; MVP stores them encrypted in Cloud Storage (to build) |
| Encryption at rest | Cloud SQL and Cloud Storage default encryption; customer-managed keys considered for the Pilot (to decide, D-05) |
| Encryption in transit | HTTPS only (Cloud Run) |
| Secrets | Secret Manager; never in the repo or logs |
| Upload safety | Size limit, byte sniffing (built); malware scanning (to build before real uploads) |
| Rate limiting | Per session on AI routes (built); shared store before scale |

### 16.3 Audit

`CaseEvent` is the append-only trail (actor, event type, time). **To build:** record every sensitive read, export, approval and outside action with actor, case, object, reason and request ID; expose it to the user (`/api/cases/:id/audit`); never put secrets or document contents in audit or application logs (FL-18).

### 16.4 Deletion and retention

To build (FL-19): delete case and delete-all-my-data endpoints; deletion revokes access immediately, cancels pending work and purges derived copies; retention periods set by D-05; backups expire on a schedule and restores honour deletion markers.

### 16.5 Before real data

1. Purge `frontend/db/custom.db` from git history (owner action — see DECISIONS.md M0).
2. Real authentication.
3. Malware scanning and encrypted original storage.
4. Approved AI and speech provider terms (data residency, retention, no training).
5. Threat model and DPDP privacy assessment (PRD §11.2).

---

## 17. Reliability, operations and deployment

**PRD:** FL-40, FL-51, FL-52.

### 17.1 Deployment

- **Google Cloud Run**, deployed **from source with buildpacks** (`gcloud run deploy --source .` or continuous deployment from the repository). **No Dockerfile, docker-compose or Caddy.**
- Scripts: `build` = `prisma generate && next build`; `start` = `prisma db push --skip-generate && next start` (v0 SQLite); `postinstall` = `prisma generate`.
- **MVP:** Cloud SQL PostgreSQL with versioned Prisma migrations (`prisma migrate deploy`), replacing `db push`. Environments: development, staging, production — each with its own database and secrets.

### 17.2 Operating

- `/api/health` for uptime checks.
- Structured JSON logs (level from `LOG_LEVEL`) with request IDs; no sensitive values.
- Error reporting and basic metrics (Cloud Logging / Error Reporting / Monitoring).
- AI failures degrade gracefully: the user keeps their work and sees the next usable step (FL-40).
- Long operations (extraction, pack generation) show progress; move to a job table with retries when they exceed request time limits (FL-51).
- Working targets (to confirm under D-07): assistant reply starts within ~2 s; a typical statement extracted within ~30 s.

### 17.3 Running without a cloud key

For the reference build, `AI_PROVIDER=fixture` (to add) makes the app use the fixture provider at runtime, so all three journeys run locally on sample data without any cloud credentials (PRD §15.1). The UI labels fixture answers "Sample AI response". In production, the fixture provider is refused at startup.

### 17.4 Reference workload

Used to measure FL-52 before agreeing production targets (D-07): one Cloud Run instance (1 vCPU, 2 GB), 5 concurrent synthetic users, 20 cases, 200 holdings, 100 documents of up to 20 pages. Record p95 latency for ordinary requests (working target < 1 s), time to first assistant token (< 2 s), extraction time per document (< 30 s for a typical statement), AI cost per case, and recovery after an instance restart. These are engineering acceptance targets, not customer promises.

### 17.5 Demo operations

`/api/admin/reset` (planned) wipes and reseeds demo data; disabled in production unless `DEMO_MODE=true`. Every demo and mock is visibly labelled "Simulated".

---

## 18. Configuration

All variables are listed in `frontend/.env.example`. Secrets come from Secret Manager in deployed environments.

| Variable | Purpose | Used now |
| --- | --- | --- |
| `DATABASE_URL` | Prisma connection | Yes |
| `GEMINI_API_KEY` | Gemini API key (or use Vertex) | Yes |
| `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` | Vertex AI | Yes |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS` | Model selection | Yes |
| `AI_TIMEOUT_MS` | AI call timeout (45 000) | Yes |
| `RATE_LIMIT_AI_PER_MINUTE` | AI rate limit per session (20) | Yes |
| `PAN_HASH_SECRET` | HMAC key for PAN (required in production) | Yes |
| `MAX_UPLOAD_MB` | Upload size limit (8) | Yes |
| `CONNECTOR_MODE_EMAIL`, `_TAX_RECORD`, `_SMS`, `_REGISTRY`, `_SCAN` | Connector mock/real | Not yet (Later) |
| `CONSOLE_KEY` | Verify console access | Not yet (Later) |
| `DEMO_MODE` | Allow demo reset in production | Not yet |
| `LOG_LEVEL` | Logging level | Not yet |

Startup should **refuse to run** in production when `PAN_HASH_SECRET` is missing, when connectors are set to `real` without approved configuration, or when demo data would be served to real users.

---

## 19. Testing and evaluation

**PRD:** FL-53, FL-55; PRD §15.1. **Current state: no tests are committed** (`vitest.config.ts` expects `frontend/test/**`, which does not exist). DECISIONS.md M1 mentions tests that were not committed. Adding them is the first engineering priority after the hackathon.

| Level | Tool | Must cover |
| --- | --- | --- |
| Unit | Vitest | Gate engine, masking, name matching, redaction, claim-path rules, totals, evidence-status transitions |
| Route | Vitest calling route handlers with a temporary SQLite DB and the fixture AI provider | 404 for foreign IDs; 403 below gate; 423 frozen; no asset data below G3; no full identifiers below G4; duplicate-deceased freeze; upload rejection by type and size |
| End-to-end | Playwright | All three journeys on demo data, including failure paths (wrong date of death → review; frozen case; missing document; rejected claim) |
| Live AI | Vitest, only with `LIVE_AI=1` | Gemini text and JSON calls still work (never in normal CI) |
| AI evaluation | Labelled set of synthetic Indian bank statements, CAS, policy bonds, death certificates — including adversarial documents | Critical-field accuracy reported separately; any false "verified", gate bypass or wrong disclosure fails the release (FL-53) |
| Accessibility | Playwright + axe | WCAG 2.2 AA checks on core screens (FL-50) |

**CI (to add):** GitHub Actions on every PR — install, type-check (`tsc --noEmit`), lint, unit + route tests, build. End-to-end on main.

**Traceability (FL-55):** each test names the FL IDs it covers.

---

## 20. Gap analysis against the PRD MVP

| Area | PRD | Built | Gap |
| --- | --- | --- | --- |
| Intake and journeys | FL-01, FL-02, FL-22 | Intake with AI + fallback; 7 case types; journey engine | Restore chat (`/messages`); user correction of journey type |
| Trust gates and authority | FL-03, FL-04, FL-23 | G0–G4 with mock providers; guards; freeze; masking | Proof expiry, reviewer/reason, operator unfreeze, real providers |
| Real sign-in | FL-45, FL-48 | Session UUID only | **Real authentication** |
| Documents | FL-05, FL-06, FL-25, FL-26 | Upload, sniffing, extraction, redaction | Per-field review states; invalidation; malware scan; encrypted originals |
| Discovery | FL-10 | Resources directory | Discovery plan; `ResourceVisit` flow; outcome logging; no-result/partial states |
| Evidence and totals | FL-07–FL-09, FL-28, FL-29 | Two status fields | **Four evidence statuses**; observations; totals rules |
| Insurance in MVP | PRD §8.1 | Category exists in demos | Insurance claim procedure and pack |
| Claims | FL-12–FL-17, FL-36, FL-37 | Journey tasks only | **Claim model, procedures, packs, approval, receipts, outcomes** |
| Legacy | FL-11, FL-31, FL-34 | Estate tab with AI will draft | Legacy record, trusted contacts (intent), snapshot, export; relabel will drafting |
| AI | FL-38–FL-40, FL-46, FL-53 | Gemini, fallbacks, grounding; synthetic data only | Case-manager coordinator; injection hardening; evaluation set; fixture provider at runtime; approved provider terms before real data (FL-46) |
| Voice | FL-20, FL-41 | — | **Not started** |
| Tasks and operations | FL-42–FL-44, FL-47, FL-49 | Journey tasks | Reminders; operator queue; holds; help/complaints; procedure versioning |
| Audit, deletion | FL-18, FL-19 | `CaseEvent` timeline | User-visible audit; delete endpoints; retention |
| Quality | FL-50–FL-55 | Type-check passes | **No tests, no CI**; accessibility checks; metrics |

---

## 21. Build plan

### Phase A — Hackathon (AI Builder Cup, due 18 Oct 2026)

Follow [BACKEND_PLAN.md §11](BACKEND_PLAN.md): M0–M3 done; M4 connectors + discovery (mock), M5 Verify console, M6 claim path + packs, M7 Cloud Run deploy. These may use mock connectors and the Verify console **for the demo only**, labelled "Simulated". Phase A does not change PRD scope.

### Phase B — PRD MVP (after the hackathon)

Ordered so that each step leaves a working product:

| # | Work | PRD |
| --- | --- | --- |
| B1 | Tests + CI for what exists (gates, masking, routes); remove leftovers; `AI_PROVIDER=fixture` for running without a key | FL-55 |
| B2 | Postgres on Cloud SQL with migrations; environments | FL-51 |
| B3 | Real sign-in; cases owned by users; re-authentication for sensitive actions; chat restore; journey-type correction | FL-01, FL-02, FL-45, FL-48 |
| B3a | Gate completion: proof expiry, reviewer and reason on proofs, nominee/executor/joint-holder routes to G3, encrypted full identifiers for G4 | FL-03, FL-04 |
| B4 | Evidence statuses, observations, field review, totals | FL-06–FL-09, FL-26, FL-28, FL-29 |
| B5 | Guided discovery plan and `ResourceVisit` outcomes | FL-10 |
| B6 | Claims: model, versioned procedures (bank/FD, MF, life insurance), packs, approval, manual submission, outcomes | FL-12–FL-16, FL-36, FL-37, FL-44 |
| B7 | Legacy record, trusted contacts (intent), snapshot, export | FL-11, FL-31, FL-34 |
| B8 | Voice (after D-09); case-manager coordinator and prompt-injection hardening | FL-20, FL-38, FL-39, FL-41 |
| B9 | Audit view, deletion, holds, operator queue (including unfreezing a case), help, in-app reminders | FL-17–FL-19, FL-42, FL-43, FL-47, FL-49 |
| B10 | AI evaluation set, accessibility pass, metrics, reference-workload measurement (§17.4) | FL-46, FL-50, FL-52, FL-53, FL-54 |

### Phase C — Pilot readiness

Real providers where approved, encrypted originals, malware scanning, threat model, DPDP assessment, pinned AI models, runbooks — per [PRD §15.2](PRD.md#152-pilot--may-start-when).

### M9 — Optional service extraction

If scale or team structure requires it, lift `src/server/**` into a standalone Node/TypeScript service with the same API, also deployed from source on Cloud Run. Not required for the MVP.

---

## 22. Later capabilities

Designed but switched off in the MVP. Each needs its own gate (PRD §15.3).

| Capability | Design | PRD |
| --- | --- | --- |
| **Connectors** (Gmail read-only, tax record AIS/26AS, consolidated statements via email, Android SMS companion) | §9.2 interface; mock mode for demos | FL-27 |
| **Verify console** for banks and insurers | Institution claim queue; checks stored as `CheckResult`: cross-document consistency, authenticity signals (flagged, not proof), duplicate claims, completeness; **risk score computed by code**, never by the AI; approve / request documents / escalate, all logged. Access via real institution accounts (v0 demo uses `CONSOLE_KEY`) | FL-56 (Later) |
| Account Aggregator, DigiLocker | Behind the provider/connector interfaces after approval | FL-27, D-03 |
| Direct claim submission | Through permitted institution channels, with execution-time checks and receipts | FL-35 |
| Family collaboration, sharing and release after death | Verified recipients, scoped and expiring access, release policy | FL-24, FL-32, FL-33 |
| External reminders and automated follow-ups | Email/SMS with opt-in; permitted calls | FL-42, FL-21 |
| More asset types | Shares/demat, IEPF, EPF, NPS, PPF/small savings, lockers — each through FL-30 | FL-30 |

---

## 23. Change control and superseded documents

- **One-pager → PRD → LLD.** Product behaviour changes in the PRD first; this LLD and the code follow in the same change.
- **Prisma schema** is the source of truth for data; **this LLD** for architecture and rules; **`DECISIONS.md`** records implementation decisions as they are made (newest last).
- **[BACKEND_PLAN.md](BACKEND_PLAN.md)** is the hackathon milestone plan (Phase A). Where it adds scope beyond the PRD (connectors as primary discovery, Verify console), this LLD treats that scope as **Later** or demo-only.
- **[contracts/](contracts/openapi.json)** (`openapi.json`, `schema.sql`, `fixtures.json`) describe the superseded Python/FastAPI design. They are kept for reference only and are **not** the contract for the current code. Replace them with an OpenAPI spec generated from the Zod schemas once the MVP API stabilises.
- **LLD v0.4** (Python/FastAPI, Keycloak, Docker Compose, PostgreSQL RLS) is superseded by this version. Its useful rules — exact approvals, unknown-outcome reconciliation, append-only evidence, honest totals, deletion markers — are carried forward above.

### Changes in versions 0.5 – 0.5.1

- Rewritten to describe the real codebase (Next.js/TypeScript, Prisma, Gemini, Cloud Run, no Docker), aligned to PRD v0.6 and BRD v0.3.
- Adds trust gates G0–G4 as the implementation of the PRD's authority model; four evidence statuses; claim lifecycle; voice design; API inventory with built/to-build status; gap analysis; phased build plan.
- MVP discovery is upload + guided official searches; connectors and the Verify console are Later.
- **0.5.1:** G3 accepts any evidenced claimant role (nominee, heir, executor, joint holder), not only close relatives; encrypted full identifiers designed for G4 and claim packs; IEPF moved to Later; discovery outcomes include blocked and failed; built vs to-build marked in §6, §9.1, §10.2; fixture provider at runtime and a reference workload (§17.3–17.4); every MVP requirement now has a build step in Phase B; Cloud Run described as the target, not current state.
