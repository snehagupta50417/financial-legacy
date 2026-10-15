# Financial Legacy — Product Requirements (PRD)

**An AI-native financial asset discovery, legacy planning and recovery platform.**  
**Find what’s yours. Make sure nothing gets left behind.**

Version 0.3 · Consolidated product scope · Application not yet built

This is the product contract. [README.md](README.md) is the short overview; [LLD.md](LLD.md) defines implementation and tests. Every feature must map to a requirement below. Technical choices may refine an existing requirement; new behavior, data use, access or promises require a PRD change first.

## 1. The problem

People accumulate bank accounts, deposits, investments, insurance and retirement benefits across institutions. Jobs, addresses, phone numbers and banks change. Documents disappear, investments are forgotten and nomination information becomes incomplete.

After a death, families face two separate jobs: **discover what exists**, then **work through each institution’s claim process**. Financial Legacy coordinates those jobs; it does not assume a universal financial database or a single process covering every asset.

## 2. What we are building and its boundaries

One assistant that remembers the case, gathers relevant information, organizes evidence, proposes permitted next steps and tracks unfinished work. Three capabilities work independently or together: **asset discovery, legacy planning, and claims/recovery assistance**.

We own the quality of the reviewed record, checklist, pack, permissions and tracked workflow. Institutions own their records, verification and claim decisions. We do not guarantee complete discovery or successful recovery, decide inheritance, resolve a contested estate, hold/transfer funds, trade, give investment/tax advice or draft a legally operative will.

We identify nomination gaps and guide the supported process; changing nominees or account details is outside this baseline. Never request financial-account passwords/OTPs or bypass restricted access. No release based on inactivity or inferred death. Real estate, physical valuables, crypto, debts, business ownership and foreign assets are outside scope. Pricing, billing and commissions are undecided; billing is not a build feature.

## 3. Users and essential terms

An owner manages their finances; a claimant requests help concerning a deceased person; an assigned operator reviews only permitted cases. A trusted contact has no access merely because they are listed. Later collaborators/recipients need explicit verified access. Support has no blanket financial access; procedure reviewers manage configuration without unrestricted case evidence.

A **case** is one goal concerning one **subject**. A **holding** is an account/investment; **evidence** supports it; an **observation** is a dated amount or fact. **Identity**, **relationship**, **authority to act**, **consent to use data**, **exact-action approval**, nomination and legal entitlement are separate. A **snapshot** freezes a reviewed record; a **hold** restricts specified actions while uncertainty is resolved.

## 4. First build, pilot and full product

**Reference build:** implement the first-release behavior using generated sample records, local sign-in, fixed-rule conversation and sample extraction. No real financial access, external AI processing, customer data, calls, messages or institutional submissions. These stand-ins test workflows; they do not prove live service or AI quality.

**P** marks first-pilot requirements; the reference build implements their specified synthetic behavior. A real pilot additionally needs accepted policies, accurate institution procedures and operational review. **F** marks the full vision, disabled until its own gates pass. **P/F** means an in-app first-release behavior with a later external extension.

First release: responsive web, text conversation, reviewed uploads, bank/FD and mutual-fund inventory, guided discovery, legacy checklist/contact intent/approved export, manually tracked claims, tasks, assigned reviews and lifecycle controls. Later: voice/languages, other asset groups, family sharing/release, live connectors, direct submissions and permitted automated follow-ups. Native mobile needs its own decision; mobile web is first release.

### Feasibility and honest product status

| Capability | Current assessment |
| --- | --- |
| Text onboarding, records, document review, inventory, tasks and exports | Technically implementable; not built or tested yet |
| Real AI extraction and multilingual voice | Need an approved provider and representative quality/privacy evaluation; sample results do not prove real performance |
| Assisted claims | Depend on accurate institution procedures, supported situations and staffed review |
| Live financial retrieval, direct submission and automated follow-up | Depend on source/channel access, contracts, subject eligibility and case permission; no universal integration is confirmed |
| Family sharing and release after death | Need the separate recipient, authority, notice/contest and security policy |

## 5. Three complete user journeys

