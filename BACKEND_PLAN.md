# Hackathon Build Plan — Financial Legacy

> **What this is:** the milestone plan for the **AI Builder Cup 2026** prototype (Google Cloud, BFSI theme), due **18 Oct 2026** — Phase A in [LLD §21](LLD.md#21-build-plan). After the hackathon, the LLD's Phase B (issues #10–#20) takes over.
>
> **Order of authority:** [ONE_PAGER.md](ONE_PAGER.md) → [PRD.md](PRD.md) → [BRD.md](BRD.md) / [LLD.md](LLD.md) → this plan. If anything here disagrees with them, they win. This plan wins only over the existing code.
>
> **Rule for the coding agent:** build in the order of §11. Finish and verify one milestone before starting the next. Follow [CONTRIBUTING.md](CONTRIBUTING.md) and [frontend/AGENTS.md](frontend/AGENTS.md). Record decisions in [DECISIONS.md](DECISIONS.md).
>
> **Version:** v3 (17 Oct 2026) — rewritten to match the one-pager, PRD v0.6.2 and LLD v0.5.1. v2 is in git history.

---

## 1. Product context (read first)

**What Financial Legacy is.** An AI assistant that helps Indian individuals and families **discover** financial assets, **plan a legacy** so their family can find everything later, and **claim and recover** a deceased person's assets — managing the case, not just answering questions ([ONE_PAGER.md](ONE_PAGER.md)).

**Why it matters.** Official figures show large unclaimed sums: ₹60,518 crore of unclaimed deposits from public-sector banks in RBI's DEA Fund (Jan 2026), ₹8,974 crore with insurers and ₹3,749 crore in mutual funds (Feb 2026) — see [BRD §3](BRD.md#3-market-opportunity) for sources and caveats. About 89 lakh deaths are registered in India each year, each one potentially leaving a family to find and claim scattered assets.

**What the hackathon prototype shows.** The pilot focus — **a bereaved family finding and claiming a parent's assets** (PRD Journey C) — end to end: prove identity, death and relationship; see assets appear masked and evidence-linked; get a per-asset claim plan and a prepared claim pack the family reviews and submits themselves.

**Also shown, as a clearly labelled demo of a Later capability:** a **Verify console** where a bank or insurer reviews a death claim's documents for consistency, duplicates and completeness (PRD FL-56, Later). It illustrates the "software for institutions" revenue hypothesis ([BRD §7](BRD.md#7-business-model)); no revenue stream has been chosen yet (PRD D-08).

**Product principles (non-negotiable — from PRD §6 and LLD §1):**
1. **Prove before you see.** Name + DOB + PAN alone unlock nothing. No discovery and no asset data before gate G3 (§3).
2. **Code decides access.** The LLM extracts, explains and drafts; it never decides access, entitlement, verification or risk.
3. **Mask by default.** Below G4 (per asset): institution, category, value band, last-4 only.
4. **Upload and guided search first.** MVP discovery is documents the family uploads plus guided use of official searches (UDGAM, MITRA/MFCentral, insurer searches, the government common portal). Email, tax-record and SMS **connectors are Later**; in the hackathon demo they may appear as mocks labelled "Simulated".
5. **Read, extract, forget.** Store extracted fields and short evidence snippets; never raw email/SMS bodies.
6. **Everything is logged** in an append-only audit trail visible to the user.
7. **Humans confirm.** Four evidence statuses — self-declared, potential match, document-backed, institution-verified. An inferred asset is always a potential match, never verified.
8. **The family approves and submits.** The product prepares claim packs; the user approves the exact pack and submits it to the institution. The product never says it submitted a claim.
9. **Synthetic data only.** No real personal documents reach any model, test or screenshot.

**Platform:** one responsive web app on Google Cloud Run (region `asia-south1`), deployed from source — no Docker. No native app.

---

## 2. Key decisions

| # | Question | Decision |
|---|---|---|
| Q1 | What is "the backend"? | Hardened Next.js API routes in `frontend/` (`src/server/**`). A standalone service later only if needed (LLD §21, M9). |
| Q2 | Do `LLD.md` / `contracts/` constrain this? | **Yes — LLD v0.5.1 describes this codebase and the PRD wins.** The old `contracts/` folder was removed. |
| Q3 | Language / framework | TypeScript inside Next.js; Zod for validation. |
| Q4 | Database | SQLite via Prisma for the hackathon; Cloud SQL PostgreSQL with migrations for the MVP (issue #11). |
| Q5 | Deployment | Cloud Run from source with buildpacks; `npm run build` / `npm start` on `$PORT`; secrets in Secret Manager. Setup: [docs/CLOUD_SETUP.md](docs/CLOUD_SETUP.md). |
| Q6 | LLM provider | Gemini via `@google/genai` (API key or Vertex AI); provider interface + fixture provider for tests. |
| Q7 | Auth | Anonymous `x-session-id` only for the hackathon (synthetic data). MVP: Google Identity Platform — phone OTP + Google sign-in (issue #12). |
| Q8 | Store original uploads? | Not in the hackathon. MVP: encrypted Cloud Storage. |
| Q9 | Images | Gemini vision for scanned documents (passbooks, certificates). |
| Q10 | Deletion endpoints | Yes: delete case, delete session. |
| Q11 | Committed `frontend/db/custom.db` | Removed and **purged from git history** (17 Oct 2026). |
| Q12 | Checklist / follow-up / consent / UserProfile | Keep; consent is per case and per source (§5). |
| Q13 | Persist drafts and Q&A | Yes (`Draft`, `QaMessage`). |
| Q14 | Restore intake chat | Yes: `GET /api/cases/:id/messages`. |
| Q15 | Reminders / notifications | Not in the hackathon. In-app reminders in the MVP (issue #19). |
| Q16 | Voice | Not in the hackathon. MVP: Google Cloud Speech-to-Text + Text-to-Speech; English (India), Hindi, Hinglish, Tamil (issue #18). |

---

## 3. Trust gates (the core security model)

Gate state is stored per case (`gateReached`) and, for G4, per asset (`entitled`). Details: [LLD §7](LLD.md#7-trust-gates-and-access-control).

| Gate | Proof | Hackathon provider (simulated, labelled) | Unlocks |
|---|---|---|---|
| **G0 Account** | control of a session | anonymous `x-session-id` | intake chat, guides, official resources, demos |
| **G1 Identity** | user is a specific real person | mock DigiLocker; passport + selfie for users abroad | personal cases; opening a case about someone else |
| **G2 Death** | the named person has died | mock DigiLocker registry lookup, or certificate scan read by Gemini and matched by code | case active; **still no discovery** |
| **G3 Relationship or role** | evidenced claimant role — relative, nominee, legal heir, executor or surviving joint holder — or a living person's consent | heir's own document; legal-heir certificate; nominee/joint-holder record; executor in a will; relative consent (mock) | discovery; assets visible **masked** |
| **G4 Entitlement** (per asset) | user may claim *this* asset | nominee/joint-holder record, legal-heir or succession certificate (mock) | full details + claim pack for that asset |

Rules (built in `src/server/core/`): pure gate functions with a `requireGate` guard on every case-scoped route; masking on every asset leaving the API; transliteration-aware name matching (mismatch → review, never auto-reject); **one case per deceased** (a second claimant's case freezes both until an operator reviews); living-person guard (activity after the date of death freezes the case).

**Case types** map onto the PRD's three journeys ([LLD §6](LLD.md#6-case-types-and-journeys)): `living_individual` → Discover; `estate_planning`, `caregiver` → Plan a legacy (caregiver needs the relative's consent); `family_death`, `nominee_heir`, `rejected_claim`, `nri_cross_border` → Find and claim after a death.

---

## 4. Discovery

**MVP / hackathon path:**
1. **Uploaded documents** → extraction (unpdf or Gemini vision) → redacted fields → holdings as potential matches, or document-backed after review.
2. **Guided official searches** from `src/server/data/resources.ts`: the product proposes the searches that fit the case, opens the portal, and the user logs the outcome — found / not found / partial / blocked / failed (`ResourceVisit`). A "found" outcome becomes a **potential match**. UDGAM covers only old unclaimed deposits in RBI's DEA Fund, not every account. No official portal offers an API ([docs/SOURCE_VALIDATION.md](docs/SOURCE_VALIDATION.md)).
3. **Inference** from documents (e.g. recurring interest credits suggesting an FD) → potential match only.

**Connectors — Later (demo mocks allowed):**

```ts
interface Connector {
  id: "email" | "tax_record" | "sms" | "statement" | "registry" | "scan";
  connect(caseId: string, consent: ConsentInput): Promise<void>;
  fetchSignals(caseId: string): Promise<Signal[]>;
  disconnect(caseId: string): Promise<void>;
}
```

- Mode per source: `CONNECTOR_MODE_<SOURCE>=mock|real`. In the hackathon, only `mock` (labelled "Simulated") plus real Gemini vision for scans of synthetic images.
- Pipeline: filter financial senders (drop OTPs) → Gemini structured extraction into `Signal` → match to `Institution` → merge into `AssetRecord` (same institution + category + last-4 = candidate duplicate, reviewed) → confidence → masking.
- Real connectors (Gmail read-only, tax record AIS/26AS, statements via email, Android SMS companion) are Later and need consent, approval and, for Gmail, Google's security review (PRD FL-27).

---

## 5. Data model

Built models (M2) are listed in [LLD §5.1](LLD.md#51-existing-models): `Session`, `UserProfile`, `LegacyCase` (+ `gateReached`, `frozenReason`, `deceasedPersonId`, `linkedCaseId`), `DeceasedPerson`, `Claimant`, `Proof`, `AssetRecord` (+ `entitled`, `valueBand`, `last4`), `DocumentRecord`, `Signal`, `Institution`, `JourneyTask`, `ClaimPack`, `ConsentRecord` (per case and source), `CaseEvent`, `IntakeMessage`, `QaMessage`, `Draft`, `ResourceVisit`, and — for the Later Verify console — `InstitutionClaim`, `CheckResult`.

The MVP adds `evidenceStatus`, `Observation`, field review, `Approval`, `Claim`, `Hold`, `LegacySnapshot`, `TrustedContact` and `User` ([LLD §5.2](LLD.md#52-changes-required-for-the-prd-mvp)). All enums enforced with Zod. Never store full account numbers, full PAN or raw message bodies (full identifiers come later as separately encrypted fields readable only at G4).

---

## 6. API contract

Common rules: `x-session-id` header (hackathon); errors as `{ "error": string }`; foreign IDs return 404; locked gate 403 `{error, nextGate}`; frozen case 423; JSON-in-string fields always parsed. Full inventory with built/to-build status: [LLD §15.2](LLD.md#152-endpoints).

**Built:** `GET /api/health`, `GET /api/resources`, `POST /api/intake`, `POST /api/demo`, `GET /api/cases`, `GET /api/cases/:id`, `POST /api/cases/:id/proofs/:kind`, `POST/PATCH /api/assets`, `POST /api/assets/:id/entitlement`, `POST/PATCH /api/documents`, `PATCH /api/tasks/:id`, `POST /api/ai/ask|draft|checklist`, `GET/POST /api/consent`.

**Hackathon additions:**

| Method | Path | Purpose | Gate |
|---|---|---|---|
| POST | `/api/cases/:id/discover` | run discovery (documents + mock connectors in demo) | G3 |
| GET | `/api/cases/:id/discovery` | poll progress (assets appear incrementally) | G3 |
| GET | `/api/cases/:id/plan` | claim path per confirmed asset + ordered plan | G3 |
| POST | `/api/assets/:id/claim-pack` | generate claim pack (checklist + pre-filled forms) | G4 |
| GET | `/api/claim-packs/:id/:form.pdf` | download a pre-filled form | G4 |
| POST | `/api/claim-packs/:id/approve` | user approves the exact pack (content hash, recipient, purpose) | G4 |
| POST | `/api/claims/:id/receipt` | user records that they submitted it, with any reference | G4 |
| GET | `/api/cases/:id/messages` | restore intake chat | owner |
| GET | `/api/cases/:id/audit` | audit trail | owner |
| POST | `/api/resources/:id/visit`, `/api/visits/:id/outcome` | guided official search | G0 / G3 |
| DELETE | `/api/cases/:id`, `/api/session` | data deletion | owner |
| GET/POST | `/api/console/claims…` | Verify console (demo of Later FL-56) | reviewer |
| POST | `/api/admin/reset` | wipe and reseed demo data (off in production unless `DEMO_MODE=true`) | admin |

There is **no** endpoint that marks a claim as sent on the user's behalf. In the demo, a recorded receipt may create an `InstitutionClaim` so the Verify console has something to review — labelled "Simulated".

---

## 7. Verify console (demo of a Later capability)

PRD FL-56 — Later. Built for the hackathon demo only, behind `CONSOLE_KEY` and a "claims desk" login, every screen labelled "Simulated".

- **Checks**, each stored as a `CheckResult` with evidence: consistency (names, dates, relationships across documents — Gemini compares, code records pass/fail); authenticity **signals** (layout, font or date-field mismatches — a signal, never proof of fraud); duplicate claims across claimants; completeness for the chosen claim path.
- **Risk level** (Low / Medium / High) computed by code from the checks, each reason linked to evidence. The LLM never sets it.
- **Actions:** approve, request documents (drafts a message), escalate — all logged.
- **Timeline display:** days left under RBI's 15-day settlement rule for bank claims.

---

## 8. Demo case (`demo-reclaim`, synthetic)

A pilot-style story: a bereaved family.

- Deceased: **Rajesh Kumar Sharma**, Delhi. Heir: daughter **Ananya Sharma**, who lives in Toronto (shows the extra documents needed from abroad).
- What the family has and finds:
  - **Uploaded documents:** an LIC policy bond, a CAMS consolidated statement, an HDFC savings statement whose recurring interest credits suggest an FD (**potential match**).
  - **Guided official search:** UDGAM outcome logged as one old dormant deposit (**potential match** until the bank confirms).
  - **Scan:** an old physical share certificate (generated image; real Gemini extraction) — shown as a Later asset type.
  - **Simulated connectors** (labelled): email and tax-record signals, including a dividend from a company with no known holding (**potential match**), and SMS alerts with 3 OTP messages that must be filtered out.
- Impostor (for the Verify demo): "nephew" **Vikram Sharma** claims the LIC policy with an **edited death certificate** (different date of death, mismatched font in the date field).
- Expected result: about 7 holdings, each with an evidence status; Ananya's LIC claim = Low risk; Vikram's = High (date mismatch + edited-field signal + duplicate claim).
- Seed files live in `src/server/data/demo-reclaim/` with a README listing every planted clue and the expected outcome.

---

## 9. Claim-path rules and claim packs

`src/server/rules/claim-path.ts` — code, not the LLM, chooses the path per confirmed holding; Gemini only writes the plain-language explanation. Thresholds live in versioned configuration with their sources ([docs/SOURCE_VALIDATION.md](docs/SOURCE_VALIDATION.md) §3):

| Path | When |
|---|---|
| `nominee` | Nominee recorded and alive |
| `joint` | Surviving joint holder |
| `quick` | Mutual funds, no nominee, up to ₹10,000 per fund house, immediate relative (SEBI circular, 23 Jul 2026) |
| `simplified` | No nominee: bank deposits up to ₹15 lakh at commercial banks / ₹5 lakh at co-operative banks (RBI Directions 2025, 26 Sep 2025); mutual funds up to ₹10 lakh (₹30 lakh demat) |
| `succession` | Above threshold, disputed, or required by the institution |

- Ordered recovery plan across assets (e.g. legal heir certificate before no-nominee claims), mapped onto journey tasks.
- **Hackathon pack templates (MVP asset types):** bank deceased-claim form (RBI Annex I-A / I-B summary), mutual fund transmission request summary, and LIC death claim (Form 3783 summary). Pre-filled from reviewed case data; full identifiers only at G4; marked as prepared for the family, not official forms.
- Shown to the family: banks must settle within **15 days** of complete documents, with compensation at least **Bank Rate + 4%** for delay; mutual funds within **21 days**. Insurance timelines only once verified.

**After the hackathon (MVP):** delay-compensation letter, escalation ladder (bank → RBI ombudsman; insurer → Bima Bharosa → Insurance Ombudsman), rejected-claim journey depth (issue #16).

---

## 10. Bugs to fix while hardening

| # | Bug | Status (per [DECISIONS.md](DECISIONS.md)) |
|---|---|---|
| 1 | Intake history not filtered by `caseId` | Fixed (M2) |
| 2 | `POST /api/consent` attaches to the most recent case | Open — must take explicit `caseId` |
| 3 | `PATCH /api/documents/:id` returns raw `extractedFields` string | Fixed (M2) |
| 4 | System prompt sent as `role: "assistant"` | Fixed (M1) |
| 5 | Demo route crashes when all tasks complete | Fixed (M2) |
| 6 | Asset de-dup by first 12 characters of institution | Open — replace with institution + category + last-4, reviewed |
| 7 | No AI rate limit; no upload type validation | Fixed (M1 rate limit, M2 magic bytes) |

`typescript.ignoreBuildErrors` was removed in M0; keep it off.

---

## 11. Build order (deadline-first)

| # | Milestone | Status |
|---|---|---|
| M0 | Security cleanup: remove `custom.db` (and purge history), `.gitignore`, remove Docker/Caddy, `/api/health`, `.env.example`, `ignoreBuildErrors` off | ✅ Done (history purged 17 Oct) |
| M1 | Gemini swap: provider interface, Gemini adapter, fixture provider, fallbacks, rate limits | ✅ Done |
| M2 | Schema + gates: models, gate engine, masking, name matching, one-case-per-deceased, audit events, proof endpoints with mock providers | ✅ Done |
| M3 | Gate UI: proof screens and locked/masked/frozen states | ✅ Done |
| M4 | Discovery: guided searches with outcome logging, document pipeline, mock connectors (labelled) for the demo, `demo-reclaim` seeds, Gemini vision for scans, incremental assets; fix bug 6 | Next |
| M5 | Verify console (demo of Later FL-56): checks, risk level by code, decisions, console UI | Demo only |
| M6 | Claim paths and packs: rules with cited thresholds, plan, 3 MVP-asset templates, entitlement (G4), approve + receipt | Next |
| M7 | Deploy: Cloud Run from source, Secret Manager, demo reset, run the full story twice ([docs/CLOUD_SETUP.md](docs/CLOUD_SETUP.md)) | Next |
| M8 | Persist drafts/Q&A, chat restore, delete endpoints; fix bug 2 | If time |
| — | **After the hackathon:** LLD Phase B, issues #10–#20, starting with tests and CI (#10) | — |

**Cut line if behind:** drop M8 → drop the Verify console (M5, a Later capability) → drop PDFs (show the checklist only). **Never drop the gates (M2/M3)** or the labelling of anything simulated.

---

## 12. Code layout

```
frontend/src/
  app/api/...            # thin route handlers: validate (Zod) → call server/ → respond
  server/
    core/                # gate-engine, masking, access, session, name-match, rate-limit, upload, crypto
    rules/               # claim-path, confidence, totals
    connectors/          # base.ts, mock/* (demo), real/* (Later)
    providers/           # identity, death-proof, relationship, entitlement (mock now)
    ai/                  # provider interface, gemini.ts, fixture.ts
    domain/              # journey-engine, case-service, gates
    pdf/                 # claim-pack templates
    data/                # resources, institutions, demo-reclaim/*, demo data
  prisma/schema.prisma
```

`src/server/` must not import from `app/` or React code.

**Env vars:** see [LLD §18](LLD.md#18-configuration).

---

## Appendix — the original prototype (before M0)

Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui. Single route `/` with client view state (`landing | intake | workspace | resources`). Identity was a `localStorage` UUID sent as `x-session-id`. Original flows: intake chat → case; demo cases; my cases; workspace overview; asset inventory; document centre; journey tracker; estate planning (AI will draft — to become "Notes for your lawyer", DESIGN §7.1); expert briefing pack; ask about this case; official portals directory. The original endpoints are the "Built" list in §6.
