# Financial Legacy

**Find what’s yours. Make sure nothing gets left behind.**

An AI-native financial asset discovery, legacy preparation and claims-assistance product for individuals and authorized families in India.

## Next step: coding

**Start B-01 in [BUILD_SPEC.md](BUILD_SPEC.md): scaffold the fixed stack and local environment.** The handoff specifies architecture, repository layout, API/database contracts, deterministic policy, UI interactions, jobs, failure behavior, fixtures and B-01–B-11 implementation order. Framework/field/default selection is complete for the reference build.

The first implementation is an explicitly labeled **synthetic-only reference release** covering all three journeys and P behavior. It needs no cloud credentials and performs no real identity verification, financial search, external AI call or institutional submission. Real-data deployment and F expansion remain separate permission/policy/quality gates.

## The three user paths

| Need | Outcome |
| --- | --- |
| Discover my assets | Reviewed holdings, separate potential matches and honest coverage/gaps |
| Prepare my legacy | Dated financial record, preparation checklist and controlled sharing instructions |
| Discover/claim after a death | Action-specific authority review and independent institution claim cases; known assets skip discovery |

Discovery evidence, ownership, nominees, consent, authority, approval and institutional entitlement remain distinct. The AI coordinates proposals; deterministic services control permissions and state transitions.

## Documentation and contracts

| Read | Purpose |
| --- | --- |
| [PRD.md](PRD.md) | Sole product contract: full vision, 55 requirements, nine asset groups, first principles, P/F scope, acceptance and real-data gates |
| [ARCHITECTURE.md](ARCHITECTURE.md) | High-level system boundaries and end-to-end flows |
| [BUILD_SPEC.md](BUILD_SPEC.md) | Concrete coding handoff and ordered implementation packages; start B-01 |
| [LLD.md](LLD.md) | Domain model, policies, transitions, technical flow/operations and PRD mapping |
| [contracts/openapi.json](contracts/openapi.json) | OpenAPI 3.1 wire contract: strict models, 100 operations, errors, headers and disabled F scope |
| [contracts/schema.sql](contracts/schema.sql) | PostgreSQL 18 relational contract: 44 tables, scoped keys/checks/RLS and runtime roles |
| [contracts/fixtures.json](contracts/fixtures.json) | Synthetic seed scenarios and deterministic expected outcomes; generated PDF hashes computed at bootstrap |
| [ACCEPTANCE.md](ACCEPTANCE.md) | All 55 requirements mapped to evidence plus concrete reference test oracles |
| [ROADMAP.md](ROADMAP.md) | Release gates and sequencing; not an alternate source of product scope |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Work-item, change-request and PR rules |
| [AGENTS.md](AGENTS.md) | Coding-agent instructions enforcing the same scope discipline |

## Scope rule

**Nothing is implemented outside the PRD.** Every feature, screen, API, tool, integration, job, operational capability and material behavior change maps to a requirement. Missing product behavior requires a PRD amendment and owner acceptance before implementation. Supporting contracts refine existing scope; they cannot authorize live access or add a hidden feature.

## Trust and build rules

- Preserve evidence/source/date/uncertainty; no name-only verification or inferred zero.
- Use exact Decimal amounts; reference inventory oracle is INR 44,500 after explicit exclusions.
- Require exact recipient/content/purpose review; invalidate approvals on material change.
- Treat uncertain external acceptance as unknown and reconcile before retry.
- Adding a trusted contact creates no access; no inferred-death release or asset transfer.
- Use synthetic fixtures and generated local secrets; never commit real financial/identity/family records or credentials.

## Status

**Version 0.3 · 15 October 2026 · Coding contracts, not a working application.** The first implementation is ready to start from B-01. JSON/reference/coverage checks on documentation do not equal executed SQL migrations or passing application tests; those are explicit coding deliverables. A reference build does not establish real integration rights, legal authority, provider quality or launch approval.
