# Financial Legacy — Low-Level Design

Version 0.2 · 15 October 2026 · Proposed implementation of [PRD v0.2](PRD.md)

Engineering owner: TBD · Security/operations reviewers: TBD · Implementation status: documentation only

## 1. Contract and architecture

The PRD is the product contract. This document selects structures and flows for its requirements; it cannot authorize a new feature, data use, integration or permission. P/F release labels and D-01–D-11 decisions are defined only in the PRD. A pending decision blocks the affected implementation/release. Changes follow FL-55.

Use a modular backend with asynchronous workers, one transactional domain database, private evidence storage and a controlled connector gateway. AI produces proposals and coordinates tasks; deterministic domain services authorize, validate and execute transitions. Financial truth comes from reviewed evidence, not conversation memory.

### Proposed implementation choices

| Layer | Proposed choice | Purpose and constraint |
| --- | --- | --- |
| Client | Responsive TypeScript web application | Chat, review, documents, inventory, legacy, claims and task views; no offline cache of sensitive documents |
| API/domain | Python service with typed schemas; modules below | Shared transactions and policy enforcement; vendor-neutral implementation |
| Records | PostgreSQL with migrations, foreign keys and row-level isolation | Durable case/evidence/approval state; exact decimal amounts |
| Documents | Private object store, quarantine/clean/generated areas, managed keys | No public objects; short-lived authorized access |
| Jobs | Durable queue, database outbox and bounded workers | Recoverable extraction, reminders, exports and permitted connector operations |
| Identity | Managed identity provider with MFA/step-up support | No custom password handling; session/recovery/contact-change policy follows D-02/D-05 |
| AI/speech | Versioned provider adapters behind policy checks | Approved payloads only; voice/languages disabled until F gate |
| Operations | Redacted metrics/logs/traces plus a restricted audit store | Separate operational telemetry from financial evidence |

Stack/region/provider contracts, retention and capacities are proposals subject to D-05/D-07. Native mobile has no separate implementation scope until D-11; it must use the same domain authorization if accepted.

### Modules and requirement ownership

| Module | Owns | PRD IDs |
| --- | --- | --- |
| Case/conversation | Intent, subject, case switching, saved facts, messages and task context | FL-01, FL-02, FL-22, FL-38, FL-39, FL-40 |
| Identity/access | Verification, authority, membership, sessions, consent and holds | FL-03, FL-04, FL-23, FL-24, FL-45, FL-47, FL-48 |
| Documents | Upload, quarantine, scan, field proposals, evidence and corrections | FL-05, FL-06, FL-25, FL-26, FL-46 |
| Discovery/assets | Source plans/attempts, inventory, matching, observations, aggregates and categories | FL-07, FL-08, FL-09, FL-10, FL-27, FL-28, FL-29, FL-30 |
| Legacy/sharing | Checklists, contacts, snapshots, exports and gated recipient release | FL-11, FL-31, FL-32, FL-33, FL-34 |
| Claims | Requirements, packs, approval, manual/direct submissions, requests and outcomes | FL-12, FL-13, FL-14, FL-15, FL-16, FL-17, FL-35, FL-36, FL-37 |
| Operations/governance | Assigned queues, tasks, reminders, templates, source capabilities and escalation | FL-17, FL-21, FL-42, FL-43, FL-44, FL-49 |
| Voice | Recording state, transcripts, correction, language and text fallback | FL-20, FL-41 |
| Platform/lifecycle | Audit, deletion/retention, observability, resilience and release traceability | FL-18, FL-19, FL-45, FL-46, FL-50, FL-51, FL-52, FL-53, FL-54, FL-55 |

## 2. Access model and trust boundaries

### Authorization evaluation

For every API request and background job: authenticate actor/service → verify active membership and assignment → scope to case and subject → authorize action/object → check holds → check required identity/authority → check purpose/data/recipient consent → check workflow/connector capability → check exact approval for external action.

Deny by default. The server supplies actor, case and permitted scope to AI tools; clients/models cannot grant roles or set verified states. Case membership does not imply source access; consent does not replace legal authority. Review identity, relationship, authority and institution entitlement separately.

| Actor | Allowed baseline | Denied without separate policy/approval |
| --- | --- | --- |
| Owner/planner | Own-case declarations, uploads, review, approved exports/permissions | Another subject’s data; automatic post-death release |
| Claimant | Own case and action-specific permitted evidence/work | Source retrieval/disclosure without valid authority |
| Operator | Assigned review/task scope and reviewed status updates | Unassigned cases, final entitlement rulings, self-authorized disclosure |
| Collaborator/recipient · F | Verified, explicitly granted object/action scope until expiry | Other case data, re-sharing, broad access through an invite alone |
| Support admin | Account metadata and approved narrow diagnostic access | Blanket financial-document access |
| Worker/service | Job-specific service role and references with execution-time policy check | Reuse of a user’s old access after revocation/hold |

Emergency access is time-bound, justified and audited; it does not create a product bypass for external disclosure. A dispute hold applies to the affected subject/action scope; do not unnecessarily freeze an unrelated case.

### Isolation and client behavior

