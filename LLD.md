# Financial Legacy — Low-Level Design (LLD)

Version 0.3 · 16 October 2026 · Implementation baseline for the reference release


## 1. Start here

### First-principles design rules

| Reality of the problem | Design consequence |
| --- | --- |
| Financial records can be incomplete, stale or wrong | Preserve source/type/date and uncertainty; review critical fields before accepted facts or totals |
| Knowing someone is family does not establish permission | Check actor, subject, action, authority and consent separately; a match never decides inheritance |
| Institutions own different records and procedures | Use source/category/subject-specific adapters and versioned templates; no universal financial connector |
| Sharing may be irreversible | Freeze exact content/recipient/purpose, approve it, recheck permission at download/execution and retain the receipt/history |
| Requests repeat and jobs fail | Persist domain state and pending work together; use versions, safe retries, receipts and unknown-outcome reconciliation |
| Conversation and model output are fallible | Keep reviewed domain records authoritative; AI proposes through bounded tools and cannot alter policy |
| Sensitive records need a bounded lifetime | Encrypt, minimize access/processors, audit reads, revoke future work and track deletion/holds/restore markers |
| The first build must teach us cheaply | One modular backend, one database and shared worker code; sample adapters first, no separate agent fleet or unapproved real connections |

These rules implement the existing PRD requirements; they do not create extra product features. The wire/database contracts remain the exact implementation format.

### The six product layers

| Layer | What it does | First implementation |
| --- | --- | --- |
| User experience | Conversation, document upload/review and views for holdings, legacy, claims and tasks | Responsive web/text; voice and native apps later |
| Identity and authorization | Sign-in, consent, claimant checks, permissions and access history | Local OIDC plus case-scoped reviewer/backend checks |
| AI orchestration | Understand the goal, propose questions/actions, coordinate tools and handle exceptions | One rule-based case manager; approved external providers later |
| Financial integration | Permitted APIs/partners, official workflows and authorized imports | Sample source/document adapters and guided steps; no real connector |
| Asset and document records | Evidence, extraction, matching, dated values, storage and audit | PostgreSQL and encrypted private files with reviewed proposals |
| Claims and workflow | Institution requirements, forms/packs, approval, tasks, follow-ups and outcomes | Versioned demonstration procedures and manually recorded sample receipts/outcomes |

These are responsibilities inside one modular backend, not six independent services. The assistant coordinates work; deterministic backend code controls access and accepted changes.


**Start B-01 in the coding table below, using the [PRD](PRD.md), [API](contracts/openapi.json), [SQL](contracts/schema.sql) and [fixtures](contracts/fixtures.json).** Expand reference sections only for the module being built.

First journey: Demo Owner → case 100 → identity fixture 330 → reviewer checks/scoped consent → bank fixture 300 → field review → saved holding → sign out/resume. Expected reviewed bank value: ₹42,000. Section 17 gives exact checks. Build this slice before extending the remaining first-release paths.

### What is being coded

A responsive web application covering all three user paths and all P requirements: text case manager, isolated cases, verification/authority review, secure evidence intake/review, bank/FD and mutual-fund inventory, legacy record/export/contact intent, manual claim packs/receipts/outcomes, tasks, operations, audit, deletion and recovery. F features have explicit disabled capabilities and contracts, not partially working hidden features.

**Reference mode is synthetic-only.** Banner every page/export/pack: “Demonstration — synthetic records. No real identity verification, asset discovery or claim submission.” No real customer financial documents, credentials, phone calls, emails or institution requests. The app must refuse a real-data configuration until launch policies are supplied. This is the first implementation, not a relabeling of a simulation as a live pilot.

<details>
<summary><strong>Implementation reference — stack, setup, security, screens, APIs and data rules</strong></summary>

## 2. Fixed technology decisions

The web app is what the user sees. The API is the backend interface the web app calls. PostgreSQL stores linked records. The worker runs slow tasks after the API has accepted them. Keycloak handles sign-in. ClamAV checks files for malware. Docker Compose starts these local components together. The table selects the tools; developers should not choose a different framework before starting.

API request means information sent to the backend. Response means what it sends back. A schema defines the allowed fields and types. An adapter connects our code to one storage, scanner or AI service.


| Concern | Selection | Implementation rule |
| --- | --- | --- |
| Web | Node.js 24 LTS, Next.js 16 App Router, TypeScript, React as required by Next.js | Same-origin BFF; browser never stores financial-provider tokens |
| UI | Tailwind CSS, accessible HTML controls; React Hook Form + Zod for client validation | Server validation authoritative; keyboard/screen-reader/large-text paths |
| API | Python 3.13, FastAPI, Pydantic 2 | Typed contracts; strict extra-field rejection; no arbitrary model tools |
| Persistence | PostgreSQL 18, SQLAlchemy 2, Alembic | SQL contract is initial relational baseline; migrations versioned |
| Jobs | PostgreSQL outbox + leased job rows; separate Python worker | No Redis/Celery/Kafka required; duplicate delivery expected |
| Local identity | Keycloak OIDC in Docker, synthetic realm/users only | Authorization Code + PKCE; API validates access-token issuer/audience/signature/expiry |
| Storage | LocalEncryptedStore for reference mode; private object-store adapter interface | AES-256-GCM envelope encryption, generated local keys, opaque paths, no plaintext browser cache |
| Scan | ClamAV adapter; deterministic synthetic test scanner only in tests | Fail closed; scanner outage never marks arbitrary file clean |
| Extraction / AI | FixtureExtractionAdapter and RuleBasedCaseManager for reference mode; typed provider adapters | No external model/API key needed to start coding; output always source-linked proposals |
| Rendering | Python PDF renderer for synthetic fixture documents and reviewed exports/packs | Stable metadata/order; manifest cites source/version; no legal form certification |
| Tests | pytest + HTTPX, Playwright, accessible-role assertions and axe checks | Representative fixtures; contract/domain/integration/E2E boundaries |
| Runtime | Docker Compose for web, API, worker, Postgres, Keycloak and scanner | One documented local command path; no cloud dependency |

