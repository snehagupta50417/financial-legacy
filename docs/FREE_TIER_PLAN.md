# Free-tier and existing-credit plan

Reconciled 18 October 2026. Use only free allowances and existing free credits. No paid upgrade, automatic top-up or billable replacement is authorised. [CURRENT_STATE](CURRENT_STATE.md) separates configuration from tested availability.

## 1. What free means

Free tiers are limited by provider, model, account, usage and availability. Signup credits expire or run out. A key, budget alert or minimum instances 0 is not a hard zero-cost guarantee. Verify the account tier, remaining credits, billing status and controls before public deployment. Those settings were not independently established in the local audit.

## 2. Each need and its free choice

| Need | Current implementation | Cost/availability boundary |
| --- | --- | --- |
| Database | Supabase PostgreSQL, private `keeper` schema, strict TLS | Plan storage/inactivity limits; inspect project plan. SQLite is local/test only |
| Sign-in | Supabase Auth + Google OAuth/PKCE | Code built; Google disabled in inspected project; hosted acceptance outstanding |
| AI/embeddings | Gemini Developer API key | Model-specific free quotas; synthetic only. Vertex code is not approved for use |
| Speech input | Sarvam STT → Gemini transcription → browser recognition | Finite signup credits, model quota, browser/device availability |
| Speech output | Browser speech / Gemini TTS | Latest Gemini TTS returned 429. Sarvam TTS tested diagnostically but not integrated |
| OCR | Local Tesseract | No paid OCR API. Language download and CPU/memory consume host resources |
| Claim PDF | Local pdf-lib | No external PDF service; host resources still apply |
| Hosting | Source-prepared Cloud Run services | Deployment not verified; runtime/build/image/network/secrets allowances all need review |
| Follow-up | In-app preference and next-check date | No SMS/email send or guaranteed always-on reminders |
| Rate limits | Per-instance memory | Shared abuse controls remain open; no Memorystore |
| Originals | Extract in memory, do not retain originals | Not a document vault/backup service |

## 3. Decision needed: the permanent database

**Resolved for the synthetic MVP:** Supabase PostgreSQL is selected and local persistence/restart checks passed. This heading remains for existing links. The database is no longer an open choice between Cloud SQL, Firestore or a VM. Hosted startup rejects SQLite. Preserve local SQLite records; migration is a separate explicit task.

Supabase Free is not a backup/uptime guarantee. Review storage, inactivity, exports and recovery against the actual plan before a pilot. See [HOSTED_MVP_SETUP](HOSTED_MVP_SETUP.md).

## 4. What the free AI terms mean

Current policy remains synthetic data only. Unpaid Gemini has provider data-use conditions; a consent toggle does not authorise real sensitive financial documents. Real-data processing, residency, retention and contracts require privacy/security approval. This reconciliation is not a new legal review.

No Cloud SQL, Vertex AI, Memorystore, paid Speech API or SMS was enabled to resolve failures. Quota errors preserve work and remain visible; never silently switch to a billable provider.

## 5. Guardrails

Keep keys private/server-side and apply provider restrictions where supported. Inspect plan and credit/top-up settings. Limit concurrency/instances and request duration; use request-based hosting and a small PostgreSQL pool. Review build, image retention, egress and secrets as well as runtime costs. Budget alerts notify; they do not necessarily stop billing. Claim a hard cap only after configuration and testing.

## Sources

Provider pages consulted in the 18 October audit; exact allowances can change. Account balances were not read.

- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
- [Sarvam credits and rate limits](https://docs.sarvam.ai/api/getting-started/ratelimits): signup credits are finite.
- [Supabase pricing](https://supabase.com/pricing).
- [Google Cloud free program](https://cloud.google.com/free).
