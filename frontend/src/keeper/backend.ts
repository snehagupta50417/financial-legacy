import { api, ApiError } from "@/lib/client";
import type { CaseWorkspace } from "@shared/types";
import type { ClaimView } from "@shared/contracts";
import { emptyCase, freshState, reduce, type Action } from "./engine";
import type { AppState, Case, Category, Claim, Message } from "./types";
import { iso, uid } from "./util";
import { relKey } from "./claims";
import { JOURNEY_LABEL } from "./catalog";
import { nextWork, plainCopy } from "./presentation";

type Ui = Pick<Case, "facts" | "threads" | "activeThread" | "contacts" | "family" | "plan" | "uiTasks">;
const serverCategory = { bank: "bank_deposit", mutual_fund: "mutual_fund", insurance: "insurance", retirement: "provident_fund", other: "other" };
const category = (c: string): Category => /bank/.test(c) ? "bank" : c === "mutual_fund" ? "mutual_fund" : c === "insurance" ? "insurance" : c === "provident_fund" ? "retirement" : "other";
const message = (role: Message["role"], text: string, extra: Partial<Message> = {}): Message => ({ id: uid(), role, text, ts: iso(), ...extra });
const active = (c: Case) => c.threads.find(t => t.id === c.activeThread) || c.threads[0];
const uiOf = (c: Case): Ui => ({ uiTasks: c.uiTasks || [], facts: c.facts, threads: c.threads, activeThread: c.activeThread, contacts: c.contacts, family: c.family, plan: c.plan });
export async function saveUi(c: Case) { if (c.backendId) await api.put("/api/cases/" + c.backendId + "/keeper", uiOf(c)); }

