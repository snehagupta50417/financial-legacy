# Delivery Plan, Validation Gates and Decision Log

Version: 0.1 | Date: 15 October 2026 | Status: Proposed sequencing; dates and owners unassigned

This plan connects the [PRD](PRD.md) to the [technical design](LLD.md). No calendar commitments or production access are implied.

## 1. Delivery milestones

| Milestone | Deliverables | Dependencies | Exit evidence |
| --- | --- | --- | --- |
| M0 — Validate pilot | Select segment and bank/FD + mutual fund scope; map institution workflows; validate source permissions; approve identity/authority and retention policies | Founder, qualified legal/compliance reviewer and operations owner | Signed scope/role boundaries, source register and pilot go/no-go |
| M1 — Case and evidence foundation | Authentication, case membership, consent, uploads/quarantine, audit, tasks and synthetic fixtures | M0 data-handling and provider decisions | Cross-case isolation, upload security, revoke-access and deletion demonstrations |
| M2 — Reviewed inventory | Text case manager, cited extraction, field review, asset evidence states, duplicate/conflict review and dated amounts | M1; labeled representative evaluation set | Discovery journey and evidence/amount acceptance tests pass |
| M3 — Legacy preparation | Dated legacy record, missing-information checklist, contact intent and controlled export | M2; sharing/export policy | Planner can review/export; trusted contact receives no automatic access |
| M4 — Assisted claims | Versioned institution checklists, authority review, pack review, manual submission evidence, follow-ups and outcomes | M1/M2; approved workflow templates and operator process | Known-asset claimant journey, rejection/dispute and uncertain-submission cases pass |
| M5 — Limited pilot | Monitored cases with trained operators, support boundaries, incident response, backup restore and evaluation | M1–M4; all release gates | Named owners accept evidence; live data only within approved scope |
| M6 — Expansion | Evaluated multilingual voice, additional asset classes, validated connectors and permitted automated follow-ups | Pilot evidence, permissions and source-specific gates | Each capability passes its own quality, safety and operational review |

M3 and M4 can follow the shared inventory foundation as separate product tracks. Pilot rollout is gated by completeness of the selected track, not by the existence of all future capabilities.

## 2. Feasibility assessment

These are planning assessments, not verified product availability or legal conclusions.

| Capability | Assessment | Required evidence before launch |
| --- | --- | --- |
| Text onboarding and resumable case manager | Technically implementable | Intent/routing evaluations and accessible task review |
| Document upload/extraction | Technically implementable with review | Approved processor/data policy, file security, field accuracy and citations |
| Consolidated inventory and deduplication | Implementable for supplied/authorized evidence | Ownership uncertainty, historical balance and duplicate tests |
| Legacy checklist and record | Implementable within defined informational scope | Export/sharing controls and review of product wording |
| Claims checklist and pack preparation | Feasible with validated institution templates and human support | Current requirements, qualified reviewers and exception handling |
| Universal automated asset discovery | Not a supported promise | Source-by-source coverage and permissions; no assumed universal access |
| Programmatic official-source enquiries | Conditional | Documented permitted API/partner/channel access and supported subject types |
| Account Aggregator / regulated partner route | Conditional | Eligibility, approved role/partner arrangement, scope and consent validation |
| Deceased-person source access | Conditional and institution-specific | Valid authority process; do not reuse a living-person consent assumption |
| Direct claim submission and follow-ups | Conditional | Approved channel, exact-action approvals, receipt/retry tests and operational ownership |
| Multilingual voice | Technically plausible; unvalidated | Language/speech accuracy, correction flow, accessibility and consent policy |
| Automatic post-death information release | Outside MVP | Identity/death/authority verification, dispute and hold process, approved disclosure policy |

## 3. Source and workflow validation register

Create one reviewed entry per institution/source before enabling it. All candidates below begin UNVALIDATED; none has confirmed API access in this repository.

| Candidate | Intended use | Questions to resolve |
| --- | --- | --- |
| Bank records / UDGAM | Bank/FD evidence and eligible unclaimed-deposit enquiries | Coverage, permitted access, identity/authority, result freshness and bank follow-up |
| CAS / AMC / CAMS / KFintech / MITRA | Mutual fund holdings and inactive/unclaimed folio enquiries | Formats, eligible users, permitted automation, ownership evidence and transmission process |
| DigiLocker | Supported authorized document retrieval | Approved integration, issuers, permission scope, deceased-case applicability and retention |
| Account Aggregator ecosystem | Consent-based financial records where eligible | Permitted participant/partner role, data availability, purpose and subject eligibility |
| IEPF / companies / RTAs | Candidate unclaimed dividends/shares workflow | Applicable asset/state, process requirements, verification and permitted submission |
| Insurers / EPFO / NPS CRA / post offices / brokers | Future coverage | Institution-specific discovery, claimant authority, forms, status channels and exceptions |

Required register fields: owner; official documentation/contract reference; reviewed date; supported use case and subject type; allowed data/purpose; channel; identity/authority/consent requirements; data fields; costs/rate limits; retention; failure/reconciliation process; sandbox evidence; reviewer; enabled scope; next review date.

Workflow templates must have a source, owner, version, review date and review cadence. A changed or disputed requirement suspends automatic use until reviewed. MVP operators can record an institution’s case-specific additional request without silently rewriting the shared template.

## 4. Release gates

