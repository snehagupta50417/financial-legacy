# Keeper — Product Design

Version 0.5.0 · reconciled 18 October 2026. Describes the current Keeper presentation and interaction, plus explicitly marked acceptance work. Replaces the earlier Financial Legacy navigation and navy/teal proposal. Authority: [ONE_PAGER](ONE_PAGER.md) → [PRD](PRD.md) → [LLD](LLD.md) → this document. See [CURRENT_STATE](docs/CURRENT_STATE.md) for the dated audit and limitations.

## 1. Design direction

Calm, readable and practical. Every view should explain whose information is open, what supports it, what still needs checking and what to do next. Conversation and the next task come first. Use plain language, one primary action and supporting sources behind clear disclosures.

Evidence, authority and outcome are separate. Keep the four evidence labels: self-declared, potential match, document-backed and institution-verified. Simulated providers, fictional examples and self-reported outcomes remain distinguishable. Never imply exhaustive discovery, real verification or a payment from model output or a simulated settlement. Respect bereavement.

## 2. Navigation and page structure

### 2.1 Today's app

| Route | Purpose |
| --- | --- |
| `/` | Landing: Find / Prepare / After a death, labelled simulated preview, coverage, FAQ and start actions |
| `/signin` | Entry and configured account sign-in; local Continue/sample entry depend on auth mode |
| `/auth/complete` | Authentication completion screen |
| `/welcome` | Guided fictional example with skip and explicit scope |
| `/app` | Conversation, composer, Call Keeper, return briefing and contextual details |
| `/app/assets` | Holdings, evidence, confirmation, duplicates and authority requirements |
| `/app/documents` | Upload, extraction, field review and document-to-claim progress |
| `/app/claims` | Requirements, pack review/approval, official handoff and recorded outcomes |
| `/app/family` | Saved legacy notes, gaps and contact-scope previews |
| `/app/activity` | Case activity |
| `/app/settings` | Preferences, AI permission and application-data deletion |

Asset/document/claim details open in the shared panel or mobile sheet, not separate `/cases/...` pages. The case selector and conversation list preserve context. Switching case scopes pending requests/actions to their origin and must not expose stale protected content.

### 2.2 Conversation

The canvas keeps a composer with attachment, text, voice and send controls. Welcome introduces one decision at a time. Details start closed until opened; structured views use the same canonical records.

Returning users see **Pick up where you left off**, a case-derived summary, open-work counts and Continue to the actual next record. Closed claims and merged holdings do not inflate counts. Saved messages return after reload; restored history must not replay new-message animation.

### 2.3 Layout

Wide layouts use quiet navigation, a paper conversation canvas and optional context panel. Narrow layouts use a compact identity bar, independent scrolling and safe-area-aware navigation/composer. Controls must not cover focused content. Specific viewport/screen-reader acceptance requires a dated result.

## 3. Visual foundations

### 3.1 Tokens

Current CSS: `frontend/src/app/globals.css`.

| Token | Value | Use |
| --- | --- | --- |
| ivory | `#f5f1e9` | Background |
| paper | `#fbf8f2` | Cards/conversation |
| ink | `#242824` | Main text |
| apricot | `#e8a477` | Primary action, ink text |
| apricot-deep | `#9a4f1e` | Darker apricot text |
| moss | `#526653` | Accent/focus |
| moss-soft | `#e4eadf` | Quiet highlights |
| line | `#ddd5c6` | Borders |
| muted foreground | `#5a5f58` | Secondary text |

Historical navy/teal tokens are superseded. Token contrast comments are references, not a complete conformance audit. Status uses text alongside colour.

### 3.2 Type and spacing

Fraunces anchors display headlines; Instrument Sans supports application text. Body CSS uses 17px/1.6. Use restrained elevation, fine borders, readable source metadata and generous spacing. Target 44px controls and visible keyboard focus. Use disclosure/simpler wording instead of shrinking helper text to fit.

## 4. Trust gates — what the person sees

G0–G4, masking and freeze rules are deterministic. Account sign-in is separate from financial authority. Identity/death/relationship and per-holding entitlement providers are simulated. Locked/disconnected states explain the missing check and preserve work; no successful real-verification badge is implied. A death certificate alone does not prove entitlement.

## 5. Journeys, screen by screen

### 5.1 Find and claim after a death

