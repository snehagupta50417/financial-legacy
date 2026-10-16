import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Landmark, ExternalLink, Gem, FileCheck2, Download, Eye, Search, Check, AlertCircle, Bot, Users } from 'lucide-react'
import { useStore } from '../store'
import { CASES } from '../data'
import { Card, Chip, Ring, Tabs, Modal } from '../components/ui'
import { cx, downloadFile, inr, readinessOf } from '../lib/util'

const c = CASES['FLX-8842']

export function RunBanner({ j }) {
  const { state } = useStore()
  const navigate = useNavigate()
  if (state.runs[j.id] === 'done') return null
  return (
    <div className="mb-5 flex items-center justify-between rounded-2xl border border-ai/25 bg-ai/[0.07] px-5 py-3">
      <div className="flex items-center gap-3 text-sm text-slate-200">
        <Bot size={18} className="text-ai" /> Showing the prepared workspace. Run the agent to see how it was built.
      </div>
      <button onClick={() => navigate(`/journey/${j.id}/agent`)} className="btn-ai py-2">Run agent</button>
    </div>
  )
}

export function Readiness({ value, sub }) {
  return (
    <Card glow="gold" className="flex items-center gap-5">
      <Ring value={value} size={128} />
      <div>
        <div className="label text-gold">Claim readiness</div>
        <div className="mt-1 text-sm text-slate-300">{sub}</div>
      </div>
    </Card>
  )
}

