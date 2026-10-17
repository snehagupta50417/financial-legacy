# Financial Legacy — Feasibility and Compliance

| | |
| --- | --- |
| **Version** | 0.1 (draft for review) |
| **Research date** | 17 October 2026 |
| **Owner** | Founder + privacy/security lead + integrations (PRD D-02, D-03, D-05, D-08) |
| **Purpose** | One place that answers: **what can we legally and technically do, what needs approval, how to get it, and in what order.** |
| **Status** | Desk research with citations. **Not legal advice.** Each item is marked with how sure we are. A lawyer must confirm the items in §9 before the Pilot. |

**Confidence key:** **V** verified on an official source · **S** secondary sources only · **U** unverified.

---

## 1. Bottom line

1. **The core product is legal to build and run without a financial licence** — if we stay a document-and-workflow service: we prepare, the family signs and submits, we never hold money, never sell or advise on financial products, never represent the family before an institution, and charge a **flat fee, never a percentage of the claim** (§2).
2. **Discovery stays guided, not automated.** No official search (UDGAM, MITRA, Bima Bharosa, common portal) offers an API or partner programme; their logins are tied to the user. The family searches with their own login; we coach and record the outcome (§4).
3. **Some integrations are open to us now; others need a regulated partner or are closed:**

| Open to us now | Needs a regulated partner | Not available to us |
| --- | --- | --- |
| DigiLocker requester (with audit) · Aadhaar offline verification (OVSE registration) · death-certificate QR check on CRS · DLT-registered SMS | PAN verification · CKYC · Account Aggregator data (own assets only) | Aadhaar authentication (AUA/KUA) for now · Account Aggregator for a deceased person's data · any automated search of the official portals |

4. **Data protection:** the DPDP Rules were notified on **13 Nov 2025**; most duties (notice, security, breach reporting, rights, retention) start around **13 May 2027**. Until then the **IT Act s.43A and SPDI Rules 2011** still apply. We build to the 2027 standard now (§5).
5. **Two platform decisions need adjusting** (§7): Google Speech-to-Text is **not available in India** (Mumbai), and Google's phone sign-in stores phone numbers **globally** and has an undocumented position on India's SMS registration (DLT).

---

## 2. Is the activity itself regulated?

| Activity | Finding | Rule | Confidence | What we do |
| --- | --- | --- | --- | --- |
| **Helping with life-insurance death claims** | Not "insurance agency" (that is soliciting or procuring insurance). Paid **claims consultancy** is reserved for licensed brokers and only for commercial general insurance — fee may not be a percentage. No rule found banning an unlicensed party from being paid for claim *assistance* | Insurance Act s.2(10); IRDAI (Insurance Brokers) Regulations 2018, Reg. 28 | Medium (S) | Flat software/service fee; the claimant signs and submits; we never take payouts or act as their representative; we never sell or refer insurance without a licence |
| **Mutual fund transmission help** | No SEBI registration needed if we give no advice and don't distribute | SEBI Investment Advisers Regulations; ARN rules | Medium-high (S) | No scheme recommendations or switches. Note: SEBI restricts regulated entities from links with unregistered advisers — partnerships need care |
| **Bank deceased-claim help** | Not a DSA or recovery-agent activity; no RBI framework for claim facilitators found | RBI Directions 2025 (RBI/2025-26/82) address claimants only | Medium (V for Directions) | Family lodges the claim; we prepare and track |
| **IEPF help** (Later asset type) | Claimant must file IEPF-5 "under their own signature"; agents reported charging up to 50% | IEPF rules; Moneylife report | Medium (S) | Flat fee; never take power of attorney |
| **Drafting affidavits, indemnity bonds; succession guidance** | Only advocates may practise law; "support services" can count as practice if "in pith and substance" they are legal practice | Advocates Act s.33; *Bar Council of India v A.K. Balaji* (SC, 2018) | Low-medium (S) | We fill institution forms and standard templates the user completes; **case-specific legal questions go to an advocate panel**; clear disclaimers |
| **Charging a percentage of recovered money** | Not illegal for non-lawyers in itself, but unenforceable if unconscionable; lawyers can't take contingency fees; a high % for claims families can file free could be an unfair trade practice | *Ram Coomar Coondoo* (PC 1876); BCI Rules Pt VI; Consumer Protection Act 2019 s.2(47) | Medium (S) | **Flat or capped fees only**; tell families up front they can claim free themselves |