export function projectWorkspace(ws: CaseWorkspace, name: string, previous?: Case, stored?: Ui | null, claimViews: ClaimView[] = [], texts: Record<string, string> = {}): Case {
  const w = ws.case;
  const self = ["living_individual", "estate_planning"].includes(w.caseType);
  // The delayed-claim demo stores "Claimant (policyholder: Deceased)"; the estate is the policyholder's.
  const deceased = (w.assetHolderName || "").replace(/^.*\(policyholder:\s*(.+)\)$/, "$1");
  const c = emptyCase(w.id, (self ? "My financial record" : "Estate of " + (deceased || "your family member")) + (w.isDemo ? " (demo)" : ""), self ? "self" : "estate", w.assetHolderName || (self ? name : "your family member"));
  if (w.isDemo) { c.demo = true; c.demoKey = w.demoKey ?? undefined; }
  const ui = stored || (previous ? uiOf(previous) : null);
  if (ui) Object.assign(c, ui);
  c.backendId = w.id; c.gate = ws.gate; c.proofs = ws.proofs;
  c.focus = previous?.focus || { type: "know" };
  const fact = (key: string, value: string | null) => { if (value) c.facts[key] = { key, value, state: "confirmed", source: "You said", date: w.updatedAt }; };
  const journey = c.threads.find(t => t.id === c.activeThread)?.journey;
  fact("goal", journey ? JOURNEY_LABEL[journey] : self ? w.caseType === "estate_planning" ? "Prepare for my family" : "Find my assets" : "Get help after a death");
  fact("name", w.assetHolderName); fact("relation", w.relationship);
  if (ws.assets.length) fact("known", ws.assets.map(a => a.institution).join(", "));
  if (ws.documents.length) c.facts.docs = { key: "docs", value: ws.documents.length + " documents added", state: "document_supported", source: "Document", date: w.updatedAt };
  if (ws.assets.length && ws.assets.every(a => a.nomineeStatus === "recorded")) fact("nomination", "Recorded for all");
  c.assets = ws.assets.filter(a => a.discoveryStatus !== "dismissed" && a.duplicateState !== "merged").map(a => ({
    id: a.id, institution: a.institution, category: category(a.category), ref: a.maskedRef || (a.last4 ? "••••" + a.last4 : null), owner: a.holderName || c.subject,
    evidence: a.evidenceStatus as Case["assets"][number]["evidence"], confirmed: a.discoveryStatus === "confirmed", amount: a.amount ? { value: Number(a.amount.amount), type: a.amount.label, asOf: a.amount.asOfDate || "Date unknown" } : null,
    nomination: a.nomineeStatus as Case["assets"][number]["nomination"], docIds: a.sourceDocumentId ? [a.sourceDocumentId] : [], lastChecked: null,
    next: a.masked ? "Establish authority to see this holding’s details" : a.discoveryStatus !== "confirmed" ? "Confirm this holding" : a.sourceDocumentId ? "Review its source document" : "Add a statement or policy",
    ...(a.duplicateState === "candidate" && a.duplicateOfId ? { duplicateOf: a.duplicateOfId } : {}),
    history: ws.events.filter(e => e.description.includes(a.institution)).map(e => ({ at: e.createdAt, text: e.description })),
  }));
  c.docs = ws.documents.map(d => ({ id: d.id, name: d.fileName, kind: d.category, state: d.extractionStatus === "extracted" ? "ready" : d.extractionStatus === "failed" ? "unreadable" : "processing", sample: true,
    text: texts[d.id] || d.fields.map(f => f.sourceExcerpt).filter(Boolean).join("\n\n") || d.extractionNote || "No readable text.",
    fields: d.fields.map(f => ({ id: f.id, label: f.label, value: f.value, excerpt: f.sourceExcerpt, reviewed: ["accepted", "corrected", "rejected"].includes(f.state), corrected: f.state === "corrected" })),
    assetId: c.assets.find(a => a.docIds.includes(d.id))?.id, addedAt: d.createdAt,
  }));
  if (!c.plan.length) c.plan = [...new Map(ws.tasks.filter(t => t.officialUrl).map(t => [t.officialUrl!, { id: t.id, label: plainCopy(t.officialName || t.title), type: "guided" as const, state: ws.gate.discoveryUnlocked ? "ready" as const : "needs_info" as const, note: plainCopy(t.instructions), url: t.officialUrl! }])).values()];
  c.tasks = ws.tasks.map(t => ({ id: t.id, title: plainCopy(t.title).replace("Review AI-extracted asset clues and confirm which are real", "Review document clues"), why: /confirmation converts.*verified record/.test(t.rationale || "") ? "Review the source and confirm ownership. This does not verify the holding with an institution." : plainCopy(t.rationale || t.instructions), milestone: /claim|submit/.test(t.title.toLowerCase()) ? "claims" : /review|confirm/.test(t.title.toLowerCase()) ? "review" : "gather", state: t.status === "completed" ? "done" : "open", ...(t.status === "needs_expert" ? { blocker: "Needs expert review" } : {}) }));
  c.tasks.push(...(c.uiTasks || []));
  c.activity = ws.events.filter(e => e.eventType !== "keeper_ui").map(e => ({ id: e.id, at: e.createdAt, kind: e.eventType === "claim" ? "prepared" : e.actor === "user" ? "confirmed" : "prepared", text: e.description }));
  c.claims = claimViews.map(v => {
    const old = previous?.claims.find(x => x.id === v.id);
    const pack = v.pack;
    const approval: Claim["approval"] = v.approval && pack ? { id: v.approval.id, hash: v.approval.contentHash, recipient: pack.recipient, channel: pack.whereToSubmit, includes: pack.items.filter(i => i.state !== "missing").map(i => i.label), declarations: pack.declarations.filter(d => d.accepted).map(d => d.text), state: v.submittedAt ? "used" : "approved" } : old?.approval?.state === "requested" && old.approval.hash === pack?.contentHash ? old.approval : old?.approval ? { ...old.approval, state: "invalidated" } : null;
    return { id: v.id, assetId: v.assetId, backend: v, claimant: { name: ws.claimants[0]?.fullName || name, relation: ws.claimants[0]?.relationship || w.relationship || "", verification: v.entitled ? "sample_reviewed" : "awaiting_review" }, situation: { nominee: v.situation.nominee, jointHolder: v.situation.jointHolder, amountBand: null }, have: Object.fromEntries((pack?.items || []).map(i => [i.id, i.state !== "missing"])), declarations: pack?.declarations.filter(d => d.accepted).map(d => d.id) || [], approval, prepared: !!pack?.ready, submitted: v.submittedAt ? { at: v.submittedAt, ref: v.receiptRef || "No receipt recorded", method: v.submissionChannel || "Unknown" } : null, acknowledged: v.status === "institution_review" ? { at: v.events.at(-1)?.createdAt || iso(), note: v.events.at(-1)?.note || "" } : null, outcome: v.outcome ? { kind: v.outcome as "settled" | "transferred" | "rejected" | "withdrawn" | "unresolved_dispute", at: v.outcomeDate || iso(), note: v.outcomeNote || "" } : null, lastConfirmed: v.events.at(-1)?.createdAt || null, nextFollowUp: v.dueDate };
  });
  return c;
}

