import type { AssetCategory, CaseType, ClassifiedSituation } from "./types";
import { SCENARIO_LABELS } from "./types";
import { resourceForTask } from "./resources";

/**
 * Journey engine — ONE configurable engine powering all seven personas.
 * The LLM classifies the user's situation (Situation Understanding Agent);
 * this engine turns the classification into an evidence-linked, dependency-
 * aware task plan, then keeps "next best action" and progress in sync as
 * the user uploads documents, confirms facts and completes actions.
 */

export interface TaskSeed {
  title: string;
  instructions: string;
  rationale: string;
  institution?: string;
  assetCategory?: string;
  requiredDocs?: string[];
  missingInfo?: string[];
  dependencies?: string[]; // titles of prerequisite tasks
  status?:
    | "not_started"
    | "ready"
    | "in_progress"
    | "waiting_institution"
    | "needs_expert"
    | "completed";
  priority: number; // lower = earlier
  needsExpert?: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  bank_deposit: "Bank deposit",
  bank_account: "Bank account",
  insurance: "Insurance policy",
  mutual_fund: "Mutual fund",
  shares: "Shares & dividends",
  provident_fund: "Provident fund / pension",
  other: "Other asset",
  unknown: "Unclassified asset",
};

function categoryTaskSeeds(cats: AssetCategory[], holder: string): TaskSeed[] {
  const seeds: TaskSeed[] = [];
  for (const cat of cats) {
    if (cat === "unknown" || cat === "other" || cat === "provident_fund") continue;
    const res = resourceForTask(cat);
    const label = CATEGORY_LABEL[cat] ?? "Asset";
    if (cat === "bank_deposit" || cat === "bank_account") {
      seeds.push({
        title: `Search ${holder}'s unclaimed deposits on RBI UDGAM`,
        instructions:
          "Create a (free) UDGAM account, search using the account holder's name and approximate details (city, PAN if available). Note any bank shown as holding unclaimed deposits, then approach that bank to claim.",
        rationale:
          "RBI's UDGAM is the official centralised portal covering unclaimed deposits across banks. Searching there first avoids approaching every bank individually.",
        institution: "Reserve Bank of India — UDGAM",
        assetCategory: cat,
        requiredDocs: [
          "Depositor's full name (as in bank records)",
          "Approximate account opening period",
          "Address / ID proof of claimant",
        ],
        dependencies: [],
        priority: 20,
      });
    }
    if (cat === "insurance") {
      seeds.push({
        title: "Trace unclaimed insurance amount on Bima Bharosa",
        instructions:
          "Use IRDAI's Bima Bharosa unclaimed-amount query with the policyholder's details. If a policy is found, contact the insurer's claims team with the policy document and identity proofs.",
        rationale:
          "Bima Bharosa is IRDAI's official portal for tracing unclaimed insurance amounts across registered insurers.",
        institution: "IRDAI — Bima Bharosa",
        assetCategory: "insurance",
        requiredDocs: [
          "Policy document or policy number reference",
          "Policyholder's full name and date of birth",
          "Claimant identity proof",
        ],
        priority: 22,
      });
    }
    if (cat === "mutual_fund") {
      seeds.push({
        title: "Trace inactive / unclaimed mutual fund folios via MITRA",
        instructions:
          "Follow SEBI's official MITRA route (via MF Utilities) to search for inactive or unclaimed folios in the holder's name. Validate any folio found against your statements before claiming.",
        rationale:
          "MITRA is the regulator-backed platform for tracing moneys lying unclaimed in the mutual fund industry.",
        institution: "SEBI / MF Utilities — MITRA",
        assetCategory: "mutual_fund",
        requiredDocs: [
          "Folio statement or Consolidated Account Statement",
          "Holder's name and PAN reference",
        ],
        priority: 24,
      });
    }
    if (cat === "shares") {
      seeds.push({
        title: `Check unclaimed shares / dividends on IEPF and file recovery`,
        instructions:
          "Search the IEPF authority database for unclaimed shares or dividends in the holder's name. If found, file Form IEPF-5 online and send the physical document set to the company's Nodal Officer.",
        rationale:
          "Shares and dividends unclaimed for seven years move to IEPF; recovery happens through the official IEPF-5 process.",
        institution: "IEPF Authority — MCA",
        assetCategory: "shares",
        requiredDocs: [
          "Share certificate / demat statement / dividend warrant",
          "Acknowledgement of Form IEPF-5",
          "Claimant ID proofs (self-attested set)",
        ],
        priority: 26,
      });
    }
    void label;
    void res;
  }
  return seeds;
}

