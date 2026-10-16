import { useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { UploadCloud, CheckCircle2, FileText, ArrowRight, Sparkles, MapPin, Users } from 'lucide-react'
import { useStore } from '../store'
import { CASES, JOURNEYS } from '../data'
import { ICONS } from '../lib/icons'
import { Card, Chip } from '../components/ui'
import AgentRun from '../components/AgentRun'
import { cx } from '../lib/util'
import J1 from '../journeys/J1'
import J2 from '../journeys/J2'
import J3 from '../journeys/J3'
import J4 from '../journeys/J4'
import J5 from '../journeys/J5'
import J6 from '../journeys/J6'
import J7 from '../journeys/J7'

const WORKSPACES = { 1: J1, 2: J2, 3: J3, 4: J4, 5: J5, 6: J6, 7: J7 }
const TABS = [
  ['scenario', 'Scenario'],
  ['upload', 'Upload'],
  ['agent', 'Agent Run'],
  ['workspace', 'Workspace'],
]

export default function Journey() {
  const { id, tab = 'scenario' } = useParams()
  const j = JOURNEYS.find((x) => x.id === Number(id))
  const { setCase, state } = useStore()
  useEffect(() => {
    if (j) setCase(j.caseId)
  }, [j, setCase])
  if (!j || !TABS.some(([k]) => k === tab)) return <Navigate to="/" replace />
  const Icon = ICONS[j.icon]
  const Workspace = WORKSPACES[j.id]
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <span className={cx('grid h-14 w-14 place-items-center rounded-2xl ring-1', j.star ? 'bg-gold/15 text-gold ring-gold/30' : 'bg-ai/10 text-ai ring-ai/25')}>
            <Icon size={28} />
          </span>
          <div>
            <div className="label">Journey {j.id} · Case {j.caseId}</div>
            <h1 className="font-display text-3xl font-bold text-white">{j.name}</h1>
          </div>
        </div>
        <nav className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
          {TABS.map(([k, label], i) => (
            <NavLink
              key={k}
              to={`/journey/${j.id}/${k}`}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                  isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white',
                )
              }
            >
              <span className="num grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[11px]">{i + 1}</span>
              {label}
              {k === 'agent' && state.runs[j.id] === 'done' && <CheckCircle2 size={14} className="text-ok" />}
              {k === 'upload' && state.uploads[j.id].length > 0 && <CheckCircle2 size={14} className="text-ok" />}
            </NavLink>
          ))}
        </nav>
      </div>
      {tab === 'scenario' && <Scenario j={j} />}
      {tab === 'upload' && <Upload j={j} />}
      {tab === 'agent' && <AgentRun key={j.id} j={j} />}
      {tab === 'workspace' && <Workspace j={j} />}
    </div>
  )
}

