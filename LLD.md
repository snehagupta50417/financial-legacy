# Low-Level Design — Financial Legacy

Version: 0.1 | Date: 15 October 2026 | Status: Proposed, not implemented

Companion: [PRD](PRD.md) | [Delivery plan](ROADMAP.md)

## 1. Design basis

This design implements the proposed document-led pilot in the PRD. Technology choices, limits and service objectives are recommendations that require engineering approval. No live financial API, identity provider, model vendor or regulatory permission is assumed.

Start with a modular backend and asynchronous workers rather than independently deployed microservices. This keeps case/evidence/approval transactions consistent while retaining clear module boundaries. External integrations remain disabled until individually validated.

### Proposed stack

| Layer | Proposal | Reason / boundary |
| --- | --- | --- |
| Client | Responsive TypeScript web app | Text chat, accessible review screens, uploads and task views |
| API | Python API service with typed request/response schemas | Workflow and document-processing ecosystem; vendor-neutral |
| Database | PostgreSQL | Transactions, foreign keys, case-scoped row policies and versioned records |
| Binary storage | Private object store with managed keys | Quarantine, clean documents, generated packs; no public objects |
| Jobs | Durable queue and workers; database outbox | Retryable extraction, reminders and permitted connector work |
| Identity | Managed identity provider with MFA support | No custom password or authentication-token implementation |
| AI | Provider adapters for conversation and extraction | Swap/evaluate providers; tools mediated by policy services |
| Observability | Structured redacted logs, traces and audit store | Separate operational telemetry from evidence and audit |

Vendor selection, hosting region and provider processing/retention terms are release decisions, not defaults hidden in the implementation.

## 2. Component responsibilities

Client → API/authentication → case and authorization services → domain database.

Document upload → quarantine storage → malware/type validation → clean storage → extraction worker → review proposals → reviewed evidence and assets.

Conversation → orchestration service → scoped evidence retrieval → proposed tool/action → deterministic policy check → user review where needed → domain service or approved connector.

| Module | Owns | Must not do |
| --- | --- | --- |
| Case service | Intent, subject, membership, tasks, closure | Treat case membership as source permission |
| Authorization service | Identity, authority, consent, object-level decisions | Delegate final access decisions to an LLM |
| Document service | Upload sessions, scan states, evidence coordinates | Expose raw storage keys or unsafe files |
| Extraction/reconciliation | Field proposals, conflicts, duplicate candidates | Silently establish ownership or merge records |
| Asset service | Reviewed holdings, evidence links, dated observations | Replace old balances with undocumented estimates |
| Workflow/claims | Versioned checklists, packs, approvals, outcomes | Submit changed content under an old approval |
| Legacy service | Inventory snapshot, sharing intent and review reminders | Release information solely on inferred death/inactivity |
| Connector gateway | Capability registry, scoped execution, receipts | Use unapproved APIs, scrape restricted portals or bypass auth |
| Audit/operations | Append-only events, restricted case review, incident tasks | Include full documents or secrets in operational logs |

## 3. Roles and policy evaluation

Roles: case owner, claimant, explicitly authorized collaborator, assigned case operator and restricted support administrator. Trusted contacts are stored as contact intent, not an access role in the MVP. Internal administrators do not receive blanket document access by default.

For every request, evaluate: authenticated actor → active case membership → allowed action → subject/record scope → valid identity/authority prerequisites → purpose-bound consent → document sharing scope → workflow/connector capability → current approval, if external action.

Deny by default. Check authorization on reads, downloads, searches, background jobs, exports and write operations. Case IDs supplied by the client are never sufficient. Reviewers see only assigned cases and necessary fields. Emergency access requires a reason, short duration and an audit event.

Claimant identity, relationship, source-specific authority and final institutional entitlement are stored separately. Revocation/expiry invalidates pending jobs and derived access before execution. Revoking a consent does not erase an already delivered disclosure; preserve its audit receipt and apply the approved retention policy.

## 4. Data model

Identifiers are UUIDs; timestamps are UTC; monetary values use exact decimal types and ISO currency codes. All mutable domain entities carry a version for optimistic concurrency. Sensitive identifiers use encrypted storage plus separately keyed hashes where matching is necessary; UI references are masked.

