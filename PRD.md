# Product Requirements Document — Financial Legacy

Version: 0.1 | Date: 15 October 2026 | Status: Draft for founder and engineering review

Product owner: TBD | Engineering owner: TBD | Operations and legal reviewers: TBD

## 1. Purpose and evidence boundary

Financial Legacy helps individuals and authorized family members discover financial assets, organize evidence, prepare a legacy and navigate claims. It should feel like one capable assistant that remembers the case and helps complete it.

This PRD consolidates the supplied concept. Proposed MVP boundaries, priorities and acceptance criteria below are design recommendations, not confirmed business commitments. Institutional access and legal requirements must be validated before a workflow is enabled. The source concept was truncated during feasibility; this document does not invent a missing conclusion.

## 2. Problem

Financial assets accumulate across employers, cities and institutions. Lost records, old contact information and incomplete nomination details can leave individuals unaware of their holdings. After a death, families face two distinct problems: locating assets and obtaining settlement through the relevant institutions.

Discovery can yield evidence of a holding without establishing a claimant’s right to receive it. Recovery can also begin with a known asset and no discovery work. The product must support these paths independently.

## 3. Goals and non-goals

### Goals

1. Help users build an evidence-linked financial asset inventory with explicit uncertainty.
2. Reduce repeated information collection and make next actions understandable.
3. Prepare a secure, maintainable legacy record with controlled sharing.
4. Help authorized claimants assemble institution-specific claim packs and track outcomes.
5. Keep consent, disclosures and important user decisions inspectable.

### Non-goals for the MVP

- Exhaustive, automatic discovery of every Indian financial asset.
- Holding or moving customer funds, giving investment advice or determining inheritance rights.
- Drafting legally operative wills or replacing institution/legal verification.
- Automatic asset transfer or legacy disclosure triggered solely by an AI inference of death.
- Scraping restricted portals, bypassing authentication or collecting third-party passwords/OTPs.
- Direct submissions or automated calls without a permitted channel and explicit approval.

## 4. Personas and jobs to be done

| Persona | Situation | Desired outcome | Key concern |
| --- | --- | --- | --- |
| Individual asset owner | Old investments across institutions | Know what is held and what remains uncertain | Privacy and incomplete records |
| Legacy planner | Wants family to find information later | Maintain an organized, controlled handover record | Premature or excessive disclosure |
| Family claimant | A relative has died | Discover holdings and progress valid claims | Authority, paperwork and emotional burden |
| Authorized case operator | Supports complex cases | Resolve evidence gaps and institution exceptions | Access limited to assigned cases |

Accessibility includes large readable text, plain-language explanations, save-and-resume and a text alternative to voice. Elderly users must be able to review important actions without relying on a transient conversation.

## 5. End-to-end journeys

### A. Discover my assets

Conversation → select self-discovery → verify identity/permissions as required → upload or declare records → extract and review → reconcile possible duplicates → build inventory → show unresolved sources and next actions.

Completion: the user reviews the inventory and open investigations. The product never states that all assets were found solely because available sources were exhausted.

### B. Prepare my legacy

Conversation → create planner case → add/review holdings → identify missing documents and nomination information → designate trusted contacts and sharing preferences → review legacy record → export or save securely → set review reminders.

Completion: a dated legacy record and checklist exist. Nomination status can be unknown; a nomination is not treated as a universal determination of beneficial entitlement. An MVP trusted contact does not automatically receive vault access.

### C. Discover and claim after a death

Conversation → register deceased subject → collect claimant identity and relationship → establish source-specific authority → discover assets or add a known asset → review evidence → choose relevant institution workflow → prepare claim pack → user approves any external submission → record reference and follow-ups → record final institutional outcome.

Completion: each claim has settlement, transfer, rejection or an explicit unresolved-dispute outcome supported by evidence. Overall case closure requires user review of remaining open items.

### D. Claim a known asset

Create claimant case → add known holding and evidence → review authority → start claim checklist. Discovery remains optional and can be added later.

## 6. Scope and phasing

| Capability | Proposed MVP | Later / dependency |
| --- | --- | --- |
| Conversational case creation | Text; saved context; resumable tasks | Evaluated multilingual voice |
| Identity and authority | Verification workflow and human review; granular gates | Approved verification-provider integration |
| Discovery | User declarations, uploads, guided official-source enquiries | Contracted/API integrations where permitted |
| Asset inventory | Bank/FD and mutual fund records, evidence/status/date | Other categories after workflow validation |
| Document intelligence | Extraction with citations and mandatory review | More formats/languages after evaluation |
| Legacy | Record, missing-information checklist, trusted-contact intent, export | Controlled post-death release process |
| Claims | Institution/version-specific checklist, pack preparation, manual submission and status entry | Approved direct submission and follow-up channels |
| Notifications | In-app reminders; minimal sensitive content | Opt-in email/SMS/voice after validation |

