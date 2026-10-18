# Bounded autonomous preparation

From a saved conversation, select **Work on this case** once. Keeper collects source evidence, identifies unresolved reviews, refreshes up to five existing claim packages, and returns a concrete review target. Progress, receipts and retry counts live in the private CaseAgentRun table. No claim is created or submitted by this coordinator. Human approval is still required.

Each request advances one leased checkpoint. Revision/cursor/lease-token comparisons fence concurrent requests; leases expire after 60 seconds. A pause prevents new checkpoint commits and resume retains the cursor. Preparation already performed during an in-flight checkpoint is idempotent. Three failed checkpoint attempts stop the run. Recheck starts a new revision and re-reads current evidence, including evidence changed during a run.

An existing waiting run also reconciles its evidence fingerprint after records change; only a changed snapshot starts a new revision. Paused runs never restart this way.

There is no always-on scheduler: the open conversation advances the run, and returning resumes active saved runs. Completion means preparation finished, never claim resolution. Users must review findings; fields, ownership, authority, approvals, submissions and outcomes are never automatically changed.

Schema: run the existing database preparation helper for your database provider. PostgreSQL uses the additive reviewed SQL under prisma/changes/20261018_case_agent.sql, inside the private keeper schema; it was applied locally to the configured Supabase project. SQLite tests initialize from the canonical schema. Regenerate both clients after schema changes; stop Windows processes using a client before regenerating its locked native DLL.
Validation is dated in [CURRENT_STATE](CURRENT_STATE.md): 213 backend checks including OCR and 75 frontend checks. Live checkpoints/pause/resume passed. This is not acceptance of all devices, real financial providers or always-on operation.

## Document-to-claim continuation

The coordinator above refreshes existing drafts. A separate canonical document workflow now creates a draft after reviewed supporting evidence and explicit holding confirmation for a death case; it can link the exact reviewed policy requirement after authority checks. This does not expand the coordinator into auto-confirmation, approval or submission. See [EVIDENCE_WORKFLOWS](EVIDENCE_WORKFLOWS.md).
