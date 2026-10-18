# Bounded autonomous preparation

From a saved conversation, select **Work on this case** once. Keeper collects source evidence, identifies unresolved reviews, refreshes up to five existing claim packages, and returns a concrete review target. Progress, receipts and retry counts live in the private CaseAgentRun table. No claim is created or submitted by this coordinator. Human approval is still required.

Each request advances one leased checkpoint. Revision/cursor/lease-token comparisons fence concurrent requests; leases expire after 60 seconds. A pause prevents new checkpoint commits and resume retains the cursor. Preparation already performed during an in-flight checkpoint is idempotent. Three failed checkpoint attempts stop the run. Recheck starts a new revision and re-reads current evidence, including evidence changed during a run.

An existing waiting run also reconciles its evidence fingerprint after records change; only a changed snapshot starts a new revision. Paused runs never restart this way.

There is no always-on scheduler: the open conversation advances the run, and returning resumes active saved runs. Completion means preparation finished, never claim resolution. Users must review findings; fields, ownership, authority, approvals, submissions and outcomes are never automatically changed.

Schema: run the existing database preparation helper for your database provider. PostgreSQL uses the additive reviewed SQL under prisma/changes/20261018_case_agent.sql, inside the private keeper schema; it was applied locally to the configured Supabase project. SQLite tests initialize from the canonical schema. Regenerate both clients after schema changes; stop Windows processes using a client before regenerating its locked native DLL.
Validation: full backend regression suite passed (202 tests before the additional pause-while-waiting test); all six case-agent safety/recovery tests pass on final code. Frontend suite: 75 passed. Lint, typechecks and production build passed. Live Supabase run saved checkpoint 1, paused, resumed at checkpoint 1, and completed four persisted receipts. Actual microphone permissions and acoustic accuracy remain device acceptance checks.
