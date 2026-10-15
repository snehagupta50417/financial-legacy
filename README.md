# Financial Legacy

**Find what’s yours. Make sure nothing gets left behind.**

An AI-native financial asset discovery, legacy planning and recovery-assistance platform for individuals and families in India.

## What we are building

One conversational case manager helps people discover and organize their own financial assets, prepare a secure financial legacy, or navigate claims after a family member’s death. Users can start directly with claims if they already know the assets.

The assistant coordinates evidence, tasks and follow-ups. It does not determine inheritance rights, guarantee discovery of all assets, or promise claim settlement.

## Documentation

| Document | Purpose |
| --- | --- |
| [Product requirements](PRD.md) | Problem, personas, journeys, MVP scope, requirements and acceptance criteria |
| [Low-level design](LLD.md) | Proposed components, data model, APIs, state machines, authorization and operations |
| [Delivery plan and decisions](ROADMAP.md) | Milestones, validation gates, dependencies, risks and open questions |

## Product principles

- Start with conversation; provide structured views when users need to inspect their case.
- Keep discovery, ownership evidence and legal authority separate.
- Label every asset: self-declared, potential match, document-backed or institution-verified.
- Preserve the source and date of every balance. Historical amounts are not current balances.
- Require explicit approval for a specific external submission or disclosure.
- Release family information only through an authorized process; a trusted contact is not automatically an heir.
- Support a human handoff when evidence, entitlement or institutional requirements are disputed.

## Initial scope

The proposed MVP supports text conversations, secure uploads, assisted document extraction, reviewed asset inventories, legacy checklists and human-assisted claim preparation and tracking. Bank accounts/fixed deposits and mutual funds are the proposed first asset classes.

Voice, multilingual support, direct financial integrations, automated institution follow-ups and additional asset classes are phased capabilities. Their inclusion depends on evaluation, permissions, partnerships and institutional support.

## Status and provenance

This repository currently contains planning documents, not a working application. Version 0.1 was prepared on 15 October 2026 from the founder-supplied concept. The source text was duplicated and ended midway through the feasibility section; these documents consolidate it and label new implementation choices as proposals.

Descriptions of Indian financial infrastructure are planning inputs from that concept, not a current verification of API access, legal requirements or coverage. Validate each source before implementation. No launch dates, vendors, regulatory permissions or production integrations have been committed.

## Working rules

Use synthetic records in development. Do not commit identity documents, account numbers, statements, claimant evidence, credentials or real customer data to this repository. Product and engineering changes should reference requirement IDs in the PRD and record material decisions in the delivery plan.
