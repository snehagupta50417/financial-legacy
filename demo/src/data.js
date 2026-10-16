// All demo data is hardcoded. Nothing here is real or connected to any institution.

export const CASES = {
  'FLX-8842': {
    id: 'FLX-8842',
    title: 'Rajesh Kumar Sharma',
    subtitle: 'Family after a death · Pune',
    journey: 2,
    person: { name: 'Rajesh Kumar Sharma', life: '1960–2024', city: 'Pune', pan: 'ABCPS••••K', status: 'Deceased' },
    heirs: [
      { name: 'Sunita Sharma', role: 'Wife · Nominee' },
      { name: 'Rohit Sharma', role: 'Son · Class-1 heir' },
    ],
    baseReadiness: 62,
    docs: ['Death Certificate', 'HDFC Bank Statement', 'LIC Policy 974512388', 'CAMS MF Statement'],
    assets: [
      { inst: 'HDFC Bank', type: 'Savings A/C …0452', value: 184300, status: 'Verified' },
      { inst: 'HDFC Bank', type: 'Fixed Deposit (inferred)', value: 420000, status: 'Hidden — verify', hidden: true },
      { inst: 'LIC', type: 'Policy 974512388', value: 500000, status: 'Ready to file' },
      { inst: 'CAMS', type: 'Mutual funds (4 folios)', value: 1142906, status: 'Needs heir KYC' },
      { inst: 'India Post', type: 'Post Office MIS', value: 50000, status: 'Locator search' },
    ],
    missing: [
      { id: 'fd', doc: 'HDFC FD receipt', instrument: 'HDFC branch FD advice / Form 15G copy', inst: 'HDFC Bank' },
      { id: 'lhc', doc: 'Legal Heir Certificate', instrument: 'Tehsildar, Haveli (Pune)', inst: 'Revenue Dept.' },
    ],
    actions: [
      { text: 'File LIC Form 3783', inst: 'LIC', when: 'today', ref: 'lic' },
      { text: 'Legal Heir Certificate', inst: 'Tehsildar', when: '12 days', ref: 'lhc' },
      { text: 'Request FD receipt', inst: 'HDFC Bank', when: '3 days', ref: 'fd' },
    ],
    claims: [
      { id: 'CLM-LIC-3783-0921', inst: 'LIC', docs: ['Death Certificate', 'LIC Policy 974512388', 'Form 3783'] },
      { id: 'CLM-HDFC-TX-1144', inst: 'HDFC Bank', docs: ['Death Certificate', 'HDFC Bank Statement'] },
    ],
  },
  'FLX-9117': {
    id: 'FLX-9117',
    title: 'Arjun Mehta',
    subtitle: 'Living individual · Bengaluru',
    journey: 1,
    person: { name: 'Arjun Mehta', life: 'Age 38', city: 'Bengaluru', pan: 'BXMPM••••Q', status: 'Living' },
    heirs: [{ name: 'Kavya Mehta', role: 'Spouse · Nominee (to update)' }],
    baseReadiness: 45,
    docs: ['LIC premium receipt (2014)', 'SBI passbook scan'],
    assets: [
      { inst: 'SBI', type: 'Dormant FD · Pune branch (UDGAM match)', value: 120000, status: 'Possible match' },
      { inst: 'LIC', type: 'Endowment — lapsed, paid-up', value: 85000, status: 'Revival possible' },
    ],
    missing: [{ id: 'kyc', doc: 'Fresh KYC for SBI', instrument: 'SBI branch re-KYC form', inst: 'SBI' }],
    actions: [
      { text: 'Claim dormant FD via UDGAM', inst: 'SBI · RBI UDGAM', when: '5 days', ref: 'udgam' },
      { text: 'Send LIC revival letter', inst: 'LIC', when: 'this week', ref: 'revival' },
    ],
    claims: [{ id: 'UDG-SBI-55120', inst: 'SBI', docs: ['SBI passbook scan', 'PAN', 'Aadhaar'] }],
  },
  'FLX-7301': {
    id: 'FLX-7301',
    title: 'Meera Iyer — LIC claim',
    subtitle: 'Rejected claim · Chennai',
    journey: 5,
    person: { name: 'S. Iyer (policyholder)', life: '1955–2024', city: 'Chennai', pan: 'AAKPI••••D', status: 'Deceased' },
    heirs: [{ name: 'Meera Iyer', role: 'Daughter · Claimant' }],
    baseReadiness: 58,
    docs: ['LIC rejection letter'],
    assets: [{ inst: 'LIC', type: 'Policy 881204557 — claim rejected', value: 350000, status: 'Rejected · NDC-04' }],
    missing: [{ id: 'lhc7301', doc: 'Legal Heir Certificate', instrument: 'Tahsildar, Mylapore', inst: 'Revenue Dept.' }],
    actions: [{ text: 'Re-submit claim with heirship proof', inst: 'LIC Chennai DO', when: '61 days left', ref: 'resubmit' }],
    claims: [{ id: 'CLM-LIC-7301-R1', inst: 'LIC', docs: ['LIC rejection letter', 'Death Certificate'] }],
  },
  'FLX-6620': {
    id: 'FLX-6620',
    title: 'Rohan for Mahesh Rao',
    subtitle: 'Elderly relative · Hyderabad',
    journey: 6,
    person: { name: 'Mahesh Rao', life: 'Age 74', city: 'Hyderabad', pan: 'AFRPR••••M', status: 'Living · consenting' },
    heirs: [{ name: 'Rohan Rao', role: 'Son · Authorised helper' }],
    baseReadiness: 72,
    docs: ['Signed authority letter'],
    assets: [
      { inst: 'HDFC Bank', type: 'Savings A/C …7781', value: 246200, status: 'View access' },
      { inst: 'LIC', type: 'Jeevan Akshay annuity', value: 200000, status: 'View access' },
    ],
    missing: [{ id: 'poa', doc: 'Registered POA (for transfers)', instrument: 'Sub-Registrar office', inst: 'Registration Dept.' }],
    actions: [{ text: 'Update nominee on HDFC savings', inst: 'HDFC Bank', when: '7 days', ref: 'nominee' }],
    claims: [],
  },
  'FLX-5188': {
    id: 'FLX-5188',
    title: 'Priya Nair & brother',
    subtitle: 'NRI heirs · London / Dubai',
    journey: 7,
    person: { name: 'K. Nair (late father)', life: '1950–2023', city: 'Kochi', pan: 'AGNPN••••R', status: 'Deceased' },
    heirs: [
      { name: 'Priya Nair', role: 'Daughter · London, UK' },
      { name: 'Arun Nair', role: 'Son · Dubai, UAE' },
    ],
    baseReadiness: 68,
    docs: ['UK consulate affidavit (draft)'],
    assets: [
      { inst: 'SBI', type: 'NRO savings (to be opened)', value: 340000, status: 'Transmission' },
      { inst: 'ICICI Bank', type: 'Fixed Deposit', value: 400000, status: 'Transmission' },
      { inst: 'Axis MF', type: 'Mutual funds', value: 160000, status: 'Needs heir KYC' },
    ],
    missing: [{ id: 'apostille', doc: 'Apostilled affidavit (UK)', instrument: 'FCDO Legalisation Office', inst: 'UK FCDO' }],
    actions: [{ text: 'Apostille UK affidavit', inst: 'FCDO', when: '10 days', ref: 'apostille' }],
    claims: [{ id: 'CLM-ICICI-NRI-202', inst: 'ICICI Bank', docs: ['Death Certificate', 'UK consulate affidavit (draft)'] }],
  },
}

