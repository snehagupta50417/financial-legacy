# Financial Legacy — Product Requirements

**Find what’s yours. Make sure nothing gets left behind.**

Version 0.3 · 15 October 2026 · Coding baseline for the synthetic reference release; real-data/F launch gates remain explicit

Product owner: founder, named owner TBD · Engineering owner: TBD · Claims operations and qualified legal/privacy reviewers: TBD

## How to read this document

Read sections 1–6 for the product, sections 7–13 for behavior, and sections 14–18 for quality, delivery and decisions. This PRD defines the full product vision and the first release. The [architecture overview](ARCHITECTURE.md) explains system boundaries, the [LLD](LLD.md) specifies implementation, the [acceptance plan](ACCEPTANCE.md) maps every requirement to evidence, and the [roadmap](ROADMAP.md) sequences existing scope. [Contribution rules](CONTRIBUTING.md) govern future changes.

**Scope authority:** Every feature, screen, API, agent tool, integration, background job, operational capability and material behavior change must trace to a requirement in this PRD. Neither the LLD nor a ticket can introduce product scope. If a behavior is missing, amend this PRD and obtain product-owner acceptance before implementing it. An unresolved decision is a blocker for the affected capability, not permission to invent an answer. Implementation details may be chosen within an existing requirement when they do not change user behavior, data use, permissions, supported sources or service commitments.

This revision preserves the founder’s three use cases and complete asset coverage, consolidates repeated source text and supplies explicit design proposals where the original brief stopped during feasibility. It is a specification, not a claim that the application or integrations exist. New product choices remain proposals until accepted; verified source descriptions do not establish our right to integrate.

## 1. Product in one minute

Financial Legacy is an AI-native case-management platform for financial asset discovery, legacy preparation and claims assistance in India. A person explains their situation in chat or voice. A persistent AI case manager gathers the right information, organizes evidence, proposes the next permitted step, coordinates approved work and tracks the case to a documented outcome.

The product has three independently usable paths:

| Path | User’s request | Product outcome |
| --- | --- | --- |
| Discover my assets | “I invested years ago and don’t remember where.” | A reviewed inventory, explicit possible matches and an honest list of gaps |
| Prepare my legacy | “Make sure my children know where my investments are.” | A dated financial record, preparation checklist and controlled sharing instructions |
| Discover or claim after a death | “My father passed away; help us find and claim his holdings.” | Authority-reviewed discovery and/or institution-specific claim cases with recorded outcomes |

A claimant who knows the asset can begin directly with claims. A discovery user need not buy or complete a legacy or recovery workflow. A planner can use the inventory without sharing it immediately.

The assistant is the primary interaction. Structured inventory, evidence review, documents, tasks and claims views support inspection and decisions; users do not have to navigate a dashboard to start.

## 2. Problem, value and boundaries

People accumulate accounts, deposits, investments, insurance and retirement benefits across institutions. Changes in work, location and contact details, missing records and incomplete nomination information can make these holdings difficult to find. Families then face separate discovery and recovery problems after a death.

The value proposition is coordinated assistance: one case record, fewer repeated questions, traceable evidence, clear next actions and continuity through follow-ups. We do not claim that one source can find every asset or that every claim can be settled.

### Outcomes we own

- An understandable, evidence-linked inventory and visible discovery coverage.
- Correctly assembled records and reviewed claim packs within supported workflows.
- Explicit permissions, approvals, handoffs, reminders and outcome records.
- Transparent distinction between platform work, user work and institutional decisions.

### Outcomes we do not promise or perform

- Determining legal inheritance, resolving a disputed estate, guaranteeing ownership or guaranteeing settlement.
- Exhaustive discovery, real-time balances where unavailable, or universal financial API access.
- Holding/transferring funds, trading, investment recommendations, tax advice or legally operative will drafting/execution.
- Changing nominees, beneficiaries or institutional account details on the user’s behalf under this baseline. We identify gaps and guide a permitted process; executing such changes needs a PRD amendment.
- Obtaining passwords/OTPs for third-party financial accounts, bypassing verification or restricted access, or silently scraping institutions.
- Inferring a death from inactivity and automatically transferring assets or releasing documents.
- Real estate, physical valuables, cryptoassets, debts, business ownership and foreign assets under this baseline. Add them explicitly through scope change if wanted.

Pricing, billing, commissions and payment collection are undecided and are not implementation scope. The platform remains assistance and workflow software; its exact operating model and permitted professional-service boundaries require a decision before launch.

## 3. Users, roles and definitions

| Role | Allowed product responsibility | Boundary |
| --- | --- | --- |
| Asset owner / planner | Manage own case, evidence, permissions and legacy instructions | Cannot authorize access to unrelated people’s information |
| Claimant | Request discovery/claims for a deceased subject | Identity, relationship and action-specific authority are separately reviewed |
| Authorized collaborator | Help within an explicit case/document/action scope | No access merely because they are family |
| Trusted contact | Intended future recipient or contact chosen by planner | Recording a contact creates no vault access or inheritance right |
| Assigned case operator | Review documents, requirements and exceptions in assigned cases | Cannot override entitlement, fabricate evidence or self-approve external disclosure |
| Workflow/integration reviewer | Maintain approved procedures and connector capabilities | Does not receive unrestricted customer-case access |
| Restricted support/security administrator | Resolve access and operational issues with audited, limited access | No default access to all financial documents |
| Institution / qualified external adviser | Decide institutional requirements/claims or provide professional help | External party; disclosure requires appropriate authority and approval |

