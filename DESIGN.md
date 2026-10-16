# Financial Legacy — Product Design

Version 0.2 · 16 October 2026 · UI/UX specification for the first reference build

**Purpose:** make the product understandable and consistent before writing screens. [PRD.md](PRD.md) owns behavior and scope; [LLD.md](LLD.md) owns data, APIs, permissions and workflow rules. This document defines presentation and interaction under those rules, not new features. No application or visual prototype has been built.

## 1. Design direction

Calm, readable and practical. The user should always understand **whose records they are viewing, what is known, what needs review, and the next useful action**.

- Start with conversation and the current task, not charts or a wealth score.
- Use plain language and one main action per task area. Put technical detail behind a clearly named disclosure.
- Distinguish evidence, authority and outcome. No single “verified case” badge.
- Show progress as saved steps and open tasks, never a percentage suggesting all assets have been found.
- Use respectful language after a death. Do not repeatedly ask for the same sensitive fact or celebrate a disputed/rejected outcome.
- The reference banner stays visible on every case screen and appears in every export/pack: **“Demonstration — synthetic records. No real identity verification, asset discovery or claim submission.”**

Applies to PRD FL-01/02/07/09/17/22/39/40/50. Voice is first-release scope (FL-20/41). Family sharing and real connectors remain disabled; do not show active sends or success states for them.

## 2. Navigation and page structure

### Case selection

/cases shows only authorized cases: subject, goal, current state and next owned task. Provide **New case** and **Continue**. Do not expose balances or document previews in another case’s card.

New case asks: goal → subject → confirm. For a deceased-claim case, ask whether the assets are already known; that route skips discovery. Explain the next step before requesting documents.

### Case workspace

Header: case title, subject, goal and current state; a clearly labeled case switcher; a case menu for verification/permissions, activity and privacy. Synthetic notice is below the header and does not cover focused controls.

Primary navigation has four destinations:

| Destination | Existing routes and content |
| --- | --- |
| Conversation | /cases/{id}/chat; saved messages, reviewed fact summary, next task and action cards |
| Records | Documents, discovery plan and assets as labeled subviews; existing /documents, /discovery and /assets routes |
| Plan or Claims | /legacy for the planner path; /claims and claim detail for deceased claims; show only the supported case-mode destination |
| Tasks | /tasks; task owner, due date, blocked/waiting state and next action |

Verification, activity and privacy use the existing /verification, /activity and /privacy routes. A blocked action links directly to the relevant prerequisite. Staff use /operations and assigned case review routes; a staff role never implies access to all evidence.

Desktop: 224px sidebar, flexible main workspace, maximum content width 1280px, 24–32px page padding. Conversation is at most 760px wide; optional evidence/task context sits beside it when space permits. Mobile: single column, 16px padding, the same four destinations in a bottom navigation; secondary actions live in the case menu. Ensure bottom controls never hide content or focus.

Case switch/sign-out cancels stale responses and clears the old case view before rendering the next case. Conversation is the default workspace entry; there is no additional dashboard or marketing page to implement.

## 3. Visual foundations

Use the navy, cream and restrained gold of the repository header. System fonts avoid a required external font service. Gold is decorative, not body text or a status signal.

| Token | Value / use |
| --- | --- |
| page | #F5F2E9; page background |
| surface | #FFFFFF; forms, document/review panels and task cards |
| text | #102E32; main text/headings |
| muted | #475569; secondary text |
| primary | #145D55; main action, with white text |
| border | #64748B for control boundaries; pale #D6DDD8 only for nonessential dividers |
| focus | #2563EB; visible 3px outline with 2px light separation |
| accent | #D6C39A; decorative rule/illustration only |
| info | #1D4ED8 on #EFF6FF; pending/informational label |
| caution | #92400E on #FFFBEB; review needed or incomplete |
| danger | #B91C1C on #FEF2F2; blocked/error/destructive action |
| success | #166534 on #F0FDF4; a specific completed step only |

Typography: system-ui stack; body 17px/1.55; labels 16px; noncritical helper text at least 14px; page title 28–36px; section title 20–24px. Use sentence case and restrained font weights. Keep text in real HTML, not screenshots.

Spacing: 4/8/12/16/24/32/48px. Cards use 12px radius, 24px desktop/16px mobile padding and a subtle divider/border. Avoid dense grids, large decorative illustrations and nested cards. Primary buttons are filled teal; secondary buttons are outlined; links remain underlined in prose. Buttons/inputs have at least 44px height and comfortable separation. Do not infer contrast from a color name; verify actual foreground/background combinations and interactive states.