| Entity | Core fields and constraints |
| --- | --- |
| User | id, identity_provider_subject (unique), display_name, locale, status |
| Case | id, mode (self_discovery/legacy/deceased_claim), owner_user_id, subject_id, status, version, created_at, closed_at |
| Subject | id, case_id, living_status, encrypted_name, encrypted_identifiers, declared_relationship; no global person merge by name |
| CaseMember | case_id, user_id, role, scope, status, expires_at; unique active membership key |
| IdentityCheck | id, case_id, user_id, provider_reference, status, checked_at, expires_at; avoid retaining raw ID where unnecessary |
| AuthorityAssessment | id, case_id, claimant_user_id, institution_scope, evidence_ids, review_status, reviewer, rationale, expires_at |
| Consent | id, case_id, grantor, subject_scope, purpose, data_scope, recipient_scope, version, status, granted_at, expires_at, revoked_at |
| Document | id, case_id, uploader, storage_reference, sha256, media_type, size, scan_status, processing_status, retention_class, deleted_at |
| Evidence | id, case_id, source_type, document_id/source_reference, page_or_record_locator, observed_at, received_at, authority_context, review_status |
| ExtractionProposal | id, case_id, document_id, field_name, encrypted_value, evidence_id, confidence, model/prompt_version, review_state, reviewer |
| Asset | id, case_id, subject_id, category, institution_id, encrypted_reference, evidence_status, lifecycle_status, version |
| AssetEvidence | asset_id, evidence_id, relationship_type; cross-case links forbidden |
| AssetObservation | id, case_id, asset_id, amount, currency, amount_type, as_of_date, evidence_id, review_state; immutable once accepted |
| NominationRecord | id, case_id, asset_id, status (unknown/declared/documented), evidence_id, reviewed_at; no inferred legal entitlement |
| DiscoveryAttempt | id, case_id, source_id, status, consent_id, authority_id, coverage, started_at, result_evidence_ids, error_code |
| Claim | id, case_id, asset_id, institution_id, workflow_version_id, authority_id, status, external_reference, version |
| WorkflowVersion | id, institution_id, asset_category, requirements_schema, source_url, source_reviewed_at, reviewer, enabled, content_hash |
| ClaimRequirement | id, case_id, claim_id, requirement_key, state, evidence_ids, institution_response; distinguish optional/required |
| ClaimPack | id, case_id, claim_id, version, manifest, content_hash, generated_at, status |
| Approval | id, case_id, actor_id, action_type, recipient, channel, purpose, payload_hash, pack_version, authority_id, consent_id, expires_at, status |
| ExternalAction | id, case_id, claim_id, approval_id, idempotency_key, status, connector_id, receipt_evidence_id, sent_at |
| ClaimOutcome | id, case_id, claim_id, type, amount, currency, outcome_date, evidence_id, reviewer; append corrections rather than hiding old outcomes |
| Task | id, case_id, related_entity, type, assignee, due_at, state, blocked_reason |
| LegacyPlan | id, case_id, snapshot_version, checklist_state, reviewed_at, next_review_at; export tied to an exact snapshot |
| TrustedContact | id, case_id, encrypted_contact, relationship, sharing_intent, verification_state; no automatic data access |
| Message | id, case_id, actor, encrypted_content, attachment_refs, tool_refs, created_at |
| AuditEvent | id, case_id, actor, action, object_type/id, reason, request_id, timestamp, redacted_metadata |
| OutboxEvent | id, case_id, event_type, aggregate_id, version, encrypted_payload_reference, dispatch_state |

Foreign keys include case context where appropriate to prevent cross-case asset/document/evidence references. API scoping is primary; database row-level policies provide defense in depth. Unique idempotency keys are scoped to actor/case/operation and reject reuse with a different request hash.

## 5. Evidence and balance invariants

1. Self-declared assets require a declaration; potential matches remain candidates.
2. Document-backed requires reviewed supporting evidence. Institution-verified requires attributable institution evidence and an approved verification workflow.
3. Confidence is a model score, not an evidence state, ownership decision or probability of legal entitlement.
4. Preserve evidence and accepted observations; new records supersede through explicit links, not destructive overwrite.
5. A stale source may reduce the displayed freshness/verification state; retain prior verification history.
6. Aggregation selects one qualifying reviewed observation per holding and amount type for a stated date policy. Exclude duplicate candidates, unknown values, historical-only records and incompatible amount types. Never add across currencies without an explicit dated conversion policy; no conversion in MVP.
7. Missing as-of dates produce unknown freshness. A policy benefit or locker entry cannot be counted as current liquid assets.

