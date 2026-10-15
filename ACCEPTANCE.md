# Financial Legacy — Acceptance and Traceability Plan

Version 0.3 · 15 October 2026 · Planned verification; no application tests have been executed

## 1. Purpose and authority

This plan maps every [PRD](PRD.md) requirement to acceptance evidence. It specifies how to verify the contract; it cannot add product scope. [LLD](LLD.md) maps modules, records, routes and jobs. P/F and D decision meanings come only from the PRD. All rows below are **not yet executed** until a working implementation and recorded evidence exist.

Each implementation ticket/PR names its requirement IDs and links relevant scenarios here. Exact test cases, fixtures and assertions refine the stated acceptance criteria; a new behavior requires a PRD amendment first (FL-55).

## 2. Test strategy

- Domain tests verify evidence states, money/date/type rules, policy guards, state transitions, version conflicts and approval invalidation.
- Integration tests verify database isolation/constraints, storage authorization/quarantine, outbox/worker retries, deletion and provider adapters using approved fakes/sandboxes.
- End-to-end tests exercise complete owner, planner and claimant journeys, including a user correcting extracted data.
- Security/adversarial tests attempt cross-case access, stale/revoked consent, prompt injection, role/URL substitution and duplicate/uncertain external execution.
- Evaluation tests measure extraction/model/voice quality on representative labeled data; confidence alone is never acceptance evidence.
- Operational/accessibility tests exercise assigned review, complaints/disputes, outages, backups/restoration, readable/responsive/keyboard/screen-reader journeys and agreed workloads.

Use synthetic records by default. Properly consented real evaluation data requires D-05 approval/access/retention and stays outside GitHub. Safe sandbox responses do not establish real source permissions.

## 3. Requirement coverage matrix

P rows are pilot gates; F rows are disabled until their explicit expansion gate. P/F means an in-app pilot capability plus gated external/full-product extension. Each expected result is interpreted with the complete PRD row, not as a replacement for it.

