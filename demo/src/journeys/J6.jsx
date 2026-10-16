import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, ShieldCheck, ShieldAlert, ShieldX, FileSignature, Eye, Download, ArrowLeftRight, UserCog, RefreshCw, KeyRound } from 'lucide-react'
import { useStore } from '../store'
import { Card, Chip, Modal, Tip } from '../components/ui'
import { RunBanner } from './J2'
import { cx, inr } from '../lib/util'
import { now } from '../data'

const ACCTS = [
  { id: 'hdfc', name: 'HDFC Savings …7781', value: 246200 },
  { id: 'lic', name: 'LIC Jeevan Akshay', value: 200000 },
]

export function decideConsent(store, decision) {
  const { set, log, toast } = store
  const basis = { approved: 'CNS-6620 · full (view + transfer)', limited: 'CNS-6620 · view-only · savings · no transfers', refused: 'none — refused' }[decision]
  set((s) => ({
    j6: { consent: decision },
    permLog: [{ ts: now(), action: `Mahesh Rao ${decision === 'limited' ? 'approved with limits' : decision}`, basis }, ...s.permLog],
    consents:
      decision === 'refused'
        ? s.consents
        : [
            { id: 'CNS-6620', caseId: 'FLX-6620', who: 'Mahesh Rao', grantee: 'Rohan Rao', scope: decision === 'limited' ? 'View-only · HDFC savings · no transfers' : 'View + transfers · HDFC savings, LIC policy', status: 'active', ts: now() },
            ...s.consents.filter((c) => c.id !== 'CNS-6620'),
          ],
  }))
  log('FLX-6620', 'consent', `Mahesh Rao ${decision === 'limited' ? 'approved with limits' : decision} Rohan's access request`)
  toast(decision === 'refused' ? 'miss' : 'ok', decision === 'refused' ? 'Access refused — workspace stays locked' : decision === 'limited' ? 'Approved with limits — view-only' : 'Access approved — workspace unlocked')
}

export default function J6({ j }) {
  const store = useStore()
  const { state, set, log, toast } = store
  const [confirm, setConfirm] = useState(false)
  const consent = state.j6.consent
  const open = consent === 'approved' || consent === 'limited'

  const act = (label, acct, transfer) => {
    const blocked = transfer && consent === 'limited'
    set((s) => ({
      permLog: [{ ts: now(), action: `${blocked ? 'BLOCKED · ' : ''}${label} · ${acct}`, basis: blocked ? 'Outside consent scope' : `CNS-6620 · ${consent === 'limited' ? 'view-only' : 'full'}` }, ...s.permLog],
    }))
    log(j.caseId, 'consent', `${blocked ? 'Blocked' : 'Allowed'}: ${label} on ${acct}`)
    toast(blocked ? 'lock' : 'ok', blocked ? 'Outside consent scope — action blocked & logged' : `${label} · ${acct} (logged)`)
  }

  const revoke = () => {
    setConfirm(false)
    set((s) => ({
      j6: { consent: 'revoked' },
      consents: s.consents.map((c) => (c.id === 'CNS-6620' ? { ...c, status: 'revoked' } : c)),
      permLog: [{ ts: now(), action: 'Consent revoked by Mahesh Rao', basis: 'CNS-6620 → revoked' }, ...s.permLog],
    }))
    log(j.caseId, 'consent', 'Consent CNS-6620 revoked — workspace re-locked')
    toast('warn', 'Consent revoked — workspace locked')
  }

  return (
    <div>
      <RunBanner j={j} />
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.div key="gate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
            <Gateway consent={consent} store={store} />
          </motion.div>
        ) : (
          <motion.div key="ws" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-5">
              <Card glow="ok">
                <div className="label mb-2 flex items-center gap-2"><FileSignature size={14} /> Authority proof</div>
                <div className="font-semibold text-white">Signed authority letter</div>
                <div className="text-sm text-slate-400">Mahesh Rao → Rohan Rao · 02-Oct-2026</div>
                <div className="mt-2 flex gap-2">
                  <Chip tone="ok">signature match 0.89</Chip>
                  <Chip tone="muted">no registered POA</Chip>
                </div>
              </Card>
              <Card>
                <div className="label mb-2">Permitted scope</div>
                <div className="flex flex-wrap gap-2">
                  {consent === 'limited'
                    ? ['view-only', 'savings', 'no transfers'].map((c) => <Chip key={c} tone="warn">{c}</Chip>)
                    : ['view', 'transfers', 'savings', 'LIC policy'].map((c) => <Chip key={c} tone="ok">{c}</Chip>)}
                </div>
                <div className="mt-3 text-xs text-slate-500">Basis: CNS-6620 · granted by Mahesh Rao</div>
              </Card>
              <Card className="flex flex-col justify-between">
                <div className="label mb-2">Control</div>
                <button onClick={() => setConfirm(true)} className="btn-miss"><ShieldX size={16} /> Revoke consent</button>
              </Card>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-5">
              <Card>
                <div className="label mb-3">Accounts</div>
                {ACCTS.map((a) => {
                  const outOfScope = consent === 'limited' && a.id === 'lic'
                  return (
                    <div key={a.id} className={cx('mb-3 rounded-xl border p-4', outOfScope ? 'border-white/[0.06] opacity-60' : 'border-white/10 bg-white/[0.02]')}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{a.name}</span>
                        <span className="num font-display text-lg font-bold text-white">{outOfScope ? '••••••' : inr(a.value)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ActBtn icon={<Eye size={14} />} label="View statement" locked={outOfScope} onClick={() => act('View statement', a.name, outOfScope)} />
                        <ActBtn icon={<Download size={14} />} label="Download" locked={outOfScope} onClick={() => act('Download statement', a.name, outOfScope)} />
                        <ActBtn icon={<ArrowLeftRight size={14} />} label="Transfer funds" locked={consent === 'limited'} onClick={() => act('Transfer funds', a.name, true)} />
                        <ActBtn icon={<UserCog size={14} />} label="Update nominee" locked={consent === 'limited'} onClick={() => act('Update nominee', a.name, true)} />
                      </div>
                    </div>
                  )
                })}
              </Card>
              <PermLog />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!open && state.permLog.length > 0 && <div className="mt-5"><PermLog /></div>}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Revoke Rohan's access?" tone="miss">
        <p className="text-slate-300">Rohan will immediately lose access to all accounts. This is logged and can be re-requested.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setConfirm(false)} className="btn-ghost">Cancel</button>
          <button onClick={revoke} className="btn-miss"><ShieldX size={16} /> Revoke now</button>
        </div>
      </Modal>
    </div>
  )
}