## 6. State machines

### Case

DRAFT → ACTIVE → WAITING_ON_USER / WAITING_ON_INSTITUTION / NEEDS_REVIEW → ACTIVE → READY_TO_CLOSE → CLOSED.

CLOSED may reopen with a reason and audit event. Closure requires reviewed unresolved tasks/outcomes; it never asserts that every asset has been discovered. Verification prerequisites attach to individual actions rather than falsely certifying the entire case.

### Documents

UPLOAD_PENDING → QUARANTINED → SCANNING → CLEAN → EXTRACTING → REVIEW_REQUIRED → REVIEWED.

Failure branches: BLOCKED (unsafe/invalid), PROCESSING_FAILED (retryable or manual), DELETE_PENDING → DELETED. Only CLEAN objects enter extraction. A failed extraction does not invalidate the original clean document.

### Claims

DRAFT → AUTHORITY_REVIEW → DOCUMENT_COLLECTION → PACK_REVIEW → READY_FOR_SUBMISSION → SUBMISSION_PENDING → SUBMITTED → INSTITUTION_REVIEW.

INSTITUTION_REVIEW → MORE_INFORMATION_REQUIRED → DOCUMENT_COLLECTION, or SETTLED / TRANSFERRED / REJECTED / UNRESOLVED_DISPUTE.

CANCELLED is explicit; rejection can reopen into review on new evidence. Terminal status requires an attributable outcome record. Submission timeouts produce SUBMISSION_UNKNOWN, not automatic failure/retry. Operators reconcile the external receipt before another submission.

### Approvals and external actions

Approval: PENDING → APPROVED → CONSUMED, or REJECTED / EXPIRED / INVALIDATED.

External action: CREATED → POLICY_CHECKED → QUEUED → EXECUTING → SUCCEEDED / FAILED_RETRYABLE / FAILED_FINAL / OUTCOME_UNKNOWN.

Any pack, recipient, declaration, purpose or authority-scope change invalidates the prior approval. Approval creation is not execution authorization forever: workers recheck current consent, authority, approval expiry and exact content immediately before acting.

## 7. API contracts

JSON API under /v1. Auth uses the managed identity session; browser state-changing requests need CSRF protection when cookie-based. Errors have code, safe message, request_id and field_errors. Return 403 for policy failures without leaking existence; 409 for stale versions/idempotency conflicts; 422 for invalid transitions. Paginate lists and apply per-user/case limits.

| Method and route | Input / behavior | Output and control |
| --- | --- | --- |
| POST /cases | confirmed mode and subject declaration | case ID, version, next task |
| POST /cases/{id}/messages | text, attachment IDs, client_message_id | persisted message and asynchronous response/job ID |
| POST /cases/{id}/verification-requests | check type and scope | provider/human workflow reference; no direct verified toggle |
| POST /cases/{id}/consents | purpose, scope, recipients, expiry, policy_version | consent record and receipt |
| POST /cases/{id}/consents/{cid}/revoke | reason | immediate revoked state and job invalidation |
| POST /cases/{id}/documents/upload-sessions | filename, media type, size, checksum | short-lived upload URL restricted to one object |
| POST /cases/{id}/documents/{did}/complete | upload checksum | quarantine state; server verifies upload |
| GET /cases/{id}/documents/{did}/access | purpose | audited, short-lived authorized download/view capability |
| POST /cases/{id}/proposals/{pid}/review | accept/correct/reject, version, reason | reviewed proposal and linked evidence |
| GET /cases/{id}/assets | filters and pagination | masked records, evidence states and dated amounts |
| POST /cases/{id}/assets | declaration plus optional evidence | new self-declared or review-required asset |
| POST /cases/{id}/asset-merges | source IDs, canonical ID, reviewed rationale, versions | audited reversible reconciliation; retain aliases |
| POST /cases/{id}/claims | asset ID, institution and workflow version | draft claim and requirement tasks |
| POST /cases/{id}/claims/{cid}/packs | reviewed requirement IDs and claim version | immutable pack version, manifest and hash |
| POST /cases/{id}/approvals | exact action/pack version, recipient/channel, purpose | frozen approval preview; no sending |
| POST /cases/{id}/approvals/{aid}/decision | approve/reject after review, step-up proof if required | signed server-side decision tied to payload hash |
| POST /cases/{id}/claims/{cid}/submit | approval ID, pack version, idempotency key | action/job ID only if connector enabled; manual handoff otherwise |
| POST /cases/{id}/claims/{cid}/manual-submissions | reference/date and evidence | reviewed submission record; no assertion of API submission |
| POST /cases/{id}/claims/{cid}/outcomes | type, amounts/date and institution evidence | review-required outcome; authorized review completes transition |
| POST /cases/{id}/legacy/exports | snapshot version and scope | authorized export job and expiry |
| GET /cases/{id}/tasks | status and pagination | ordered tasks and blocking reasons |
| POST /cases/{id}/deletion-requests | requested scope | tracked deletion/hold status |

