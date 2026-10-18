# Local Supabase validation

Local app: http://localhost:3001, API: http://localhost:4001. Authentication remains local synthetic-session mode by request; this is not production sign-in.

The ignored backend/.env.supabase-local merges existing AI configuration with the private Supabase connection and strict certificate verification. It does not replace backend/.env or SQLite. PostgreSQL Prisma client is generated separately under prisma/.generated/client with the Node PostgreSQL adapter, preserving the SQLite test client. Generate it with the existing database helper using the hosted environment before starting the PostgreSQL runtime.

The frontend must build with BACKEND_URL=http://localhost:4001. Existing SQLite records are preserved in the original database; they are not silently migrated. Browser case IDs from an empty or different database are discarded during hydration. Google OAuth and hosting are intentionally unchanged.

Verified against Supabase: synthetic LIC demo, confirmed holding, simulated nominee entitlement, pack checklist/declarations, content-hash approval, recorded self-submission, simulated institution review, simulated settlement. No external submission or payment occurs. Also verified: five accepted source fields, saved two-message conversation, saved follow-up preference, isolation from a different synthetic session (404), and recovery of conversation/follow-up/settled claim after API restart.

Voice: server recording retries are explicit after browser recognition failure. Microphone permission remains controlled by the browser/OS and cannot be bypassed. Actual spoken microphone accuracy requires a user/device check.

Start API from backend with `npm run dev:supabase`; rebuild/start frontend from frontend with `npm run build:supabase` then `npm run start:supabase`. The restricted agent runtime used a workspace-only TypeScript loader because tsx could not access OS user information; normal local terminals use the npm scripts.
The public Supabase root CA from the project dashboard is bundled under backend/certs/supabase-root.crt (not a credential). PostgreSQL uses CA and hostname verification; it does not disable certificate checking.
Final validation: 197 backend tests (OCR download tests excluded), 72 frontend tests, backend typecheck, frontend lint and production build pass. Live Supabase validation also records a scoped simulated official-search result and checks request-ID idempotency. Browser conversation survives reload. Actual microphone permission/acoustic accuracy remains a device-level acceptance check.