## 3. Integrations: eligibility and route

| Integration | Feasible for us? | Requirements | Route / timeline | Confidence |
| --- | --- | --- | --- | --- |
| **DigiLocker (requester)** | **Yes** | Indian company, citizen-service experience; official-domain onboarding verified by NeGD; consent per pull; no storing beyond permitted duration; breach report within 24 h; **annual audit by a CERT-In empanelled auditor**; data in India; no fee currently | Apply in month 1–2; plan the audit. Pulls only the **consenting user's own** documents | High for terms (V); timeline U |
| **DigiLocker nominee access** (SEBI) | **Useful for planning** | Since 1 Apr 2025, fund houses/RTAs/depositories issue statements into DigiLocker; a DigiLocker **nominee** is notified on death and can view documents the holder fetched | Pitch in Journey B: set a DigiLocker nominee and fetch statements yearly. Does **not** change transmission rules | V (SEBI circular /2025/32) |
| **Aadhaar authentication (AUA/KUA)** | **Not now** | Needs PML reporting-entity status, another law, or central-government notification via a sponsoring ministry (Good Governance Rules, Jan 2025) | Later, only if needed | Medium (S) |
| **Aadhaar offline verification (OVSE)** | **Yes** | Register with UIDAI as an Offline Verification Seeking Entity; covers QR, offline e-KYC, Aadhaar app (amended Dec 2025) | Month 1–3 | Medium (S) |
| **PAN verification API** | **No (directly)** | Protean's eligible list: banks, MFs, insurers, NBFCs, SEBI advisers, large TDS deductors, etc. | Licensed KYC vendor or regulated partner; or user self-declaration with document review | High (V) |
| **CKYC** | **No** | Reporting entities registered with CERSAI only | Via a regulated partner | Medium-high (S) |
| **Video KYC (V-CIP)** | **Not as V-CIP** | RBI framework is for regulated entities | Our own video check is allowed but isn't regulatory V-CIP | Medium |
| **Account Aggregator** | **No as FIU; partner model uncertain** | FIU must be regulated by RBI/SEBI/IRDAI/PFRDA (and be an FIP). **No consent route for a deceased account holder** | Later: a regulated FIU partner, **only for a living user's own assets**, if the partner may share for this purpose | High that we can't be an FIU; low on partner model |
| **Death certificate check** | **Yes, manually** | CRS certificates carry a QR code and number, verifiable on crsorgi.gov.in; no public API | Operator or user checks the QR during G2 review | Medium (S) |
| **Legal heir certificate check** | **Mostly manual** | Issued by state e-District/e-Sevai portals; no standard online verification | Operator review; record state and certificate number | U |
| **SMS OTP** | **Yes, with DLT** | TRAI TCCCPR 2018 (amended Feb 2025): entity, header and template registration on DLT; sender chain declared (Dec 2024); URLs in SMS must be whitelisted (Oct 2024) | Register DLT in weeks 0–4 (directly or via a gateway) | High for DLT (V/S) |
| **Acting on the family's behalf** | **Only with a signed authority letter**, which institutions may refuse | No rule requires institutions to accept third-party submissions | Claimant signs and submits; payouts only to the claimant's own account | U |

## 4. Official sources — answers to the open questions

Full detail and the bank-by-bank table are in [SOURCE_VALIDATION.md](SOURCE_VALIDATION.md) §8. In short:

