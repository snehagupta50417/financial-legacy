> 18 October 2026: the synthetic hosted MVP now targets Supabase Free PostgreSQL plus Supabase Google Auth. See [HOSTED_MVP_SETUP.md](HOSTED_MVP_SETUP.md). The code is prepared; a Supabase project and hosted acceptance checks are still required. No paid plan or external resource was provisioned by this change.

# Free-Tier Plan

| | |
| --- | --- |
| **Version** | 0.1 |
| **Date** | 17 October 2026 |
| **Rule (founder, 17 Oct 2026)** | Use **only free things**: free tiers and the free credits we already have. Nothing that bills us. AI through a **Gemini API key**. Deployed on **Google Cloud**. |
| **Applies to** | Every service in [LLD](../LLD.md), [CLOUD_SETUP.md](CLOUD_SETUP.md) and the build plan. Where an older document names a paid service, this plan wins. |
| **Checked** | Limits below were read on Google's and GitHub's own pages on 17 Oct 2026 unless marked otherwise. Free tiers change with notice — re-check before relying on a number. |

---

## 1. What "free" means here

- **Google Cloud Free Tier** has no end date, but needs a billing account. Staying inside the monthly limits costs nothing. Google can change the limits with 30 days' notice.
- **Free Trial credit** ($300 for new accounts) lasts **90 days**. When it runs out or expires and the account isn't upgraded, resources stop and are deleted after 30 days. Credits are a cushion for mistakes, **not** something to build on.
- So: design for the always-free limits, keep the credits as a safety margin, and set a budget alert (§5) so nothing bills silently.

## 2. Each need and its free choice

| Need | Choice | Free limit | Status |
| --- | --- | --- | --- |
| Hosting | **Cloud Run**, request-based, from source (no Docker) | 2M requests, 180,000 vCPU-seconds, 360,000 GB-seconds a month | Ready ([CLOUD_SETUP.md](CLOUD_SETUP.md)) |
| Builds | Cloud Build + Artifact Registry | 2,500 build-minutes a month; 0.5 GB images | Keep only recent images (cleanup policy) |
| AI | **Gemini API key** (Google AI Studio), free tier | Rate-limited requests per model | Built. **Synthetic data only** — see §4 |
| Search embeddings | Same key, `gemini-embedding-001` | Same free tier | Built; without a key search is keyword-only |
| OCR | **Tesseract** on our own server | Free (open source) | Built |
| Claim pack PDF | **pdf-lib** on our own server | Free (MIT) | Built |
| Database | **Open decision** — see §3 | — | SQLite for demos today |
| Sign-in | **Google sign-in** (Identity Platform / Firebase Authentication) | 50,000 monthly active users; 3,000 daily on the Spark plan | To build (B3) |
| Phone OTP | **Dropped** | SMS is billed per message (only the first 10 a day are free) and Indian DLT registration has costs | Revises the earlier sign-in decision |
| Secrets | Secret Manager | 6 active secret versions, 10,000 accesses a month | Enough for `PAN_HASH_SECRET` and the API key |
| Original files | **Not stored** — read, extract, forget (as today) | — | Cloud Storage is free only in US regions, so not used |
| Malware scanning | **None yet**: uploads are limited to byte-checked PDF / PNG / JPEG / WebP / text up to 8 MB, synthetic only | — | No free scanner fits Cloud Run from source; revisit before real uploads |
| Speech in Indian languages | **Built:** Sarvam speech to text (`SARVAM_API_KEY`, optional) for calls, with language detection per turn; the browser's recogniser is the fallback | The credits already on the Sarvam account; no paid plan | Synthetic data only, like the Gemini key; audio is sent for each spoken turn and not kept. Free-tier status and India data residency to be confirmed before real data |
| Voice (B8) | **Built:** the browser's own speech recognition, driving a call-style agent loop whose reasoning and spoken voice (Gemini text to speech) use the free Gemini API key server-side, falling back to the browser's voice if the key's quota is used up. Optional later: Gemini audio on the free key (synthetic only), Cloud Text-to-Speech | Text-to-Speech: 4M Standard / 1M Neural2 characters a month. Speech-to-Text: 60 minutes a month (and Chirp is not offered in India) | To decide at B8 |
| Shared rate limit | The database (not Memorystore, which has no free tier) | — | Per-instance today |
| Logs and uptime | Cloud Logging, uptime checks | 50 GiB logs per project a month | Ready |
| CI | GitHub Actions | 2,000 minutes a month (private repository) | Built (`.github/workflows/ci.yml`) |
| Reminders | In-app only (no email or SMS sending) | — | To build (B9) |
| Vertex AI | **Not used** — billed per use, no free tier | — | Code path kept for a future paid setup |
| Cloud SQL | **Not used** — no free tier (a one-off 30-day trial instance only) | — | Revises LLD §5.2 / B2 |