Conversation → applicable gates → upload/source review → holding confirmation → draft/authority requirements → documents and declarations → exact pack review/approval → official handoff → recorded submission/updates → outcome. Known holdings skip discovery, never authority gates. External submission remains the person's action.

### 5.2 Find my assets

Collect leads, review documents, confirm holdings and record scoped official searches. A no-match covers the recorded search only. Amounts retain source, type and date.

### 5.3 Prepare for my family

Save family notes, asset gaps and contact-view intentions. Previews are not live invitations, sharing or access grants. Snapshot export and verified release remain future capabilities.

### 5.4 Field review

Show stored redacted source text/excerpts beside proposed values, with accept/correct/reject and history. Upload originals are extracted but not retained as downloadable originals; do not promise a permanent original-file viewer. Critical-field review and holding confirmation remain explicit user decisions.

**Document to claim** shows extraction, source review, holding confirmation, authority, pack preparation and institution verification. States read Complete, Your review, Pending or With institution. The next action opens the relevant document, asset or claim. Recheck and prepare preserves saved review and avoids duplicate drafts.

Reviewed supporting evidence plus a confirmed holding in a death case can prepare a draft automatically. An eligible reviewed policy can fill its exact requirement after authority checks. No declaration, approval or submission is accepted automatically.

## 6. Agent progress and evidence

**Work on this case** starts bounded preparation. Show saved receipts, actual checkpoints, pause/resume/recheck and concrete human review targets. Do not show model intention as completed work, fake percentages or always-on monitoring. Conversation requests advance work; returning resumes eligible saved runs.

The evidence explorer links recorded sources, field decisions, holdings and claims. Guided searches remain self-reported. Saved claim reviews have separate durable checkpoints. Completion means preparation finished, not ownership verified or claim resolved.

## 7. Claims, handoff and follow-up

Keep draft, authority review, document collection, pack review, approval, recorded submission and outcomes separate. Approval binds an exact content hash; a changed pack invalidates it. Consequential approval uses the structured screen, not a spoken yes.

Official handoff identifies the institution/portal and the person's next action. General resources are labelled as such. Offer an explicit stay-in-the-loop choice, saved preference and next-check date. Never imply that an external receipt/response or background reminder was fetched automatically. Partial settlement keeps the remainder open.

## 8. States and accessibility

### 8.1 Required failure states

Empty case, locked/frozen access, unreadable/password-protected file, rejected/unreviewed evidence, potential/duplicate holding, missing authority, stale approval, interrupted save and unavailable provider/audio need specific explanations and recovery. Preserve text and saved work; failed actions cannot get success receipts.

### 8.2 Motion

Finite hero entrances, section reveals, story transitions and subtle hover elevation support marketing. App motion uses short route/new-message entrances, details transitions and request-bound thinking dots. No exit delay blocks navigation. Respect `prefers-reduced-motion`, including smooth scrolling and decoration. Initial content remains readable without animation/JavaScript.

### 8.3 Acceptance still required

Measure real component contrast, keyboard navigation, focus visibility/order, screen-reader announcements, touch targets and mobile overflow. Automated tests/build success do not establish WCAG conformance or a complete visual/accessibility pass.

## 9. Voice

Implemented, with limitations in [VOICE](docs/VOICE.md). Explicit capture shows permission, listening, transcribing, thinking, speaking and error states. Stop/retry/type remain available. Manual transcript correction is available, but call turns may advance automatically after endpointing; mandatory review of every turn is not implemented.

Sarvam STT is primary; Gemini can transcribe the same recording; browser recognition is the last fallback. Browser speech/Gemini TTS provide output as configured/available. Latest Gemini TTS exhausted quota; Sarvam TTS is not yet a reply fallback. Preserve text and show audio-unavailable notice. Permissions cannot be bypassed. Language choices do not guarantee device voices or accuracy.

## 10. Later capabilities — design notes

Real institutional verification/connectors, automatic submission, verified contact sharing/release, snapshots/exports, operator console and guaranteed background reminders remain outside local acceptance. Do not show enabled controls implying these work.

## 11. References and changes

0.5.0 replaces conflicting prototype routes, theme, browser-only persistence and demo-only assistant descriptions; adds return briefing, bounded agent progress, document-to-claim continuity, handoff and voice failures. It certifies neither production readiness nor accessibility. Earlier design revisions remain in Git history.
