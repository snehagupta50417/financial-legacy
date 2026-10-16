import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X, Gavel, Send, ArrowLeft, ArrowRight, AlertOctagon, Wand2, FileSearch, Plus, Copy } from 'lucide-react'
import { useStore } from '../store'
import { Card, Chip, Tabs, Typed } from '../components/ui'
import { RunBanner } from './J2'
import { cx, inr } from '../lib/util'

const CHECKS = [
  ['Two witnesses signed', true, 'Ramesh Patil, Anil Joshi'],
  ['Executor named', true, 'Rohit Sharma'],
  ['Testator signature on every page', true, '4 of 4 pages'],
  ['Date present & consistent', true, '12-Mar-2019'],
  ['Witness addresses complete', false, 'Witness 2 address missing'],
]

const ASSETS = [
  { name: 'HDFC Savings …0452', value: 184300, to: 'Sunita Sharma' },
  { name: 'LIC 974512388', value: 500000, to: 'Sunita Sharma' },
  { name: 'CAMS folios 1 & 3', value: 830650, to: 'Rohit Sharma' },
  { name: 'CAMS folios 2 & 4', value: 312256, to: 'Rohit Sharma' },
  { name: 'Pune flat (Kothrud)', value: 0, to: 'Sunita Sharma (life interest)' },
]