Identity checks are required before any action that needs them. Low-risk draft cases may be created before verification, but this must not grant source access or disclose another person’s information.

## 7. Functional requirements and acceptance criteria

P0 = required for pilot. P1 = follow-on capability. These priorities are proposed.

| ID | Priority | Requirement | Acceptance criterion |
| --- | --- | --- | --- |
| FL-01 | P0 | Classify intent and create a case | User confirms self-discovery, legacy or deceased-claim mode; known-asset claims skip discovery |
| FL-02 | P0 | Resume case context | User can leave and return to the same reviewed records, tasks and conversation; corrections do not erase history |
| FL-03 | P0 | Verify identity and case-specific authority | Pending, verified, rejected and expired states are visible; restricted actions remain blocked until their exact prerequisite is met |
| FL-04 | P0 | Capture consent and revoke access | Purpose, data scope, recipient, expiry and version are recorded; revocation blocks future use immediately, including queued actions |
| FL-05 | P0 | Secure document intake | Only supported files pass validation/scanning; progress, failure and retry are visible; blocked files never reach extraction |
| FL-06 | P0 | Extract with evidence | Every proposed field links to a document/page or source record; low-confidence/ambiguous values require review |
| FL-07 | P0 | Maintain asset evidence states | Each holding is self-declared, potential match, document-backed or institution-verified; AI cannot promote a match to institution-verified |
| FL-08 | P0 | Reconcile and correct | Possible duplicates can be reviewed and merged without losing evidence; conflicting ownership/amounts remain explicit |
| FL-09 | P0 | Present dated amounts | Inventory shows currency, amount type, source and as-of date; potential matches and historical balances are excluded from current confirmed totals |
| FL-10 | P0 | Guide discovery sources | Each enquiry identifies coverage, required authority, permitted channel and unavailable steps; no unsupported claim of complete discovery |
| FL-11 | P0 | Prepare legacy record | User can review/export a dated inventory and missing-information checklist; trusted-contact intent grants no automatic disclosure |
| FL-12 | P0 | Version claim procedures | Claim references an institution, asset class, workflow version and source/review date; missing or stale templates route to an operator |
| FL-13 | P0 | Prepare claim pack | Required, optional, missing and rejected documents are distinguished; user can inspect all generated forms and correct extracted fields |
| FL-14 | P0 | Approve exact external action | Approval names recipient/channel, documents, declarations and purpose; content changes invalidate approval; unapproved submissions cannot run |
| FL-15 | P0 | Track claims and follow-ups | External reference, submission evidence, requests, due dates and responses persist; an uncertain submission is reconciled before retry |
| FL-16 | P0 | Record outcome and closure | Amount/type/date and institutional evidence support settlement/transfer; rejection and legal dispute remain explicit; user reviews case closure |
| FL-17 | P0 | Human escalation | User can request help; dispute, ambiguous authority, poor extraction and unsupported channels produce a visible handoff task |
| FL-18 | P0 | Audit access and actions | Reads of sensitive documents, exports, approvals, sharing, changes and submissions produce actor/time/case-linked audit events |
| FL-19 | P0 | Retention, export and deletion | User sees applicable retention policy; access is revoked on deletion request; live copies and processors follow a tracked purge policy with documented legal holds |
| FL-20 | P1 | Multilingual voice | Evaluated speech/language quality, transcript correction and text fallback exist; voice alone does not approve a consequential disclosure |
| FL-21 | P1 | Permitted automated follow-ups | Disclosed identity, user permission, channel rules and a complete contact log precede each supported automation |

## 8. Asset coverage and source validation

These are candidate workflows supplied in the concept, not verified integrations or authoritative legal instructions.

| Asset class | Candidate discovery evidence/source | Candidate claims route | Proposed phase |
| --- | --- | --- | --- |
| Bank accounts and FDs | Statements, bank records, eligible unclaimed-deposit enquiries including UDGAM | Institution-specific deceased-depositor procedure | MVP, guided/document-led |
| Mutual funds | CAS, AMC/RTA records, CAMS, KFintech, MITRA enquiries | AMC/RTA transmission or redemption procedure | MVP, guided/document-led |
| Shares/demat | CAS, broker/depository/company records | Broker/depository/company transmission | Later |
| Unclaimed dividends/shares | Company/RTA records and IEPF process | Applicable IEPF/company verification | Later |
| Life insurance | Policies, insurer records and unclaimed-amount facilities | Insurer death-claim procedure | Later |
| EPF and related benefits | EPFO/member records and documents | Applicable nominee/death claim | Later |
| NPS | CRA/pension account evidence | Applicable exit/death procedure | Later |
| PPF/small savings | Bank/post-office records | Institution settlement procedure | Later |
| Bank lockers | Bank relationship evidence | Institution nominee/heir access process | Later; no assumed cash value |

