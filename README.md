# Financial Legacy

<p><img src="assets/financial-legacy-banner.svg" alt="Financial Legacy — find what’s yours, make sure nothing gets left behind" width="100%"></p>

**Help people in India find financial assets, organize records for their families, and work through financial claims.**

Financial information is often spread across banks, investment companies, employers and insurers. A person may forget an old investment. After a death, their family may not know where to look or which documents to submit.

Financial Legacy brings that work into one place. A person explains what they need in a conversation. The app keeps the records, shows the evidence, and tracks the next step.

## What people can use it for

| I want to… | What the app helps me do | What I get |
| --- | --- | --- |
| Find my assets | Review documents and follow the available search routes | A list of supported holdings, possible matches and unanswered questions |
| Prepare for my family | Organize financial records, missing information and contact instructions | A dated record and a preparation checklist |
| Handle a relative’s assets after death | Establish permission to act, collect documents and prepare institution-specific claims | Separate claim records with requirements, follow-ups and outcomes |

Someone who already knows the asset can start a claim immediately. Discovery is optional.

## What we are building first

We are at the specification stage. There is no running application in this repository yet.

The first build uses **made-up records only**. It covers bank accounts, fixed deposits and mutual funds across all three paths above. People sign in, upload the supplied sample documents, review the extracted information, and use it in an inventory, legacy record or claim.

The first assistant follows fixed rules. The document reader returns known results from the supplied samples. These let us test the workflow before connecting an external AI service. They do not prove real AI quality or real financial access.

The app will not send claims, contact institutions, email family members or retrieve real accounts in this build. For claims, it prepares a reviewed pack and records a simulated manual receipt and outcome.

The wider product includes other investments, insurance, retirement benefits and lockers; voice; family sharing; and permitted financial connections. Each needs its own release checks before it can be used. The [PRD](PRD.md) keeps that complete scope.

## How a record moves through the app

**Upload a document → check that it is safe → propose its fields → review the source → save the accepted information → show the next action.**

For example, a sample statement shows ₹42,000 dated 10 October. The user reviews the account reference, owner, amount and date. An assigned reviewer checks institution support before the holding can receive that evidence label. The app then shows a dated value, not a live bank balance.

A possible name match stays separate. An old deposit principal does not become today’s balance. When no value qualifies, the app says no reviewed value is available; it does not assume ₹0.

## Rules we must preserve

- An asset match does not establish inheritance or permission to claim it.
- Every important financial value must have a source, type and date.
- People can access only cases and records they are allowed to see.
- Before a handoff or download, the authorized user reviews the exact content, recipient and purpose.
- Adding a trusted contact sends nothing and gives them no access.
- Failed requests and repeated clicks must not create duplicate records or actions.
- The app assists with records and procedures. Institutions decide their own verification and claim outcomes.

## Read the documents in this order

| Document | The question it answers |
| --- | --- |
| [One-pager](ONE_PAGER.md) | What is the product, and why does it matter? |
| [PRD](PRD.md) | What must it do, what is outside scope, and how will we know it works? |
| [Architecture](ARCHITECTURE.md) | What are the main parts, and how do they work together? |
| [Coding handoff](BUILD_SPEC.md) | What should a developer build first, using which tools and rules? |
| [Low-level design](LLD.md) | What records, permissions and state changes must the code use? |
| [Acceptance checks](ACCEPTANCE.md) | Which normal and failure cases must pass? |
| [Roadmap](ROADMAP.md) | What comes first, and what must wait? |

The [API format](contracts/openapi.json), [database structure](contracts/schema.sql) and [sample data](contracts/fixtures.json) give the exact engineering rules. Their technical names are for implementation; the documents above explain what they mean.

## Start coding

Start B-01 in [BUILD_SPEC.md](BUILD_SPEC.md). Build one complete journey first: sign in → upload the sample statement → review its fields → save the holding → sign out and resume.

Then extend the same foundation to legacy preparation, claims and the remaining first-release requirements. Do not build future features merely because their names appear in a contract.

**The PRD controls scope.** Change it before adding product behavior. Never commit real financial records, identity documents, family evidence or credentials.

---

Specification v0.3 · India-focused · First build: synthetic records only
