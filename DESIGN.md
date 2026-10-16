# Financial Legacy — Product Design

*How the product looks, reads and behaves.*

| | |
| --- | --- |
| **Version** | 0.3 (draft for review) |
| **Date** | 17 October 2026 |
| **Sources of truth** | [ONE_PAGER.md](ONE_PAGER.md) → [PRD.md](PRD.md) (behaviour and scope) → [LLD.md](LLD.md) (data, permissions, workflow) → this document (presentation and interaction). Design never adds features or bypasses a permission. |
| **Describes** | The target design for the MVP, mapped onto the real app in [`frontend/`](frontend/) (a single-page Next.js app). Where the app differs today, this document says so. |

---

## 1. Design direction

Calm, readable and practical. At every moment the person should understand **whose records they are looking at, what is known, what still needs checking, and what to do next**.

- **Conversation and the next task come first** — not charts or a wealth score.
- **Plain language.** One main action per area; technical detail behind a clearly named "More detail".
- **Evidence, authority and outcome are different things.** Never a single "verified case" badge.
- **Progress means saved steps and open tasks**, never a percentage implying every asset has been found.
- **Respect after a death.** Gentle wording; never celebrate a rejected or disputed outcome; never ask for the same sensitive fact twice.
- **Designed for older users and Indian-language speakers** as a priority, by voice or text.
- **Honest labelling.** Anything simulated (mock identity checks, demo data) is visibly labelled **"Simulated"**. Until real data is allowed, every case screen and every export or pack shows: **"Demonstration — synthetic records. No real identity verification, asset discovery or claim submission."**

Implements PRD FL-01, FL-02, FL-07, FL-09, FL-17, FL-22, FL-39, FL-40, FL-50; voice FL-20, FL-41.

---

## 2. Navigation and page structure

### 2.1 Today's app

`frontend/` is a single page with four views: **landing → intake (chat) → case workspace → official resources**. The workspace has a trust-gate panel above six tabs: Overview, Asset Inventory, Documents, Journey Tracker, Estate Planning, Expert Escalation.

### 2.2 Target structure for the MVP

| Area | Purpose | Today's equivalent |
| --- | --- | --- |
| **My cases** | List of the person's cases: subject, goal, state and next task. **New case** and **Continue**. No balances or document previews in another case's card. | Landing / "my cases" dialog |
| **Conversation** | Saved messages, a short summary of reviewed facts, the next task and action cards. Default entry to a case. | Intake view; Ask panel |
| **Records** | Documents, discovery plan and assets as labelled sub-views | Documents, Asset Inventory tabs |
| **Plan** *(living person)* or **Claims** *(deceased person)* | Legacy record, or one card per claim | Estate Planning; Journey Tracker (partly) |
| **Tasks** | Owner, due date, waiting-on, blocked state, next action | Journey Tracker |
| Case menu | Verification (trust gates), activity history, privacy and consent | Gate panel; no activity/privacy screens yet |
| Help | Talk to a person; official resources | Expert Escalation; Resources view |

Only the destination that fits the case's goal is shown (Plan **or** Claims). A blocked action links straight to the step that unblocks it. Moving to separate URLs per area (e.g. `/cases/{id}/records`) is recommended so pages can be bookmarked, shared with support and tested; until then the single-page views are acceptable.

### 2.3 Layout

- **Desktop:** sidebar about 224 px; main content up to 1280 px; 24–32 px padding. Conversation column up to 760 px, with evidence or tasks beside it when there's room.
- **Mobile:** single column, 16 px padding, the four main areas in a bottom navigation; secondary actions in the case menu. Bottom controls must never cover content or the focused element.
- Switching case or signing out clears the old case from the screen before showing the next one.

---

## 3. Visual foundations

### 3.1 Tokens

These are the **target** tokens: navy, cream and restrained gold, matching the repository banner. The current app uses a different theme (navy `#0a2540` on `#f7f8fa`, teal accent, with a dark mode). **Decision needed:** adopt these tokens, or document the app's current theme as the standard. Either way, every colour pair must pass the contrast checks in §8.

| Token | Value | Use |
| --- | --- | --- |
| page | `#F5F2E9` | Page background |
| surface | `#FFFFFF` | Forms, review panels, task cards |
| text | `#102E32` | Main text and headings |
| muted | `#475569` | Secondary text |
| primary | `#145D55` | Main action, white text |
| border | `#64748B` (controls), `#D6DDD8` (non-essential dividers) | Boundaries |
| focus | `#2563EB` | 3 px visible outline with 2 px light gap |
| accent | `#D6C39A` | Decorative only — never text or status |
| info | `#1D4ED8` on `#EFF6FF` | Pending, informational |
| caution | `#92400E` on `#FFFBEB` | Needs review, incomplete, potential match |
| danger | `#B91C1C` on `#FEF2F2` | Blocked, error, destructive |
| success | `#166534` on `#F0FDF4` | One specific completed step only |

### 3.2 Type and spacing