All case-bound rows carry case_id. Enforce it in repositories, joins, search, storage access and database policies. Authorize downloads before issuing short-lived links. Never infer authorization from an unguessable UUID or object path. The client shows subject/path on case switch and clears old case data; caches and streaming responses are case-scoped and cancelled on switch/sign-out.

## 3. Data model and constraints

UUID keys; UTC timestamps; exact decimal monetary values with currency and amount_type; immutable accepted observations; version columns for mutable aggregates. Encrypt sensitive identifiers and document content. Use separately keyed HMAC of normalized references only where approved for in-case matching; do not use unkeyed hashes of guessable identifiers or create a cross-family person index.

| Entity | Important fields / relationships |
| --- | --- |
| User | id, idp_subject unique, status, locale, notification_preferences; sensitive contacts encrypted |
| Case | id, owner_user_id, subject_id, mode, status, version, created_at, closed_at |
| Subject | id, case_id, living_status, encrypted_name/identifiers, declared_relationship; case and subject created transactionally |
| CaseMember | case_id, user_id, role, object/action_scope, status, expires_at, assignment_reason |
| Verification | id, case_id, user_id, type, provider_reference, status, evidence_ids, reviewer, rationale, checked_at, expires_at |
| Authority | id, case_id, claimant_id, subject_scope, institution/action_scope, evidence_ids, status, reviewer, rationale, expires_at |
| Consent | id, case_id, grantor, subject/data/purpose/recipient_scope, version, status, granted_at, expires_at, revoked_at |
| Hold | id, case_id, subject/asset/claim/action_scope, reason_code, restricted_actions, reviewer, status, resolution_evidence_id |
| Document | id, case_id, uploader, storage_reference, sha256, media_type, size, scan_status, processing_status, retention_class, deleted_at |
| Evidence | id, case_id, source_type, document_id or source_reference, page/record_locator, observed_at, received_at, review_state, authority_context |
| FieldProposal | id, case_id, evidence_id, field_path, encrypted_value, confidence, model/prompt_version, state, reviewer, correction_reason |
| Institution | id, canonical_name, institution_type; no customer evidence |
| Asset | id, case_id, subject_id, category, category_schema_version, validated_category_attributes, institution_id, encrypted_reference, evidence_status, lifecycle_status, version |
| AssetEvidence | case_id, asset_id, evidence_id, relationship_type; cross-case FK constraints |
| Observation | id, case_id, asset_id, amount, currency, amount_type, as_of_date, evidence_id, review_state, supersedes_id |
| Nomination | id, case_id, asset_id, status unknown/declared/documented, encrypted_details, evidence_id, reviewed_at |
| Reconciliation | id, case_id, candidate_asset_ids, resolution, canonical_asset_id, aliases, evidence_ids, reviewer, reason, reversal_of |
| SourceCapability | id, source_name, allowed_methods, subject_types, scopes, validation_state, approved_contract_reference, reviewed_at, owner |
| DiscoveryAttempt | id, case_id, source_id, plan_scope, status, consent_id, authority_id, started_at, result_evidence_ids, coverage, error_code |
| WorkflowVersion | id, institution_id, asset_category, requirements_schema, source_url, source_reviewed_at, reviewer, enabled, content_hash |
| Claim | id, case_id, asset_id, institution_id, workflow_version_id, authority_id, status, external_reference, version |
| ClaimRequirement | id, case_id, claim_id, requirement_key, required/optional, state, evidence_ids, institution_response |
| ClaimPack | id, case_id, claim_id, version, immutable_manifest, content_hash, generated_at, status |
| Approval | id, case_id, actor_id, action_type, recipient, channel, purpose, payload_hash, pack/snapshot_version, authority/consent_ids, expires_at, status |
| ExternalAction | id, case_id, claim_id nullable, approval_id, connector_id, idempotency_key, request_hash, state, attempt_count, receipt_evidence_id |
| ClaimOutcome | id, case_id, claim_id, type, amount/currency/amount_type, effective_date, evidence_id, reviewer, supersedes_id |
| Task | id, case_id, related_entity, type, assignee, due_at, state, blocked_reason, completion_evidence_id |
| LegacyPlan | id, case_id, snapshot_version, checklist_state, reviewed_at, next_review_at |
| TrustedContact | id, case_id, encrypted_contact, relationship, intended_scope, intended_trigger, verification_state; no access role |
| ShareGrant · F | id, case_id, recipient_id, object/action_scope, approval_id, verified_at, expires_at, revoked_at |
| ReleaseRequest · F | id, case_id, contact_id, death/authority_evidence_ids, state, holds, reviewer, approval_id, released_at |
| Export | id, case_id, snapshot/pack_version, object_scope, storage_reference, requestor, expiry, state |
| Message | id, case_id, actor, encrypted_content, evidence/tool_refs, created_at; summary links back to underlying facts |
| VoiceSession · F | id, case_id, language, consent/policy_version, recording_state, transcript_reference, retention_class |
| SupportCase | id, case_id, type complaint/help/legal/fraud, owner, state, reason, resolution_reference |
| RetentionRequest | id, case_id/user_scope, type, requested_at, hold_state, purge_manifest, processor_receipts, backup_expiry, state |
| AuditEvent | id, case_id, actor, action, object_type/id, reason, request_id, timestamp, minimal redacted_metadata |
| OutboxEvent | id, case_id, type, aggregate_id/version, payload_reference, dispatch_state |
| IdempotencyRecord | actor/case/operation/key unique, request_hash, state, result_reference, created_at |