export default function J2({ j }) {
  const { state, set, log, toast } = useStore()
  const [tab, setTab] = useState('HDFC')
  const [form, setForm] = useState(false)
  const readiness = readinessOf(state, c.id)

  const tick = (m) => {
    const v = !state.j2Checked[m.id]
    set((s) => ({ j2Checked: { ...s.j2Checked, [m.id]: v } }))
    if (v) {
      log(c.id, 'uploaded', `${m.doc} marked obtained`)
      toast('ok', `${m.doc} added · readiness ${readiness}% → ${readiness + 12}%`)
    } else toast('info', `${m.doc} unmarked`)
  }

  const portal = (name) => {
    log(c.id, 'letter', `Routed to ${name} (simulated)`)
    toast('ai', 'Simulated — connects to official portal in production')
  }

  return (
    <div>
      <RunBanner j={j} />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_380px] gap-5">
        <Card className="col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="label">Deceased</div>
              <div className="mt-1 font-display text-3xl font-bold text-white">{c.person.name}</div>
              <div className="mt-1 text-slate-400">
                {c.person.life} · {c.person.city} · PAN {c.person.pan}
              </div>
            </div>
            <div className="text-right">
              <div className="label">Total identified</div>
              <div className="num font-display text-3xl font-bold text-white">{inr(c.assets.reduce((s, a) => s + a.value, 0))}</div>
              <div className="text-xs text-gold">incl. ₹4,20,000 inferred</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Users size={15} className="text-slate-500" />
            {c.heirs.map((h) => (
              <Chip key={h.name} tone="ai" onClick={() => toast('ai', `${h.name}: CKYC verified · ${h.role}`)}>
                {h.name} · {h.role}
              </Chip>
            ))}
          </div>
        </Card>
        <Readiness value={readiness} sub="Tick missing documents below as they arrive." />
      </div>

      <Card className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="label">Cross-document match</div>
          <Chip tone="ai">4 documents → 4 institutions</Chip>
        </div>
        <table className="w-full text-left text-[15px]">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-2">Document</th>
              <th>Institution</th>
              <th>Entities extracted</th>
              <th className="text-right">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {[
              ['Death Certificate', 'Pune Municipal Corp.', 'Name, DoD 14-Aug-2024, Reg. no.', 0.95],
              ['HDFC Bank Statement', 'HDFC Bank', 'A/C …0452, nominee, ₹2,800/mo credit', 0.93],
              ['LIC Policy 974512388', 'LIC', 'Sum assured, nominee, policy status', 0.95],
              ['CAMS MF Statement', 'CAMS (4 AMCs)', '4 folios, PAN, address', 0.88],
            ].map(([d, i, e, conf]) => (
              <tr key={d} className={cx('text-slate-200 transition', state.highlight === `src:${d}` && 'bg-gold/10 outline outline-1 outline-gold/50')}>
                <td className="py-3 font-semibold">{d}</td>
                <td className="text-slate-300">{i}</td>
                <td className="text-slate-400">{e}</td>
                <td className="text-right">
                  <Chip tone={conf >= 0.93 ? 'ok' : 'warn'}>{conf.toFixed(2)}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_380px] gap-5">
        <Card>
          <Tabs
            tabs={[
              { key: 'HDFC', label: 'HDFC Bank' },
              { key: 'LIC', label: 'LIC' },
              { key: 'CAMS', label: 'CAMS' },
              { key: 'PO', label: 'Post Office MIS' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            {tab === 'HDFC' && (
              <div className="space-y-3">
                <AssetRow icon={<Landmark size={18} />} name="Savings A/C …0452" note="Nominee: Sunita Sharma · transmission via nominee claim" value={184300} chip={<Chip tone="ok">verified</Chip>} />
                <AssetRow
                  gold
                  icon={<Gem size={18} />}
                  name="HIDDEN FD — inferred"
                  note="inferred — verify with FD receipt · ₹2,800/mo × 12 ÷ 8%"
                  value={420000}
                  chip={<Chip tone="gold">confidence 0.93</Chip>}
                />
                <div className="flex items-center justify-between rounded-xl border border-miss/25 bg-miss/[0.06] px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-miss">
                    <AlertCircle size={16} /> Missing: HDFC FD receipt
                  </span>
                  <Chip tone={state.j2Checked.fd ? 'ok' : 'miss'}>{state.j2Checked.fd ? 'received' : 'missing'}</Chip>
                </div>
                <button onClick={() => portal('HDFC claim portal')} className="btn-ai">
                  <ExternalLink size={16} /> Open HDFC claim portal
                </button>
              </div>
            )}
            {tab === 'LIC' && (
              <div className="space-y-3">
                <AssetRow icon={<FileCheck2 size={18} />} name="Policy 974512388" note="Nominee: Sunita Sharma · death claim (nominee path)" value={500000} chip={<Chip tone="ok">sum assured</Chip>} />
                <div className="flex items-center gap-3 rounded-xl border border-ok/30 bg-ok/[0.08] px-4 py-3 text-ok">
                  <Check size={18} /> <span className="font-semibold">Ready to file today — Form 3783</span>
                </div>
                <button onClick={() => setForm(true)} className="btn-ok"><Eye size={16} /> Preview Form 3783</button>
              </div>
            )}
            {tab === 'CAMS' && (
              <div className="space-y-3">
                <AssetRow icon={<Landmark size={18} />} name="4 folios · PAN-linked" note="Transmission needs heir KYC · 2 folios without nominee" value={1142906} chip={<Chip tone="warn">needs heir KYC</Chip>} />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[['HDFC Flexi Cap', 512400], ['SBI Bluechip', 318250], ['Axis ELSS', 201256], ['ICICI Liquid', 111000]].map(([n, v]) => (
                    <div key={n} className="flex justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                      <span className="text-slate-300">{n}</span>
                      <span className="num text-slate-100">{inr(v)}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    log(c.id, 'letter', 'CAMS transmission request (Form T2) drafted')
                    toast('ok', 'Transmission request drafted — awaiting heir KYC')
                  }}
                  className="btn-ai"
                >
                  Draft transmission request
                </button>
              </div>
            )}
            {tab === 'PO' && (
              <div className="space-y-3">
                <AssetRow icon={<Landmark size={18} />} name="Post Office MIS (possible)" note="Address match with Pune Camp HPO · confidence 0.71" value={50000} chip={<Chip tone="warn">unconfirmed</Chip>} />
                <button
                  onClick={() => {
                    log(c.id, 'inferred', 'Post Office locator search run for Pune Camp HPO')
                    toast('ai', 'Locator search queued — Pune Camp HPO · results in 2–3 days (simulated)')
                  }}
                  className="btn-ai"
                >
                  <Search size={16} /> Run locator search
                </button>
              </div>
            )}
          </motion.div>
        </Card>

        <Card glow="miss">
          <div className="label mb-3">Missing documents</div>
          <div className="space-y-2">
            {c.missing.map((m) => {
              const on = state.j2Checked[m.id]
              return (
                <button
                  key={m.id}
                  onClick={() => tick(m)}
                  className={cx(
                    'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition',
                    on ? 'border-ok/30 bg-ok/[0.08]' : 'border-white/10 bg-white/[0.02] hover:border-white/20',
                  )}
                >
                  <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border', on ? 'border-ok bg-ok text-ink-900' : 'border-white/30')}>
                    {on && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span>
                    <span className={cx('block font-semibold', on ? 'text-ok line-through decoration-ok/50' : 'text-white')}>{m.doc}</span>
                    <span className="text-xs text-slate-400">From: {m.instrument}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-4 text-xs text-slate-500">Each document adds 12% readiness.</div>
        </Card>
      </div>

      <Modal open={form} onClose={() => setForm(false)} title="LIC Form 3783 — Claimant's Statement (preview)" wide>
        <Form3783 onDownload={() => {
          downloadFile('LIC_Form_3783_FLX-8842.txt', FORM_TXT, 'text/plain')
          log(c.id, 'letter', 'Form 3783 generated and downloaded')
          toast('ok', 'Form 3783 downloaded (.txt)')
        }} />
      </Modal>
    </div>
  )
}

function AssetRow({ icon, name, note, value, chip, gold }) {
  return (
    <motion.div
      initial={gold ? { boxShadow: '0 0 0 0 rgba(245,197,66,0.6)' } : false}
      animate={gold ? { boxShadow: ['0 0 0 0 rgba(245,197,66,0.6)', '0 0 0 12px rgba(245,197,66,0)'] } : undefined}
      transition={{ duration: 1.6, repeat: gold ? 2 : 0 }}
      className={cx(
        'flex items-center gap-4 rounded-xl border px-4 py-3.5',
        gold ? 'border-gold/50 bg-gold/[0.08]' : 'border-white/[0.08] bg-white/[0.02]',
      )}
    >
      <span className={cx('grid h-10 w-10 place-items-center rounded-xl', gold ? 'bg-gold/20 text-gold' : 'bg-white/5 text-slate-300')}>{icon}</span>
      <div className="flex-1">
        <div className={cx('font-semibold', gold ? 'text-gold' : 'text-white')}>{name}</div>
        <div className="text-xs text-slate-400">{note}</div>
      </div>
      {chip}
      <div className={cx('num w-36 text-right font-display text-xl font-bold', gold ? 'text-gold' : 'text-white')}>{inr(value)}</div>
    </motion.div>
  )
}

const FORM_ROWS = [
  ['Policy number', '974512388'],
  ['Life assured', 'Rajesh Kumar Sharma'],
  ['Date of death', '14-Aug-2024'],
  ['Place of death', 'Pune, Maharashtra'],
  ['Cause', 'Natural (as per certificate)'],
  ['Claimant', 'Sunita Sharma (nominee, wife)'],
  ['Claimant KYC', 'CKYC verified · PAN ABCPS••••L'],
  ['Sum assured', '₹5,00,000'],
  ['Bank for NEFT', 'HDFC A/C …9921 (claimant)'],
  ['Enclosures', 'Death certificate, policy bond, claimant ID, cancelled cheque'],
]
const FORM_TXT =
  'LIC FORM 3783 — CLAIMANT\'S STATEMENT (DEMO PREVIEW — NOT AN OFFICIAL FORM)\n\n' +
  FORM_ROWS.map(([k, v]) => `${k.padEnd(18)}: ${v}`).join('\n') +
  '\n\nPrepared by FinLegacy AI for case FLX-8842. Review and sign before submission.\n'

function Form3783({ onDownload }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-white/10 bg-black/20 p-5">
        {FORM_ROWS.map(([k, v]) => (
          <div key={k}>
            <div className="text-xs uppercase tracking-wider text-slate-500">{k}</div>
            <div className="font-semibold text-slate-100">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">Auto-filled from 3 documents · claimant signs before submission</span>
        <button onClick={onDownload} className="btn-ok"><Download size={16} /> Download .txt</button>
      </div>
    </div>
  )
}