| Gate | Evidence required | Proposed accountable role |
| --- | --- | --- |
| Product scope | Pilot segment, supported assets, service boundaries, truthful claims and acceptance scenarios | Founder/product owner |
| Legal/operating model | Qualified review of authority, nomination/entitlement wording, claims assistance boundaries, source permissions and disclosure procedures | Legal/compliance reviewer |
| Data protection | Data map, consent model, hosting/providers, retention/deletion and incident process | Security/privacy owner |
| Engineering | Reviewed schema/API design, migrations, isolation, approval/idempotency, failure recovery and restoration | Engineering owner |
| Document quality | Representative extraction evaluation with critical-field results and manual-review capacity | Document/operations owner |
| Institution workflow | Current template/source evidence, case-specific escalation and operator training | Claims operations owner |
| External connector | Approved access and purpose, credentials handling, consent/authority rules, receipt/retry and revocation tests | Integration owner + reviewer |
| Pilot operations | Named support owner, response expectations, case limits, complaints/escalation and monitoring | Operations owner |

## 5. Risk register

| Risk | Consequence | Mitigation / trigger | Owner role |
| --- | --- | --- | --- |
| False asset match or merge | Wrong ownership claim or inflated inventory | Evidence states, explicit review, no name-only confirmation, reversible merge | Product/engineering |
| Incorrect or stale balance | Misleading financial picture | Dated typed observations; exclude historical/ambiguous amounts from current totals | Product |
| Unauthorized claimant/contact access | Disclosure of family financial information | Separate identity/authority/entitlement, case scope, manual escalation, no automatic release | Security/operations |
| Incorrect institutional requirements | Rejected or delayed claim | Source-reviewed versioned templates; suspend stale automation | Claims operations |
| Unsupported integration access | Failed or impermissible discovery/submission | Source gate, disabled-by-default adapters and manual guidance | Integration owner |
| Duplicate/uncertain external submission | Conflicting claims or repeated disclosures | Idempotency, receipt storage, unknown state and reconciliation before retry | Engineering |
| Malicious uploaded instructions | Tool misuse or data leakage | Treat documents as untrusted; strict schemas and deterministic permissions | AI/security |
| Extraction/language error | Incorrect identifiers, values or declarations | Field citations, mandatory critical-field review and representative evaluation | AI/operations |
| Institution delays or legal dispute | Long-running unresolved cases | Transparent waiting states, follow-up tasks and qualified handoff; no settlement guarantee | Operations |
| Excessive retention/provider exposure | Privacy harm | Minimal processing, approved terms, tracked deletion and restricted logs | Privacy owner |

## 6. Proposed architecture decisions

These are proposals recorded for review, not accepted implementation decisions.

| ID | Proposal | Rationale | Revisit when |
| --- | --- | --- | --- |
| ADR-001 | Modular backend plus durable workers | Fewer deployment boundaries and consistent domain transactions | Independent scaling/ownership justifies services |
| ADR-002 | Evidence-first inventory with immutable observations | Traceable ownership/amounts and corrections | Evidence model changes, never by dropping provenance |
| ADR-003 | Server-side policy and exact-payload approval | AI cannot confer authority or submit changed content | New channel or action risk requires stronger verification |
| ADR-004 | Document-led pilot; manual institution submissions | Deliver useful work before API partnerships | Specific connector passes source and release gates |
| ADR-005 | Trusted-contact intent without automatic release | Avoid premature disclosure and unclear authority | Approved release/dispute process exists |
| ADR-006 | Provider-neutral conversation/extraction adapters | Evaluate quality and data handling before commitment | Vendor-specific functionality creates a justified dependency |

Acceptance of an ADR must add an owner, decision date, alternatives considered and consequences. Do not silently treat a proposal as a signed decision.

## 7. Open decision backlog

| ID | Decision | Blocks |
| --- | --- | --- |
| D-01 | Pilot persona, exact institutions and supported formats | Scope, evaluations and operations staffing |
| D-02 | Identity/authority review policy and qualified reviewers | Source access and all deceased-person workflows |
| D-03 | Hosting region, identity/model/OCR/storage vendors and processing terms | Real data intake |
| D-04 | Retention classes, purge timelines, backup expiry and legal holds | Pilot launch |
| D-05 | Integration access/partnership and business operating model | Live connectors and external submissions |
| D-06 | Freshness policy, verification evidence and aggregate presentation | Inventory trust and user-facing balances |
| D-07 | Pricing, support limits and legal escalation partner | Pilot proposition and commercial launch |
| D-08 | Language priorities and voice confirmation evaluation | Voice expansion |
| D-09 | Family disclosure/release and dispute process | Post-death sharing beyond MVP |
| D-10 | Final service objectives, infrastructure budget and capacity limits | Pilot operations commitments |

## 8. Definition of ready and done

A feature is ready when its PRD IDs, user journey, data inputs, policy checks, failure states and acceptance evidence are defined, with required external permissions resolved.

A feature is done when the intended behavior and negative cases pass, provenance and authorization are verified, operational/error states are usable, documentation reflects the implementation and any required reviewer has accepted the evidence. A mock connector, a prepared form or a generated checklist is not proof of a live institutional integration or successful claim.

## 9. Documentation maintenance

This is a documentation-only repository at v0.1. Keep PRD.md as the product contract, LLD.md as the proposed/implemented technical design and this file as delivery/decision history. Future implementation should reference FL requirement IDs, update decision status explicitly and record source validation dates. Use synthetic examples; keep real financial and identity evidence outside GitHub.
