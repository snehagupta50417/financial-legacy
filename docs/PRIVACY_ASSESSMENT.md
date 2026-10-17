# Financial Legacy — Privacy Assessment (DPDP)

| | |
| --- | --- |
| **Version** | 0.2 (draft for review) — legal questions researched 17 Oct 2026 |
| **Date** | 17 October 2026 |
| **Owner** | Privacy / security lead (PRD decision D-05) |
| **Required by** | [PRD §11.2](../PRD.md#112-privacy-and-data-protection) and the Pilot entry criteria ([PRD §15.2](../PRD.md#152-pilot--may-start-when)) |
| **Law** | Digital Personal Data Protection Act, 2023 ("DPDP Act") and the Digital Personal Data Protection Rules, 2025 ("DPDP Rules") |
| **Status** | **Not legal advice.** A first-principles assessment by the product team to prepare for review by qualified counsel. Items marked ⚖️ need a lawyer's answer before the Pilot. |

---

## 1. Summary

Financial Legacy processes some of the most sensitive personal data there is: identity documents, death certificates, family relationships and financial holdings — about living users, their families, and people who have died. Under the DPDP Act we are a **Data Fiduciary**: we decide why and how this data is processed.

**Our position:** collect the minimum, process only for the case the person opened, ask for specific consent for each use, keep it only as long as needed, never sell it, and give people clear ways to see, correct, withdraw and delete.

**Top actions before the Pilot:**

1. Privacy notice and consent screens that meet the Act (§4).
2. Real authentication and the security safeguards in [THREAT_MODEL.md](THREAT_MODEL.md).
3. Processor agreements with Google Cloud (hosting, Gemini/Vertex AI, speech) — data in India, no training on our data (§6).
4. Retention schedule and working deletion (§7).
5. Grievance officer and a 72-hour-ready breach procedure (§8, §9).
6. Legal answers to the ⚖️ questions in §10.

## 2. Whose data, and what data

| Data principal | Example | Data we may process |
| --- | --- | --- |
| **User** (owner, claimant, helper) | Rohit, Kamala, Arjun | Name, contact, identity proof, relationship, voice recordings (transient), conversation |
| **Deceased person** | Rohit's father | Name, DOB, date of death, death certificate, PAN (as hash), holdings, nominee details |
| **Living person helped by a helper** | Rohan's father | Same as a user's own records, with that person's consent |
| **Other family members** named in documents | Co-heirs, nominees | Names, relationships, sometimes identifiers in certificates |
| **Trusted contacts** named by a planner | Kamala's children | Name and contact only — no access granted |

| Category | Examples | Handling |
| --- | --- | --- |
| Identity | PAN, Aadhaar references, passport, selfie | Minimum needed; PAN stored only as HMAC; identifiers redacted from stored text |
| Death and relationship evidence | Death, legal-heir and succession certificates | Required for authority; stored as extracted fields (and encrypted originals when built) |
| Financial | Account/policy/folio numbers, balances, nominees | Masked by default; full numbers only behind entitlement (G4) |
| Health (incidental) | Cause of death on a certificate | Not extracted or used; excluded from AI prompts where possible |
| Conversation and voice | Chat messages; speech | Raw audio not stored by default; transcripts follow case retention |
| Technical | Session, IP, device, logs | Minimal; no financial content in logs |

**We never collect:** banking passwords, PINs, OTPs or card numbers.

## 3. Why we process it — purposes and legal basis

The DPDP Act allows processing on the basis of **consent** or certain **legitimate uses**. We rely on **consent** for everything the product does, recorded per purpose.

| Purpose | Data used | Basis | Notes |
| --- | --- | --- | --- |
| Understand the user's situation (intake) | Conversation | Consent | — |
| Establish identity, death and authority (gates G1–G4) | Identity and certificates | Consent | Needed before any disclosure |
| Discover and list assets | Documents, search outcomes | Consent per source | Each search/source has its own consent |
| Prepare claims and legacy records | Holdings, evidence | Consent | Exact approval before anything leaves the product |
| Reminders and tasks | Contact, due dates | Consent | In-app in the MVP |
| Safety (fraud checks, freezing duplicate cases) | Names, DOB, PAN hash | ⚖️ consent or legitimate use? | Ask counsel whether fraud prevention needs separate consent |
| Product improvement and metrics | Aggregated, de-identified events | ⚖️ | No document text, identifiers or balances in analytics (FL-54) |

## 4. Notice and consent (DPDP Act ss. 5–6)

The Act requires a **notice** before or at the time of asking for consent, and consent that is **free, specific, informed, unconditional and unambiguous**, given by a clear affirmative action, and as easy to withdraw as to give.

| Requirement | How we meet it | Status |
| --- | --- | --- |
| Notice states the data, purpose, how to exercise rights and how to complain | Plain-language notice at first use and at each new purpose; available in supported languages | 🔧 |
| Consent is specific | One consent per purpose and source ([PRD FL-04](../PRD.md#92-identity-authority-and-consent)), with scope and expiry | ✅ model / 🔧 screens |
| Clear affirmative action | Explicit button; never a pre-ticked box; voice "yes" never counts for consequential actions | 🔧 |
| Withdrawal as easy as giving | One-tap revoke on the privacy screen; stops future and queued work | ✅ API / 🔧 screen |
| Consent receipt | Receipt shown and kept in the audit trail | 🔧 |
| Languages | Notice available in English and the evaluated Indian languages | ⏳ (D-09) |
| Consent managers | Not used in the MVP; review when the framework is operational | 📌 |

## 5. Special situations

| Situation | Approach | Open question |
| --- | --- | --- |
| **Deceased persons** | We apply the same safeguards to a deceased person's data as to a living person's, and process it only for a claimant with evidenced authority | ⚖️ How the Act applies to data of deceased individuals, and whose consent governs it |
| **Nomination under the Act** (s. 14) | The Act lets a data principal nominate someone to exercise their rights after death or incapacity. A planner's trusted contact is **not** this nomination unless designed to be | ⚖️ Should the legacy feature support DPDP nomination formally? |
| **Third parties in documents** (co-heirs, nominees) | Minimise: extract only what the claim needs; never use their data for other purposes | ⚖️ Notice obligations to people named in documents |
| **Living person helped by a helper** | Processing only with that person's own recorded consent, limited in scope and time | — |
| **Children** (minor heirs or nominees) | Handed off in the MVP; no processing of a child's data beyond what the guardian provides for the claim; never tracking or targeted advertising | ⚖️ Verifiable parental consent requirements |
| **NRI users** | Data stays in India-region hosting; overseas access by the user is fine | ⚖️ Any restrictions on cross-border processing |

## 6. Processors and data location

| Processor | Role | Data | Location | Required terms |
| --- | --- | --- | --- | --- |
| Google Cloud Run | Hosting the app | All, in transit and memory | India region (`asia-south1`, Mumbai) recommended | DPA (data processing addendum) |
| Cloud SQL (MVP) | Database | All case data | India region | DPA; encryption at rest |
| Cloud Storage (to build) | Encrypted originals | Documents | India region | DPA; retention rules |
| Gemini via Vertex AI | AI extraction and conversation | Case content sent per request | India region where the model is available ⚖️ | **No training on our data**, defined retention, data residency |
| Speech recognition (D-09) | Voice input | Audio, transcripts | **Google Speech-to-Text is not offered in India** (Chirp: US/EU/Singapore only). Preferred: Gemini audio on Vertex AI in Mumbai; fallback: Chirp outside India with the transfer disclosed | Same as above; no audio retention by default |
| Google Cloud Text-to-Speech | Spoken replies | Reply text | Mumbai listed; residency to confirm with Google | Same as above |
| Sign-in (phone OTP) | Sign-in | Phone number | Google Identity Platform is **global** and keeps phone numbers for abuse prevention; an Indian DLT-registered SMS gateway with our own OTP check keeps numbers in India (recommended) | DPA; minimal data; DLT registration |

The Gemini API key route (AI Studio) is for synthetic data only. Real data goes through Vertex AI with an approved configuration ([PRD FL-46](../PRD.md#111-security)).

## 7. Retention and deletion (s. 8)

The Act requires erasing personal data once the purpose is served (unless law requires keeping it), and when consent is withdrawn.

| Data | Proposed retention | Notes |
| --- | --- | --- |
| Active case data | While the case is open | — |
| Closed case | 12 months after closure, then deleted, unless the user asks to keep it or a dispute hold applies | ⚖️ Confirm against any record-keeping duties |
| Legacy record (living planner) | Until the planner deletes it or closes the account; reminders prompt review | — |
| Raw voice audio | Not stored | — |
| AI provider copies | Per processor terms; target zero retention | — |
| Audit trail | 3 years, minimal metadata only | ⚖️ Balance accountability with minimisation |
| Backups | Rolling 30 days; restores honour deletion markers | FL-19 |
| Deleted-account requests | Access revoked immediately; data purged within 30 days | — |

These periods are proposals for D-05, to be confirmed before the Pilot.

## 8. Rights of data principals (ss. 11–14)

| Right | How the user exercises it | Status |
| --- | --- | --- |
| Access a summary of their data and processing | Privacy screen and activity history | 🔧 |
| Correction and completion | Correct any extracted value; review history kept | ✅ partly / 🔧 |
| Erasure | Delete case / delete all my data | 🔧 |
| Grievance redressal | In-app help and a named grievance officer with response time | ⏳ |
| Nomination | ⚖️ see §5 | — |

**Grievance officer:** to be named before the Pilot; contact published in the app and privacy notice.

## 9. Security safeguards and breach response

- **Safeguards:** see [THREAT_MODEL.md](THREAT_MODEL.md). The Act requires reasonable security safeguards; penalties for failure are severe (the Act's schedule provides for penalties up to ₹250 crore).
- **Breach response plan** (before the Pilot):
  1. Detect and contain.
  2. Assess what data and whose.
  3. Inform the Data Protection Board and each affected person, in the form and time the Rules require ⚖️.
  4. Fix the cause and record lessons.
  5. Rehearse once before the Pilot.

## 9a. What applies today vs from 2027

- **Today:** IT Act s.43A and the **SPDI Rules 2011** (financial information is sensitive personal data — written consent, reasonable security such as ISO 27001, transfer only with equivalent protection and consent or necessity). **CERT-In Directions (28 Apr 2022): report cyber incidents within 6 hours** *(S — confirm)*.
- **DPDP Rules 2025** (G.S.R. 846(E), 13 Nov 2025): Data Protection Board in force now; consent-manager registration from ~13 Nov 2026; notice, security, breach reporting, retention, children, rights, cross-border and SDF rules from **~13 May 2027**, when s.43A is also repealed. **Build to the 2027 standard now.**
- **Breach reporting from 2027 (Rule 7):** tell each affected person without delay (nature, likely impact, mitigation, safety steps, contact); tell the Board without delay and send a detailed report **within 72 hours**.
- **Logs:** keep security logs at least 1 year (Rules 6(1)(e), 8(3)) — this replaces the 3-year audit proposal in §7 only if counsel agrees; keep the longer of the two until then.

## 10. Questions for legal counsel ⚖️

**Research answers (17 Oct 2026)** — detail and citations in [FEASIBILITY_AND_COMPLIANCE.md](FEASIBILITY_AND_COMPLIANCE.md) §5:

| # | Question | What research found | Still for counsel |
| --- | --- | --- | --- |
| 1 | Deceased persons' data | The Act doesn't say whether a deceased person is a "Data Principal"; s.14 nomination implies protection continues. **Unsettled.** Basis we use: living claimant's consent + documented authority | Yes |
| 2 | Fraud prevention | s.7 has **no** fraud or legitimate-interest ground (full list: voluntary provision, State functions, legal duty to the State, court orders, medical emergency, epidemics, disasters, employment). Use explicit consent; s.17(1)(c) and s.17(1)(a) as backups | Whether s.17 can be relied on |
| 3 | Third parties in documents | s.7(a) doesn't cover them; minimise, user warrants authority, notice on contact, delete at closure | Whether notice is needed before contact |
| 4 | Commencement | Notified 13 Nov 2025; phases ~Nov 2026 and ~May 2027 (above); no shortened timeline found notified | 13 vs 14 Nov start date |
| 5 | Significant Data Fiduciary | Not notified; unlikely at seed stage; obligations known (DPO in India, annual DPIA/audit, possible localisation) | Monitor |
| 6 | Sector rules | SPDI applies now; banks owe confidentiality and deal only with claimants or authorised agents; RBI/IRDAI/SEBI don't regulate a family-chosen facilitator (see licensing in [FEASIBILITY_AND_COMPLIANCE.md](FEASIBILITY_AND_COMPLIANCE.md) §2) | IRDAI point |
| 7 | Fees | Percentage fees not illegal for non-lawyers but risky (unconscionability, consumer protection); advocates can't take contingency fees. **Decision: flat or capped fees only** | Confirm disclosures |
| 8 | DPDP nomination | Rule 14(4): per our own terms, no prescribed form, from ~May 2027; a planner feature, not a replacement for financial nominations or a will | Proof of death for nominees |

Original questions (kept for reference):


1. How does the DPDP Act apply to personal data of **deceased individuals**, and whose consent or authority governs it (nominee, legal heir, executor)?
2. Can **fraud prevention** (freezing duplicate cases, comparing certificates) rely on a legitimate use, or does it need separate consent?
3. What **notice** do we owe to third parties named in documents (co-heirs, nominees)?
4. Which DPDP Rules obligations **apply now** and which commence later? (Commencement is phased; check the current MeitY notification before relying on any date.)
5. Are we likely to be notified as a **Significant Data Fiduciary** at scale (which adds a Data Protection Officer, audits and impact assessments)?
6. Any **sector rules** that also apply — RBI, IRDAI or SEBI requirements on handling customer data shared by families, and bank secrecy duties?
7. Is a **percentage-of-recovery fee** or any fee structure restricted for this kind of assistance? (Also BRD §13.)
8. Should the legacy feature support **DPDP nomination** (s. 14) formally?

## 11. Review

Review before the Pilot, after any new data source or processor, after any incident, and at least yearly. Record changes in [DECISIONS.md](../DECISIONS.md).

**Status key:** ✅ built · 🔧 to build (MVP) · ⏳ before Pilot · 📌 Later · ⚖️ needs legal answer.
