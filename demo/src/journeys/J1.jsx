import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ExternalLink, FileText, Copy, Bell, Landmark, ShieldCheck, Wand2 } from 'lucide-react'
import { useStore } from '../store'
import { Card, Chip, Typed } from '../components/ui'
import { RunBanner, Readiness } from './J2'
import { cx, inr } from '../lib/util'

const CHIPS = ['Forgotten bank account / FD', 'Old insurance / investments', 'Unknown financial footprint']

const LETTER = `To,
The Branch Manager,
LIC of India, Branch 9C, Pune

Subject: Request for revival of lapsed policy No. 55120887

Dear Sir/Madam,

I hold the above endowment policy, on which premiums were paid until March 2014. I understand the policy has acquired paid-up value and is eligible for revival under the current revival scheme.

I request you to:
1. Confirm the paid-up value and the revival amount due, including any late fee concession;
2. Share the medical requirements, if any, for revival.

Enclosed: copy of last premium receipt (2014), PAN, Aadhaar.

Yours faithfully,
Arjun Mehta`

const ACCOUNTS = [
  { name: 'HDFC Savings …1120', inst: 'HDFC Bank', status: 'active' },
  { name: 'SBI Savings …3391 (Pune)', inst: 'SBI', status: 'dormant' },
  { name: 'Kotak 811 …0087', inst: 'Kotak', status: 'active' },
  { name: 'Zerodha demat', inst: 'CDSL', status: 'unknown' },
  { name: 'EPF UAN …4412', inst: 'EPFO', status: 'unknown' },
]
const NEXT = { active: 'dormant', dormant: 'unknown', unknown: 'active' }
const TONE = { active: 'ok', dormant: 'warn', unknown: 'muted' }

export default function J1({ j }) {
  const { state, set, log, toast } = useStore()
  const [drafting, setDrafting] = useState(false)
  const [accts, setAccts] = useState(ACCOUNTS)
  const chips = state.j1Chips

  const toggleChip = (ch) => {
    const on = chips.includes(ch)
    set({ j1Chips: on ? chips.filter((x) => x !== ch) : [...chips, ch] })
    toast('ai', on ? `Removed focus: ${ch}` : `Agent will prioritise: ${ch}`)
  }

  return (
    <div>
      <RunBanner j={j} />
      <Card className="mb-5 flex flex-wrap items-center gap-3">
        <span className="label mr-2">What does Arjun suspect?</span>
        {CHIPS.map((ch) => (
          <Chip key={ch} tone={chips.includes(ch) ? 'ai' : 'muted'} onClick={() => toggleChip(ch)} className="px-3.5 py-1.5 text-sm">
            {chips.includes(ch) && '✓ '}
            {ch}
          </Chip>
        ))}
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_380px] gap-5">
        <Card glow="gold">
          <div className="flex items-center justify-between">
            <div className="label text-gold">RBI UDGAM search</div>
            <Chip tone="gold">1 possible match</Chip>
          </div>
          <div className="mt-4 flex items-center gap-4 rounded-xl border border-gold/40 bg-gold/[0.07] p-4">
            <Landmark className="text-gold" />
            <div className="flex-1">
              <div className="font-semibold text-white">SBI · Pune Camp branch</div>
              <div className="text-sm text-slate-400">Dormant FD · unclaimed &gt; 10 yrs · name + DoB match</div>
            </div>
            <div className="num font-display text-2xl font-bold text-gold">{inr(120000)}</div>
          </div>
          <div className="mt-3 text-sm text-slate-400">Confidence 0.81 · PAN-linked deposit transferred to RBI DEA Fund</div>
          <button
            onClick={() => {
              log(j.caseId, 'letter', 'Routed to RBI UDGAM portal (simulated)')
              toast('ai', 'Simulated — connects to official portal in production')
            }}
            className="btn-ai mt-4"
          >
            <ExternalLink size={16} /> Open UDGAM portal
          </button>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="label">LIC endowment · 55120887</div>
            <Chip tone="warn">lapsed · paid-up</Chip>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-slate-400">Paid-up value (est.)</span>
            <span className="num font-display text-2xl font-bold text-white">{inr(85000)}</span>
          </div>
          <div className="mt-1 text-sm text-slate-500">Last premium Mar-2014 · revival window open</div>
          {!drafting ? (
            <button
              onClick={() => {
                setDrafting(true)
                log(j.caseId, 'letter', 'LIC revival letter drafted')
              }}
              className="btn-ai mt-4"
            >
              <Wand2 size={16} /> Draft revival letter
            </button>
          ) : (
            <div className="mt-4">
              <div className="max-h-[260px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-4">
                <Typed text={LETTER} speed={10} />
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(LETTER).catch(() => {})
                  toast('ok', 'Revival letter copied to clipboard')
                }}
                className="btn-ghost mt-3"
              >
                <Copy size={15} /> Copy
              </button>
            </div>
          )}
        </Card>

        <Readiness value={45} sub="Discovery mode — 2 leads found, 1 needs KYC." />
      </div>

      <Card className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="label">Documents hub · own accounts</div>
          <span className="text-xs text-slate-500">Click a status to update it</span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {accts.map((a, i) => (
            <motion.div key={a.name} layout className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <FileText size={18} className="text-slate-400" />
              <div className="mt-2 font-semibold text-white">{a.name}</div>
              <div className="text-xs text-slate-500">{a.inst}</div>
              <Chip
                tone={TONE[a.status]}
                className="mt-3"
                onClick={() => {
                  const next = NEXT[a.status]
                  setAccts((xs) => xs.map((x, k) => (k === i ? { ...x, status: next } : x)))
                  toast('info', `${a.name} → ${next}`)
                }}
              >
                {a.status}
              </Chip>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-warn/25 bg-warn/[0.06] px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-warn">
            <Bell size={16} /> 3 of 5 accounts have no nominee or an outdated one (pre-marriage).
          </span>
          <button
            onClick={() => {
              log(j.caseId, 'letter', 'Nominee-update reminder scheduled for 3 accounts')
              toast('ok', 'Reminder set — nominee updates for 3 accounts')
            }}
            className={cx('btn-ghost py-2')}
          >
            <ShieldCheck size={15} /> Remind me to update nominees
          </button>
        </div>
      </Card>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Search size={12} /> Searches use only data Arjun consented to (CNS-003).
      </div>
    </div>
  )
}
