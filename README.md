# Financial Legacy

<p><img src="assets/financial-legacy-banner.svg" alt="Financial Legacy — find what’s yours, make sure nothing gets left behind" width="100%"></p>

**An AI-native financial asset discovery, legacy preparation and claims-assistance platform for individuals and families in India.**

[Product one-pager](ONE_PAGER.md) · [Product requirements](PRD.md) · [Start building](BUILD_SPEC.md) · [Architecture](ARCHITECTURE.md)

We’re building one capable assistant to help people understand what they own, prepare a clearer financial record for their families and navigate claims when the time comes. Financial Legacy connects the conversation, evidence and next steps in one persistent case.

> **Current stage:** product definition and engineering contracts. The next milestone is the synthetic-data reference implementation. No live financial discovery or institutional submission is operating in this repository.

## The problem we are solving

Financial assets become scattered across banks, employers, investment platforms and insurers. Records disappear, details change and families can be left with two difficult jobs: finding the assets and working through each institution’s claims process.

Financial Legacy is designed to make that work clearer, more organized and easier to carry forward.

## Three needs. One coordinated experience.

| Discover my assets | Prepare my legacy | Find or claim after a death |
| --- | --- | --- |
| Build a reviewed picture of known holdings, possible matches and discovery gaps. | Organize a dated financial record, preparation checklist and controlled sharing instructions. | Establish the right authority, assemble institution-specific claim packs and track requests and outcomes. |

Use any path independently. If an asset is already known, start directly with claims.

**Talk → verify → discover and review → prepare or claim → track the outcome.**

The AI case manager coordinates the workflow. Structured views let users inspect records and make decisions. The full vision includes multilingual voice, document intelligence, evidence reconciliation, controlled family sharing and permitted institutional follow-ups.

## Coverage, with clear boundaries

The initial build focuses on **bank accounts, fixed deposits and mutual funds**. The full vision also covers shares and demat holdings, unclaimed dividends and shares, life insurance, EPF, NPS, PPF and small savings, and bank lockers.

Each asset category, institution and source has its own requirements. User-supplied evidence and approved access routes form the foundation; the product does not assume unrestricted APIs or a single source that finds every asset.

## Trust by design

- **Evidence before certainty.** Holdings are labeled self-declared, potential match, document-backed or institution-verified.
- **Amounts with context.** Every value has a type, source and date. Historical values and possible matches do not become current confirmed totals.
- **Authority before action.** Identity, relationship, consent, authority and legal entitlement remain distinct.
- **Review before disclosure.** Users inspect the exact recipient, documents and purpose; material changes invalidate approval.
- **Controlled family access.** Adding a trusted contact creates no access. Inactivity or an inferred death cannot release records.
- **Honest outcomes.** The product assists with information and workflows; it does not guarantee complete discovery, decide inheritance, transfer funds or promise settlement.

## Explore the project

| You want to… | Start here |
| --- | --- |
| Understand the product in a few minutes | [Product one-pager](ONE_PAGER.md) |
| Review the complete product scope | [PRD](PRD.md): 55 traceable requirements, journeys, nine asset groups and release gates |
| Start implementation | [Coding handoff](BUILD_SPEC.md): fixed stack, screen behavior, defaults and B-01–B-11 work packages |
| Understand how the system fits together | [Architecture overview](ARCHITECTURE.md) and [low-level design](LLD.md) |
| Inspect exact engineering contracts | [OpenAPI](contracts/openapi.json), [PostgreSQL schema](contracts/schema.sql) and [synthetic fixtures](contracts/fixtures.json) |
| Review what must be verified | [Acceptance plan](ACCEPTANCE.md) and [delivery roadmap](ROADMAP.md) |
| Contribute without changing scope silently | [Contribution rules](CONTRIBUTING.md) and [coding-agent instructions](AGENTS.md) |

## Ready for the first implementation

**Start with B-01 in [BUILD_SPEC.md](BUILD_SPEC.md).** The reference build has a fixed local stack, 100 API operations, a 44-table relational contract, deterministic fixtures and an ordered implementation plan. It covers the three user paths using synthetic records and labeled stand-ins. Coding and runtime testing are the next work; documentation checks are not passing application tests.

The development setup needs no cloud credentials. Real financial access, external AI, family release and automated institutional actions remain behind their permission, policy, quality and release gates.

## One product contract

**The PRD is the scope authority.** Every feature, screen, API, tool, integration, job and material behavior change maps to a requirement. New product behavior enters the PRD before implementation. The one-pager explains the product; the technical documents and contracts define how to build and verify the accepted scope.

Use synthetic fixtures and generated local secrets. Never commit real financial records, identity documents, family claim evidence or credentials.

---

**Specification v0.3 · India-focused · Documentation and implementation contracts**