**Case:** one user goal concerning one financial subject; several cases may exist per user. **Subject:** person whose financial information is involved. **Asset:** holding or potential holding. **Evidence:** attributable document, declaration or source record. **Claim:** institution-specific recovery/transmission process for an asset; a case can have many claims. **Nominee:** recorded nomination information; not treated as a universal legal entitlement decision. **Consent:** permission for defined data, purpose and recipient. **Authority:** action/source-specific basis to act for a subject. **Approval:** authorization of one exact external action after preview. These are separate records, not interchangeable checkboxes.

## 4. Full scope and release model

The implementation begins with the synthetic-only reference release in section 19 and BUILD_SPEC.md. It implements P behavior without claiming real verification, discovery, AI quality or institutional submission. P remains the first real-data pilot target; promotion requires the relevant real-data gates.

P = first pilot. F = full-product scope after its release gate; not a pilot commitment. F capabilities remain in this PRD so they cannot disappear from the vision or be implemented without prerequisites. P/F timing, vendors and owners are proposals; dates are uncommitted.

| Capability | P: pilot | F: full product and required gate |
| --- | --- | --- |
| Conversation | Text, saved case context, adaptive questions | Voice and selected Indian languages after quality/accessibility evaluation |
| Identity/authority | Case-specific verification workflow, trained human review, restricted actions | Approved verification integrations and validated institution-specific automation |
| Discovery | Declarations, uploaded records, guided official enquiries | Permitted API/partner retrieval and refresh per source |
| Inventory | Bank/FD and mutual funds; evidence and dated observations | All asset classes in section 6 after separate workflow validation |
| Legacy | Checklist, reviewed record, export, contact intent, review reminders | Scoped lifetime sharing and controlled post-death release after policy validation |
| Claims | Reviewed templates/packs, user/operator submission, status and outcome tracking | Approved direct submission and permitted automated follow-ups |
| Access | Case owner/claimant and assigned operator | Explicitly invited collaborators/recipients after sharing controls pass |
| Notifications | In-app tasks and reminders | Opt-in minimal-content email/SMS/voice through approved channels |
| Clients | Responsive web with mobile support | Native mobile app only after its UX/device-security decision; same requirements |

A full-product capability is disabled until its specific access, legal, security, quality and operational gates are satisfied. A manual path must be labeled manual; a mock or prepared form cannot be presented as an institutional integration.

## 5. Complete user journeys

### 5.1 Discover my own holdings

1. User describes the goal and confirms the self-discovery path and financial subject.
2. Assistant asks what is known: institutions, asset classes, old documents and relevant identifying information, collecting only what the next permitted step needs.
3. User completes required verification and purpose-specific permissions.
4. User uploads/declares records or authorizes an enabled source. Assistant proposes a discovery plan with coverage and user actions.
5. Extraction produces evidence-linked fields for review. Potential matches remain separate from accepted holdings.
6. User/operator resolves ambiguous names, references, duplicate records and conflicting observations.
7. Inventory shows supported holdings, dated values, evidence state and unresolved investigations. User can add another source, prepare a legacy, or finish discovery.

Done means a reviewed snapshot with clear coverage and open items, never “we found everything.” No results means no results from the sources actually checked, not proof that no asset exists.

### 5.2 Prepare a financial legacy

1. User starts a planner case or continues from an inventory.
2. Assistant organizes holdings, document locations, institution contacts and nomination information; unknowns stay visible.
3. Checklist identifies missing evidence, missing/uncertain nomination information, stale records and follow-up tasks. It does not certify a will or legal sufficiency.
4. User reviews a dated legacy record, adds trusted-contact intent and defines the information they wish to share and when.
5. Pilot permits a user-requested, scoped export and secure in-product storage. It does not automatically invite or email contacts.
6. Full product allows a verified recipient to receive only an explicitly approved scope, with access expiry/revocation and access history. Post-death release uses the separate gated workflow in section 11.
7. User can update records, replace contacts, revoke future sharing and review on reminders. Exports remain snapshots; previously downloaded copies cannot be remotely recalled.

Done means the selected preparation checklist is reviewed, the snapshot is dated and unresolved gaps are acknowledged. Ongoing review remains possible.

### 5.3 Discover and claim after a death