- System font stack. Body 17 px / 1.55; labels 16 px; helper text at least 14 px; page title 28–36 px; section title 20–24 px. Sentence case.
- Spacing scale 4 / 8 / 12 / 16 / 24 / 32 / 48 px. Cards: 12 px radius, 24 px padding (16 px on mobile). Avoid dense grids and nested cards.
- Primary buttons filled; secondary outlined; links underlined in text. Buttons and inputs at least 44 px tall.

---

## 4. Trust gates — what the person sees

**LLD §7. Built** in `components/fl/gate-panel.tsx`.

A stepper shows the gates the case needs, each with its current state and latest proof:

| Step | What the person does | What they see after |
| --- | --- | --- |
| **Identity** (G1) | Verify with DigiLocker, or passport + selfie if abroad *(both "Simulated" in v0)* | "Identity confirmed" with method and date |
| **Death** (G2) | Fetch the death record, or scan the certificate | If details differ: a **"You entered / Record says"** table and "Sent for review" — never an automatic rejection |
| **Relationship** (G3) | Upload own document naming the deceased, or a legal-heir certificate; for a living parent, the parent's consent | "Discovery unlocked" |
| **Entitlement** (G4, per asset) | On a masked asset card: **Prove entitlement** (nominee / joint holder / heir certificate) | Full details and the claim pack for that asset |

States and copy:

- **Before G3:** Records tabs show a locked state — *"Assets and documents unlock once you've confirmed your relationship. This protects the family's privacy."*
- **Masked asset (below G4):** institution, type, value band and last 4 digits only — *"Masked — full details after you prove you may claim this asset."*
- **Frozen case:** *"This case is paused for review. Someone else has opened a case for the same person. Our team will contact you."* No bypass button.
- Gates explain **why** each proof is needed, in one sentence, before asking.

---

## 5. The pilot journey, screen by screen

