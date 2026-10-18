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
| `frontend/` — the Keeper web app | **Keeper web app:** public site, mocked sign-in and a conversation-first app (voice and chat, assets, documents, family record, claims, activity) with its original landing, sign-in, chat, voice, sidebar and detail layouts. Normal Continue now uses the backend through the Keeper store adapter; Explore a sample retains the clearly labelled offline engine. Calls the API through a same-origin `/api/*` proxy. |
| `backend/` — the API service | **Built and tested, runs on its own:** intake (AI or rules), case workspace, trust gates G0–G4 (simulated providers), document extraction (Gemini, local OCR, text rules), per-field review with history, four evidence statuses, dated amounts and honest totals, grounded Q&A with sources (RAG), claims for bank / mutual fund / LIC with packs, approval and tracking. 159 tests across both services and CI. **Not built:** real sign-in, a permanent database, guided search outcomes, legacy record, voice, operations — see [LLD §20](LLD.md#20-gap-analysis-against-the-prd-mvp). |
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

## Hosted synthetic MVP setup

Google sign-in, account-scoped data deletion and dated guided-search outcomes are implemented and tested locally. Hosted PostgreSQL generation and Cloud Run source packaging are ready. A Supabase Free project and Google Cloud project configuration are still required before claiming a deployed MVP. Follow [docs/HOSTED_MVP_SETUP.md](docs/HOSTED_MVP_SETUP.md). Startup never initialises the database automatically; use `npm run db:setup --prefix backend` explicitly for new environments.

## Running it

Two small services and one shared folder (Node ≥ 22):

| Folder | What it is | Local address |
| --- | --- | --- |
| [`backend/`](backend/) | The API: trust gates, masking, OCR, RAG, claims, the AI agent (Hono + Prisma + SQLite) | http://localhost:4000 |
| [`frontend/`](frontend/) | The Keeper web app (Next.js). Forwards `/api/*` to the backend | http://localhost:3000 |
| [`shared/`](shared/) | Types and pure claim rules both sides use. No runtime of its own | — |

**Quickest way — both together.** From the repository root, once:

```bash
npm install
```

```bash
npm run setup
```

```bash
cp backend/.env.example backend/.env
```

then, any time:

```bash
npm run dev
```

This starts the API on :4000, waits until it is healthy, then starts the web app on :3000 (which forwards `/api/*` to the API). Open http://localhost:3000. `npm run typecheck`, `npm test` and `npm run build` at the root run both services. Or run them one at a time:

**1. Backend.** From `backend/`:

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

Health check: http://localhost:4000/api/health. `npm run db:push` creates the local SQLite database in `backend/prisma/db/`.

**2. Frontend.** In a second terminal, from `frontend/`:

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. The frontend expects the backend at `http://localhost:4000`; set `BACKEND_URL` (see `frontend/.env.example`) to point elsewhere.

**AI key (optional):** get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey), then from the repository root run `npm run set-key`. It asks for the key without showing it, saves it to `backend/.env` (git-ignored), and checks that Google accepts it. Restart the API afterwards. **Indian-language speech (optional):** with a Sarvam API key, run `npm run set-sarvam-key` the same way. Calls then understand Hindi, Tamil, Telugu and more (and answer in the same language); without it, the browser's own speech recognition is used. Use synthetic data only — the free tier's terms let Google use prompts to improve its products. Without a key the app still works: rule-based intake, local OCR and text rules for documents, keyword search with matching passages for questions; drafting and the AI voice agent are off. Every setting is explained in [`backend/.env.example`](backend/.env.example).

**Checks** (the same ones CI runs on every PR). In each of `backend/` and `frontend/`:

```bash
npm run typecheck
```

```bash
npm test
```

In `frontend/` also `npm run lint` and `npm run build`. Tests use a throwaway SQLite database and never call a real model (set `LIVE_AI=1` in `backend/` to allow it). The OCR tests download Tesseract's English and Hindi data once. `frontend/test/integration` runs the Keeper adapter against the real backend route handlers.

**Deploying:** two Google Cloud Run services (backend, then frontend) from source, no Docker, free tier only — [docs/CLOUD_SETUP.md](docs/CLOUD_SETUP.md). Not deployed yet.


**Connected Keeper:** Open `/` for the original landing page, then Continue to Keeper. Cases and original screen controls connect through `src/keeper/backend.ts`; there is no replacement workspace layout. Use synthetic data only. Family records and contact-view drafts are saved, but no real contact invitations or sharing happen. Identity and institutional providers remain prototypes.