## 3. Decision needed: the permanent database

Today the app uses SQLite. On Cloud Run the file lives in `/tmp`, so **every restart wipes it** and each instance has its own copy — fine for demos, not for anyone's real case. Options that stay free:

| Option | Free? | Good | Not good |
| --- | --- | --- | --- |
| **A. Keep SQLite in `/tmp`** | Yes | Nothing to set up | Data lost on every restart; demos only |
| **B. Postgres on a Compute Engine `e2-micro` VM** | Yes — one VM, 30 GB disk, always free | Stays inside Google Cloud; Prisma just changes provider | Only in US regions (us-west1, us-central1, us-east1), so data sits outside India; we run updates and backups ourselves |
| **C. Free managed Postgres outside Google (e.g. Neon, Supabase)** | Yes, with limits | Managed backups; Supabase offers a Mumbai region | Another data processor to disclose; small storage; free projects can pause when idle *(third-party limits, not checked on the providers' pages)* |
| **D. Cloud SQL** | No — trial or credits only, then billed | The original plan | Breaks the free-only rule once the trial ends |
| **E. Firestore** | Yes — 1 GiB, 50k reads / 20k writes a day | Google Cloud, free tier | Prisma doesn't support it; the data layer would be rewritten |

Until this is decided, B2 (#11) is on hold and the app stays on SQLite.

## 4. What the free AI terms mean

Google's terms for the **unpaid** Gemini API say prompts and responses may be used to improve Google's products, may be read by human reviewers, and that **sensitive, confidential or personal information must not be submitted**.

- **Now:** fine — every case, document and test uses synthetic data (already our rule).
- **For real users:** personal data cannot go to the free Gemini tier. The free-only rule therefore means one of:
  1. real cases run **without AI** — the app already works this way (rule-based intake, local OCR + text rules, keyword search with matching passages, deterministic claim rules); or
  2. a paid AI tier is approved later (Gemini paid tier or Vertex AI), which changes this rule.

  This must be settled before the Pilot ([PRD §15.2](../PRD.md#152-pilot--may-start-when)); until then, nothing with real personal data is processed.

## 5. Guardrails

- **Budget alert** on the billing account at a very small amount (for example ₹100), with alerts at 50%, 90% and 100%.
- Cloud Run: **minimum instances 0**, maximum instances 2 — no always-on cost.
- **Don't enable paid APIs** (Cloud SQL Admin, Vertex AI, Memorystore). [CLOUD_SETUP.md](CLOUD_SETUP.md) enables only what is free.
- **Restrict the Gemini API key** to the Generative Language API, and keep it in Secret Manager.
- Artifact Registry **cleanup policy** so old images don't exceed 0.5 GB.

## Sources

- [Google Cloud Free Tier and Free Trial](https://docs.cloud.google.com/free/docs/free-cloud-features)
- [Gemini API terms (unpaid services)](https://ai.google.dev/gemini-api/terms)
- [Firebase pricing (Identity Platform MAUs)](https://firebase.google.com/pricing) and [Firebase Authentication limits](https://firebase.google.com/docs/auth/limits)
- [Identity Platform pricing (SMS)](https://cloud.google.com/identity-platform/pricing)
- [Text-to-Speech pricing](https://cloud.google.com/text-to-speech/pricing)
- [GitHub Actions billing](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions)
