# Financial Legacy — Coding Agent Instructions

## Product authority

Read README.md, PRD.md and CONTRIBUTING.md before implementation. PRD.md is the sole product contract. ARCHITECTURE.md and LLD.md describe implementation; ACCEPTANCE.md verifies it; ROADMAP.md sequences existing scope.

Every feature, screen, API, tool, integration, background job, operational capability and material behavior change must map to PRD requirement IDs (FL-55). Never introduce product scope through code, a ticket, an LLD change or a library default.

## Before acting

- Identify the user journey, requirement IDs and P/F release scope.
- Check unresolved D decisions and source/subject/channel permissions.
- If behavior is undefined or a prerequisite unresolved, block dependent work, document the gap and request product-owner clarification/acceptance. Continue independent authorized work where possible.
- Amend the PRD and obtain product-owner acceptance before new product behavior. Update the LLD, architecture, acceptance plan and roadmap as affected.
- Implementation choices within accepted requirements may be made when they do not change user behavior, data use, permissions, source support or service promises.

## Implementation and review

Preserve evidence provenance, case isolation, exact-action approvals, uncertainty and idempotency. AI cannot decide entitlement, grant authority, invent verified holdings or bypass deterministic controls. F capabilities and unvalidated connectors stay disabled.

Map code/APIs/jobs/schema and relevant tests to PRD IDs. Cover meaningful normal and negative cases. Report measured vs proposed vs blocked status honestly. A mock integration, prepared form, test plan or documentation change is not a working source connection or passing application test.

Use synthetic fixtures; never commit financial/identity/family records, account identifiers or credentials. Do not use live retrieval, submissions, automated calls or disclosures without the PRD gates and valid case-specific permissions/approval.

This repository is documentation-only at v0.3. Requirement IDs are stable; do not reuse retired IDs. A release records its PRD version and Git commit. These instructions implement the existing FL-55 scope-control rule and add no product features.

## Coding entry point

Start B-01 in BUILD_SPEC.md. The reference stack, API/SQL contracts, synthetic policy, fixtures and ordered work packages are fixed under PRD section 19. Do not reopen technical selections or ask for cloud credentials to begin the isolated reference build. All real data, live financial/provider effects and F capabilities remain gated. Use contracts/openapi.json, contracts/schema.sql and contracts/fixtures.json; implement and run drift/migration/domain/integration/E2E checks. Fixture/rule adapters are stand-ins and must be labeled, never misrepresented as real AI, verification, discovery or submission.
