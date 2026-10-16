import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, ShieldX, ShieldCheck, ScrollText } from 'lucide-react'
import { useStore } from '../store'
import { CASE_IDS, now } from '../data'
import { Card, Chip, Empty, Modal, Tabs } from '../components/ui'
import { cx } from '../lib/util'

const TYPES = ['all', 'uploaded', 'extracted', 'inferred', 'consent', 'letter']
const TYPE_TONE = { uploaded: 'muted', extracted: 'ai', inferred: 'gold', consent: 'ok', letter: 'brief' }

export default function Ledger() {
  const { state, set, log, toast } = useStore()
  const [tab, setTab] = useState('audit')
  const [caseF, setCaseF] = useState('all')
  const [typeF, setTypeF] = useState('all')
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(null)

  const rows = state.audit.filter(
    (a) => (caseF === 'all' || a.caseId === caseF) && (typeF === 'all' || a.type === typeF) && (!q || a.text.toLowerCase().includes(q.toLowerCase())),
  )

  const revoke = (c) => {
    set((s) => ({
      consents: s.consents.map((x) => (x.id === c.id ? { ...x, status: 'revoked' } : x)),
      ...(c.id === 'CNS-6620'
        ? { j6: { consent: 'revoked' }, permLog: [{ ts: now(), action: 'Consent revoked from Ledger', basis: 'CNS-6620 → revoked' }, ...s.permLog] }
        : {}),
    }))
    log(c.caseId, 'consent', `Consent ${c.id} revoked (${c.who} → ${c.grantee})`)
    toast('warn', `Consent ${c.id} revoked`)
    setConfirm(null)
  }
  const restore = (c) => {
    set((s) => ({
      consents: s.consents.map((x) => (x.id === c.id ? { ...x, status: 'active', ts: now() } : x)),
      ...(c.id === 'CNS-6620' ? { j6: { consent: 'limited' } } : {}),
    }))
    log(c.caseId, 'consent', `Consent ${c.id} re-granted by ${c.who}`)
    toast('ok', `Consent ${c.id} re-granted`)
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="label">Ledger</div>
          <h1 className="font-display text-4xl font-bold text-white">Consent first. Every action logged.</h1>
        </div>
        <Tabs
          tabs={[
            { key: 'audit', label: `Audit log · ${state.audit.length}` },
            { key: 'consent', label: `Consent · ${state.consents.length}` },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'audit' ? (
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <Search size={16} className="text-slate-500" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search audit entries…" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
            </div>
            <select value={caseF} onChange={(e) => setCaseF(e.target.value)} className="rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white">
              <option value="all">All cases</option>
              {CASE_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
            <div className="flex gap-1">
              {TYPES.map((t) => (
                <Chip key={t} tone={typeF === t ? (TYPE_TONE[t] || 'ai') : 'muted'} onClick={() => setTypeF(t)} className={cx(typeF === t && 'ring-1 ring-current')}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          {rows.length ? (
            <table className="w-full text-left text-[15px]">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="py-2">Time</th><th>Case</th><th>Type</th><th>Event</th></tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                <AnimatePresence initial={false}>
                  {rows.map((a, i) => (
                    <motion.tr
                      key={a.id}
                      layout
                      initial={{ opacity: 0, backgroundColor: 'rgba(245,197,66,0.2)' }}
                      animate={{ opacity: 1, backgroundColor: i < 3 && state.ledgerFlash ? ['rgba(245,197,66,0.2)', 'rgba(0,0,0,0)'] : 'rgba(0,0,0,0)' }}
                      transition={{ duration: 1.4 }}
                    >
                      <td className="num py-2.5 font-mono text-xs text-slate-400">{a.ts}</td>
                      <td className="num text-sm text-slate-300">{a.caseId}</td>
                      <td><Chip tone={TYPE_TONE[a.type]}>{a.type}</Chip></td>
                      <td className="text-slate-200">{a.text}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          ) : (
            <Empty icon={<ScrollText size={22} />} title="No matching entries" body="Try another case, type or search term." cta={<button onClick={() => { setQ(''); setCaseF('all'); setTypeF('all') }} className="btn-ghost">Clear filters</button>} />
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {state.consents.map((c) => (
            <motion.div key={c.id} layout>
              <Card glow={c.status === 'active' ? 'ok' : 'miss'}>
                <div className="flex items-center justify-between">
                  <span className="num font-mono font-semibold text-white">{c.id} <span className="text-slate-500">· {c.caseId}</span></span>
                  <Chip tone={c.status === 'active' ? 'ok' : 'miss'}>{c.status}</Chip>
                </div>
                <div className="mt-2 font-semibold text-white">{c.who} → {c.grantee}</div>
                <div className="text-sm text-slate-400">{c.scope}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="num font-mono text-xs text-slate-500">since {c.ts}</span>
                  {c.status === 'active' ? (
                    <button onClick={() => setConfirm(c)} className="btn-miss py-1.5 text-xs"><ShieldX size={14} /> Revoke</button>
                  ) : (
                    <button onClick={() => restore(c)} className="btn-ok py-1.5 text-xs"><ShieldCheck size={14} /> Re-grant</button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={`Revoke ${confirm?.id}?`} tone="miss">
        <p className="text-slate-300">{confirm?.grantee} will lose: {confirm?.scope}. The revocation is logged.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setConfirm(null)} className="btn-ghost">Cancel</button>
          <button onClick={() => revoke(confirm)} className="btn-miss"><ShieldX size={15} /> Revoke</button>
        </div>
      </Modal>
    </div>
  )
}