export async function loadCase(id: string, name: string, previous?: Case): Promise<Case> {
  const [ws, saved] = await Promise.all([api.get<CaseWorkspace>("/api/cases/" + id), api.get<{ ui: Ui | null }>("/api/cases/" + id + "/keeper")]);
  const claims = await Promise.all(ws.claims.map(c => api.get<{ claim: ClaimView }>("/api/claims/" + c.id).then(r => r.claim)));
  const textPairs = await Promise.all(ws.documents.map(d => api.get<{ document: { text: string | null } }>("/api/documents/" + d.id).then(r => [d.id, r.document.text || ""] as const)));
  const c = projectWorkspace(ws, name, previous, previous ? null : saved.ui, claims, Object.fromEntries(textPairs));
  if (!previous && !saved.ui) {
    const history = await api.get<{ messages: { id: string; role: string; text: string; at: string }[] }>("/api/cases/" + id + "/messages");
    active(c).messages = history.messages.map(m => ({ id: m.id, role: m.role === "user" ? "user" : "keeper", text: m.text, ts: m.at }));
    if (!active(c).messages.length) active(c).messages.push(message("keeper", "I’ve opened this saved case. What would you like to work on?", { card: { type: "know" } }));
  }
  return c;
}

export async function hydrateBackend(s: AppState): Promise<AppState> {
  const rows = await api.get<{ cases: { id: string }[] }>("/api/cases");
  if (!rows.cases.length) return s;
  const cases = await Promise.all(rows.cases.map(r => loadCase(r.id, s.session?.name || "You")));
  const keepDraft = s.cases[s.activeCase] && !s.cases[s.activeCase].backendId && (active(s.cases[s.activeCase]).messages.some(m => m.role === "user") || !!s.drafts?.[s.cases[s.activeCase].activeThread] || Object.values(s.attachments || {}).some(a => a.threadId === s.cases[s.activeCase].activeThread));
  return { ...s, order: [...cases.map(c => c.id), ...(keepDraft ? [s.activeCase] : [])], cases: { ...Object.fromEntries(cases.map(c => [c.id, c])), ...(keepDraft ? { [s.activeCase]: s.cases[s.activeCase] } : {}) }, activeCase: keepDraft ? s.activeCase : cases.some(c => c.id === s.activeCase) ? s.activeCase : cases[0].id };
}