1. Claimant identifies the deceased subject and whether assets are known. The assistant uses empathetic language and avoids repeatedly asking about the death.
2. Identity, relationship, death evidence and source/action-specific authority are collected through approved procedures. Possible documents include death evidence, nomination records and relevant legal documents; exact requirements come from the reviewed institutional workflow, not a universal AI checklist.
3. For unknown holdings, plan and conduct only permitted discovery. For known holdings, skip directly to the claim checklist.
4. Create a separate claim for each institution/asset process. Show requirements, what is missing and any verification/dispute hold.
5. Assemble a versioned pack; user inspects fields, documents, recipient, declarations and consequences. Changes require fresh approval.
6. Submit manually in the pilot; capture the external reference and receipt. Direct submission is allowed only through an enabled full-product connector.
7. Track institution requests, additional evidence, follow-ups and delays. Any uncertain submission is reconciled before a retry.
8. Record settlement, transfer, rejection or unresolved dispute with evidence, dates and any amount/type. Partial settlement leaves a tracked remainder. User reviews closure and outstanding items.

A match does not establish inheritance. Another claimant, disputed evidence, suspected fraud or a conflicting entitlement request triggers a hold and qualified escalation, not AI adjudication.

## 6. Asset coverage and discovery sources

All nine categories are in the full vision; each needs separate discovery and claims validation. The table describes candidate paths, not guaranteed access or institution-specific legal instructions.

| Category | Candidate evidence/discovery | Candidate recovery path | Release |
| --- | --- | --- | --- |
| Bank accounts and fixed deposits | User records, bank statements, bank enquiries, eligible UDGAM searches | Relevant bank’s deceased-depositor/settlement procedure | P, document-led |
| Mutual funds | CAS, AMC/RTA records, CAMS/KFintech, MITRA enquiries | AMC/RTA transmission/redemption procedure as applicable | P, document-led |
| Shares and demat holdings | CAS, broker/depository/company records | Relevant broker, depository or company transmission | F |
| Unclaimed dividends and shares | Company/RTA evidence and IEPF process | Relevant company verification and IEPF route | F |
| Life insurance | Policy, insurer records, supported unclaimed-amount enquiry | Insurer-specific claim | F |
| EPF and related benefits | EPFO/member evidence and employment records | Applicable death/nominee benefit procedure | F |
| NPS | Pension/CRA records and statements | Applicable exit/death procedure | F |
| PPF and small savings | Bank/post-office records | Relevant institution’s settlement procedure | F |
| Bank lockers | Institution relationship/locker evidence | Relevant access process | F; no assumed contents or cash value |

### Minimum category-specific inventory fields

All categories retain institution, subject, masked reference, evidence state/source/date, nomination status, lifecycle status and next action. Missing data stays unknown; these fields are collected only when needed and permitted.

| Category | Additional fields to support | Display constraint |
| --- | --- | --- |
| Bank/FD | Account/deposit type, ownership/joint-holder evidence, branch where known, deposit maturity and dated balance | Deposit principal/maturity value and cash balance are distinct |
| Mutual funds | AMC/RTA, folio, scheme/plan/option, units and dated valuation where available | Units and valuation have separate evidence/as-of dates |
| Shares/demat | Broker/depository/issuer, masked demat or physical folio, security identifier, quantity and valuation date | Quantity is not money; physical and demat evidence must not double-count |
| Unclaimed dividends/shares | Company/RTA, dividend period or security quantity, transfer/reference evidence and claim stage | Dividend amount and share value are separate |
| Life insurance | Insurer, policy type/status, policy dates, documented nominee and benefit type | Sum assured is not current investment/cash value |
| EPF/benefits | Relevant member/employer reference, service evidence, benefit type and statement date | Balance and potential death/other benefits remain distinct |
| NPS | CRA/PRAN reference, account/tier or scheme evidence, units/value date and exit status | Do not infer payable entitlement from a statement value |
| PPF/small savings | Institution/branch, scheme/account type, opening/maturity dates and dated balance | Scheme-specific amounts/conditions stay attributable to source |
| Lockers | Institution/branch, masked locker reference and holder/nomination evidence | Contents and value remain unknown unless separately evidenced; excluded from cash totals |

### Source facts and access limits

