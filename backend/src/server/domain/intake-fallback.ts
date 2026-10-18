import { SCENARIO_LABELS, type AssetCategory, type CaseType, type ClassifiedSituation } from "@shared/types";

// The person talking about their own future death ("when I'm gone") is legacy
// planning, not a death in the family — strip it before looking for death words.
const OWN_DEATH = /\b(when|after|once|if) i(['’]| a)m (gone|no more)\b|\b(when|after|once|if) i (die|pass away)\b|\bafter my (death|demise)\b/;
const DEATH = /\b(died|passed away|death|deceased|no more|demise|funeral)\b/;
// "will" only as a document, never the auxiliary verb ("will I get…").
const WILL = /\b(my|a) will\b|\b(write|make|draft|prepare|update)\w* (a |my )?will\b/;
const PREPARE_FAMILY = /\b(?:prepare|plan|organise|organize).{0,45}(?:my|our) family\b|\b(?:end.of.life|put my.{0,30}in order)\b/;
const LEGACY = /\b(estate plan\w*|legacy plan\w*|beneficiar\w*|inherit plan|my family (can|could|should|will|would) (find|know)|family (to|can) find)\b/;
const SELF = /\b(i have|i own|i hold|i invested|i bought|i opened|my own|my (assets|investments|accounts|money|savings|policies|funds|shares))\b/;
const THIRD_PARTY =
  /\b(my|our) (mother|father|mom|mum|dad|husband|wife|spouse|son|daughter|parents?|brother|sister|grand\w*|uncle|aunt|\w+-in-law)\b|\bbelonging to\b|\b(his|her|their)\b/;

const DOCS_QUESTION = "Which documents do you already have (statements, policy papers, death certificate)?";

function followUps(caseType: CaseType, holderLiving: boolean | null): string[] {
  if (holderLiving === null) return ["Is the asset holder living or deceased?", DOCS_QUESTION];
  if (caseType === "estate_planning")
    return [
      "Which kinds of holdings do you have (bank deposits, mutual funds, insurance)?",
      "Have you already named nominees on any of them?",
    ];
  if (holderLiving === false)
    return ["What was your relationship to them?", DOCS_QUESTION];
  return [
    "Which institutions do you remember, even roughly (bank, fund house, insurer)?",
    "Which documents do you have (old statements, policy papers, emails)?",
  ];
}

/**
 * Rule-based classification used when the model is unavailable (aiDegraded).
 * Covers the one-pager's three journeys — discover own assets, plan a legacy,
 * claim after a death — plus the other case types on obvious keywords.
 */
export function fallbackClassification(message: string): ClassifiedSituation {
  const m = message.toLowerCase();
  const ownDeath = OWN_DEATH.test(m);
  const deceased = DEATH.test(m.replace(new RegExp(OWN_DEATH, "g"), " "));
  const rejected = /\b(reject\w*|denied|not responded|no response|stall\w*|delay\w*)\b/.test(m);
  const legacy = ownDeath || WILL.test(m) || LEGACY.test(m) || PREPARE_FAMILY.test(m);
  const nominee = /\b(nominee|legal heir|succession|executor)\b/.test(m);
  const nri = /\b(nri|abroad|foreign|usa|uk|dubai|singapore|cross.border)\b/.test(m);
  const caregiver = /\b(elderly|caregiver|helping my (mother|father|parent)|senior)\b/.test(m);
  const self = SELF.test(m) && !THIRD_PARTY.test(m);
  const cats: AssetCategory[] = [];
  if (/\b(bank|fd|deposit|account)\b/.test(m)) cats.push("bank_deposit");
  if (/\b(lic|insurance|policy|premium)\b/.test(m)) cats.push("insurance");
  if (/\b(mutual funds?|folio|sip|investment)\b/.test(m)) cats.push("mutual_fund");
  if (/\b(share|stock|dividend|demat)\b/.test(m)) cats.push("shares");
  let caseType: CaseType = "general";
  if (rejected) caseType = "rejected_claim";
  else if (deceased) caseType = nominee ? "nominee_heir" : "family_death";
  else if (legacy) caseType = "estate_planning";
  else if (nri) caseType = "nri_cross_border";
  else if (caregiver) caseType = "caregiver";
  else if (cats.length || m.length > 25) caseType = "living_individual";
  const holderLiving = deceased
    ? false
    : caseType === "estate_planning" || caseType === "caregiver" || (caseType === "living_individual" && self)
      ? true
      : null;
  return {
    caseType,
    scenarioLabel: SCENARIO_LABELS[caseType],
    confidence: 0.55,
    holderLiving,
    relationship: null,
    assetHolderName: null,
    assetCategories: cats.length ? cats : ["unknown"],
    institutions: [],
    jurisdiction: "India",
    urgency: deceased || rejected ? "high" : "medium",
    confirmedFacts: [message.slice(0, 200)],
    assumptions: [],
    followUpQuestions: followUps(caseType, holderLiving).slice(0, 1),
    summary: message.slice(0, 240),
  };
}