## 4. The first journey, screen by screen

Use the LLD intake profile and supplied synthetic PDFs; no real document intake or extra sample-generation UI.

| Screen / state | What the person sees | Main action and result |
| --- | --- | --- |
| Empty case | Subject/goal, synthetic notice, “No reviewed value available” and next prerequisite | Open verification; no inferred ₹0 balance |
| Verification | Separate identity, relationship where applicable, authority and consent sections; requested purpose, scope, reviewer state and expiry | Upload the prerequisite fixture, inspect it and request review; assigned operator accepts/rejects with rationale |
| Documents | File name, stage and safe next step; upload → quarantine/scan → extraction → review | Choose supplied PDF; unsupported/unknown/unsafe input gets a clear error, not a completed state |
| Field review | Source page and proposed fields with citations; accepted, corrected and rejected states remain distinct | Accept/correct/reject each critical field; review source/ownership separately from transcription |
| Inventory | Reviewed holdings, separate possible matches, dated amounts, exclusions and next tasks | Open the holding/evidence; ₹42,000.00 appears only after its qualifying review |
| Resume | Saved records and open tasks after sign-out/sign-in | Continue without re-entering accepted facts; repeated actions do not create duplicate holdings |

Desktop field review uses two columns: document/page on the left, field label/value/source/review controls on the right. Mobile stacks source and fields with a clear source reference beside each field and an easy return to the preview. Never make drag-and-drop the only upload/review method.

Example field block:

    Statement amount                 Source: bank-current.pdf, page 1
    Proposed: ₹42,000.00             As of: 10 Oct 2026
    [Accept] [Correct] [Reject]      Review status: not reviewed

Correction shows the original and edited value, with a reason when material. Submission feedback says “Review saved” only after the server confirms. Preserve entered values on recoverable validation errors; do not store financial drafts in browser local storage or an offline cache.

## 5. Inventory and discovery

Holding rows/cards show institution, category, masked reference, evidence status, dated value and next action. Detail shows the underlying observations, citations, nomination information and review history. On narrow screens use readable labeled cards rather than compressing a wide table.

Display the four evidence labels in text: **Self-declared, Potential match, Document-backed, Institution-verified**. In reference mode, institution support remains visibly synthetic. Never replace these with a confidence percentage, green check alone, or “ownership confirmed” copy.

The summary title is **“Reviewed value from dated sources.”** Show the policy/as-of context and excluded holdings with reasons. No qualifying observations: “No reviewed value available,” total null. A qualifying evidenced zero can be ₹0.00. Format INR using Indian grouping; units have no currency sign. FD principal, maturity, insurance benefit and past settlement stay distinct from qualifying cash/current value.

Discovery lists sources considered/checked, permitted method, coverage, prerequisite and next owner. Use “No results from the sources checked,” not “No assets exist.” Show potential matches separately with **Review match**; duplicate/conflict resolution uses the existing reviewed flow, never an automatic name-only merge.

## 6. Legacy and claims

### Legacy

Show reviewed record date, missing documents, unknown nomination information, stale records and next review. Trusted contacts are labeled **“Contact intent — no access granted.”** Adding one sends nothing. Snapshot/export preview lists the exact scope, date and gaps; approval/download uses the existing short-lived access rules. Explain that downloaded copies cannot be recalled. Do not offer enabled family invites or post-death release in reference mode.

### Claims

Each claim has its own institution, holding, procedure version, status, owner, missing requirements and next action. The known-asset route opens this workspace without forcing discovery. Claim detail has requirements, pack versions, approval, receipt, institution requests and outcomes.

Before handoff, show exact recipient, channel, purpose, documents/versions, declarations and expiry. The owner/claimant approves; an operator cannot approve on their behalf. Changed inputs, expired approval or revoked authority show **“Approval no longer valid — review the updated pack.”** Do not silently reuse the old approval.

Reference button copy is **“Approve manual handoff”** or **“Download approved pack”**, according to the existing command stage. Never “Submit to bank” when the platform is not submitting. Record a receipt/reference or an explicit unknown outcome; show reconciliation as the next task before any resubmission. Partial settlement shows settled amount and known remaining amount, or **“Remaining amount not confirmed.”** Rejection/dispute has neutral factual copy and help, not success styling. Procedure/authority exceptions link to the assigned review or qualified handoff.

