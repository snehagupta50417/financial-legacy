# Financial Legacy — Product Requirements Document (PRD)

**An AI-native financial asset discovery, legacy planning and recovery platform.**
*Find what’s yours. Make sure nothing gets left behind.*

| | |
| --- | --- |
| **Version** | 0.6.3 (draft for review) |
| **Status** | Complete draft, awaiting product-owner review |
| **Source of truth** | [ONE_PAGER.md](ONE_PAGER.md). Where this PRD and the one-pager disagree, the one-pager wins and this PRD is corrected. |
| **Related documents** | [BRD.md](BRD.md) — business case · [LLD.md](LLD.md) — how it is built · [DESIGN.md](DESIGN.md) — screens and interaction · exact data formats: the Prisma schema and Zod types in [`frontend/`](frontend/) (LLD §5) |
| **Product status** | Partly built, on synthetic data only, with no live integrations — see [LLD §20](LLD.md#20-gap-analysis-against-the-prd-mvp) for what exists. Nothing in this document claims a capability already works. |

---

## Contents

1. [Summary](#1-summary)
2. [The problem](#2-the-problem)
3. [Vision, goals and non-goals](#3-vision-goals-and-non-goals)
4. [Who it is for](#4-who-it-is-for)
5. [User journeys](#5-user-journeys)
6. [Product principles](#6-product-principles)
7. [How the product works](#7-how-the-product-works)
8. [Scope: asset coverage and releases](#8-scope-asset-coverage-and-releases)
9. [Functional requirements](#9-functional-requirements)
10. [AI and voice requirements](#10-ai-and-voice-requirements)
11. [Non-functional requirements](#11-non-functional-requirements)
12. [Data, sources and integrations](#12-data-sources-and-integrations)
13. [Success metrics](#13-success-metrics)
14. [Feasibility, assumptions and risks](#14-feasibility-assumptions-and-risks)
15. [Release plan and launch criteria](#15-release-plan-and-launch-criteria)
16. [Open decisions](#16-open-decisions)
17. [Glossary, change control and references](#17-glossary-change-control-and-references)

### How to read this document

- **Sections 1–8** say *what* we are building and *why*. Anyone in the company should be able to read them.
- **Sections 9–12** are the detailed requirements. Each has an ID such as **FL-07**. Every screen, API, test and design decision should trace back to one of these IDs.
- **Sections 13–17** say how we will know it works, what could go wrong, and what is still undecided.
- Requirement release tags: **MVP** = built and tested first on sample data, then used in the Pilot; **Later** = the full vision, switched off until its own checks pass; **MVP → Later** = a basic version now, extended later. The **Pilot** is a stage (the MVP used with real people and real data, §15.2), not a separate tag.

---

## 1. Summary

People's money ends up scattered across banks, fund houses, insurers and government schemes. They forget some of it, lose the paperwork for more of it, and rarely keep nominee details up to date. When someone dies, their family must first work out **what exists** and then **claim each asset separately**, institution by institution. India has useful pieces — RBI UDGAM, SEBI MITRA, DigiLocker, Account Aggregator, IEPF — but no single process that ties them together.

Financial Legacy is an **AI assistant that manages the whole case**, not a dashboard. A person describes their situation by voice or chat. The assistant works out what they need, establishes who they are and what they are allowed to see, finds assets through permitted sources and the documents they provide, builds one evidence-backed inventory, and then either prepares a legacy record for their family or prepares and tracks the claims — until each case reaches a documented outcome.

It does three things, which work together or on their own:

| Capability | In one line |
| --- | --- |
| **Discover** | Find known, forgotten or unclaimed assets through permitted sources. |
| **Plan a legacy** | Organise your financial life now so your family can find it later. |
| **Claim and recover** | Help an authorised person claim a deceased person's assets, step by step. |

The first version (MVP) covers **bank accounts and fixed deposits, mutual funds, and life insurance**, offers **voice and chat**, and serves **all three journeys**. It works from documents the user uploads and from official search facilities the user can lawfully use; it does not depend on integrations we have not yet secured.

---

## 2. The problem

### 2.1 What happens today

Over a lifetime, a person accumulates bank accounts, fixed deposits, mutual funds, shares, insurance policies, provident fund, pension and other investments. Over time:

- They **change jobs, cities, phone numbers and banks**, so institutions lose touch with them.
- They **lose documents** and **forget** smaller or older investments.
- They **don't update nominees** after marriage, divorce, a death in the family or a move.

When the person dies, the family faces two separate problems.

| | Problem | What it looks like |
| --- | --- | --- |
| **1** | **Discovery** | "We know Papa had an SBI account. Did he have mutual funds? Insurance? An old FD from his first job?" Nobody knows the full list or where things are held. |
| **2** | **Recovery** | Even for assets they know about, each institution has its own forms, its own document list, its own identity checks and its own timelines. Families repeat the same work many times, often while grieving. |

The same discovery problem also affects **living people**: someone who invested years ago and cannot remember where.

### 2.2 Why this is hard to solve (first principles)

1. **There is no single register of what a person owns.** Records live inside each institution. Any product that promises to "find everything" is promising something no one can currently deliver.
2. **Existing tools each solve one slice.** UDGAM searches certain unclaimed bank deposits; MITRA traces inactive mutual fund folios; IEPF covers certain unpaid dividends and shares; DigiLocker shares documents; Account Aggregator shares financial data with consent. None of them covers the whole problem, and each has its own rules about who may use it.
3. **Knowing an asset exists is not the same as having the right to it.** Nominees, legal heirs, executors and joint holders have different rights depending on the asset and the law. A death certificate alone does not unlock every account.
4. **The work is long, procedural and emotional.** A claim can take months, with document requests, rejections and follow-ups. The family needs something that remembers the case and keeps it moving.

### 2.3 The result

Some assets stay **forgotten or unclaimed**, and families spend significant time and money navigating financial and legal procedures — often giving up on smaller amounts.

### 2.4 Why now

- **Official building blocks now exist** (UDGAM, MITRA, DigiLocker, Account Aggregator, IEPF) that a coordinator can route people through.
- **AI can now read messy documents** — statements, policy bonds, certificates — and explain procedures in plain language.
- **Voice AI in Indian languages** makes the product usable by older people who find portals difficult.

---

## 3. Vision, goals and non-goals

### 3.1 Vision

Someone should be able to open the product and say any of these, and be guided to the end:

> "I want to know what financial assets I have."
>
> "I want to make sure my family can find everything when I'm gone."
>
> "My father passed away. Help me find and claim what he left behind."

We do not replace banks, regulators or courts. We become **the intelligent coordination layer** between families and the institutions they must deal with.

### 3.2 Goals for the MVP

| # | Goal | How we will know (see §13 for definitions) |
| --- | --- | --- |
| GO-1 | A person can describe their situation in their own words (voice or chat) and be put on the right path without filling in a long generic form. | Share of started cases that reach the correct journey without the user having to restart. |
| GO-2 | Every asset we show is backed by evidence and labelled honestly. | 100% of shown assets carry a status (self-declared / potential match / document-backed / institution-verified) and a source. Zero cases of a possible match shown as confirmed. |
| GO-3 | A user gets a **useful result quickly**: a reviewed inventory, a legacy checklist, or a ready-to-review claim pack. | Share of cases reaching a first useful result, and median time to get there. |
| GO-4 | Claims for the three MVP asset types are prepared correctly the first time. | Share of claim packs that the institution accepts without asking for missing documents. |
| GO-5 | Users trust the product with sensitive information. | Users approve every important action; zero unauthorised disclosures; trust measured in research. |

### 3.3 Non-goals — what we will not do

These boundaries come from first principles about trust and law, not from lack of ambition.

| We will not… | Why |
| --- | --- |
| Promise to find **every** asset | No complete register exists. We show what we checked and what we did not. |
| Decide who is **legally entitled** to inherit | That is for the law, institutions and courts. We organise evidence and route disputes to qualified help. |
| Hold, move or pay out **money**, or execute trades | Institutions settle claims directly with the rightful person. |
| Give **investment, tax or legal advice**, or draft a legally binding will | Different licences and liability. We may explain procedures in plain language. |
| Ask for **bank passwords, PINs or OTPs**, or bypass any access control | Unsafe, and against institution rules. |
| Release a person's information because they **went quiet** or we **guessed** they had died | Death and authority must be evidenced and reviewed. |
| Submit anything to an institution **without the user's explicit approval** | The user stays in control of every consequential action. |
| **Sell or share** users' financial data for profit | The business earns from services, not data (see [BRD.md](BRD.md)). |

Out of scope for the product entirely: real estate, physical valuables, cryptocurrency, debts and liabilities, business ownership, and assets held outside India.

---

## 4. Who it is for

The product serves **everyone with Indian financial assets** who needs one of the three journeys. Who exactly we approach first for the pilot is a go-to-market decision recorded in [BRD.md](BRD.md); it does not narrow who the product supports.

### 4.1 Personas

| Persona | Situation | What they say | What they need from us | Journey |
| --- | --- | --- | --- | --- |
| **Arjun, 38 — the forgetful investor** | Moved cities twice; bought mutual funds and a policy years ago; has an old bank account he never closed. | "I remember investing in mutual funds a few years ago, but I don't remember where." | A single, honest view of what he owns, what might be his, and what to check next. | Discover |
| **Kamala, 67 — the careful planner** | Retired teacher with FDs in two banks, a pension and an LIC policy. Worried her children won't know where things are. | "I want to make sure my children know where my money and investments are." | A clear, dated record of her assets, which nominees are missing, and a safe way to tell her family — when she chooses. | Plan a legacy |
| **Rohit, 34 — the grieving son** | His father died last month. Found some bank statements and a policy bond. Mother is the nominee on some things, not others. | "My father passed away. We know he had a few bank accounts, but we're not sure about his investments or insurance policies." | Help finding what his father owned, understanding who can claim what, and getting each claim filed and tracked. | Claim and recover |
| **Rohan, 45 — helping a parent** | Helps his 74-year-old father manage paperwork. | "Can I help Dad organise this?" | To help **only as far as his father allows**, with every action recorded. | Plan a legacy / Discover (on someone's behalf) |
| **Priya, 41 — family abroad** | Lives in London; her late mother's accounts are in Kochi. | "How do I claim from India while I live in the UK?" | The same help, plus clarity on which steps need extra documents because she lives abroad. | Claim and recover |

Older users, users who prefer an Indian language, and users who are grieving are **design priorities**, not edge cases: the product must be patient, plain-spoken and usable by voice.

### 4.2 Roles inside the product

A **role** is what someone is allowed to do in a particular case. The same person can hold different roles in different cases.

| Role | Who | What they can do |
| --- | --- | --- |
| **Owner** | A living person managing their own finances. | Everything in their own case. Nobody else sees their records unless they explicitly allow it. |
| **Claimant** | Someone acting on a deceased person's assets (nominee, legal heir, executor, joint holder). | Act within the authority their evidence supports, asset by asset. |
| **Helper** | Someone assisting a living person (for example, a son helping a parent). | Only what the person has consented to, for as long as the consent lasts. Paying for or opening a case gives no automatic access. |
| **Trusted contact** | Someone a planner names for the future. | **Nothing**, until a separate, verified sharing or release step happens. Being named is not access. |
| **Operator** | Our trained staff who review difficult cases. | Only the cases assigned to them, with every action recorded. |
| **Support** | Our help-desk staff. | Help with the product; no general access to financial documents. |
| **Professional** *(Later)* | A lawyer, CA or other permitted adviser the family brings in for a complex case. | Only the case items the family explicitly shares with them, for a set time. Until this role exists, complex cases are handed off outside the product (FL-17). |

### 4.3 What every user needs, whatever their journey

- **To be understood** without learning financial jargon.
- **To see why** the product asks for each piece of information.
- **To stay in control** — nothing important happens without their approval.
- **To know what's true** — the difference between "we found this", "this might be yours" and "the bank confirmed this".
- **To pick up where they left off**, without repeating sensitive answers.
- **To get a human** when the situation is unusual, disputed or emotionally hard.

---

## 5. User journeys

Each journey starts with the person describing their situation, and ends with something concrete they can use. A journey can be paused and resumed at any point; the product remembers the case.

### 5.1 Journey A — Discover my own assets

*Persona: Arjun. "I remember investing in mutual funds a few years ago, but I don't remember where."*

| Step | What happens | What the user sees |
| --- | --- | --- |
| 1. Describe | Arjun explains what he remembers, by voice or chat. The assistant confirms this is a discovery case about himself. | A short summary of what he said, which he can correct. |
| 2. Verify | He confirms his identity to the level the chosen sources require, and consents to each search. | What each check is for and what data it uses. |
| 3. Gather | He uploads what he has (old statements, CAS, policy bonds), or declares what he remembers. | Each document's extracted details, with the page they came from. |
| 4. Search | The assistant proposes a discovery plan: which official facilities (e.g. UDGAM, MITRA, insurer unclaimed-amount search) fit his situation, and which institutions to ask. He approves each search. | The plan, what each source covers, and what it does **not** cover. |
| 5. Review | Possible matches and duplicates are shown for him to accept, correct or reject. | Holdings labelled self-declared / potential match / document-backed / institution-verified. |
| 6. Result | A consolidated inventory, plus a list of what still needs checking and how. | Confirmed holdings, potential matches, and open leads — kept separate. |

**Done means:** Arjun has a reviewed inventory with dated evidence and an honest statement of which sources were checked. "Nothing found" is never presented as "you have nothing".

### 5.2 Journey B — Plan my legacy

*Persona: Kamala. "I want to make sure my children know where my money and investments are."*

| Step | What happens | What the user sees |
| --- | --- | --- |
| 1. Describe | Kamala says what she wants. She can start fresh or reuse an inventory from Journey A. | Her goal, confirmed. |
| 2. Build the record | She adds accounts, FDs, funds and policies by upload or by telling the assistant. | Her inventory, with evidence status for each item. |
| 3. Find the gaps | The assistant flags missing nominees, outdated nominee details, missing documents and stale records. | A checklist: "LIC policy — nominee not recorded", "SBI FD — statement older than 2 years". |
| 4. Fix what she can | For each gap the assistant explains the institution's process to update it. (Kamala makes the change with the institution herself.) It also suggests setting a **DigiLocker nominee** and fetching her fund and demat statements into DigiLocker each year — under SEBI's 2025 framework, her nominee is told of her death and can view them. | Plain-language steps for each gap. |
| 5. Name trusted contacts | She records who should be told in future, and what they may eventually see. | A clear note that **naming someone sends nothing and grants no access**. |
| 6. Save and share (optional) | She approves a dated snapshot. She may export it, or — in a later release — share it with a verified person. | The snapshot, its date and its known gaps. |
| 7. Keep it fresh | Reminders prompt her to review the record periodically. | Reminder tasks she controls. |

**Done means:** a reviewed, dated legacy record and an up-to-date preparation checklist. It is not a will and does not transfer anything.

### 5.3 Journey C — Find and claim after a death

*Persona: Rohit. "My father passed away. We know he had a few bank accounts, but we're not sure about his investments or insurance policies."*

| Step | What happens | What the user sees |
| --- | --- | --- |
| 1. Describe | Rohit explains who died and what the family knows. If they already know every asset, **discovery is skipped**. | The case: whose assets, what is known, what is not. |
| 2. Establish authority | Rohit provides the death certificate and evidence of his relationship. The product records, **asset by asset**, whether he is a nominee, legal heir, executor or joint holder — and what each institution will need from him. | What he is allowed to do now, and what is blocked until more evidence arrives. |
| 3. Discover (if needed) | Same as Journey A, but searching for the deceased person's assets, only through sources a claimant may lawfully use. | Possible assets, labelled honestly. |
| 4. Open claims | One claim per asset. Each follows that institution's current procedure. | A claim card for each asset with its own status. |
| 5. Prepare | For each claim the assistant lists the required documents, pre-fills forms from the evidence, and highlights anything missing. | A claim pack to review: exact documents, fields and declarations. |
| 6. Approve and send | Rohit reviews exactly what will be sent, to whom and why, and approves. In the MVP he submits it himself; the product gives him the pack and instructions. | A preview, then a recorded approval. |
| 7. Track | The product tracks acknowledgements, document requests, deadlines and rejections, and prompts the next step. | A timeline per claim, and tasks showing who is waiting on whom. |
| 8. Close | Each claim ends with a recorded outcome: settled, transferred, partly settled, rejected, or unresolved dispute. | A case summary, including anything still unknown. |

**Done means:** every known asset has a documented outcome, and anything unresolved is still tracked. Finding an asset never implies Rohit is entitled to it; entitlement is decided by the institution and the law.

### 5.4 Situations that need special handling

Real families are messy. For each situation below the product must either support it explicitly or **pause that part of the case and hand it to a person** — never guess.

| Situation | MVP behaviour |
| --- | --- |
| Joint account, surviving joint holder | Supported for the MVP asset types where the institution's procedure is known; otherwise handed off. |
| No nominee recorded | Route to the legal-heir procedure for that institution (e.g. legal heir certificate, succession certificate). |
| Nominee has also died | Treated as no-nominee; heirs of the original holder must establish entitlement. |
| Several claimants / family disagreement | Affected assets are put **on hold**; other assets continue. Disputes go to qualified human help. |
| Claimant or heir is a minor | Handed off; requires guardian evidence. |
| Claimant lives abroad | Supported where the institution's process is known; extra documents (e.g. notarised or apostilled affidavits) are listed. Otherwise handed off. |
| Name mismatches across documents | Flagged for review; the user explains or provides supporting evidence. |
| A will exists | Recorded as evidence; executor status noted. We do not interpret or validate the will. |
| Suspected fraud or impersonation | Case placed on hold and reviewed by an operator. |

---

## 6. Product principles

These are the rules we use to decide anything this document does not spell out. They come straight from the one-pager.

1. **The assistant manages the work, not just answers questions.** It remembers the case, plans next steps and keeps things moving until there is an outcome.
2. **Evidence before claims.** Every asset and every important number shows where it came from and how sure we are. A possible match is never shown as confirmed ownership. Current balances are never confused with old ones.
3. **Honest coverage.** We say which sources we checked and which we did not. We never imply we searched everything.
4. **Authority before access.** We establish who the user is and what they are allowed to do before showing or retrieving sensitive information — per asset, per action.
5. **The user approves anything consequential.** The product prepares; the person decides. Nothing is sent, shared or declared on their behalf without an explicit, informed approval.
6. **AI assists; people and institutions decide.** AI reads, matches, drafts and explains. It does not decide entitlement, verify identity on its own, or override an institution.
7. **Ask only what's needed, once.** Relevant questions instead of one long form; never ask for the same sensitive detail twice.
8. **Plain language, voice-first friendly.** Usable by an elderly person, in an Indian language, on a phone, while grieving.
9. **Every action leaves a trail.** Who did what, when, and on whose authority — visible to the user.
10. **Fail safe, not silent.** When something is uncertain, unsupported or broken, we pause that part, say so clearly and offer a human.

---

## 7. How the product works

### 7.1 The six steps

The experience begins and continues through an AI assistant; structured screens support it wherever the user needs to inspect, compare or approve something.

| Step | Name | What the product does |
| --- | --- | --- |
| 1 | **Talk to AI** | Understands whether the person wants to discover, plan or claim, and whose assets are involved. Asks follow-up questions instead of showing a long form. |
| 2 | **Verify identity and authority** | Establishes who the user is and what they may do. For the deceased, records relationship and legal authority, and what each institution requires (death certificate, nomination, legal heir or succession certificate, probate, etc.). |
| 3 | **Discover assets** | Builds a discovery plan from what's known: uploaded documents, institutions mentioned in old records, official unclaimed-asset searches, institution enquiries. |
| 4 | **Consolidate and verify** | Combines everything into one inventory. Merges duplicates only after review. Labels each holding with its evidence status. |
| 5 | **Prepare or claim** | For the living: a legacy record and checklist. For families: institution-specific claim packs, reviewed and approved by the user. |
| 6 | **Track to completion** | Follows up on outstanding documents, institution requests and deadlines until each item has a documented outcome. |

### 7.2 The assistant and the screens

| The assistant (voice or chat) is used to… | Screens are used to… |
| --- | --- |
| Describe a situation in your own words | See the full inventory and each item's evidence |
| Ask "what does this mean?" or "what next?" | Review extracted details against the original document |
| Answer follow-up questions | Approve an action (exactly what, to whom, why) |
| Get plain-language explanations of procedures | See claims, tasks and deadlines at a glance |
| Hear a summary read back | Manage consent, sharing and privacy settings |

**Consequential actions are always approved on a screen**, with the exact content shown, never by a casual "yes" in chat or voice.

### 7.3 Voice

Voice is part of the MVP, not a later add-on. The user can speak, see and correct the transcript, hear the reply, stop playback and switch to text at any time in the same case. The microphone turns on only when the user asks. Names, account numbers and amounts heard by voice are always shown for correction before use. We state which languages are supported and tested; we do not claim to support every Indian language.

### 7.4 The case

Everything happens inside a **case**: one goal about one person's assets (yourself, a parent, or someone who has died). A user can have several cases; each is kept separate. The case holds the conversation, documents, evidence, holdings, claims, tasks, consents and activity history, so the user can leave and resume without starting again.

### 7.5 Every screen answers the same questions

Whose case is this? What do we know? What's missing? What happens next — and who is it waiting on? Where can I get help?

---

## 8. Scope: asset coverage and releases

### 8.1 Asset coverage

Each asset type has its own discovery sources and its own claim procedure, so we add them one at a time. The list below is the full vision from the one-pager; the **Release** column says when each is switched on.

| Asset type | Where we might find it | How it is claimed | Release |
| --- | --- | --- | --- |
| **Bank accounts and fixed deposits** | Bank statements and passbooks; bank enquiries; RBI UDGAM for eligible unclaimed deposits | The bank's deceased-depositor procedure | **MVP** |
| **Mutual funds** | Consolidated Account Statement (CAS); fund houses; CAMS and KFintech; SEBI MITRA for inactive/unclaimed folios | Transmission or redemption through the fund house / registrar | **MVP** |
| **Life insurance** | Policy documents; insurer records; insurers' unclaimed-amount search (IRDAI Bima Bharosa links) | The insurer's death-claim procedure | **MVP** |
| Shares and demat holdings | Depositories (NSDL/CDSL), brokers, CAS, company records | Transmission through depository participant, broker or company | Later |
| Unclaimed dividends and shares | Company / registrar records; IEPF | IEPF and company verification process | Later |
| EPF and related benefits | EPFO member records; employer records | EPFO death and nominee claims (PF, pension and insurance benefits are separate) | Later |
| NPS | Central recordkeeping agency and pension account records | The applicable NPS exit / death procedure | Later |
| PPF and small savings | Banks, post offices and account records | The institution's settlement procedure | Later |
| Bank lockers | Bank records | The bank's nominee / heir access procedure (contents and value are not assumed) | Later |

**Why these three first:** bank deposits, mutual funds and insurance are the most common holdings, and they represent three genuinely different discovery and claim workflows. If the product works well for all three, the approach generalises.

**Before any "Later" asset type is switched on**, we must define its fields and what its amounts mean, confirm its sources and claim procedure, write sample cases, and pass evaluation for it (requirement FL-30).

### 8.2 Official sources — what they do and don't do

These are potential parts of permitted workflows, **not** proof that we have API access or that they cover every case.

| Source | What it is good for | What it is **not** |
| --- | --- | --- |
| **RBI UDGAM** | Searching eligible unclaimed deposits across participating banks | A search of every active bank account. Claims are still made with the bank. |
| **SEBI MITRA** | Tracing inactive and unclaimed mutual fund folios, including some missing from CAS | Proof of ownership or an API for us |
| **IRDAI Bima Bharosa / insurer unclaimed search** | Insurer-specific queries for unclaimed policy amounts | A name-only search of every policy |
| **DigiLocker** | Authorised sharing of official documents through approved integrations | Available to us before we become an approved partner |
| **Account Aggregator** | Consent-based sharing of financial information in a regulated framework | A route for claims, or confirmed for deceased persons' data; our eligible role needs validation |
| **IEPF** | Claiming certain unpaid dividends and shares transferred to the fund | Part of the MVP — it covers shares and dividends, a Later release |
| **Government common portal** (unclaimedassetsportal.in, launched May 2026) | One landing page linking the official unclaimed-asset searches | A search in its own right; capabilities to be reviewed before relying on it |

<details>
<summary><strong>Official-source research and product implications — checked 16 October 2026</strong></summary>

These findings describe the sources inspected, not approved access or a completed legal review. Source and template currency must be rechecked before live use. "Located" means an official listing was found but the full current procedure was not validated.

| Source and evidence | What it establishes | Product consequence |
| --- | --- | --- |
| [RBI UDGAM FAQ](https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQonUDGAMPortal.pdf), inspected | Search covers qualifying unclaimed deposits/accounts; claims go to the respective bank. Participation counts are dated. | Show checked coverage and hand off to the bank; do not promise all active accounts, current coverage counts or settlement inside UDGAM. |
| [SEBI MITRA circular, 12 February 2025](https://www.sebi.gov.in/sebi_data/attachdocs/feb-2025/1739356741378.pdf), inspected | Industry tracing of inactive/unclaimed fund folios, including some absent from CAS; separate fund-house/registrar processes remain. | Treat MITRA and CAS as complementary evidence paths; a match is neither ownership verification nor API permission. |
| [IRDAI Bima Bharosa unclaimed query](https://bimabharosa.irdai.gov.in/Home/UnclaimedAmountsQuery), inspected | Insurer-directed query facility with policyholder/contact/policy fields and consent, plus insurer links. | Do not promise a name-only search of every policy; collect only required evidence and use a reviewed permitted route. |
| [RBI Account Aggregator directions](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=10598), inspected | Defines regulated eligibility, explicit scoped consent and information-use limits; AA does not support customer transactions. | Validate our eligible role and deceased-subject use separately; no consent-only shortcut, universal retrieval or claim submission through AA. |
| [DigiLocker implementation model](https://www.digilocker.gov.in/web/implementation-model), inspected | Partner vetting, agreements, technical integration and approval precede access. | User intent is not partner approval; enable only approved document types, issuers, purposes and methods. |
| [CDSL DP services](https://www.cdslindia.com/DP/Services.html), inspected; page dated 26 August 2025 | Depository participants handle demat services/transmission, with different sole/joint-holder situations. | Route by holding and claimant situation; do not treat every share or joint account identically. |
| [EPFO composite death claim](https://www.epfindia.gov.in/site_docs/PDFs/Downloads_PDFs/Form_CCF_death.pdf), official form located | Distinguishes PF, pension and EDLI benefit requests. | Keep benefit types separate; confirm current procedure and forms before enabling. |
| [NPS Trust exit regulations, amended 16 December 2025](https://npstrust.org.in/sites/default/files/act-and-regulations-documents/exits-and-withdrawals-under-the-national-pension-system-regulations-2015-last-amended-on-16-december-2025.pdf), inspected | Settlement follows the applicable subscriber/claimant category and conditions. | Select a current sector-specific procedure; no blanket payout rule. |
| [MCA IEPF-5 e-verification instruction kit](https://www.mca.gov.in/content/dam/mca-af-forms/instruction-kits/Instruction_Kit_IEPF_5_E_verification_report.pdf), located | Company/bank nodal-officer verification is a distinct step. | Track institution verification separately from claimant preparation; full current IEPF procedure not yet validated. |
| [India Post savings](https://www.indiapost.gov.in/banking-services/savings), inspected; claim handbook only located | Small-savings schemes have their own operating rules. | Confirm the current handbook before enabling; do not copy generic thresholds across schemes. |
| [MeitY DPDP Rules index](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digit), inspected | Rules, corrigendum and commencement timeline are separate published materials. | Privacy policy must record applicable provisions, commencement dates, notices, processors, safeguards, retention, rights, grievance and breach response. |

**Not yet established by research:** our regulated role, partner contracts, API credentials, rights to automate portals, eligibility to access deceased persons' data, a legally sufficient authority and release policy, current institution forms, real AI accuracy, and production performance. Each remains an explicit gate (§16).

</details>

### 8.3 Releases

| | **MVP (reference build)** | **Pilot** | **Later (full vision)** |
| --- | --- | --- | --- |
| **Purpose** | Prove the workflows work end to end | Prove it helps real people with real data | Scale coverage and automation |
| **Data** | Generated sample records only | Real users' documents, under accepted privacy policies | Real data, more sources |
| **Journeys** | All three | All three | All three |
| **Assets** | Bank & FD, mutual funds, life insurance | Same | All nine types |
| **Channels** | Web (mobile-friendly), voice and chat | Same | Native apps if justified; more languages |
| **Discovery** | Uploaded documents, declarations, guided use of official search facilities | Same, with accurate current institution procedures | Live connectors where approved (e.g. AA, DigiLocker) |
| **Claims** | Prepared packs; **user submits manually**; tracked in-app | Same, with operator review | Direct submission where permitted channels exist |
| **Follow-ups** | In-app tasks and reminders | Same, plus email/SMS with opt-in | Permitted automated follow-ups (incl. voice) |
| **Sharing a legacy record** | Export of an approved snapshot only | Same | Verified sharing during life; release after death under an agreed policy |
| **AI** | Google Gemini on **synthetic data only**, plus a deterministic journey engine; a fixture provider for tests | Approved AI provider configuration, evaluated for quality and privacy, on real data | Same, more languages and document types |

The MVP's sample data and Gemini-on-synthetic-data test the **workflow**; they do not prove real-world AI accuracy or live service. Moving from MVP to Pilot, and switching on any "Later" capability, each requires its own checks (§15, §16).

---

## 9. Functional requirements

### How to read a requirement

Each requirement has:

- **ID** — a permanent reference (FL-xx). IDs are never reused; retired requirements keep their number. Numbers are not in order because they were added over time.
- **Release** — **MVP** (built and tested with sample data first, then used in the Pilot), **Later** (switched off until its own checks pass), or **MVP → Later** (a basic version now, extended later).
- **Requirement** — what the product must do, in one or two sentences.
- **Done when** — how a tester can check it, including what must *not* happen.

### 9.1 Cases and conversation

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-01 | MVP | Work out the user's goal from their own words — discover, plan a legacy, or claim — and whose assets are involved. A user who already knows the assets can go straight to claims. | The suggested journey is shown and the user can correct it. A known-asset claim never forces a discovery step. |
| FL-02 | MVP | Save the conversation, facts, documents, evidence and tasks so the user can leave and resume. | After closing and reopening, nothing has to be re-entered. Facts the user corrected take priority over older summaries. |
| FL-22 | MVP | One case is about one person's assets. A user can have several cases, each kept separate. | Switching cases re-checks permissions and shows no content from the previous case. |

### 9.2 Identity, authority and consent

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-03 | MVP | Record **identity**, **relationship to the subject** and **authority to act** separately — and authority per asset and per action (e.g. nominee for the LIC policy but legal heir for the mutual funds). | Each record shows its evidence, who reviewed it, why, and when it expires. Missing authority blocks only the actions it affects, not the whole case. |
| FL-04 | MVP | Ask for **consent** before using data, stating exactly which data, for what purpose, shared with whom, and until when. | The user gets a receipt. Revoking consent stops all future and queued work that relied on it, while the record of past disclosures is kept. |
| FL-23 | MVP | Enforce who may see and do what — owner, claimant, helper, operator — on every record, search, download, export and background job. | A user or operator cannot reach another case's data by any route. Reassigning an operator removes their old access. Support staff have no general access. |
| FL-24 | Later | Let a user invite a collaborator (e.g. a sibling) into a case with a verified, limited, time-bound scope. | An invitation alone reveals nothing. Access starts only after verification and the owner's approval of exact scope; revocation stops future access. |
| FL-48 | MVP | Recover accounts and change contact details safely. | Old access is removed, the user is told, and the change is logged. Recovery never bypasses authority checks. |

### 9.3 Documents and evidence

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-05 | MVP | Check every upload for type, size and safety (quarantine and scan) before reading it. | Unsafe or unsupported files are refused with a clear reason. Upload, scan and reading failures are reported separately, each with a safe retry. |
| FL-06 | MVP | Extract details from documents and show each value next to **where it came from** (document and page) and **how confident** we are. | Critical fields — names, identifiers, ownership, amounts, dates, institution — must be reviewed by a person before they are used. |
| FL-25 | MVP | Handle unreadable, password-protected, incomplete or conflicting documents. | The product asks for a clearer copy or offers help. It never invents a value and never asks for a document password in chat. |
| FL-26 | MVP | Let the user accept, correct or reject each extracted value and each link between a document and an asset. | Every change keeps who made it, why and the previous version. A material change invalidates any claim pack or approval that depended on the old value. |

### 9.4 Discovery and inventory

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-10 | MVP | Show a **discovery plan**: which sources fit this case, what each covers, what it needs, and who acts next. | Results distinguish "nothing found", "partly checked", "blocked" and "failed". The product never implies an exhaustive search. |
| FL-27 | Later | Retrieve or refresh data automatically from a source only when that source, subject type, method and the user's current permission are all approved. | Unapproved sources stay blocked. Each retrieval records what was checked and when. |
| FL-07 | MVP | Label every holding **self-declared**, **potential match**, **document-backed** or **institution-verified**. | Name similarity or AI confidence alone never makes a holding "verified"; that requires reviewed evidence from the institution. |
| FL-08 | MVP | Detect possible duplicates and conflicts and have a person review them. | No automatic merge based on name alone. Merges keep all evidence, can be undone, and update everything that depended on them. |
| FL-09 | MVP | For each holding show: institution, asset type, masked account/policy/folio number, evidence, dated amount (with what the amount means), nominee information and next action. | Anything we don't know is shown as unknown, not blank or zero. |
| FL-28 | MVP | Keep history: add new dated observations rather than overwriting old ones. | A closed account, a transmission, or absence from a later statement never erases earlier evidence. |
| FL-29 | MVP | Calculate totals honestly. Count one reviewed, dated amount per holding; exclude potential matches, duplicates, conflicts, holdings on hold and undated values; keep currencies separate. | If no amount qualifies, the total says "unknown", not ₹0. A total is labelled "reviewed value from dated sources", never "your current wealth". |
| FL-30 | Later | Before switching on any asset type beyond the MVP three, define its fields and amount meanings, sources, authority rules, claim procedure, sample cases and evaluation. | Each of the six Later asset types in §8.1 has passed this before it is enabled. |

**Amounts mean different things for different assets.** An FD's principal is not its maturity value; fund units are not their valuation; an insurance sum assured is not a cash value. The product never adds unlike amounts together. Exact fields are defined in the Prisma schema ([LLD §5](LLD.md#5-data-model)).

### 9.5 Legacy planning and sharing

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-11 | MVP | Create a reviewed, dated legacy record with a checklist of missing documents, missing or unknown nominees, stale records and open steps. | The checklist updates as gaps are fixed, and shows the date each item was last checked. |
| FL-31 | MVP | Let the planner name trusted contacts and say what they may eventually see; remind the planner to review the record. | Naming or changing a contact **sends nothing and grants no access**. Changes are kept in history. |
| FL-34 | MVP | Export an approved snapshot of the legacy record (date, scope and known gaps included). | Only the owner can export. The download link is short-lived and logged, and the user is told a downloaded copy cannot be recalled. |
| FL-32 | Later | Share the legacy record with a verified person during the planner's life, with exact scope and expiry. | No family member sees anything without verification and the planner's approval. Revocation stops future access. |
| FL-33 | Later | Release legacy information after death only under an agreed policy for evidence of death, authority, recipients, the planner's instructions and disputes. | No release because a user went inactive, and no release decided by AI alone. |

A legacy record is **not a will** and does not transfer anything.

### 9.6 Claims and recovery

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-12 | MVP | Use a specific, versioned claim procedure for each institution, asset type and claimant situation (e.g. LIC death claim with nominee; bank claim without nominee). | Each claim records which procedure version it used and its source date. A missing, outdated or unsupported procedure triggers review rather than a guess. |
| FL-13 | MVP | Prepare a **claim pack**: the exact documents, required vs optional items, pre-filled form fields and declarations. | A pack cannot be marked ready while anything required is missing or rejected. |
| FL-14 | MVP | Before anything leaves the product, show exactly what will be sent, to whom, by what channel and why, and get the user's approval. | Approval expires if the content changes, the permission is revoked or time runs out. In the MVP the user submits the pack themselves. |
| FL-35 | Later | Submit claims directly through a permitted institution channel. | Permissions and approval are re-checked at the moment of sending; a receipt is captured; repeating a request never causes a duplicate submission. |
| FL-15 | MVP | Track each claim: references, receipts, institution requests, deadlines and who is waiting on whom (user, our team or the institution). | Every open item has an owner and a due date. |
| FL-36 | MVP | If we don't know whether something was received, treat it as unknown and check before re-sending. | Retries never create duplicate records or duplicate actions outside the product. |
| FL-16 | MVP | Record each claim's outcome — settled, transferred, partly settled, rejected or unresolved dispute — with date, amount and evidence. | Any remaining or unknown amount stays tracked. A rejection is never reported as a recovery. |
| FL-37 | MVP | Handle extra document requests, new evidence and reopened claims without losing history. | Earlier packs, outcomes and reasons are kept. One claim's rejection does not affect another claim. |
| FL-17 | MVP | Offer a person to talk to when the situation is unclear, unsupported, disputed or upsetting. | Help is visible on every screen. Questions of legal entitlement are routed to qualified help, never answered by AI. |

A case can be closed only with a reviewed summary and the user's acknowledgement of anything still unresolved.

### 9.7 Tasks, reminders and operations

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-42 | MVP → Later | In-app tasks and reminders with due dates, respecting the user's preferences and time zone. Email and SMS later, with opt-in. | No duplicate reminders. External messages contain the minimum information and include an opt-out. |
| FL-43 | MVP | Give operators a queue of assigned work: verification, extraction review, claims, disputes and overdue items. | Operators can act only on cases assigned to them; privileged actions require a reason and are logged. |
| FL-44 | MVP | Version and review institution procedures, source descriptions, AI models and tools. | Unsafe or out-of-date procedures can be suspended without losing in-flight cases; a material change triggers review. |
| FL-47 | MVP | Put specific actions **on hold** for suspected fraud, competing claimants or disputed evidence. | Only the affected actions stop; other claimants' data stays protected; lifting a hold needs authorised, evidence-based review. |
| FL-49 | MVP | Track help requests and complaints with an owner, status, escalation and resolution. | Ordinary support messages never contain financial documents. |
| FL-56 | Later (demo built, see docs/VERIFY_DEMO.md) | A **Verify console** for banks and insurers to review death claims: cross-document consistency, authenticity signals, duplicate claims across claimants and completeness, with an explainable risk level and approve / request documents / escalate actions. | Risk levels are computed by code from recorded checks, never by the AI; authenticity findings are shown as signals, not proof; every decision is logged. Tied to the "software for institutions" revenue hypothesis (BRD §7). |

---

## 10. AI and voice requirements

### 10.1 How the AI is organised

One **AI case manager** runs each case. It uses specialised capabilities as tools — these are bounded functions, not independent agents acting on their own.

| Capability | What it does | What it may **not** do |
| --- | --- | --- |
| Conversation and voice | Understand the user, ask follow-ups, explain next steps | Treat a spoken "yes" as approval of a consequential action |
| Discovery planning | Choose permitted sources and discovery steps | Use a source that isn't approved for this case |
| Document reading | Read statements, certificates, forms and old records | Accept critical fields without human review |
| Matching and reconciliation | Match records, find duplicates, flag uncertain ownership | Merge automatically or mark anything verified |
| Legacy planning | Find missing information and prepare the family record | Share or release it |
| Claims preparation | Prepare institution-specific packs and track progress | Submit or make declarations without approval |
| Follow-up | Monitor tasks, reminders and permitted status channels | Contact an institution or person without permission |

**The rule that matters most:** the AI prepares; backend rules check authority and approval; the person decides. This is enforced in code, not left to the AI's judgement.

### 10.2 AI requirements

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-38 | MVP | One case manager coordinates discovery, document, matching, legacy, claim and follow-up tools from the saved case facts. | Every tool call is checked against the user's authority and approvals by the backend, not by the AI. |
| FL-39 | MVP | The assistant explains why it needs information, cites the documents or procedures it relies on, and says when it is unsure. | Missing or conflicting evidence leads to a question or a handoff, not a guess. Instructions hidden inside an uploaded document can never trigger a tool or change permissions. |
| FL-40 | MVP | If the AI or a source fails, no work is lost. | The user can retry, correct, cancel or get human help, and always sees the next usable step. |
| FL-53 | MVP | Evaluate document reading and assistant behaviour on a labelled set of realistic and adversarial sample documents, before each release ([docs/AI_EVALUATION.md](docs/AI_EVALUATION.md)). | Accuracy is reported separately for critical fields. Any false "verified", unauthorised tool use or wrong disclosure fails the release. |

### 10.3 Voice requirements

Voice is a first-release requirement because many of our users — especially older adults and people more comfortable in an Indian language — find speaking easier than navigating financial portals.

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-20 | MVP | Voice and text in every journey. The user can speak, see and correct the transcript, hear the reply, stop playback and continue in text in the same case. | Names, numbers and amounts heard by voice are shown for correction before use. Supported languages are stated and each has passed its own quality evaluation. |
| FL-41 | MVP | The microphone starts only when the user asks, and recording state is always visible. | Opening a case never starts listening. Stopping or switching to text is always honoured. Voice processing, provider and retention follow the approved privacy policy. |
| FL-21 | Later | Automated calls or messages to institutions on the user's behalf. | Only through permitted channels, with disclosure to the recipient, current consent and authority, and a full log. Unclear responses are reviewed by a person. |

**What voice never does:** approve a disclosure, verify identity, or change an accepted financial fact on its own. The MVP must demonstrate real speech input and output (using sample scripts); a decorative microphone or pre-recorded audio does not count.

### 10.4 Guardrails

- **No invented facts.** If a value isn't in the evidence, the assistant says it doesn't know.
- **No legal or investment advice.** The assistant explains procedures; it does not tell people what they are entitled to or what to invest in.
- **Documents are data, not instructions.** Text inside an uploaded file cannot change what the assistant is allowed to do.
- **Minimum data to AI services.** Only what a task needs is sent to an approved AI provider, under accepted hosting and retention terms. No real customer data in unapproved tools or in development.
- **Plain language.** Explanations avoid jargon; where a term is unavoidable (e.g. "succession certificate"), it is explained.

---

## 11. Non-functional requirements

Non-functional requirements describe *how well* the product must behave. For a product holding death certificates, identity documents and financial records, these are as important as the features.

### 11.1 Security

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-45 | MVP | Strong sign-in, encryption in transit and at rest, least-privilege access, expiring sessions and short-lived download links. Sensitive actions (export, approval, consent changes) need a fresh check of who the user is. | Tests prove case isolation, key handling, session expiry and revocation. There is no "skip security" switch in production. |
| FL-18 | MVP | Keep an **audit trail** of every sensitive read, change, review, export, approval and outside action: who, which case, what, when, why, and the request it belonged to. | The user can see their case's activity. Audit records can't be altered, and ordinary logs never contain secrets or document contents. |
| FL-46 | MVP | Send only the minimum necessary data to approved processors, AI services and recipients, under accepted hosting, retention and sub-processor terms. | No real records are used in unapproved tools or in development environments. |

**Threats we design against** (detailed in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md); owner: privacy/security lead under D-05; reviewed before the Pilot, §15.2): someone pretending to be an heir; a family member seeing more than they're entitled to; a staff member browsing cases; a malicious document trying to instruct the AI; a leaked download link; account takeover.

### 11.2 Privacy and data protection

The product handles personal data of living people and of people who have died, and data about their families. It must comply with India's **Digital Personal Data Protection Act, 2023** and its Rules as they come into force, and with the rules of each institution and source.

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-19 | MVP | Apply a stated **retention and deletion** policy. Deleting a case revokes access and cancels pending work; copies held by processors and in backups are tracked and expire. | A restored backup does not bring deleted data back. Holds that justify keeping data are recorded with a reason. |

Privacy rules that apply everywhere:

- **Purpose-bound consent** (FL-04): each use of data has a stated purpose, recipient and expiry.
- **Data minimisation:** ask only for what the current step needs.
- **User rights:** people can see their data, correct it, withdraw consent and request deletion, and there is a named grievance contact.
- **Breach response:** a written plan for detecting, containing and notifying data breaches before the Pilot.
- **No data selling, no advertising use** of financial information.

**Cautious legal positions** (the law is unclear on these; we take the strictest reading — [docs/FEASIBILITY_AND_COMPLIANCE.md](docs/FEASIBILITY_AND_COMPLIANCE.md) §9):

- A deceased person's data is treated as fully protected; it is processed only for a claimant who has consented **and** shown documented authority; disputed assets are put on hold.
- Fraud and duplicate-claim checks are always disclosed and covered by the claimant's consent.
- The product **never contacts co-heirs or nominees**; it stores only what the claim needs about them and deletes it at closure.
- Full compliance with the DPDP Rules by **January 2027**; today's SPDI rules and the CERT-In 6-hour incident rule apply now.
- Only institution-published forms and standard formats; no advice on who inherits, will validity or disputes — those get a referral (a lawyer, or free legal aid on **15100** for families who qualify).
- No representation before institutions, no claim-linked fees, no selling or referring financial products. **The Pilot is free.**

The full assessment — data inventory, legal basis, processors, retention, rights and open legal questions and our cautious positions — is in [docs/PRIVACY_ASSESSMENT.md](docs/PRIVACY_ASSESSMENT.md).

### 11.3 Reliability

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-51 | MVP | Long-running work (document reading, discovery steps, reminders) shows progress, retries a limited number of times, and survives restarts. | Restart, outage, cancellation and duplicate-delivery tests lose no work and cause no duplicate effects. If the outcome of an outside action is unknown, the product reconciles before trying again. |

### 11.4 Performance, capacity and cost

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-52 | MVP | Measure response time, capacity, cost per case and recovery time against the reference workload in [LLD §17.4](LLD.md#174-reference-workload). | Production targets are agreed before the Pilot (decision D-07). Targets written in documents are not treated as measured results or as promises to customers. |

Working targets for the MVP (to be confirmed under D-07): the assistant starts replying within about 2 seconds; a typical statement is read within about 30 seconds, with progress shown; the product stays usable on a mid-range phone on a 4G connection.

### 11.5 Accessibility and inclusion

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-50 | MVP | Readable, resumable, mobile-friendly web, usable by keyboard and screen reader, with large-text support and a complete path that doesn't need voice. | Tested against **WCAG 2.2 AA**: labels, focus order, error messages and contrast. |

Inclusion also means: plain language throughout (§10.4), patient pacing for grieving and older users, and stated support for each evaluated Indian language.

### 11.6 Compatibility

- **MVP:** responsive web on current versions of Chrome, Safari, Edge and Firefox, on desktop and mobile.
- **Native apps:** only if research shows a need (decision D-11).

---

## 12. Data, sources and integrations

### 12.1 The main things the product keeps track of

| Concept | What it is | Example |
| --- | --- | --- |
| **Case** | One goal about one person's assets | "Find and claim Papa's assets" |
| **Subject** | The person whose assets the case is about | Rajesh Sharma (deceased) |
| **Participant and role** | A person in the case and what they may do | Rohit — claimant (legal heir) |
| **Document** | A file the user uploaded or a source returned | HDFC statement, FY24 |
| **Evidence** | A specific fact taken from a document or source, with its location | "Nominee: Sunita Sharma" — page 1 |
| **Holding** | An account, deposit, fund folio or policy | LIC policy 974512388 |
| **Observation** | A dated amount or fact about a holding | Sum assured ₹5,00,000 as of 2019 |
| **Authority** | What a person may do for a given asset, and the evidence for it | Nominee for the LIC policy |
| **Consent** | Permission to use specific data for a purpose, until a date | Search UDGAM using PAN, valid 30 days |
| **Approval** | Agreement to one exact action | Send this claim pack to LIC branch 9C |
| **Procedure** | A versioned description of an institution's claim process | LIC death claim, nominee path, v3 |
| **Claim** | One request to one institution for one holding | LIC death claim for policy 974512388 |
| **Task** | A next step with an owner and due date | Get legal heir certificate — Rohit — 12 days |
| **Hold** | A restriction on specific actions while something is resolved | CAMS folios paused: competing claim |
| **Snapshot** | A frozen, dated copy of a reviewed legacy record | Kamala's record, 17 Oct 2026 |
| **Audit event** | A record of who did what, when and why | Rohit exported the case brief |

Exact fields and formats are defined in the Prisma schema (`backend/prisma/schema.prisma`) and the Zod types used by the API ([LLD §5](LLD.md#5-data-model)).

### 12.2 How we treat data

| Data type | Examples | Treatment |
| --- | --- | --- |
| Highly sensitive | Identity numbers, account numbers, death certificates, health details on certificates | Encrypted, masked on screen by default, never in logs or analytics, minimum sharing |
| Sensitive | Balances, holdings, family relationships | Encrypted, visible only to authorised roles |
| Operational | Tasks, statuses, timestamps | Standard protection |

**We never collect** banking passwords, PINs, OTPs or card numbers.

### 12.3 Integrations and dependencies

| Integration | Used for | MVP status |
| --- | --- | --- |
| Document upload and reading | Extracting facts from user documents | Built: Gemini extraction, or local OCR and text rules when there is no key (synthetic documents only) |
| AI provider (Google Gemini, free API key) | Conversation, extraction, drafting, search | Free tier only (D-14), so **synthetic data only**: the unpaid tier lets Google use prompts and forbids personal data. Real data needs AI off or an approved paid tier with no-training terms |
| Speech: recognition via Gemini audio (free key) or the browser; replies via Cloud Text-to-Speech (free quota) or the browser | Voice input and output | Required for MVP (D-09, revised 17 Oct 2026 for the free-tier rule) — [docs/FREE_TIER_PLAN.md](docs/FREE_TIER_PLAN.md) |
| RBI UDGAM, SEBI MITRA / MFCentral, insurer unclaimed searches, government common portal | Discovery | **Guided**: the product tells the user how to search and records the result; no automation |
| DigiLocker | Fetching official documents | Later — requires partner approval |
| Account Aggregator | Fetching financial data with consent | Later — requires an eligible regulated role |
| Institution claim channels | Submitting claims | Later — MVP is manual submission |
| Email / SMS | Reminders | Later — with opt-in |

---

## 13. Success metrics

### 13.1 The one number that matters most

**Useful-outcome rate:** the share of started cases that reach a first reviewed, useful result — a reviewed inventory (discover), a reviewed legacy record (plan), or a reviewed claim pack (claim).

### 13.2 Metric definitions

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-54 | MVP | Measure activation, coverage, time, effort and outcomes using the definitions below. Separate time spent waiting on institutions from time spent by users and our team. | Analytics never contain document text, identity numbers or balances. |

| Metric | Definition | Why it matters |
| --- | --- | --- |
| Useful-outcome rate | Cases with a first reviewed useful result ÷ eligible started cases, by journey | Are we actually helping? |
| Time to first useful result | Median and 90th percentile, user time separated from waiting time | Is it faster than doing it alone? |
| Extraction accuracy | Critical fields correct on first read ÷ critical fields read | Can people trust what the AI reads? |
| Evidence coverage | Holdings with document-backed or verified status ÷ all holdings shown | How much of the inventory is solid? |
| First-time claim-pack completeness | Packs accepted by the institution without a missing-document request ÷ packs submitted, by institution | Are we preparing claims correctly? |
| Claim outcomes | Settled / transferred / partly settled / rejected / disputed, and time in each state | What actually happens to claims? |
| Discovery success | Cases where discovery found at least one holding the user did not already know about ÷ cases that ran discovery, by source | Does discovery find anything new? |
| Manual intervention rate | Cases or steps needing operator action ÷ all cases or steps, by reason | How much human work does each case need? |
| Rework | Corrections by users and operators per case | Where is the product getting things wrong? |
| Trust | Research-based trust score; complaint rate | Do people feel safe? |
| Cost per useful result | Processing and support cost ÷ useful results | Is the service sustainable? |

### 13.3 Guardrail metrics — these must stay at zero

- Holdings shown as verified without institution evidence.
- Actions taken without a valid approval.
- Data shown to someone without the authority to see it.
- Duplicate submissions to an institution.

**Honesty rules for metrics:** coverage is not a claim that all assets were found. A rejected or disputed claim is not a recovery. We do not publish recovery rates, savings figures or market sizes that we have not measured.

---

## 14. Feasibility, assumptions and risks

### 14.1 What is actually feasible today

| Capability | Current assessment |
| --- | --- |
| AI-powered onboarding | Technically buildable |
| Multilingual voice assistance | Technically buildable |
| Reading financial documents | Technically buildable |
| Creating a consolidated asset registry | Technically buildable using available records |
| Identifying missing information | Technically buildable |
| Legacy planning and document organisation | Technically buildable |
| Generating claims documentation | Technically buildable, subject to legal and institutional requirements |
| Claims tracking and reminders | Technically buildable |
| DigiLocker integration | Requires applicable approval and onboarding |
| Account Aggregator data access | Requires an eligible regulated pathway |
| Direct institutional claim submission | Depends on authorisation and institution-specific channels |
| Discovering every unknown financial asset | Not established as universally feasible |
| Fully automatic asset settlement | Not generally available as a startup-controlled process |

Detailed, cited answers on what is legally and technically feasible — licences, identity checks, DigiLocker, Account Aggregator, official portals, Google Cloud in India, SMS rules — are in [docs/FEASIBILITY_AND_COMPLIANCE.md](docs/FEASIBILITY_AND_COMPLIANCE.md).

### 14.2 The biggest technical challenge

**How do we find an asset when the user doesn't know it exists?** Reading a document is relatively easy. Finding an investment with no document, institution name or account number is much harder. We must establish, source by source, what can be searched, with which identifiers, by whom, and through which approved integrations. **We will not promise complete discovery until that coverage is demonstrated.**

### 14.3 The biggest legal challenge

**Who may access someone's financial information after their death?** A death certificate alone does not authorise access to every account. Nominees, legal heirs, executors and surviving joint holders have different rights depending on the asset and the law. The product must establish the right authority before retrieving sensitive information or starting a claim.

### 14.4 Assumptions we are making

| Assumption | How we will test it |
| --- | --- |
| Families will upload documents if we explain why each is needed | Pilot completion rates; research interviews |
| Guided use of official searches (UDGAM, MITRA, insurer searches) finds assets users did not know about | Track "new holding found" per case in the Pilot |
| AI can read Indian bank, fund and insurance documents accurately enough with human review of critical fields | Evaluation set (FL-53) before the Pilot |
| Voice makes the product meaningfully easier for older users | Usability tests with users over 60 |
| People will pay for, or institutions will sponsor, this service | Business validation in [BRD.md](BRD.md) |

### 14.5 Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Discovery finds less than users hope | Disappointment, churn | Honest coverage messaging from the first screen (§6, FL-10) |
| Someone impersonates an heir | Serious harm, loss of trust | Per-asset authority checks, holds, operator review (FL-03, FL-47) |
| AI misreads a critical value | Wrong claim, wrong advice | Mandatory human review of critical fields; evaluation gates (FL-06, FL-53) |
| Institution procedures change | Claims rejected | Versioned procedures with source dates and review cadence (FL-12, FL-44) |
| Regulated access (AA, DigiLocker) is not granted | Discovery stays manual | MVP designed to work without them |
| Data breach | Severe harm to users and the company | Security and privacy requirements (§11); [threat model](docs/THREAT_MODEL.md) reviewed before the Pilot |
| Family disputes | Product caught in the middle | Holds and handoff to qualified help; AI never decides entitlement (FL-17, FL-47) |

---

## 15. Release plan and launch criteria

### 15.1 MVP (reference build) — complete when

- A developer can start the product locally and run all three journeys with sample data, without cloud credentials, by using the fixture AI provider (LLD §13.1). With a Gemini key, the same journeys run on real AI over synthetic data.
- Saved work can be resumed.
- These paths are tested, both success and failure: corrected extracted fields; duplicates, old and unknown values; discovery with no results; trusted contacts that send nothing; scoped exports; known-asset claims; a changed pack invalidating its approval; an unknown submission result and a partial outcome; cross-case, revoked and expired access; unsafe documents; suspended procedures; background-job failure; deletion, holds and restored backups.
- Voice works for real on sample scripts in every journey.
- Every MVP requirement has a recorded test result linked to its ID, the version tested and the reviewer.
- **No open critical defect** in authorisation, disclosure, evidence integrity or duplicate actions.

### 15.2 Pilot — may start when

- Privacy policy, retention policy, AI and speech providers, and hosting are approved (D-05, D-09).
- Identity and authority rules are approved by the founder following the cautious legal positions (§11.2, D-02).
- Current claim procedures are verified for each Pilot institution (D-10).
- The AI evaluation (FL-53) has passed on realistic documents.
- Operators are trained and support hours are defined (D-07).
- Pilot users, institutions and success targets are chosen (D-01).

### 15.3 Each "Later" capability — may be switched on when

It has its own evidence for that exact language, asset type, source, subject type, channel or sharing feature: approval or contract where needed, procedures, sample cases, evaluation results and an accepted decision. A plan or a sample adapter is not a passing test or a live permission.

### 15.4 What must be validated before scaling

For each institution or discovery system: which assets it covers; what is needed to search; whether individuals and authorised family members may use it; whether commercial API access exists; what approvals or partnerships are needed; what information can legally be returned; whether claims can be submitted digitally; which documents are required; how settlement works; and which steps can be automated. We also need interviews with individuals, bereaved families, banks, insurers and estate professionals to establish demand and willingness to pay. **A technically possible product is not automatically a viable business.**

### 15.5 Traceability

| ID | Release | Requirement | Done when |
| --- | --- | --- | --- |
| FL-55 | MVP | Link every feature, screen, API, background job, AI tool, data change and test to the requirement IDs in this document. | New product behaviour needs a PRD change first; the LLD, the data schema and tests are updated in the same change, and IDs are preserved. |

---

## 16. Open decisions

None of these blocks the MVP built on sample data. Each must be decided, with a named owner, before the capability it affects goes live.

| ID | Decision | Owner |
| --- | --- | --- |
| D-01 | **Pilot focus:** the product serves everyone (§4). **Decided:** the Pilot starts with bereaved families (Journey C) — see [BRD §4.3](BRD.md#43-why-bereaved-families-first). Still open: Pilot institutions, channels, success targets, and which NRI situations are supported. | Founder |
| D-02 | Identity, relationship and authority: what evidence is required, for which roles and actions, and for how long it is valid | Product (legal review before charging money or partnering) |
| D-03 | Source and channel access: our eligible role, partners and contracts; which sources apply to living vs deceased subjects | Integrations |
| D-04 | Collaboration, family sharing and release after death: recipient verification, notices, disputes and holds | Product |
| D-05 | Privacy and security: hosting, processors, minimum data, retention, deletion, holds and backup expiry | Privacy / security lead |
| D-06 | Evidence freshness, and how amounts and totals work for each asset type | Product + operations |
| D-07 | Workload, cost, capacity, recovery, support hours, case limits and service targets | Engineering + operations |
| D-08 | Distribution, pricing and professional-services model (billing needs a PRD change) | Founder |
| D-09 | Voice: speech provider, initial languages, recording consent and retention, quality and speed thresholds. **Decided (17 Oct 2026), revised the same day for the free-tier rule (D-14):** recognition by Gemini audio on the free API key or the browser's speech recognition (Vertex AI in Mumbai dropped — it bills; Google Speech-to-Text isn't offered in India), replies by Cloud Text-to-Speech within its free quota or the browser's voice; launch languages English (India), Hindi, Hinglish and Tamil; raw audio not retained. Still open: quality and latency thresholds (proposed in [docs/AI_EVALUATION.md](docs/AI_EVALUATION.md)) | Product + AI |
| D-10 | Institution procedures: who keeps them current, how often they are reviewed, and how legal, fraud and complaint escalations work | Operations |
| D-11 | Whether native mobile apps are needed, and device, session, storage and accessibility rules for them | Product + engineering |
| D-12 | **Fee model — decided (17 Oct 2026):** flat or capped fees only; no percentage of recovered money; the family signs and submits; no representation before institutions ([docs/FEASIBILITY_AND_COMPLIANCE.md](docs/FEASIBILITY_AND_COMPLIANCE.md) §2). **The Pilot is free.** Still open: price points and payer after the Pilot (D-08) | Founder |
| D-13 | **Approvals roadmap** — DLT registration (only if SMS is ever used — not needed for Google sign-in), DigiLocker requester, UIDAI OVSE, KYC vendor, advocate panel, legal opinion — owners and dates ([docs/FEASIBILITY_AND_COMPLIANCE.md](docs/FEASIBILITY_AND_COMPLIANCE.md) §8) | Founder + integrations |
| D-14 | **Free tier only — decided (17 Oct 2026):** only free tiers and existing free credits; AI through a free Gemini API key (synthetic data only); hosted on Google Cloud. Sign-in is Google sign-in (phone OTP dropped — SMS bills). Still open: the permanent database, and whether real cases run without AI or a paid AI tier is approved ([docs/FREE_TIER_PLAN.md](docs/FREE_TIER_PLAN.md)) | Founder |

---

## 17. Glossary, change control and references

### 17.1 Glossary

| Term | Meaning |
| --- | --- |
| **CAS** | Consolidated Account Statement — one statement listing a person's mutual fund (and sometimes demat) holdings |
| **Claimant** | A person claiming a deceased person's asset |
| **Executor** | The person named in a will to carry it out |
| **Folio** | An account number at a mutual fund house |
| **Legal heir** | A person entitled to inherit under the applicable succession law |
| **Legal heir certificate / succession certificate** | Official documents establishing who the heirs are or who may collect debts and securities; required by some institutions when there is no nominee |
| **Nominee** | The person named to receive an asset when the holder dies. Being a nominee is not always the same as being the legal owner — for mutual funds, for example, the nominee receives the units as trustee for the legal heirs |
| **Probate** | A court's confirmation of a will |
| **Transmission** | Transferring a deceased holder's investments to the nominee or heir |
| **Evidence status** | Self-declared (the user told us) · Potential match (a search suggested it) · Document-backed (a document supports it) · Institution-verified (the institution confirmed it) |
| **Reference build** | The MVP running on generated sample data, with Gemini (or the fixture provider) on synthetic documents only, used to prove the workflow |
| **Trust gates (G0–G4)** | The steps that unlock a case: G0 account · G1 identity · G2 death evidence · G3 relationship or claimant role (or a living person's consent) · G4 entitlement for a specific asset. How the PRD's identity, relationship and authority rules (FL-03) are built — see LLD §7 |

### 17.2 Change control

- The **one-pager** is the source of truth for vision and scope. If this PRD drifts from it, this PRD is corrected.
- **New product behaviour** — new features, new data use, new access or new promises — requires a change to this PRD first, approved by the product owner.
- Every change to requirements updates [LLD.md](LLD.md), the data schema and tests in the same change.
- Requirement IDs are permanent; retired IDs are never reused.
- Implementation choices inside an accepted requirement do not need a PRD change.

### 17.3 Changes in versions 0.6 – 0.6.2

- Rewritten from first principles in plain language, with [ONE_PAGER.md](ONE_PAGER.md) as the source of truth.
- **Audience:** the product serves everyone with Indian financial assets; the earlier "mainly HNI/UHNI/NRI millennials" focus becomes a later segment; the Pilot starts with bereaved families (D-01, BRD §4).
- **MVP assets:** life insurance added alongside bank/FD and mutual funds.
- Added: personas, product principles, non-functional requirements, data model overview, success metrics with guardrails, risks and assumptions, launch criteria.
- All 55 original requirement IDs (FL-01 to FL-55) and decisions D-01 to D-11 are preserved. v0.6.1 adds FL-56 (Verify console, Later) and records that the MVP uses Gemini on synthetic data, matching [LLD.md](LLD.md) v0.5.
- **0.6.2:** goals renamed GO-1–GO-5 so they are not confused with trust gates G0–G4; trust gates added to the glossary; Professional role (Later) added; government common portal added to official sources; IEPF confirmed as Later; discovery-success and manual-intervention metrics added; exact data formats now point to the Prisma schema; reference build may run on the fixture AI provider without a cloud key; release-tag wording clarified.

**Alignment:** README, BRD v0.3.1, LLD v0.5.1 and DESIGN v0.3.1 are aligned with this version; the old `contracts/` folder from the superseded design was removed (LLD §23).

### 17.4 References

- [ONE_PAGER.md](ONE_PAGER.md) — vision and scope (source of truth)
- [BRD.md](BRD.md) — business case, customers and economics
- [DESIGN.md](DESIGN.md) — screens and interaction
- [LLD.md](LLD.md) — architecture, implementation and tests
- `backend/prisma/schema.prisma` and Zod types — exact data formats
- Official sources: see the research table in §8.2 and the source-by-source matrix in [docs/SOURCE_VALIDATION.md](docs/SOURCE_VALIDATION.md)
- Pre-Pilot documents: [threat model](docs/THREAT_MODEL.md) · [privacy assessment](docs/PRIVACY_ASSESSMENT.md) · [AI evaluation plan](docs/AI_EVALUATION.md)


### Conversational and language acceptance (FL-01, FL-02)

Keeper follows the person's latest language and script, including mixed-language speech and Romanised text, and respects a request to change language. Conversation may continue without a checklist or repeated intake questions. Calls offer automatic language detection or an explicit choice. Speech recognition covers the provider's documented 22 Indian languages plus English; other listed languages use browser recognition where available. Text conversation and spoken-output availability are distinct: the UI must not promise microphone or voice support for every language. The user's approval remains necessary for consequential changes in every language.


### Synthetic hosted MVP acceptance (FL-02, FL-10, FL-19, FL-23, FL-45)

Hosted cases belong to a server-verified Supabase Auth account (Google provider); browser session IDs are permitted only in explicit local demo mode. Google identity establishes account access, never financial authority. Guided official searches save dated, scoped, self-reported outcomes (possible match, no match, partly checked, blocked, failed), keep previous outcomes, and never upgrade asset evidence automatically. Users can delete all Keeper application records after typing DELETE; this does not delete their Google account or the separate authentication-provider identity. Hosted storage uses external PostgreSQL; local SQLite remains a development option. Public deployment stays blocked until hosted database and authentication configuration are complete.


### Conversation workspace acceptance (FL-01, FL-02, FL-10)

The written conversation is the default workspace; calling remains one action away. Saved case memory is visible with its source and can be corrected through existing deterministic controls. Contextual review cards link to document excerpts, possible holdings and claim requirements without implying verification. Action execution displays actual running, completed and failed states. Switching cases or threads resets transient agent state while retaining each saved transcript and draft. The message list scrolls independently so the composer remains available on small screens. Sample-mode suggestions remain explicitly simulated; real-account suggestions use the same conversational agent as typed input.


### Official handoff and continuity (FL-02, FL-10)

Discovery and claim preparation show a named official destination and explain whether the next action is an online search, official instructions, or submission at a branch. External links open separately, transmit no case identifiers, and never mark a search or claim submitted. After a recorded search result or claim submission, ask whether to keep the item in the loop. Save the user’s opt-in and optional review date per case/item; allow pausing and resuming. The conversation displays active follow-ups and links back to the correct review view. Tracking means in-app continuity based on recorded updates, not automatic portal polling or external notifications. Canonical claim outcomes remain the only way to close claims; partial settlement and unresolved disputes remain open.


### Agent execution reliability (FL-01, FL-02, FL-10)

Every conversational action is bound to the case and thread that initiated it. Late replies and queued actions must not execute in a newly selected context. Unmount invalidates outstanding turns. Execution failures replace success-sounding model prose with actual completed/failed results. Conversation persistence is awaited; an unsaved turn remains visible with an explicit retry and blocks later turns until saved. The assistant receives saved, scoped follow-up choices and dates as untrusted case data; it must not imply automatic monitoring.


### Evidence map and durable claim review (FL-06–FL-10, FL-12–FL-16, FL-26–FL-29, FL-37)

Each case has a source-backed evidence map joining holdings, documents, extracted fields, corrections, dated observations, recorded official searches and claims. Links express their actual provenance, never a guessed ownership match. Highlight duplicate candidates, rejected critical fields and conflicting dated observations for human review. The map respects ownership/discovery gates and masks protected asset values.

A persistent claim-review workflow checkpoints evidence collection, reconciliation and canonical claim-pack preparation. One workflow per claim prevents duplicate concurrent runs. Leases permit safe recovery after process interruption; bounded retries expose failure and an explicit retry. Resume after changed evidence rechecks the workflow rather than trusting stale results. The worker never approves, submits, records a financial outcome, or upgrades evidence on its own. Completion of a review is distinct from resolution of the claim. Free-tier Cloud Run may suspend idle background work; returning to the app can advance saved work through an authenticated endpoint.


### Voice fallback clarity (FL-01, FL-02)

If transcription fails, explain that the last utterance was not received and request repetition only when browser recognition is supported and the microphone is enabled. Do not restart listening after a call ends or its context changes. Audio playback failure must speak the failed sentence as well as remaining text through the browser fallback.


Voice transcription recovery (FL-01, FL-02): after primary STT failure, retry the same in-memory audio with the existing Gemini API key under the same AI consent. Bound each provider timeout, never persist audio or log provider secrets, and use browser recognition only if both server providers fail.


Synthetic example conversation (FL-01, FL-02): example sessions may use consented Gemini conversation without sign-in. Example AI receives only supplied conversational history, does not access canonical cases, and returns no executable actions. Clearly label example guidance; retain existing consent, rate limits, masking and failure recovery.


Spoken reply availability (FL-01, FL-02): calls must select server speech when no browser voice is available, including auto language mode. If playback fails, retain the text and show a visible audio-unavailable notice rather than silently implying speech succeeded.


Microphone reliability: the browser loudness meter must not discard a captured recording solely because it failed to detect speech. Send bounded, nonempty recordings for transcription, including manual stop; show pending microphone permission and transcription separately. Permission requests must time out visibly and release any stream that arrives after cancellation.


Local Supabase persistence validation: synthetic local sessions may use the private PostgreSQL keeper schema without changing Google authentication or production auth requirements. Preserve the SQLite database and generate PostgreSQL separately. Browser speech-service failure must offer explicit retry through server transcription, without pretending microphone permissions can be bypassed.


### Contextual conversation continuity (FL-01, FL-02, FL-27)
Returning conversations show a concise case-derived briefing, open-claim and unreviewed-field counts, and a direct next-step action. Calls greet returning users from saved case context. Counts exclude closed claims, duplicate holdings and paused/closed follow-ups. Action activity remains visible during execution and distinguishes completion/failure/skipping; no model intention is displayed as completed work.


### Bounded case agent (FL-01, FL-02, FL-12, FL-27)
A user may delegate case preparation once. Keeper checkpoints source inspection, identifies unresolved evidence, and refreshes existing claim drafts without repeated prompting. Progress persists across restarts and resumes when the conversation returns. Each checkpoint rechecks case access and frozen state; leases fence concurrent execution. Users can pause or recheck a completed run. The agent never confirms holdings, accepts document fields, changes entitlement, approves, submits or records financial outcomes. It pauses with a specific review target when human input is needed; a prepared run is not a resolved case.


### Document-to-claim continuity (FL-06, FL-07, FL-12, FL-27)
Uploaded documents expose a concrete progress checklist: extraction, critical-field review, holding confirmation, authority, claim preparation and external institution verification. After reviewed supporting evidence and explicit holding confirmation for a death case, Keeper idempotently prepares a claim draft and may link the reviewed source policy to its exact requirement. It never accepts fields, confirms holdings, grants authority, accepts declarations, approves or submits on the user’s behalf. Post-review preparation failures must preserve the saved review and expose retry. Each upload/review/confirmation produces an accurate saved conversation update and next record.
