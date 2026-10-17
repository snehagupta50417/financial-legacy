# Pre-Pilot documents

These documents are required before the Pilot uses real people and real data ([PRD §15.2](../PRD.md#152-pilot--may-start-when)). They follow the main set: [ONE_PAGER](../ONE_PAGER.md) → [PRD](../PRD.md) → [BRD](../BRD.md) / [LLD](../LLD.md) → [DESIGN](../DESIGN.md).

| Document | What it covers | Owner |
| --- | --- | --- |
| [THREAT_MODEL.md](THREAT_MODEL.md) | What we protect, who might attack, 29 threats with mitigation status, top risks before the Pilot | Privacy / security lead |
| [PRIVACY_ASSESSMENT.md](PRIVACY_ASSESSMENT.md) | DPDP Act assessment: data inventory, purposes, consent, processors and location, retention, rights, breach response, questions for counsel | Privacy / security lead |
| [AI_EVALUATION.md](AI_EVALUATION.md) | Evaluation set, metrics, release thresholds, zero-tolerance failures, how and when it runs | Product + AI |
| [CLOUD_SETUP.md](CLOUD_SETUP.md) | Google Cloud project, environments (dev + prod), services, secrets, first deploy, guardrails | Engineering |
| [FEASIBILITY_AND_COMPLIANCE.md](FEASIBILITY_AND_COMPLIANCE.md) | What is legally and technically feasible: licensing, identity checks, DigiLocker, Account Aggregator, official portals, DPDP answers, Google Cloud in India, SMS rules, approvals roadmap | Founder + privacy lead |
| [SOURCE_VALIDATION.md](SOURCE_VALIDATION.md) | Each official source and claim route: what it covers, who may use it, what it needs, APIs, digital submission, documents, open questions | Integrations + operations |

All four are first drafts. None is legal advice; legal questions are marked ⚖️ for counsel.
