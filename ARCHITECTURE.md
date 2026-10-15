# Financial Legacy — Architecture Overview

Version 0.3 · 15 October 2026 · Proposed; no running system

## 1. Product and scope boundary

Financial Legacy coordinates financial discovery, legacy preparation and claims assistance through one persistent AI case manager. The [PRD](PRD.md) owns every product requirement and unresolved decision. This overview explains how the pieces fit; [LLD.md](LLD.md) defines records, APIs and transition guards. Nothing here expands PRD scope (FL-55).

P is the proposed document-led pilot. F is the gated full vision. A manual enquiry, prepared pack or mock response is never presented as a live integration.

## 2. System at a glance

| Boundary | Components | Responsibility |
| --- | --- | --- |
| User experience | Responsive web, chat, structured review/inventory/legacy/claim/task views; voice/native client gated | Explain current subject/state, collect information and obtain reviewable decisions |
| Trust and policy | Managed identity, case membership, verification, authority, consent, holds and approval | Decide who may see/do what for which subject/purpose, now |
| Application domain | Case, documents, discovery/assets, legacy, claims, tasks and operations modules | Own durable facts and deterministic transitions |
| AI orchestration | Case manager and bounded capability/provider adapters | Propose questions/fields/steps, cite evidence, coordinate permitted tools |
| Financial integration | Approved connector gateway and versioned institution workflows | Retrieve or submit only for validated source/subject/channel scopes |
| Data/operations | Transactional database, private evidence store, durable workers/outbox, audit and redacted monitoring | Preserve evidence, reliability, traceability and controlled lifecycle |

The pilot should use a modular backend, not a fleet of autonomous microservices. Module boundaries can later support independent deployment if real scale or ownership needs justify it. The reference choices are fixed in BUILD_SPEC.md; real-data provider/hosting approvals remain D-05/D-07.

## 3. Core system flows

### Evidence to inventory

Authorized upload → quarantine and scan → approved extraction → cited field proposals → user/operator review → evidence-linked holding and immutable dated observations → deterministic inventory summary.

A possible match remains a possible match. A model confidence score cannot verify ownership. Historical amounts, unknown freshness, duplicate candidates and incompatible amount types cannot inflate a current total (FL-05–10, FL-25–30).

### Inventory to legacy

Reviewed inventory → preparation checklist and gap review → dated snapshot/contact intent → scoped export in P → verified lifetime sharing or controlled post-death release only after F policy gates.

A contact entry is inert. No inferred death, inactivity or agent decision creates recipient access. Release shares information; it does not transfer assets or decide entitlement (FL-11, FL-24, FL-31–34/47).

### Known asset to claim outcome

Known or discovered holding → action-specific authority → reviewed institution requirements → immutable claim pack → exact user approval → manual handoff in P or enabled connector in F → receipt and follow-up → evidenced outcome with outstanding remainder/dispute tracked.

Discovery is optional for known holdings. Each institution claim progresses independently. Possible remote acceptance without a receipt enters an unknown state and requires reconciliation before retry (FL-12–17/35–37).

## 4. What the AI controls

The AI understands the goal, gathers information, reads approved evidence, suggests matches, prepares drafts and coordinates tasks. It uses server-scoped, schema-validated tools.

It cannot grant authority, expand access, establish inheritance, promote institution verification without evidence, approve its own disclosure or invoke unrestricted external tools. Documents are untrusted data, not instructions. Persistent domain records are authoritative; conversation summaries reference them and can be rebuilt (FL-38–40/46/53).

## 5. Data and trust boundaries

Case and subject scope follow every record, retrieval, job and storage access. The domain database owns state; private storage owns binaries; audit stores minimal attributable access/change events. Processors receive only approved purpose-scoped data. Development uses synthetic records; no financial evidence belongs in GitHub.

Identity, relationship, authority, consent, nominee information, approval and institutional entitlement are distinct. Policy is checked at request time and immediately before queued execution. Revocation blocks future access/work; already delivered disclosures and downloaded exports cannot be recalled (FL-03, FL-04, FL-18, FL-19, FL-23, FL-45–48).

## 6. Reliability boundary

Writes and outbox events commit together. Workers assume duplicate delivery, use bounded retries and recheck current policy. Version checks prevent stale reviews/approvals. External execution uses provider idempotency where available, stored receipts and explicit unknown-outcome reconciliation; an internal queue alone does not guarantee exactly-once external effects (FL-36, FL-51).

User-visible states distinguish waiting on the user, waiting on an institution, review, errors and unresolved outcomes. Monitoring is redacted. Backup/restore, deletion tombstones, accessibility and measured service budgets are release evidence, not implementation assumptions (FL-40, FL-50–54).

## 7. Expansion and decisions

Voice/languages, collaboration/sharing/release, all nine asset categories, live retrieval, direct submissions and automated follow-ups are explicit F requirements. Each source/category/channel/language has a separate gate; no universal “enable AI” switch authorizes all of them.

D-02 governs identity/authority; D-03 source access; D-04 family release; D-05 processors/retention; D-06 evidence/amount policies; D-07 capacity/operations; D-09 voice; D-10 procedures; D-11 native client. The full authoritative register is PRD section 17.

Read [ACCEPTANCE.md](ACCEPTANCE.md) for requirement-level verification and [CONTRIBUTING.md](CONTRIBUTING.md) before creating implementation work.

## 8. Implementation entry point

The reference architecture is now fixed in [BUILD_SPEC.md](BUILD_SPEC.md) and its API/SQL/fixture contracts. Start B-01: scaffold and local Compose, then migrations, identity/policy and the three synthetic journeys. Production provider/permission choices remain launch gates; they are not a reason to delay isolated reference coding. The deterministic case manager/extractor are testable stand-ins, not evidence that real AI/provider behavior works.
