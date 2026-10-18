# FINANCIAL LEGACY

> Implementation reconciliation — 18 October 2026. Vision and intended scope are preserved below. Current implementation: a connected synthetic Keeper MVP with local Supabase persistence, saved conversation, bounded agent preparation and document-to-claim continuation. Real financial verification, production OAuth/public hosting and fully accepted voice remain open. See [CURRENT_STATE](docs/CURRENT_STATE.md).


**An AI-native financial asset discovery, legacy planning and recovery platform**

*Find what’s yours. Make sure nothing gets left behind.*

## 1. The Problem

People accumulate financial assets throughout their lives. These include bank accounts, fixed deposits, mutual funds, shares, insurance policies, provident funds, pensions and other investments.

Over time, these assets become scattered across different financial institutions. People change jobs, cities, phone numbers and banks. They may lose documents, forget old investments or fail to update their nominees.

When someone passes away, their family often faces two problems:

**Problem 1: Discovery**
The family doesn’t know what assets the deceased person owned or where those assets are held.

**Problem 2: Recovery**
Even when the family knows an asset exists, claiming it can involve multiple institutions, complicated paperwork, identity verification and lengthy follow-ups.

There is no single established system in India that allows families to discover and claim every financial asset through one unified process.

The result is that some assets remain forgotten or unclaimed, while families spend significant time navigating financial and legal procedures.

## 2. What We’re Building

We’re building an AI-native platform that helps individuals and families discover financial assets, organize them and recover them when needed.

The platform brings together three connected capabilities:

- **Financial asset discovery:** Help people identify known, forgotten or potentially unclaimed assets through permitted sources.
- **Claims and recovery assistance:** Help authorized individuals navigate the process of claiming financial assets.
- **Financial legacy planning:** Allow people to organize their financial information while they’re alive, making it easier for their families later.

These capabilities work together but can also be used independently.

For example, someone might only want to discover their old investments. Another person might already know where their father’s money is held and only need help claiming it.

The platform should support both.

## 3. Who Is This For?

### Use Case 1: Individuals discovering their own assets

A person wants to understand what financial assets they own.

They may have investments spread across multiple institutions, forgotten fixed deposits or mutual funds purchased years ago.

They open the platform and tell the AI:

> “I want to find all my financial assets. I remember investing in mutual funds a few years ago, but I don’t remember where.”

The AI helps them verify their identity, collect relevant information, retrieve records through permitted sources and identify possible missing assets.

The user receives a consolidated view showing confirmed holdings, potential matches and assets requiring further investigation.

### Use Case 2: Individuals preparing their financial legacy

A person wants to ensure their family can identify their assets and understand what to do with them in the future.

This could be a senior citizen, someone approaching end of life or simply an individual planning ahead.

They tell the AI:

> “I want to make sure my children know where my money and investments are.”

The AI helps organize their financial records, identify missing nomination information, prepare important documents and create a secure legacy record.

The person can designate trusted contacts and define what information may be shared, subject to appropriate identity verification, authorization and legal requirements.

This reduces the risk of their family being unaware of assets later.

### Use Case 3: Families discovering and claiming assets after death

Someone has passed away, and their family doesn’t know the full extent of their financial holdings.

A family member opens the platform and says:

> “My father passed away. We know he had a few bank accounts, but we’re not sure about his investments or insurance policies.”

The AI guides the family through the process.

It helps establish the claimant’s identity and legal authority, collect available documents, identify relevant discovery sources, organize potential assets and prepare institution-specific claims.

If the family already knows which assets exist, it can skip discovery and directly begin claims assistance.

The platform then helps track outstanding documents, institutional responses and claim progress until the case is resolved.

Importantly, discovering an asset does not automatically establish someone’s right to inherit it. Legal entitlement and institutional verification remain separate requirements.

## 4. How the Platform Works

The experience is designed to begin and continue through an AI assistant rather than a traditional financial dashboard.

1. **Talk to AI** — Describe your situation through voice or chat
2. **Verify identity and authority** — Establish permissions and required documents
3. **Discover financial assets** — Use authorized sources and available evidence
4. **Consolidate and verify** — Build a reliable inventory of assets
5. **Prepare or claim** — Organize a legacy or begin claims assistance
6. **Track through completion** — Manage follow-ups, exceptions and outcomes

### Step 1: Conversational onboarding

The user explains what they need.

The AI understands whether the person wants to discover assets, prepare for their family or claim assets belonging to someone who has died.

It asks relevant questions rather than making everyone fill out the same lengthy form.

Voice assistance could be particularly useful for elderly users and people who prefer communicating in Indian languages.

### Step 2: Identity verification and authorization

The platform establishes who is using the service and whose financial information is involved.

For living users, access may depend on their consent and the requirements of individual financial sources.

For deceased individuals, the platform needs to establish the claimant’s relationship and legal authority. Depending on the situation, institutions may require a death certificate, nomination details, succession certificate, probate or other supporting documents.

The AI can help collect and organize evidence, but it cannot independently decide legal entitlement.