| User and example request | What happens | Done means |
| --- | --- | --- |
| Owner: “I invested years ago but don’t remember where.” | Confirm subject/goal → verify required identity/permission → collect declarations/documents or enabled sources → review fields/matches/duplicates → show holdings and gaps | Reviewed inventory with dated evidence and honest coverage; no result is not proof of no assets |
| Planner: “Make sure my children know where my money is.” | Start or reuse own inventory → identify missing records/nominations → review checklist and dated snapshot → record contact/sharing intent → approve an export if requested → update on reminders | Reviewed record and acknowledged gaps. Contact entry sends nothing; later sharing/release requires its own checks |
| Family: “My father passed away; help us find or claim his assets.” | Confirm deceased subject and known/unknown assets → review identity, relationship, death evidence and action-specific authority → discover only if needed → create separate claims → review requirements/pack/approval → track receipt, requests and outcome | Evidenced settlement, transfer, rejection or unresolved dispute; partial/unknown remainder and unresolved investigations remain tracked |

A known asset skips discovery. Ask relevant questions instead of one long universal form; save progress and avoid repeated sensitive questions. Documents such as death/nomination/legal records depend on the reviewed institution workflow; AI does not invent a universal legal checklist. Joint holders, multiple claimants/nominees, minors/guardians, representatives, nonresidents, changed names, missing references and contested documents need an explicitly supported workflow or a clear hold/handoff.

## 6. All asset groups and potential sources

These are candidate discovery and recovery routes, not promised API access or legal instructions.

| Asset group | Potential evidence/discovery | Recovery route | Release |
| --- | --- | --- | --- |
| Bank accounts and fixed deposits | Statements, bank enquiries, eligible RBI UDGAM searches | Relevant bank procedure | P, document-led |
| Mutual funds | Consolidated account statements (CAS), fund companies/recordkeepers, CAMS, KFintech, MITRA | Fund company/recordkeeper transmission or redemption process | P, document-led |
| Shares and demat | Depository, broker, CAS and company records | Broker/depository/company transmission | F |
| Unclaimed dividends and shares | Company/recordkeeper and IEPF records | Company verification and IEPF process | F |
| Life insurance | Policy, insurer and unclaimed-amount records | Insurer-specific death claim | F |
| EPF and related benefits | EPFO, member and employer records | Applicable nominee/death-benefit process | F |
| NPS | Pension/CRA records and statements | Applicable exit/death process | F |
| PPF and small savings | Bank/post-office records | Relevant institution settlement | F |
| Bank lockers | Bank relationship, holder and nomination records | Relevant access procedure; contents/value not assumed | F |

Every holding needs institution/category, masked reference, ownership support, evidence/date/status, nomination information and next action. Category fields retain their meaning: FD principal/maturity differs from balance; fund/share units differ from valuation; physical and demat records must not double-count; dividends differ from share value; insurance benefit is not cash value; EPF benefit types, NPS tiers and small-savings scheme/maturity details remain distinct; lockers have no assumed cash value. Exact fields are in the contracts.

UDGAM concerns eligible unclaimed deposits, not every active bank account. MITRA concerns inactive/unclaimed mutual-fund folios. DigiLocker supports authorized document sharing through supported integrations. Account Aggregator supports regulated consent-based sharing; our eligible role and deceased-subject applicability need validation. IEPF handles specified unpaid dividends/shares. They solve different parts; none grants this platform blanket access.

<details>
<summary><strong>Official-source research and product implications — checked 16 October 2026</strong></summary>

These findings describe the inspected sources, not approved startup access or a completed legal review. Some published material is older than the review date; source/template currency must be rechecked before live use. “Located” below means an official listing/index was found but full current procedure was not validated.

