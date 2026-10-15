# Financial Legacy — Delivery and Release Plan

Version 0.2 · 15 October 2026 · Proposed sequence; owners/dates not yet assigned

## 1. Authority and release labels

[PRD v0.2](PRD.md) defines all product scope and the authoritative D-01–D-11 decision register. [LLD v0.2](LLD.md) maps the implementation to its 55 requirements. This roadmap sequences that scope; it cannot add features, sources, data uses or service promises.

P = proposed first pilot. F = full-product requirement, gated until its prerequisites pass. Every milestone below must name its PRD requirement IDs and evidence. Changes in release timing update the PRD release baseline before implementation; a roadmap note alone cannot authorize scope.

## 2. Delivery sequence

| Milestone | Deliverables already specified in PRD | Requirement coverage | Exit evidence / dependencies |
| --- | --- | --- | --- |
| M0 — Agree baseline | Confirm pilot persona/institutions/formats, service boundaries, identities/authority, processing/retention and claims procedures | FL-03, FL-04, FL-12, FL-44, FL-45, FL-46, FL-55 | Resolve affected D-01/02/05/10 decisions; named owners; accepted PRD baseline |
| M1 — Secure case foundation | Managed sign-in/recovery, case/subject separation, membership/assignment, consent/holds, audit, uploads and tasks | FL-01, FL-02, FL-03, FL-04, FL-05, FL-18, FL-22, FL-23, FL-25, FL-42, FL-43, FL-45, FL-47, FL-48 | Cross-case and revoked-access tests; quarantine; durable state; privacy-approved providers |
| M2 — Reviewed inventory | Text case manager, cited extraction/correction, guided discovery, reconciliation, evidence/amount semantics and explicit coverage | FL-06, FL-07, FL-08, FL-09, FL-10, FL-26, FL-28, FL-29, FL-38, FL-39, FL-40 | Representative quality results; D-06 policies; living-owner/no-result/duplicate journeys pass |
| M3 — Legacy preparation | Checklist, dated record, trusted-contact intent, reviewed exports and review reminders | FL-11, FL-31, FL-34, FL-42 | Planner journey; no accidental contact disclosure; scoped export and stale-record behavior |
| M4 — Assisted claims and operations | Versioned checklists/packs, exact review, manual receipts, follow-ups, requests/outcomes/reopening, complaint/help handling | FL-12, FL-13, FL-14, FL-15, FL-16, FL-17, FL-36, FL-37, FL-43, FL-44, FL-47, FL-49 | D-02/10; known-asset path; stale-template, partial-settlement, dispute and unknown-submission cases |
| M5 — Pilot readiness | Retention/deletion, redacted measurement, accessibility, resilience, backup/restore, incident/support and complete traceability | FL-18, FL-19, FL-40, FL-45, FL-46, FL-48, FL-49, FL-50, FL-51, FL-52, FL-53, FL-54, FL-55 plus all P rows | D-05/07 accepted; all P acceptance evidence reviewed; no unresolved critical integrity/access defect |
| M6 — Controlled expansion | Collaborators, lifetime/post-death sharing, voice/languages, additional classes, enabled connectors/direct submissions and permitted follow-ups | FL-20, FL-21, FL-24, FL-27, FL-30, FL-32, FL-33, FL-35, FL-41, FL-42 plus shared P controls | Separate F capability gates below; no blanket launch through a single “AI enabled” toggle |

M3/M4 can be separate tracks after the shared foundation. M5 is a launch gate, not permission to defer foundational privacy/deletion/security design until late delivery. New F work can proceed only against accepted PRD scope and resolved dependencies.

## 3. Capability feasibility and expansion gates

| Capability | Planning assessment | Gate required before enablement |
| --- | --- | --- |
| Text, case records, uploads, reviewed inventory, tasks and exports | Technically implementable; no working system yet | Identity/privacy policy, security, evaluation and accepted P evidence |
| Institution-specific assisted claims | Conditional on accurate procedures and staffed review | Named template reviewer, dated source, supported institution/subject and escalation |
| Each additional asset class · FL-30 | Included in full vision; source/claims differences remain | Evidence fields, amount semantics, permission model, requirements, fixtures and quality evidence for that class |
| Live source retrieval · FL-27 | Access/partner and eligibility dependent | D-03 per source; sandbox and purpose/authority/retention/coverage validation |
| Direct submission · FL-35 | Channel and institution dependent | D-03; exact approval, receipt, revocation, idempotency and uncertain-outcome reconciliation |
| Collaboration/lifetime sharing · FL-24, FL-32 | Requires explicit recipient-access policy | D-04; recipient verification, scope/expiry, revocation and leak/isolation tests |
| Post-death release · FL-33 | Explicitly gated; not part of pilot | D-04; death/authority evidence, contest/hold/reviewer process, exact release approval; no inferred-death automation |
| Voice/languages · FL-20, FL-41 | Technically plausible; quality/privacy unvalidated | D-09; supported-language evaluation, recording policy, transcript correction, text fallback and structured approvals |
| Automated follow-ups/external reminders · FL-21, FL-42 | Permission/channel dependent | D-03/09 where relevant; disclosure, opt-in/preferences, safe content, logs and human fallback |
| Native mobile client | Decision needed; responsive mobile web already P | D-11 in PRD with device/session/storage/security/accessibility acceptance before work |