export const CASE_IDS = Object.keys(CASES)

export const JOURNEYS = [
  {
    id: 1, name: 'Living Individual', icon: 'UserSearch', line: 'Forgotten accounts, old insurance, unknown footprint',
    caseId: 'FLX-9117', badge: 'Discovery',
    scenario: 'Arjun, 38, has a feeling he left money behind — an old SBI account from his Pune days, a policy his father bought him in 2014.',
    samples: ['LIC_premium_receipt_2014.pdf', 'SBI_passbook_scan.jpg'],
    steps: ['Plan', 'Extract Entities', 'Cross-Document Reasoning', 'Verify & Score', 'Build Action Plan'],
    duration: 5000,
    lines: [
      'PLAN → scope: living person, self-initiated, 2 documents, discovery mode',
      'EXTRACT → LIC policy 55120887 · premium ₹6,200/yr · last receipt Mar-2014',
      'EXTRACT → SBI A/C …3391 · Pune Camp branch · last txn 2016',
      'REASON → Premium receipt 2014 → policy likely lapsed PAID-UP, not dead → check UDGAM for dormant deposits (confidence 0.81)',
      'VERIFY → UDGAM lookup: 1 possible match — SBI Pune, dormant FD ₹1,20,000',
      'PLAN → 2 actions · revival letter (LIC) · UDGAM claim (SBI)',
    ],
  },
  {
    id: 2, name: 'Family After a Death', icon: 'HeartHandshake', line: 'Someone died. Assets are scattered.',
    caseId: 'FLX-8842', badge: 'Live demo', star: true,
    scenario: "Rohit's father passed away last month. Four documents. No idea what he left behind.",
    samples: ['Death_Certificate_Rajesh_Sharma.pdf', 'HDFC_Statement_FY24.pdf', 'LIC_Policy_974512388.pdf', 'CAMS_CAS_Mar2024.pdf'],
    steps: ['Plan', 'Extract Entities', 'Cross-Document Reasoning', 'Verify & Score', 'Build Action Plan'],
    duration: 8000,
    lines: [
      'PLAN → case FLX-8842 · deceased: Rajesh Kumar Sharma · 4 documents · 3 institutions referenced',
      'EXTRACT → Death Certificate: DoD 14-Aug-2024 · Reg. PMC/2024/18841 · Pune',
      'EXTRACT → HDFC A/C …0452 · balance ₹1,84,300 · nominee: Sunita Sharma',
      'EXTRACT → LIC 974512388 · sum assured ₹5,00,000 · nominee: Sunita Sharma',
      'EXTRACT → CAMS PAN-linked · 4 folios · value ₹11,42,906 · no nominee on 2 folios',
      'REASON → Recurring credit ₹2,800/month from A/C …0452 — pattern matches interest payout → INFER: Fixed Deposit ≈ ₹4,20,000 @ 8% p.a. (confidence 0.93)',
      'REASON → CAMS address matches Pune Camp post office → possible Post Office MIS ₹50,000 (confidence 0.71)',
      'VERIFY → name match across 4 docs 0.95 · nominee consistency 0.93 · folio-heir mapping 0.88',
      'PLAN → 4 institutions · 2 missing documents · LIC ready to file today',
    ],
    special: 5,
  },
  {
    id: 3, name: 'Nominee / Legal Heir', icon: 'Scale', line: 'Two paths, one checklist',
    caseId: 'FLX-8842', badge: 'Paths',
    scenario: 'Sunita is the nominee on the LIC policy. Two CAMS folios have no nominee — Rohit must go the legal-heir route.',
    samples: ['Death_Certificate_Rajesh_Sharma.pdf', 'Nomination_Form_LIC.pdf'],
    steps: ['Plan', 'Extract Entities', 'Cross-Document Reasoning', 'Verify & Score', 'Build Action Plan'],
    duration: 4500,
    lines: [
      'PLAN → classify each asset by claimant path',
      'EXTRACT → LIC 974512388 nominee: Sunita Sharma (wife)',
      'REASON → CAMS folios 2 & 4 have no nominee → Class-1 heirs under Hindu Succession Act',
      'VERIFY → claimant identity via CKYC (confidence 0.90)',
      'PLAN → nominee path (3 steps) + legal-heir path (7 steps)',
    ],
  },
  {
    id: 4, name: 'Will & Estate Planning', icon: 'ScrollText', line: 'Found a will, need a will, or fighting a will',
    caseId: 'FLX-8842', badge: '3 modes',
    scenario: 'A handwritten will was found in a cupboard. Is it valid? And what if one sibling disagrees?',
    samples: ['Will_scan_2019.pdf'],
    steps: ['Plan', 'Extract Entities', 'Cross-Document Reasoning', 'Verify & Score', 'Build Action Plan'],
    duration: 4500,
    lines: [
      'PLAN → will type: unregistered, handwritten, dated 12-Mar-2019',
      'EXTRACT → testator: Rajesh Kumar Sharma · executor: Rohit Sharma · 2 witnesses',
      'REASON → Pune (not a presidency town) → probate optional for Hindu will',
      'VERIFY → signatures on all pages ✓ · witness 2 address missing ✕',
      'PLAN → verification checklist + asset→successor map',
    ],
  },
  {
    id: 5, name: 'Rejected / Delayed Claim', icon: 'FileWarning', line: 'The institution said no. Now what?',
    caseId: 'FLX-7301', badge: 'Live demo', star: true,
    scenario: "Meera's LIC claim for her late father was rejected. The letter cites a code she doesn't understand.",
    samples: ['LIC_Rejection_Letter_NDC04.pdf'],
    steps: ['Plan', 'Extract Entities', 'Cross-Document Reasoning', 'Verify & Score', 'Build Action Plan'],
    duration: 4500,
    lines: [
      'PLAN → parse rejection letter · map reason code · compute deadlines',
      'EXTRACT → reason code NDC-04 · dated 16-Aug-2026 · DO Chennai',
      'REASON → NDC-04 = nominee deceased → legal heirship required, not a denial of benefit',
      'VERIFY → 90-day representation window · 61 days left',
      'PLAN → evidence checklist · re-submission letter · escalation ladder',
    ],
  },
  {
    id: 6, name: 'Helping an Elderly Relative', icon: 'HandHeart', line: 'Acting for a parent, with consent',
    caseId: 'FLX-6620', badge: 'Consent',
    scenario: 'Rohan helps his father Mahesh (74) keep track of his savings and annuity — only what Mahesh allows.',
    samples: ['Authority_Letter_Mahesh_Rao.pdf'],
    steps: ['Plan', 'Extract Entities', 'Cross-Document Reasoning', 'Verify & Score', 'Build Action Plan'],
    duration: 4000,
    lines: [
      'PLAN → helper mode · principal is living and must consent',
      'EXTRACT → authority letter signed 02-Oct-2026 · scope: HDFC savings, LIC policy',
      'REASON → no POA on file → view-only is the safe default',
      'VERIFY → signature match with bank specimen 0.89',
      'PLAN → consent gateway before any workspace access',
    ],
  },
  {
    id: 7, name: 'NRI / Cross-Border Family', icon: 'Globe', line: 'Heirs abroad, assets in India',
    caseId: 'FLX-5188', badge: 'Cross-border',
    scenario: 'Priya lives in London, her brother in Dubai. Their father left accounts in Kochi.',
    samples: ['Death_Certificate_K_Nair.pdf', 'UK_Affidavit_Draft.docx'],
    steps: ['Plan', 'Extract Entities', 'Cross-Document Reasoning', 'Verify & Score', 'Build Action Plan'],
    duration: 4500,
    lines: [
      'PLAN → heirs in 2 jurisdictions · assets in 1',
      'EXTRACT → heirs: Priya Nair (UK) · Arun Nair (UAE)',
      'REASON → UK docs need apostille · UAE docs need Arabic translation + MOFA attestation',
      'VERIFY → NRO route for inheritance · repatriation up to USD 1M/yr',
      'PLAN → per-country requirement tracker',
    ],
  },
]