The pilot focuses on bereaved families ([PRD Journey C](PRD.md#53-journey-c--find-and-claim-after-a-death)). This is the first journey to make complete.

| Screen | What the person sees | Main action → result |
| --- | --- | --- |
| **Start** | "Tell us what happened, in your own words" — Speak or Type | Describe the situation → the assistant confirms the goal and whose assets these are; the person can correct it |
| **Known assets?** | "Do you already know which accounts or policies to claim?" | Yes → straight to Claims (no discovery). Not sure → discovery after the gates |
| **Gates** | Identity → Death → Relationship stepper (§4) | Each step saved; mismatches go to review |
| **Documents** | Upload with stages: received → checking → reading → ready for review | Unsupported or unreadable file → clear reason and retry, never a fake success |
| **Field review** | Document page beside proposed fields, each citing its page | Accept / Correct / Reject each critical field |
| **Discovery plan** | Which official searches fit this case, what each covers and doesn't | Open the official portal → come back and log the outcome |
| **Inventory** | Holdings by evidence status; potential matches separate; dated values | Open a holding to see evidence and next step |
| **Claims** | One card per asset: path (nominee / joint / simplified / succession), procedure, missing items, owner | Prove entitlement → build pack → review → approve → download |
| **Tracking** | Timeline per claim; tasks showing who it's waiting on | Record receipt, institution requests, outcome |

**Field review layout:** desktop two columns (document left; fields with source and controls right). Mobile stacks them, with a source reference beside each field and an easy way back to the page. Drag-and-drop is never the only way to upload.

```
Sum assured                        Source: LIC_policy.pdf, page 1
Proposed: ₹5,00,000                Nominee: Sunita Sharma
[Accept] [Correct] [Reject]        Review status: not reviewed
```

A correction shows the original and the new value and asks for a reason when it matters. "Saved" appears only after the server confirms. Financial drafts are never kept in browser storage.

---

## 6. Inventory and discovery

- Each holding shows **institution, type, masked reference, evidence status, dated value and next action**. Detail shows observations, citations, nominee information and review history. On narrow screens use labelled cards, not a squeezed table.
- **Evidence status is always written in words:** *Self-declared · Potential match · Document-backed · Institution-verified*. Never only a colour, a tick or a confidence percentage. Potential matches use the caution style and a **Review match** button.
- **Summary title:** "Reviewed value from dated sources", with the as-of context and a list of excluded holdings and why. No qualifying values: **"No reviewed value available"** — never ₹0.
- **Amounts mean different things:** FD principal and maturity, insurance **sum assured**, fund **units** and past settlements are shown with their own labels and are not added to the cash/current-value total. Indian digit grouping (₹5,00,000); units have no ₹ sign.
- **Discovery** lists each source considered: method, what it covers, what it needs, who acts next, and its outcome. Wording: **"No results from the sources checked"** — never "No assets exist".
- Duplicates are offered for review; never merged automatically on name alone.

---

## 7. Legacy and claims

### 7.1 Legacy (living person)

- Show the record date, missing documents, unknown or outdated nominees, stale records and the next review date.
- Trusted contacts are labelled **"Contact intent — no access granted"**. Adding one sends nothing.
- Snapshot and export preview list the exact contents, date and gaps; export needs approval; the download link is short-lived. Explain that downloaded copies can't be recalled.
- **Change from today:** the current Estate Planning tab drafts a will with AI. The PRD rules out drafting legally binding wills, so this becomes **"Notes for your lawyer"**: a structured summary of assets and wishes, clearly marked as not a will.
- No family invites or after-death release in the MVP.

### 7.2 Claims (deceased person)

- Each claim card: institution, holding, claim path, procedure version and date checked, status, owner, missing items, next action. A known-asset claim opens here directly.
- Insurance claims use insurance wording (policy, sum assured, nominee, claim form); bank and fund claims use theirs.
- **Before handoff:** show exact recipient, channel, purpose, documents and versions, declarations and expiry. Only the claimant approves.
- Changed inputs, expiry or revoked authority: **"Approval no longer valid — review the updated pack."**
- Button copy: **"Approve manual handoff"**, then **"Download approved pack"**. Never "Submit to bank" — the family submits.
- After handoff: record a receipt or reference, or mark **"We don't have a confirmed receipt yet"** — reconcile before re-sending.
- Partial settlement shows the settled amount and the known remainder, or **"Remaining amount not confirmed"**. Rejection or dispute uses neutral wording with help, never success styling.

---

## 8. Shared states, accessibility and acceptance

### 8.1 States every screen handles

| State | Behaviour |
| --- | --- |
| Loading | Stable layout, "Loading your case"; no made-up values or percentages |
| Processing | Real saved stage; repeated clicks don't create duplicates |
| Empty | Say what's missing and offer the next step |
| Validation error | Inline message plus summary; keep safe input; focus the first error |
| Something failed | Say what was saved, what's blocked, and offer Retry or Help |
| Locked by a gate | Explain which proof unlocks it and link to it (§4) |
| Permission expired or revoked | Remove protected content; explain the step needed; never reveal another case exists |
| On hold / frozen | Show what is restricted, a safe reason, who acts next and Help; no bypass |
| Stale version | "This record changed — please review the latest version"; never silently overwrite |

Dialogs name the exact effect, use descriptive buttons, support keyboard and Escape where safe, and return focus. Toasts only for routine saves; errors, holds and approvals stay on the page. Dates show the time zone when it matters; suggested deadlines are labelled differently from institution deadlines.

**Tone examples:** "We need a clearer copy to read this field." · "This is a possible match — please check the source." · "We don't have a confirmed receipt yet." Never blame the user; never imply guaranteed recovery.

### 8.2 Accessibility

- Target **WCAG 2.2 AA** (PRD FL-50): text contrast 4.5:1 (large text 3:1), control and state visuals 3:1. Our 44 px target size is a usability default above WCAG's 24 px minimum.
- Semantic headings and landmarks, skip link, persistent labels, announced status and errors, full keyboard use, visible focus never hidden by sticky bars. No colour-only meaning, placeholder-only labels or hover-only instructions. Support zoom, reflow, text resize and reduced motion.

### 8.3 Design acceptance

Before accepting an increment, demonstrate the pilot journey (§5) at **1280×800 and 375×812**: keyboard-only, screen-reader spot checks, automated accessibility checks with no critical or serious issues, and the failure states in §8.1 (gate mismatch, frozen case, unreadable file, changed approval, empty total, duplicate click). Check real component contrast, not just token values.

---

## 9. Voice

**PRD FL-20, FL-41; LLD §14. Not built yet.**

- Conversation offers equally clear **Speak** and **Type** buttons, a language choice and a short privacy note before the first microphone use. Never record on page load.
- Visible states: idle · asking permission · listening (with a prominent **Stop**) · transcribing · review transcript · thinking · speaking · failed. A waveform alone is not enough.
- The person reviews and corrects the transcript before it is sent. Names, account numbers and amounts are highlighted for checking.
- Replies appear as text and can be spoken; **Stop** and **Replay** only on request. Financial details are not read aloud automatically.
- Case switch, sign-out or revoked permission stops listening and playback.
- Permission denied, unsupported device, silence, network failure or unsupported language keeps the person's work and offers **Retry** or **Type**.
- Approvals always happen on the structured review screen, never by voice.

---

## 10. Later capabilities — design notes

Not in the MVP; don't show enabled controls or success states for them.

- **Connectors** (email, tax record, SMS): a "Connect a source" screen with per-source consent, what will be read and what won't, and Disconnect. Mock connectors labelled "Simulated".
- **Verify console** (PRD FL-56) for banks and insurers: a desktop claims queue; claim detail with each check (consistency, authenticity signals, duplicates, completeness) and its evidence; a risk level with reasons; Approve / Request documents / Escalate. Authenticity findings are labelled "signal", never "fake".
- **Family sharing and release:** verified recipients, exact scope and expiry, revocation.

---

## 11. References and changes

References: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), [contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum). No conformance audit has been run.

**Changes in 0.3:**
- Aligned to PRD v0.6.1, BRD v0.3 and LLD v0.5.
- Maps the target structure onto the real single-page app.
- Adds the trust-gate screens and masked-asset states.
- Makes the bereaved-family pilot journey the first journey, adds insurance claims, and replaces AI will drafting with "Notes for your lawyer".
- Adds design notes for Later capabilities and fixes section numbering.
- Removes references to the superseded LLD v0.4 sample data.

Open design decision: which visual theme is standard (§3.1).
