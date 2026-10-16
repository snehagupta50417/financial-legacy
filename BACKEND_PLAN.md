# Backend Plan — FinLegacy AI

> **Status:** Approved plan (v2). Supersedes the Phase 1 read-only analysis.
> **Repo:** new repo containing the existing Next.js `frontend/` (originally from `tash149/financial-legacy`).
> **Deadline:** AI Builder Cup 2026 (Google Cloud, BFSI theme) prototype due **18 Oct 2026**. After that, this same codebase becomes the real MVP.
> **Rule for the coding agent:** build in the order of §11. Finish and verify one milestone before starting the next. If anything here conflicts with the existing code, this file wins; note the decision in `DECISIONS.md`.

---

## 1. Product context (read first)

**What FinLegacy AI is.** India holds well over ₹1 lakh crore in unclaimed financial assets (bank deposits in RBI's DEA Fund, unclaimed insurance, mutual funds, IEPF shares/dividends). Most of it belongs to people who have died and whose families don't know what existed or how to claim it. At the same time, banks and insurers struggle to pay death claims to the right person: RBI's 2025 Directions require deceased-customer claims to be settled within 15 days of complete documents (with Bank Rate + 4% compensation for delay), and insurers face fake-death and impostor claims with no shared way to detect them.

**Two sides, one engine.**
- **Heirs (B2C, "Recover"):** prove who they are and who died, connect sources, see the deceased's assets appear (masked, evidence-linked), get a per-asset claim plan and pre-filled claim packs. NRI heirs are a priority segment.
- **Institutions (B2B, "Verify"):** a claims console where a bank/insurer checks a death claim's documents, cross-document consistency, duplicates and risk, and decides. This is the fraud/risk piece the hackathon theme asks for, and the main future revenue line.
- Later products on the same engine: **Trace** (find heirs for dormant accounts before transfer to DEA/IEPF) and **Protect** (living family asset map, bundled by institutions).

**Business model (for context, not built in v0):** heirs pay a flat fee per estate (charged to the estate, never a % of recovered money); banks/insurers pay per verified claim or annually; Trace is per heir found; Protect is free to families, funded by institutions.

**Product principles (non-negotiable):**
1. **Prove before you see.** Name + DOB + PAN alone unlock nothing. No discovery and no asset data before gate G3 (§3).
2. **Access decisions are deterministic code.** The LLM extracts, explains and drafts; it never decides access, entitlement or risk.
3. **Mask by default.** Below G4 (per asset): institution, category, value band, last-4 only.
4. **Connect, don't upload.** Discovery comes from connected sources (email, tax record, SMS via a future Android companion). Upload/camera scan is a fallback for old paper only.
5. **Read, extract, forget.** Store extracted fields and short evidence snippets; never store raw email/SMS bodies.
6. **Everything is logged** in an append-only audit trail visible to the user.
7. **Humans confirm.** Separate confirmed facts, user-provided information and AI hypotheses. Never present an inferred asset as verified.
8. **v0 uses synthetic data only.** No real personal documents are sent to any model in v0.

**Platform:** one responsive web app (heirs on phone or laptop, institution console on desktop). No native app. Reading phone SMS will later need a small Android companion; in v0 the SMS source is simulated and labelled as such.

---

## 2. Key decisions (answers to the Phase 1 questions)

| # | Question | Decision |
|---|---|---|
| Q1 | What is "the backend"? | **v0 (until 18 Oct): option (b) — harden the existing Next.js API routes in place.** After the hackathon: option (a) — extract `src/server/**` into a standalone service with the same contract. |
| Q2 | Do `LLD.md` / `contracts/` constrain this? | **No.** Separate future track. Don't implement Keycloak, RLS or `/v1/*` now. |
| Q3 | Language / framework | **TypeScript** inside Next.js (existing logic is TS). Zod for validation. |
| Q4 | Database | **SQLite via Prisma for v0** (reseeded for the demo; enums enforced with Zod since Prisma+SQLite lacks native enums). **Cloud SQL Postgres for the MVP** (provider switch). |
| Q5 | Deployment | **Google Cloud Run, deployed from source with Google Cloud buildpacks — no Docker.** Do not add a Dockerfile, docker-compose or Caddy config; remove any that exist. The app must build with `npm run build` and start with `npm start`, listening on `$PORT`. Secrets via Secret Manager. |
| Q6 | LLM provider | **Gemini** via `@google/genai` (AI Studio key or Vertex AI). Remove `z-ai-web-dev-sdk`. Keep a provider interface + `FixtureProvider` for tests. Synthetic data only in v0. |
| Q7 | Auth | Anonymous `x-session-id` stays **only for G0** features (intake chat, resources, guides). Anything about a deceased person requires the trust gates (§3). Real sign-in (email OTP / OAuth) after the hackathon. |
| Q8 | Store original uploads? | **No** in v0 (extracted text + fields only). MVP: encrypted Cloud Storage. |
| Q9 | Images | **Keep and make them work** with Gemini vision (camera-scan fallback for share certificates, passbooks). |
| Q10 | Deletion endpoints | **Yes:** delete case, delete session. |
| Q11 | Committed `frontend/db/custom.db` | **Remove from git and purge from history** (it contains non-synthetic uploads). Add `*.db` to `.gitignore`. Check repo visibility. Do this before any other work. |
| Q12 | Checklist / followup / consent / UserProfile | Keep checklist and followup (expose in UI later if time). **Consent becomes per-case and per-source** (§5). UserProfile: keep, unused. |
| Q13 | Persist drafts and Q&A | **Yes** (new `Draft` and `QaMessage` records). |
| Q14 | Restore intake chat | **Yes:** `GET /api/cases/:id/messages`. |
| Q15 | Reminders / notifications | **No** in v0. |
| — | Bugs listed in Phase 1 | **Fix all seven** (§10). |

---

## 3. Trust gates (new — the core security model)

Gate state is stored per case (`gateReached`) and, for G4, per asset (`entitled`).

| Gate | Proof | How (v0) | Unlocks |
|---|---|---|---|
| **G0 Account** | control of a session (OTP later) | anonymous `x-session-id` | intake chat, resources directory, guides, demo loader |
| **G1 Identity** | user is a real, specific person | `IdentityProvider` (mock: "Verify with DigiLocker"; NRI: passport + selfie, simulated) | create a case about a deceased person |
| **G2 Death** | the named person has died | `DeathProofProvider` (mock DigiLocker fetch, or scan + Gemini read + name/DOB match) | case active; **still no discovery** |
| **G3 Relationship** | user is a close relative | heir's own document naming the parent/spouse (mock), else legal-heir certificate | connectors + discovery; assets visible **masked** |
| **G4 Entitlement** (per asset) | user may claim this asset | nominee/joint-holder confirmation or legal-heir/succession certificate (mock) | full details + claim pack for that asset |

Rules:
- Implemented in `src/server/core/gate-engine.ts` as pure functions; enforced by a `requireGate(caseId, level)` guard used in every case-scoped route handler. The UI cannot skip a gate.
- **Masking** in `src/server/core/masking.ts`: every asset leaving the API passes through it.
- **Name matching:** transliteration-aware fuzzy match ("Rajesh Kumar Sharma" ≈ "R. K. Sharma"); mismatches go to manual review, never auto-reject.
- **One case per deceased:** a second claimant opening a case for the same person (matched on name + DOB + PAN hash) links both cases and sets `frozenReason`; disclosure pauses until reviewed.
- **Living-person guard:** if any source shows activity by the "deceased" after the date of death, freeze the case.
- **Existing 7 journeys:** the journey engine stays. Journeys about a living person's own assets (`living_individual`, `estate_planning`) need only G1 and no death/relationship proof. Journeys about someone else's assets (`family_death`, `nominee_heir`, `rejected_claim`, `nri_cross_border`) go through G1–G3. `caregiver` (helping an elderly relative) requires G1 plus a recorded consent from the relative (mock) — never discovery without it.

---

## 4. Discovery: connectors (new)

Every external source sits behind one interface so real sources replace mocks without rewrites.

```ts
interface Connector {
  id: "email" | "tax_record" | "sms" | "statement" | "registry" | "scan";
  connect(caseId: string, consent: ConsentInput): Promise<void>;
  fetchSignals(caseId: string): Promise<Signal[]>;
  disconnect(caseId: string): Promise<void>;
}
```

- Mode per source via env: `CONNECTOR_MODE_EMAIL=mock|real`, etc. v0 = all `mock` except `scan` (real Gemini vision on synthetic images).
- **Pipeline** (`src/server/agents/`): filter (financial senders only; OTP messages dropped) → Gemini structured extraction into `Signal` → match to `Institution` reference table → merge into `AssetRecord` (same institution + category + last4 = one asset) → infer hidden assets (always `possible`/suggested) → confidence → masked output.
- **Confidence:** High = 2+ independent sources or an official statement; Medium = one direct source; Suggested = inferred.
- **Registries** (UDGAM, MITRA, IEPF, Bima Bharosa): no public APIs. v0 = mock lookup. Real = guided workflow using the existing resources directory: open the official portal, then log the outcome back (`ResourceVisit`).
- Real connectors planned next, in order: Gmail (OAuth read-only, ≤100 test users before Google's security review), tax record (heir-provided AIS/26AS file parsed), consolidated MF/demat statement (arrives via connected email), Android SMS companion.
- Existing document upload (`POST /api/documents`) stays as the **fallback path** and feeds the same pipeline.

---

## 5. Data model

Existing models are kept (see the Phase 1 field list, preserved in Appendix A). Changes and additions:

| Model | Change |
|---|---|
| `LegacyCase` | add `gateReached` (`G0..G4`), `frozenReason?`, `deceasedPersonId?`, `linkedCaseId?` |
| `AssetRecord` | add `entitled` bool, `valueBand?`, `last4?`, `sourceSignalIds` JSON; keep `discoveryStatus` (`possible\|confirmed\|dismissed`) and `verificationStatus` |
| `ConsentRecord` | add `caseId?`, `source?` (connector id), `scope`, `expiresAt?`, `revokedAt?` |
| **`DeceasedPerson`** (new) | `name`, `nameVariants` JSON, `dob?`, `panHash?`, `dateOfDeath?`, `deathProofStatus` |
| **`Claimant`** (new) | `caseId`, `sessionId`, `relationship`, `role` (`lead\|co_heir`), `identityStatus`, `relationshipStatus` |
| **`Proof`** (new) | `caseId`, `kind` (`identity\|death\|relationship\|entitlement`), `assetId?`, `provider`, `status`, `matchedFields` JSON |
| **`Signal`** (new) | `caseId`, `source`, `extractedFields` JSON, `snippet` (≤300 chars), `createdAt` — no raw bodies |
| **`Institution`** (new, reference) | `name`, `aliases`, `smsSenderIds`, `emailDomains`, `category`, `claimFormTemplate?` |
| **`ClaimPack`** (new) | `assetId`, `claimPath` (`nominee\|joint\|simplified\|succession`), `checklist` JSON, `formsGenerated` JSON, `status` |
| **`Draft`** (new) | `caseId`, `kind` (`will\|expert\|followup\|checklist`), `content`, `createdAt` |
| **`QaMessage`** (new) | `caseId`, `question`, `answer`, `createdAt` |
| **`ResourceVisit`** (new) | `caseId`, `resourceId`, `openedAt`, `outcome?`, `notes?` |
| **`InstitutionClaim`** (new, Verify) | `institutionName`, `policyOrAccountRef`, `deceasedName`, `claimantName`, `relationship`, `documents` JSON, `status` (`received\|checking\|needs_docs\|approved\|flagged\|escalated`), `riskLevel?`, `sourceCaseId?` |
| **`CheckResult`** (new, Verify) | `claimId`, `check` (`consistency\|authenticity\|duplicate\|completeness`), `passed`, `reason`, `evidence` JSON |
| `CaseEvent` | add event types `gate`, `connector`, `discovery`, `claim_pack`, `verify`; add `actor` value `staff` |

All enums enforced with Zod at the API boundary. Never store full account numbers, full PAN or raw message bodies.

---

## 6. API contract

### 6.1 Existing endpoints (keep the contract; add gates)

Common rules unchanged: `x-session-id` header; errors as `{ "error": string }`; foreign IDs return 404; JSON-in-string fields always parsed in responses.

| Method | Path | Change |
|---|---|---|
| GET | `/api/cases` | unchanged; include `gateReached`, `frozenReason` |
| GET | `/api/cases/:id` | `CaseWorkspace` now includes `gate`, `claimants`, `proofs`; assets pass through masking |
| POST | `/api/intake` | unchanged contract; creating a case about someone else sets it to G0 and returns `nextGate`; **no asset clues are created from chat before G3** (store mentioned institutions as `assumptions` instead) |
| POST | `/api/demo` | add `demo-reclaim` (the hackathon demo case, §8); existing demos stay |
| POST/PATCH | `/api/assets`, `/api/assets/:id` | require G3 |
| POST/PATCH | `/api/documents`, `/api/documents/:id` | require G3 for documents about the deceased; images now extracted with Gemini vision |
| PATCH | `/api/tasks/:id` | unchanged |
| POST | `/api/ai/ask`, `/api/ai/draft`, `/api/ai/checklist` | persist results (`QaMessage`, `Draft`); rate-limited |
| GET/POST | `/api/consent` | now per case + source |
| GET | `/api/resources` | unchanged (public) |
| GET | `/api/health` | new: `{ status: "ok" }` |

### 6.2 New endpoints

| Method | Path | Purpose | Gate |
|---|---|---|---|
| POST | `/api/cases/:id/proofs/identity` | run `IdentityProvider` | → G1 |
| POST | `/api/cases/:id/proofs/death` | run `DeathProofProvider` | → G2 |
| POST | `/api/cases/:id/proofs/relationship` | relationship proof | → G3 |
| POST | `/api/assets/:id/entitlement` | per-asset entitlement proof | → G4 (asset) |
| POST | `/api/cases/:id/connectors/:source` | connect a source (consent recorded) | G3 |
| DELETE | `/api/cases/:id/connectors/:source` | disconnect + delete unmerged signals | G3 |
| POST | `/api/cases/:id/discover` | run discovery pipeline | G3 |
| GET | `/api/cases/:id/discovery` | poll progress (assets appear incrementally) | G3 |
| GET | `/api/cases/:id/plan` | claim-path per confirmed asset + ordered plan | G3 |
| POST | `/api/assets/:id/claim-pack` | generate claim pack (checklist + PDFs) | G4 |
| GET | `/api/claim-packs/:id/:form.pdf` | download a pre-filled form | G4 |
| POST | `/api/claim-packs/:id/submit` | mark sent; creates an `InstitutionClaim` (feeds Verify) | G4 |
| GET | `/api/cases/:id/messages` | restore intake chat | owner |
| GET | `/api/cases/:id/audit` | audit trail | owner |
| POST | `/api/resources/:id/visit` / `/api/visits/:id/outcome` | guided official-portal workflow | G0 |
| DELETE | `/api/cases/:id`, `/api/session` | data deletion | owner |
| GET | `/api/console/claims` | Verify queue | reviewer |
| GET | `/api/console/claims/:id` | claim detail + check results | reviewer |
| POST | `/api/console/claims/:id/verify` | run checks | reviewer |
| POST | `/api/console/claims/:id/decision` | `approve \| request_docs \| escalate` (+ drafted message) | reviewer |
| POST | `/api/admin/reset` | wipe + reseed demo data (disabled when `NODE_ENV=production` unless `DEMO_MODE=true`) | admin |

Reviewer access in v0: a simple `x-console-key` header (env secret) and a "LIC claims desk" login screen. Real roles come with real auth.

---

## 7. Verify console (new — institution side)

- **Checks** (each stored as a `CheckResult` with evidence):
  1. **Consistency:** names, dates of death, ages and relationships agree across death certificate, IDs and claim form (Gemini compares; code records pass/fail).
  2. **Authenticity signals:** layout/font/date-field mismatch against the genuine certificate template (Gemini vision; flagged as "signal", not proof).
  3. **Duplicate:** same deceased + same asset already claimed by a different claimant (mock shared claims index in v0).
  4. **Completeness:** required documents for the chosen claim path.
- **Risk score** computed by code from check results: Low / Medium / High, each reason linked to evidence. The LLM never sets the score.
- **Actions:** approve, request documents (drafts a message to the claimant), escalate. Every action logged.
- **SLA display:** days left under the RBI 15-day rule for bank claims.

---

## 8. Demo case (`demo-reclaim`, synthetic)

- Deceased: **Rajesh Kumar Sharma**, Delhi. Heir: daughter **Ananya Sharma**, Toronto (NRI).
- Sources and what they reveal:
  - Email: LIC premium reminders; CAMS consolidated MF statement.
  - Tax record (AIS): SBI FD interest, HDFC savings interest, a **dividend from a company with no known holding → hidden shares (suggested)**.
  - SMS (labelled "Needs Android companion · simulated"): SBI FD, HDFC savings alerts, plus 3 OTP messages that must be filtered out.
  - Registry mock: one old dormant deposit.
  - Camera scan: one old physical share certificate (generated image; real Gemini extraction).
- Impostor: "nephew" **Vikram Sharma** claims the LIC policy with an **edited death certificate** (different date of death, mismatched font in the date field).
- Expected result: ~7 assets (1 suggested); Ananya's LIC claim = Low risk; Vikram's = High (date mismatch + edited field + duplicate).
- Seed files live in `src/server/data/demo-reclaim/` with a README listing every planted clue and the expected outcome. Seeds are only referenced by mock connectors and the demo loader.

---

## 9. Claim-path rules and claim packs (new)

- `src/server/rules/claim-path.ts` (code, not LLM): per confirmed asset choose `nominee` / `joint` / `simplified` (deposit claims up to ₹15 lakh at commercial banks, ₹5 lakh at co-operative banks, per RBI 2025 Directions) / `succession` (above threshold or disputed). Gemini writes only the plain-language explanation.
- Ordered recovery plan across assets (e.g. legal-heir certificate before bank claims), mapped onto the existing journey tasks.
- PDF templates for v0 (3 only): bank deceased-claim form, IEPF-5 cover data sheet, indemnity letter — pre-filled from case data; full identifiers only at G4.

**v1 (after hackathon, keep in mind):** RBI delay-compensation calculator (Bank Rate + 4% if a bank misses 15 days) with drafted letter; escalation ladder (bank → RBI ombudsman; insurer → Bima Bharosa → Insurance Ombudsman); co-heir invites and NOC e-sign; rejected/delayed-claim journey depth.

---

## 10. Bugs to fix while hardening

1. Intake history not filtered by `caseId` (`intake/route.ts:118`) — leaks across cases.
2. `POST /api/consent` attaches to "most recently updated case" — must take explicit `caseId`.
3. `PATCH /api/documents/:id` returns `extractedFields` as a raw string — parse it.
4. AI system prompt sent as `role: "assistant"` (`ai.ts:49, 97`) — use the system instruction field.
5. Demo route crashes when all seeded tasks are completed (`demo/route.ts:151`).
6. Asset de-dup by "institution contains first 12 chars" (`documents/route.ts:207`) — replace with `Institution` matching + category + last4.
7. No rate limiting on AI endpoints; no upload MIME/magic-byte validation — add both.

Also: `typescript.ignoreBuildErrors: true` — turn it off and fix type errors before deploy.

---

## 11. Build order (deadline-first)

Each milestone ends with tests passing and the UI working.

| # | Milestone | Must-have for 18 Oct |
|---|---|---|
| M0 | **Security cleanup:** purge `custom.db` from git history, `.gitignore`, check repo visibility; remove any Dockerfile / docker-compose / Caddy files; `/api/health`; `.env.example`; turn off `ignoreBuildErrors` | ✅ |
| M1 | **Gemini swap:** provider interface, Gemini adapter, fixture provider, fallback behaviour, rate limits; fix bug 4 | ✅ |
| M2 | **Schema + gates:** Prisma additions (§5), gate engine, masking, name matching, one-case-per-deceased, audit events; proof endpoints with mock providers; tests: no asset data below G3, no full identifiers below G4, duplicate case freezes both | ✅ |
| M3 | **Gate UI:** proof screens (identity → death → relationship) and a "discovery locked" state in the workspace | ✅ |
| M4 | **Connectors + discovery:** connector interface, mock connectors, `demo-reclaim` seeds, pipeline, Gemini vision for scans, incremental asset appearance; fix bugs 1, 3, 6 | ✅ |
| M5 | **Verify console:** `InstitutionClaim`, `CheckResult`, checks, risk score, decisions, console UI | ✅ |
| M6 | **Claim path + packs:** rules, plan, 3 PDFs, entitlement (G4), submit → `InstitutionClaim` | ✅ |
| M7 | **Deploy (no Docker):** Cloud Run source deploy via buildpacks (Cloud Run "Continuously deploy from repository" or `gcloud run deploy --source .`); `npm start` honours `$PORT`; Secret Manager; demo reset; end-to-end run of the full story twice | ✅ |
| M8 | Persist drafts/Q&A, chat restore, delete endpoints, consent per case; fix bugs 2, 5, 7 | if time |
| M9 | **Post-hackathon:** extract `src/server/**` into a standalone service (Node/TS, same contract, also deployed from source without Docker); Postgres on Cloud SQL; real auth; real Gmail and tax-record connectors; encrypted file storage | after 18 Oct |

**Cut line if behind:** drop will/expert draft polish → drop M8 → drop PDFs (show checklist only). Never drop M2 (gates) or M5 (Verify).

---

## 12. Code layout (inside Next.js for v0)

```
frontend/src/
  app/api/...            # thin route handlers: validate (Zod) → call server/ → respond
  server/
    core/                # gate-engine, masking, audit, session, name-matching, rate-limit
    rules/               # claim-path, confidence, risk-score
    connectors/          # base.ts, mock/*, real/* (stubs)
    providers/           # identity, death-proof, registry (mock now)
    ai/                  # provider interface, gemini.ts, fixture.ts, prompts.ts
    agents/              # intake, source-reader, reconciler, inference, verify, copilot
    domain/              # journey-engine, case-service (existing, ported)
    pdf/                 # claim-pack templates
    data/                # resources, institutions, demo-reclaim/*, existing demos
  prisma/schema.prisma
```

`src/server/` must not import from `app/` or React code, so it can be lifted into a standalone service after the hackathon.

**Env vars:** `GEMINI_API_KEY` (or Vertex config), `DATABASE_URL`, `CONNECTOR_MODE_*`, `CONSOLE_KEY`, `DEMO_MODE`, `MAX_UPLOAD_MB=8`, `RATE_LIMIT_*`, `LOG_LEVEL`.

---

## Appendix A — Phase 1 reference (existing app, preserved)

### A.1 Existing frontend
Next.js 16 (App Router, standalone), React 19, TS, Tailwind 4, shadcn/ui, lucide, react-markdown. Single route `/` with client view state (`landing | intake | workspace | resources`). Identity = `localStorage["finlegacy_session"]` UUID sent as `x-session-id`. Error contract: non-2xx → `{ error: string }` → `ApiError`.

### A.2 Existing user flows
F1 intake chat → case; F2 load demo A/B/C; F3 my cases; F4 workspace overview; F5 asset inventory (confirm/dismiss/reopen/add); F6 document centre (upload/extract/verify fields); F7 journey tracker (status, evidence, next-best); F8 estate planning (draft will); F9 expert briefing pack; F10 ask about this case; F11 official portals directory.

### A.3 Existing endpoints
`GET /api/cases`, `GET /api/cases/:id`, `POST /api/intake`, `POST /api/demo`, `POST /api/assets`, `PATCH /api/assets/:id`, `POST /api/documents` (multipart ≤8 MB), `PATCH /api/documents/:id`, `PATCH /api/tasks/:id` (returns full workspace; recomputes progress/next-best/stage), `POST /api/ai/ask`, `POST /api/ai/draft` (`followup|will|expert`), `POST /api/ai/checklist`, `GET/POST /api/consent`, `GET /api/resources` (public). Response shapes: `src/lib/types.ts` (`CaseWorkspace` at line 89).

### A.4 Existing models
`Session`, `UserProfile` (unused), `LegacyCase` (8 case types; stages `understanding|discovery|documentation|action|resolution`), `AssetRecord` (8 categories; `possible|confirmed|dismissed`; `unverified|user_confirmed|institution_verified`; masked refs only), `DocumentRecord` (7 categories; extraction status; rawText ≤20k; extractedFields JSON; original file not stored), `JourneyTask` (dependencies, priority, `isNextBest`, 6 statuses, integration type), `CaseEvent` (append-only timeline), `ConsentRecord`, `IntakeMessage`. All child relations cascade on delete.

### A.5 Static data
Demo scenario cards (`dialogs.tsx`), example prompts (`intake.tsx`), expert types (`expert-tab.tsx`), asset filters (`assets-tab.tsx`), `lib/demo-data.ts` (3 seeds), `lib/resources.ts` (7 official portals; `officialLinkFor` duplicates it — consolidate into `server/data/resources.ts`).