Major branches are deliberate choices, not a claim of latest patch. First scaffold resolves compatible patch releases, commits npm/uv lockfiles and records container digests; dependency locking is coding work, not a product decision. Do not install arbitrary latest majors. Background compatibility references: [Node release lines](https://nodejs.org/en/about/previous-releases), [Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16), [Python 3.13](https://docs.python.org/3.13/), [PostgreSQL support](https://www.postgresql.org/support/versioning/), checked 15 October 2026. Provider/library compatibility must pass the scaffold tests before coding downstream work.

## 3. Repository layout and developer contract

    apps/web/                    Next.js UI and server-only OIDC/BFF
      app/(auth)/                sign-in/callback/sign-out/session errors
      app/cases/                 case list/new and case-scoped surfaces
      app/operations/            assigned queues and approved review actions
      components/                accessible reusable controls and case banner
      lib/server/                session, CSRF and API client; never imported by client code
    services/api/app/
      main.py                    startup/config, routers, exception handlers
      config.py                  typed env and mode validation
      auth/                      OIDC validation, actor context, policy/holds
      modules/                   cases, documents, discovery, assets, legacy,
                                 claims, approvals, tasks, operations, lifecycle
      db/                        session/context, models, migrations
      adapters/                  storage, scanner, extraction, case manager, sources
      contracts/                 generated/checked Pydantic schemas
      audit/                     safe append-only events
    services/worker/app/         job handlers, leases, retry/reconcile/deletion
    contracts/                   OpenAPI JSON, PostgreSQL DDL and synthetic fixtures
    tests/domain/                pure policy/money/state invariants
    tests/integration/           API/DB/storage/worker and contract checks
    tests/e2e/                   Playwright persona/journey packs
    scripts/                     bootstrap, migrate, seed, fixture PDF generation
    infra/                       Compose, synthetic OIDC realm and health checks
    docs/evidence/               synthetic test/release evidence only

Coding must create root commands with this behavior:

| Command | Required outcome |
| --- | --- |
| npm run bootstrap | Check prerequisites, generate untracked local secrets, build synthetic PDFs/manifest, start dependencies, migrate and seed idempotently |
| npm run dev | Start reference stack; print web URL and synthetic sign-in instructions without secrets |
| npm run check | Formatting/type/lint checks and OpenAPI/SQL/fixture consistency |
| npm run test:domain | Deterministic domain tests; no network or real data |
| npm run test:integration | Disposable PostgreSQL/storage/worker integration tests and contract checks |
| npm run test:e2e | Seeded browser journey packs A–G, including failure and revocation paths |
| npm run test:all | Checks + domain + integration + E2E; nonzero on failure |
| npm run reset:demo | Explicit confirmation before dropping only the named local demo database/volumes; never a production command |

The commands are deliverables to implement, not existing commands. README must show their actual tested output when implemented. Local web is http://localhost:3000, API internal on 8000, OIDC on localhost:8080. Bind reference ports to loopback. Docker data volumes and .env.local are ignored by Git.

## 4. Configuration, secrets and startup gates

Required non-secret keys: APP_MODE=reference, API_BASE_URL, WEB_ORIGIN, DATABASE_URL reference, OIDC_ISSUER, OIDC_AUDIENCE, OIDC_CLIENT_ID, STORAGE_ROOT, SCANNER_MODE, CASE_MANAGER_MODE, EXTRACTION_MODE, policy version, log level and time zone default Asia/Kolkata. Secrets: OIDC client secret, database login, storage encryption key, field-HMAC key and session signing key. Generate these during bootstrap into ignored local env; never print or commit them. Tests supply isolated ephemeral secrets.

Reference uses fixture extraction, rule-based conversation, synthetic-only source registry and no outbound notification/submission connectors. F flags default false and cannot be enabled without matching approved capability/policy configuration.

Startup rejects: missing keys; wrong OIDC issuer/audience; unsafe writable storage; real-data mode with fixture identity/scanner/extraction; externally reachable reference host without explicit secure deployment config; real-data mode without accepted authority/retention/provider/source policy. There is no “skip security” production flag.

## 5. Identity, sessions and authorization

OIDC login is server-side through the Next.js BFF with PKCE/state/nonce validation. Store tokens in an encrypted server session; cookie HttpOnly, SameSite=Lax, path=/, absolute expiry 8 hours and idle expiry 30 minutes. Secure=true except loopback HTTP reference mode. State-changing BFF requests require an origin check and session-bound CSRF token. API accepts validated OIDC access tokens only; no actor ID from a request body/header is trusted.

Privileged review comes from assigned case membership plus allowed operation, not merely an identity-provider role. Synthetic owner, claimant, reviewer and unrelated personas are fixtures. Reviewer cannot authorize an external disclosure for themselves; case owner/claimant must approve. Support receives no blanket financial access. Actor and case context are transaction-local and cleared on rollback/pool reuse.

Sensitive approval/export/access uses an authentication age of at most 5 minutes in the reference policy. Expired session redirects to sign-in preserving only a safe case route; no financial content in redirect URLs. Account recovery uses OIDC provider flow; it does not bypass authority/recipient verification.

## 6. Deterministic product policy for the reference build

These are synthetic-development defaults, not legal rules or production promises. Implement through a versioned PolicyConfig; production replacement remains PRD D-02/D-04/D-05/D-06/D-07/D-10.

| Rule | Fixed reference behavior |
| --- | --- |
| Pilot subjects | Living adult owner or adult claimant/deceased subject; known-asset route supported. Joint/minor/representative/nonresident/disputed evidence needs supported workflow or explicit hold/handoff |
| Authority | Assigned reviewer accepts/rejects scoped synthetic evidence; synthetic method labeled; expiry 90 days; evidence/version/rationale mandatory |
| Consent | Exact data/purpose/recipient scope; maximum 30 days; revoked/expired blocks new and queued restricted work |
| Approval | Exact canonical manifest, recipient/channel/purpose and current policy versions; expires after 15 minutes; material changes invalidate |
| Evidence | SELF_DECLARED, POTENTIAL_MATCH, DOCUMENT_BACKED, INSTITUTION_VERIFIED; institution state requires reviewed institution-attributed evidence, synthetic in reference mode |
| Amounts | Decimal strings, INR only in initial UI; money up to 18 digits including 2 fractional places, units up to 24 digits including 8 fractional places; no floats, FX or inferred zero |
| Summary eligibility | Reviewed institution-attributed observation at most 30 days old, no unresolved conflict/duplicate/hold, supported amount type; select latest qualifying observation per holding; title “Reviewed value from dated sources,” not live balance |
| Included amount types | CASH_BALANCE and CURRENT_VALUE; FD principal/maturity, insurance benefit, units, historical amount, locker and settlement amounts excluded from that total |
| Unknown dates | No freshness or total eligibility; show source amount separately. Future dates rejected except maturity/due dates explicitly typed |
| Upload | PDF/JPEG/PNG; 20 MB, 100 PDF pages, 100 megapixel image ceiling; type/signature/size/decoder/scan validation; encrypted PDFs blocked with secure-help next step |
| Reference intake | Only generated synthetic fixture documents with registered SHA-256 may be uploaded; unknown hash rejected; test adversarial fixtures explicitly registered as unsafe/unreadable |
| Extraction review | All identity/ownership/identifier/amount/date/source-association fields require review; confidence never bypasses review |
| Tasks | Suggested due date 7 calendar days unless institution evidence supplies deadline; distinguish suggested from institutional deadline; default reminder once per day at 09:00 user time zone |
| Deletion | Access revoked immediately; jobs cancelled; eligible live/derived reference copies purged within 24 hours; justified hold shown explicitly; reference backups disabled, restore tests use synthetic snapshots/tombstones |
| Reference retention | Synthetic active cases persist until reset/deletion; closed-case purge 30 days; operational logs 7 days and audit metadata 30 days; no real-data policy inferred |
| Notifications | In-app only; no external email/SMS/calls in P/reference |
| Native/offline | Responsive mobile web; no native client or offline document cache |

Amounts/date/evidence semantics refine FL-07/09/28/29; production eligibility/freshness must be reviewed before real data. Never label a simulation as institution verification without the synthetic banner.

## 7. Screen-by-screen coding contract

Use [DESIGN.md](DESIGN.md) for layout, visual tokens, navigation and interaction states. The route/data/permission rules below remain authoritative; presentation cannot enable an unsupported action.

All case routes show subject, path, case state and synthetic-mode banner. All lists have loading, empty, error, retry and permission-expired states. UI derives permitted actions from server policy; hiding a button never replaces server authorization.

| Route | Data and actions | Critical interaction |
| --- | --- | --- |
| /cases | Authorized case summaries and next owned task | New case or resume; no cross-case data in previews |
| /cases/new | Goal → subject → confirm mode; known-asset checkbox for claimant | Explain next step; never force discovery |
| /cases/{id}/chat | Persisted messages, fact summary, tasks and proposed action cards | Ask one useful next question; confirm intent; use typed action cards for consequential decisions |
| /cases/{id}/verification | Identity/relationship/authority requirements and scoped consent | Pending/rejected/expired/hold shown separately; no “verified case” blanket badge |
| /cases/{id}/documents | Upload progress, document status, source preview and field proposals | Side-by-side evidence/field review; accept/correct/reject with reason where material |
| /cases/{id}/discovery | Source plan and attempts with coverage/prerequisites/owner | Manual enquiry task; no-result/partial/blocked distinguished |
| /cases/{id}/assets | Reviewed holdings, separate potential matches, summary eligibility/exclusions | Filter by category/status; detail shows observations/evidence/nomination/next action |
| /cases/{id}/legacy | Checklist, dated record/contact intent and export preview | Adding contact discloses nothing; export review lists gaps/snapshot/date |
| /cases/{id}/claims | Independent claim cards/status/owner | Add known holding and supported template; unsupported situation escalates |
| /cases/{id}/claims/{claimId} | Requirements, pack versions, approvals, receipt, requests and outcomes | Review/download approved pack; record manual receipt; partial outcome preserves remainder |
| /cases/{id}/tasks | Task owner/due/time-zone/state/blocker | Complete/cancel/update with reason/evidence; no fake institution deadlines |
| /cases/{id}/activity | Authorized redacted access/change timeline | Source/version/actor/time; no audit raw secrets |
| /cases/{id}/privacy | Consents, membership, exports and deletion/hold status | Revoke confirms exact scope and future-access effect; explains irreversible completed disclosures |
| /operations | Assigned review/claim/complaint/unknown-submission/overdue queues | No unassigned evidence; review rationale and escalation |
| /operations/{id} | Assigned case review tasks and template/source metadata by role | Reviewer cannot bypass owner approval or enable unsupported sources |

Use system fonts, clear spacing, INR formatting for display only, masked identifiers and semantic HTML. Destructive/reset actions describe exact effect; review controls remain keyboard accessible. No marketing claims, real institution logos or fake success indicators in the reference build.

## 8. API contract and error behavior

OpenAPI 3.1 JSON is the executable request/response contract. Models reject unknown fields. All case-bound identifiers are authorized server-side; inaccessible case/object returns non-enumerating 404. Error envelope: code, safe message, request_id, field_errors. Trace IDs contain no financial identity.

Use 401 unauthenticated; 403 forbidden action on accessible object; 404 inaccessible/missing; 409 stale version/invalid state/idempotency conflict/disabled capability; 413 size; 415 unsupported file; 422 schema/business validation; 429 rate limit; 503 approved dependency unavailable. Include Retry-After for 429/503 when safe.

Every retryable JSON mutation uses Idempotency-Key (UUID/opaque 16–128 characters). Same actor/case/operation/key + same canonical request hash returns original resource/job; different hash returns IDEMPOTENCY_CONFLICT. Retain reference idempotency records 7 days; external action records and receipts follow case retention and are not forgotten merely because a client key expires. Mutable resources use If-Match version; missing/stale precondition is rejected. Approval decisions bind exact immutable payload and cannot be edited into a different decision.

Lists use opaque cursor, limit 1–100 (default 25), stable ordering created_at descending then id. Jobs return 202 with data.id and data.status_url; poll at 1, 2, then 5 seconds, stop on terminal state. Conversation stream is optional transport optimization only; baseline uses persisted message + job polling. No financial content in browser URL/query state.

Rate-limit reference defaults: 120 ordinary requests/minute/user, 20 message requests/minute/user, 10 upload sessions/hour/user; service tests use isolated configurable budgets. Exact counters use server-side storage/DB; never trust client throttling. Production capacity remains measured D-07.

## 9. Saving records safely

schema.sql defines relational names, types, constraints, case-bound foreign keys and isolation policies. Alembic starts from this contract. API uses fl_app runtime role, not schema owner/superuser. Authentication/authorization precede transaction-local actor/case settings. RLS is case-isolation defense in depth, not an alternative to membership/authority/consent checks.

A request transaction commits domain change, audit event and outbox event together. No network call inside that transaction. Worker claims an outbox/job using FOR UPDATE SKIP LOCKED, lease duration 60 seconds with heartbeat every 20 seconds; five safe transient attempts with delays 5, 30, 120, 600, 1800 seconds. Nonretryable validation/authority/hold fails immediately. An ambiguous external effect never enters generic retry.

Use UTC internally and injected Clock in tests; user display uses their IANA time zone. Default reference fixture clock is 2026-10-15T00:00:00Z. Sort and canonicalize manifests using UTF-8, stable keys/order and Decimal strings; hash actual generated file bytes plus manifest/recipient/channel/purpose/policy versions. Do not trust a client-provided content hash as an approval.

## 10. Rules for moving work to the next step

The workflow guards in section 18 apply; exact fields/enums come from OpenAPI and SQL. Implement explicit command handlers, not arbitrary PATCH status. A transition records actor, expected version, guard result, evidence and event. For the reference release:

- Claim requirements: MISSING, PROPOSED, ACCEPTED, REJECTED, NEEDS_UPDATE; shared template remains immutable per version.
- Pack creation allowed only after current required evidence/authority reviewed. Material evidence/template/form changes mark old pack superseded and invalidate approval.
- Manual handoff consumes an approved export/handoff record; platform records user/operator submission later with receipt. It cannot guarantee what a user does outside the product and must not say it submitted the claim.
- Outcomes SETTLED/TRANSFERRED require institution-attributed evidence; PARTIALLY_SETTLED stores accepted settled amount and known/unknown remainder; unresolved work remains open.
- CLOSED case requires reviewed summary, no executing work and explicit acknowledgment of unresolved items. Reopening appends reason/evidence.
- Hold scope can block retrieval/export/submission/release without destroying records. Only authorized resolution with reason/evidence removes it.
- Deletion request immediately revokes access and cancels queued jobs; purge and processor/backup outcomes are separately tracked.

Templates in fixtures are explicitly demonstration procedures, not official forms or legally complete requirements. An institution-specific live template needs D-10 validation before real use.

## 11. What the assistant receives, returns and may do

Case manager input: actor/case/mode, reviewed fact references, allowed actions, open tasks, policy version and current user message. Output: response text, cited evidence IDs, uncertainty flags, proposed questions and typed proposed actions. Persist output/model or rule version before showing completion. No chain-of-thought logging.

RuleBasedCaseManager handles intent confirmation, missing prerequisites, next task, extraction review, inventory gaps, legacy preparation, known-asset claims and help routing. It never invents a holding, requirement or completed task. FixtureExtractionAdapter returns fixture-linked proposals by document ID/hash. Unknown source does not produce fabricated extraction; it produces manual-review/help state.

Adapters expose typed schemas for ConversationProvider, ExtractionProvider, Scanner, Storage and SourceConnector. Future external AI is not enabled without approved provider terms and credentials. Every model/tool response is untrusted and revalidated. Actor/case/role/recipient scope cannot be model-controlled. SourceConnector implementations other than the synthetic fixture source are disabled in reference mode.

## 12. Sample records and their expected results

fixtures.json is seed input, not customer data. Bootstrap renders its synthetic document descriptions into deterministic PDFs, computes SHA-256, registers the allowlisted document IDs/hashes and seeds personas/cases/requirements. Never pretend the JSON itself is a PDF or predeclare an uncomputed binary hash.

Expected reference inventory: one reviewed bank balance INR 42,000 and one reviewed mutual fund value INR 2,500, both within 30 days of fixture clock, yield eligible total INR 44,500. Historical FD principal INR 100,000, potential-name match INR 999,999, duplicate bank record and unknown-date holding are excluded with reasons. Units are not summed as currency. Newer contradictory ownership evidence blocks that holding until review.

Fixtures also include missing/expired authority, revoked consent, unsafe/unreadable document, competing claimant hold, stale template, changed pack, possible-acceptance timeout, partial settlement INR 1,000 of an evidenced INR 2,500 claim and unknown remainder variant. Known remainder is INR 1,500; never infer zero when outcome source gives no remaining figure.


</details>

## 13. Ordered coding work packages

Each B number is a piece of implementation, not a separate product. Build and test a small working journey as these pieces come together. “Depends on” identifies work that must already exist. “Completion evidence” describes what must actually work before the package is considered done. B-01 means starting the local components safely; it is not a finished user journey.


| ID | Implement | Depends on | Completion evidence |
| --- | --- | --- | --- |
| B-01 | Create the web/API/worker folders and local Docker setup; lock dependency versions; reject unsafe configuration; make health checks and basic CI run | This baseline | Local services start; startup rejects unsafe mode; no cloud credentials needed |
| B-02 | Create the database from the SQL contract; connect through restricted roles; save changes and pending jobs together; implement version checks, audit and safe request retries | B-01 | Fresh DB migrates/seeds twice safely; isolation/version/retry tests |
| B-03 | Connect sign-in; keep sessions server-side; create isolated cases; check case membership, verification, consent and holds on every action | B-02 | Cross-case/revoked/expired/unassigned cases denied; known-asset routing |
| B-04 | Generate the sample PDFs; register their hashes; upload, encrypt and scan them; show cited field proposals and record accept/correct/reject reviews | B-02/03 | Upload stages, unsafe/unknown hash rejection, cited fields/corrections and cancellation |
| B-05 | Save reviewed holdings and dated values; show discovery steps; review duplicates/conflicts; calculate totals and explain exclusions | B-04 | INR 44,500 oracle and exclusions; no-result/partial/conflict/merge-reversal cases |
| B-06 | Build the text assistant and saved conversations; show proposed action cards and owned tasks; recover from failure without duplicate actions | B-03/05 | Resume/correct/failure/help paths without duplicate actions or invented facts |
| B-07 | Build the legacy checklist, inert trusted-contact instructions, dated snapshots, preview and approved export | B-05/06 | Dated scope/gaps; no contact disclosure; download expiry/audit |
| B-08 | Build claims from known holdings; review requirements; generate packs; approve exact handoffs; record manual receipts, requests and partial/unknown outcomes | B-03/04/05 | Known-asset claim, invalidation, unknown outcome and remainder tests |
| B-09 | Build assigned operator queues, help/complaints, due dates, in-app reminders and the ability to stop an unsafe workflow | B-06/08 | Assignment and hold restrictions; idempotent in-app reminders |
| B-10 | Remove eligible records through the deletion process; preserve deletion markers; test recovery; finish accessible desktop/mobile behavior and redacted measurements | B-01–09 | Deletion/restore/outage, accessibility and metric privacy evidence |
| B-11 | Run every first-release journey and required failure case; record results and defects; confirm future capabilities are disabled; prepare a reproducible handoff | B-01–10 | All P requirement/scenario results recorded; F disabled; no critical unresolved defect |

Each package maps to the requirement IDs in PRD requirement rows and this guide; it may refine internal code without inventing scope. Start B-01 now. Source-provider contracts, legally sufficient real-data policies, commercial terms and F enablement are not prerequisites to coding this reference release.

## 14. Definition of coding completion

A new developer can clone, bootstrap, run, exercise all three synthetic journeys, run checks/tests and inspect attributable evidence without cloud credentials or hidden manual database edits. All P normal/failure/revocation/hold/deletion cases have recorded results. OpenAPI, migrations, fixtures, generated client types and implementation agree; CI rejects drift. F capabilities return explicit disabled state. Reference behavior is labeled everywhere and cannot be promoted to real data by changing one unchecked flag.

Live launch remains a separate permission/policy/operational acceptance decision. Documentation is coding-ready when these contracts are internally consistent; it is not proof that code, security testing, legal approval or integrations already exist.

<details>
<summary><strong>Exact command rules, first-journey checks and edge cases</strong></summary>

## 15. Exact implementation rules

- Header If-Match is a quoted positive integer ETag, for example \"3\". Server returns ETag with mutable resources; command routes require it where marked in OpenAPI.
- Upload/download URLs remain same-origin authenticated endpoints. Upload-Token/Access-Token capabilities are separate short-lived headers, not secrets in query strings; persist only token hashes. Capabilities expire after 5 minutes and bind actor/case/object/version/purpose.
- Encryption uses a vetted AESGCM implementation with random 96-bit nonce per write, 256-bit key and authenticated context containing case/object/field. Stored envelope includes version/key ID/nonce/ciphertext; keys remain outside the database. Never implement the cipher manually.
- Runtime login inherits fl_app only. Dispatcher inherits fl_dispatch for job/outbox metadata, not customer evidence. Configuration-review commands use fl_control only after application role checks and write configuration_audit. Purge uses fl_purge, checks accepted retention/hold policy first, sets actor/case context and records minimal completion/tombstone evidence outside purged case data. Migration-owner credentials never serve requests.
- Evidence arrays and polymorphic scope IDs require application same-case validation before commit; relational FKs cover concrete links. A row-level case selector is defense in depth; it is not proof of current membership/authority.
- Store only accepted observations/outcomes in their append-only tables. Unreviewed reported outcomes are field proposals/review tasks until authorized review creates an outcome; corrections append superseding rows.
- Negative balances can be recorded as source observations but are excluded from positive asset totals with an explicit reason; the product does not implement debt recovery.
- DiscoveryPlan and immutable LegacySnapshot records persist the reviewed plan/snapshot; an export cannot rebuild silently from changed current assets. AccessCapability records bind upload/view/download authorization without exposing storage paths.

Reference auth is closed to seeded personas: resolve validated issuer/subject through the restricted identity lookup; unknown identity returns ACTOR_NOT_REGISTERED. Self-registration is not included. case_members.display_label is a case-scoped safe label, avoiding a broad user-directory read. Production provisioning/recovery policy is a deployment gate, not permission to expose all users.

Upload capabilities bind one document/hash and may retry identical bytes until completion/expiry; completion consumes the upload session. Access capabilities bind authorized actor/object/version and short expiry; each successful read is audited. Never leak capability tokens into logs/referrers/URLs.

Reference load acceptance uses 4 CPU cores, 8 GB RAM, loopback Compose, 5 concurrent synthetic users, 20 cases and 200 holdings; record machine/container versions and scanner/model mode. Check 10 ordinary API requests/second for 5 minutes, zero authorization/integrity failures, p95 ordinary requests under 1 second, acknowledgement under 2 seconds, and clean 20-page synthetic extraction/review-proposal job under 2 minutes. Monthly availability is an operational metric after deployment, not something a local test can certify. Browser acceptance sizes: 1280×800 and 375×812, keyboard-only core paths, screen-reader spot checks and zero unresolved critical/serious automated accessibility violations. These are reference engineering acceptance targets; no production SLA is inferred.

Summary exclusion precedence is fixed in fixtures.json: potential match, duplicate, held, conflict, unknown date, historical (>365 days), stale (>30 days), unreviewed/unverified, negative balance, unsupported amount type. Evaluate each holding’s latest qualifying observation; list an asset once in exclusions only if it has no eligible selected observation. A reference synthetic institution source can attest a holding while its amount date remains unknown; that amount is still excluded.

Manual submission supports SUBMITTED with a receipt/reference or SUBMISSION_UNKNOWN with a user/operator reason and no invented receipt. The latter stores an unknown external action record and a reconciliation task; it does not invoke a connector or retry an outside submission. Verification and outcome proposals remain review tasks until an assigned reviewer accepts attributable evidence.

Mode correction uses PATCH /cases/{id}: self_discovery↔legacy is allowed for the same living owner, preserves evidence and rechecks purpose/consent; any material change invalidates dependent approvals. A deceased-claim mode is not converted into another person’s case. Subject correction is limited to a confirmed same-person display/relationship correction with reason and re-review; a different subject requires a new isolated case. Legacy fixture case 101 has its own cloned synthetic documents/evidence/holdings with new IDs; there are no cross-case evidence links.

## 16. Checks required before commands run

| Command/event | Resulting behavior |
| --- | --- |
| Review discovery plan | ACCEPT marks REVIEWED; REJECT supersedes draft. An attempt requires current reviewed plan, selected source/method and current permissions |
| Review legacy | Persist immutable LegacySnapshot from current reviewed versions, acknowledged gaps and policy; update reviewed_at/snapshot version; later edits require a new review |
| Create claim | Optional selected authority may be null; state AUTHORITY_REVIEW until a current scoped authority is attached |
| Attach claim authority | Validate same case/subject/institution/action and current review; move unsubmitted claim to DOCUMENT_COLLECTION |
| Accept all required claim items | If authority current, mark PACK_REVIEW; missing/stale item keeps collection/review task |
| Pack generated | Immutable reviewed inputs/bytes/manifest; claim remains PACK_REVIEW until exact user handoff approval |
| Approve exact handoff | Claim becomes READY_FOR_SUBMISSION; approved download is preparation, never platform submission |
| Record manual receipt | SUBMITTED only with receipt/reference; unknown attempted delivery becomes SUBMISSION_UNKNOWN and reconciliation task. reconciles_action_id binds any later receipt to the original unknown action |
| Institution request/outcome | Accepted attributable evidence can move SUBMITTED through INSTITUTION_REVIEW into additional-document or outcome state atomically; do not wait on an undefined status endpoint |
| Evidence or authority changes | Invalidate affected pending packs/approvals and restrict next actions; do not erase an already-submitted claim’s history/status |
| Support update | Assigned operator records ASSIGNED/WAITING/RESOLVED/CLOSED with reason/evidence; no unassigned case access |

Reference member edits may assign/revoke a configured staff OPERATOR only after service role checks. They cannot transfer OWNER, add another claimant or bypass disabled COLLABORATOR/RECIPIENT capabilities. Account ownership transfer is not an implementation shortcut.

Database connection variables are distinct: DATABASE_URL (fl_app login), DISPATCH_DATABASE_URL (fl_dispatch), CONTROL_DATABASE_URL (fl_control), PURGE_DATABASE_URL (fl_purge), MIGRATION_DATABASE_URL (bootstrap/migrations only). Generate separate local login secrets, grant no schema ownership/BYPASSRLS and keep privileged connections out of ordinary request handlers. Control/purge commands require their application-level reviewer/retention authorization before using those roles. OIDC reference client IDs are financial-legacy-web (BFF) and financial-legacy-api (audience); realm is financial-legacy-reference.

Job registry is closed: SCAN_DOCUMENT, EXTRACT_DOCUMENT, CASE_MANAGER_RESPONSE, RUN_SYNTHETIC_DISCOVERY, GENERATE_PACK, GENERATE_EXPORT, RECONCILE_SUBMISSION, SEND_IN_APP_REMINDER, EVALUATE_EXPIRY and PURGE_CASE. Each declares aggregate type, allowed initiating action, terminal states, cancellation checks and safe-retry class in code. No arbitrary job type, shell, URL or connector execution from a model/client. EVALUATE_EXPIRY changes derived permission/action availability, never destroys claim/evidence history.

Rule-based case-manager priority is deterministic: unsupported/risky request→help; unconfirmed intent→confirm route; missing scoped verification/consent→explain prerequisite; pending critical fields→review; blocking task/hold→explain owner and next step; otherwise offer the next path milestone. It cites evidence/task IDs, asks at most one main question per turn and never asserts a missing holding or invented institution rule. Example safe copy: “This record is a possible match; please review the source before we add it as a holding.” “This statement is historical, so its amount is excluded from the dated-value total.” “We don’t have a confirmed submission receipt yet; we’ll track this as unknown until it is checked.”

For reference correctness, serialize case-bound writes with a case-row lock and recheck guards after acquiring it. Update the relevant aggregate version when dependencies change. Inventory/snapshot reads use one consistent transaction/view; snapshot/export manifests freeze all dependent record versions. Never keep the case lock open during network/scanner/model I/O. Recheck policy when a job resumes and before authorizing access.

Unexpected server errors return the shared INTERNAL_ERROR envelope with request ID and no financial/stack details; record only redacted diagnostics. Apply the production/real-data gate to the entire binary/configuration, not merely the UI or a connector flag. The first reference build must not accept real uploads or real-source/provider calls by toggling an environment variable alone.


## 17. First journey, role rules and edge cases

Use the synthetic policy and exact contracts below. Real-data and later-feature gates remain in PRD section 17.

Reserved F tables may stay empty; F routes return disabled state without building voice, sharing, release or connector internals. Case isolation, review, encryption and audit apply from the first slice. All P behavior and all three paths still gate completion.

### First executable journey: owner → statement → reviewed inventory

Use fixtures.json intake profile in a fresh disposable database at the fixture clock. It seeds personas/cases/configuration and the generated hash registry, but no pre-reviewed domain records. Default reviewed profile remains the INR 44,500 oracle. Profile selection is explicit; seed never overwrites an edited database.

| Step | Action | Observable acceptance |
| --- | --- | --- |
| 1 | Demo Owner signs in and opens case ending 100 | Subject/mode/synthetic banner visible; empty inventory shows no reviewed value available, total=null |
| 2 | Upload owner-identity fixture ending 330, review fields, request IDENTITY verification and grant scoped consent | Upload/intake permitted before verification. Assigned Demo Reviewer accepts the resulting same-case evidence with rationale; distinct verification/consent records, no real verification claim |
| 3 | Upload generated bank fixture document ending 300 | Upload → quarantine/scan → field proposals; unknown hash and unsafe fixture blocked; retry creates no duplicate |
| 4 | Inspect citations and accept/correct critical fields | Source page, ownership, reference, source type, amount/type/date reviewed explicitly; no monetary observation before review |
| 5 | Commit reviewed bank holding | Exactly one qualifying bank holding; total=42000.00, summary_state=AVAILABLE, dated source shown |
| 6 | Sign out, resume, then retry original mutation | Accepted facts persist; same idempotency key returns original result; unrelated persona receives non-enumerating denial |
| 7 | Add/review fund fixture and exercise exclusions in separate reviewed-profile test | Total=44500.00; historical/potential/duplicate/undated records excluded; no complete-discovery assertion |

Do not satisfy this journey by displaying seeded accepted records or hard-coded totals. Screens call domain commands and persisted evidence; fixture extraction supplies proposals only. Authentication and authority evidence intake must work before verification is complete, or onboarding deadlocks. Permit case creation, own-case prerequisite upload/review, consent and help under membership; gate financial retrieval/disclosure/claim actions separately.

### Explicit role and command rules

All actions require current actor, accessible case, object scope, supported mode, version/idempotency rules and applicable holds. The OpenAPI policy metadata is a summary; enforce this matrix in a single deterministic policy service.

| Action | Authorized reference actor and rule |
| --- | --- |
| Declare/upload/correct fields, inspect own evidence, propose inventory/claims | OWNER/CLAIMANT or assigned OPERATOR within action scope; a declaration alone cannot verify institution provenance |
| Accept identity/relationship/authority, institution claim requirements or outcomes; create/resolve fraud/dispute hold | Assigned OPERATOR only, attributable evidence and rationale; no AI or client verified flag |
| Approve exact handoff/export or request deletion | Case OWNER/CLAIMANT, recent authentication and current scoped prerequisites; OPERATOR cannot approve on their behalf |
| Assign/revoke staff | Case OWNER/CLAIMANT may select configured reference OPERATOR; no ownership transfer, new claimant or F recipient access |
| Change shared source/template configuration | WORKFLOW_REVIEWER service entitlement and configuration audit; not inferred from OPERATOR membership |
| Run worker/purge | Closed job registry/service role, initiating context and execution-time checks; purge has separate lifecycle credentials |

Owner field review confirms what a document says. Institution-verified support additionally requires accepted attributable institution evidence and an assigned reviewer; never derive it solely from owner assertion or AI confidence. Rejection/correction invalidates dependent pending approvals. Existing submitted history remains intact. No emergency-access UI or universal administrator bypass is part of reference scope.

### Contract clarifications engineers must use

- Empty/unqualified inventory: total=null, summary_state=NO_ELIGIBLE_VALUES, included_asset_ids=[]; show excluded values/reasons separately. An evidenced qualifying zero uses total=0.00 and AVAILABLE with at least one included holding. These totals describe reviewed coverage, never all wealth.
- Select one latest qualifying monetary observation per holding across CASH_BALANCE/CURRENT_VALUE; never count both representations of one holding. Units remain separate. Conflicting observations hold that holding for review.
- Observation proposal route returns the primary amount FieldProposal; it creates a fixed group of scalar proposals with field_path observation:{asset_id}:{draft_id}:{field}. Allowed fields are evidence_id, amount, currency, amount_type, units and as_of_date; create every field, including explicit nulls. Each value is encrypted independently in field_proposals.value_ciphertext. Existing listFieldProposals exposes siblings; no new table or opaque JSON-in-string format is needed. The server creates draft_id and sets group context; clients cannot substitute asset/case/evidence scope through field_path. All six fields and associated critical ownership/source reviews must be resolved before an atomic commit creates Observation id=draft_id. A rejected sibling blocks the group. Corrections append superseding proposals within the same group; stale/conflicting corrections require re-review. A case-row lock and unique observation ID prevent double commit; repeated review returns the existing result. Never insert an accepted Observation early.
- Evidence is created by controlled intake/declaration/fixture-source commands, not a client-supplied accepted flag. New uploads produce proposed source evidence; review finalizes its associations. Accepting a claim requirement/outcome does not let an operator invent institution provenance.
- Document scan_state and processing_state are separate canonical fields. Section 18's linear diagram is conceptual; a scan failure does not equal an extraction failure. Exact routes and enums come from OpenAPI/SQL.
- Pack generation precedes approval. A CLAIM_HANDOFF approval binds pack, institution recipient and MANUAL_HANDOFF; controlled pack retrieval uses a CLAIM_PACK export referencing that approval. A legacy EXPORT approval binds the reviewed snapshot, requesting actor and APP_EXPORT. Operator download must be in that approved handoff scope. Creating/generating a pack never itself authorizes download or submission.
- Missing If-Match on a marked command returns 422 PRECONDITION_REQUIRED; stale value returns 409 VERSION_CONFLICT. Failed authorization never returns a cached idempotent result.

Retention request EXPORT follows the existing scoped export workflow and does not revoke access. Only DELETE triggers access revocation/cancellation and the policy-controlled purge.

Dependency compatibility, SQL execution, isolation, accessibility, security and journey tests must be run during implementation; no runtime result is implied by this document.

</details>

<details>
<summary><strong>Workflow state changes and release test checklist — engineering reference</strong></summary>

## 18. Workflow states and release checks

PRD requirement rows are the acceptance authority; OpenAPI and SQL are the exact wire/database formats. The state table describes logical workflow steps; document scan_state and processing_state are separate fields, as section 17 explains.

### Allowed workflow moves

A state tells us where a record is now. A transition is a permitted move to another state. A guard is the check required before that move. For example, a document cannot move into extraction until scanning passed. A claim cannot become ready for handoff until its current pack and permissions have been reviewed. The arrows below show possible moves, not steps the app can skip.

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


### Keeping linked records correct and changing the database safely

- Composite foreign keys include case_id for all evidence/asset/document/claim relationships. Check that subject belongs to case. Resolve Case/Subject creation with a transaction and deferred FK or insert/update order.
- Unique active membership and idempotency constraints; unique external receipt/event keys within a provider; unique pack version per claim. Do not impose global uniqueness on names or ownership references.
- Index (case_id, status, updated_at), (case_id, asset_id, as_of_date), (assignee, state, due_at), (claim_id, version), (provider_id, external_reference) and outbox/queue dispatch state as needed. Encrypt sensitive query values and use approved scoped matching keys.
- Preserve accepted evidence/observations and approved manifests; corrections append a superseding record. Mutable resources require If-Match/version checking; stale edits return a safe conflict.
- Apply backward-compatible migrations before dependent workers; retain schema/model/workflow versions needed to read old records. Never migrate a potential match into verified status without evidence review.


### Complete journeys to test

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

### Record evidence and decide whether the release passes

Record test/scenario ID, PRD IDs, PRD/build-guide version and Git commit, P/F scope, fixture/environment, expected/actual result, automated/manual steps, reviewer/date, defect IDs and decision. Protect test artifacts containing sensitive data under approved policy; keep synthetic evidence in repo.

A pilot requires all P rows, section 4 packs A–G, accepted blocking decisions and named operators. No unresolved critical authorization, disclosure, evidence-integrity or duplicate-execution defect is acceptable. Mark failed/blocked tests honestly; a test plan is not a passing test.

F needs pack H plus each language/category/source/subject/channel/release-specific gate. D-01 sets business targets; D-07 sets workload and service budgets; D-09 sets voice/language evaluation thresholds. Undefined thresholds are unresolved decisions, not default passes.


### First-increment negative cases and fixture checks

Execute LLD section 17 with the explicit intake fixture profile; the reviewed profile is a separate regression oracle. Require a real upload/scan/proposal/review/commit/resume path, not a prepopulated success screen. Record the Git commit, fixture profile/clock, generated binary hashes, actor, expected/actual result and failure evidence.

Required negative cases: prerequisite upload works before verification; non-reviewer cannot verify authority or accept institution outcome; assigned operator cannot approve a user disclosure; expired/revoked scope blocks download and queued work; changed pack invalidates approval; unknown file is rejected; observation proposal cannot become accepted before all critical fields are reviewed; same holding is not summed twice; empty inventory is null and an evidenced eligible zero is 0.00.


Fixture-integrity checks for B-02/B-04: every seeded holding reference and locator match its same-case statement; every extraction field exists at the cited generated page; owner case 100 can complete identity review using document 330 without case-102 evidence. An observation draft commits only after all scalar siblings and critical source/ownership reviews resolve; rejecting one sibling blocks it, corrections preserve history, and duplicate final-review delivery creates exactly one observation. Regenerated PDF hashes must replace the registry when source text changes.

Use the PRD requirement IDs on every implementation task, API/job/schema change and relevant test. A task states the behavior, permissions/data, failure/revocation/retry rules, dependencies and expected result. A PR records measured results, defects and migration/recovery impact. Amend the PRD before new product behavior; keep requirement IDs stable.

Before real deployment, keep runbooks for provider outage, unauthorized access, leaked credentials, wrong evidence association, unsafe templates, unknown submission, deletion failure and restoration. Before enabling an outside connector, validate its permitted subject/purpose/channel, source coverage, contracts, retention, callback verification, replay handling, recipient/egress allowlists and reconciliation behavior. Reference mode enables none of these real external effects.

</details>

Live-source implementation must apply the evidence and unresolved access limits in PRD section 6, not infer permission from an official URL. Each live-source adapter starts disabled; current source/subject/channel approval, scoped data/retention, workflow version, exact-action control and sandbox evidence precede enablement. The one-pager summarizes the vision, PRD owns behavior, DESIGN.md specifies presentation, and this LLD owns implementation/testing instructions.
