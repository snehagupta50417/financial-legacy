import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Check, Loader2, Play, RotateCcw, ArrowRight, Sparkles, FileText, Gem } from 'lucide-react'
import { useStore } from '../store'
import { Card, Chip, Cursor, Empty } from './ui'
import { clock, cx } from '../lib/util'

const stepOf = (line, i) => {
  if (line.startsWith('EXTRACT')) return 1
  if (line.startsWith('REASON')) return 2
  if (line.startsWith('VERIFY')) return 3
  return i === 0 ? 0 : 4
}

export function startRun(store, j) {
  const { set, log, state } = store
  const uploads = state.uploads[j.id].length ? state.uploads[j.id] : j.samples
  set((s) => ({
    runs: { ...s.runs, [j.id]: 'running' },
    uploads: { ...s.uploads, [j.id]: uploads },
    spotlight: j.special != null ? 'off' : s.spotlight,
  }))
  log(j.caseId, 'extracted', `Agent run started on ${uploads.length} documents`)
}

export default function AgentRun({ j }) {
  const store = useStore()
  const { state, set, log, toast, demo } = store
  const navigate = useNavigate()
  const status = state.runs[j.id]
  const total = j.lines.reduce((s, l) => s + l.length, 0)
  const [pos, setPos] = useState(() => (status === 'done' ? { line: j.lines.length, ch: 0 } : { line: 0, ch: 0 }))
  const [tokens, setTokens] = useState(status === 'done' ? Math.round(total * 1.9) : 0)
  const specialRef = useRef(null)
  const [rect, setRect] = useState(null)
  const spotRef = useRef(state.spotlight)
  spotRef.current = state.spotlight
  const demoRef = useRef(demo)
  demoRef.current = demo
  const panelRef = useRef(null)

  const posRef = useRef(pos)

  // reset on (re)start
  useEffect(() => {
    if (status === 'running') {
      posRef.current = { line: 0, ch: 0 }
      setPos(posRef.current)
      setTokens(0)
    }
    if (status === 'done') {
      posRef.current = { line: j.lines.length, ch: 0 }
      setPos(posRef.current)
    }
  }, [status, j.lines.length])

  // streaming ticker
  useEffect(() => {
    if (status !== 'running') return
    const per = Math.max(1, Math.ceil(total / ((j.duration * (demoRef.current ? 1.35 : 1)) / 30)))
    const id = setInterval(() => {
      if (clock.paused) return
      const sp = spotRef.current
      if (sp === 'pending' || sp === 'on') return
      const p = posRef.current
      if (p.line >= j.lines.length) return
      const ch = p.ch + per
      let next = { line: p.line, ch }
      if (ch >= j.lines[p.line].length) {
        next = { line: p.line + 1, ch: 0 }
        if (p.line === j.special && sp === 'off') {
          spotRef.current = demoRef.current ? 'pending' : 'on'
          set({ spotlight: spotRef.current })
        }
      }
      posRef.current = next
      setPos(next)
      setTokens((t) => t + per * 1.9)
    }, 30)
    return () => clearInterval(id)
  }, [status, j, total, set])

  // finish
  useEffect(() => {
    if (status === 'running' && pos.line >= j.lines.length) {
      set((s) => ({ runs: { ...s.runs, [j.id]: 'done' } }))
      log(j.caseId, 'extracted', `Agent completed ${j.steps.length}-step run · ${j.lines.length} findings`)
      toast('ok', 'Agent run complete — workspace ready')
    }
  }, [pos, status, j, set, log, toast])

  // auto-scroll reasoning panel
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = panelRef.current.scrollHeight
  }, [pos.line])

  // spotlight on
  useEffect(() => {
    if (j.special == null || state.spotlight !== 'on') return
    setRect(specialRef.current?.getBoundingClientRect() ?? null)
    log(j.caseId, 'inferred', 'Hidden asset inferred: HDFC Fixed Deposit ≈ ₹4,20,000 (0.93)')
    toast('gold', 'Hidden asset discovered — HDFC FD ≈ ₹4,20,000')
    if (!demoRef.current) {
      const t = setTimeout(() => set((s) => (s.spotlight === 'on' ? { spotlight: 'done' } : {})), 4500)
      return () => clearTimeout(t)
    }
  }, [state.spotlight, j, log, toast, set])

  const activeStep = status === 'done' ? 5 : status === 'running' ? stepOf(j.lines[Math.min(pos.line, j.lines.length - 1)], pos.line) : -1
  const pct = status === 'done' ? 100 : Math.round((j.lines.slice(0, pos.line).reduce((s, l) => s + l.length, 0) + pos.ch) / total * 100)

  if (status === 'idle') {
    return (
      <Card className="p-8">
        <Empty
          icon={<Bot size={28} className="text-ai" />}
          title="The agent is ready"
          body={
            state.uploads[j.id].length
              ? `${state.uploads[j.id].length} documents queued. The agent will plan, extract, reason across documents, verify and build an action plan.`
              : 'No documents yet — the agent will use the sample documents for this journey.'
          }
          cta={
            <button onClick={() => startRun(store, j)} className="btn-ai px-6 py-3 text-base">
              <Play size={18} /> {state.uploads[j.id].length ? 'Run agent' : 'Load samples & run agent'}
            </button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5">
      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div className="label">Agent pipeline</div>
          <Chip tone={status === 'done' ? 'ok' : 'ai'}>
            {status === 'done' ? <Check size={12} /> : <Loader2 size={12} className="animate-spin" />}
            {status === 'done' ? 'Complete' : `Running · ${pct}%`}
          </Chip>
        </div>
        <ol className="space-y-3">
          {j.steps.map((s, i) => {
            const done = i < activeStep
            const active = i === activeStep
            return (
              <motion.li
                key={s}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cx(
                  'flex items-center gap-4 rounded-xl border px-4 py-3.5 transition',
                  active ? 'border-ai/40 bg-ai/10' : done ? 'border-ok/20 bg-ok/[0.06]' : 'border-white/[0.06] bg-white/[0.02]',
                )}
              >
                <span
                  className={cx(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold',
                    done ? 'bg-ok/20 text-ok' : active ? 'bg-ai/20 text-ai' : 'bg-white/5 text-slate-500',
                  )}
                >
                  {done ? <Check size={16} /> : active ? <Loader2 size={16} className="animate-spin" /> : i + 1}
                </span>
                <div className="flex-1">
                  <div className={cx('font-semibold', done || active ? 'text-white' : 'text-slate-500')}>{s}</div>
                  {active && (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-ai to-transparent bg-[length:200%_100%]" />
                    </div>
                  )}
                </div>
              </motion.li>
            )
          })}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          {state.uploads[j.id].map((f) => (
            <Chip key={f} tone="muted"><FileText size={12} /> {f}</Chip>
          ))}
        </div>
        {status === 'done' && (
          <div className="mt-6 flex gap-3">
            <button onClick={() => navigate(`/journey/${j.id}/workspace`)} className="btn-gold">
              Open workspace <ArrowRight size={16} />
            </button>
            <button onClick={() => startRun(store, j)} className="btn-ghost"><RotateCcw size={15} /> Re-run</button>
          </div>
        )}
      </Card>

      <Card glow="ai" className="flex flex-col">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-ai">
            <Sparkles size={16} /> <span className="label text-ai">Reasoning stream</span>
          </div>
          <div className="num rounded-lg bg-black/30 px-2.5 py-1 font-mono text-xs text-slate-300">
            tokens <span className="text-ai">{Math.round(tokens).toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div ref={panelRef} className="h-[440px] space-y-2.5 overflow-auto rounded-xl bg-black/30 p-4 font-mono text-[15px] leading-relaxed">
          {j.lines.map((l, i) => {
            if (i > pos.line) return null
            const text = i < pos.line ? l : l.slice(0, pos.ch)
            const special = i === j.special
            const tag = l.split(' ')[0]
            return (
              <div
                key={i}
                ref={special ? specialRef : null}
                className={cx(
                  'rounded-lg px-2 py-1',
                  special && i < pos.line && 'bg-gold/10 text-gold ring-1 ring-gold/30',
                  special && state.highlight === 'step3' && 'ring-2 ring-gold shadow-[0_0_30px_-6px_rgba(245,197,66,0.7)]',
                  !special && 'text-slate-300',
                )}
              >
                <span className={cx('mr-1 font-bold', special ? 'text-gold' : tag === 'REASON' ? 'text-brief' : tag === 'VERIFY' ? 'text-ok' : 'text-ai')}>
                  {text.slice(0, tag.length)}
                </span>
                {text.slice(tag.length)}
                {i === pos.line && status === 'running' && <Cursor />}
              </div>
            )
          })}
          {status === 'done' && (
            <div className="pt-2 text-ok">✓ done <Cursor className="bg-ok" /></div>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {j.special != null && state.spotlight === 'on' && (
          <Spotlight rect={rect} onClose={() => set({ spotlight: 'done' })} />
        )}
      </AnimatePresence>
    </div>
  )
}

function Spotlight({ rect, onClose }) {
  const W = 620
  const H = 330
  const from = rect
    ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height, opacity: 0.4 }
    : { left: `calc(50% - ${W / 2}px)`, top: `calc(50% - ${H / 2}px)`, width: W, height: H, opacity: 0, scale: 0.8 }
  return (
    <motion.div
      className="fixed inset-0 z-[90]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />
      <motion.div
        initial={from}
        animate={{ left: `calc(50% - ${W / 2}px)`, top: `calc(50% - ${H / 2}px)`, width: W, height: H, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 140 }}
        className="absolute overflow-hidden rounded-3xl border border-gold/60 bg-gradient-to-br from-[#2a2410] to-ink-800 p-8 shadow-[0_0_120px_-10px_rgba(245,197,66,0.6)]"
      >
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <div className="flex items-center gap-3 text-gold">
            <Gem size={26} />
            <span className="label text-gold">Hidden Asset Discovered</span>
          </div>
          <div className="mt-4 font-display text-[44px] font-bold leading-none text-white">
            HDFC Fixed Deposit
          </div>
          <div className="num mt-3 font-display text-5xl font-extrabold text-gold">≈ ₹4,20,000</div>
          <div className="mt-4 text-[15px] text-slate-300">
            ₹2,800/month recurring credit × 12 ÷ 8% p.a. · not in any uploaded document
          </div>
          <div className="mt-4 flex gap-2">
            <Chip tone="gold">confidence 0.93</Chip>
            <Chip tone="muted">source: HDFC Statement p.3</Chip>
            <Chip tone="miss">verify with FD receipt</Chip>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