| Requirement | Release | Scenario and required evidence |
| --- | --- | --- |
| FL-01 | P | Route all three goals plus known-asset claim; user corrects inferred route; known asset skips discovery |
| FL-02 | P | Resume after sign-out/interruption; saved facts/tasks/evidence remain; correction overrides stale summary |
| FL-03 | P | Independent identity/relationship/authority states and scopes; pending/rejected/expired prerequisite blocks affected action |
| FL-04 | P | Consent receipt covers purpose/data/recipient/expiry; revocation stops queued retrieval/action; completed disclosure history retained |
| FL-05 | P | Valid upload reaches quarantine/scan; wrong type/unsafe file is blocked; scan/extraction failure and retry are distinguishable |
| FL-06 | P | Representative extraction has field/page citations; critical ownership/identifier/amount fields require review; no invented value accepted |
| FL-07 | P | Name-only match/model confidence cannot become institution-verified; reviewed attributable evidence required for promotion |
| FL-08 | P | Duplicate/conflict review preserves evidence/aliases; name-only automatic merge prevented; reversal recomputes dependencies |
| FL-09 | P | Asset detail shows masked reference, evidence, amount type/currency/source/date and next action; unknown values remain unknown |
| FL-10 | P | Source plan discloses manual/blocked/unavailable coverage; partial/no results never imply exhaustive search/no assets |
| FL-11 | P | Planner reviews inventory/checklist with missing nominations/documents/staleness and dated snapshot/open gaps |
| FL-12 | P | Claim retains institution/category/template version; stale/missing procedure escalates and is not invented |
| FL-13 | P | Pack manifest includes reviewed required/optional evidence and declarations; missing/rejected items visible before use |
| FL-14 | P | Exact recipient/channel/purpose/content preview; material edit, expiry or revoked authority invalidates approval; pilot remains manual |
| FL-15 | P | Manual receipt/reference and institution requests/responses create a faithful timeline and owned tasks; waiting states visible |
| FL-16 | P | Evidenced settlement/transfer/partial/rejection/dispute; amount/date/type preserved; remainder stays tracked; closure reviewed |
| FL-17 | P | Help/unsupported/authority/legal dispute creates a visible assigned handoff; no AI entitlement decision |
| FL-18 | P | Sensitive reads/downloads/changes/exports/approvals/execution create attributable protected audit events without raw secrets |
| FL-19 | P | Deletion revokes access and queued work; derived/processor copies, justified holds and backup expiry tracked; restore honors tombstones |
| FL-20 | F | Evaluate each supported language/speech mode; correct names/numbers/transcript; text fallback and structured approval work |
| FL-21 | F | Permitted disclosed follow-up checks recipient/channel/purpose/current permission; logs outcome and blocks unsupported calls |
| FL-22 | P | Several isolated cases; subject/path clear on switch; mode/subject correction rechecks policy and stops stale streams |
| FL-23 | P | Owner/claimant/assigned-operator scopes enforced on APIs/search/storage/jobs; reassignment and restricted admin access tested |
| FL-24 | F | Invite alone exposes nothing; verified recipient + scope/expiry/approval precedes access; revocation blocks future reads |
| FL-25 | P | Missing/unreadable/encrypted/conflicting documents yield usable alternatives/secure handoff; passwords never requested in chat |
| FL-26 | P | Accept/correct/reject fields/source associations with version/reason; material corrections invalidate dependent pack/approval |
| FL-27 | F | Per-source subject/purpose/consent/authority and permitted channel validated; refresh preserves evidence and coverage; disabled source blocked |
| FL-28 | P | Old/new observations and closure/transmission evidence remain attributable; no destructive replacement or missing-source inference |
| FL-29 | P | Duplicate/potential/stale/historical/unknown/incompatible values excluded; one qualifying observation/type/currency; exclusions explained |
| FL-30 | F | Each of nine classes passes its schema, amount, evidence, discovery/authority and claim workflow evaluation before enablement |
| FL-31 | P | Contact intent creates no invite/disclosure; planner corrections/contact replacement/review reminder retain history |
| FL-32 | F | Lifetime sharing verifies recipient, exact approved scope, expiry/access log and revoke; no unapproved family access |
| FL-33 | F | Post-death release requires D-04 death/identity/authority/instructions/hold review and exact approval; inactivity trigger blocked |
| FL-34 | P | Export corresponds to authorized dated snapshot/scope; short-lived access and audit; downloaded-copy limitation explained |
| FL-35 | F | Direct submit uses enabled source/channel and execution-time exact approval/policy; receipt and provider idempotency recorded |
| FL-36 | P | Possible remote acceptance without receipt enters unknown; reconciliation required before retry; duplicate key returns same result |
| FL-37 | P | Additional institution request and new evidence update the specific claim; reopening preserves prior outcome/template/pack history |
| FL-38 | P | Case manager uses persisted reviewed facts and bounded tools; cannot grant roles/authority or approve/verify its own proposal |
| FL-39 | P | Explain information need and cite evidence/procedure; contradictory/missing information escalates; uploaded instructions cannot confer tools |
| FL-40 | P | Model/provider failure saves work and supplies next step; retries do not duplicate writes; cancel/correct/human help work |
| FL-41 | F | Recording/microphone state and consent visible; stop/text option honored; approved processing/retention and transcript correction tested |
| FL-42 | P/F | In-app task ownership/due/time zone/preferences and deduplicated reminders in P; opt-in minimal external notification/opt-out in F |
| FL-43 | P | Assigned operator queues show owner/priority/blocker; unassigned cases hidden; privileged review needs reason and audit |
| FL-44 | P | Source/template/model/tool versions have reviewer and enabled scope; suspension stops unsafe new work; in-flight history/re-review preserved |
| FL-45 | P | Authentication/encryption/session/short-lived links and sensitive-action strength accepted; cross-case/access revocation adversarial cases pass |
| FL-46 | P | Unapproved provider/tool/destination blocked; approved processor payload minimal; terms/retention evidence and redacted logs checked |
| FL-47 | P | Fraud/competing claimants/disputed documents place affected actions on controlled hold; resolution authorized; other claimant data stays private |
| FL-48 | P | Account/session/contact recovery does not bypass recipient or authority checks; expired/old access removed and changes audited |
| FL-49 | P | Complaint/help case has owner/state/escalation/resolution; ordinary support notification does not include private documents |
| FL-50 | P | Responsive desktop/mobile, keyboard/screen reader/large text, labels/focus/errors, resume and non-voice paths pass agreed accessibility review |
| FL-51 | P | Queue/worker restart, duplicate delivery, cancellation and connector outage preserve state and avoid duplicate external effects |
| FL-52 | P | D-07 workload/budget approved; measured latency/capacity/cost, internal availability and backup/restore evidence; no unsupported SLA |
| FL-53 | P | Representative labeled critical-field/AI evaluations, unsafe-tool/false-verification tests and separate language gate; record error categories |
| FL-54 | P | Metrics match PRD definitions, separate waiting/human work and contain no document text/identifiers/balances |
| FL-55 | P | Every feature/API/job/tool/schema change and test maps to PRD IDs; no LLD/ticket-only scope; amendment/acceptance precedes expansion |

