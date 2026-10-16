import { motion } from 'framer-motion'
import { Globe, Landmark, Info, Send } from 'lucide-react'
import { useStore } from '../store'
import { CASES, RATES } from '../data'
import { Card, Chip } from '../components/ui'
import { RunBanner } from './J2'
import { cx, inr } from '../lib/util'

const REQS = [
  { id: 'consulate', req: 'Consulate affidavit (heirship)', country: 'UK', time: '5–7 days' },
  { id: 'apostille', req: 'Apostille on affidavit', country: 'UK', time: '7–10 days' },
  { id: 'passport', req: 'Notarised passport copy', country: 'UK', time: '1 day' },
  { id: 'arabic', req: 'Arabic translation of Indian death cert.', country: 'UAE', time: '3 days' },
  { id: 'attest', req: 'MOFA attestation', country: 'UAE', time: '5–8 days' },
  { id: 'eid', req: 'Attested Emirates ID copy', country: 'UAE', time: '2 days' },
  { id: 'lhc', req: 'Legal Heir Certificate', country: 'India', time: '15–30 days' },
]
// Windows has no flag emoji, so draw small flags inline.
const Flag = ({ c }) => (
  <svg viewBox="0 0 30 20" className="inline-block h-[0.9em] w-[1.35em] rounded-[2px] align-[-0.1em] ring-1 ring-white/20">
    {c === 'UK' && (
      <>
        <rect width="30" height="20" fill="#012169" />
        <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
        <path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.6" />
        <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
        <path d="M15 0v20M0 10h30" stroke="#C8102E" strokeWidth="3.4" />
      </>
    )}
    {c === 'UAE' && (
      <>
        <rect width="30" height="7" fill="#00732F" />
        <rect y="6.6" width="30" height="6.8" fill="#fff" />
        <rect y="13.3" width="30" height="6.7" fill="#000" />
        <rect width="8" height="20" fill="#FF0000" />
      </>
    )}
    {c === 'India' && (
      <>
        <rect width="30" height="7" fill="#FF9933" />
        <rect y="6.6" width="30" height="6.8" fill="#fff" />
        <rect y="13.3" width="30" height="6.7" fill="#138808" />
        <circle cx="15" cy="10" r="2.4" fill="none" stroke="#000080" strokeWidth="0.8" />
      </>
    )}
  </svg>
)
const FLAG = { UK: <Flag c="UK" />, UAE: <Flag c="UAE" />, India: <Flag c="India" /> }
const CYCLE = { todo: 'progress', progress: 'done', done: 'todo' }
const DOT = { todo: 'bg-miss', progress: 'bg-warn', done: 'bg-ok' }
const LABEL = { todo: 'Not started', progress: 'In progress', done: 'Done' }

export default function J7({ j }) {
  const { state, set, log, toast } = useStore()
  const { country, status } = state.j7
  const c = CASES[j.caseId]
  const rows = REQS.filter((r) => country === 'All' || r.country === country)

  const progress = (ct) => {
    const items = REQS.filter((r) => r.country === ct)
    const score = items.reduce((s, r) => s + (status[r.id] === 'done' ? 1 : status[r.id] === 'progress' ? 0.5 : 0), 0)
    return Math.floor((score / items.length) * 100)
  }

  return (
    <div>
      <RunBanner j={j} />
      <div className="mb-5 flex items-center gap-2">
        <span className="label mr-2">Jurisdiction</span>
        {['All', 'UK', 'UAE', 'India'].map((ct) => (
          <Chip
            key={ct}
            tone={country === ct ? 'ai' : 'muted'}
            className="px-4 py-1.5 text-sm"
            onClick={() => {
              set((s) => ({ j7: { ...s.j7, country: ct } }))
              toast('ai', ct === 'All' ? 'Showing all jurisdictions' : `Filtered to ${ct}`)
            }}
          >
            {FLAG[ct] || <Globe size={13} />} {ct}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
        <Card>
          <div className="label mb-3">Requirements</div>
          <table className="w-full text-left text-[15px]">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="py-2">Requirement</th><th>Country</th><th>Status</th><th className="text-right">Est. time</th></tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {rows.map((r) => (
                <motion.tr layout key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td className="py-3 font-semibold text-white">{r.req}</td>
                  <td className="text-slate-300">{FLAG[r.country]} {r.country}</td>
                  <td>
                    <button
                      onClick={() => {
                        const next = CYCLE[status[r.id]]
                        set((s) => ({ j7: { ...s.j7, status: { ...s.j7.status, [r.id]: next } } }))
                        log(j.caseId, 'uploaded', `${r.req} → ${LABEL[next]}`)
                        toast(next === 'done' ? 'ok' : 'info', `${r.req}: ${LABEL[next]}`)
                      }}
                      className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-white/5"
                    >
                      <span className={cx('h-3 w-3 rounded-full', DOT[status[r.id]])} />
                      <span className="text-sm text-slate-300">{LABEL[status[r.id]]}</span>
                    </button>
                  </td>
                  <td className="text-right text-slate-400">{r.time}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-xs text-slate-500">Click a status dot to advance it.</div>
        </Card>
        <Card>
          <div className="label mb-4">Jurisdiction tracker</div>
          {['UK', 'UAE', 'India'].map((ct) => (
            <div key={ct} className="mb-4">
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-semibold text-white">{FLAG[ct]} {ct}</span>
                <span className="num text-slate-300">{progress(ct)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress(ct)}%` }} transition={{ duration: 0.8 }} className={cx('h-full rounded-full', progress(ct) >= 66 ? 'bg-ok' : progress(ct) >= 50 ? 'bg-ai' : 'bg-warn')} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
        <Card>
          <div className="label mb-3">Indian assets · converted</div>
          <table className="w-full text-[15px]">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="py-2 text-left">Asset</th><th className="text-right">₹</th><th className="text-right">£ (Priya)</th><th className="text-right">AED (Arun)</th></tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {c.assets.map((a) => (
                <tr key={a.type}>
                  <td className="py-3"><span className="font-semibold text-white">{a.inst}</span> <span className="text-slate-400">· {a.type}</span></td>
                  <td className="num text-right text-white">{inr(a.value)}</td>
                  <td className="num text-right text-slate-300">£{Math.round(a.value / RATES.GBP).toLocaleString('en-GB')}</td>
                  <td className="num text-right text-slate-300">AED {Math.round(a.value / RATES.AED).toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-xs text-slate-500">Demo rates: £1 = ₹{RATES.GBP} · AED 1 = ₹{RATES.AED}</div>
        </Card>
        <Card glow="ai">
          <div className="mb-2 flex items-center gap-2"><Landmark size={16} className="text-ai" /><span className="label text-ai">NRO / NRE & repatriation</span></div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• Inherited funds land in an <b className="text-white">NRO</b> account — NRE cannot receive inheritance.</li>
            <li>• Repatriation up to <b className="text-white">USD 1 million / financial year</b> per heir, with Form 15CA/15CB.</li>
            <li>• Tax in India is on income after death, not on inheritance itself.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip
              tone="ai"
              onClick={() => {
                log(j.caseId, 'letter', 'RBI remittance checklist (FEMA) prepared')
                toast('ai', 'RBI remittance: Form A2 + 15CA/15CB checklist prepared (simulated)')
              }}
            >
              <Send size={12} /> RBI remittance · USD 1M/yr
            </Chip>
            <Chip tone="muted" onClick={() => toast('info', 'Priya can open an NRO account remotely with video KYC at SBI/ICICI')}><Info size={12} /> Open NRO remotely?</Chip>
          </div>
        </Card>
      </div>
    </div>
  )
}