| Question | Answer | Confidence |
| --- | --- | --- |
| Can a third party search UDGAM for a user? | Terms not reachable; the FAQ describes a registered user searching with the holder's details; results use a reference number (UDRN) so third parties can't identify the account. **Treat as user-only** | U (terms) / V (FAQ) |
| UDGAM coverage | DEA Fund deposits only (10+ years inoperative); 30 banks ≈ 90% of value (Mar 2024); 18.86 lakh users (Mar 2026) | V |
| Government common portal | A gateway linking to UDGAM, Bima Bharosa, MITRA and IEPF; no own database found | V launch / S scope |
| MITRA | Anyone may search for investments they may rightfully claim; login with own email/mobile + OTP; name + 2 fields; 5 searches per name per day; **shows only the fund name — not folio or value** | V circular / S FAQ |
| MFCentral transmission online? | Service listed; workflow not found. Online lodging is optional for the fund; originals may still be demanded in person | U / V circular |
| Mutual fund thresholds | **Per fund house (AMC)** for non-demat units: quick ₹10,000, simplified ₹10 lakh (demat: ₹30,000 / ₹30 lakh per beneficial owner); quick path only for parents, spouse, children, parents-in-law; 21-day settlement | V |
| Bank limits above ₹15 lakh | Banks may set higher: **ICICI up to ₹2 crore**; SBI, PNB, BoB ₹15 lakh; HDFC unpublished; Kotak branch-only. Online claims: SBI, PNB, BoB yes; ICICI, Kotak no | Mostly V |
| Life-insurance timelines | **15 days from intimation** of the claim (45 days if investigated); late payment carries interest at **Bank Rate + 2%** from intimation, paid automatically; no rejection "for want of documents" | **V** — IRDAI Master Circular, 5 Sep 2024 |
| LIC online intimation / no-nominee threshold | Not confirmed; written intimation to the servicing branch; no small-amount threshold published | V requirements / U online |
| Deceased person's data via AA or DigiLocker | AA: no route. DigiLocker: only what the holder fetched while alive, viewable by their DigiLocker nominee | U / V |
| APIs or partner programmes | None for UDGAM, MITRA, Bima Bharosa or the common portal. MFCentral has distributor/RIA APIs; AMFI reportedly curbed OTP-based sharing with fintechs (Sep 2025) | U / S |

## 5. Data protection (DPDP) — answers

Detail in [PRIVACY_ASSESSMENT.md](PRIVACY_ASSESSMENT.md) §10.

| Topic | Answer | Confidence |
| --- | --- | --- |
| **What applies today** | IT Act s.43A + **SPDI Rules 2011** (financial information is sensitive data; written consent; reasonable security such as ISO 27001; transfer controls). **CERT-In Directions (Apr 2022): report cyber incidents within 6 hours** | High (s.43A) / S (CERT-In) |
| **DPDP Rules dates** | Notified **13 Nov 2025** (G.S.R. 846(E)). In force: Data Protection Board. ~**13 Nov 2026**: consent-manager registration. ~**13 May 2027**: notice, security, breach reporting, retention, children, rights, cross-border and SDF rules. A Jan 2026 proposal to shorten to 12 months was not found notified | High (V) |
| **Breach reporting (from 2027)** | Tell each affected person without delay; tell the Board without delay and send a detailed report **within 72 hours** | V |
| **Deceased persons' data** | The Act doesn't say whether a deceased person is a "Data Principal"; s.14 lets a person nominate someone to exercise rights after death. **Unsettled.** Treat it as protected; base processing on the **living claimant's consent plus documented authority** (nomination, legal heir or succession certificate) | Medium / unsettled |
| **Fraud checks** | s.7 has **no** general fraud or legitimate-interest ground. Use **explicit consent** in the claim flow; s.17(1)(c) (prevention of offences) and s.17(1)(a) (enforcing legal claims) are backup arguments only | High (s.7 list) / low (s.17 use) |
| **Co-heirs and nominees in documents** | s.7(a) doesn't cover third-party data. Minimise (names and relationships only), user warrants authority, notice when we contact them, delete at closure | Medium |
| **Cross-border processing** | Allowed (negative-list model; no countries restricted yet). Until 2027, SPDI requires equivalent protection and consent/necessity. Disclose any processing outside India | High |
| **Significant Data Fiduciary** | Not notified; unlikely at seed stage, but our data is highly sensitive. If notified: DPO in India, annual DPIA and audit, possible localisation | High (rules) |
| **DPDP nomination (s.14)** | Rule 14(4): per our own terms; no prescribed form; from ~May 2027. A product feature for planners — **not** a replacement for bank/MF/insurance nominations or a will | High |
| **Children** | Verifiable parental consent (Rule 10, e.g. via DigiLocker token); no tracking or targeted ads | High |
| **Penalties** | Up to ₹250 crore (security failures), ₹200 crore (breach notification, children), ₹50 crore (other) | V |

## 6. Business-model consequences

- **Pricing:** flat or capped fees per case or per service, shown before work starts, with a clear statement that families can claim free themselves. **No percentage of recovery.** (Updates BRD §7.2.)
- **Positioning:** "we prepare and guide; you submit" — never "we claim for you".
- **Advocate panel:** needed from the Pilot for case-specific legal questions (who inherits, will validity, disputes).
- **Planning hook:** DigiLocker nominee + yearly statements are a concrete, official feature for Journey B.
- **Bank variation is real value:** ICICI's ₹2 crore vs ₹15 lakh elsewhere decides whether a family needs a succession certificate — a maintained bank-by-bank table is a product asset.