Category attributes follow PRD section 6 minimum fields and versioned per-category schemas; unknowns are explicit and arbitrary unvalidated JSON is rejected. Specialized claimant/ownership situations in PRD section 11 need an approved compatible workflow or a hold/handoff.

### Integrity, indexes and migrations

- Composite foreign keys include case_id for all evidence/asset/document/claim relationships. Check that subject belongs to case. Resolve Case/Subject creation with a transaction and deferred FK or insert/update order.
- Unique active membership and idempotency constraints; unique external receipt/event keys within a provider; unique pack version per claim. Do not impose global uniqueness on names or ownership references.
- Index (case_id, status, updated_at), (case_id, asset_id, as_of_date), (assignee, state, due_at), (claim_id, version), (provider_id, external_reference) and outbox/queue dispatch state as needed. Encrypt sensitive query values and use approved scoped matching keys.
- Preserve accepted evidence/observations and approved manifests; corrections append a superseding record. Mutable resources require If-Match/version checking; stale edits return a safe conflict.
- Apply backward-compatible migrations before dependent workers; retain schema/model/workflow versions needed to read old records. Never migrate a potential match into verified status without evidence review.

## 4. Domain states and transition guards

| Aggregate | States / transition | Guard or evidence |
| --- | --- | --- |
| Case | DRAFT → ACTIVE ↔ WAITING_ON_USER / WAITING_ON_INSTITUTION / NEEDS_REVIEW → READY_TO_CLOSE → CLOSED | Mode/subject confirmed; closure review summarizes remaining work; reopening requires reason |
| Identity/authority | NOT_STARTED → PENDING → VERIFIED / REJECTED; VERIFIED → EXPIRED / REVOKED | Qualified review/provider evidence and scope; AI cannot set final verified state |
| Document | UPLOAD_PENDING → QUARANTINED → SCANNING → CLEAN → EXTRACTING → REVIEW_REQUIRED → REVIEWED | Only CLEAN enters extraction; original evidence retained |
| Document exceptions | BLOCKED / PROCESSING_FAILED; DELETE_PENDING → DELETED | Unsafe files blocked; retry policy explicit; deletion cancels processing |
| Discovery | PLANNED → BLOCKED / READY → RUNNING → RESULTS / NO_RESULTS / PARTIAL / FAILED | Current permission and enabled/manual method; results include actual coverage |
| Asset evidence | SELF_DECLARED / POTENTIAL_MATCH → DOCUMENT_BACKED → INSTITUTION_VERIFIED | Reviewed attributable evidence; freshness downgrade preserves prior verification history |
| Asset lifecycle | UNKNOWN / OPEN / CLOSED / TRANSMITTED / DISPUTED | Separate from evidence status; institution/user evidence according to policy |
| Claim | DRAFT → AUTHORITY_REVIEW → DOCUMENT_COLLECTION → PACK_REVIEW → READY_FOR_SUBMISSION → SUBMISSION_PENDING → SUBMITTED → INSTITUTION_REVIEW | Each transition validates current authority, template version and evidence |
| Claim request | INSTITUTION_REVIEW → MORE_INFORMATION_REQUIRED → DOCUMENT_COLLECTION | Preserve prior pack/receipt; material edits invalidate approval |
| Claim outcome | INSTITUTION_REVIEW → SETTLED / TRANSFERRED / PARTIALLY_SETTLED / REJECTED / UNRESOLVED_DISPUTE; explicit CANCELLED | Accepted outcome evidence; partial remainder stays open; rejected/disputed are not success |
| Submission uncertainty | SUBMISSION_PENDING → SUBMISSION_UNKNOWN → reconciled SUBMITTED / safe-to-retry / FAILED | Possible remote acceptance blocks blind resubmission |
| Approval | PENDING → APPROVED → CONSUMED; or REJECTED / EXPIRED / INVALIDATED | Exact content hash, actor, recipient, purpose, scope and current prerequisites |
| External action | CREATED → POLICY_CHECKED → QUEUED → EXECUTING → SUCCEEDED / FAILED_RETRYABLE / FAILED_FINAL / OUTCOME_UNKNOWN | Only safe transient failures retry; consumption and receipts recorded |
| Task | OPEN → IN_PROGRESS / BLOCKED → DONE; or CANCELLED | Owner, due time, blocker and completion reason/evidence |
| Legacy release · F | REQUESTED → EVIDENCE_REVIEW → RECIPIENT_VERIFICATION → AUTHORITY_REVIEW → READY → APPROVED → RELEASED | D-04 policy, explicit scope, no hold; any disputed prerequisite blocks release |
| Release exceptions · F | ON_HOLD / REJECTED / WITHDRAWN / EXPIRED | Qualified resolution; death/inactivity alone cannot execute release |

