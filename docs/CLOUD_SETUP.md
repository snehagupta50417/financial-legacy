# Google Cloud deployment handoff

Reconciled 18 October 2026. Public deployment is being handled separately; this does not assert a working public URL, billing controls or Google sign-in. Local acceptance: [CURRENT_STATE](CURRENT_STATE.md).

## 1. Deployment source

Follow [HOSTED_MVP_SETUP](HOSTED_MVP_SETUP.md) for Supabase/Auth and source packaging. From the repository root:

```powershell
node scripts/prepare-cloud.mjs C:/path/to/a/new/staging-directory
```

Deploy the generated backend/frontend roots, each including `shared/`. Do not deploy a bare service directory omitting shared contracts. The helper excludes secrets, databases and dependencies and refuses an existing destination.

## 2. Required configuration

| Service | Build | Runtime |
| --- | --- | --- |
| API | PostgreSQL client generation with `KEEPER_DB_PROVIDER=postgres` | `NODE_ENV=production`, `AUTH_MODE=supabase`, external `DATABASE_URL` with `schema=keeper`, Supabase URL/publishable key, HTTPS `PUBLIC_APP_URL`, private AI/HMAC config |
| Web | `BACKEND_URL` set to final API HTTPS origin | Next honours Cloud Run `PORT`; requests use same-origin `/api/*` proxy |

Keep passwords, OAuth secrets and API keys in approved private configuration/Secret Manager, not commands, history, chat or source. Strict PostgreSQL CA/hostname validation stays enabled. Schema setup is explicit; ordinary startup never runs db push.

Google OAuth needs the Supabase provider callback and Keeper's allowed callback origin. Account ownership is separate from financial authority. Browser session IDs must not grant hosted access. A public Cloud Run transport endpoint still requires application authentication on protected routes.

## 3. Free-only boundary

Use the deployer's authorised project and review its billing controls. Request-based hosting, minimum instances 0, a small maximum count, small connection pools and image cleanup reduce use but do not guarantee zero charges. Review runtime, builds, image storage, egress and secrets allowances. Do not enable Cloud SQL, Vertex, SMS or paid speech to complete setup. See [FREE_TIER_PLAN](FREE_TIER_PLAN.md).

## 4. Acceptance before sharing a link

Confirm final web/API URLs, proxy build config and OAuth callbacks. Run two-account isolation, sign-out/return, persistence after restart, deletion isolation and real-device voice checks from [HOSTED_MVP_SETUP](HOSTED_MVP_SETUP.md). Health is liveness; readiness and the authenticated journey are separate checks. Localhost is not a public deployment.

Historical container-local SQLite deployment commands are removed. Supabase is selected; hosted startup rejects SQLite/missing auth. This guide provisions nothing and makes no billing changes.