export const RATES = { GBP: 107.4, AED: 22.7 } // ₹ per unit, hardcoded

export const now = () => {
  const d = new Date()
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export const SEED_AUDIT = [
  { caseId: 'FLX-8842', type: 'uploaded', text: 'Death Certificate uploaded by Rohit Sharma', ts: '09:12:04' },
  { caseId: 'FLX-8842', type: 'consent', text: 'Sunita Sharma consented to case processing', ts: '09:12:30' },
  { caseId: 'FLX-9117', type: 'uploaded', text: 'LIC premium receipt (2014) uploaded', ts: '09:40:11' },
  { caseId: 'FLX-7301', type: 'uploaded', text: 'LIC rejection letter uploaded', ts: '10:02:47' },
  { caseId: 'FLX-6620', type: 'consent', text: 'Consent request sent to Mahesh Rao', ts: '10:15:09' },
  { caseId: 'FLX-5188', type: 'extracted', text: 'UK consulate affidavit draft parsed', ts: '10:31:52' },
  { caseId: 'FLX-5188', type: 'letter', text: 'Transmission request drafted for ICICI Bank', ts: '10:33:18' },
]

export const SEED_CONSENTS = [
  { id: 'CNS-001', caseId: 'FLX-8842', who: 'Sunita Sharma', grantee: 'FinLegacy agent', scope: 'Read uploaded documents · draft filings', status: 'active', ts: '09:12:30' },
  { id: 'CNS-002', caseId: 'FLX-8842', who: 'Rohit Sharma', grantee: 'FinLegacy agent', scope: 'CKYC verification for claimant', status: 'active', ts: '09:13:02' },
  { id: 'CNS-003', caseId: 'FLX-9117', who: 'Arjun Mehta', grantee: 'FinLegacy agent', scope: 'UDGAM search with PAN', status: 'active', ts: '09:40:30' },
  { id: 'CNS-004', caseId: 'FLX-5188', who: 'Priya Nair', grantee: 'Arun Nair', scope: 'Share case brief', status: 'active', ts: '10:30:00' },
]
