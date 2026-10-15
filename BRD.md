# Financial Legacy — Business Requirements (BRD)

Version 0.1 · 16 October 2026 · Business case and requirements; no live service or commercial commitment

**Find what’s yours. Make sure nothing gets left behind.**

This document explains **why the business should exist, whom it serves, what outcomes it must deliver, and what must be validated before commercial use**. [PRD.md](PRD.md) owns product scope, [DESIGN.md](DESIGN.md) owns UI/UX, and [LLD.md](LLD.md) owns implementation/testing. This BRD does not authorize extra features, regulated activities or integrations.

## 1. Business problem and proposed value

Financial assets and their records are spread across institutions. People lose track of holdings; families may need to find the assets before navigating a separate claim process for each institution. Missing records, uncertain authority and repeated follow-ups create work and uncertainty.

Financial Legacy proposes one persistent assistant and case record to coordinate **discovery, legacy preparation and claims assistance**. Its value is continuity: reviewed evidence, fewer repeated questions, clear ownership of tasks, and visibility into what is complete, blocked or unknown.

The first principles are simple: an asset must be found before it can be organized; discovery does not establish entitlement; institutions control their own records and decisions; users need accountable help through unfinished work. Therefore the business sells or provides assistance and record/workflow quality, not guaranteed discovery, inheritance decisions or guaranteed recovery.

## 2. Customers and desired outcomes

| Customer / beneficiary | Need | Outcome we aim to deliver |
| --- | --- | --- |
| Individual seeking their own assets | Find known, forgotten or possibly unclaimed holdings | Reviewed inventory, separate possible matches and visible search gaps |
| Individual planning for family | Make financial information easier to find and use later | Dated legacy record, missing-information checklist and controlled sharing instructions |
| Family member after a death | Discover and/or claim a relative’s holdings | Authority-reviewed case, institution-specific requirements/packs, tracked follow-ups and evidenced outcomes |

These services work independently. A claimant who knows the asset skips discovery. Older adults and Indian-language users are important intended beneficiaries; multilingual voice is part of the full vision, with text access retained. A listed family contact is not automatically a customer with record access.

**Beneficiary, user and payer may differ.** The payer, acquisition channel and willingness to pay are unvalidated; no bank, insurer, employer or distribution partner is assumed to be contracted.

## 3. Business scope and delivery stages

| Stage | What is included | Evidence needed to advance |
| --- | --- | --- |
| Synthetic reference build | All three paths with generated records; bank/FD and mutual-fund workflows; labeled assistant/extraction stand-ins; simulated manual claim receipts/outcomes | Reproducible implementation and the PRD/LLD normal, failure, permission and lifecycle checks |
| Controlled real-data pilot | Only accepted first-pilot scope, supported institutions/situations and permitted methods | Named accountable owners, reviewed procedures, accepted authority/privacy/operating policies and measured quality/capacity |
| Full vision | All nine asset groups; selected voice/languages; verified family sharing/release; approved retrieval, direct submission and follow-up | Separate permission, policy, security, quality and operational evidence for each capability |

The nine asset groups are bank accounts/FDs, mutual funds, shares/demat, unclaimed dividends/shares, life insurance, EPF benefits, NPS, PPF/small savings and bank lockers. Listing a category does not establish discovery coverage or integration rights.

Outside the agreed baseline: custody or transfer of funds, trading, investment/tax advice, entitlement adjudication, contested-estate resolution, legally operative will drafting, nominee/account-detail changes, and unsupported asset classes listed in the PRD. Pricing/billing/payment collection are not implementation features unless added through the PRD change process.

## 4. Business requirements and acceptance

These requirements summarize business outcomes already supported by the PRD. Their mappings preserve the existing P/F release boundaries; they do not enable later capabilities early.

| ID | Business requirement | Evidence of acceptance / PRD mapping |
| --- | --- | --- |
| BR-01 | Serve discovery, legacy and claims independently | All paths work; a known-asset claimant is not forced through discovery. FL-01/22 |
| BR-02 | Produce understandable records without overstating certainty | Evidence, dates, possible matches, duplicate/conflict review and search gaps are visible; totals follow policy. FL-06–10/25–30 |
| BR-03 | Help people prepare for family without accidental disclosure | Reviewed dated record, checklist and approved export; contacts grant no access; later sharing/release passes its gate. FL-11/24/31–34 |
| BR-04 | Carry supported claims through a documented result | Correct institution procedure, reviewed pack/approval, receipt/unknown-state tracking, requests and partial/unresolved outcomes. FL-12–17/35–37 |
| BR-05 | Maintain continuity and make the next step clear | Saved context, owned tasks, useful assistant behavior, correction/failure/help paths; voice is separately evaluated. FL-02/20/38–43 |
| BR-06 | Protect people’s records and permission to act | Separate identity/relationship/authority/consent; restricted access, audit, controlled processors, holds, recovery and deletion. FL-03/04/18/19/23/24/45–49 |
| BR-07 | Deliver a usable, reliable and measurable service | Accessibility, recovery, capacity/quality results and privacy-safe operational measures; no false SLA or automation claim. FL-50–54 |
| BR-08 | Expand only within accepted scope and validated procedures | Reviewed source/template/tool versions, capability gates and requirement-linked changes. FL-44/55 |