## 4. End-to-end scenario packs

| Pack | Setup and journey | Critical result |
| --- | --- | --- |
| A — Living owner | Old bank statement + newer conflicting observation + duplicate upload + forgotten fund declaration | Reviewed evidence and correction; uncertainty preserved; historical/duplicate value does not inflate current total |
| B — Legacy planner | Reviewed inventory, unknown nomination, missing document and one contact intent | Dated record/gaps/export; no contact access or notification in pilot |
| C — Known-asset claimant | Supported authority + known fund holding + current template + additional institution request | Discovery optional; exact pack review/manual receipt; visible task/outcome/closure |
| D — Unknown holdings | Deceased subject, incomplete records and a no-result/partial source attempt | Honest coverage/gaps and actionable handoff; no “no assets exist” assertion |
| E — Access and dispute | Unverified/expired/revoked authority, cross-case IDs, competing claimant and hostile uploaded instructions | Restricted action blocked; affected hold with reviewer; no leaked evidence/tool authority |
| F — Submission and outcomes | Changed pack, duplicate submit and timeout after possible acceptance; partial settlement | Old approval invalid, single action, reconciliation before retry and tracked remainder |
| G — Outage and lifecycle | Unsafe/unreadable file, stale template, provider/worker failure, delete/hold and restore | Durable work, usable next steps, no unsafe processing, tombstones and tracked retention |
| H — Full product | Verified collaborator/lifetime share, post-death release dispute, selected language/voice, extra class and source | Separate gated evidence per capability; no global F enablement shortcut |

For specialized joint/minor/representative/nonresident cases, verify supported workflow routing or explicit block/handoff, never a guessed universal nominee procedure. Test institution/category/subject combinations separately where requirements differ.

## 5. Evidence record and release decision

Record test/scenario ID, PRD IDs, PRD/LLD version and Git commit, P/F scope, fixture/environment, expected/actual result, automated/manual steps, reviewer/date, defect IDs and decision. Protect test artifacts containing sensitive data under approved policy; keep synthetic evidence in repo.

A pilot requires all P rows, section 4 packs A–G, accepted blocking decisions and named operators. No unresolved critical authorization, disclosure, evidence-integrity or duplicate-execution defect is acceptable. Mark failed/blocked tests honestly; a test plan is not a passing test.

F needs pack H plus each language/category/source/subject/channel/release-specific gate. D-01 sets business targets; D-07 sets workload and service budgets; D-09 sets voice/language evaluation thresholds. Undefined thresholds are unresolved decisions, not default passes.

## 6. Concrete reference acceptance oracles

Use [BUILD_SPEC.md](BUILD_SPEC.md) and [contracts/fixtures.json](contracts/fixtures.json). Fixture time is 2026-10-15T00:00:00Z. Eligible reviewed bank INR 42,000 + fund INR 2,500 = INR 44,500. Historical FD, potential-name match, duplicate and unknown-date records are excluded with the contract’s precedence/reasons. Known partial claim INR 1,000 of INR 2,500 leaves INR 1,500; an unknown remainder stays null/unknown. No cross-case evidence reuse.

Tests cover generated-PDF SHA registration, unsafe/unknown hash rejection, separate review, 15-minute approval expiry, 30-day consent expiry, revocation of queued work, unknown manual acceptance and safe retry, exact role/case context, deletion/tombstone restoration and all F routes disabled. Fixed load/browser/session/retention budgets and command behavior are specified in BUILD_SPEC.md; no additional threshold-choice meeting is needed to implement the reference tests.

CI must parse/validate OpenAPI and references, check request/response/generated model agreement, execute SQL migrations on fresh PostgreSQL 18, seed twice idempotently, run domain/integration/E2E packs and report all failures. These runtime checks are not yet executed; the current deliverable is the coding contract. Real-provider/model/language quality and monthly production availability cannot be certified by synthetic tests.