## 7. Platform feasibility (Google Cloud and SMS)

| Service | Available in India (Mumbai, `asia-south1`)? | Notes | Confidence |
| --- | --- | --- | --- |
| Cloud Run, Cloud SQL, Secret Manager, Cloud Storage | **Yes** (Delhi too; Storage has an India dual-region) | Core services are MeitY-empanelled | V |
| **Gemini on Vertex AI** | **Yes** — GA models such as `gemini-2.5-flash`, `gemini-2.5-pro` listed for Mumbai | Use the **regional** endpoint, never `global`. "Endpoints don't guarantee in-region ML processing" — get written confirmation per model. No training on our data. Turn **caching off**, keep request logging off, request the **abuse-monitoring exception** (or sign a Cloud Master Agreement) for zero retention. Not listed in Delhi | V / U per model |
| Gemini via AI Studio API key | No region control | Free tier may use data to improve products — **never** for real data | V |
| **Speech-to-Text (Chirp)** | **No** — Chirp 3 only in US/EU; Chirp 2 in Singapore; no India region listed. Tamil is Preview; no Hindi-English code-mixed model | **Decision change needed** (see below) | V (absent from docs) |
| Text-to-Speech | **Yes** — Mumbai listed; Chirp 3 HD voices for Hindi, Tamil, English (India) | Residency statement covers only EU/US — confirm Mumbai with Google | V voices / U residency |
| **Identity Platform phone sign-in** | Global service | $0.07 per SMS to India; set SMS region policy to India only; reCAPTCHA; **phone numbers stored globally** for abuse prevention; **DLT responsibility not documented** | V price / U DLT |
| Google's DPA and DPDP | No DPDP-specific statement found | Our own legal mapping needed | V / U |

**Adjustments — confirmed by the founder on 17 Oct 2026:**

1. **Voice input:** use **Gemini audio understanding on Vertex AI in Mumbai** for speech-to-text (keeps audio in India), evaluated against Chirp in Singapore on our Hindi, Hinglish and Tamil test set. If Gemini's quality is not good enough, use Chirp with the cross-border transfer disclosed in consent. Text-to-Speech stays on Google Cloud TTS in Mumbai.
2. **Sign-in:** keep phone OTP as the main method, but send OTPs through a **DLT-registered Indian SMS gateway** (e.g. MSG91, Exotel) with our own OTP verification, so phone numbers stay in India and DLT is under our control; Google sign-in remains an option. Alternatively keep Identity Platform after Google confirms its India DLT handling and we accept global storage of phone numbers.

## 8. Approvals roadmap

| When | Step | Owner |
| --- | --- | --- |
| Weeks 0–2 | Legal opinion on: fee model, Advocates Act line, DPDP/SPDI consent and terms, deceased-data basis, s.17 reliance (§9) | Founder + counsel |
| Weeks 0–2 | Set up an **advocate referral panel** | Founder |
| Weeks 0–4 | **DLT registration** (entity, header, OTP template) and URL whitelisting | Engineering |
| Weeks 0–4 | Google: confirm Gemini in-region processing per model; request abuse-monitoring exception; confirm TTS Mumbai residency; test Gemini speech recognition | Engineering |
| Month 1 | **ISO 27001-style security baseline** (SPDI Rule 8); CERT-In 6-hour incident process | Security lead |
| Months 1–2 | **DigiLocker requester** application; book a CERT-In empanelled auditor | Integrations |
| Months 1–3 | **UIDAI OVSE** registration (Aadhaar offline verification); contract a **licensed KYC vendor** for PAN checks | Integrations |
| Months 2–4 | Guided-search flows for UDGAM, MITRA, Bima Bharosa, common portal (no scraping); bank-by-bank limits table | Product + engineering |
| Month 4+ | Partner pilots with a bank, fund house or insurer under their outsourcing rules | Founder |
| Before ~May 2027 | Full DPDP compliance: notices, consent records, rights handling, 72-hour breach process, retention, processor contracts | Privacy lead |
| Later, if needed | Insurance licence (only to sell/refer); Aadhaar AUA via a sponsoring ministry; regulated AA partner for living users' own data | Founder |