All mutation endpoints accept an idempotency key where retries can create side effects. Membership and consent updates use database transactions; external effects run only from durable outbox jobs after commit. Never encode financial identifiers or tokens in URLs.

## 8. Critical execution flows

### Document extraction

1. Authorize upload and allocate a case-scoped object.
2. Validate content, extension/type agreement, size/page limits and checksum; scan in quarantine.
3. Move/mark CLEAN; emit an extraction job with minimal references.
4. Worker verifies current access and sends only approved data to an approved processor.
5. Validate model output against a strict field schema; attach page/record evidence coordinates and model/prompt versions.
6. Present proposals and ambiguities for review. Critical identifiers, ownership and amounts require review regardless of confidence in the pilot.
7. Accept into domain records transactionally and emit audit/outbox events. Preserve rejected proposals under the retention policy.

Proposed initial upload limit: PDF/JPEG/PNG, 20 MB/file and 100 pages/PDF, configurable after representative performance and security testing. Encrypted PDFs require a separate approved handling flow; do not ask users to put passwords in chat.

### Exact-action approval and submission

1. Generate an immutable pack and canonical manifest of document versions, form fields and declarations.
2. Compute a server-side cryptographic content hash including recipient, channel and purpose.
3. Show the user the complete preview, recipient and consequences. Record the decision and any required step-up authentication.
4. In one transaction create an external action referencing approval, current authority and consent; enforce uniqueness/idempotency.
5. Worker revalidates policy and hash. If invalid, stop and request a fresh review.
6. Execute only through an enabled connector. Store a receipt and update state atomically through an outbox event.
7. If the remote system may have accepted the action but no receipt returned, mark OUTCOME_UNKNOWN and reconcile. Do not blindly resubmit.

The document-led MVP prepares packs and tracks user/operator submissions. Direct submission remains disabled until a source-specific connector is approved and tested.

### Legacy sharing

An inventory export is a user-requested snapshot with scope and expiry. Recording trusted contacts does not issue credentials or send documents. A later post-death release workflow must independently establish death evidence, recipient identity, authority, contest/hold rules and approval before disclosure. It is outside the initial pilot.

## 9. AI orchestration and tools

A single case manager coordinates bounded capabilities for onboarding, extraction, discovery planning, reconciliation, legacy preparation, claims and reminders. These can be logical tools/workers; separate autonomous agents are not required.

Conversation state is a derived view of persisted case facts and open tasks, not the sole source of truth. Summaries retain provenance and can be corrected. Only retrieve documents and evidence authorized for that case and purpose.

Tool inputs use strict schemas. The server supplies actor/case/consent context; the model cannot select a different actor or extend scope. Classify tools as read, internal proposal, reviewed mutation or external action. External tools require the deterministic approval path above.

Model output and uploaded documents are untrusted. Embedded text cannot change system rules, invoke tools, grant consent or establish legal authority. Generated checklists/forms cite their workflow version and field evidence. Unknown requirements cause a handoff rather than invented instructions. Store redacted tool traces and evaluation metadata; do not log private model reasoning.

Voice is a later adapter for speech-to-text and text-to-speech with user-correctable transcripts. Voice capture/retention requires a defined policy; consequential action approval remains a reviewable structured interaction.

## 10. Integration contract

Each adapter exposes capabilities, required scopes, supported subject types, request schema, response/evidence schema, freshness, rate limits and reconciliation behavior. Track DISABLED / VALIDATING / SANDBOX / ENABLED / SUSPENDED state.

Integration-specific living/deceased permission checks are mandatory. A consent-based financial data mechanism is not a universal deceased-estate discovery channel. UDGAM, MITRA, DigiLocker, Account Aggregator, IEPF and institution records require separate validation; no adapter is enabled solely because the name appears in the concept.