A hold is a separate policy object; it can block reads/disclosures/submissions without overwriting the underlying claim’s history. Reopening/outcome correction appends evidence and a reason. Authority review and institution entitlement remain separate even when a claim is settled.

## 5. API design

Version prefix /v1. Typed JSON requests/responses; authentication through managed identity. Cookie-based writes use CSRF protection. Opaque cursors paginate lists; default limits and rate limits are configured/tested under D-07. Never put financial identifiers or credentials in URLs.

Every read/write enforces object-level scope. Errors return code, safe message, request_id and safe field_errors. Invalid requests: 422; stale version/idempotency conflict: 409; authentication: 401; inaccessible resources: uniform non-enumerating 404; action forbidden within an accessible resource: 403; connector unavailable: safe blocked/dependency state. Do not disclose another case’s existence.

| API route | Request → result | Requirement IDs |
| --- | --- | --- |
| POST /cases; GET /cases; GET/PATCH /cases/{id} | confirmed mode/subject/version → case, next tasks, permitted actions | FL-01, FL-02, FL-22 |
| POST /cases/{id}/messages; GET /cases/{id}/messages | text, evidence IDs, client_message_id → persisted message and response/job ID | FL-02, FL-38, FL-39, FL-40 |
| POST /cases/{id}/verification-requests; GET status | check type/scope → provider/human review reference; no client “verified” flag | FL-03, FL-48 |
| POST /cases/{id}/consents; POST /consents/{cid}/revoke | purpose/data/recipient/expiry/policy version → receipt or immediate revocation | FL-04 |
| GET/PATCH /cases/{id}/members; POST invites · F | verified scope/assignment/version → membership/invite state; no automatic access | FL-23, FL-24, FL-43 |
| POST /cases/{id}/documents/upload-sessions; POST /documents/{did}/complete | name/type/size/checksum → short-lived single-object upload capability → quarantine job | FL-05, FL-25 |
| GET /cases/{id}/documents/{did}/access | purpose → audited short-lived authorized view/download capability | FL-18, FL-23, FL-45 |
| GET /cases/{id}/field-proposals; POST /field-proposals/{pid}/review | accept/correct/reject, version, reason → reviewed field/evidence links | FL-06, FL-25, FL-26 |
| POST/GET /cases/{id}/discovery-plans; POST /discovery-attempts | selected sources/manual/connector scope → coverage, prerequisites, attempts/tasks | FL-10, FL-27 |
| GET/POST /cases/{id}/assets; GET/PATCH /assets/{aid} | declaration/reviewed fields/version → masked holding and dated observations | FL-07, FL-09, FL-28, FL-30 |
| POST /cases/{id}/reconciliations; POST /reconciliations/{rid}/reverse | asset IDs/evidence/reason/versions → reviewed merge/reversal, retained aliases | FL-08, FL-26 |
| GET /cases/{id}/inventory-summary | as-of policy/category/currency → eligible totals, excluded amounts and policy/date | FL-09, FL-29 |
| GET/PATCH /cases/{id}/legacy; POST/PATCH /trusted-contacts | reviewed snapshot/checklist/contact intent/version → plan; no access or notification side effect | FL-11, FL-31 |
| POST /cases/{id}/exports; GET /exports/{eid} | object scope/snapshot/purpose → export job, expiry and authorized retrieval | FL-34, FL-45 |
| POST /cases/{id}/share-grants; POST revoke · F | verified recipient/scope/approval → time-bound grant | FL-24, FL-32 |
| POST /cases/{id}/release-requests; POST /release-requests/{rid}/review · F | evidence/recipient/review version → gated release workflow | FL-33, FL-47 |
| POST/GET /cases/{id}/claims; GET /claims/{cid} | known asset/institution/workflow version → claim/requirements; discovery optional | FL-01, FL-12, FL-15 |
| POST /cases/{id}/claims/{cid}/packs | reviewed requirements/version → immutable manifest/pack hash | FL-13, FL-26 |
| POST /cases/{id}/approvals; POST /approvals/{aid}/decision | exact action/pack/recipient/purpose → frozen preview → approve/reject decision | FL-14, FL-32, FL-33 |
| POST /cases/{id}/claims/{cid}/manual-submissions | submitted_at/reference/receipt evidence → reviewable manual record | FL-15, FL-36 |
| POST /cases/{id}/claims/{cid}/submit · F | approval/pack/version/idempotency key → external action/job ID only for enabled connector | FL-35, FL-36 |
| POST /cases/{id}/claims/{cid}/requests; POST outcomes; POST reopen | requirement/outcome/evidence/reason/version → reviewed transition and tasks | FL-15, FL-16, FL-37 |
| GET/PATCH /cases/{id}/tasks; PATCH notification-preferences | assignee/due/state/preferences → owned tasks and reminders | FL-42, FL-43 |
| POST /cases/{id}/support-cases; POST /holds/{hid}/review | help/complaint/dispute evidence → restricted assignment/hold state | FL-17, FL-47, FL-49 |
| POST /cases/{id}/retention-requests; GET status | export/delete scope → purge/hold/processor/backup tracking | FL-19 |
| GET /cases/{id}/activity | allowed scope/cursor → redacted access/change timeline | FL-18, FL-23 |
| GET/PATCH /operations/workflow-versions; source-capabilities; model-versions | reviewer-controlled validated version/config → enable/suspend/audit | FL-43, FL-44, FL-46 |
| POST /cases/{id}/voice-sessions; POST stop; POST transcript-review · F | language/recording policy/consent → session/transcript correction/text fallback | FL-20, FL-41 |