## 9. What a lawyer must still confirm

These cannot be settled by research alone:

1. Whether a deceased person counts as a Data Principal, and whose authority governs their data when there is no DPDP nominee.
2. Whether we can rely on s.17(1)(a) or s.17(1)(c) for fraud checks and co-heir data.
3. Whether co-heirs and nominees must be notified before we contact them.
4. The exact commencement dates (13 vs 14 Nov 2025 publication) and whether any shortened timeline, SDF, localisation or s.17(3) startup exemption has been notified.
5. Whether claim preparation for life insurance triggers any IRDAI registration or restriction.
6. Where our template-based document preparation crosses into "practice of law".
7. That our flat-fee model and disclosures are safe under consumer-protection law.

## 10. Sources

- **Data protection:** [DPDP Act 2023 (bill text, PRS)](https://prsindia.org/files/bills_acts/bills_parliament/2023/Digital%20Personal%20Data%20Protection%20Bill,%202023.pdf) · [DPDP Rules 2025, e-Gazette](https://egazette.gov.in/WriteReadData/2025/267650.pdf) · [AZB phased rollout](https://www.azbpartners.com/bank/indias-digital-personal-data-protection-act-phased-rollout-and-key-compliance-milestones/) · [PIB on Rules](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf)
- **Insurance:** [IRDAI Master Circular on Protection of Policyholders' Interests, 5 Sep 2024](https://irdai.gov.in/document-detail?documentId=5625747) · [IRDAI (Insurance Brokers) Regulations 2018](https://financialservices.gov.in/beta/sites/default/files/2024-11/IRDAI%20(Insurance%20Brokers)%20Regulations%202018.pdf) · [LIC claim requirements](https://licindia.in/claims-settlement-requirements)
- **Banks:** [RBI Directions on deceased customers' claims, 2025](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12901) · [ICICI](https://icici.bank.in/deceased-claim-policy-and-forms) · [PNB](https://pnb.bank.in/Deceased-Claim-cases.html) · [Bank of Baroda](https://bankofbaroda.bank.in/personal-banking/other-services/settlement-of-claims) · [SBI](https://sbi.bank.in/web/personal-banking/information-services/deceased-settlement)
- **Mutual funds:** [SEBI MITRA circular, 12 Feb 2025](https://www.sebi.gov.in/sebi_data/attachdocs/feb-2025/1739356741378.pdf) · [SEBI transmission circular, 23 Jul 2026](https://www.sebi.gov.in/legal/circulars/jul-2026/ease-of-doing-investment-and-ease-of-doing-business-simplification-and-standardisation-of-the-framework-for-transmission-of-securities_103030.html) · [SEBI DigiLocker circular, Mar 2025](https://www.sebi.gov.in/sebi_data/attachdocs/mar-2025/1742386353397.pdf)
- **Unclaimed assets:** [RBI UDGAM FAQ](https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQonUDGAMPortal.pdf) · [PIB, Mar 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2244475) · [PIB, common portal](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2266714)
- **Integrations:** [Sahamati FIU](https://sahamati.org.in/financial-information-user-fiu) · [DigiLocker Requester Terms, Jun 2025](https://cf-media.api-setu.in/resources/DigiLocker-Terms-of-User-Requester-june-2025.pdf) · [UIDAI OVSE FAQ](https://www.uidai.gov.in/ovse-faq) · [Protean PAN verification](https://tinpan.proteantech.in/services/online-pan-verification/pan-verification-overview.html) · [TRAI PR 67/2024](https://trai.gov.in/sites/default/files/PR_No.67of2024.pdf)
- **Google Cloud:** [Vertex AI locations](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations) · [data residency](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency) · [data governance](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance) · [Speech-to-Text languages](https://docs.cloud.google.com/speech-to-text/v2/docs/speech-to-text-supported-languages) · [TTS voices](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types) · [Identity Platform pricing](https://cloud.google.com/identity-platform/pricing) · [MeitY empanelment](https://cloud.google.com/security/compliance/meity-india)
- **Legal practice and fees:** [*BCI v A.K. Balaji* summary](https://itatonline.org/archives/bar-council-of-indoa-vs-a-k-balaji-ors-supreme-court-foreign-law-firms-and-foreign-lawyers-cannot-practice-profession-of-law-in-india-either-in-the-litigation-or-in-non-litigation-side-though-they-can/)
