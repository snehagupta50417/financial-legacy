# Financial Legacy

<p><img src="assets/financial-legacy-banner.svg" alt="Financial Legacy — find what’s yours, make sure nothing gets left behind" width="100%"></p>

**An AI-native financial asset discovery, legacy planning and recovery platform.**
**Find what’s yours. Make sure nothing gets left behind.**

## The problem

People spread their money across banks, fund houses, insurers and government schemes, then change jobs, cities and phone numbers, lose documents and forget to update nominees. When someone dies, their family faces two problems: **discovering** what existed, and **recovering** each asset through a separate institutional process. India has useful pieces — RBI UDGAM, SEBI MITRA, DigiLocker, Account Aggregator, IEPF — but no single process that ties them together.

## What we are building

An **AI assistant that manages the whole case**, not a dashboard. It does three things, together or on their own:

| Capability | What the person gets |
| --- | --- |
| **Discover** | A reviewed inventory, with confirmed holdings, possible matches and open leads kept separate |
| **Plan a legacy** | A dated record of their assets, a checklist of missing nominees and documents, and a safe way to share it when they choose |
| **Claim and recover** | Help claiming a deceased person's assets: authority checks, institution-specific claim packs, tracking to a documented outcome |

**Talk to AI → verify identity and authority → discover through permitted sources → consolidate and verify → prepare or claim → track to completion.**

The product serves **everyone with Indian financial assets**. The first pilot focuses on **bereaved families**.

## Principles

- **Evidence before claims.** Every asset is labelled *self-declared*, *potential match*, *document-backed* or *institution-verified*. A possible match is never shown as confirmed ownership.
- **Honest coverage.** We say what we checked and what we didn't. We never promise to find everything.
- **Authority before access.** Identity, death, relationship and per-asset entitlement are proven before sensitive details are shown (trust gates G0–G4).
- **The user approves anything consequential.** The AI prepares; the person decides. We never hold or move money, and never sell data.
- **AI assists; people and institutions decide.** Access, entitlement and risk are decided by deterministic code and reviewers, not by the AI.

## First version (MVP)

- All three journeys, by **voice and chat**, on responsive web.
- **Bank accounts and FDs, mutual funds, and life insurance.**
- Discovery from **uploaded documents** and **guided use of official searches** (UDGAM, MITRA / MFCentral, insurer searches, the government's common portal).
- Claim packs prepared for review; **the family submits them**; the product tracks the outcome.
- **Synthetic data only** until the pilot's privacy, authority and provider policies are approved.

Later: more asset types (shares, IEPF, EPF, NPS, PPF, lockers), approved live connectors, direct submission, family sharing, and a Verify console for banks and insurers.

## Status

**Not live.** No real users, data, partners or integrations.

| Part | State |
| --- | --- |
| `frontend/` — the product | **Keeper web app (new):** public site, mocked sign-in and a conversation-first app (voice and chat, assets, documents, family record, claims, activity) running on a clearly labelled deterministic demo assistant with synthetic data in the browser — not yet wired to the backend below. **Backend, built and tested:** intake (AI or rules), case workspace, trust gates G0–G4 (simulated providers), document extraction (Gemini, local OCR, text rules), per-field review with history, four evidence statuses, dated amounts and honest totals, grounded Q&A with sources (RAG), claims for bank / mutual fund / LIC with packs, approval and tracking. 106 tests and CI. **Not built:** real sign-in, a permanent database, guided search outcomes, legacy record, voice, operations — see [LLD §20](LLD.md#20-gap-analysis-against-the-prd-mvp). |
| Hosting and cost | **Free tier only** — Google Cloud free tier, a free Gemini API key (synthetic data only), GitHub Actions free minutes. See [docs/FREE_TIER_PLAN.md](docs/FREE_TIER_PLAN.md). |

## Documents

Read in this order. Each document follows the one above it; if they disagree, the higher one wins.

| Document | What it covers |
| --- | --- |
| [ONE_PAGER.md](ONE_PAGER.md) | **Source of truth.** The vision, use cases, coverage, feasibility and business model |
| [PRD.md](PRD.md) | What the product does: personas, journeys, principles, requirements FL-01 to FL-56, metrics, release plan, open decisions |
| [BRD.md](BRD.md) | Why the business should exist: market figures, competitors, value proposition, revenue hypotheses, go-to-market, risks |
| [LLD.md](LLD.md) | How it is built: architecture, data model, trust gates, AI, voice, API, security, testing, gap analysis, build plan |
| [DESIGN.md](DESIGN.md) | How it looks and behaves: navigation, visual style, screens, states, accessibility, voice |
| [docs/](docs/README.md) | Pre-Pilot documents: free-tier plan, Google Cloud setup, threat model, privacy (DPDP) assessment, AI evaluation plan, source-by-source validation matrix, feasibility and compliance |
| [DECISIONS.md](DECISIONS.md) | Implementation decisions, newest last |

## Running it

**Product app** (`frontend/`, Node ≥ 22). From the `frontend/` folder:

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run db:push
```

```bash
npm run dev
```

Opens on http://localhost:3000 (health check: `/api/health`). Use `.env` rather than `.env.local` so both Next.js and Prisma read it. `npm run db:push` creates the local SQLite database in `frontend/prisma/db/`.

**AI key (optional):** put a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) in `GEMINI_API_KEY`. Use synthetic data only — the free tier's terms let Google use prompts to improve its products. Without a key the app still works: rule-based intake, local OCR and text rules for documents, keyword search with matching passages for questions; only drafting is off. Every setting is explained in [`frontend/.env.example`](frontend/.env.example).

**Checks** (the same ones CI runs on every PR):

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```

Tests use a throwaway SQLite database and never call a real model (set `LIVE_AI=1` to allow it). The OCR tests download Tesseract's English and Hindi data once.

**Deploying:** Google Cloud Run from source, no Docker, free tier only — [docs/CLOUD_SETUP.md](docs/CLOUD_SETUP.md). Not deployed yet.