function ActBtn({ icon, label, locked, onClick }) {
  const btn = (
    <button onClick={onClick} className={cx('btn py-1.5 text-xs', locked ? 'border border-white/10 text-slate-500' : 'btn-ghost py-1.5')}>
      {locked ? <Lock size={13} /> : icon} {label}
    </button>
  )
  return locked ? <Tip text="Outside consent scope">{btn}</Tip> : btn
}

function PermLog() {
  const { state } = useStore()
  return (
    <Card>
      <div className="label mb-3">Permission log</div>
      <div className="max-h-[320px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-ink-800/90 text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="py-2">Time</th><th>Action</th><th>Consent basis</th></tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            <AnimatePresence initial={false}>
              {state.permLog.map((r, i) => (
                <motion.tr key={state.permLog.length - i} initial={{ opacity: 0, backgroundColor: 'rgba(34,211,238,0.15)' }} animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }} transition={{ duration: 1.2 }}>
                  <td className="num py-2 font-mono text-xs text-slate-400">{r.ts}</td>
                  <td className={cx('py-2', r.action.startsWith('BLOCKED') ? 'text-warn' : 'text-slate-200')}>{r.action}</td>
                  <td className="text-xs text-slate-400">{r.basis}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {!state.permLog.length && <div className="py-6 text-center text-sm text-slate-500">No actions yet — every click will be logged here.</div>}
      </div>
    </Card>
  )
}

function Gateway({ consent, store }) {
  const { set, log, toast } = store
  const again = () => {
    set((s) => ({ j6: { consent: 'pending' }, permLog: [{ ts: now(), action: 'Rohan re-requested access', basis: 'pending' }, ...s.permLog] }))
    log('FLX-6620', 'consent', 'Access re-requested by Rohan Rao')
    toast('ai', 'Request sent to Mahesh Rao')
  }
  return (
    <Card glow="ai" className="mx-auto max-w-3xl p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ai/10 text-ai"><KeyRound size={24} /></span>
        <div>
          <div className="label text-ai">Consent gateway</div>
          <div className="font-display text-2xl font-bold text-white">Rohan requests view access to: HDFC savings, LIC policy</div>
        </div>
      </div>
      <p className="mt-4 text-slate-300">
        Mahesh Rao (74) decides. Nothing in this workspace opens until he does — and every action after that is logged against his consent.
      </p>
      {consent === 'pending' && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <button onClick={() => decideConsent(store, 'approved')} className="btn-ok py-4 text-base"><ShieldCheck size={18} /> Approve</button>
          <button onClick={() => decideConsent(store, 'limited')} className="btn py-4 text-base border border-warn/30 bg-warn/10 text-warn hover:bg-warn/20"><ShieldAlert size={18} /> Approve with limits</button>
          <button onClick={() => decideConsent(store, 'refused')} className="btn-miss py-4 text-base"><ShieldX size={18} /> Refuse</button>
        </div>
      )}
      {(consent === 'refused' || consent === 'revoked') && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-miss/30 bg-miss/[0.07] p-4">
          <span className="flex items-center gap-2 text-miss"><Lock size={18} /> {consent === 'refused' ? 'Access refused by Mahesh Rao. Workspace locked.' : 'Consent revoked. Workspace locked.'}</span>
          <button onClick={again} className="btn-ghost"><RefreshCw size={15} /> Request again</button>
        </div>
      )}
    </Card>
  )
}