function Scenario({ j }) {
  const c = CASES[j.caseId]
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
      <Card glow={j.star ? 'gold' : undefined} className="flex flex-col justify-between p-8">
        <div>
          <div className="label mb-4">Scenario</div>
          <p className="font-display text-[34px] font-semibold leading-tight text-white">“{j.scenario}”</p>
        </div>
        <div className="mt-8 flex gap-3">
          <button onClick={() => navigate(`/journey/${j.id}/upload`)} className="btn-gold px-6 py-3 text-base">
            Start — add documents <ArrowRight size={18} />
          </button>
          <button onClick={() => navigate(`/journey/${j.id}/workspace`)} className="btn-ghost px-5 py-3">
            Skip to workspace
          </button>
        </div>
      </Card>
      <Card>
        <div className="label mb-3">Case {c.id}</div>
        <div className="font-display text-2xl font-semibold text-white">{c.person.name}</div>
        <div className="mt-1 flex items-center gap-3 text-slate-400">
          <span>{c.person.life}</span>
          <span className="flex items-center gap-1"><MapPin size={14} /> {c.person.city}</span>
          <Chip tone={c.person.status.startsWith('Deceased') ? 'muted' : 'ok'}>{c.person.status}</Chip>
        </div>
        <div className="mt-5 label flex items-center gap-2"><Users size={13} /> Family</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {c.heirs.map((h) => (
            <Chip key={h.name} tone="ai">{h.name} · {h.role}</Chip>
          ))}
        </div>
        <div className="mt-5 label">What the family has</div>
        <ul className="mt-2 space-y-2">
          {j.samples.map((s) => (
            <li key={s} className="flex items-center gap-2 text-sm text-slate-300">
              <FileText size={15} className="text-slate-500" /> {s}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

export function loadSamples(store, j) {
  const { set, log, toast, state } = store
  const have = state.uploads[j.id]
  const add = j.samples.filter((s) => !have.includes(s))
  if (!add.length) {
    toast('info', 'Sample documents already loaded')
    return
  }
  set((s) => ({ uploads: { ...s.uploads, [j.id]: [...s.uploads[j.id], ...add] } }))
  add.forEach((f) => log(j.caseId, 'uploaded', `${f} uploaded`))
  toast('ok', `${add.length} sample documents loaded`)
}

function Upload({ j }) {
  const store = useStore()
  const { state, set, log, toast } = store
  const [drag, setDrag] = useState(false)
  const input = useRef(null)
  const navigate = useNavigate()
  const files = state.uploads[j.id]
  const addFiles = (list) => {
    const names = Array.from(list).map((f) => f.name)
    if (!names.length) return
    set((s) => ({ uploads: { ...s.uploads, [j.id]: [...s.uploads[j.id], ...names.filter((n) => !s.uploads[j.id].includes(n))] } }))
    names.forEach((n) => log(j.caseId, 'uploaded', `${n} uploaded`))
    toast('ok', `${names.length} document${names.length > 1 ? 's' : ''} received`)
  }
  return (
    <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => input.current?.click()}
        className={cx(
          'glass flex min-h-[380px] cursor-pointer flex-col items-center justify-center border-2 border-dashed p-10 text-center transition',
          drag ? 'border-ai bg-ai/10' : 'border-white/15 hover:border-white/30',
        )}
      >
        <input ref={input} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        <motion.div animate={{ y: drag ? -6 : 0 }} className="mb-4 rounded-2xl bg-ai/10 p-4 text-ai">
          <UploadCloud size={40} />
        </motion.div>
        <div className="font-display text-2xl font-semibold text-white">Drop documents here</div>
        <p className="mt-2 max-w-md text-slate-400">Death certificates, statements, policies, letters — PDFs or photos. Nothing leaves this browser in the demo.</p>
        <button
          onClick={(e) => {
            e.stopPropagation()
            loadSamples(store, j)
          }}
          className="btn-ai mt-6 px-6 py-3 text-base"
        >
          <Sparkles size={18} /> Load sample documents
        </button>
      </div>
      <Card className="flex flex-col">
        <div className="mb-3 flex items-center justify-between">
          <div className="label">Received · {files.length}</div>
          {files.length > 0 && (
            <button
              onClick={() => {
                set((s) => ({ uploads: { ...s.uploads, [j.id]: [] } }))
                toast('info', 'Upload list cleared')
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <AnimatePresence initial={false}>
            {files.map((f, i) => (
              <motion.div
                key={f}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                className="flex items-center gap-3 rounded-xl border border-ok/20 bg-ok/[0.06] px-4 py-3"
              >
                <FileText size={18} className="text-slate-300" />
                <span className="flex-1 truncate text-sm text-slate-100">{f}</span>
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.12 + 0.2, type: 'spring' }}>
                  <CheckCircle2 size={18} className="text-ok" />
                </motion.span>
              </motion.div>
            ))}
          </AnimatePresence>
          {!files.length && (
            <div className="grid h-full min-h-[200px] place-items-center rounded-xl border border-dashed border-white/10 text-sm text-slate-500">
              No documents yet — drop files or load samples
            </div>
          )}
        </div>
        <button
          disabled={!files.length}
          onClick={() => navigate(`/journey/${j.id}/agent`)}
          className="btn-gold mt-4 w-full py-3"
        >
          Continue to agent run <ArrowRight size={16} />
        </button>
      </Card>
    </div>
  )
}