Identity-provider session recovery/logout/contact changes are integrated through approved provider flows (FL-48), not financial-account credentials. Operations APIs expose only metadata by role; inspecting financial evidence still needs assigned-case scope. All short routes in a row use the same /v1/cases/{id} scope unless explicitly /operations.

### Example contract: claim creation

    POST /v1/cases/{case_id}/claims
    Idempotency-Key: opaque-client-generated-key
    {"asset_id":"uuid","institution_id":"uuid","workflow_version_id":"uuid"}

    201 {"claim_id":"uuid","status":"AUTHORITY_REVIEW","version":1,
         "requirements":[],"next_actions":["complete_authority_review"]}

The server selects actual requirements from a reviewed template. A nonexistent/disabled template returns a review task, not an invented institution procedure.

### Example contract: exact-action approval

    POST /v1/cases/{case_id}/approvals
    {"action_type":"CLAIM_SUBMISSION","claim_id":"uuid","pack_version":3,
     "recipient_id":"approved-institution-id","channel":"enabled-channel",
     "purpose":"claim-assistance"}

    201 {"approval_id":"uuid","status":"PENDING","payload_hash":"sha256",
         "preview":{"documents":[],"declarations":[],"recipient":"..."},
         "expires_at":"policy-defined-timestamp"}

The client cannot supply a trusted hash or arbitrary destination. Decision requires an authenticated authorized actor and the approved sensitive-action verification. Separate action execution rechecks the exact server-generated manifest.

## 6. Transaction, job and external-action contracts

### Idempotency and concurrency

For a side-effecting request, bind Idempotency-Key to actor + case + operation and a canonical request hash. Reuse with the same hash returns the existing result/job; reuse with different content returns 409. Persist the request and domain result in a transaction. Pack/snapshot review also checks expected version. A key is not a substitute for authorization; repeated requests still require current read/access policy.

Domain writes emit outbox events in the same database transaction. A dispatcher publishes references to a durable queue. Workers claim jobs with leases, recheck permissions/holds and persist outcomes plus the next event. Duplicate delivery is expected; handlers must be idempotent. Worker restarts cannot erase accepted reviews or generate a second approval/submission.

Revocation uses a policy version/epoch and cancels queued work/derived access. Just before an external call, worker checks current policy and atomically reserves the approved action. Do not hold a database transaction open across a network call. If revocation races with already-started delivery, record the actual outcome; a completed disclosure cannot be undone. The product shows this limitation honestly.

Exactly-once external effects cannot be guaranteed by the internal queue. Pass a provider-supported idempotency key where available, persist receipt/event IDs, and reconcile ambiguous responses before retrying. Use exponential backoff/jitter only for failures known to be safe; bounded attempts and dead-letter tasks handle exhaustion.

### Job envelope

    {"job_id":"uuid","case_id":"uuid","type":"EXTRACT_DOCUMENT",
     "aggregate_id":"uuid","expected_version":2,"policy_epoch":7,
     "payload_reference":"private-reference","request_id":"opaque-id"}

Use references, not raw statements or identifiers, in queues/logs. Workers fetch only their allowed data. Each handler declares retry class, timeout, cancellation check, idempotency behavior, resulting states and operator escalation.

## 7. Critical end-to-end flows

### 7.1 Document → reviewed holding (FL-05, FL-06, FL-07, FL-25, FL-26, FL-28)

1. Authorize upload, create a single-object upload session with expiry and declared media/size/checksum.
2. Server verifies uploaded content, file signature/type, limits and checksum. Keep in quarantine until malware/content validation passes.
3. Mark CLEAN and enqueue extraction. Invalid/unsafe files never reach the AI. Unreadable or encrypted content returns an explicit next step; no password in chat.
4. Worker rechecks policy and approved processor; sends the minimum permitted data. Validate output against a strict field schema and allowed category/reference/value formats.
5. Attach page/record citations, source timestamps, model/prompt version and confidence to every field proposal. No source evidence means no accepted field.
6. Reviewer accepts/corrects/rejects critical ownership, identifier, amount/date and source associations. Low-confidence data remains unresolved. Preserve original and corrected values under retention policy.
7. Commit reviewed evidence/holding/observations transactionally. Material edits invalidate dependent packs, approvals and stale summaries; create re-review tasks.

Proposed limits are PDF/JPEG/PNG, 20 MB and 100 PDF pages per file, configurable after FL-52 workload/security approval. Limits are operational configuration, not additional asset/format scope. Processing errors preserve a clean original and provide bounded retry or human review.

### 7.2 Discovery and reconciliation (FL-08, FL-10, FL-27, FL-29, FL-30)