export async function backendAction(prev: AppState, action: Action): Promise<AppState> {
  let s = structuredClone(prev);
  let c = s.cases[s.activeCase];
  const name = s.session?.name || "You";
  if (action.t === "doc.upload" && action.threadId && !c.threads.some(t => t.id === action.threadId)) throw new Error("Open the original conversation to upload this document.");
  const refresh = async () => { c = await loadCase(c.backendId!, name, c); s.cases[c.id] = c; };
  const ensure = async () => {
    if (c.backendId) return;
    const text = c.kind === "estate" ? "My father passed away. Help me organise his financial assets." : "I want to organise my own financial assets.";
    const r = await api.post<{ caseId: string }>("/api/intake", { message: text });
    const oldId = c.id; c.backendId = r.caseId;
    c = await loadCase(r.caseId, name, c);
    delete s.cases[oldId]; s.cases[c.id] = c; s.order = s.order.map(i => i === oldId ? c.id : i); s.activeCase = c.id;
  };
  const addReply = (text: string, extra: Partial<Message> = {}) => active(c).messages.push(message("keeper", text, extra));
  if (action.t === "switchCase") { if (s.cases[action.id]) { s.activeCase = action.id; c = s.cases[action.id]; if (c.backendId) await refresh(); } return s; }
  if (action.t === "reset") { const draft = freshState(name, "signin").cases.self; draft.id = uid(); return { ...s, activeCase: draft.id, cases: { ...s.cases, [draft.id]: draft }, order: [draft.id, ...s.order] }; }
  if (action.t === "send" || action.t === "choose") {
    if (c.backendId) await refresh();
    const choice = action.t === "choose" ? action.id : "";
    if (choice === "m:sample") return reduce(s, action);
    if (choice.startsWith("a:startClaim:")) return backendAction(s, { t: "claim.start", assetId: choice.slice("a:startClaim:".length) });
    if (choice.startsWith("a:linkStatement:") || choice.startsWith("a:sampleDoc:")) { addReply("Add a document using the paperclip."); return s; }
    if (choice === "m:resume" && !active(c).pending) {
      const work = nextWork(c);
      if (work) { addReply(work.text, { card: work.card }); c.focus = work.card; await saveUi(c); return s; }
    }
    const text = action.t === "send" ? action.text : action.label;
    const isQuestion = action.t === "send" && !!c.backendId && /^(what|how|can|could|does|is there|where can|why does)\b/i.test(text) && !/^(why do you need|why\?)/i.test(text);
    if (isQuestion) {
      active(c).messages.push(message("user", text, { voice: action.t === "send" ? action.voice : false }));
      const r = await api.post<{ answer: string; sources: { n: number; title: string; url: string | null; excerpt: string }[] }>("/api/ai/ask", { caseId: c.backendId, question: text });
      addReply(plainCopy(r.answer) + (r.sources.length ? "\n\nSources\n" + r.sources.map(x => "[" + x.n + "] " + x.title + (x.url ? "\n" + x.url : "") + "\n" + x.excerpt).join("\n\n") : ""), { choices: active(c).pending ? [{ id: "m:resume", label: "Continue" }] : undefined });
      await saveUi(c); return s;
    }
    const priorCase = c;
    s = reduce(s, action); c = s.cases[s.activeCase];
    // Only server APIs can create business records; the interviewer supplies the next question.
    const volunteered = c.assets.filter(a => !priorCase.assets.some(old => old.id === a.id));
    const canonicalTaskIds = new Set(priorCase.tasks.map(t => t.id));
    const followUps = c.tasks.filter(t => !canonicalTaskIds.has(t.id) && !(c.uiTasks || []).some(old => old.title === t.title));
    c.uiTasks = [...(c.uiTasks || []), ...followUps.map(t => ({ ...t, id: "followup:" + t.id }))];
    if (!c.backendId) {
      const opening = action.t === "send" ? action.text : choice === "j:claim" ? "A family member died. I need help with known assets and claims." : choice === "j:prepare" ? "I want to prepare my financial record for my family." : choice === "j:discover" ? "I want to find my own financial assets." : text;
      const r = await api.post<{ caseId: string }>("/api/intake", { message: opening });
      const old = c.id; c.backendId = r.caseId; c = await loadCase(r.caseId, name, c);
      delete s.cases[old]; s.cases[c.id] = c; s.order = s.order.map(i => i === old ? c.id : i); s.activeCase = c.id;
    } else await refresh();
    if (c.gate?.discoveryUnlocked) {
      for (const a of volunteered) if (!c.assets.some(old => old.institution.toLowerCase() === a.institution.toLowerCase() && old.category === a.category)) await api.post("/api/assets", { caseId: c.backendId, institution: a.institution, category: serverCategory[a.category], maskedRef: a.ref });
      if (volunteered.length) await refresh();
    }
    await saveUi(c); return s;
  }
  if (["focus", "newThread", "switchThread", "agent.turn", "fact.edit", "contact.add", "contact.toggle", "family.set", "plan.record"].includes(action.t)) {
    s = reduce(s, action); c = s.cases[s.activeCase];
    if (!["focus", "switchThread", "newThread"].includes(action.t)) await ensure();
    if (action.t === "fact.edit" && ["name", "relation"].includes(action.key)) await api.patch("/api/cases/" + c.backendId, { [action.key === "name" ? "assetHolderName" : "relationship"]: action.value });
    await saveUi(c); return s;
  }
  await ensure();
  switch (action.t) {
    case "asset.add": await api.post("/api/assets", { caseId: c.backendId, institution: action.institution, category: serverCategory[action.category], maskedRef: action.ref }); break;
    case "asset.edit": await api.patch("/api/assets/" + action.id, { institution: action.patch.institution, holderName: action.patch.owner, nomineeStatus: action.patch.nomination, maskedRef: action.patch.ref }); break;
    case "asset.confirm": await api.patch("/api/assets/" + action.id, { action: "confirm" }); break;
    case "asset.remove": await api.patch("/api/assets/" + action.id, { action: "dismiss" }); break;
    case "asset.dup": await api.patch("/api/assets/" + action.id, { action: action.merge ? "same_holding" : "different_holding" }); break;
    case "doc.upload": {
      const form = new FormData(); form.set("caseId", c.backendId!); form.set("file", action.file);
      try { const r = await api.upload<{ document: { id: string } }>("/api/documents", form); c.focus = { type: "doc", id: r.document.id }; } catch (error) { if (error instanceof ApiError && error.status === 403 && !c.gate?.discoveryUnlocked) throw new Error("Identity checks are not connected. Your document is kept here for retry."); throw error; } break;
    }
    case "doc.sample": throw new Error("Example documents are available in the example workspace.");
    case "doc.ready": return s;
    case "doc.field": await api.put("/api/documents/" + action.docId + "/review", { decisions: [{ fieldId: action.fieldId, decision: action.value !== undefined ? "corrected" : action.reviewed === false ? "rejected" : "accepted", value: action.value }] }); break;
    case "task.toggle": if (action.id.startsWith("followup:")) { const t = c.uiTasks?.find(t => t.id === action.id); if (t) t.state = t.state === "done" ? "open" : "done"; await saveUi(c); c.tasks = c.tasks.map(old => old.id === t?.id ? t : old); return s; } await api.patch("/api/tasks/" + action.id, { status: c.tasks.find(t => t.id === action.id)?.state === "done" ? "ready" : "completed" }); break;
    case "claim.start": { const r = await api.post<{ claim: ClaimView }>("/api/claims", { caseId: c.backendId, assetId: action.assetId }); c.focus = { type: "claim", id: r.claim.id }; break; }
    case "claim.edit": {
      const e = action.edit;
      await api.patch("/api/claims/" + action.id, { situation: { ...e.situation, ...(e.claimant?.relation ? { relationship: relKey(e.claimant.relation) } : {}) }, checklist: e.have ? Object.fromEntries(Object.entries(e.have).map(([id, yes]) => [id, { state: yes ? "have" : "missing" }])) : undefined, declarations: e.declarations }); break;
    }
    case "claim.request": {
      const cl = c.claims.find(x => x.id === action.id); const p = cl?.backend?.pack;
      if (!cl || !p?.ready) throw new Error("Review the required evidence and declarations first.");
      cl.approval = { id: uid(), hash: p.contentHash, recipient: p.recipient, channel: p.whereToSubmit, includes: p.items.filter(i => i.state !== "missing").map(i => i.label), declarations: p.declarations.map(d => d.text), state: "requested" }; return s;
    }
    case "claim.approve": { const cl = c.claims.find(x => x.id === action.id); if (!cl?.approval || cl.approval.state !== "requested") throw new Error("Review the exact package first."); await api.post("/api/claims/" + action.id + "/approve", { contentHash: cl.approval.hash }); break; }
    case "claim.cancel": { const cl = c.claims.find(x => x.id === action.id); if (cl?.approval?.state === "requested") cl.approval = null; return s; }
    case "claim.submit": await api.post("/api/claims/" + action.id + "/submission", { channel: /post/i.test(action.method) ? "post" : /site/i.test(action.method) ? "institution_website" : "branch", date: action.date || iso().slice(0, 10), receiptRef: action.receiptRef || undefined }); break;
    case "claim.ack": await api.post("/api/claims/" + action.id + "/update", { to: "institution_review", note: action.note }); break;
    case "claim.outcome": if (action.kind === "withdrawn") throw new Error("Withdrawal is not supported yet."); else await api.post("/api/claims/" + action.id + "/update", { to: action.kind, note: action.note, outcomeAmount: action.amount || undefined, outcomeDate: action.date || undefined, outcomeDocumentId: action.documentId || undefined }); break;
    default: return s;
  }
  await refresh(); await saveUi(c); return s;
}
