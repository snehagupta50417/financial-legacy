# Working on Financial Legacy

## 1. One product contract

[PRD.md](PRD.md) is authoritative. Every feature, screen, API, agent tool, integration, job, operational capability and material behavior change must map to its requirement IDs (FL-55). The architecture, LLD, acceptance plan, roadmap, issue and PR cannot create new product scope.

Before writing implementation, read [README.md](README.md), the relevant PRD journey/requirements and their D decisions, then [LLD.md](LLD.md) and [ACCEPTANCE.md](ACCEPTANCE.md). P/F labels are scope controls, not informal priorities. A pending decision or disabled connector is not permission to choose a user-facing answer silently.

## 2. Ready-to-build work item

Include:

- Problem/user journey and PRD requirement IDs.
- Release P/F and resolved blocking D decisions with owner acceptance.
- Intended behavior, permissions/data/recipients and relevant states.
- Affected API/event/schema/provider versions and migration/compatibility impact.
- Failure, uncertainty, hold, revocation, retry and human handoff behavior.
- Acceptance scenarios/evidence, owner and operational dependency.

If a field reveals missing product behavior, stop that dependent work and amend the PRD. Independent work already covered can continue.

## 3. Product change request

State the problem, proposed requirement/acceptance change, why existing scope is insufficient, affected users/data/permissions, release/dependencies, risks, migration/compatibility and owner. Update the PRD first and obtain product-owner acceptance before implementation. Update related LLD, architecture, acceptance plan and roadmap together. Pure implementation choices within an existing contract need no new product feature; record material technical tradeoffs and keep the mapping.

Preserve requirement IDs; retire rather than reuse numbers. D decisions are resolved in the PRD with an owner/date and corresponding requirement change. Do not keep a contradictory decision list elsewhere.

## 4. Implementation PR checklist

- PRD IDs and accepted baseline version stated; no unmapped scope.
- Implementation matches supported P/F/source/subject/channel scope.
- Relevant normal/negative cases and operational checks have evidence.
- No fabricated source access, verified holding, current balance or claim outcome.
- Authorization, exact approvals, idempotency, evidence lineage and retention covered where affected.
- Migrations, failure recovery and compatibility documented where needed.
- Documentation consistent; measured vs proposed vs blocked status clear.

Reviewers reject tickets/PRs that implement a hidden feature or bypass an unresolved product/permission gate. A release records its PRD version and Git commit.

## 5. Data and evaluation discipline

Use synthetic fixtures. Never commit financial statements, account identifiers, identity documents, family evidence, tokens or real customer data. Properly consented evaluation data requires approved purpose/access/retention and remains outside the repository.

Do not test live retrieval, submit claims, disclose documents or place automated calls solely because a connector exists. PRD gates, valid case authority/consent and exact-action approval still apply. Never collect third-party financial passwords/OTPs in chat.

This repository is documentation-only at v0.3. Acceptance scenarios are planned, not executed application tests. Mark delivery and evaluation status accurately.

## 6. First implementation work

Start B-01 in [BUILD_SPEC.md](BUILD_SPEC.md). The reference stack, schema, API payloads, synthetic policy, test oracles and B-01–B-11 order are selected. Use [contracts/openapi.json](contracts/openapi.json), [contracts/schema.sql](contracts/schema.sql) and [contracts/fixtures.json](contracts/fixtures.json); generate and verify implementation types/migrations against them. Do not create a framework-selection or rediscovery task before coding.

Real-data/D gates and F remain blocked until accepted, while isolated synthetic reference work can proceed. Never claim the rule/fixture adapters prove real AI quality or institution integration. A newly discovered contract defect should be fixed consistently during implementation; product behavior changes still require the PRD change process.
