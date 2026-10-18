# Evidence maps and durable claim reviews

This feature uses the existing SQLite/PostgreSQL database. No external queue, provider, paid service, or institution submission integration is added.

## Setup

Stop the local API before regenerating Prisma on Windows, because its native engine DLL is locked while the API is running. From `backend/`, run `npm run db:prepare`, then `npm run db:setup`, then `npm run dev`. `db:setup` uses the existing configured database and refuses destructive schema changes. Take a database backup before deploying schema changes. Hosted setup uses the private `keeper` PostgreSQL schema described in HOSTED_MVP_SETUP.md.

## Review flow

Open a saved case, select an asset and explore **Why Keeper believes this**. Open its claim and start a **saved review**. Three checkpoints collect canonical evidence, check inconsistencies, and refresh the existing content-hashed claim package. Missing documents, unreviewed/rejected critical fields, conflicts, authority requirements and approval remain human tasks. Recheck after corrections. Review completion does not mean claim settlement.

A workflow row is unique per claim. Starts are idempotent. Workers acquire a conditional database lease; cursor/revision/token checks fence stale workers. Expired leases can be reclaimed after restart. Failed checkpoints back off and stop after three failures. Explicit restart creates one new revision, and replaying the same restart request is harmless. The workflow never auto-approves, submits, records an outcome or upgrades evidence.

The local API advances one checkpoint every two seconds. The review screen can advance work through an authenticated POST endpoint. Free-tier Cloud Run can suspend idle CPU: background progress is not guaranteed when no request is active, but checkpoints survive and resume when the app returns. Database durability depends on using external PostgreSQL in hosted deployments, not the container filesystem.

## Privacy and limits

All endpoints enforce case ownership and discovery/freeze gates. Protected field values and amounts stay hidden until authority checks pass. Identifiers are redacted again on output. Edges come from recorded references, not similarity scores or model guesses. Official searches are self-reported, not ownership verification. Limits on rows/fields/review history make this a bounded preview and are explicitly flagged; a truncated graph must not be treated as complete evidence.

The current worker prepares a claim review. Upload OCR itself is still synchronous; this is not a claim that all document extraction now runs in a durable queue. Browser-only examples show a labelled simulated evidence map and cannot run database workflows.

## Document-to-claim continuity — 18 October 2026

`GET /api/documents/:id/progress` returns extraction, critical-field review, holding match, authority, package and institution stages plus a concrete next record. POST retries preparation. Upload exposes this progress; successful review/confirmation may create the claim automatically once canonical reviewed evidence and explicit holding confirmation support it. Multiple source-linked confirmed holdings receive separate drafts; deterministic draft IDs prevent creation races.

Only the eligible reviewed source policy can fill its exact requirement after entitlement. Identity/death/relationship or inheritance authority is not inferred from a policy upload. Fields, holdings, declarations, approval, submission and outcomes are never accepted automatically. Preparation failure preserves the saved review/confirmation and exposes retry.

The document panel and saved conversation receipts explain missing work. Institution verification remains external unless an actual recorded institution status exists. Existing post-submission claims retain their stage; source recheck must not restart them. Eight live synthetic continuity checks passed; see [CURRENT_STATE](CURRENT_STATE.md).