### Step 3: Financial asset discovery

The system identifies relevant financial sources based on the information available.

Discovery could involve:

- Retrieving authorized financial records.
- Reading uploaded bank statements and investment documents.
- Using official unclaimed-asset search facilities.
- Identifying institutions mentioned in old records.
- Finding potential duplicate or forgotten holdings.
- Guiding users through institution-specific enquiries.

Every discovered asset should carry a clear status: self-declared, potential match, document-backed or institution-verified.

### Step 4: Consolidation

The AI organizes the information into a single financial asset inventory.

For each asset, the platform could show the institution, asset category, account or folio reference, available balance information, ownership evidence, nomination status and next action.

The system should distinguish current balances from historical amounts and never treat a possible match as confirmed ownership.

### Step 5: Legacy preparation or claims

For a living individual, the AI helps prepare a financial legacy record, identify missing documents and review nomination information.

For a family, it helps identify the relevant claim procedure, prepare forms, assemble evidence and track what each institution requires.

The user approves important actions before submission.

### Step 6: Completion

The platform maintains a case until the relevant tasks are resolved.

For legacy planning, completion could mean a verified asset inventory and an up-to-date preparation checklist.

For claims, completion means documenting the institution’s final outcome, such as settlement, transfer, rejection or an unresolved legal dispute.

## 5. What Financial Assets Can We Cover?

The product could eventually support multiple asset classes, but each has different discovery and claims procedures.

| Asset category | Potential discovery sources | Claims or recovery route |
| --- | --- | --- |
| Bank accounts and fixed deposits | Bank records, customer statements, RBI UDGAM for eligible unclaimed deposits | Bank-specific deceased-depositor procedures |
| Mutual funds | CAS, AMCs, CAMS, KFintech, SEBI MITRA | AMC/RTA transmission or redemption procedures |
| Shares and demat holdings | Depositories, brokers, CAS and company records | Depository, broker or company transmission |
| Unclaimed dividends and shares | Company/RTA records, IEPF | IEPF and company verification processes |
| Life insurance | Policy documents, insurer records, unclaimed-amount facilities | Insurer-specific death claim |
| EPF and related benefits | EPFO member records and available documentation | EPFO death and nominee claims |
| NPS | CRA and pension account records | Applicable NPS exit/death procedures |
| PPF and small savings | Banks, post offices and account records | Institution-specific settlement |
| Bank lockers | Bank records | Applicable nominee/heir access procedure |

These are potential coverage areas, not confirmation that our startup can programmatically access every source.

### Existing Indian infrastructure

India already has several relevant systems.

- **RBI UDGAM** helps users search eligible unclaimed deposits across participating banks. It is not a search engine for every active bank account.
- **SEBI MITRA** helps trace inactive and unclaimed mutual fund folios, including certain investments that may not appear in consolidated statements.
- **DigiLocker** enables authorized document sharing and retrieval through supported integrations.
- **Account Aggregator** provides consent-based financial information sharing within a regulated framework.
- **IEPF** provides mechanisms for claiming certain unpaid dividends and shares transferred to the fund.

These systems solve different pieces of the problem. Our proposed product would bring their permitted workflows into one coordinated experience.

## 6. Making the Product AI-Native

AI should not simply answer questions. It should manage the workflow.

The proposed system would have a central AI case manager supported by specialized capabilities.

| AI capability | Responsibility |
| --- | --- |
| Conversational and voice AI | Understand users, collect information and explain next steps |
| Discovery agent | Choose relevant permitted sources and discovery workflows |
| Document intelligence | Read statements, certificates, forms and historical records |
| Asset reconciliation | Match records, identify duplicates and flag uncertain ownership |
| Legacy planning agent | Identify incomplete information and prepare family handover records |
| Claims agent | Prepare institution-specific documents, coordinate approved actions and track progress |
| Follow-up agent | Monitor permitted status channels, reminders and unresolved tasks |

The agents operate through approved tools and controlled workflows.

For example, the claims agent should not independently submit sensitive documents or make binding declarations. It should prepare the action, show the user what will happen, obtain approval and execute only through permitted channels.

### Why voice matters

Many users, especially older adults, may find a voice conversation easier than navigating financial portals.

The AI could support multilingual conversations, ask clarifying questions, explain unfamiliar financial terms and help users work through documents step by step.

Voice agents could also assist with authorized follow-ups where institutions permit automated communication. Such calls would need appropriate disclosure, consent and compliance.

The ambition is to make the experience feel like speaking to one capable assistant that remembers the case and helps complete it.

## 7. Technical Architecture

The platform would have six main layers.

1. **User experience layer** — Mobile and web applications supporting voice, chat, document upload and a financial asset dashboard.
2. **Identity and authorization layer** — User authentication, consent management, claimant verification, permission controls and access history.
3. **AI orchestration layer** — An AI case manager that understands the user’s goal, selects workflows, coordinates tools and manages exceptions.
4. **Financial integration layer** — Approved APIs, regulated partner integrations, official discovery workflows and user-authorized document imports.
5. **Financial asset and document layer** — Structured asset records, source evidence, document storage, extraction results, reconciliation and audit trails.
6. **Claims and workflow layer** — Institution-specific requirements, document generation, approvals, task tracking, follow-ups and settlement reconciliation.

