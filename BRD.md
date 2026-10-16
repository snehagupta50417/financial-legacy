# Financial Legacy — Business Requirements Document (BRD)

**An AI-native financial asset discovery, legacy planning and recovery platform.**
*Find what’s yours. Make sure nothing gets left behind.*

| | |
| --- | --- |
| **Version** | 0.3.1 (draft for review) |
| **Date** | 17 October 2026 |
| **Source of truth** | [ONE_PAGER.md](ONE_PAGER.md). Where this BRD and the one-pager disagree, the one-pager wins and this BRD is corrected. |
| **Related documents** | [PRD.md](PRD.md) — what the product does · [LLD.md](LLD.md) — how it is built · [DESIGN.md](DESIGN.md) — screens |
| **Status** | No live service, no customers, no signed partners, no commercial commitments. Figures below are cited public data, not our results. |

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [The business problem](#2-the-business-problem)
3. [Market opportunity](#3-market-opportunity)
4. [Customers and segments](#4-customers-and-segments)
5. [Competitors and alternatives](#5-competitors-and-alternatives)
6. [Value proposition](#6-value-proposition)
7. [Business model](#7-business-model)
8. [Go-to-market](#8-go-to-market)
9. [Business requirements](#9-business-requirements)
10. [Operating model](#10-operating-model)
11. [Success measures and unit economics](#11-success-measures-and-unit-economics)
12. [Assumptions, risks and validation plan](#12-assumptions-risks-and-validation-plan)
13. [Regulatory and legal considerations](#13-regulatory-and-legal-considerations)
14. [Roadmap and milestones](#14-roadmap-and-milestones)
15. [Decisions and readiness](#15-decisions-and-readiness)

### What this document is for

The **PRD** says *what the product does*. This **BRD** says *why the business should exist, who it serves, how it could make money, and what we must prove before spending real money or touching real customer data*. The BRD cannot add product features; anything new goes into the PRD first.

---

## 1. Executive summary

**The opportunity.** India's financial system holds very large sums that rightful owners have lost track of. Official figures (§3) show tens of thousands of crores in unclaimed bank deposits alone, plus thousands of crores each in insurance and mutual funds. The government ran a nationwide campaign in late 2025 that returned ₹5,777 crore on nearly 23 lakh claims in a few months — evidence that **people act when someone guides them**. About 89 lakh deaths are registered in India each year; each one can leave a family with the same two problems: *what did they own, and how do we claim it?*

**What we sell.** Not the money — that always belongs to the family. We sell **guidance and coordination**: an AI assistant, backed by trained people, that turns scattered documents and procedures into one evidence-backed inventory and ready-to-file claims, then tracks each claim to a documented outcome.

**Who we start with.** The product serves everyone (see [PRD §4](PRD.md#4-who-it-is-for)). The **pilot focuses on bereaved families** (PRD Journey C): the most urgent need, the clearest value, and the journey that exercises every part of the product.

**How we could make money.** Four hypotheses from the one-pager — consumer services, institutional partnerships, software for institutions, and professional collaborations (§7). None is chosen yet; the pilot must tell us which one people and institutions will actually pay for. We will never earn money by selling financial data.

**Why us, and the honest gap.** Official tools each cover one asset type and stop at "here is a match". Wealth trackers only see active assets you already know about. One company, **Yellow**, already covers wills, planning and some recovery — mainly through legal services. Our difference must be an AI-led, evidence-first case manager across asset types; we have not yet proven it (§5).

**What must happen next.** Build the MVP on sample data; then run a small pilot with bereaved families to measure: do they finish, how much faster, how accurately, and who will pay.

---

## 2. The business problem

People spread their savings across banks, fund houses, insurers and government schemes. Over a lifetime they change jobs, cities, phone numbers and banks, lose documents, and forget to update nominees. When they die, their family faces:

1. **Discovery** — not knowing what exists or where.
2. **Recovery** — even for known assets, a separate procedure, document list, identity check and timeline at each institution.

**The cost to families** is time (repeated branch visits, forms and follow-ups over months), money (fees to agents, lawyers or CAs, or assets abandoned as "not worth the effort"), and stress at the worst possible moment.

**The cost to the system** is money that sits idle in regulatory funds instead of with its rightful owners, and institutions spending effort on unclaimed balances and incomplete claims. Regulators have made reducing unclaimed assets a stated priority (§3).

**Why it persists:** there is no single register of what a person owns; official tools each solve one slice; and knowing an asset exists is not the same as having the right to claim it. (See [PRD §2.2](PRD.md#22-why-this-is-hard-to-solve-first-principles).)

---

## 3. Market opportunity

### 3.1 What official data tells us

| Indicator | Figure | As of | Source |
| --- | --- | --- | --- |
| Unclaimed bank deposits held in RBI's Depositor Education and Awareness (DEA) Fund — **public sector banks only** | ₹60,518 crore | 31 Jan 2026 | [PIB, 24 Mar 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2244475) |
| Unclaimed amounts with insurers (all insurers) | ₹8,973.89 crore | 28 Feb 2026 | [PIB, 24 Mar 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2244475) |
| Unclaimed mutual fund amounts | ₹3,749.34 crore | 28 Feb 2026 | [PIB, 24 Mar 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2244475) |
| People registered on RBI UDGAM (unclaimed deposit search) | 18.86 lakh | 1 Mar 2026 | [PIB, 24 Mar 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2244475) |
| Banks covered by UDGAM | 30 banks, ~90% of DEA Fund value | Mar 2024 | [RBI UDGAM FAQ](https://www.rbi.org.in/commonman/english/scripts/FAQs.aspx?Id=3579) |
| "Your Money, Your Right" campaign (Oct–Dec 2025): money returned | ₹5,777 crore on 22.95 lakh claims, camps in 748 districts | 28 Feb 2026 | [PIB, 24 Mar 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2244475) |
| Government "common landing portal" for unclaimed assets launched | unclaimedassetsportal.in | 29 May 2026 | [PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2266714) |
| Registered deaths per year | ~89.4 lakh (2024) | 2024 | Civil Registration System 2024, as summarised by [Drishti IAS](https://www.drishtiias.com/daily-updates/daily-news-analysis/civil-registration-system-crs-report-2024) — official report to be checked directly |

**Reported but not yet confirmed from a primary source** (use with care, label as reported):

| Indicator | Reported figure | Note |
| --- | --- | --- |
| Total unclaimed financial assets across all categories | ~₹1.84 lakh crore | Headline cited at the Oct 2025 campaign launch ([Business Today](https://www.businesstoday.in/amp/personal-finance/banking/story/finance-minister-launches-rs-1-84-lakh-crore-unclaimed-assets-campaign-496827-2025-10-04)); no official breakdown found |
| DEA Fund, all banks | ₹86,917 cr or ₹98,073 cr | Two news reports of the same Rajya Sabha answer (Aug 2026) disagree; check the answer text before use |
| LIC unclaimed amounts | ₹7,318.50 cr incl. accrued income (31 Mar 2026) | [Moneylife](https://moneylife.in/article/lics-unclaimed-funds-rise-to-7318-crore-epfo-inoperative-accounts-hold-9330-crore-govt/81108.html), citing a Lok Sabha reply |
| EPFO inoperative accounts | ₹9,330.56 cr (31 Mar 2026) | Same source. EPFO calls these "inoperative", not "unclaimed" |
| IEPF claims approved in two years | 75,417 claims; ₹77.82 cr dividends refunded | [Outlook Money](https://www.outlookmoney.com/personal-finance/unclaimed-funds-in-iepf-over-75000-claims-approved-in-two-years-rs-7782-crore-dividend-refunded), citing a Lok Sabha reply (Jul 2026) |

### 3.2 How to read these numbers

- **Don't add them up.** They come from different dates and definitions, and some overlap.
- **Unclaimed money is not our market size.** It belongs to families. Our market is **the number of people who need guided help and what they — or institutions — will pay for it**.
- **The demand signal is real.** 18.86 lakh people registered on UDGAM, and a three-month government campaign returned ₹5,777 crore on 22.95 lakh claims. People want this money back and act when guided.
- **The need recurs.** Roughly 89 lakh registered deaths a year means a continuous stream of families facing the problem, independent of the stock of old unclaimed money.
- **Policy tailwind.** RBI, IRDAI and SEBI have all stepped up measures on unclaimed assets, and the government launched a common portal in 2026. Institutions are under pressure to reduce unclaimed balances — a possible reason for them to partner with us.

### 3.3 What we still need to estimate (in the pilot)

Our serviceable market is: *families and individuals with a qualifying need* × *share who would use a guided service* × *what they or a sponsor would pay*. None of these three is measured yet. We will not publish a TAM/SAM/SOM until pilot data supports it.

---

## 4. Customers and segments

### 4.1 Who the product serves

Everyone with Indian financial assets who needs one of the three journeys — discover, plan a legacy, or claim after a death ([PRD §4](PRD.md#4-who-it-is-for)).

### 4.2 Segments

| Segment | Core job | Urgency | Willingness to pay (hypothesis) | Role in plan |
| --- | --- | --- | --- | --- |
| **Bereaved families** (claimants) | Find and claim a relative's assets | **High** — triggered by an event, deadlines exist | Medium–high, especially once an asset is found | **Pilot focus** |
| **Planners** (incl. seniors and their adult children) | Organise assets so the family can find them later | Low–medium — important, rarely urgent | Low as individuals; possibly via employer or bank | Second |
| **Self-discoverers** | Find their own forgotten or unclaimed assets | Low–medium | Low; official search is free | Supported, not targeted |
| **Wealthier and NRI families** (HNI/UHNI/NRI) | Same jobs with more institutions, advisers or cross-border steps | Varies | Higher; may prefer a concierge service | Later segment, possibly via wealth managers |

Wealth, age and residency overlap and are not eligibility rules. We never ask for net worth to qualify someone.

### 4.3 Why bereaved families first

1. **Urgency** — the need is triggered by an event; they are actively looking for help.
2. **Clear value** — a found asset or a completed claim is a concrete result.
3. **Full product test** — this journey uses discovery, authority, claims and tracking, so it proves the whole engine.
4. **Natural channels** — banks' and insurers' deceased-claims desks, hospitals, funeral and cremation services, CAs and lawyers already meet these families (§8).

### 4.4 User, payer and beneficiary can differ

The person using the product (e.g. a son), the person who benefits (the heirs), and the person or organisation that pays (the family, a bank, an insurer, an employer) may all be different. Paying for a case never grants access to someone else's records ([PRD §4.2](PRD.md#42-roles-inside-the-product)).

---

## 5. Competitors and alternatives

Research checked 17 October 2026. Details marked *unverified* could not be confirmed from the company's own site.

| Alternative | What it does | How it charges | Gap compared with Financial Legacy |
| --- | --- | --- | --- |
| **RBI UDGAM** | Searches unclaimed deposits across participating banks; claims are made at the bank | Free | Bank deposits only; no claim preparation or tracking |
| **SEBI MITRA / MFCentral** | Traces inactive and unclaimed mutual fund folios; MFCentral consolidates folios and has a transmission request | Free | Mutual funds only; families still navigate transmission themselves |
| **IRDAI Bima Bharosa** | Links to each insurer's unclaimed-amount search | Free | Insurer by insurer; nothing consolidated |
| **Government common portal** (unclaimedassetsportal.in, 2026) | Single landing page linking official searches | Free | A directory of searches, not a case manager *(capabilities to be reviewed)* |
| **DigiLocker** (SEBI framework) | Stores demat and MF statements; nominee access after death *(current status unverified)* | Free | Stores documents; no claim guidance. **Overlaps with our legacy record** |
| **Account Aggregator apps** | Consent-based sharing of financial data | Free to consumers | Infrastructure, not a heir service — a possible future data source for us |
| **Share Samadhan** | Human-led recovery: IEPF, share transmission, insurance, MF, PF, dormant deposits, NRI cases | Quote-based | Service, not product; strongest on shares; no planning |
| **InvestorLink** | Marketplace connecting users to professionals for IEPF, transmission, insurance and MF recovery | ₹399–999 consultations; recovery fees not public | Share-focused marketplace; outcomes depend on the professional |
| **Yellow** (getyellow.in) | Online wills, probate and succession help, IEPF and DEAF recovery, insurance claims; "SMART" asset-transfer planning | Wills ₹2,499–5,999; SMART from ₹499/yr | **Closest competitor — touches all three journeys.** Strength is legal services; AI-led discovery and evidence-first case management are not its focus |
| **INDmoney, Kuvera, MProfit** | Track known, active holdings | Free tracking (others unverified) | Only active assets you already know about; nothing for heirs |
| **CAs, lawyers, bank relationship managers** | Paperwork, succession certificates, probate, transmission | Per matter or hourly | Trusted for complex cases; slow, fragmented, costly for small estates |
| **Families doing it themselves** | Branch visits and portals | Their own time | The default — and the main thing we replace |
| *International reference:* **Empathy** (US) | AI plus human support after a death; sold to insurers, employers and banks | B2B | Shows a working "institution pays" model |
| *International reference:* **Atticus** (US) | Do-it-yourself probate software for executors | Consumer-paid *(pricing unverified)* | Shows consumers will pay for guided estate settlement |

### 5.1 Where we are genuinely different

- **Across asset types, in one case.** Official tools are silos (banks, funds, insurance, shares). We coordinate them in one case and connect "here's a match" to "here's a ready-to-file claim and who to send it to".
- **Evidence-first honesty.** Every asset is labelled self-declared, potential match, document-backed or verified, and every search states what it did not cover.
- **From legacy record to claim.** What a planner records today becomes the starting evidence for their family's claims later.
- **AI that manages the case,** with people for the hard parts — not a form library and not purely human service.

### 5.2 Where we are not (yet) different — honest view

- **Searching is free.** The official portals cost nothing, so we cannot charge for search alone. Our value must be preparation, coordination and completion.
- **Yellow already exists** across wills, planning and recovery, backed by legal services. We need a crisp answer to "why not Yellow?" — likely: faster AI-led preparation, multi-asset evidence management and lower cost for straightforward cases, partnering with professionals for complex ones.
- **DigiLocker nominee access** may cover part of the legacy-record value for some assets.
- **The last step stays physical.** Branch visits, KYC, and sometimes succession certificates or probate remain. Recovery firms, CAs and lawyers will still be needed for complex or disputed estates — a **partner model** is more realistic than replacing them.

---

## 6. Value proposition

| For… | Who… | We offer… | Unlike… |
| --- | --- | --- | --- |
| **Bereaved families** | have lost someone and don't know what they owned or how to claim it | one guided case that finds assets across banks, funds and insurance, prepares each claim correctly and tracks it to an outcome | visiting each institution and portal separately, or paying an agent per asset |
| **Planners** | want their family to find everything later | a dated, evidence-backed record with nominee gaps highlighted and a safe way to share it when they choose | a spreadsheet or a will that lists nothing about where the accounts are |
| **Self-discoverers** | suspect they have forgotten money | an honest discovery plan across official sources, with results kept as possible vs confirmed | searching each portal alone without knowing which applies |
| **Banks and insurers** | must reduce unclaimed balances and handle death claims well | better-prepared claims, fewer incomplete submissions, and a respectful experience for grieving customers | handling incomplete paperwork and repeat visits |
| **Professionals** (CAs, lawyers) | handle estates | organised evidence and a clean case file for complex matters | starting every case from a shoebox of papers |

---

## 7. Business model

**Principle:** the business earns revenue from providing services — never from selling sensitive financial information, and never as a percentage of a family's own money unless that is explicitly validated as fair, lawful and clearly disclosed.

### 7.1 Revenue hypotheses

All four come from the one-pager. None is selected; the pilot decides.

| Stream | What is sold | Who pays | What would prove it | What would disprove it |
| --- | --- | --- | --- | --- |
| **1. Consumer services** | Fixed-fee claims support per case; paid discovery assistance; optional legacy-planning subscription | Families and individuals | Pilot users accept a stated fixed price at the point of value (e.g. after assets are found, before claims are prepared) | Users drop off at the price screen, or only accept free |
| **2. Institutional partnerships** | The service offered to an institution's customers or employees (e.g. bank offers it to bereaved families; employer offers it as a benefit) | Banks, insurers, wealth managers, employers | A signed pilot where the institution sponsors cases and measures fewer incomplete claims or better satisfaction | Institutions see it as a compliance risk or won't share costs |
| **3. Software for institutions** | Claims-workflow tools, document processing, or a customer-facing legacy service — including a **Verify console** where a bank or insurer checks a death claim's documents for consistency, duplicates and completeness ([PRD FL-56](PRD.md#97-tasks-reminders-and-operations), Later) | Banks and insurers | An institution pays to use our claim-pack and evidence tools internally | Institutions prefer to build or buy core-banking add-ons |
| **4. Professional collaborations** | Referral or platform fee when complex cases are handed to permitted professionals | Professionals or the family, by agreement | Professionals accept cases and families value the handoff | Conflicts of interest, or professional rules forbid the arrangement |

### 7.2 Pricing principles (to be validated)

- Price the **service**, not the size of the estate, by default.
- Show the price **before** work begins; no surprise fees.
- Basic discovery guidance is free (official search is free anyway). **Assisted discovery** — our team preparing and following up institution enquiries for a case — is a paid option, as the one-pager's "paid discovery assistance". Charge mainly for preparation, coordination and tracking.
- A possible percentage-of-recovery model is **not** assumed; if ever tested it needs legal review, a cap and clear disclosure.

### 7.3 Cost structure (what we will measure)

AI processing (model and speech); document storage and security; operator time per case (the largest unknown); support; partner costs; customer acquisition. The pilot must measure each per useful result (§11).

---

## 8. Go-to-market

### 8.1 Pilot channels for bereaved families

| Channel | How it reaches families | What we'd test |
| --- | --- | --- |
| **Bank and insurer deceased-claims desks** | Institutions refer families who arrive with incomplete paperwork | Referral volume; whether institutions see fewer incomplete claims |
| **Hospitals, hospices, cremation and funeral services** | Information given to families after a death | Response rate; sensitivity of approach |
| **CAs, lawyers and estate professionals** | Professionals hand over the paperwork-heavy part | Referral volume; partner fit |
| **Employers (HR benefit)** | Offered to employees' families after a death | Sponsor interest; usage |
| **Search and content** | Plain-language guides ("how to claim a deceased parent's LIC policy") | Organic sign-ups; cost per acquisition |
| **Community and language partners** | Senior-citizen groups, regional-language outreach | Reach to older and non-English users |

### 8.2 Positioning

"We help families find and claim what a loved one left behind — step by step, across banks, funds and insurance — and we never take your money or sell your data."

### 8.3 Trust is the product

For grieving families handing over death certificates and financial documents, trust decides adoption. Go-to-market must lead with: clear consent, the user approving every action, no access to money, visible audit trail, and a human to talk to.

---

## 9. Business requirements

Each business requirement maps to the product requirements that deliver it in [PRD.md](PRD.md). Business requirements do not enable "Later" product capabilities early.

| ID | Business requirement | Why the business needs it | Delivered by (PRD) |
| --- | --- | --- | --- |
| BR-01 | Serve discovery, legacy planning and claims independently; a family that already knows the assets goes straight to claims | Each segment has a different entry point; forcing one path loses customers | FL-01, FL-22 |
| BR-02 | Produce records people can trust, without overstating certainty | Trust is the product; one false "verified" damages the brand | FL-06–FL-10, FL-25–FL-30 |
| BR-03 | Help people prepare for their family without accidental disclosure | Planners will not use it if naming a contact leaks their finances | FL-11, FL-24, FL-31–FL-34 |
| BR-04 | Carry supported claims through to a documented result | Completion is the value families pay for | FL-12–FL-17, FL-35–FL-37 |
| BR-05 | Keep the case moving and make the next step obvious, by voice or text | Abandonment is the main failure mode for long procedures | FL-02, FL-20, FL-21 (Later), FL-38–FL-43 |
| BR-06 | Protect people's records and their permission to act | A single breach or wrong disclosure could end the business | FL-03, FL-04, FL-05, FL-18, FL-19, FL-23, FL-24, FL-45–FL-49 |
| BR-07 | Deliver a usable, reliable and measurable service | We must prove value and cost with real numbers, not claims | FL-50–FL-54 |
| BR-08 | Expand only within accepted scope and validated procedures | Unsafe expansion creates legal and reputational risk | FL-44, FL-55, FL-56 (Later) |

---

## 10. Operating model

### 10.1 Who does what

| Role | Responsibility | Cannot |
| --- | --- | --- |
| **User / claimant** | Supplies information, reviews corrections, grants scoped consent, approves each disclosure or submission | — |
| **Case operator** (our staff) | Reviews evidence and authority, handles exceptions and stuck cases, records reasons | Decide inheritance; approve a disclosure on the user's behalf |
| **Procedure owner** | Keeps each institution's claim procedure current, with source dates and review schedule | Enable an unsupported procedure |
| **Integration owner** | Manages source access, agreements and suspensions | Use a source without approval |
| **Product / business owner** | Accepts scope, segments, promises, targets and commercial choices | — |
| **Privacy, security and qualified legal reviewers** | Approve data use, authority rules, retention, processors and escalation | — |
| **Institutions and external professionals** | Make their own verification and settlement decisions | — |

### 10.2 Service design for the pilot

- Every case shows who owns the next step and whether it is waiting on the user, our team or the institution.
- Unsupported situations (joint holdings without a known procedure, minors, disputes, unsupported NRI cases) are put on hold and handed to a person ([PRD §5.4](PRD.md#54-situations-that-need-special-handling)).
- **Before the pilot starts**, name: operator staffing, support hours, maximum active cases per operator, and escalation contacts for legal, fraud and complaints. None of these is committed yet.

---

## 11. Success measures and unit economics

### 11.1 Business measures

Product metrics are defined in [PRD §13](PRD.md#13-success-metrics). The business tracks these:

| Measure | Definition | Question it answers |
| --- | --- | --- |
| Useful-outcome rate | Cases reaching a first reviewed useful result ÷ started cases, by journey | Do we deliver value? |
| Time to value | Median and 90th-percentile time to that result, user effort separated from waiting | Are we faster than doing it alone? |
| Claim-pack first-time acceptance | Packs accepted as complete at the institution's first review ÷ packs reviewed, by institution | Do we save families repeat visits? |
| Outcomes | Settled / transferred / partly settled / rejected / unresolved, and time in each state | What actually happens? |
| Conversion to paid | Paying cases ÷ cases offered a price, by price point and channel | Will people pay? |
| Acquisition cost | Spend per started case and per paying case, by channel | Can we reach them affordably? |
| Trust | Complaints, unauthorised-action count (must be zero), research trust score | Do people feel safe? |

### 11.2 Unit economics (to fill in during the pilot)

| Per useful result | Value |
| --- | --- |
| Revenue (by stream) | *measure* |
| AI and speech processing cost | *measure* |
| Storage and security cost | *measure* |
| Operator time × cost | *measure* — largest unknown |
| Support cost | *measure* |
| Acquisition cost | *measure* |
| **Contribution margin** | *revenue − the above* |

Margins are calculated from our actual service revenue and costs — **never** from the value of assets families recover. **No numerical targets are set yet**; they are agreed under decisions D-01, D-07 and D-08 before the pilot.

---

## 12. Assumptions, risks and validation plan

### 12.1 Key assumptions

| # | We assume… | How we test it | Pass signal |
| --- | --- | --- | --- |
| A1 | Bereaved families will trust a guided digital service with sensitive documents | Pilot sign-up and completion; interviews | Majority of started cases reach a useful result |
| A2 | Guided use of official searches finds assets families did not know about | Count new holdings found per case | A meaningful share of cases find at least one new holding |
| A3 | We can prepare claims accurately enough to reduce repeat visits | First-time acceptance by institution | Clearly better than families' own first attempts (baseline from interviews) |
| A4 | Someone will pay — family, institution or employer | Price tests; partner conversations | At least one stream converts at a viable price |
| A5 | Operator effort per case is affordable | Time tracking in the pilot | Cost per useful result below price |
| A6 | AI reads Indian financial documents well enough with human review | Evaluation set ([PRD FL-53](PRD.md#102-ai-requirements)) | Critical-field accuracy meets the agreed threshold |
| A7 | Voice helps older and non-English users | Usability tests with users over 60 and in Indian languages | Higher completion than text-only |

### 12.2 Business risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Families won't pay because official search is free | No consumer revenue | Charge for preparation and completion, not search; test institution-paid models |
| Yellow or a bank builds the same thing | Squeezed market | Speed, multi-asset evidence quality, partnerships with institutions and professionals |
| Impersonation of an heir leads to a wrong payout or disclosure | Severe harm, legal exposure, brand loss | Per-asset authority, holds, operator review; we never hold money |
| Operator cost is too high | Unprofitable | Automate evidence work, restrict to supported situations, price by complexity |
| Regulated access (AA, DigiLocker) is not granted | Discovery stays manual | MVP and pilot designed to work without them |
| Institutions see us as a risk | No partnerships | Lead with compliance, consent and better-prepared claims |
| Grief makes the experience feel exploitative | Reputational damage | Respectful design, transparent pricing, no pressure selling |

### 12.3 What must be validated before scaling (from the one-pager)

For every institution or discovery system: which assets it covers; what information is needed to search; whether individuals and authorised family members may use it; whether commercial API access exists; what approvals or partnerships are needed; what information can legally be returned; whether claims can be submitted digitally; which documents are required; how settlement works; and which steps can be automated.

We must also interview individuals, bereaved families, banks, insurers and estate professionals to establish real demand and willingness to pay. **A technically possible product is not automatically a commercially viable business.**

---

## 13. Regulatory and legal considerations

Not legal advice; each item needs review by qualified counsel before the pilot.

| Area | Why it matters | What we need |
| --- | --- | --- |
| **Digital Personal Data Protection Act, 2023 and Rules** | We process sensitive personal data of the living, the deceased and their families | Privacy notice, purpose-bound consent, retention and deletion, processor agreements, grievance officer, breach response ([PRD §11.2](PRD.md#112-privacy-and-data-protection)) |
| **Authority to act for the deceased** | Nominees, legal heirs, executors and joint holders have different rights by asset and law | Approved evidence rules per asset and claimant type (decision D-02) |
| **Investment, tax and legal advice** | Advice can require registration or licensing | Product explains procedures only; no advice (PRD §3.3) |
| **Account Aggregator access** | Only regulated entities in defined roles may receive data | Validate an eligible role or partner before use (D-03) |
| **DigiLocker access** | Requires partner approval and agreements | Apply only if pilot shows clear value (D-03) |
| **Fees for claim assistance** | Some fee structures (especially percentage of recovery) may be restricted or seen as unfair | Legal review of any pricing before launch (D-08) |
| **Institution terms** | Banks and insurers may restrict third-party involvement or automation | Manual submission by the family in the MVP; formal channels before automating |
| **Consumer protection** | Clear disclosures, no misleading claims of complete discovery | Honest coverage messaging; reviewed marketing copy |

---

## 14. Roadmap and milestones

| Stage | What happens | Business gate to move on |
| --- | --- | --- |
| **0. MVP (reference build)** | All three journeys on sample data; bank/FD, mutual funds and life insurance; voice and chat | PRD MVP launch criteria met ([PRD §15.1](PRD.md#151-mvp-reference-build--complete-when)) |
| **1. Research and partner conversations** (in parallel) | Interviews with bereaved families, banks, insurers, CAs and lawyers; 1–2 institution pilot conversations | Clear evidence of need; at least one channel partner interested |
| **2. Pilot** | Small, controlled pilot with bereaved families through one or two channels; supported institutions only | Pilot entry criteria met ([PRD §15.2](PRD.md#152-pilot--may-start-when)); unit economics measured |
| **3. Commercial launch** | Chosen revenue stream(s), wider channels, more institutions | Positive contribution margin per useful result; trust measures clean |
| **4. Scale** | More asset types, languages, live integrations, sharing and release features | Each "Later" capability passes its own gate (PRD §15.3) |

Dates are not committed. The AI Builder Cup prototype deadline in [BACKEND_PLAN.md](BACKEND_PLAN.md) is an engineering milestone and does not change these business gates.

---

## 15. Decisions and readiness

### 15.1 Decisions

There is **one decision register: [PRD §16](PRD.md#16-open-decisions)**. The decisions most relevant to the business are:

- **D-01** — pilot focus: **bereaved families** (decided in this version); still open: pilot institutions, channels and success targets.
- **D-07** — operating capacity, support hours and cost targets.
- **D-08** — revenue stream(s), pricing and payer.
- **D-02, D-03, D-05** — authority rules, source access and privacy policy before real data.

### 15.2 What can start now

- Building the MVP on sample data.
- Customer and partner interviews.
- Legal and privacy review.

### 15.3 What cannot start yet

- Using real customer data, charging money, or signing partner commitments — until the relevant PRD gates, named operating owners, privacy and authority policies, verified institution procedures and pilot readiness are accepted.

### 15.4 Changes in this version (0.3)

- Rewritten in plain language with [ONE_PAGER.md](ONE_PAGER.md) as the source of truth and aligned to [PRD v0.6.2](PRD.md).
- **0.3.1:** Verify console named under revenue stream 3; paid assisted discovery reconciled with the one-pager; BR mapping completed (FL-05, FL-21, FL-56).
- **Audience:** the product serves everyone; the earlier "mainly HNI/UHNI/NRI millennials" targeting becomes a later segment. **Pilot focus: bereaved families.**
- **Added:** cited market figures, competitor research (including Yellow and the 2026 government portal), value proposition, the four revenue hypotheses with tests, go-to-market, unit-economics template, regulatory considerations and roadmap.
- **Kept:** business requirements BR-01 to BR-08, now mapped to PRD IDs.
