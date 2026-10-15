# Financial Legacy

**Find what’s yours. Make sure nothing gets left behind.**

An AI-native platform helping individuals and authorized families in India discover financial assets, prepare a financial legacy and navigate claims.

## The product

Start with a conversation, not a form or dashboard. One persistent AI case manager gathers relevant information, organizes evidence, proposes permitted next steps and tracks work to a documented outcome.

| User need | What the product delivers |
| --- | --- |
| Find my own assets | Reviewed holdings, possible matches and clear discovery gaps |
| Prepare for my family | A dated financial record, preparation checklist and controlled sharing instructions |
| Find or claim a deceased relative’s assets | Authority-reviewed discovery and/or institution-specific claims assistance |

These paths work independently. A family with a known asset can go directly to claims. Discovery evidence, ownership, nominee information and legal entitlement remain distinct.

## Read in this order

1. **[PRD.md](PRD.md)** — the authoritative product contract: full vision, journeys, nine asset categories, 55 requirements, pilot/full-product scope, acceptance criteria, quality, metrics and open decisions.
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** — system boundaries and the three end-to-end flows, for a shared high-level understanding.
3. **[LLD.md](LLD.md)** — the proposed technical implementation: architecture, roles, schema, state transitions, API contracts, jobs, AI/tool boundaries, security, recovery and requirement-linked tests.
4. **[ACCEPTANCE.md](ACCEPTANCE.md)** — one verification row for each of the 55 requirements, scenario packs and release evidence.
5. **[ROADMAP.md](ROADMAP.md)** — delivery order and evidence needed to release the scope already defined in the PRD.

Before implementation, read **[CONTRIBUTING.md](CONTRIBUTING.md)** for work-item, change-request and PR rules. Each document has one role; the PRD remains the only product contract.

## The scope rule

**Nothing is implemented outside the PRD.** Every feature, screen, API, agent tool, integration, job, operational capability and material behavior change must map to a PRD requirement. Missing behavior requires a PRD amendment and product-owner acceptance before implementation. The LLD, roadmap and tickets cannot introduce new product scope.

P requirements define the proposed first pilot. F requirements define the full vision and remain disabled until their access, policy, quality and operational gates pass. Open decisions D-01–D-11 are blockers for affected capabilities, not permission to guess.

## Pilot and full vision

The pilot is a document-led responsive web experience: text onboarding, verification/authority workflow, secure uploads, reviewed bank/FD and mutual-fund inventory, legacy preparation/export and human-assisted claim packs/status tracking.

The full vision includes evaluated multilingual voice, all nine financial asset categories, verified collaboration and legacy sharing, controlled post-death information release, permitted live financial integrations and authorized automated follow-ups. Each has explicit PRD requirements and release conditions. A native mobile client requires a separate recorded decision; mobile web is included in the pilot.

## Trust rules

- Every holding has an evidence state: self-declared, potential match, document-backed or institution-verified.
- Every amount has a type, source and date. Possible matches and historical amounts do not become current confirmed totals.
- The AI proposes and coordinates; deterministic services enforce permissions, approvals and state changes.
- A trusted contact gets no automatic access. Inactivity or AI-inferred death cannot release records.
- Users inspect the exact recipient, documents and declarations before consequential disclosure/submission.
- The product does not guarantee complete discovery, determine inheritance, transfer funds or promise settlement.

## Repository status

**Documentation only · Version 0.2 · 15 October 2026.** No application, production source connection or institutional submission capability has been implemented. Technical choices and pilot boundaries are proposed; undecided requirements remain explicitly gated.

The documents consolidate the founder-supplied concept, remove its duplication and make supporting requirements explicit. Official-source references provide background context; they do not establish integration rights or replace institution-specific/qualified review.

## Working on this project

Begin with the relevant PRD IDs and release scope. Resolve blocking decisions, implement within the requirement, attach acceptance evidence and update LLD/roadmap in the same change. Preserve requirement IDs and record a release’s PRD version/Git commit.

Use synthetic fixtures. Never commit identity documents, financial statements, account identifiers, family claim evidence, credentials or real customer data.
