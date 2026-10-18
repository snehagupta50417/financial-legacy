> Updated 18 October 2026: use [HOSTED_MVP_SETUP.md](HOSTED_MVP_SETUP.md) for the current Supabase/PostgreSQL and Google sign-in setup. The historical commands below are background only and must not be used to deploy local SQLite.

# Google Cloud Setup

| | |
| --- | --- |
| **Version** | 0.2 — free tier only |
| **Date** | 17 October 2026 |
| **Decided** | Existing Google Cloud project; region **`asia-south1` (Mumbai)**; deploy to Cloud Run **from source, no Docker** ([LLD §17](../LLD.md#17-reliability-operations-and-deployment)); **only free-tier services**, AI through a **Gemini API key** ([FREE_TIER_PLAN.md](FREE_TIER_PLAN.md)) |
| **Fill in** | Replace `<PROJECT_ID>` below with the project's ID (shown on the Google Cloud console home page) |
| **Changed in 0.2** | Dropped Cloud SQL, Vertex AI, Speech-to-Text and phone OTP (not free). Gemini now uses the API key from Secret Manager. |

Commands use the `gcloud` CLI ([install guide](https://cloud.google.com/sdk/docs/install)). Run each once; they are safe to repeat.

---

## 1. Environments

| Environment | Project | Purpose | Data |
| --- | --- | --- | --- |
| **Development** | `<PROJECT_ID>` (the existing project) | Building, testing, demos | Synthetic only |
| **Production** | a second project, created only when real users are approved | Real users | Not before the Pilot gates in [PRD §15.2](../PRD.md#152-pilot--may-start-when) and the AI decision in [FREE_TIER_PLAN.md §4](FREE_TIER_PLAN.md#4-what-the-free-ai-terms-mean) |

## 2. One-time setup

**Sign in and select the project:**

```bash
gcloud auth login
```

```bash
gcloud config set project <PROJECT_ID>
```

```bash
gcloud config set run/region asia-south1
```

**Turn on only the services the app uses (all have a free tier):**

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

| Service | Used for | Free limit |
| --- | --- | --- |
| Cloud Run | Running the app | 2M requests, 180,000 vCPU-seconds, 360,000 GB-seconds a month |
| Cloud Build, Artifact Registry | Building from source with buildpacks | 2,500 build-minutes a month; 0.5 GB images |
| Secret Manager | `GEMINI_API_KEY`, `PAN_HASH_SECRET` | 6 active secret versions, 10,000 accesses a month |

Don't enable Cloud SQL Admin, Vertex AI (`aiplatform`), Memorystore or Speech-to-Text — they bill. Google sign-in (B3) will enable Identity Platform (`identitytoolkit.googleapis.com`) when it is built; it is free up to 50,000 monthly active users.

**Gemini API key:** create it in [Google AI Studio](https://aistudio.google.com/apikey) for this project, and restrict it to the *Generative Language API*. The free tier's terms allow Google to use prompts to improve its products and forbid personal information — **synthetic data only** ([FREE_TIER_PLAN.md §4](FREE_TIER_PLAN.md#4-what-the-free-ai-terms-mean)).

## 3. Secrets

```bash
printf '%s' "<the AI Studio key>" | gcloud secrets create GEMINI_API_KEY --data-file=-
```

```bash
printf '%s' "<a long random value>" | gcloud secrets create PAN_HASH_SECRET --data-file=-
```

Never commit secret values. Give the Cloud Run service account the *Secret Manager Secret Accessor* role.

## 4. Deploy (milestone M7)

Two Cloud Run services: deploy the **backend** first, then the **frontend**, which needs the backend's URL when it is built.

From the `backend/` folder:

```bash
gcloud run deploy keeper-api --source . --region asia-south1 --allow-unauthenticated --min-instances 0 --max-instances 2 --set-env-vars NODE_ENV=production,AUTH_MODE=supabase,KEEPER_DB_PROVIDER=postgres --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,PAN_HASH_SECRET=PAN_HASH_SECRET:latest
```

Note the service URL it prints, then, from the `frontend/` folder:

```bash
gcloud run deploy keeper-web --source . --region asia-south1 --allow-unauthenticated --min-instances 0 --max-instances 2 --set-build-env-vars BACKEND_URL=https://<keeper-api-url>
```

- The API reads `$PORT` and starts with `npm start`, which requires an already initialised external PostgreSQL database; schema setup is an explicit step. The web app proxies `/api/*` to `BACKEND_URL`, which is fixed at build time: if the API's URL changes, redeploy the frontend.
- Each API call is a request to both services, so the free 2M requests a month is shared and is used up about twice as fast as with one service.
- The API is public, as it was when it was part of the web app (the session key scopes data). Locking it to the web app alone is an open item.
- **Data:** SQLite in `/tmp` is wiped whenever the instance restarts, and each instance has its own copy. That is acceptable for demos only; the permanent database is an open decision ([FREE_TIER_PLAN.md §3](FREE_TIER_PLAN.md#3-decision-needed-the-permanent-database)).
- **No key?** The app still runs: rule-based intake, local OCR and text rules for documents, keyword search with matching passages for questions.
- Minimum instances 0 means the first request after idle is slower (cold start), but nothing runs — or bills — while idle.

## 5. Guardrails to set now

- **Budget alert** on the billing account at a very small amount (for example ₹100), alerting at 50%, 90% and 100%.
- **Artifact Registry cleanup policy** keeping only the latest few images, so storage stays under 0.5 GB.
- **Free Trial credit** ($300, 90 days for new accounts) is a safety margin only — don't build on it.
- **Region:** Cloud Run and Secret Manager run in `asia-south1`. The Gemini API key endpoint doesn't let us pick a region; with synthetic data that is acceptable, and it must be disclosed before any real data ([PRIVACY_ASSESSMENT.md §6](PRIVACY_ASSESSMENT.md#6-processors-and-data-location)).
- **Access:** least access for each team member; no shared personal accounts.
- **Synthetic data only**, always, while on the free AI tier.

## 6. Before any real users

Settle the database ([FREE_TIER_PLAN.md §3](FREE_TIER_PLAN.md#3-decision-needed-the-permanent-database)) and the AI terms ([§4](FREE_TIER_PLAN.md#4-what-the-free-ai-terms-mean)), then create the production project and repeat §2–§5. Track this in issue [#23](https://github.com/snehagupta50417/financial-legacy/issues/23).
