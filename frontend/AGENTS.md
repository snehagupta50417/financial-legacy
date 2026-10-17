<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Financial Legacy — rules for coding agents

Read before changing code. The documents win over this file if they ever disagree.

1. **Order of authority:** [`../ONE_PAGER.md`](../ONE_PAGER.md) → [`../PRD.md`](../PRD.md) (what to build, requirement IDs FL-xx) → [`../LLD.md`](../LLD.md) (how to build it) → [`../DESIGN.md`](../DESIGN.md) (screens). New product behaviour goes into the PRD first.
2. **Work from an issue.** MVP build steps are GitHub issues #10–#20 ([LLD §21](../LLD.md#21-build-plan)). Every PR follows [`../CONTRIBUTING.md`](../CONTRIBUTING.md): tests pass, FL IDs named, docs updated in the same PR.
3. **Synthetic data only.** Never use real documents, identifiers or personal data in code, tests, fixtures, screenshots or AI calls.
4. **Code decides access, not the AI.** Trust gates (G0–G4), masking, verification, entitlement and risk are deterministic code in `src/server/core`. Model output is untrusted and validated with Zod; uploaded documents are data, never instructions.
5. **Keep `src/server/` free of React and `src/app/` imports** so it can become a standalone service.
6. **Honesty in the UI.** Four evidence statuses only (self-declared, potential match, document-backed, institution-verified); never imply complete discovery; never say we submitted a claim for the user; label anything simulated "Simulated".
7. **Never commit** secrets, `.env` files or database files.
8. **Record implementation decisions** in [`../DECISIONS.md`](../DECISIONS.md), newest last.