1. Plan sources from case mode, supported categories, available evidence and permitted subject type; show what is manual, unavailable or outside coverage.
2. Each attempt snapshots source capability, scope and current authority/consent. Record RESULTS, NO_RESULTS, PARTIAL, BLOCKED or FAILED with coverage, not just a boolean success.
3. Normalize identifiers only within the authorized case. Candidate scoring can prioritize review; it cannot verify a holding or infer an heir.
4. Exact-reference matches still require conflict checks: institution/category/subject inconsistencies block an automatic association. Name-only matches remain potential.
5. Reviewed reconciliation selects canonical holding and aliases while preserving all evidence. Reversal records a new decision and recomputes derived totals/pack dependencies.
6. Refresh appends observations and evidence; it never overwrites history or turns “not returned by this source” into “asset does not exist.”

Amount aggregation is deterministic. Require reviewed ownership evidence, selected amount_type, currency, qualifying as-of date/freshness and no unresolved duplicate/conflict/hold. Select one eligible observation per holding/type under D-06. Show exclusions and reasons; never combine cash value, policy benefit, locker contents or historical settlement indiscriminately. If the policy is unresolved, show individual observations and no misleading current total.

### 7.3 Claim pack → manual or direct submission (FL-12–16/35–37)

1. Create claim for reviewed known holding with its institution/template version. Do not require discovery if unnecessary.
2. Validate action-specific authority and requirement statuses: required/optional, missing/proposed/accepted/rejected/needs-update. Additional case-specific requests do not silently change shared templates.
3. Generate immutable pack from reviewed evidence. Canonical manifest includes every document/version, generated field, declaration, recipient, channel, purpose and workflow version. Hash the actual outbound representations/manifests, not merely filenames.
4. Present full preview and unresolved warnings. Record authorized approval against exact hash and applicable identity/authority/consent/policy versions; expiry comes from approved policy.
5. P path: provide controlled approved pack access and submission instructions; user/operator submits externally and records receipt/reference. Do not pretend the platform transmitted it.
6. F path: create ExternalAction and outbox record only if connector is enabled. Worker rechecks scope/hold/hash/expiry before execution; changed pack/recipient/declaration or permissions invalidates approval.
7. Record receipt and institution reference. Possible remote acceptance without receipt enters OUTCOME_UNKNOWN/SUBMISSION_UNKNOWN and creates a reconciliation task. Do not send a second claim blindly.
8. Track additional requests, dates, responses and follow-ups. Outcomes require attributable evidence and review. PARTIALLY_SETTLED tracks settled amount and remaining amount/status separately; unknown remainder is unknown, not zero.
9. Closure summary includes rejected/disputed/unresolved work; reopening appends reason and new evidence. Dispute holds cannot be overridden by an AI tool.

### 7.4 Legacy snapshot, sharing and release (FL-11, FL-24, FL-31–34)

P: snapshot reviewed inventory, checklist, dated observations and gaps. Contact intent is inert metadata. A user-requested export is an authorized immutable version with a short-lived download capability and audit receipt; exported copies cannot be recalled.

F lifetime sharing: verify recipient, preview exact scope, approve disclosure, issue scoped/expiring ShareGrant and record access. Invite tokens are one-time, short-lived and stored hashed; token possession alone does not reveal financial records. Membership/permission revocation blocks future reads and invalidates pending exports/links where technically possible.

F post-death release: create ReleaseRequest; obtain required death/identity/authority evidence; check current planner instructions, applicable holds and D-04 contest/notification procedure; qualified reviewer resolves prerequisites; authorized exact-scope approval precedes a recipient grant. No inactivity or model-inferred death trigger. A disputed recipient gets no other claimant’s information through the dispute flow. Rejection, expiry and hold release require reasons/evidence.

Until D-04 is accepted, release APIs/workers remain disabled; storing release intent is not executing a release. This workflow shares information only and never transfers assets or adjudicates inheritance.

### 7.5 Tasks, follow-up and operator work (FL-17, FL-21, FL-42–44/49)

Each actionable task has entity/context, owner, due_at, state and blocker. Reminders are idempotent by task + policy/window + channel; respect preferences, time zone and cancellation/closure. External notifications are F, opt-in and minimal-content, linking to an authenticated case rather than including financial details.

Operator queues are assignment-scoped: verification, field review, claim requests, unknown submissions, disputes, complaints and overdue work. Require reason/evidence for privileged review and escalation. Operators cannot use a review action to bypass external-action approval. Help/complaints share a traceable case reference with restricted support data.

Automated calls/messages require an enabled source/channel, approved disclosure/identity, current permission and purpose, logged contact/outcome, opt-out behavior where relevant and an approved escalation path. Transcript text cannot by itself mark a claim settled; require reviewed outcome evidence.

## 8. AI case-manager design

Persist goal/mode, reviewed facts, open tasks and workflow state in domain records. Conversation summaries reference those records and source versions; they are disposable read models, not financial truth. Corrections invalidate stale summaries. Retrieval filters by case, purpose and allowed object scope before content reaches a provider.