Background references and source limits are maintained in PRD section 6. No API access, regulated role, contractual permission or coverage is confirmed by these documents. A mock adapter or generated form is not completion of a live integration.

## 4. Source and template validation checklist

For each source/institution, the responsible integration/operations reviewer records: official reference and review date; allowed methods; supported asset/subject types; coverage and known gaps; identity/authority/consent needs; eligible role/partner and contract; data schema and freshness; costs/limits; processor/retention terms; credentials and channel policy; receipt/error/reconciliation semantics; sandbox tests; approved enabled scope; owner and next review date.

For each template: institution/category/subject scope, required/optional documents, form/declaration versions, current source, qualified reviewer, review cadence, exception path and suspension process. Separate shared requirements from case-specific additional requests. Material changes affecting an in-flight pack require review and fresh approval.

All candidates begin disabled/unvalidated. User access to an official portal does not imply platform automation rights. Deceased-subject applicability is validated independently of living-user consent.

## 5. Pilot release evidence

| Review | Required evidence | Accountable role |
| --- | --- | --- |
| Product completeness | Every P requirement and PRD section 16 scenario mapped; no unexplained feature or missing behavior | Founder/product owner |
| Authority/operating model | D-02/10 policies, reviewed claim procedures, professional-service and escalation boundaries | Qualified reviewer + operations |
| Privacy/security | D-05 data map/providers/retention/holds; isolation, revoke, prompt-injection and disclosure tests | Security/privacy owner |
| Engineering | Reviewed schema/API/job contracts, migrations, concurrency/idempotency, failure recovery and traceability | Engineering owner |
| Quality/accessibility | Critical-field extraction results, first-reader UI, keyboard/screen-reader/mobile paths and failure states | Product/AI/quality owners |
| Operations | Named operators, assigned queues, complaints, case limits/support hours, suspended-workflow process | Operations owner |
| Reliability | D-07 workload/budget acceptance, measured performance, restoration, deletion tombstones and runbooks | Engineering + operations |

Evidence records requirement ID, scenario, environment/dataset, expected/actual outcome, reviewer, defects and decision. Zero unresolved critical authorization, disclosure, evidence-integrity or duplicate-execution defects. F enablement also requires its own row in section 3; passing the pilot does not implicitly approve expansion.

## 6. Risks and implementation triggers

| Risk | Required response | PRD authority |
| --- | --- | --- |
| False ownership/duplicate/stale balance | Keep potential status, review reconciliation, date/type/freshness and aggregate exclusions | FL-07, FL-08, FL-09, FL-26, FL-28, FL-29; D-06 |
| Wrong claimant/contact or disputed evidence | Scope authority, verify recipient, hold affected action, qualified escalation | FL-03, FL-23, FL-24, FL-32, FL-33, FL-47; D-02/04 |
| Stale institution procedure | Suspend automatic use, version/review, preserve case history and re-approve changed packs | FL-12, FL-13, FL-14, FL-37, FL-44; D-10 |
| Unauthorized or unavailable source | Disable connector, explain coverage/manual step; no bypass or complete-discovery promise | FL-10, FL-27, FL-35, FL-44; D-03 |
| Unknown external acceptance/duplicate action | Unknown state, receipts, idempotency and reconciliation before retry | FL-15, FL-35, FL-36 |
| Model/extraction/voice error | Cite/review critical fields, text correction, failure handoff and evaluation gate | FL-06, FL-20, FL-25, FL-26, FL-38, FL-39, FL-40, FL-41, FL-53 |
| Data exposure/excessive retention | Minimize processors/logs, scope access, track purge/holds/backup expiry and incident response | FL-18, FL-19, FL-45, FL-46, FL-48, FL-49; D-05 |
| Scope drift | Block unmapped work; amend PRD before implementation | FL-55 |

## 7. Work item and change checklist

A work item is ready when it lists PRD IDs, P/F label, accepted decisions, user behavior, data/permission scope, API/event/schema impact, error/hold/revocation behavior, acceptance evidence and owner.

A work item is done when its normal and negative cases pass, evidence and operations are reviewed, no hidden product behavior was added, and PRD/LLD/roadmap remain consistent. A release records the PRD version and Git commit. Preserve requirement IDs and update them explicitly; retired IDs are not reused.

The authoritative unresolved decisions are [PRD section 17](PRD.md#17-decisions-that-must-not-be-guessed). Dates, budgets, commercial terms and owners remain uncommitted until accepted there. No work is authorized solely by an entry in this roadmap.
