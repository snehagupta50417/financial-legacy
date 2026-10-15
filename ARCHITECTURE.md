# Financial Legacy — How the System Works

Version 0.3 · Plain-language explanation of the reference design · No running system yet

## 1. What this document explains

The [PRD](PRD.md) says what the product must do. This document explains the main parts needed to do it. The [coding handoff](BUILD_SPEC.md) selects the software tools, and the [low-level design](LLD.md) specifies exact records and rules.

A **case** is one person’s goal concerning one financial subject. For example, “find my investments” is a case about the signed-in owner. “Help me claim my father’s mutual fund” is a different case about the father. Their evidence must stay separate.

## 2. The main parts

| Part | Its job | Example |
| --- | --- | --- |
| Web app | Show conversations, documents, reviews, holdings and tasks | The user corrects an extracted account reference |
| Sign-in and permission checks | Establish who is using the app and which actions they may take | An operator can review only assigned cases |
| Application backend | Apply the product rules and save accepted changes | Reject a claim-pack approval if its documents changed |
| Database | Store linked records and their history | Keep a holding, its source document, review and dated value together |
| Private file storage | Keep original documents and generated packs encrypted | Return a document only after checking permission |
| Background worker | Run tasks that take time without blocking the page | Scan a document, propose fields or generate an export |
| Assistant and document-reading adapters | Suggest questions, fields and next actions | Explain why a historical amount is excluded |

An **adapter** is a replaceable connection between our code and a specific service. In the first build, the assistant uses fixed rules and document reading uses sample answers. Later adapters may connect approved external services without changing the permission rules.

Use one backend divided into modules, with one database and a worker that shares its code. A module is a group of related functions, such as documents or claims. We do not need separate independent services for every module or an autonomous agent for each task.

## 3. Example: a statement becomes a holding

1. The user signs in and opens their case.
2. The backend checks membership and allows the required evidence upload. Upload must work before verification is complete, because the evidence may be needed for verification.
3. The file enters quarantine: private storage where it cannot yet be used for extraction.
4. The worker checks file type, size, content and malware-scan result. Failure produces a visible reason and a next step. A scanner outage does not mean a file is safe.
5. The document reader proposes fields with page references. It does not directly create confirmed financial facts.
6. The user or assigned reviewer compares the proposals with the source and accepts, corrects or rejects them. Institution-supported status needs the specified reviewer and attributable evidence.
7. The backend saves the accepted holding and dated value together. It keeps the original source and review history.
8. The inventory includes only values allowed by the summary rules. Possible matches, duplicates, historical-only amounts and unresolved conflicts remain visible but excluded.

An empty eligible set means “no reviewed value available.” It does not prove the person has no money. An evidenced eligible zero can be displayed as ₹0.

## 4. Example: holdings become a legacy record

The app builds a checklist from reviewed holdings and missing information. The user reviews the gaps and saves a dated snapshot: a frozen copy of the record at that point in time.

A trusted contact is an instruction about intended sharing. Recording the contact gives them no access and sends no message. The first build allows an approved user export. Lifetime sharing and release after death remain disabled until their separate rules and tests are accepted.

An export is a copy. Changing or deleting the original cannot recall a copy someone already downloaded.

## 5. Example: a known holding becomes a claim

1. The claimant selects a known holding; discovery is unnecessary.
2. An assigned reviewer checks identity, relationship and permission to perform the required action. These are separate checks.
3. The claim uses a reviewed procedure for the institution and asset category. The app shows missing and accepted documents.
4. The worker prepares a claim pack from specific document versions. The authorized user sees the recipient, purpose, documents and declarations before approving.
5. In the first build, the platform prepares a manual handoff. It does not submit to the institution. Simulated receipts and responses are recorded as such.
6. A receipt, additional request or outcome updates that claim’s history and next tasks. A partial settlement leaves the remaining work open. An unknown remainder stays unknown.

If an outside submission may have been accepted but there is no receipt, the status is unknown. Check what happened before attempting another submission. A timeout is not proof of failure.

## 6. Rules that apply everywhere

**Permission follows the record.** API requests, searches, file reads and background tasks must all check the current case and action. Knowing a record ID is not permission to read it. A database isolation rule is an extra barrier; it does not replace these checks.

**The assistant suggests; application code enforces.** The assistant cannot grant access, decide inheritance, approve its own disclosure or treat an instruction inside a document as permission.

**Accepted changes and work requests are saved together.** The backend writes the change and a pending-work record in one database transaction: both succeed or neither does. This pending-work pattern is called an outbox. The worker can resume it after a restart.

**Repeated requests must be safe.** An idempotency key identifies one intended change. Retrying the same request returns its earlier result; reusing the key for different content fails. A version check also prevents someone from overwriting newer edits with an old screen.

**Permission is checked again before delayed work.** Revocation or a hold may happen after a task was queued. A hold is a recorded restriction while a dispute or uncertainty is resolved. Completed disclosures cannot be undone; the app records that limit honestly.

**Data has a lifecycle.** A deletion request stops access and queued work, then tracks which files and derived records were removed or remain under a justified hold. A deletion marker prevents an old backup from silently restoring deleted information.

## 7. What is available now and later

The first implementation uses generated sample documents, local sign-in, encrypted local storage, rule-based conversation and sample extraction. It needs no cloud credentials and has no real external financial effects.

Voice, family access, post-death release, other asset categories, live retrieval, direct submission and automated follow-ups each remain behind a separate release gate. A release gate is a list of permissions, policies and tests that must pass before enabling the capability.

The [acceptance plan](ACCEPTANCE.md) describes the evidence needed. Documentation is not proof those checks have passed.