- RBI’s [UDGAM FAQ](https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQonUDGAMPortal.pdf) describes eligible unclaimed-deposit searches; claims are made to the respective bank. It is not discovery of every active account. The FAQ’s bank counts are dated and are not adopted as current coverage.
- SEBI’s [12 February 2025 MITRA circular](https://www.sebi.gov.in/sebi_data/attachdocs/feb-2025/1739356741378.pdf) describes tracing inactive/unclaimed mutual fund folios, including cases not appearing in a consolidated statement. It does not grant this startup an API or claimant authority.
- [DigiLocker’s implementation model](https://www.digilocker.gov.in/web/implementation-model) describes partner/API onboarding for supported documents. Integration, available issuers and permissions must be validated.
- RBI’s [Account Aggregator information](https://rbikehtahai.rbi.org.in/AccountAggregatorFacility.html) describes consent-based financial information sharing. Our eligible role/partner, scope, retention and deceased-subject applicability remain unresolved.
- The [IEPF claim FAQ](https://iepf.gov.in/IEPF/pdf/FAQsIEPF5.pdf) is a background process reference. Current forms, rules and institutional requirements must be revalidated before a live workflow; historical process dates are not service commitments.

References checked 15 October 2026 for planning context. They are not a completed legal review or integration validation. Every enabled source must record coverage, supported subject types, permitted method, authority/consent requirements, data fields, freshness, costs/limits, contractual approval, retention, review date and responsible reviewer.

## 7. Experience and information architecture

| Surface | What a first-time user can see/do | Required non-happy states |
| --- | --- | --- |
| Start and case selection | Explain goal, choose/confirm path, resume or create another case | Unsupported goal; mistaken path; no cases |
| Conversation | Ask/answer, attach evidence, see proposed next action and case context | Processing; failed response; uncertainty; human handoff |
| Verification and permissions | Understand who/what/why, submit required evidence, review and revoke permissions | Pending; expired; rejected; disputed; missing requirement |
| Documents and review | Upload, inspect source, accept/correct/reject extracted fields | Unsafe/unreadable file; low confidence; password-protected file; retry |
| Discovery plan | Sources considered, checked, blocked and not covered; next user action | No result; unavailable source; insufficient authority; incomplete search |
| Asset inventory/detail | Evidence status, institution, masked reference, dated observations, nomination and next action | Potential match; conflicting evidence; stale/missing amount; duplicates |
| Legacy record | Checklist, contact intent, snapshot/export; gated sharing/release | Missing documents; stale record; revoked access; release/dispute hold |
| Claim workspace | Requirements, pack preview, approval, receipt, timeline and outstanding requests | Unsupported template; uncertain submission; partial outcome; rejection/dispute |
| Tasks and activity | Owner, due date, blocked reason, status and history | Overdue; waiting on user/institution; cancelled task |
| Case access and privacy | Members, permission history, exports, retention/deletion request | Unverified invite; revoked member; legal hold |
| Operator workspace | Assigned queues, evidence review, escalation and workflow/source review | No assignment; restricted scope; stale template; fraud/dispute hold |

Each surface has a clear title, plain-language state, next action and route to help. No sensitive document, declaration or sharing decision is approved solely by an ambiguous chat reply. The user can inspect the structured preview and correct information before consequential actions.

## 8. Functional requirements — case, authorization and documents

Each row is a testable requirement. P/F release labels follow section 4. Existing FL-01–FL-21 IDs retain their original capability meaning; added IDs make the full vision explicit.

| ID / release | Required behavior | Acceptance evidence |
| --- | --- | --- |
| FL-01 · P | Confirm self-discovery, legacy or deceased-claim intent; allow known-asset claims without discovery | Four journey entry paths work and user can correct the suggested route |
| FL-02 · P | Persist case facts, conversation, reviewed records and tasks; show corrections/history | Returning user resumes without re-upload/re-entry; a corrected fact is not replaced by an older AI summary |
| FL-22 · P | Support several isolated cases per user and one subject per case | Case switch clearly identifies subject; no evidence, chat or assets leak across cases; subject/mode correction rechecks permissions |
| FL-03 · P | Track identity, relationship and institution/action-specific authority separately | Pending/verified/rejected/expired states exist; missing authority blocks only the affected restricted action; reviewer/rationale recorded |
| FL-04 · P | Capture purpose/data/recipient/time-scoped consent and revocation | User sees a receipt; revocation blocks future retrieval and queued work; completed disclosures remain in history |
| FL-23 · P | Enforce owner, claimant and assigned-operator access; restricted admin support | Unauthorized IDs, document downloads, exports and background jobs are denied; operator reassignment removes old access |
| FL-24 · F | Invite verified collaborators with explicit case/document/action scope and expiry | Invite alone reveals no private data; recipient verification and owner approval precede access; revoke blocks future reads |
| FL-05 · P | Validate and scan secure uploads; show processing and retries | Unsupported/unsafe files never enter extraction; user can distinguish upload, scan, extraction and review failures |
| FL-06 · P | Propose extracted fields with document/page or source-record citations | All critical ownership/identifier/amount fields are reviewed; low confidence is visible; unsupported values remain unknown |
| FL-25 · P | Handle incomplete, unreadable, encrypted and conflicting records without invention | Ask for clearer/alternative evidence or a secure approved unlock route; never request passwords in chat; retain source and correction history |
| FL-26 · P | Let user inspect, correct or reject proposed fields and source associations | Accepted correction records actor/reason/version; dependent pack or approval is invalidated when material data changes |

## 9. Functional requirements — discovery and inventory

| ID / release | Required behavior | Acceptance evidence |
| --- | --- | --- |
| FL-10 · P | Explain a source plan based on subject, goal and available evidence; guide manual enquiries | Every step identifies coverage, permitted method, prerequisites and next owner; incomplete/no-result outcomes are not complete-discovery claims |
| FL-27 · F | Retrieve/refresh through a source-specific approved connector | Connector remains disabled until validated; unsupported deceased access is blocked; provenance, consent/authority and attempt outcome persist |
| FL-07 · P | Label holdings self-declared, potential match, document-backed or institution-verified | Name-only or model-confidence matches cannot become verified holdings; verified status requires reviewed attributable institution evidence |
| FL-08 · P | Review duplicates and conflicting identities/records before reconciliation | No automatic name-only merge; reviewed merge preserves aliases/evidence and can be reversed; conflicts remain visible |
| FL-09 · P | Show institution, category, masked reference, ownership evidence, dated amounts and next action | Source, amount type/currency/as-of date and freshness are inspectable; missing fields are unknown |
| FL-28 · P | Keep evidence history and current/historical observations distinct | New statement does not overwrite old evidence; withdrawal, closure or superseded record does not disappear from history |
| FL-29 · P | Aggregate only qualifying reviewed observations under an explicit policy | One selected qualifying monetary observation per holding; potential matches, historical-only/stale or unknown values and duplicates are excluded; currencies and incompatible value types stay separate. With no eligible observations, total is unknown/null, not an inferred zero |
| FL-30 · F | Support all asset categories in section 6 with category-specific fields and workflows | Each new class has an approved evidence schema, source coverage, amount semantics, claims checklist, fixtures and evaluation before enablement |

Evidence labels express support for a holding; they do not certify legal entitlement, present activity or recoverability. Nomination status is unknown, user-declared or document-supported, with date/source. It never implies the platform has changed institutional nomination records.

## 10. Functional requirements — legacy and controlled sharing

| ID / release | Required behavior | Acceptance evidence |
| --- | --- | --- |
| FL-11 · P | Prepare a dated financial record and checklist from reviewed inventory | User sees missing documents, unknown nominations, stale evidence and next actions; export records snapshot/date/scope and open gaps |
| FL-31 · P | Record trusted contacts and sharing intent; maintain planner updates/review reminders | No invite/access/disclosure occurs merely by adding a contact; changes and review dates are logged; no passwords stored |
| FL-32 · F | Allow explicit, verified, scoped lifetime sharing | User previews exact information/recipient; approval, recipient verification, access expiry/revocation and access history pass before release |
| FL-33 · F | Support controlled post-death release of a planner’s legacy record | Death evidence, recipient identity, case-specific authority and current instructions are reviewed; dispute/hold rules block release; no inactivity trigger or AI-only decision |
| FL-34 · P | Support user-requested, authorized exports and explain snapshot limits | Export is scoped/audited, accessible only through short-lived controlled access; user sees that downloaded copies cannot be recalled |

Post-death release is information sharing, not an asset transfer, legal will or entitlement ruling. Release evidence, recipient rights, who can approve, notification/contest steps and hold resolution must be decided in D-04 before FL-33 can ship.

## 11. Functional requirements — claims and recovery

| ID / release | Required behavior | Acceptance evidence |
| --- | --- | --- |
| FL-12 · P | Use institution/asset-specific versioned requirements and source review dates | Claim retains its template version; stale/missing/unsupported requirements trigger review, not an invented checklist |
| FL-13 · P | Assemble a reviewable claim pack from required/optional evidence and forms | Missing/rejected documents and claimant corrections are explicit; pack lists every document/version and declaration; user can inspect before use |
| FL-14 · P | Obtain approval for the exact external action/disclosure; prepare manual handoff in pilot | Recipient, channel, purpose, documents and declarations are previewed; changed content/scope, expiry or revoked authority invalidates approval |
| FL-35 · F | Execute approved direct submissions through enabled channels | Current policy and exact payload rechecked at execution; idempotency and receipt captured; unsupported channels remain manual |
| FL-15 · P | Track submission evidence, references, requests, deadlines and institution responses | Timeline distinguishes manual/automated activity and user/institution waiting time; outstanding requests create owned tasks |
| FL-36 · P | Reconcile uncertainty and prevent duplicate external actions | Timeout after possible acceptance is unknown, not safe-to-retry; no second submission until receipt/status is reconciled |
| FL-16 · P | Record evidenced settlement, transfer, rejection, partial outcome or unresolved dispute; review closure | Outcome has source/date/type; settled amount separated from historical value; partial remainder and unresolved claims stay tracked |
| FL-37 · P | Support new evidence, requests and reviewed reopening | New requirement updates the relevant claim/pack without silently changing all templates; reopening preserves prior outcomes and reasons |
| FL-17 · P | Provide human help for uncertainty, unsupported paths, complaints and disputes | User can request help; case has assignee, reason, next step and visible state; legal entitlement conflicts go to qualified external help, not an AI ruling |

Joint holders, multiple nominees/claimants, minors or guardians, representatives/executors, changed names, missing identity references, nonresident/foreign documentation and contested documents require a workflow explicitly supporting that situation. Until supported authority and institutional requirements are reviewed, affected actions are blocked and handed off. The assistant must explain what is known, what is missing and who can resolve it; it must not force the case into a standard nominee flow. No other claimant’s private evidence is revealed to resolve a dispute.

Each claim can progress independently. One bank rejection cannot reject an unrelated claim. Case closure requires a reviewed summary of completed claims, unresolved investigations and accepted outstanding items. The product never labels rejection, withdrawal or unresolved legal dispute as recovery success.

## 12. Functional requirements — AI, voice and operations

| ID / release | Required behavior | Acceptance evidence |
| --- | --- | --- |
| FL-38 · P | Case manager coordinates bounded discovery, extraction, reconciliation, legacy, claims and follow-up capabilities | Proposed actions use persisted facts and allowed tools; model cannot grant authority, change verified status or execute unapproved actions |
| FL-39 · P | Explain why information is requested, cite evidence/procedures and acknowledge uncertainty | Missing/contradictory evidence leads to a question or handoff; prompt injection in a document cannot grant tool access |
| FL-40 · P | Recover from model/source failure and maintain user control | Saved work survives; retries do not duplicate mutations; user sees manual next steps and can correct facts, cancel pending work or request help |
| FL-20 · F | Provide selected Indian-language voice/chat assistance with transcript correction and text fallback | Supported languages and quality are disclosed; names/numbers can be corrected; structured preview is required for consequential approval |
| FL-41 · F | Capture/use voice under a clear recording/processing policy | User knows microphone/recording state; can stop or use text; retention/provider policy approved; no covert recording |
| FL-21 · F | Conduct permitted, disclosed and authorized institutional follow-ups | Approved channel, purpose/recipient, current permission and log exist; unsupported automated calls are blocked; ambiguous responses route to review |
| FL-42 · P/F | Provide owned in-app tasks/reminders in P; opt-in external notifications in F | Respect channel/preferences/time zone; avoid duplicate reminders and sensitive previews; opt-out stops future optional messages |
| FL-43 · P | Provide assigned operator queues for authority, extraction, claims, disputes and overdue tasks | Operator can see priority/blocker/owner and perform only allowed review actions; privileged overrides require rationale and audit |
| FL-44 · P | Govern templates, sources and model/tool versions | Named reviewer approves versioned changes; stale/unsafe workflow can be suspended; in-flight cases retain history and re-review material changes |

“Agents” are bounded capabilities coordinated by one case manager; independent autonomous processes are not a product requirement. AI generates proposals and manages work, while deterministic services enforce permissions and state changes. It does not become the source of financial truth.

## 13. Functional requirements — privacy, safety and lifecycle

| ID / release | Required behavior | Acceptance evidence |
| --- | --- | --- |
| FL-18 · P | Audit sensitive access, modifications, review, sharing, approval, export and execution | Actor/time/case/object/reason/request reference present; no raw secrets or unnecessary financial content in ordinary logs |
| FL-19 · P | Publish and enforce retention, export and deletion policy | Deletion request revokes access/cancels work; live/derived/processor copies and backup expiry are tracked; justified holds have visible status |
| FL-45 · P | Protect data with strong authentication, encryption and least privilege | Cross-case isolation, short-lived access, session expiry, restricted keys and sensitive-action verification pass security testing |
| FL-46 · P | Limit processor/AI data to approved purpose and recipients | Provider terms, hosting/retention/subprocessors and minimal payload approved; real records never sent to an unapproved tool or development environment |
| FL-47 · P | Handle fraud, competing claimants and disputed evidence with a controlled hold | Restricted action stops; record who/what is disputed without exposing other claimants’ data; authorized reviewer/escalation resolves hold |
| FL-48 · P | Support account/session recovery, contact corrections and revocation safely | Recovery/change cannot bypass case authority; prior access removed as needed; sensitive changes logged and user-informed |
| FL-49 · P | Run a privacy-aware support/complaint process | Track ticket/case owner, response state and escalation; no document disclosure through ordinary support messages |

Retention periods, identity strength, authority evidence and legal requirements are approved policy decisions, not universal fixed rules guessed by AI. A document-backed asset remains separate from claimant entitlement. Consent cannot authorize actions a person has no authority to permit.

## 14. Quality, accessibility and service requirements

| ID / release | Required behavior | Pilot acceptance / unresolved target |
| --- | --- | --- |
| FL-50 · P | Accessible responsive web, readable language, keyboard/screen-reader support, large-text layouts and resumable tasks | Core journeys work on agreed desktop/mobile sizes; labels, focus, errors and accessible non-voice path tested; target WCAG 2.2 AA, final audit required |
| FL-51 · P | Durable processing with visible progress, bounded retries and reconciliation | Restart/retry tests preserve cases/evidence and do not duplicate submissions; outage shows what is saved/blocked and next step |
| FL-52 · P | Approved performance, capacity and recovery budgets | Suggested budgets: p95 ordinary API <1 s, chat acknowledgement <2 s, 20-page clean-document extraction <2 min; 99.5% monthly internal API availability; RPO 24 h/RTO 8 h. Workload/exclusions/cost and final targets require D-07 acceptance before pilot; these are not external SLAs |
| FL-53 · P | Evaluate extraction, AI decisions and workflow quality on representative cases | Critical identifiers/amounts/ownership reviewed independently; adversarial tests block unauthorized disclosure, false verification and tool misuse; language/voice has a separate gate |
| FL-54 · P | Collect minimal operational/product metrics with explicit definitions | Pseudonymous events, no document text/account identifiers/balances in analytics; segment waiting time and assisted/manual work honestly |
| FL-55 · P | Trace every deliverable and change to the PRD | Every feature/ticket/API/job/tool/test maps to IDs; undefined behavior blocks work; PRD amendment precedes new scope; LLD/roadmap updated in the same change |

No benchmark is met merely because it is written here. Engineering, operations and product owners must agree a workload and record measured evidence before accepting FL-52/53. Production credentials and customer records must not enter GitHub or synthetic development fixtures.

## 15. Business and measurement

### Product hypothesis

People will value a trusted case manager that reduces effort and uncertainty across fragmented asset and claims workflows. The first pilot should test usefulness, trust, operational effort and permitted source access before a broad automation claim or commercial promise.

### Measurement definitions

| Measure | Definition | Interpretation rule |
| --- | --- | --- |
| Activation | Cases reaching first reviewed useful artifact / eligible started cases | Report by path; define artifact as inventory, legacy record or claim checklist |
| Time to first reviewed artifact | Median/p90 from case start to review | Separate user-active time from institution/verification waiting |
| Evidence coverage | Reviewed assets with usable evidence / reviewed assets | Segment by status, age and asset class; not “all assets found” |
| Extraction quality | Correct fields / labeled fields on evaluation set | Report critical identifiers, ownership, amount/date separately |
| Claim-pack readiness | Packs institution accepts as complete at first review / reviewed packs | Segment by institution and template version |
| Claim outcome | Counts and time in state for settled/transferred/partial/rejected/unresolved | Report cohorts; no rejected/disputed case counted as recovery |
| User/operator effort | Active time and clarification/rework per milestone | Automation claims include human assistance honestly |
| Trust/safety | Unauthorized disclosures/submissions, false verification and complaints | Zero unauthorized actions in release acceptance tests; incidents block rollout until resolved |
| Sustainable service | Support and processing cost per reviewed artifact/case | Pricing and unit economics need founder decision; not a billing feature |

Numerical business targets and pricing are open under D-01/D-08. Do not fabricate market size, recovery rates, savings or revenue forecasts.

## 16. Release acceptance and traceability

The first pilot covers every P requirement. F requirements cannot be silently enabled; they need their listed gate and inclusion in a release scope. [LLD.md](LLD.md) maps modules/APIs/data/tests to these IDs. [ROADMAP.md](ROADMAP.md) may change sequencing but cannot expand scope.

Mandatory end-to-end scenarios:

1. Living owner uploads an old bank statement, corrects extraction, resolves a duplicate and sees a historical amount excluded from a current total.
2. Planner builds a legacy record with unknown nominations, adds contact intent, exports a dated snapshot and receives no accidental sharing.
3. Authorized claimant starts with a known mutual fund holding, skips discovery, reviews a pack, records a manual receipt and tracks an institution request/outcome.
4. Unknown-asset claimant gets a no-result/partial discovery plan without an assurance that no assets exist.
5. Unverified/competing claimant, revoked consent, cross-case document ID and prompt-injected upload cannot disclose information or execute an action.
6. Changed claim pack invalidates approval; possible-acceptance timeout triggers unknown/reconciliation; partial settlement leaves an outstanding balance/task.
7. Unsafe/unreadable file, stale workflow and failed model/source each produce a usable next step or handoff.
8. Deletion removes access and queued work, tracks derived copies/holds/backups; restore/recovery and incident procedures are exercised.

Release evidence includes requirement IDs, environment/data set, expected/actual outcome, reviewer and unresolved defects. No unresolved critical authorization, disclosure, evidence-integrity or duplicate-execution defect is acceptable. F additionally tests collaborators/lifetime sharing, release disputes, each language/voice mode, each asset class and each connector within its exact enabled scope.

## 17. Decisions that must not be guessed

For coding, the reference decisions in section 19 and BUILD_SPEC.md are fixed. The D decisions below now govern real-data deployment, commercial commitments or F expansion; they do not require another planning round before B-01. Synthetic-only defaults must never be treated as legally sufficient production policy.

This is the authoritative decision register. The roadmap references these IDs. Product-owner acceptance must update the affected requirements, not just a ticket.

| ID | Decision and accountable role | Blocks |
| --- | --- | --- |
| D-01 | Founder: pilot persona/institutions/formats, service boundaries and success targets | Pilot scope and customer promise |
| D-02 | Product + qualified reviewers: identity/relationship/authority evidence, review roles, expiry and sensitive-action strength | Restricted access and deceased workflows |
| D-03 | Integration + qualified reviewers: permitted roles/partners/contracts, exact API/channel and subject eligibility per source | Any live connector or automated follow-up |
| D-04 | Product + qualified reviewers: lifetime/post-death sharing, recipient verification, contest/notice/hold/release authority and contact changes | FL-24/32/33 and family disclosure |
| D-05 | Privacy/security: retention classes, processor/hosting terms, deletion/holds/backup expiry and approved provider data use | Real-data intake and lifecycle |
| D-06 | Product + operations: evidence freshness, verification rules, aggregate eligibility and per-category amount semantics | Trusted inventory display and new classes |
| D-07 | Engineering + operations: workload/capacity/cost, service targets, restore plan, support hours and case limits | Pilot readiness and any SLA |
| D-08 | Founder: pricing/distribution/professional-service model and whether billing is desired | Commercial promise; billing requires explicit PRD amendment |
| D-09 | Product + AI: launch languages, voice recording/consent policy and evaluated quality thresholds | FL-20/41 |
| D-10 | Operations: institution procedures, template owners/review cadence, legal/fraud escalation and complaint handling | Claims pilot and ongoing quality |
| D-11 | Product + engineering: native mobile need, device storage/session/accessibility/security requirements | Native mobile; responsive web remains P |

Unknown future ideas are not implicitly included. Add them through FL-55 once their behavior, evidence, risks, dependencies and acceptance are defined.

## 18. Scope control and revision history

Before implementation, each ticket must name PRD IDs, release, user-visible behavior, permissions/data used, failure states and acceptance evidence. An implementation PR must map its APIs/jobs/tools/schema and tests to those IDs. Review rejects unmapped scope or an LLD/roadmap-only feature.

A change request states the problem, proposed requirement/acceptance change, affected users/data/permissions, release/dependencies, migration/compatibility impact and owner. Update this PRD first, obtain owner acceptance, then update LLD, roadmap and tests together. Preserve existing IDs; mark retired requirements rather than reusing numbers. A release baseline records PRD version and Git commit.

| Version | Change |
| --- | --- |
| 0.1 | Initial consolidation of the founder concept with pilot requirements and proposed technical design |
| 0.2 | First-reader narrative; complete vision and release boundaries; 55 traceable requirements; operational/exception/sharing/quality behavior; authoritative decision register and scope-control rule |
| 0.3 | Fixed coding baseline, typed API/relational/fixture contracts, synthetic reference policy, first-principles invariants and ordered implementation packages; live-data/F approvals remain separate |

This document covers the supplied vision and explicit supporting requirements. It cannot stand in for decisions not yet made or permissions not yet obtained; those blockers are listed above.

## 19. Coding baseline and first-principles invariants

The next work is implementation, starting B-01 in [BUILD_SPEC.md](BUILD_SPEC.md). That handoff fixes stack, repository layout, local services, environment/secret handling, OIDC/session policy, reference data rules, screen interactions, jobs, test oracles and B-01–B-11 order. [OpenAPI](contracts/openapi.json) fixes wire schemas and operations; [SQL](contracts/schema.sql) fixes relational constraints/isolation; [fixtures](contracts/fixtures.json) fix synthetic scenarios and expected results. These refine existing FL requirements and add no real-source access or F permission.

| First principle | Consequence in the product | Requirement authority |
| --- | --- | --- |
| A financial assertion can be incomplete or wrong | Preserve source/date/type/uncertainty; review critical fields; never infer ownership from a name or model score | FL-06–10, FL-25–30 |
| Institutions own their records and decisions | Source-specific coverage/permissions/templates; no universal discovery or settlement promise | FL-03, FL-10, FL-12, FL-27, FL-30, FL-44 |
| Relationship is not entitlement or permission | Identity, relationship, authority, consent and institutional outcome remain distinct | FL-03, FL-04, FL-23, FL-47 |
| Disclosure is often irreversible | Exact approved content/recipient/purpose; explain completed-download limits; no inferred-death release | FL-14, FL-24, FL-32–34, FL-45 |
| Networks/jobs can fail after acting | Idempotency, immutable manifests, receipts, unknown states and reconciliation; never blind retry | FL-15, FL-36, FL-51 |
| Conversations are fallible views, not ledgers | Persist reviewed domain facts separately; summaries and tools cannot override policy | FL-02, FL-38–40 |
| Sensitive data must have a bounded purpose/lifetime | Least privilege, minimal approved processors, audited access, retention/deletion and tombstones | FL-18, FL-19, FL-45–49 |
| Scope must remain inspectable | Every behavior and implementation package maps to this PRD; no hidden ticket/API/tool scope | FL-55 |

Reference defaults are deliberate engineering decisions under this implementation request: responsive web; Python/FastAPI/PostgreSQL; local OIDC; DB-backed workers; encrypted local storage; fixture extraction and deterministic case-manager stand-in; bank/FD and mutual-fund flows; manual claim handoff; no outbound real-source/model/notification/call integration. This lets developers code and test without cloud credentials. It does not demonstrate real AI/provider quality or a live institutional service.

The reference policy uses synthetic-reviewed identity/authority and institution evidence, 30-day maximum consent, 15-minute exact approval, 30-day eligible dated observations, INR Decimal amounts and the explicit deletion/retention rules in BUILD_SPEC.md. These are **not production legal rules**. Every page/export is labeled synthetic, unknown fixture documents are refused, F is disabled, and startup rejects a real-data mode lacking accepted deployment policies.

Coding acceptance is local execution of all three paths, all P scenario evidence, contract/migration/fixture agreement and a reproducible bootstrap/test sequence. Real-data launch requires the applicable D gates and qualified review; no document can substitute for those external permissions. Internal coding choices already fixed here must not be reopened merely to choose a framework or field name.

Coding-readiness amendment: implement the reference release incrementally using BUILD_SPEC section 17. The first walking journey is a living owner reviewing one synthetic bank statement into a dated inventory. Legacy and claims remain required before reference-release acceptance; they are not prerequisites to that first working increment. F contracts are disabled reservations, not instructions to build their internals. No eligible observations means no available total (null); a reviewed eligible zero is explicitly 0.00. This refines FL-09/29/55 and adds no new capability.