UDGAM is scoped to eligible unclaimed deposits, not every active bank account. MITRA, DigiLocker, Account Aggregator and IEPF serve different purposes; eligibility and access must be separately validated. The ability of a user to access a portal does not imply permission for our system to automate it. Deceased-person access must not be assumed to work under living-user consent.

For each source, the integration register must contain: operator, allowed purpose, coverage, eligibility, consent/authority requirements, approved channel, contractual status, data fields, rate limits, retention, failure handling, review owner and last validation date.

## 9. Evidence and presentation rules

- Evidence status describes support for a holding, not legal entitlement or guaranteed recoverability.
- An inventory item can have several dated observations. New evidence does not overwrite the original record.
- Document-backed means an accepted record supports the holding; an old statement does not prove the account is still active.
- Institution-verified requires attributable institution evidence within an explicit freshness policy.
- Show current confirmed totals only for qualifying, dated observations in the same currency; unknown and excluded amounts are listed separately.
- Policy sum assured, cash balance, investment value and settled amount are different amount types and must not be added indiscriminately.
- Every unsupported field is unknown, not silently inferred. Every material correction is reviewable.

## 10. Privacy, security and product controls

Case-scoped access, strong authentication, encryption, explicit consent, minimal provider disclosure, approved retention and a complete audit trail are pilot prerequisites. Financial records and family documents must not appear in ordinary logs, analytics payloads or notification previews.

Claimant identity, relationship evidence, source permission and the institution’s entitlement decision are distinct. Rejection by one institution cannot automatically decide another claim. A trusted contact has no access until a separate valid sharing/release policy is satisfied.

The AI may propose questions, fields and steps. Deterministic services enforce authorization, asset-state promotion, approval validity and external execution. Uploaded instructions are untrusted evidence and cannot grant tools new permissions.

## 11. Success measures

Targets require a pilot baseline and owner approval; no numerical business results are claimed.

| Measure | Definition | Guardrail |
| --- | --- | --- |
| Time to first reviewed inventory | Median and p90 from case start to user-confirmed first inventory | Segment by path and document availability |
| Evidence coverage | Reviewed assets with at least one usable evidence link / reviewed assets | Report evidence state and age separately |
| Extraction quality | Field-level accuracy on labeled representative records | Report critical identifiers/amounts independently |
| Claim-pack readiness | Packs accepted as complete at first institution review / packs reviewed | Institution requirements vary; track workflow version |
| User effort | User-active time and clarification rounds per completed milestone | Do not count waiting for institutions as AI work |
| Claim progress | Time in each claim state; settled/transferred/rejected/unresolved counts | Cohort by institution and asset class |
| Safety | Unauthorized disclosure/submission and false verification incidents | Pilot launch requires zero in adversarial acceptance tests |

Product analytics use pseudonymous event IDs and coarse categories, not names, document text, account numbers or financial balances.

## 12. Release acceptance

The pilot is acceptable only after the FL-01–FL-19 scenarios are demonstrated with synthetic cases; permissions and cross-case isolation tests pass; document and claim workflows have named reviewers; exports and deletion are verified; and incident, backup and restore procedures are exercised. Any live source needs its own completed integration gate.

Three end-to-end acceptance cases are mandatory: a living owner correcting an old statement, a planner with incomplete nomination information, and an authorized claimant starting directly from a known asset. Include negative cases for a potential-name match, a disputed claimant, a revoked consent and a failed/uncertain external submission.

## 13. Open product decisions

- Initial customer segment, distribution, pricing and service/support boundaries.
- Exact pilot institutions and supported statement/form formats.
- Identity/authority review policy and qualified operational reviewers.
- Supported languages and accessible voice confirmation design.
- Trusted-contact release procedure, disputes and legal escalation.
- Approved retention periods, provider data handling and hosting constraints.
- Current source capabilities, regulated partner needs and permitted automation.

See [ROADMAP.md](ROADMAP.md) for gates, risk ownership and delivery sequencing, and [LLD.md](LLD.md) for the proposed implementation.