Logical capabilities: conversational intake, discovery planning, document extraction, reconciliation suggestions, legacy preparation, claims preparation and follow-up planning. Separate autonomous agent processes are unnecessary. Every tool has strict input/output schema, declared action class and mapped PRD IDs.

| Tool class | Examples | Enforcement |
| --- | --- | --- |
| Scoped read | get_case_tasks, get_reviewed_evidence | Server-derived actor/case, allowed fields only |
| Internal proposal | propose_asset_fields, propose_discovery_plan | Schema validation, citations, no verified state mutation |
| Reviewed mutation | record_field_review, generate_pack | Authorized actor/workflow review and expected versions |
| External action | submit_approved_claim, release_approved_scope | Enabled capability, exact approval and execution-time policy |

Tool argument validation rejects unknown fields, cross-case references, arbitrary URLs, actor/role substitutions and unsupported state changes. Documents and model responses are untrusted; embedded instructions cannot grant consent, change system rules or invoke unrestricted tools. No raw arbitrary SQL, shell access or browser automation is exposed as a customer-facing AI financial tool.

Pin prompt/model/schema versions. Log redacted tool outcomes, not private reasoning or full prompts containing financial records. Evaluate critical-field correctness, evidence fidelity, prompt-injection resilience, correct escalation and unauthorized-action blocking (FL-53). Unknown institution requirements cause human review; do not invent legal instructions.

Voice/speech adapters are F: record permitted language, user-visible microphone/recording state, policy/consent, transcript edits and stopping state. Use approved processors and retention. Names/numbers/amounts must be reviewable in text; keep structured consequential previews. Model/provider failure returns a saved task state and manual/human next step, not lost work.

## 9. Connector and workflow governance

A connector declares source/version, allowed methods, data/subject types, purpose/scopes, response/evidence schema, freshness, rate/cost limits, credential policy, error taxonomy and receipt/reconciliation semantics. States: DISABLED → VALIDATING → SANDBOX → ENABLED; any unsafe/stale capability → SUSPENDED. A validated connector is not permission for every institution, subject type or workflow.

Every source enablement needs D-03 evidence: permitted access/contract/eligible role, living/deceased rules, authority/consent mapping, sandbox results, retention, operational owner and re-review date. The PRD’s official-source links establish background purpose, not startup API rights. UDGAM/MITRA/DigiLocker/Account Aggregator/IEPF are separate candidates, not one universal connector.

Use server-side secrets, scoped credentials and approved token/redirect flows. Validate callback state, webhook signatures/timestamps and replay IDs. Persist unique provider-event IDs; reconcile out-of-order updates against the source before state promotion. Never log tokens, put them in URLs or request financial passwords/OTPs in chat. Network egress and recipient allowlists prevent arbitrary destinations/SSRF.

Templates contain requirement schema, source/review date, institution/asset/subject scope, reviewer, version/hash and enabled state. Suspension blocks new automatic use and creates a review task for affected in-flight work. Approved case packs retain historical versions. Material requirement changes require reviewed migration/re-approval, not a silent global replacement.

## 10. Privacy, security and data lifecycle

Implement FL-18, FL-19, FL-23, FL-45–49 across all boundaries:

- TLS; encryption at rest and for sensitive fields; managed keys with separate service permissions; no public storage.
- Strong authentication, managed recovery, session expiry and policy-defined step-up for sensitive reads/exports/approvals. Contact changes must not bypass recipient verification.
- Explicit case/document/action authorization, hold evaluation, signed short-lived access and immediate removal of active membership permissions.
- No financial identifiers, document text, balances, credentials or sensitive family details in analytics, ordinary logs, queues or notification previews. Separate minimal audit metadata from raw evidence.
- Approved provider/hosting/retention/subprocessor terms before real data processing; minimize fields and disable training/retention where required and supported by approved terms. No assumed “zero retention” without evidence.
- Separate dev/staging/prod identities, keys and storage. Synthetic fixtures only by default; any consented evaluation dataset requires approved purpose/access/retention and cannot be placed in GitHub.
- Audit sensitive access and changes through restricted append-only writers, protected integrity/retention and access monitoring. Actors cannot delete their own audit history to conceal actions.

Deletion: authorize request → immediately revoke case/session/derived access as applicable and cancel queued work → calculate live document/pack/export/transcript/search/processor copy manifest → apply justified explicit holds → purge eligible copies and collect processor receipts → record backup expiry → complete or explain remaining hold/expiry. Restore must reapply deletion tombstones so deleted data is not made active again. Audit retains only justified minimal metadata under its own approved retention, not deleted raw financial content.

Do not promise remote recall of exports or reversal of completed institutional disclosures. D-05 must set durations, hold authority and user messaging before pilot.

## 11. Operations, resilience and quality budgets

Observability uses request/job IDs, pseudonymous case references and coarse state/capability categories. Track API latency/error, queue age, scan/extraction failures, field-review backlog, consent/approval invalidation, connector unknown outcomes, case/claim dwell time and privacy/security alerts. Product metrics implement PRD section 15; waiting for institutions is not counted as AI processing work.

