import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, FileWarning, Link2, RotateCcw, ScrollText, Download, Boxes, Radar, Route, BookOpen,
  CheckCircle2, Upload, Sparkles, ShieldCheck, Mail, FileSearch, FileText,
} from 'lucide-react'
import { useStore } from '../store'
import { CASES, CASE_IDS } from '../data'
import { Card, Chip, CountUp, Drawer, Empty, Tabs } from '../components/ui'
import { buildBrief, cx, inr, readinessOf } from '../lib/util'

const AUDIT_ICON = { uploaded: Upload, extracted: FileSearch, inferred: Sparkles, consent: ShieldCheck, letter: Mail }
const AUDIT_TONE = { uploaded: 'text-slate-300', extracted: 'text-ai', inferred: 'text-gold', consent: 'text-ok', letter: 'text-brief' }

export function AuditRow({ a, flash }) {
  const Icon = AUDIT_ICON[a.type] || FileText
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 12, backgroundColor: flash ? 'rgba(245,197,66,0.18)' : 'rgba(0,0,0,0)' }}
      animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0,0,0,0)' }}
      transition={{ duration: 1 }}
      className="flex gap-3 rounded-lg px-2 py-2"
    >
      <Icon size={15} className={cx('mt-0.5 shrink-0', AUDIT_TONE[a.type])} />
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-snug text-slate-200">{a.text}</div>
        <div className="num mt-0.5 font-mono text-[11px] text-slate-500">
          {a.ts} · {a.caseId} · {a.type}
        </div>
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  const { state, set, log, toast, exportBrief, setCase } = useStore()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [drawer, setDrawer] = useState(null)
  const ids = filter === 'All' ? CASE_IDS : [filter]
  const cases = ids.map((id) => CASES[id])

  const kpi = useMemo(() => {
    const total = cases.reduce((s, c) => s + c.assets.reduce((x, a) => x + a.value, 0), 0)
    const inst = filter === 'All' ? 4 : new Set(cases[0].assets.map((a) => a.inst)).size
    const docs = cases.reduce((s, c) => s + c.docs.length, 0)
    const readiness = Math.round(cases.reduce((s, c) => s + readinessOf(state, c.id), 0) / cases.length)
    return { open: cases.length, total, inst, docs, readiness }
  }, [cases, filter, state])

  const actions = cases.flatMap((c) => c.actions.map((a) => ({ ...a, caseId: c.id })))
  const missing = cases.flatMap((c) => c.missing.map((m) => ({ ...m, caseId: c.id })))
  const claims = cases.flatMap((c) => c.claims.map((m) => ({ ...m, caseId: c.id })))
  const audit = state.audit.filter((a) => ids.includes(a.caseId))
  const briefCase = filter === 'All' ? state.caseId : filter
  const hl = state.highlight

  const isHl = (key) => hl && key && key.toLowerCase().includes(hl.toLowerCase())

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="label">Unified dashboard</div>
          <h1 className="font-display text-4xl font-bold text-white">Every rupee. Every institution. Every next step.</h1>
        </div>
      </div>

      <div id="kpis" className="mb-5 grid grid-cols-5 gap-4">
        {[
          ['Open cases', <CountUp key={`a${filter}`} value={kpi.open} />, 'text-white'],
          ['Identified', <CountUp key={`b${filter}`} value={kpi.total} format={inr} />, 'text-gold'],
          ['Institutions', <CountUp key={`c${filter}`} value={kpi.inst} />, 'text-white'],
          ['Documents', <CountUp key={`d${filter}`} value={kpi.docs} />, 'text-white'],
          ['Avg readiness', <span key={`e${filter}`}><CountUp value={kpi.readiness} />%</span>, 'text-gold'],
        ].map(([label, v, cls]) => (
          <Card key={label} className={cx('py-4', label === 'Identified' && 'border-gold/30')}>
            <div className="label">{label}</div>
            <div className={cx('mt-1 font-display text-[34px] font-bold leading-tight', cls)}>{v}</div>
          </Card>
        ))}
      </div>

      <Tabs
        className="mb-5"
        tabs={[{ key: 'All', label: 'All cases' }, ...CASE_IDS.map((id) => ({ key: id, label: id }))]}
        value={filter}
        onChange={(f) => {
          setFilter(f)
          set({ highlight: null })
          if (f !== 'All') setCase(f)
          toast('ai', f === 'All' ? 'Showing all 5 cases' : `Filtered to ${f} · ${CASES[f].title}`)
        }}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-5">
        <div id="quadrants" className="grid grid-cols-2 gap-5">
          <Quadrant n={1} title="Next Action + Responsible Institution" icon={<ArrowRight size={16} />}>
            {actions.map((a) => (
              <button
                key={a.caseId + a.text}
                onClick={() => {
                  set({ highlight: hl === a.ref ? null : a.ref })
                  toast('gold', `Highlighted items linked to “${a.text}”`)
                }}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition',
                  hl === a.ref ? 'border-gold/50 bg-gold/10' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20',
                )}
              >
                <span className="flex-1">
                  <span className="font-semibold text-white">{a.text}</span>
                  <span className="text-slate-400"> → {a.inst}</span>
                </span>
                <Chip tone={a.when === 'today' ? 'gold' : a.when.includes('left') ? 'miss' : 'muted'}>{a.when}</Chip>
              </button>
            ))}
          </Quadrant>

          <Quadrant n={2} title="Missing Documents + Official Instrument" icon={<FileWarning size={16} />}>
            {missing.map((m) => {
              const done = state.requested[m.id] || (m.caseId === 'FLX-8842' && state.j2Checked[m.id])
              return (
                <div
                  key={m.caseId + m.id}
                  className={cx(
                    'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition',
                    isHl(m.id) ? 'border-gold/50 bg-gold/10' : 'border-white/[0.06] bg-white/[0.02]',
                  )}
                >
                  <motion.span animate={{ scale: done ? [1, 1.5, 1] : 1 }} className={cx('h-3 w-3 shrink-0 rounded-full', done ? 'bg-ok' : 'bg-miss shadow-[0_0_8px_#F87171]')} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-white">{m.doc}</span>
                    <span className="block truncate text-xs text-slate-400">{m.instrument}</span>
                  </span>
                  <button
                    onClick={() => {
                      set((s) => ({ requested: { ...s.requested, [m.id]: !s.requested[m.id] } }))
                      if (!done) {
                        log(m.caseId, 'letter', `${m.doc} requested from ${m.instrument}`)
                        toast('ok', `${m.doc} requested`)
                      } else toast('info', `${m.doc} marked outstanding`)
                    }}
                    className={cx('btn py-1.5 text-xs', done ? 'btn-ok py-1.5' : 'btn-ghost py-1.5')}
                  >
                    {done ? 'requested ✓' : 'mark requested'}
                  </button>
                </div>
              )
            })}
          </Quadrant>

          <Quadrant n={3} title="Claim References + Evidence-Linked Actions" icon={<Link2 size={16} />}>
            {claims.length ? (
              claims.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setDrawer(c)}
                  className={cx(
                    'w-full rounded-xl border px-3.5 py-3 text-left transition hover:border-ai/40',
                    isHl(c.id) ? 'border-gold/50 bg-gold/10' : 'border-white/[0.06] bg-white/[0.02]',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="num font-mono font-semibold text-ai">{c.id}</span>
                    <span className="text-xs text-slate-400">{c.inst}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.docs.map((d) => (
                      <Chip key={d}>{d}</Chip>
                    ))}
                  </div>
                </button>
              ))
            ) : (
              <Empty icon={<Link2 size={20} />} title="No claims yet" body="Consent comes first on this case." cta={<button onClick={() => navigate('/journey/6/workspace')} className="btn-ai">Open consent gateway</button>} />
            )}
          </Quadrant>

          <Quadrant n={4} title="Rejections + Cause Resolution" icon={<RotateCcw size={16} />}>
            {ids.includes('FLX-7301') ? (
              <button onClick={() => navigate('/journey/5/workspace')} className="w-full rounded-xl border border-miss/30 bg-miss/[0.06] p-4 text-left hover:border-miss/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">FLX-7301 · LIC 881204557</span>
                  <Chip tone="miss">NDC-04</Chip>
                </div>
                <div className="mt-1 text-sm text-slate-400">Nominee deceased → legal heirship required · 61 days left</div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>resolution in progress</span>
                  <span className="num text-ok">60%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 1.2, delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-miss to-ok" />
                </div>
              </button>
            ) : (
              <Empty icon={<CheckCircle2 size={20} className="text-ok" />} title="No rejections on this case" body="Nothing has been refused by an institution." cta={<button onClick={() => setFilter('FLX-7301')} className="btn-ghost">View FLX-7301</button>} />
            )}
          </Quadrant>
        </div>

        <Card className="flex max-h-[760px] flex-col">
          <div className="mb-2 flex items-center justify-between">
            <div className="label">Audit log</div>
            <button onClick={() => navigate('/ledger')} className="text-xs text-ai hover:underline">Open ledger →</button>
          </div>
          <div className="-mx-2 flex-1 space-y-0.5 overflow-auto">
            <AnimatePresence initial={false}>
              {audit.map((a, i) => (
                <AuditRow key={a.id} a={a} flash={i === 0} />
              ))}
            </AnimatePresence>
          </div>
        </Card>
      </div>

      <BriefPreview caseId={briefCase} onDownload={() => exportBrief(briefCase)} />
      <Moat />

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer ? `Evidence · ${drawer.id}` : ''}>
        {drawer && (
          <div>
            <div className="text-sm text-slate-400">{CASES[drawer.caseId].title} · {drawer.inst}</div>
            <div className="mt-4 label">Linked documents</div>
            <div className="mt-2 space-y-2">
              {drawer.docs.map((d) => (
                <button key={d} onClick={() => toast('info', `${d} — opened in viewer (demo)`)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left hover:border-ai/40">
                  <FileText size={16} className="text-ai" />
                  <span className="flex-1 text-sm text-slate-100">{d}</span>
                  <Chip tone="ok">verified</Chip>
                </button>
              ))}
            </div>
            <div className="mt-5 label">Evidence trail</div>
            <div className="mt-2">
              {state.audit.filter((a) => a.caseId === drawer.caseId).slice(0, 8).map((a) => <AuditRow key={a.id} a={a} />)}
            </div>
            <button
              onClick={() => {
                log(drawer.caseId, 'letter', `Evidence pack for ${drawer.id} assembled`)
                toast('ok', 'Evidence pack assembled for submission')
              }}
              className="btn-ai mt-5 w-full"
            >
              Assemble evidence pack
            </button>
          </div>
        )}
      </Drawer>
    </div>
  )
}