export function buildJourney(
  cls: ClassifiedSituation
): { summary: string; tasks: TaskSeed[] } {
  const holder = cls.assetHolderName?.trim() || "the asset holder";
  const cats = cls.assetCategories.length
    ? cls.assetCategories
    : (["unknown"] as AssetCategory[]);
  const t: TaskSeed[] = [];
  const deceased = cls.holderLiving === false;

  switch (cls.caseType) {
    case "living_individual": {
      t.push(
        {
          title: "Collect every financial record you can find",
          instructions:
            "Gather old bank passbooks, statements, policy documents, dividend warrants, demat statements and any Consolidated Account Statements. Photograph or scan them — you will upload them in the Document Centre.",
          rationale:
            "Discovery starts from paper. Each document may reveal institutions you have forgotten.",
          requiredDocs: ["Any statements, passbooks, policy documents"],
          priority: 10,
        },
        {
          title: "Review AI-extracted asset clues and confirm which are real",
          instructions:
            "Open the Asset Inventory, compare each clue against its source evidence, and confirm or dismiss it. Confirmed assets drive the recovery checklist.",
          rationale:
            "AI extraction is a hypothesis; your confirmation converts a clue into a verified record without inventing assets.",
          dependencies: ["Collect every financial record you can find"],
          priority: 15,
        },
        ...categoryTaskSeeds(cats, holder),
        {
          title: "Check the holder's PAN-linked Annual Information Statement",
          instructions:
            "Log in to the Income Tax e-filing portal and review the AIS/TIS for interest, dividends or capital gains that point to forgotten accounts.",
          rationale:
            "The AIS aggregates reporting by banks, mutual funds and companies — a legal, self-service discovery route.",
          institution: "Income Tax Department",
          assetCategory: "multi",
          priority: 30,
        }
      );
      break;
    }
    case "family_death": {
      t.push(
        {
          title: "Register the death and obtain multiple certified death certificate copies",
          instructions:
            "If not already done, register the death with the municipal authority and obtain 6–10 certified copies — every institution will require one and originals are retained.",
          rationale:
            "The death certificate is the foundational document for every deceased-claim workflow.",
          requiredDocs: ["Proof of death issued by hospital/authority", "ID proofs"],
          missingInfo: cls.confirmedFacts.some((f) =>
            f.toLowerCase().includes("death certificate")
          )
            ? []
            : ["Whether the death certificate has been issued"],
          priority: 10,
        },
        {
          title: "Map the deceased's financial footprint from records",
          instructions:
            "Upload every statement, policy, passbook and correspondence you can find. The Document Intelligence agent will extract institution references and possible asset clues.",
          rationale:
            "Families usually know a few accounts; documents reveal the rest of the footprint.",
          priority: 14,
        },
        {
          title: "Establish your authority to act (nominee / legal heir / executor)",
          instructions:
            "For each institution, identify whether you are nominee, legal heir or executor. Where no nomination exists, check whether a succession certificate or legal heirship is required.",
          rationale:
            "Institutions release assets only to persons with recognised authority; the requirement differs per institution and asset type.",
          priority: 16,
        },
        ...categoryTaskSeeds(cats, holder),
        {
          title: "File deceased-claim forms with each identified institution",
          instructions:
            "For each confirmed asset, obtain the institution's deceased-claim form set, attach the death certificate, KYC proofs and authority documents, and submit. Track each submission separately in the Journey Tracker.",
          rationale:
            "Each institution has its own claim process; parallel tracking prevents claims stalling silently.",
          dependencies: [
            "Map the deceased's financial footprint from records",
            "Establish your authority to act (nominee / legal heir / executor)",
          ],
          priority: 30,
        },
        {
          title: "Send follow-ups and escalate stalled claims",
          instructions:
            "If an institution does not respond within 30 days, send a written follow-up referencing the claim. For insurers, escalate to the Bima Bharosa grievance portal if unresolved for 15 days after the insurer's reply window.",
          rationale:
            "Regulatory timelines entitle you to escalate; documented follow-ups strengthen the record.",
          dependencies: ["File deceased-claim forms with each identified institution"],
          priority: 60,
        }
      );
      break;
    }
    case "nominee_heir": {
      t.push(
        {
          title: "Confirm the exact claim relationship for each asset",
          instructions:
            "List for each asset whether you are nominee, joint holder, or legal heir. Nomination simplifies claims but does not override succession law for all asset classes — note where additional heirs exist.",
          rationale:
            "The claim route, documents and releases differ materially between nominee claims and inheritance claims.",
          priority: 10,
        },
        {
          title: "Obtain the institution's specific claim requirements",
          instructions:
            "Contact each institution (or check its website) for the deceased/nominee claim checklist: claim form, death certificate, KYC, nomination record or legal-heir proof.",
          rationale:
            "Requirements are institution-specific; preparing the exact set avoids multiple branch visits.",
          priority: 16,
        },
        ...categoryTaskSeeds(cats, holder),
        {
          title: "Prepare and review claim forms with AI-assisted field population",
          instructions:
            "Let FinLegacy pre-fill the fields it can from your verified records, review every field yourself, then sign and submit. Nothing is submitted externally without your explicit approval.",
          rationale:
            "Assisted pre-fill reduces errors while keeping the human in control of every submission.",
          priority: 28,
        },
        {
          title: "Track claim references and correspondence until settlement",
          instructions:
            "Log every acknowledgement number and letter in the case timeline. Mark tasks 'Waiting for institution' so the tracker prompts timely follow-ups.",
          rationale:
            "Claims are routinely delayed by silence; tracked timelines enable timely escalation.",
          dependencies: ["Prepare and review claim forms with AI-assisted field population"],
          priority: 40,
        }
      );
      break;
    }
    case "estate_planning": {
      t.push(
        {
          title: "Build the complete asset & liability inventory",
          instructions:
            "List every asset (bank, investments, insurance, property, digital assets) and each liability. Upload statements to let the AI pre-populate the inventory from evidence.",
          rationale:
            "A will is only as complete as the inventory behind it.",
          priority: 10,
        },
        {
          title: "Decide beneficiaries, shares and special instructions",
          instructions:
            "For each asset, record who should inherit and in what proportion, plus guardianship wishes for minors and gifts of specific items.",
          rationale: "Clear beneficiary intent prevents later disputes and probate complexity.",
          dependencies: ["Build the complete asset & liability inventory"],
          priority: 14,
        },
        {
          title: "Choose an executor (and a backup) and obtain their consent",
          instructions:
            "Pick a trusted person or professional as executor, confirm their willingness, and record their full name and contact in the estate plan.",
          rationale:
            "An uninvolved or unavailable executor stalls estate administration regardless of will quality.",
          priority: 18,
        },
        {
          title: "Draft the will from the approved template and review it",
          instructions:
            "Generate the draft will from your verified inventory and beneficiary decisions. Read it fully, correct details, then print on plain paper.",
          rationale:
            "A clear, well-structured draft reduces ambiguity; FinLegacy marks it as a draft, not a legally executed document.",
          dependencies: [
            "Build the complete asset & liability inventory",
            "Decide beneficiaries, shares and special instructions",
          ],
          priority: 24,
        },
        {
          title: "Execute the will correctly: sign, witness and store safely",
          instructions:
            "Sign in the presence of two independent adult witnesses who also sign each page; date every page. Store the original safely and tell the executor where it is.",
          rationale:
            "Attestation by witnesses is what makes a will legally enforceable in India; storage prevents it being lost or contested.",
          dependencies: ["Draft the will from the approved template and review it"],
          priority: 30,
        },
        {
          title: "Get a legal review for complex situations",
          instructions:
            "If the estate involves business interests, cross-border assets, family settlements or potential disputes, have the draft reviewed by a qualified estate lawyer before execution.",
          rationale:
            "Complex estates carry legal nuances beyond template drafting; professional review protects intent.",
          status: "needs_expert",
          priority: 34,
        },
        {
          title: "Set a yearly review reminder",
          instructions:
            "Revisit the estate plan every year and after major life events (marriage, birth, purchase, sale) and update the will by fresh execution if needed.",
          rationale: "Outdated wills cause the very disputes estate planning is meant to prevent.",
          priority: 60,
        }
      );
      break;
    }
    case "rejected_claim": {
      t.push(
        {
          title: "Upload the rejection letter and all correspondence",
          instructions:
            "Upload the rejection or delay letter, the original claim acknowledgement, and everything the institution has sent. The AI extracts the stated reason and the timeline.",
          rationale:
            "The stated rejection reason determines whether the fix is documentation, escalation or legal review.",
          priority: 10,
        },
        {
          title: "Close every documentation gap cited in the rejection",
          instructions:
            "Work through the missing-document checklist generated from the letter. Obtain each document, upload it here, and mark it ready for resubmission.",
          rationale:
            "Most claim rejections cite fixable documentation gaps; addressing them precisely is the fastest route to reversal.",
          dependencies: ["Upload the rejection letter and all correspondence"],
          priority: 16,
        },
        {
          title: "Send the AI-drafted follow-up / resubmission to the institution",
          instructions:
            "Review the drafted response letter, attach the corrected document set, and submit through the institution's official channel. Record the acknowledgement here.",
          rationale:
            "A precise, evidence-referenced response is materially harder to reject on procedural grounds.",
          dependencies: ["Close every documentation gap cited in the rejection"],
          priority: 24,
        },
        {
          title: "Escalate to the regulator's grievance portal if unresolved",
          instructions:
            "For insurance: if the insurer does not resolve within 15 days of complaint, escalate on Bima Bharosa. For banking: use the bank's grievance cell, then the RBI Banking Ombudsman (cms.rbi.org.in).",
          rationale:
            "Regulatory escalation is a protected right once internal timelines lapse; institutions respond faster under regulator oversight.",
          institution: "IRDAI / RBI grievance channels",
          assetCategory: "grievance",
          dependencies: ["Send the AI-drafted follow-up / resubmission to the institution"],
          priority: 44,
        },
        {
          title: "Consult a professional for disputed or complex rejections",
          instructions:
            "If the rejection involves contested ownership, policy interpretation or large amounts, have a qualified insurance/financial lawyer review the case file before further escalation.",
          rationale:
            "Some disputes need professional representation; recognising that early saves months.",
          status: "needs_expert",
          dependencies: ["Escalate to the regulator's grievance portal if unresolved"],
          priority: 60,
        }
      );
      break;
    }
    case "caregiver": {
      t.push(
        {
          title: "Record consent and the scope of your authority",
          instructions:
            "Have the elderly relative explicitly agree to what you may access and do on their behalf. Record it in Consent settings; both of you can revoke at any time.",
          rationale:
            "Legitimate caregiving starts with documented, revocable consent — protecting both of you.",
          priority: 10,
        },
        {
          title: "Inventory accounts and documents together",
          instructions:
            "Sit with your relative and list bank accounts, deposits, policies, investments and where each document lives. Upload records to build the secure inventory.",
          rationale:
            "Joint inventory keeps the elder in control while creating an accurate picture.",
          dependencies: ["Record consent and the scope of your authority"],
          priority: 14,
        },
        {
          title: "Fix the highest-risk gaps first (nomination, joint holding, duplicates)",
          instructions:
            "For each account, check that nomination is registered and current, add a joint holder where appropriate, and close duplicate/dormant accounts deliberately.",
          rationale:
            "Nominations and joint holdings dramatically simplify later claims; dormant duplicates leak money.",
          dependencies: ["Inventory accounts and documents together"],
          priority: 20,
        },
        {
          title: "Consolidate and organise what matters into one place",
          instructions:
            "Digitise key documents, note locker locations, and maintain the single inventory FinLegacy keeps for you — updated as things change.",
          rationale: "An organised estate now is the kindest gift to the family later.",
          priority: 30,
        },
        {
          title: "Discuss estate planning with the elder",
          instructions:
            "Where appropriate, help them document a will and healthcare/financial powers of attorney with qualified professional guidance.",
          rationale:
            "Estate planning while alive is far smoother than inheritance claims after death.",
          priority: 44,
        }
      );
      break;
    }
    case "nri_cross_border": {
      t.push(
        {
          title: "Map assets and heirs across jurisdictions",
          instructions:
            "List every asset with its country, institution and current status, and note each heir's country of residence — this determines the applicable claim procedure.",
          rationale:
            "Cross-border cases mix Indian institution rules with foreign documentation (apostille/consular) requirements.",
          priority: 10,
        },
        ...categoryTaskSeeds(cats, holder),
        {
          title: "Prepare country-specific document requirements",
          instructions:
            "For each jurisdiction, identify whether documents need notarisation, apostille or consulate attestation, and whether translations are required.",
          rationale:
            "Foreign-issued documents are rejected without the correct attestation chain; knowing this upfront prevents months of delay.",
          priority: 22,
        },
        {
          title: "Appoint and authorise a representative in India (if needed)",
          instructions:
            "Where physical presence is required, execute a Power of Attorney appropriate to each institution's format and get it attested correctly.",
          rationale:
            "A correctly executed PoA lets work continue in India while you are abroad.",
          priority: 30,
        },
        {
          title: "Get cross-border tax and legal advice",
          instructions:
            "Inheritance, FEMA and tax treatment differ by country and asset type. Engage qualified cross-border tax/legal professionals for the binding positions.",
          rationale:
            "Cross-border mistakes are expensive; FinLegacy flags issues but does not give binding tax/legal advice.",
          status: "needs_expert",
          priority: 46,
        }
      );
      break;
    }
    default: {
      t.push(
        {
          title: "Describe your situation in more detail",
          instructions:
            "Tell us more in the AI intake: who holds the assets, whether they are living, and what records you have. The engine will rebuild this plan around your facts.",
          rationale: "The current classification is general; specifics unlock the real journey.",
          priority: 10,
        },
        {
          title: "Upload any financial record you already have",
          instructions: "Use the Document Centre — extraction runs on real text and produces evidence-linked clues.",
          rationale: "Documents are the fastest way to turn uncertainty into leads.",
          priority: 16,
        }
      );
    }
  }

  const summary =
    cls.summary ||
    `A personalised ${SCENARIO_LABELS[cls.caseType].toLowerCase()} journey covering ${
      cats.map((c) => CATEGORY_LABEL[c] ?? c).join(", ")
    }.`;

  return { summary, tasks: t.sort((a, b) => a.priority - b.priority) };
}

/** Deterministic, dependency-aware next-best-action + progress recalculation. */
export function recalcProgress(
  tasks: { id: string; status: string; dependencies: string | null; priority: number }[]
): { progress: number; nextBestTaskId: string | null } {
  if (!tasks.length) return { progress: 0, nextBestTaskId: null };
  const completed = tasks.filter((t) => t.status === "completed").length;
  const progress = Math.round((completed / tasks.length) * 100);

  const doneIds = new Set(tasks.filter((t) => t.status === "completed").map((t) => t.id));
  let next: { id: string; priority: number } | null = null;
  for (const t of [...tasks].sort((a, b) => a.priority - b.priority)) {
    if (t.status === "completed") continue;
    const deps: string[] = t.dependencies ? JSON.parse(t.dependencies) : [];
    const blocked = deps.some((d) => !doneIds.has(d));
    if (blocked) continue;
    // First unblocked, non-completed task in priority order is the next best action.
    next = { id: t.id, priority: t.priority };
    break;
  }
  return { progress, nextBestTaskId: next?.id ?? null };
}