Per handler: bounded concurrency, deadline, lease/heartbeat, safe retry class, dead-letter queue, cancellation/revocation checks and operator recovery. Circuit-break a failing connector; preserve case progress and show blocked dependencies. Maintain runbooks for provider outage, unauthorized access, leaked credentials, wrong evidence association, unsafe template, unknown submission, deletion failure and restoration.

FL-52 suggests API p95 <1 s, acknowledgement <2 s, 20-page clean extraction p95 <2 min, 99.5% monthly internal availability and RPO 24 h/RTO 8 h. These are proposed budgets, not measured results or customer SLAs. D-07 defines concurrent cases, file sizes, model/provider load, test sample, measurement period, exclusions, support hours, cost and final targets. Measure end-to-end user-visible processing and distinguish provider outage from internal reliability. Backups are encrypted and restoration is exercised before acceptance.

Accessible UI (FL-50): semantic labels/focus/error associations, keyboard and screen-reader core journeys, readable language/large text, responsive layouts, non-voice alternative, visible pending/error/retry states and save/resume. Do not retain raw documents in browser local storage/service-worker caches. Native app/offline behavior remains blocked by D-11.

## 12. Verification matrix and release evidence

The [acceptance plan](ACCEPTANCE.md) maps all 55 requirements individually. Every P ID must have unit/integration/end-to-end or operational acceptance evidence appropriate to the behavior. Tests focus on invariants and failure boundaries, not assertions that mirror implementation. F IDs remain disabled until their own tests/gates pass.

| Scenario / invariant | Required check | PRD mapping |
| --- | --- | --- |
| Routing and continuity | All four entry paths; switch isolated cases; corrected facts survive resume/failure | FL-01, FL-02, FL-22, FL-40 |
| Identity/authority/access | Separate scope/expiry, cross-case IDs/search/download/export denied, reassignment and recovery cannot bypass authority | FL-03, FL-04, FL-23, FL-45, FL-48 |
| Intake/extraction | Unsafe/unreadable/encrypted input; evidence/page citations; critical-field correction/rejection; no invented fields | FL-05, FL-06, FL-25, FL-26 |
| Inventory/discovery | No-result/partial coverage; name-only match; conflict/merge reversal; historical/duplicate/incompatible values excluded | FL-07, FL-08, FL-09, FL-10, FL-28, FL-29 |
| Legacy P | Missing/unknown information; contact intent grants nothing; export exact dated scope | FL-11, FL-31, FL-34 |
| Claims | Known-asset path; versioned/stale requirements; pack preview; changed data invalidates approval; independent claims | FL-12, FL-13, FL-14, FL-15, FL-37 |
| Outcomes and uncertainty | Unknown acceptance blocks retry; partial remainder tracked; rejection/dispute not success; closure/reopen evidence | FL-16, FL-36, FL-37 |
| Operations | Help/complaint/dispute hold, assignment, due/preference-aware deduplicated reminders, suspended templates | FL-17, FL-42, FL-43, FL-44, FL-47, FL-49 |
| AI controls | Cross-case retrieval/prompt injection/role and URL substitution blocked; stale summary not authoritative; provider failure handoff | FL-38, FL-39, FL-40, FL-46, FL-53 |
| Lifecycle | Audit sensitive reads, revoke queued access, processor/derived deletion, hold messaging, backup expiry and restore tombstones | FL-18, FL-19, FL-46 |
| Quality/traceability | Accessible desktop/mobile journeys, agreed load/restore exercises, redacted metrics and complete requirement mapping | FL-50, FL-51, FL-52, FL-53, FL-54, FL-55 |
| F integrations/assets | Exact allowed subject/purpose, permission and receipts, each category schema and amount semantics | FL-27, FL-30, FL-35, FL-36, FL-44 |
| F sharing/release | Invite grants nothing, verified scoped recipient, revoke, competing claimants/death evidence/hold/approval, no inactivity release | FL-24, FL-32, FL-33, FL-47 |
| F voice/follow-ups | Evaluated languages/transcript correction/microphone stop/text fallback; disclosed approved follow-ups and opt-out | FL-20, FL-21, FL-41, FL-42 |

Representative extraction evaluations include statement formats, scan quality, Indian names, date/amount ambiguity and duplicate/conflicting records. Critical fields are reported separately. Voice/language quality uses a representative separate evaluation. Release evidence stores expected/actual behavior, requirement IDs, dataset/environment, reviewer and defects without placing real financial records in the repo.

## 13. Implementation handoff and boundaries

Before a feature is built: select PRD IDs and P/F scope; resolve the blocking D decisions; specify request/event/schema version changes; document normal/error/hold/revocation behavior; identify tests and operations owner. OpenAPI schemas, migrations and runbooks refine these contracts under FL-55; they cannot add unmapped behavior.

No real-data intake until D-02/D-05 controls are accepted. No live source until D-03 validation. No recipient sharing/release until D-04. No qualifying current totals without D-06 rules. No performance/SLA claim without measured D-07 acceptance. No new category/language/native client merely because an adapter or library exists.

This design defines interfaces and invariants, not a claim of a working system. The [roadmap](ROADMAP.md) orders existing PRD scope and the PRD remains the authoritative decision register.
