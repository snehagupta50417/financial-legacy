# Financial Legacy

<p><img src="assets/financial-legacy-banner.svg" alt="Financial Legacy — find what’s yours, make sure nothing gets left behind" width="100%"></p>

**An AI-native financial asset discovery, legacy planning and recovery platform for India.**

**Find what’s yours. Make sure nothing gets left behind.**

Financial assets become scattered across institutions. People forget investments; families may not know what exists or how to claim it. Financial Legacy brings the conversation, evidence and next steps into one case.

| User need | What we help with |
| --- | --- |
| Find my assets | Reviewed holdings, separate possible matches and remaining discovery gaps |
| Prepare my legacy | A dated financial record, missing-information checklist and controlled sharing instructions |
| Find or claim a relative’s assets | Permission review, institution-specific requirements, claim packs, follow-ups and documented outcomes |

The paths work independently. A family that knows the asset can skip discovery and start a claim.

**Talk → verify permission → collect/review evidence → organize a legacy or prepare a claim → track the outcome.**

The assistant manages work through bounded tools; backend code enforces permissions and approvals. A match does not establish inheritance. Every value needs a source, type and date. Adding a trusted contact gives no access. Institutions retain their own verification and settlement decisions; complete discovery or recovery is not guaranteed.

## The two core documents

- **[PRD.md](PRD.md):** the complete product scope, user journeys, all nine asset groups, requirements and release gates.
- **[LLD.md](LLD.md):** the six architecture layers, exact implementation rules, first journey, coding order and tests. Expand technical references when needed.

The [API](contracts/openapi.json), [database](contracts/schema.sql) and [sample data](contracts/fixtures.json) are supporting engineering contracts. AGENTS.md is short coding-tool guidance, not extra team reading.

## What happens next

Start B-01 in the LLD and build the first owner → sample statement → review → saved inventory journey. The initial reference build uses **generated records only**, covering bank accounts, fixed deposits and mutual funds across all three paths. Its assistant/extraction are labeled stand-ins; no running application, real retrieval or institutional submission exists yet.

The full vision includes the other asset groups, multilingual voice, verified family sharing/release and permitted retrieval/submission/follow-up. They remain explicit PRD scope with separate access, policy and quality gates.

The PRD controls scope. Never commit real financial/identity/family records or credentials.
