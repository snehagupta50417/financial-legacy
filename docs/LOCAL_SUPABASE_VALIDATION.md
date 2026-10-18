# Local Supabase validation

Reconciled 18 October 2026. Web: http://localhost:3001; API: http://localhost:4001. The local runtime uses synthetic-session authentication, not production Google sign-in. See [CURRENT_STATE](CURRENT_STATE.md) for the audit.

## Configuration and storage

Private `backend/.env.supabase-local` merges the existing AI configuration with Supabase PostgreSQL. It does not replace `backend/.env` or migrate the SQLite file. Frontend private `.env.supabase-local` selects API port 4001 at build time. No passwords/keys belong in this document or Git.

Canonical schema: `backend/prisma/schema.prisma`. The database helper derives PostgreSQL under ignored `prisma/.generated/` and generates a separate client using the Node PostgreSQL adapter. The private `keeper` schema is selected explicitly. The dashboard's public root CA is bundled in `backend/certs/supabase-root.crt`; CA and hostname validation remain enabled. A public certificate is not a credential.

## Start the existing configured runtime

From `backend/`:

```powershell
node --env-file=.env.supabase-local scripts/database.mjs generate
npm run dev:supabase
```

In a second terminal, from `frontend/`:

```powershell
npm run build:supabase
npm run start:supabase
```

A new database requires a separate, reviewed setup step; generation/start alone does not initialise tables. Existing hosted data requires reviewed additive migrations, including the case-agent change under `prisma/changes/`. Preserve the original SQLite file. Do not use reset/data-loss flags or regenerate a native client while a Windows process locks its DLL.

The restricted agent environment needed a workspace-only TypeScript loader when tsx could not access OS user information. That helper is not a repository prerequisite; normal terminals use the scripts above.

## Windows connection helper

For an existing private `backend/.env.hosted` draft, from the repository root in CMD or PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backend/scripts/setup-supabase.ps1 -PrepareOnly
```

This process-scoped execution-policy flag avoids changing system-wide policy. The hidden prompt expects the database password, not the dashboard-login password. The helper's default project/pooler is specific to the existing setup; a different project must supply its own verified project/pooler arguments. Never print/share the password.

**PrepareOnly saves connection configuration; it does not apply the schema or switch the running app.** Generate/setup against the intended private env explicitly. Do not infer successful connection or schema creation from a saved-file message.

## Validation and limits

Supabase checks covered saved conversation/follow-up, restart persistence, foreign-session denial, reviewed source fields, claim draft/pack, simulated entitlement, approval, recorded submission, synthetic outcomes and agent pause/resume. Document-to-claim continuity passed eight live checks. Latest automated audit: 213 backend tests including six OCR, 75 frontend tests.

Latest voice audit: synthetic English STT passed; Gemini TTS exhausted quota. Physical microphone and audible playback still need device acceptance. OAuth and public hosting are unchanged and unverified here. No institution submission or payment occurred.