## 7. Shared components and interaction states

Use shared buttons, labeled inputs, evidence badges, status notices, task rows, action cards, document preview/review controls, approval previews and confirmation dialogs. Components receive server-permitted actions and render their states; UI hiding is not authorization.

| State | Presentation and behavior |
| --- | --- |
| Loading | Stable layout with text such as “Loading your case”; no fabricated values or progress percentage |
| Processing | Real saved stage/job status; show that work may continue; avoid duplicate command creation on repeated clicks |
| Empty | Explain what is absent and offer the supported next step |
| Validation error | Inline field message plus linked error summary; retain safe inputs and focus the first error |
| Dependency failure | Say what was saved, what is blocked and whether Retry or Help is appropriate |
| Permission expired/revoked | Remove protected content/actions, explain the needed review/sign-in step; never show another case’s existence |
| Hold | Visible restricted scope, safe reason, next owner and help; no bypass button |
| Unsaved / saving / saved | Distinguish local edits from server-confirmed saved records; do not promise persistence of an unsent draft |
| Stale version | Explain that the record changed and require current review; never silently overwrite |

Dialogs identify the exact effect, use descriptive buttons, support keyboard focus/escape where safe, and return focus to the trigger. A privacy revocation/deletion dialog explains future access/work and already-downloaded-copy limits. Status toasts may confirm routine saves; important errors, holds and approvals stay visible in the page. Staff queues show only assigned items, with reasons/evidence for privileged review.

Use “We need a clearer copy to read this field,” “This is a possible match; review the source,” and “We do not have a confirmed receipt yet.” Do not blame the user or imply guaranteed recovery. UI dates include the date and time zone when time matters; task dates distinguish suggested deadlines from institution-supplied deadlines.

## 8. Accessibility, responsive behavior and design acceptance

Target the PRD’s WCAG 2.2 AA review. Normal text must meet 4.5:1 contrast, large text 3:1, and required control/state visuals 3:1. The 44px target is our usability default; WCAG 2.2 AA’s target-size minimum is 24 CSS px with defined exceptions, not a claim that 44px is that criterion.

Provide semantic headings/landmarks, a skip link, persistent labels, announced status/error messages, keyboard-only operation and visible focus that is not hidden by sticky notices/navigation. Do not use color alone, placeholder-only labels, hover-only instructions or inaccessible custom selects. Retain browser zoom, reflow and text resize; honor reduced motion. No auto-playing speech or simulated microphone activity. Reference UI supports voice and text together; test launch-language text expansion, name/number correction and speech quality before first-release completion.

Before accepting the first UI increment, demonstrate the complete owner/statement/review/inventory/resume path at **1280×800 and 375×812**, keyboard-only core operation, screen-reader spot checks and the LLD automated accessibility threshold. Check the same failure, revoked-access, changed-approval, empty-total and duplicate-request cases as the LLD. Verify actual component contrast and all focus/disabled/error states; token calculations alone are not accessibility certification.

Design implements FL-01/02/03/04/05/06/07/08/09/10/11/12/13/14/15/16/17/18/19/22/23/25/26/28/29/31/34/36/37/39/40/42/43/47/48/49/50/51/55. It does not enable gated F capabilities or change the contract. Product behavior changes enter the PRD before design/code; implementation corrections update the LLD/contracts as needed.

References: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), [contrast guidance](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum). These inform acceptance; no conformance audit has run.

## 10. Voice in the first version

Conversation offers equally clear **Speak** and **Type** controls, supported-language selection and a short processing/privacy explanation before first microphone use. Never start recording on page load. Show explicit states: idle, permission requested, listening, stopped, transcribing, transcript review, assistant thinking, speaking and failed. Listening shows an accessible status and prominent Stop; a waveform alone is insufficient.

The user reviews/corrects recognized text before sending it into the saved conversation. Spoken replies also appear as text. Provide Stop playback and replay only on explicit action; financial details must not be read aloud automatically. Stop microphone and playback on case switch, sign-out or permission revocation. Permission denial, unsupported device, silence, network/provider failure or unsupported language preserves work and offers retry or Type. No simulated recording or fabricated transcription. Consequential approvals stay in the structured review screen. Voice calls to institutions are not part of this control.
