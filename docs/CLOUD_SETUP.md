# Google Cloud Setup

| | |
| --- | --- |
| **Version** | 0.1 |
| **Date** | 17 October 2026 |
| **Decided** | Existing Google Cloud project with billing; **two environments** (development and production); region **`asia-south1` (Mumbai)**; deploy to Cloud Run **from source, no Docker** ([LLD §17](../LLD.md#17-reliability-operations-and-deployment)) |
| **Fill in** | Replace `<PROJECT_ID>` below with the existing project's ID (shown on the Google Cloud console home page) |

Commands use the `gcloud` CLI ([install guide](https://cloud.google.com/sdk/docs/install)). Run each once; they are safe to repeat.

---

## 1. Environments

| Environment | Project | Purpose | Data |
| --- | --- | --- | --- |
| **Development** | `<PROJECT_ID>` (the existing project) | Building, testing, demos | Synthetic only |
| **Production** | a second project, e.g. `<PROJECT_ID>-prod`, created **before the Pilot** | Real users | Real data, after the Pilot gates in [PRD §15.2](../PRD.md#152-pilot--may-start-when) |

Separate projects keep real data, keys and permissions fully apart from development. Add a staging project before the Pilot handles real data.

## 2. One-time setup for the development project

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

**Turn on the services the app uses:**

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com aiplatform.googleapis.com speech.googleapis.com texttospeech.googleapis.com identitytoolkit.googleapis.com
```

| Service | Used for |
| --- | --- |
| Cloud Run, Cloud Build, Artifact Registry | Deploying from source with buildpacks |
| Secret Manager | `PAN_HASH_SECRET`, database password, other secrets |
| Cloud SQL Admin | PostgreSQL (build step B2) |
| Vertex AI (`aiplatform`) | Gemini through Vertex instead of an API key |
| Speech-to-Text, Text-to-Speech | Voice (build step B8) |
| Identity Toolkit (Identity Platform) | Phone OTP and Google sign-in (build step B3) |

**Turn on Identity Platform sign-in:** in the console, go to *Identity Platform → Providers*, enable **Phone** and **Google**, and add the app's domain to *Authorized domains*. Phone sign-in sends SMS, which is billed; set a budget alert (step 5).

## 3. Secrets

```bash
printf '%s' "<a long random value>" | gcloud secrets create PAN_HASH_SECRET --data-file=-
```

Never commit secret values. Each environment has its own secrets.

## 4. First deploy (milestone M7)

From the `frontend/` folder:

```bash
gcloud run deploy finlegacy --source . --region asia-south1 --allow-unauthenticated --set-env-vars GOOGLE_CLOUD_PROJECT=<PROJECT_ID>,GOOGLE_CLOUD_LOCATION=asia-south1 --set-secrets PAN_HASH_SECRET=PAN_HASH_SECRET:latest
```

- The app reads `$PORT` and starts with `npm start` (see [DECISIONS.md](../DECISIONS.md) M0).
- With `GOOGLE_CLOUD_PROJECT` set and no `GEMINI_API_KEY`, the app uses Gemini through Vertex AI with the Cloud Run service account.
- Until Cloud SQL is set up (B2), the development app uses SQLite in `/tmp`, which resets when the instance restarts — acceptable for demos only.
- Grant the Cloud Run service account the roles it needs: *Vertex AI User*, *Secret Manager Secret Accessor*, and later *Cloud SQL Client*.

## 5. Guardrails to set now

- **Budget alert** on the billing account (e.g. at 50% / 90% / 100% of a monthly limit).
- **Region check:** confirm Gemini and Speech (Chirp) models are available in `asia-south1`. If a model is only available outside India, record it and ask counsel before real data uses it ([PRIVACY_ASSESSMENT.md §6](PRIVACY_ASSESSMENT.md#6-processors-and-data-location)).
- **Data processing terms:** accept Google Cloud's data processing addendum for the account.
- **Access:** give team members the least access they need; no shared personal accounts.
- **Synthetic data only** in development, always.

## 6. Before the Pilot (production project)

Create the production project, link billing, repeat §2–§5, then add Cloud SQL with backups, encrypted Cloud Storage for originals, logging and alerting, and a staging project. Track this in issue [#23](https://github.com/snehagupta50417/financial-legacy/issues/23).
