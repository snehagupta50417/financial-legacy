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
| `frontend/` — the product | Next.js app with intake chat, case workspace, trust gates G0–G4 (simulated providers), document extraction with Gemini, masking. Voice, claims, real sign-in and tests are not built yet — see [LLD §20](LLD.md#20-gap-analysis-against-the-prd-mvp). |
| `demo/` — hackathon demo | Standalone front-end demo with hardcoded data and an 80-second scripted Demo Mode. Not connected to `frontend/`. |

## Documents

Read in this order. Each document follows the one above it; if they disagree, the higher one wins.

| Document | What it covers |
| --- | --- |
| [ONE_PAGER.md](ONE_PAGER.md) | **Source of truth.** The vision, use cases, coverage, feasibility and business model |
| [PRD.md](PRD.md) | What the product does: personas, journeys, principles, requirements FL-01 to FL-56, metrics, release plan, open decisions |
| [BRD.md](BRD.md) | Why the business should exist: market figures, competitors, value proposition, revenue hypotheses, go-to-market, risks |
| [LLD.md](LLD.md) | How it is built: architecture, data model, trust gates, AI, voice, API, security, testing, gap analysis, build plan |
| [DESIGN.md](DESIGN.md) | How it looks and behaves: navigation, visual style, screens, states, accessibility, voice |
| [BACKEND_PLAN.md](BACKEND_PLAN.md) | Milestone plan for the AI Builder Cup hackathon build. **Hackathon only** — superseded wherever it conflicts with the PRD, BRD or LLD (see its header note) |
| [DECISIONS.md](DECISIONS.md) | Implementation decisions, newest last |
| [contracts/](contracts/README.md) | Superseded engineering contracts from an earlier design; reference only (LLD §23) |

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

Opens on http://localhost:3000 (health check: `/api/health`). Use `.env` rather than `.env.local` so both Next.js and Prisma read it. `npm run db:push` creates the local SQLite database in `frontend/prisma/db/`. Set `GEMINI_API_KEY` (or Vertex AI settings) in `.env` for AI features; without a key, AI features say they are unavailable. The target deployment is Google Cloud Run from source, with no Docker (LLD §17); it is not deployed yet.

**Hackathon demo** (`demo/`):

```bash
cd demo && npm install && npm run dev
```

Opens on http://localhost:5173. See [demo/README.md](demo/README.md) for presenter controls.
