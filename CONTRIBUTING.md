# Contributing

## The rule for every pull request

A PR can be merged only when all three are true:

1. **Tests pass** — locally and in CI: tests, type-check, lint and build. New or changed behaviour comes with tests.
2. **It names the requirements it covers** — the PRD requirement IDs (FL-xx) in the PR description and in test names, and it links its issue (`Closes #NN`).
3. **Docs are updated in the same PR** — if it changes product behaviour (PRD), design or data (LLD), screens (DESIGN) or makes an implementation decision (DECISIONS.md).

The PR template includes this checklist.

## Order of authority

[ONE_PAGER.md](ONE_PAGER.md) → [PRD.md](PRD.md) → [BRD.md](BRD.md) / [LLD.md](LLD.md) → [DESIGN.md](DESIGN.md). New product behaviour goes into the PRD first. [BACKEND_PLAN.md](BACKEND_PLAN.md) is hackathon-only.

## Working practice

- Work on a branch; open a PR into `main`; never push directly to `main`.
- One issue per PR where possible. Issues #10–#20 are the MVP build steps (LLD §21); #21–#23 are decisions.
- **Synthetic data only.** No real documents, identifiers or personal data in code, tests, fixtures, screenshots or AI calls until the Pilot's privacy terms are approved ([docs/PRIVACY_ASSESSMENT.md](docs/PRIVACY_ASSESSMENT.md)).
- Never commit secrets, `.env` files or database files.
- Access, gates, verification and risk are decided in code — never by the AI.

## Running locally

See [README.md](README.md#running-it).
