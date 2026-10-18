# Keeper synthetic hosted MVP: Supabase Free + Cloud Run

Code is prepared; provisioning is not complete. Do not call the hosted MVP ready until the final checks pass. Keep using made-up financial data.

## 1. Create a Supabase Free project

Use https://supabase.com/dashboard . Choose the Free plan and a region appropriate for the intended pilot. Supabase Free currently provides 500 MB database storage; projects may pause after inactivity, and automated backups are not included. Export synthetic records periodically; a free tier is not an availability guarantee.

In the project, collect the project URL and publishable key (or legacy anon key). No service-role key is used by Keeper. Keep the database password and OAuth client secret out of chat and Git. Enter them only in local configuration or the provider console.

## 2. Configure the backend locally

Keep the existing local SQLite file as a development backup. Copy backend/.env.example into a separate private configuration file, or edit backend/.env locally. Set:

```dotenv
AUTH_MODE="supabase"
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_PUBLISHABLE_KEY="YOUR_PUBLISHABLE_KEY"
PUBLIC_APP_URL="http://localhost:3000"
DATABASE_URL="postgresql://USER:PASSWORD@YOUR_SESSION_POOLER:5432/postgres?schema=keeper&connection_limit=3&sslmode=require"
KEEPER_DB_PROVIDER="postgres"
```

Obtain the session-pooler connection URL from Supabase Connect. URL-encode special characters in the password. The private `keeper` schema keeps application tables out of Supabase's default public Data API. Do not expose the keeper schema through the Data API or grant anon/authenticated roles access to it. Only the backend's database role should access these tables.

From backend, run:

```powershell
npm run db:prepare
npm run db:setup
npm run dev
```

The production Prisma schema is derived from the canonical SQLite schema into git-ignored prisma/.generated/. `db:setup` is an explicit schema initialisation command with no data-loss flag. Startup no longer runs db push. For changes after hosted data exists, review and create a versioned migration before applying it. Existing SQLite records are not automatically migrated; leave them intact and create new synthetic hosted fixtures, or plan an explicit migration.

To return to SQLite development, restore the original file DATABASE_URL, use AUTH_MODE=demo, remove KEEPER_DB_PROVIDER=postgres, run npm run db:prepare and restart. Local SQLite survives ordinary restarts but must not be the Cloud Run database.

## 3. Enable Google through Supabase Auth

In Google Auth Platform, configure a web OAuth client. Add the callback URL shown by Supabase's Google provider configuration (normally https://YOUR_PROJECT.supabase.co/auth/v1/callback). Enter that client ID and client secret in Supabase, not in browser source.

Set Supabase Auth Site URL to the frontend origin. Allow Keeper's local and eventual hosted callback URLs under Redirect URLs. Keeper's callback includes a state query, so configure the provider allow-list to permit its state query on `/api/auth/callback` while restricting the scheme and host. Remove localhost from the hosted project's production-only allow-list when development is complete.

Keeper starts OAuth through /api/auth/start using PKCE and a state cookie, exchanges the code on the backend, and uses HttpOnly cookies. Every protected backend request verifies the Supabase user; x-session-id is ignored in hosted mode. Access is keyed by immutable account ID. Google identity does not satisfy the financial-identity/authority gates.

## 4. Prepare source-only Cloud Run inputs

From the repository root:

```powershell
node scripts/prepare-cloud.mjs C:/path/to/a/new/staging-directory
```

This creates backend/ and frontend/ deploy roots, each containing its service plus shared/. The script rejects an existing destination and excludes .env files, databases, logs, node_modules, tests and Git history. These are buildpack inputs, not Docker projects.

Install/use the official gcloud CLI and select your existing project. Deployment requires its project ID and an authorised Google login. Cloud Run, source builds, image storage and secrets have free allowances, not a blanket promise of zero cost. Do not enable paid plans or billable services merely to complete setup. Review quotas and the project's billing controls before deployment.

For the API, use the generated backend source root, KEEPER_DB_PROVIDER=postgres at build time, NODE_ENV=production and AUTH_MODE=supabase at runtime, and store DATABASE_URL and AI keys in Secret Manager. Provide SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and PUBLIC_APP_URL as runtime config. Use minimum instances 0, maximum instances 1, request-based billing and a small connection pool. Do not put credentials in command history or source archives.

For the web service, use the generated frontend source root and set BACKEND_URL to the deployed API's HTTPS URL at build time. PUBLIC_APP_URL on the API must be the web origin, because cookies and OAuth travel through the same-origin web proxy. Cloud Run's PORT environment is honoured by the existing Next start command.

If neither URL exists yet, first deploy the web service with an intentionally unavailable placeholder BACKEND_URL, obtain its URL, deploy the API with that PUBLIC_APP_URL, then rebuild the web service with the real API URL. Do not begin sign-ins during this bootstrap. Set the final Supabase Site URL and callback allow-list before testing login.

Hosted startup deliberately refuses local SQLite, a public database schema, missing auth config or a non-HTTPS frontend URL. `/api/health` is a liveness probe, not proof that database/auth setup is complete.

## 5. Acceptance checks before calling the MVP ready

- Sign in with two synthetic test accounts. Neither account can read the other's cases or evidence, including by guessing URLs or supplying a browser session header.
- Create a synthetic case and conversation. Sign out, sign in on another browser, and confirm saved answers return.
- Complete simulated financial identity gates, record an official search's scope and outcome, then record a later outcome. Both dates remain in history; no-match is scoped, and a possible match is never automatically verified.
- Restart/redeploy the API. Cases, search history and conversation must remain.
- Retry a search submission with the same request ID. It produces one stored result.
- In Settings, type DELETE and remove Keeper application data. Other accounts remain intact. Google/Supabase account identities and processor-held copies are outside this deletion; do not describe the feature as deleting third-party copies or all backups.
- Exercise voice input and interruptions on actual Chrome/Edge devices in the pilot languages. Text tests do not establish microphone accuracy.

References: https://supabase.com/pricing , https://supabase.com/docs/guides/auth/social-login/auth-google , https://supabase.com/docs/guides/auth/sessions/pkce-flow , https://supabase.com/docs/guides/database/prisma .