Security is fundamental because the platform handles highly sensitive personal, financial and family information.

It would require strong authentication, encryption, least-privilege access, explicit consent, retention controls, audit logs and safeguards against unauthorized disclosure.

## 8. What Is Actually Feasible?

This is where the startup needs to be particularly transparent.

| Functionality | Current assessment |
| --- | --- |
| AI-powered onboarding | Technically buildable |
| Multilingual voice assistance | Technically buildable |
| Reading financial documents | Technically buildable |
| Creating a consolidated asset registry | Technically buildable using available records |
| Identifying missing information | Technically buildable |
| Legacy planning and document organization | Technically buildable |
| Generating claims documentation | Technically buildable, subject to legal and institutional requirements |
| Claims tracking and reminders | Technically buildable |
| DigiLocker integration | Requires applicable approval and onboarding |
| Account Aggregator data access | Requires an eligible regulated pathway |
| Direct institutional claim submission | Depends on authorization and institution-specific channels |
| Discovering every unknown financial asset | Not established as universally feasible |
| Fully automatic asset settlement | Not generally available as a startup-controlled process |

### The biggest technical challenge

How do we find an asset when the user doesn’t know that it exists?

Extracting financial details from a document is relatively straightforward.

Discovering an unknown investment without a document, institution name, account number or existing record is much harder.

The platform needs to investigate which official sources can support such discovery, what identifiers are required, who is legally allowed to search, and whether approved commercial integrations are available.

We should not promise complete discovery until that coverage is demonstrated.

### The biggest legal challenge

Who is allowed to access someone’s financial information after their death?

A death certificate alone does not automatically authorize access to every financial account.

Nominees, legal heirs, executors and surviving joint holders may have different rights depending on the asset and applicable law.

The platform must establish the appropriate authority before retrieving sensitive information or initiating claims.

## 9. How the Business Could Make Money

The product could have multiple revenue streams.

- **Consumer services:** Optional subscriptions for legacy planning, paid discovery assistance and fixed-fee claims support.
- **Institutional partnerships:** Banks, insurers, wealth managers and employers could offer the platform to their customers or employees.
- **Financial institution software:** Institutions could pay for claims workflow tools, document processing or customer-facing legacy services.
- **Professional collaborations:** Estate lawyers, accountants and other permitted service providers could support complex cases through the platform.

All models would need customer validation, legal review and clear rules around data sharing. The business should earn revenue from providing services, not from selling sensitive financial information.

## 10. The MVP

The first version should prove that AI can meaningfully simplify discovery and recovery without depending on integrations that haven’t been secured.

### MVP capabilities

- Voice and chat onboarding for all three customer journeys.
- Identity and authorization intake.
- Financial document upload and AI extraction.
- Consolidated asset inventory with evidence and confidence status.
- Guided discovery using existing permitted sources.
- Legacy planning and document organization.
- Claims preparation for a limited set of asset classes.
- Approval-based follow-ups and claims tracking.

A sensible initial scope would be bank deposits, mutual funds and insurance because they represent distinct and important discovery and claims workflows.

The MVP should measure accuracy, time saved, discovery success, completion rates, manual intervention and user trust.

It should not claim to have searched every financial institution when it has only checked a limited set of sources.

## 11. What Must Be Validated Before Scaling

The next stage requires source-by-source technical and legal validation.

For every financial institution or discovery system, we need to establish:

- Which assets it covers.
- What information is required to search.
- Whether individuals and authorized family members can use it.
- Whether commercial API access is available.
- What approvals or partnerships are necessary.
- What information can legally be returned.
- Whether claims can be submitted digitally.
- What documents are required.
- How settlement is processed.
- Which steps can be automated.

We also need to interview individuals, bereaved families, banks, insurers and estate professionals to establish actual demand and willingness to pay.

A technically possible product is not automatically a commercially viable business.

## 12. The Long-Term Vision

Today, discovering and recovering financial assets often means navigating separate institutions, websites, documents and procedures.

We want to bring those fragmented processes into one intelligent, trusted experience.

Someone should be able to open the platform and say:

> “I want to know what financial assets I have.”

Or:

> “I want to make sure my family can find everything when I’m gone.”

Or:

> “My father passed away. Help me find and claim what he left behind.”

The AI should understand the situation, establish the necessary permissions, gather evidence, coordinate permitted actions and guide the case through completion.

The platform should work for people who only need discovery, people planning for the future, and families who need recovery assistance.

The long-term goal is to make financial asset discovery, legacy preparation and inheritance recovery simpler, more accessible and more reliable—so fewer assets are forgotten and fewer families are left navigating the process alone.

The company would not replace banks, regulators or legal authorities. It would become the intelligent coordination layer that helps individuals and families interact with them.