## 5. Operating model and accountability

- **User/claimant:** supplies available information, reviews corrections, grants valid scoped consent and approves exact disclosures/handoffs.
- **Assigned operator:** reviews evidence, authority and supported requirements; handles exceptions and records attributable reasons. Cannot decide inheritance or approve user disclosure on their behalf.
- **Procedure/integration owner:** maintains supported institution/category/subject scope, current sources/templates, access agreements and suspension/review dates.
- **Product/business owner:** accepts scope, target segment, customer promises, success targets and commercial choices.
- **Security/privacy and qualified reviewers:** accept applicable data use, access/authority, retention, processors, release/dispute and escalation policy before real use.
- **Institution or external adviser:** retains its own decision/professional role. Any disclosure needs the proper permission and approval.

The service records who owns the next action and whether it is waiting on the user, operator or institution. Unsupported joint/minor/representative/nonresident/disputed cases are routed to an explicitly supported process or a clear hold/handoff. Staffing, support hours, case limits and escalation contacts must be named before pilot launch; they are not currently committed.

## 6. Success measures and economics

| Measure | Definition and interpretation |
| --- | --- |
| Activation | Cases reaching a first reviewed useful artifact divided by eligible started cases, by path; artifact means inventory, legacy record or claim checklist |
| Time to value | Median/p90 time to the first artifact; separate active effort from user/institution waiting |
| Record quality | Reviewed holdings with usable evidence divided by reviewed holdings; report status, age and category. Not a measure of all assets found |
| Claim-pack quality | Among packs that received an institution’s first review in a stated cohort/window, the share accepted as complete; segment by institution/template and report pending reviews separately |
| Outcome and effort | Settled/transferred/partial/rejected/unresolved counts and time in state; user/operator time, clarification and rework. Rejected/disputed is not recovery success |
| Trust and access | Unauthorized disclosures/actions, false verification, complaints and resolution. No critical access/integrity defect is acceptable in release tests |
| Service economics | Processing, storage, operator, support and approved partner costs per reviewed artifact/case; distinguish human effort from automation |

Numerical business targets are **not set**; agree them under PRD D-01/D-07 before a real pilot. Extraction/model quality is reported separately on labeled data. No revenue, market size, recovery rate, savings or profitability forecast is established.

Commercial hypotheses to test under D-08 include a one-off assisted case, ongoing record/legacy service, or permitted partner distribution. None is selected or priced. Research must test demand, payer, acquisition cost, support effort and permitted service/fee boundaries. Any margin calculation uses actual service revenue and costs—not the value of discovered or recovered assets. Billing requires an explicit PRD amendment.

## 7. Evidence, assumptions and business risks

The PRD contains the official-source research and access limits. [RBI UDGAM](https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQonUDGAMPortal.pdf) supports qualifying unclaimed-deposit searches with bank claims; [SEBI MITRA](https://www.sebi.gov.in/sebi_data/attachdocs/feb-2025/1739356741378.pdf) addresses inactive/unclaimed fund folios. These substantiate distinct workflow pieces, not a universal platform integration or proven market demand.

| Unvalidated assumption / risk | Required business response |
| --- | --- |
| People will trust and use a coordinated case manager | Test representative owner/planner/claimant journeys, understanding and willingness to proceed |
| A permitted source/partner route is available | Validate eligible role, contract, subject/channel scope and coverage; retain an honest guided/manual alternative |
| Assisted claims can be delivered accurately and sustainably | Validate templates and staffing, measure rework/time/cost, limit supported situations and suspend unsafe procedures |
| Wrong match, claimant or recipient could cause harm | Keep evidence uncertainty, separate authority, exact approvals, scoped holds and qualified escalation |
| AI or voice could misunderstand critical information | Independent critical-field review, text correction/fallback and representative quality gates |
| Commercial demand and cost structure are viable | Validate payer, price/service model and costs before making revenue or scale commitments |

There is no completed customer study, competitive/TAM assessment, signed access agreement or proven unit economics in this repository. The official research is infrastructure/process evidence; it is not evidence of those business conclusions.

## 8. Decisions and business readiness

The **single decision register remains PRD section 17**: D-01 for pilot/customer targets; D-02/04 for authority and family release; D-03 for access/partners; D-05 for data policy; D-06 for evidence rules; D-07/10 for capacity/operations/procedures; D-08 for commercial model; D-09/11 for voice and native client. Resolve decisions there with accountable owner, evidence and date rather than maintaining a second contradictory register.

**Coding can begin** with the accepted synthetic reference scope. Open pricing, partnerships and live-policy questions do not block that build.

**Real customer use cannot begin** until the relevant PRD gates, named operating responsibilities, support/escalation boundaries, applicable privacy/authority policies, institution procedures and release evidence are accepted. A new product capability must enter the PRD before implementation; the BRD alone does not expand scope. Resolve conflicts explicitly and update the affected documents together.