function Quadrant({ n, title, icon, children }) {
  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="num grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] text-xs font-bold text-slate-300">{n}</span>
        <span className="text-slate-400">{icon}</span>
        <span className="font-display font-semibold text-white">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </Card>
  )
}

function BriefPreview({ caseId, onDownload }) {
  const { state } = useStore()
  const md = buildBrief(state, caseId)
  const [flying, setFlying] = useState(false)
  useEffect(() => {
    if (!state.briefPulse) return
    setFlying(true)
    const t = setTimeout(() => setFlying(false), 1400)
    return () => clearTimeout(t)
  }, [state.briefPulse])
  return (
    <Card id="brief" glow="brief" className="relative mt-5 overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-brief">
          <ScrollText size={18} /> <span className="label text-brief">Case brief · {caseId}</span>
        </div>
        <button onClick={onDownload} className="btn-brief"><Download size={16} /> Download Case Brief (.md)</button>
      </div>
      <pre className="max-h-[220px] overflow-hidden whitespace-pre-wrap rounded-xl bg-black/30 p-4 font-mono text-[13px] leading-relaxed text-slate-300 [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
        {md.split('\n').slice(0, 22).join('\n')}
      </pre>
      <AnimatePresence>
        {flying && (
          <motion.div
            className="pointer-events-none absolute inset-0 grid place-items-center bg-brief/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.6, y: 40, opacity: 0 }}
              animate={{ scale: [0.6, 1.1, 1], y: [40, 0, -10], opacity: 1 }}
              exit={{ y: -120, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.8 }}
              className="flex items-center gap-3 rounded-2xl border border-brief/50 bg-ink-800/95 px-6 py-4 shadow-[0_0_60px_-10px_rgba(167,139,250,0.7)]"
            >
              <FileText className="text-brief" size={28} />
              <div>
                <div className="font-display font-bold text-white">case-brief-{caseId}.md</div>
                <div className="text-xs text-brief">audit trail included</div>
              </div>
              <CheckCircle2 className="text-ok" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

const MOAT = [
  [Boxes, 'Reusable journey engine across scenarios'],
  [Radar, 'Discovery intelligence + institutional data sync'],
  [Route, 'Official portal routing with audit-ready evidence'],
  [BookOpen, 'One playbook across fragmented processes'],
]
export function Moat() {
  const { toast } = useStore()
  return (
    <div id="moat" className="mt-5">
      <div className="label mb-3 text-brief">Core moat</div>
      <div className="grid grid-cols-4 gap-4">
        {MOAT.map(([Icon, t], i) => (
          <motion.button
            key={t}
            whileHover={{ y: -6 }}
            onClick={() => toast('brief', t)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass border-brief/25 bg-brief/[0.06] p-5 text-left hover:border-brief/50 hover:shadow-[0_20px_50px_-20px_rgba(167,139,250,0.6)]"
          >
            <Icon className="text-brief" size={24} />
            <div className="mt-3 font-display text-lg font-semibold leading-snug text-white">{t}</div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
