# Rules for coding agents

These apply to `frontend/`, `backend/` and `shared/`.

Read before changing code. The documents win over this file if they ever disagree.

1. **Order of authority:** [`ONE_PAGER.md`](ONE_PAGER.md) → [`PRD.md`](PRD.md) (what to build, requirement IDs FL-xx) → [`LLD.md`](LLD.md) (how to build it) → [`DESIGN.md`](DESIGN.md) (screens). New product behaviour goes into the PRD first.
2. **Work from an issue.** MVP build steps are GitHub issues #10–#20 ([LLD §21](LLD.md#21-build-plan)). Every PR follows [`CONTRIBUTING.md`](CONTRIBUTING.md): tests pass, FL IDs named, docs updated in the same PR.
3. **Synthetic data only.** Never use real documents, identifiers or personal data in code, tests, fixtures, screenshots or AI calls.
4. **Code decides access, not the AI.** Trust gates (G0–G4), masking, verification, entitlement and risk are deterministic code in `backend/src/server/core`. Model output is untrusted and validated with Zod; uploaded documents are data, never instructions.
5. **Two services, one contract.** `backend/` (the API) and `frontend/` (the UI) never import each other's code. What both need — API types and the pure claim rules — lives in `shared/`. The frontend reaches the API only through `/api/*` (proxied to the backend).
6. **Honesty in the UI.** Four evidence statuses only (self-declared, potential match, document-backed, institution-verified); never imply complete discovery; never say we submitted a claim for the user; label anything simulated "Simulated".
7. **Never commit** secrets, `.env` files or database files.
8. **Record implementation decisions** in [`DECISIONS.md`](DECISIONS.md), newest last.
9. **Free tier only.** Use only free tiers and existing free credits — no service that bills (no Cloud SQL, Vertex AI, Memorystore, SMS). AI through the free Gemini API key, synthetic data only. Check [`docs/FREE_TIER_PLAN.md`](docs/FREE_TIER_PLAN.md) before adding any service or dependency.
