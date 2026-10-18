# Financial Legacy — Source-by-Source Validation Matrix

> Documentation review — 18 October 2026. Dated source/procedure research, not a fresh portal/legal audit or proof of integration. Keeper supports handoff links and saved scoped self-reported outcomes; it does not automatically search these portals or verify ownership. Original source dates remain unchanged. See [CURRENT_STATE](CURRENT_STATE.md).

| | |
| --- | --- |
| **Version** | 0.1 (draft for review) |
| **Research date** | 17 October 2026 |
| **Owner** | Integrations + operations (PRD decisions D-03, D-10) |
| **Required by** | [ONE_PAGER §11](../ONE_PAGER.md#11-what-must-be-validated-before-scaling), [PRD §15.4](../PRD.md#154-what-must-be-validated-before-scaling) |
| **Covers** | Every official source and claim route the MVP relies on (bank/FD, mutual funds, life insurance), plus two Later sources |
| **Status** | Desk research only. Nothing here is a partnership, permission or legal opinion. Re-check every row before the Pilot and on each source's change. |

**Verification key:** **V** = read on an official page or document · **S** = secondary sources only (news, law firms, other fund houses) · **U** = unverified.

---

## 1. Headline findings

1. **No discovery source offers an API we can use.** UDGAM, the common portal, SEBI MITRA and the insurers' searches are all manual web tools. The MVP's "guided search" design (the user searches; we record the outcome) is the right one ([LLD §9.1](../LLD.md#91-mvp-discovery)).
2. **Discovery portals only find; claims always go to the institution.** Every match ends in a bank, fund house/registrar or insurer procedure.
3. **Claim rules changed recently, in families' favour:**
   - **Banks:** RBI's 2025 Directions — simplified claims up to ₹15 lakh (commercial banks) without a succession certificate, 15-day settlement, compensation at Bank Rate + 4% for delay. In force by 31 March 2026.
   - **Mutual funds:** SEBI's circular of 23 July 2026 — Quick Transmission up to ₹10,000 per fund house, simplified transmission up to ₹10 lakh (₹30 lakh demat), probate no longer mandatory, 21-day settlement.
4. **Institution pages lag the rules.** KFintech's transmission page still shows the old thresholds. Claim procedures must be versioned with a source date and checked against the regulator's text, not only the institution's page (FL-12, FL-44).
5. **Account Aggregator and DigiLocker are not realistic MVP routes.** AA needs a regulated role and customer consent, with no route for deceased customers found. DigiLocker needs partner approval and audit.

---

## 2. Discovery sources (MVP)

| Source | What it covers | Who may use it | Search needs | Returns | API | Claims | Key facts | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **RBI UDGAM** ([portal](https://udgam.rbi.org.in/unclaimed-deposits/#/login), [FAQ](https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQonUDGAMPortal.pdf)) | Deposits moved to RBI's DEA Fund (unoperated ≥ 10 years) at onboarded banks. **Not** active accounts | Anyone with a mobile number (OTP, captcha). Third-party use: **U** | Holder name + bank(s) + one of PAN, driving licence, voter ID, passport, date of birth (or address) | Possible match + the bank's claim information | None found | At the bank | 30 banks, ~90% of DEA value (Mar 2024; newer count U). No time limit to claim | V |
| **Government common portal** ([site](https://www.unclaimedassetsportal.in/), [PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2266714)) | Landing page for deposits, insurance, shares, dividends, mutual funds | Citizens | — (redirects) | Links to UDGAM, Bima Bharosa, MITRA, IEPF | U | None | Launched 29 May 2026 by the Department of Financial Services with the PSB Alliance | Launch V; "links only" S |
| **SEBI MITRA** ([circular, 12 Feb 2025](https://www.sebi.gov.in/legal/circulars/feb-2025/service-platform-for-investors-to-trace-inactive-and-unclaimed-mutual-fund-folios-mitra-mutual-fund-investment-tracing-and-retrieval-assistant-_91847.html), via [MFCentral](https://app.mfcentral.com/investor/signin)) | Inactive mutual fund folios (no transaction for 10 years) and unclaimed amounts | The investor (PAN/PEKRN + OTP). Search for a deceased person: **U** | PAN; optionally contact details, folio, date of birth, bank account, address | Fund house; folio/value shown: U | U | Through the fund house / registrar | Reported cap of 25 searches per user (S) | Existence V; fields S |
| **MFCentral** ([site](https://www.mfcentral.com/)) | Consolidated mutual fund view across fund houses; service requests; transmission request link | Logged-in investor | PAN + OTP (U) | Holdings and folios | None found | Transmission request link exists; fully online flow U | — | Links V; flow U |
| **IRDAI Bima Bharosa** ([site](https://bimabharosa.irdai.gov.in/)) | Unclaimed insurance (unpaid > 12 months after due) | Policyholder, nominee, legal heir | Via each insurer's page | Links to every insurer's enquiry | No | At the insurer | Unclaimed > 10 years moves to the Senior Citizens' Welfare Fund, still claimable for 25 years; no fee ([PIB, Dec 2025](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/dec/doc20251226745501.pdf)) | V |
| **LIC unclaimed amounts** ([page](https://licindia.in/Bottom-Links/Unclaimed-Policy-Dues)) | Unclaimed LIC policy dues | Anyone | Name + date of birth (policy number, PAN optional) | Whether an amount exists; updated half-yearly | No | At the servicing branch | — | S |

---

## 3. Claim routes (MVP)

### 3.1 Bank deposits (and lockers)

**Rule:** *RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025* — RBI/2025-26/82, dated 26 September 2025, in force by 31 March 2026 ([notification](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12901)). **V**

| Path | Documents | Notes |
| --- | --- | --- |
| **Nominee / survivor** | Claim form (Annex I-A), death certificate, claimant's officially valid ID | No succession certificate, whatever the amount |
| **No nominee, up to ₹15 lakh** (commercial banks) / **₹5 lakh** (co-operative banks); banks may set higher | Claim form (I-B), death certificate, ID, indemnity bond (I-C), no-objection from other heirs (I-D), legal heir certificate **or** an independent person's declaration (I-E) | No surety required |
| **No nominee, above threshold** | Succession certificate, legal heir certificate or affidavit; bank may require a surety | — |
| **Missing person** | FIR and non-traceable report instead of a death certificate, for amounts under ₹1 lakh | — |

- **Timelines:** settle deposits within **15 calendar days** of complete documents; delay compensation at least **Bank Rate + 4% a year**. Lockers: 15 days, then **₹5,000 per day** of delay.
- **Submission:** at any branch; banks *may* offer online lodging and tracking, and may still require originals.

### 3.2 Mutual funds

**Rule:** SEBI circular HO/38/13/11(14)2026-MIRSD-POD/I/17111/2026, dated 23 July 2026, effective about 22 August 2026 ([circular](https://www.sebi.gov.in/legal/circulars/jul-2026/ease-of-doing-investment-and-ease-of-doing-business-simplification-and-standardisation-of-the-framework-for-transmission-of-securities_103030.html)). **V.** Registrar pages: [KFintech](https://mfs.kfintech.com/investor/General/GuidelinesTransmission) (**still shows old thresholds**), [CAMS](https://www.camsonline.com/Investors/Service-requests/Transmission/Transmission) (U).

| Path | Documents | Notes |
| --- | --- | --- |
| **Nominee** | Request form (Annexure-3), death certificate (a QR-verifiable copy is accepted), statement of account / client master | Nominee receives as **trustee for the legal heirs** |
| **Quick Transmission (QTP), up to ₹10,000 per fund house** | Plain-paper form-cum-undertaking (Annexure-2) + proof of relationship | Immediate relatives only (parents, spouse, children, parents-in-law) |
| **Simplified, up to ₹10 lakh** (₹30 lakh demat) | Notarised indemnity bond + affidavit-cum-NOC from all legal heirs, **or** a family settlement deed | — |
| **Above threshold** | Affidavit-cum-NOC + one of: will + indemnity bond; legal heir certificate (Tehsildar or above) + indemnity bond; succession certificate / letter of administration / court decree | **Probate no longer mandatory** |

- **Timelines:** settle within **21 calendar days** of complete documents; delays and rejections explained in writing. Value at the last NAV.
- **Submission:** online upload and tracking *may* be offered; originals may still be demanded.

### 3.3 Life insurance (LIC as the reference insurer)

([LIC forms](https://licindia.in/download-forms), [policy conditions](https://licindia.in/policy-conditions)) — forms **V**, timelines **S**.

| Path | Documents |
| --- | --- |
| **Nominee** | Claim Form A (**Form 3783**); Form 3783(A) if the policy ran 3+ years; certified death-register extract; original policy; NEFT mandate + cancelled cheque. Extra forms for deaths within 3 years of start or revival; FIR, post-mortem and police report for unnatural deaths |
| **No nominee** | All of the above plus **evidence of title** (legal proof of entitlement); the branch may relax this in some cases |

- **Timelines (verified):** death claims must be settled **within 15 days from the date the claim is intimated**, or **45 days** if investigation is warranted; if late, interest at **Bank Rate + 2%** runs from intimation to payment and is paid without the claimant asking; no claim may be rejected or closed "for want of documents" — IRDAI Master Circular IRDAI/PP&GR/CIR/MISC/117/9/2024, 5 Sep 2024, Section I Part A, item V ([IRDAI](https://irdai.gov.in/document-detail?documentId=5625747)). **V**. Practical step: help the family send **written intimation to the servicing branch on day 1** — the clock starts then.
- **Submission:** death intimation at the servicing branch; online claim path not found (U).

---

## 4. Later sources

| Source | Eligibility | Use for a deceased person | API | Status |
| --- | --- | --- | --- | --- |
| **Account Aggregator** ([Sahamati FIU](https://sahamati.org.in/financial-information-user-fiu)) | Only entities regulated by RBI, SEBI, IRDAI or PFRDA can receive data (become an FIU) and must also be a data provider; ReBIT APIs, sandbox, registry, audit | Consent only from the customer; no route for deceased customers found — probably not usable | Yes (regulated entities only) | Eligibility V; deceased use U |
| **DigiLocker** (requester partner — [SOP](https://cf-media.api-setu.in/resources/Partners-SOP.pdf), [terms](https://cf-media.api-setu.in/resources/DigiLocker-Terms-of-User-Requester-june-2025.pdf)) | Registered entity with citizen-service experience; committee review and CEO approval; STQC audit after go-live | Pulls a user's own documents with consent; fetching someone else's death certificate U | Yes, via API Setu after approval | V |

---

## 5. What this means for the product

| Finding | Change to make | Where |
| --- | --- | --- |
| No usable discovery APIs | Keep guided search + outcome logging; never present results as automated | LLD §9.1 (already) |
| UDGAM covers only DEA-Fund money | Discovery copy must say UDGAM finds **old unclaimed** deposits, not every account | DESIGN §6, discovery plan text |
| Bank thresholds and 15-day rule are now RBI rules | Put ₹15 lakh / ₹5 lakh, 15 days and Bank Rate + 4% into versioned procedure config with this citation; show the family the 15-day clock after a complete submission | LLD §11.1–11.2 |
| Mutual fund rules changed on 23 Jul 2026 | Claim-path rules for funds need **four** paths: nominee, QTP (≤ ₹10,000 per fund house, immediate relatives), simplified (≤ ₹10 lakh), above threshold | LLD §11.1 |
| Institution pages lag regulators | Every procedure stores the regulator source and the institution source with dates; mismatch → review | FL-12, FL-44 |
| Nominee receives mutual funds as trustee for heirs | Explain clearly: being the nominee doesn't make you the owner | DESIGN §7.2, PRD glossary |
| Insurance clock starts at **intimation** (15/45 days, Bank Rate + 2%) | Prompt written intimation on day 1; show the clock from that date | §3.3 (verified) |
| MITRA shows only the **fund name**, not folio or value | Next step after MITRA is contacting each fund house; don't promise amounts from MITRA | §8 |
| Bank simplified limits differ widely (ICICI ₹2 crore vs ₹15 lakh elsewhere) | Keep a bank-by-bank table; it decides whether a succession certificate is needed | §8 |
| DigiLocker nominee access works only if set up before death | Make it a planning step in Journey B | §8 |

---

## 6. Open questions (original list — answered in §8)

1. **UDGAM:** may a third-party service guide or search on a user's behalf under its terms? Current bank count?
2. **Common portal:** links only, or has a search been added since May 2026?
3. **MITRA:** can a nominee or heir search with the **deceased** person's PAN, given the OTP goes to the deceased's mobile? Does it show folio and value?
4. **MFCentral transmission:** fully online with e-sign, or are originals still posted? When will CAMS and KFintech update their pages to the July 2026 rules?
5. **QTP limit:** per fund house or per investor in practice?
6. **Banks:** which large banks set limits above the RBI floor, and which accept online claims?
7. **Insurance:** confirm the 15/45-day and Bank Rate + 2% rules against the IRDAI master circular of 5 September 2024.
8. **LIC:** online death-intimation path? Current no-nominee checklist (the procedure PDF found dates from 2014)?
9. **AA and DigiLocker:** any lawful basis for a deceased person's data? (Also [PRIVACY_ASSESSMENT.md](PRIVACY_ASSESSMENT.md) §10.)
10. **Partnerships:** is any route to partner with these portals for structured access?

## 8. Answers to the open questions (research of 17 Oct 2026)

| # | Question | Answer | Status |
| --- | --- | --- | --- |
| 1 | UDGAM: third-party search? Bank count? | Terms of use not reachable (script-only site). RBI's FAQ describes a **registered user** searching with the holder's name plus PAN/licence/voter ID/passport/date of birth; results carry a reference number (UDRN) so third parties can't identify the account or branch. **Treat as user-only.** 30 banks ≈ 90% of DEA value (4 Mar 2024, latest official); 18.86 lakh users (1 Mar 2026). DEA Fund deposits only | U terms / V FAQ |
| 2 | Common portal: search or links? | A gateway giving "access to search facilities" — links to UDGAM, Bima Bharosa, MITRA and IEPF; no own database found | V launch / S scope |
| 3 | MITRA: who can search; what shows? | Circular lets investors find investments "for which he/she may be rightful legal claimant". FAQ: log in with **your own** email/mobile + OTP; search "for self or anyone other than the self" with name + 2 fields; 5 searches per name per day; results show **fund name only** | V circular / S FAQ |
| 4 | MFCentral transmission online? | Listed as a service; workflow not found. Circular: online lodging optional; originals may be demanded in person. AMFI and HDFC MF/CAMS have published Quick Transmission forms (Aug 2026) | U / V / S |
| 5 | Mutual fund thresholds per what? | **Per fund house (AMC)** for units in statement form; per beneficial owner for demat. Quick ₹10,000 / ₹30,000 demat; simplified ₹10 lakh / ₹30 lakh demat; quick path only for parents, spouse, children, parents-in-law; 21-day settlement | V |
| 6 | Banks: higher limits, online claims | **ICICI up to ₹2 crore** without legal representation; **SBI** ₹15 lakh (from 16 Dec 2025), online portal with case ID; **PNB** ₹15 lakh, online with OTP and tracking ID; **Bank of Baroda** ₹15 lakh, online portal; **HDFC** limit not published; **Kotak** branch only; **Axis** not verified | Mostly V |
| 7 | Life-insurance timelines | 15 days from intimation / 45 if investigated; Bank Rate + 2% from intimation (§3.3) | **V** |
| 8 | LIC online intimation; no-nominee threshold | Requirements verified (Claim Form A, death extract, original policy, evidence of title if no nominee); **no small-amount threshold published**; online intimation not confirmed — written intimation to the branch | V / U |
| 9 | Deceased person's data via AA / DigiLocker | **AA: no route** (consent is the account holder's own). **DigiLocker:** since 1 Apr 2025 fund houses, RTAs and depositories issue statements into DigiLocker; KYC agencies report deaths; the holder's **DigiLocker nominee** is notified and can view documents the holder fetched while alive; transmission rules unchanged | U / V |
| 10 | APIs or partnerships | None found for UDGAM, MITRA, Bima Bharosa or the common portal. MFCentral offers APIs to distributors and RIAs; AMFI reportedly asked it to stop OTP-consent sharing with fintechs (Sep 2025) | U / S |

Sources: [RBI UDGAM FAQ](https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQonUDGAMPortal.pdf) · [PIB Mar 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2244475) · [PIB common portal](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2266714) · [SEBI MITRA circular](https://www.sebi.gov.in/sebi_data/attachdocs/feb-2025/1739356741378.pdf) · [SEBI transmission circular](https://www.sebi.gov.in/legal/circulars/jul-2026/ease-of-doing-investment-and-ease-of-doing-business-simplification-and-standardisation-of-the-framework-for-transmission-of-securities_103030.html) · [AMFI Form QTP](https://www.amfiindia.com/uploads/FORM_QTP_c23da06d18.pdf) · [RBI Directions](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12901) · [ICICI](https://icici.bank.in/deceased-claim-policy-and-forms) · [PNB](https://pnb.bank.in/Deceased-Claim-cases.html) · [Bank of Baroda](https://bankofbaroda.bank.in/personal-banking/other-services/settlement-of-claims) · [SBI](https://sbi.bank.in/web/personal-banking/information-services/deceased-settlement) · [IRDAI Master Circular](https://irdai.gov.in/document-detail?documentId=5625747) · [LIC](https://licindia.in/claims-settlement-requirements) · [SEBI DigiLocker circular](https://www.sebi.gov.in/sebi_data/attachdocs/mar-2025/1742386353397.pdf)

Licensing, integration eligibility and the approvals roadmap are in [FEASIBILITY_AND_COMPLIANCE.md](FEASIBILITY_AND_COMPLIANCE.md).

## 7. Keeping this current

- Each row gets re-checked before the Pilot and then **quarterly**, and whenever a regulator issues a new circular.
- Changes go into the versioned procedure configuration (LLD §11.2) and are recorded in [DECISIONS.md](../DECISIONS.md).
- A row is "ready for the Pilot" only when it is **V** for: coverage, who may use it, documents required and timelines.