| Source and evidence | What it establishes | Product consequence |
| --- | --- | --- |
| [RBI UDGAM FAQ](https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQonUDGAMPortal.pdf), inspected | Search covers qualifying unclaimed deposits/accounts; claims go to the respective bank. Its participation counts are dated | Show checked coverage and bank handoff; do not promise all active accounts, current coverage counts or settlement inside UDGAM |
| [SEBI MITRA circular, 12 February 2025](https://www.sebi.gov.in/sebi_data/attachdocs/feb-2025/1739356741378.pdf), inspected | Industry tracing of inactive/unclaimed fund folios, including some absent from CAS; separate fund-company/recordkeeper processes remain | Treat MITRA and CAS as complementary evidence paths; a match is neither ownership verification nor platform API permission |
| [RBI AA directions](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=10598), inspected published text | Defines regulated FIU eligibility, explicit scoped consent and information-use limits; AA does not support customer transactions | Validate our eligible operating/partner role and deceased-subject use separately; no consent-only shortcut, universal retrieval or claim submission through AA |
| [DigiLocker implementation model](https://www.digilocker.gov.in/web/implementation-model), inspected published text | Partner vetting, agreements, technical integration/testing and approval precede access | User intent is not partner approval; enable only approved document types, issuers, purpose and methods |
| [CDSL DP services](https://www.cdslindia.com/DP/Services.html), inspected; page dated 26 August 2025 | Depository participants handle demat services/transmission, with different sole/joint-holder situations | Route by holding/claimant situation and approved DP procedure; do not treat every share or joint account identically |
| [IRDAI Bima Bharosa unclaimed query](https://bimabharosa.irdai.gov.in/Home/UnclaimedAmountsQuery), inspected | An insurer-directed query facility with policyholder/contact/policy fields and consent, plus insurer links | Do not promise a name-only search of every policy; collect only required evidence and use a reviewed permitted route |
| [EPFO composite death claim](https://www.epfindia.gov.in/site_docs/PDFs/Downloads_PDFs/Form_CCF_death.pdf), official form text located | Distinguishes PF, pension and EDLI benefit requests | Keep benefit types and eligibility separate; confirm current accepted procedure/forms before enabling the workflow |
| [NPS Trust exit regulations, published consolidation amended 16 December 2025](https://npstrust.org.in/sites/default/files/act-and-regulations-documents/exits-and-withdrawals-under-the-national-pension-system-regulations-2015-last-amended-on-16-december-2025.pdf), inspected | Claim settlement follows the applicable subscriber/claimant category and required conditions/documents | Select a current sector-specific procedure; do not apply a blanket payout rule from an older generic form |
| [MCA IEPF-5 e-verification instruction kit](https://www.mca.gov.in/content/dam/mca-af-forms/instruction-kits/Instruction_Kit_IEPF_5_E_verification_report.pdf), official indexed text located | Company/bank nodal-officer verification is a distinct step | Track institution verification separately from claimant preparation; full current IEPF procedure remains unvalidated for launch |
| [India Post savings](https://www.indiapost.gov.in/banking-services/savings), inspected; official claim-handbook text only located in the index | Small-savings schemes have their own operating rules; current detailed death-claim workflow was not retrieved | Confirm current handbook and scenario-specific requirements; do not copy generic nominee/no-nominee thresholds into every scheme |
| [MeitY DPDP Rules and enforcement-timeline index](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digit), official published listing inspected | Rules, corrigendum and commencement timeline are separate published materials | D-05 must record applicable provisions, commencement dates, notices, processors, safeguards, retention, rights/grievance and breach-response policy; do not assume every provision commenced together |

**What research has not established:** our regulated role, partner contracts, API credentials, portal-automation rights, deceased access eligibility, legally sufficient authority/release policy, current institution forms, real AI accuracy, or production service performance. Those remain explicit gates. The historical IEPF FAQ was not accessible during this review; it is not treated as validated current instructions.

</details>

## 7. Experience and case workflow

**Talk by chat/voice → verify identity and authority → discover through permitted sources → consolidate/review → prepare a legacy or claim → track to a documented outcome.** Voice is later, with text always available.

The assistant is the starting point; structured screens support decisions. Users can inspect verification/consent, cited documents, source coverage, holdings, legacy records, claims, tasks/activity and privacy settings. Operators see assigned work only. Every screen explains subject/state, what is saved, what is missing, next action and help. Include loading, empty, failed, blocked, expired/revoked, conflicting and retry states. Consequential actions use structured previews, not ambiguous chat approval.

<details>
<summary><strong>Detailed requirements — expand for the feature you are building</strong></summary>

## 8. Cases, access and documents

| ID / release | Required behavior and completion check |
| --- | --- |
| FL-01 · P | Confirm the user’s goal; support all three paths and known-asset claims without discovery. The user can correct the suggested path. |
| FL-02 · P | Save conversation, facts, evidence and tasks. Resume without repeated entry; reviewed corrections take priority over old summaries. |
| FL-22 · P | Keep one subject per case and support multiple isolated cases. Switching or correcting a case rechecks permissions and clears stale content. |
| FL-03 · P | Track identity, relationship and action/institution-specific authority separately. Record evidence, reviewer, reason and expiry; block only affected restricted actions. |
| FL-04 · P | Record consent for specified data, purpose, recipient and expiry. Show a receipt; revocation stops future and queued work while preserving completed disclosure history. |
| FL-23 · P | Enforce owner, claimant and assigned-operator permissions on every record, search, download, export and job. Reassignment removes old access; support has no blanket access. |
| FL-24 · F | Invites reveal no records. Verify a collaborator, approve exact case/document/action scope and expiry, then grant access; revocation stops future reads. |
| FL-05 · P | Validate, quarantine and scan uploads before extraction. Refuse unsafe/unsupported files; distinguish upload, scan and extraction failures and provide safe retry. |
| FL-06 · P | Propose fields with document/page or source-record citations and visible confidence. Review critical identity, ownership, identifier, amount, date and source fields before acceptance. |
| FL-25 · P | Handle missing, unreadable, encrypted or conflicting records with clearer-evidence requests or secure help. Never invent fields or request passwords in chat. |
| FL-26 · P | Allow accept/correct/reject review of fields and source associations. Keep actor, reason and version; material changes invalidate dependent pending packs and approvals. |

## 9. Discovery and inventory

| ID / release | Required behavior and completion check |
| --- | --- |
| FL-10 · P | Show a discovery plan with coverage, prerequisites, permitted method and next owner. Distinguish no result, partial, blocked and failed; never imply exhaustive discovery. |
| FL-27 · F | Enable retrieval/refresh only for an approved source, subject type, method and current permission. Preserve source history and coverage; unsupported access stays blocked. |
| FL-07 · P | Label holdings self-declared, potential match, document-backed or institution-verified. Name similarity or AI confidence cannot verify ownership; reviewed attributable institution evidence is required. |
| FL-08 · P | Review duplicates and conflicts; no name-only automatic merge. Preserve evidence and aliases, allow reversal, and recalculate affected records. |
| FL-09 · P | Show institution, category, masked reference, evidence, dated amount/type/currency, nomination information and next action. Missing information remains unknown. |
| FL-28 · P | Append dated observations and ownership/lifecycle evidence instead of overwriting history. Closure, transmission or absence from a later source does not erase prior evidence. |
| FL-29 · P | Count one qualifying reviewed monetary observation per holding. Exclude potential, duplicate, conflicting, held, old/undated or incompatible values; separate currencies. No eligible values means null, not zero. |
| FL-30 · F | Before enabling each additional asset group, approve its fields, amount meaning, sources, authority, claim process, fixtures and evaluation. Cover all nine groups in section 6. |

Evidence labels do not certify entitlement, current activity or recoverability. Nomination remains unknown, declared or document-supported, with its own source/date. The reference summary is “Reviewed value from dated sources,” not live wealth. An evidenced eligible zero is 0.00; no eligible values is null.

## 10. Legacy planning and sharing

| ID / release | Required behavior and completion check |
| --- | --- |
| FL-11 · P | Create a reviewed, dated legacy record and checklist showing missing documents, unknown nominations, stale records and open next steps. |
| FL-31 · P | Record trusted-contact intent and planner updates/review reminders. Adding or changing a contact grants no access and sends nothing; keep history and no passwords. |
| FL-32 · F | Share during life only after recipient verification and exact-scope approval. Apply expiry, access history and revocation; no unapproved family access. |
| FL-33 · F | Release legacy information after death only under the accepted evidence, authority, recipient, instructions and contest/hold policy. No inactivity trigger or AI-only release decision. |
| FL-34 · P | Export only an authorized, reviewed snapshot with date, scope and gaps. Use audited short-lived access and explain that downloaded copies cannot be recalled. |

Sharing a legacy record does not transfer assets or act as a will. D-04 must define release authority, evidence, recipient rights, notices/contest, contact changes and hold resolution before post-death release.

## 11. Claims and recovery

| ID / release | Required behavior and completion check |
| --- | --- |
| FL-12 · P | Use institution/category/subject-specific, versioned claim requirements with dated sources. Preserve the selected version; stale, missing or unsupported procedures require review. |
| FL-13 · P | Prepare a reviewable pack listing exact document versions, required/optional items, fields and declarations. Missing or rejected requirements prevent unsupported readiness. |
| FL-14 · P | Preview recipient, channel, purpose, content and declarations before exact approval. Expiry, changed content or revoked permission invalidates it. First-release handoff remains manual. |
| FL-35 · F | Submit directly only through an enabled channel after execution-time permission/approval checks. Use safe repeat handling and capture receipts; unsupported channels remain manual. |
| FL-15 · P | Track manual/automated activity, references, receipts, institution requests and deadlines. Create owned tasks and distinguish user, operator and institution waiting time. |
| FL-36 · P | Treat possible acceptance without a receipt as unknown. Reconcile before resubmission; retries and repeated requests must not create duplicate records or outside actions. |
| FL-16 · P | Record reviewed, evidenced settlement, transfer, partial settlement, rejection or unresolved dispute with date/type/amount. Track known or unknown remainder; review closure without calling failure recovery success. |
| FL-37 · P | Handle additional requests, new evidence and reopening without rewriting shared templates or erasing prior packs, outcomes and reasons. Claims progress independently. |
| FL-17 · P | Provide visible help and assigned handoff for uncertainty, unsupported situations, complaints and disputes. Route legal entitlement conflicts to qualified help; AI does not decide them. |

A claim’s rejection cannot reject another claim. Case closure requires a reviewed summary and acknowledgment of unresolved items; submitted history remains intact when later evidence or authority changes.

## 12. AI, voice and operations

| ID / release | Required behavior and completion check |
| --- | --- |
| FL-38 · P | Use one case manager to coordinate bounded discovery, document, reconciliation, legacy, claim and follow-up tools from saved facts. Backend rules enforce authority and exact approvals. |
| FL-39 · P | Explain why information is needed, cite evidence/procedures and admit uncertainty. Conflicting or missing evidence leads to questions or help; document instructions cannot grant tool access. |
| FL-40 · P | Preserve saved work when AI or sources fail. Support safe retry, correction, cancellation and human help; show the next usable step instead of losing progress. |
| FL-20 · F | Disclose supported Indian languages and evaluate voice/chat quality. Allow correction of names/numbers/transcripts, text fallback and structured approval of consequential actions. |
| FL-41 · F | Make microphone/recording state and consent visible. Honor stop/text choices; approve processing, provider and retention policy before recording or using voice. |
| FL-21 · F | Automated institutional follow-ups need permitted channels, disclosure, recipient/purpose, current authority/consent and logs. Block unsupported calls and review ambiguous responses. |
| FL-42 · P/F | Provide owned in-app tasks and duplicate-safe reminders respecting due dates, preferences and time zone. External email/SMS/voice later requires opt-in, minimal content and opt-out. |
| FL-43 · P | Show assigned operator queues for verification, extraction, claims, disputes and overdue work. Restrict actions to assignment/scope; privileged reviews require reasons and audit. |
| FL-44 · P | Version and review institution templates, source capabilities, models and tools. Suspend unsafe/stale workflows; preserve in-flight history and require review after material changes. |

The case manager coordinates conversation, discovery planning, document intelligence, matching/review, legacy preparation, claims and follow-up. These are bounded capabilities, not a requirement for separate autonomous services. Voice should help older adults and Indian-language users through explanations, correction and text fallback. Automated calls need permission and disclosure; they are not implicitly authorized by voice support.

## 13. Security and lifecycle

| ID / release | Required behavior and completion check |
| --- | --- |
| FL-18 · P | Audit sensitive reads, changes, reviews, exports, approvals and execution with actor, case, object, time, reason and request reference. Protect history without ordinary-log secrets. |
| FL-19 · P | Enforce stated retention/deletion policy. Revoke access and cancel work on deletion; track live/derived/processor copies, justified holds and backup expiry; restoration honors deletion markers. |
| FL-45 · P | Use strong authentication, encryption, least access, expiry, controlled short-lived downloads and sensitive-action verification. Test isolation, keys and revocation. |
| FL-46 · P | Send minimum necessary data only to approved processors, AI services and recipients under accepted hosting/retention/subprocessor terms. No real records in unapproved tools or development. |
| FL-47 · P | Apply scoped holds for fraud, competing claimants or disputed evidence. Restrict affected actions, protect other claimants’ data and require authorized evidence-based resolution. |
| FL-48 · P | Use safe account/session recovery and contact changes. Remove old access, inform the user and audit changes; recovery never bypasses authority or recipient verification. |
| FL-49 · P | Track help/complaints with owner, response state, escalation and resolution. Ordinary support messages must not disclose financial documents. |

Retention duration, identity strength and legally sufficient authority are approved policies, not AI guesses. Consent does not create authority the person lacks. Preserve completed-disclosure history while removing access to future work.

## 14. Quality and delivery

| ID / release | Required behavior and completion check |
| --- | --- |
| FL-50 · P | Provide readable, resumable responsive web with keyboard, screen-reader and large-text support. Test labels, focus, errors and a non-voice path; target WCAG 2.2 AA. |
| FL-51 · P | Show durable job progress and bounded retries. Restart, outage, cancellation and duplicate-delivery tests preserve work and prevent duplicate effects; unknown outside outcomes require reconciliation. |
| FL-52 · P | Measure performance, capacity, cost and recovery against the LLD reference workload. Accept D-07 production budgets before launch; written targets are not measured results or customer SLAs. |
| FL-53 · P | Evaluate extraction and assistant behavior on representative labeled and adversarial records. Report critical fields separately; block false verification, unauthorized tools and disclosure. Voice has a separate gate. |
| FL-54 · P | Measure activation, coverage, time, effort and outcomes using explicit definitions. Separate institution waiting/human work; exclude document text, identifiers and balances from analytics. |
| FL-55 · P | Map each feature, screen, API, job, tool, schema change and relevant test to these IDs. Amend the PRD before new product behavior; update LLD/contracts together and preserve IDs. |

</details>

## 15. Measures of success

Measure activation as cases reaching a first reviewed useful artifact divided by eligible started cases, by path. Measure median/p90 time to that artifact, separating user effort from waiting. Track evidence coverage, critical-field correctness, first-review claim-pack completeness by institution/template, outcomes/time in state, user/operator rework, complaints and processing/support cost per artifact. Coverage is not a claim that all assets were found; rejected/disputed cases are not recovery success. Record unauthorized actions/false verification separately. Business targets and pricing require D-01/D-08; do not invent recovery rates, savings or market forecasts.

## 16. Completion and release acceptance

A local developer must be able to start the stack, exercise all three sample journeys, resume saved work and run the LLD checks without cloud credentials. Test normal and failure paths: cited-field correction; duplicates/old/unknown values; no-result discovery; inert contacts and scoped exports; known-asset claims; changed-pack invalidation; unknown submission and partial outcome; cross-case/revoked/expired access; hostile/unsafe documents; suspended workflows; worker failure; deletion, holds and restore markers.

Each P requirement needs recorded expected/actual results, fixture/environment, requirement IDs, version/commit, reviewer and defects. No unresolved critical authorization, disclosure, evidence-integrity or duplicate-execution defect is acceptable. F requires separate evidence for each enabled language, asset, source, subject, channel or sharing/release capability. A plan or sample adapter is not a passing test or live permission.

## 17. Decisions before real use or expansion

These gates do not block the isolated reference build. Named owners and accepted policy are required before the affected live/F capability; dates are uncommitted.

| ID | Decision / responsible role |
| --- | --- |
| D-01 | Founder: pilot personas/institutions/formats, service boundary and success targets |
| D-02 | Product + qualified reviewers: identity/relationship/authority evidence, scope, roles, expiry and sensitive-action checks |
| D-03 | Integration + qualified reviewers: eligible role/partner/contracts, source/channel permission and living/deceased applicability |
| D-04 | Product + qualified reviewers: collaboration, family sharing/release, recipient verification, notices/contest and hold resolution |
| D-05 | Privacy/security: hosting/processors, minimum data use, retention, deletion, holds and backup expiry |
| D-06 | Product + operations: evidence support/freshness and category-specific amount/total rules |
| D-07 | Engineering + operations: workload/cost/capacity, recovery, support hours/case limits and service targets |
| D-08 | Founder: distribution, pricing and professional-service model; billing needs a PRD amendment |
| D-09 | Product + AI: launch languages, recording/consent and evaluated quality thresholds |
| D-10 | Operations: current institution procedures, template ownership/review cadence, legal/fraud escalation and complaints |
| D-11 | Product + engineering: native-client need and device/session/storage/accessibility rules |

## 18. Scope control

Every work item names its requirement IDs, release, behavior, data/permission scope, dependencies, failure/revocation/retry rules and acceptance checks. Amend this PRD and obtain product-owner acceptance before new behavior; update LLD/contracts and tests in the same change. Internal implementation choices within an accepted requirement can proceed. Preserve IDs; retire rather than reuse them. A release records version and Git commit. This revision removes repetition while retaining the 55 requirement IDs and their P/F boundaries.

## 19. Coding baseline

Use [LLD.md](LLD.md) for fixed tools, screens, role/command guards, synthetic policy, state changes, B-01–B-11 order and tests; use [OpenAPI](contracts/openapi.json), [SQL](contracts/schema.sql) and [fixtures](contracts/fixtures.json) for exact formats. Start B-01, then make the first complete owner/statement/review/inventory journey work before extending it.

Reference defaults include INR exact decimals, explicit review, dated-value eligibility, approval/consent expiry and deletion rules. They are development policy, not legally sufficient real-data rules. Unknown fixture files and real external effects remain refused. All three paths and P failure cases are required before reference completion; live launch and F gates remain separate.