Store provider credentials server-side in a secret manager. User redirect/token callbacks validate state and provider signatures. Webhooks verify signatures, timestamps and replay IDs, persist inbound event IDs uniquely, and reconcile out-of-order events with the source. Only configured approved destinations may receive documents; prevent user/model-supplied arbitrary URLs and SSRF.

## 11. Security, retention and audit

- TLS in transit; managed encryption keys at rest; restricted private object storage and key access.
- MFA/step-up support for sensitive access, exports and approvals according to the approved threat model.
- Short-lived document links, masked identifiers and session expiry; revoke derived access on membership changes.
- No full account identifiers, document text, credentials or claim packs in telemetry, notifications or repository fixtures.
- Audit sensitive reads, downloads, reviews, access changes, approvals and execution with actor/time/reason/request IDs. Audit events are append-only through restricted writers; protect retention and integrity independently.
- Separate dev/staging/prod accounts, keys and storage. Use synthetic fixtures in nonproduction.
- Approve processor data use, retention, subprocessors and hosting before real data is sent. Disable provider training/retention where contractually supported and required by policy.
- Retention classes and durations must be approved before pilot. Deletion revokes access, cancels jobs and removes live copies, generated packs, indexes and processor copies where applicable. Backups expire under a documented schedule; legal holds are explicit and communicated.
- Audit metadata must remain minimal and follow its own justified retention policy; do not preserve deleted raw financial content inside audit logs.

## 12. Reliability and operations

Proposed pilot objectives, to be validated: 99.5% monthly API availability excluding external-source outages; p95 ordinary metadata requests under 1 second; chat acknowledgement within 2 seconds with visible asynchronous progress; 20-page clean document extraction p95 under 2 minutes under agreed load. Publish final response/extraction quality separately from acknowledgement latency.

Use exponential backoff with jitter for safe transient jobs, bounded attempts and a dead-letter queue with operator tasks. Treat exactly-once external execution as a goal requiring receipts and reconciliation, not a property guaranteed by a queue. Circuit-break failing connectors and show users the blocked dependency.

Proposed recovery targets: RPO 24 hours and RTO 8 hours for a small pilot, subject to business approval. Encrypt backups and test restoration. Monitor job age, scan failures, review backlog, connector errors, approval invalidations, unauthorized access attempts and claim-state dwell time using redacted metrics.

## 13. Verification plan and traceability

| Test area | Required scenarios | PRD mapping |
| --- | --- | --- |
| Access | Cross-case IDs/downloads/searches denied; expired membership and unassigned operators blocked | FL-03/04/18 |
| Intake/extraction | Unsafe file blocked; hallucinated field rejected; page evidence and corrections preserved | FL-05/06 |
| Asset evidence | Potential match never counted as confirmed; old statement not current; duplicates do not inflate totals | FL-07/08/09 |
| Workflow | Known-asset claims skip discovery; workflow version retained; stale/unsupported template escalates | FL-01/10/12/17 |
| Approval | Changed pack/recipient invalidates approval; revoked consent blocks queued action; duplicate submit returns same action | FL-04/13/14 |
| Execution | Timeout after possible remote acceptance enters unknown state; receipt reconciliation prevents duplicate claim | FL-15 |
| Closure | Rejection/dispute distinct from success; settlement requires evidence; open items reviewed before case close | FL-16 |
| Legacy | Trusted contact cannot read documents; exported snapshot has scope/date; no automatic death-trigger disclosure | FL-11 |
| Lifecycle | Deletion cancels jobs and removes derived copies; legal hold and backup expiry handled; restore tested | FL-19 |
| AI resilience | Document prompt injection cannot invoke tools or access other cases; missing requirements trigger handoff | FL-06/14/17 |

Before pilot, evaluate representative Indian financial documents, scan quality and name/date/amount ambiguity with labeled synthetic or properly consented data. Review critical-field error rates separately. Voice/language release needs its own representative evaluation and accessibility testing.

## 14. Remaining engineering decisions

Select vendors/regions and identity policies; define field-level retention and sensitive-data classifications; validate supported formats; finalize schema migrations and API specifications; set freshness/verification policies; approve operations staffing; threat-model release/sharing and connector authorization. These are tracked in ROADMAP.md and must be resolved at the relevant release gate.