export default function J4({ j }) {
  const [mode, setMode] = useState('found')
  const { toast } = useStore()
  return (
    <div>
      <RunBanner j={j} />
      <Tabs
        className="mb-5"
        tone="brief"
        tabs={[
          { key: 'found', label: '(a) Physical will discovered' },
          { key: 'create', label: '(b) Need to create a will' },
          { key: 'dispute', label: '(c) Disputed will' },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m)
          toast('ai', { found: 'Will verification mode', create: 'Will drafting wizard', dispute: 'Dispute mode — evidence board' }[m])
        }}
      />
      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {mode === 'found' && <Found j={j} />}
          {mode === 'create' && <Create j={j} />}
          {mode === 'dispute' && <Dispute j={j} />}
        </motion.div>
      </AnimatePresence>
      <Card className="mt-5">
        <div className="label mb-3">Asset → successor</div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-white/[0.06]">
            {ASSETS.map((a) => (
              <tr key={a.name}>
                <td className="py-2.5 font-semibold text-slate-100">{a.name}</td>
                <td className="num text-right text-slate-300">{a.value ? inr(a.value) : 'immovable'}</td>
                <td className="w-12 text-center text-slate-500">→</td>
                <td className="text-brief">{a.to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function Found({ j }) {
  const { log, toast } = useStore()
  const [checks, setChecks] = useState(CHECKS.map((c) => c[1]))
  const ok = checks.filter(Boolean).length
  return (
    <div className="grid grid-cols-2 gap-5">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="label">Verification checklist</div>
          <Chip tone={ok === CHECKS.length ? 'ok' : 'warn'}>{ok}/{CHECKS.length} verified</Chip>
        </div>
        <div className="space-y-2">
          {CHECKS.map(([t, , note], i) => (
            <button
              key={t}
              onClick={() => {
                setChecks((c) => c.map((v, k) => (k === i ? !v : v)))
                toast(checks[i] ? 'warn' : 'ok', `${t}: ${checks[i] ? 'flagged' : 'verified'}`)
                log(j.caseId, 'extracted', `Will check "${t}" ${checks[i] ? 'flagged' : 'verified'}`)
              }}
              className={cx('flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left', checks[i] ? 'border-ok/25 bg-ok/[0.06]' : 'border-miss/30 bg-miss/[0.06]')}
            >
              <span className={cx('grid h-6 w-6 place-items-center rounded-full', checks[i] ? 'bg-ok/20 text-ok' : 'bg-miss/20 text-miss')}>
                {checks[i] ? <Check size={14} /> : <X size={14} />}
              </span>
              <span className="flex-1 font-semibold text-white">{t}</span>
              <span className="text-xs text-slate-400">{note}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-brief/30 bg-brief/[0.07] p-4 text-sm text-slate-200">
          <div className="mb-1 flex items-center gap-2 font-semibold text-brief"><Gavel size={16} /> Probate hint</div>
          Will made in Pune by a Hindu testator — probate is <b>not mandatory</b> (Sec. 57, Indian Succession Act applies to Mumbai, Kolkata, Chennai). Some banks may still ask for it for amounts above their threshold.
        </div>
      </Card>
      <Card glow="brief">
        <div className="mb-3 flex items-center gap-2"><FileSearch size={16} className="text-brief" /><span className="label text-brief">Extracted will summary</span></div>
        <dl className="grid grid-cols-[140px_1fr] gap-y-2.5 text-sm">
          {[
            ['Testator', 'Rajesh Kumar Sharma'],
            ['Dated', '12 March 2019, Pune'],
            ['Type', 'Unregistered, handwritten (holographic)'],
            ['Executor', 'Rohit Sharma (son)'],
            ['Witnesses', 'Ramesh Patil · Anil Joshi'],
            ['Bequests', 'Bank & insurance → Sunita · Mutual funds → Rohit · Flat → Sunita (life), then Rohit'],
            ['Revocation', 'Revokes all prior wills'],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-slate-100">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}

const STEPS = ['Assets', 'Beneficiaries', 'Executor', 'Review']
function Create({ j }) {
  const { log, toast } = useStore()
  const [step, setStep] = useState(0)
  const [assets, setAssets] = useState(['HDFC Savings', 'LIC policy', 'Mutual funds'])
  const [bens, setBens] = useState([{ name: 'Sunita Sharma', share: 50 }, { name: 'Rohit Sharma', share: 50 }])
  const [exec, setExec] = useState('Rohit Sharma')
  const [routed, setRouted] = useState(false)
  const extra = ['Pune flat', 'Gold (locker)', 'PPF account']
  return (
    <div className="grid grid-cols-2 gap-5">
      <Card>
        <div className="mb-5 flex gap-2">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => setStep(i)} className={cx('flex-1 rounded-xl border px-3 py-2 text-sm font-semibold', i === step ? 'border-brief/40 bg-brief/15 text-brief' : i < step ? 'border-ok/20 text-ok' : 'border-white/10 text-slate-500')}>
              {i < step ? '✓ ' : `${i + 1}. `}
              {s}
            </button>
          ))}
        </div>
        <div className="min-h-[220px]">
          {step === 0 && (
            <div>
              <div className="flex flex-wrap gap-2">
                {assets.map((a) => (
                  <Chip key={a} tone="brief" onClick={() => setAssets((x) => x.filter((y) => y !== a))}>{a} ✕</Chip>
                ))}
              </div>
              <div className="mt-4 label">Add</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {extra.filter((e) => !assets.includes(e)).map((e) => (
                  <Chip key={e} onClick={() => setAssets((x) => [...x, e])}><Plus size={12} /> {e}</Chip>
                ))}
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-3">
              {bens.map((b, i) => (
                <div key={b.name} className="flex items-center gap-4">
                  <span className="w-40 font-semibold text-white">{b.name}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={b.share}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setBens((x) => x.map((y, k) => ({ ...y, share: k === i ? v : 100 - v })))
                    }}
                    className="flex-1 accent-violet-400"
                  />
                  <span className="num w-12 text-right text-brief">{b.share}%</span>
                </div>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-2">
              {['Rohit Sharma', 'Sunita Sharma', 'Adv. Meghna Kulkarni'].map((e) => (
                <button key={e} onClick={() => setExec(e)} className={cx('w-full rounded-xl border px-4 py-3 text-left', exec === e ? 'border-brief/40 bg-brief/10 text-white' : 'border-white/10 text-slate-300')}>
                  {exec === e ? '● ' : '○ '}
                  {e}
                </button>
              ))}
            </div>
          )}
          {step === 3 && (
            <div>
              <div className="text-sm text-slate-300">Review the preview. A lawyer must review and witnesses must sign before this becomes a valid will.</div>
              <button
                onClick={() => {
                  setRouted(true)
                  log(j.caseId, 'letter', 'Will draft routed to empanelled lawyer for review')
                  toast('brief', 'Routed to lawyer review — Adv. Meghna Kulkarni (simulated)')
                }}
                className="btn-brief mt-4"
              >
                <Send size={16} /> {routed ? 'Routed ✓ — send again' : 'Route to lawyer review'}
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-between">
          <button disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="btn-ghost"><ArrowLeft size={15} /> Back</button>
          <button disabled={step === 3} onClick={() => setStep((s) => s + 1)} className="btn-brief">Next <ArrowRight size={15} /></button>
        </div>
      </Card>
      <Card className="relative overflow-hidden bg-[#f8f5ee]/[0.96] text-slate-800">
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-[24deg] whitespace-nowrap font-display text-4xl font-extrabold text-miss/25">DRAFT — pending lawyer review</span>
        </div>
        <div className="relative font-serif text-[15px] leading-relaxed">
          <div className="text-center font-display text-lg font-bold">LAST WILL AND TESTAMENT</div>
          <p className="mt-3">I, <b>Rajesh Kumar Sharma</b>, of Pune, being of sound mind, declare this to be my last will.</p>
          <p className="mt-2">I bequeath the following assets: <b>{assets.join(', ') || '—'}</b>.</p>
          <p className="mt-2">To be divided as: {bens.map((b) => `${b.name} — ${b.share}%`).join('; ')}.</p>
          <p className="mt-2">I appoint <b>{exec}</b> as the executor of this will.</p>
          <p className="mt-4 text-sm text-slate-500">Signed: ____________ · Witness 1: ____________ · Witness 2: ____________</p>
        </div>
      </Card>
    </div>
  )
}

const LETTER = `To the Branch Manager, CAMS / HDFC Bank, Pune

Re: Notice of dispute — estate of Rajesh Kumar Sharma (FLX-8842)

Please note that the will dated 12-Mar-2019 is under dispute by a Class-1 heir. We request that you:
1. Mark the following assets as "under dispute" and hold transmission: CAMS folios 2 & 4, Pune flat (Kothrud).
2. Continue processing undisputed claims (LIC 974512388, HDFC Savings …0452) to the nominee.
3. Acknowledge this notice within 15 days.

Enclosed: copy of will, objection letter dated 02-Oct-2026.`

function Dispute({ j }) {
  const { log, toast } = useStore()
  const [flag, setFlag] = useState(false)
  const [draft, setDraft] = useState(false)
  const disputed = ['CAMS folios 2 & 4', 'Pune flat (Kothrud)']
  return (
    <div className="grid grid-cols-2 gap-5">
      <Card glow="miss">
        <div className="mb-3 flex items-center gap-2 text-miss"><AlertOctagon size={18} /><span className="label text-miss">Evidence board</span></div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Objection', 'Cousin claims a 2021 will exists'],
            ['Gap', 'Witness 2 address missing'],
            ['Support', 'Signatures match bank specimen (0.91)'],
            ['Support', 'Handwriting consistent across pages'],
          ].map(([k, v], i) => (
            <div key={i} className={cx('rounded-xl border p-3 text-sm', k === 'Support' ? 'border-ok/25 bg-ok/[0.05]' : 'border-miss/30 bg-miss/[0.07]')}>
              <div className={cx('text-xs font-bold uppercase', k === 'Support' ? 'text-ok' : 'text-miss')}>{k}</div>
              <div className="mt-1 text-slate-200">{v}</div>
            </div>
          ))}
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-4 py-3">
          <input
            type="checkbox"
            checked={flag}
            onChange={(e) => {
              setFlag(e.target.checked)
              log(j.caseId, 'extracted', e.target.checked ? 'Disputed assets flagged for separate tracking' : 'Dispute flags removed')
              toast(e.target.checked ? 'miss' : 'info', e.target.checked ? '2 assets moved to disputed track' : 'Assets returned to main track')
            }}
            className="h-5 w-5 accent-red-400"
          />
          <span className="font-semibold text-white">Flag disputed assets to track separately</span>
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-2">Undisputed</div>
            <AnimatePresence>
              {['LIC 974512388', 'HDFC Savings …0452', ...(flag ? [] : disputed)].map((a) => (
                <motion.div layout key={a} layoutId={a} className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">{a}</motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div>
            <div className="label mb-2 text-miss">Disputed</div>
            <AnimatePresence>
              {(flag ? disputed : []).map((a) => (
                <motion.div layout key={a} layoutId={a} className="mb-2 rounded-lg border border-miss/40 bg-miss/10 px-3 py-2 text-sm text-miss">{a}</motion.div>
              ))}
            </AnimatePresence>
            {!flag && <div className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-xs text-slate-500">none flagged</div>}
          </div>
        </div>
      </Card>
      <Card>
        <div className="label mb-3">Corrections / grievance</div>
        {draft ? (
          <>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <Typed text={LETTER} speed={10} />
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(LETTER).catch(() => {})
                toast('ok', 'Grievance draft copied')
              }}
              className="btn-ghost mt-3"
            >
              <Copy size={14} /> Copy
            </button>
          </>
        ) : (
          <div className="grid min-h-[240px] place-items-center rounded-xl border border-dashed border-white/10 text-center">
            <div>
              <div className="text-sm text-slate-400">Notify institutions to hold disputed assets while undisputed claims continue.</div>
              <button
                onClick={() => {
                  setDraft(true)
                  log(j.caseId, 'letter', 'Dispute notice / grievance drafted')
                }}
                className="btn-miss mt-4"
              >
                <Wand2 size={16} /> Draft corrections / grievance
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
