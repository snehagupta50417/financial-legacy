import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Compass, LayoutDashboard, ScrollText, Play, Download, Clapperboard, RotateCcw, CornerDownLeft } from 'lucide-react'
import { useStore } from '../store'
import { JOURNEYS } from '../data'
import { ICONS } from '../lib/icons'
import { startRun } from './AgentRun'
import { cx } from '../lib/util'

function fuzzy(q, s) {
  q = q.toLowerCase()
  s = s.toLowerCase()
  if (!q) return 1
  if (s.includes(q)) return 2 + q.length / s.length
  let i = 0
  for (const ch of s) if (ch === q[i]) i++
  return i === q.length ? 1 : 0
}

export default function CommandPalette() {
  const store = useStore()
  const { state, exportBrief, demo, setDemo, restart, toast } = store
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef(null)

  useEffect(() => {
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const ev = () => setOpen(true)
    window.addEventListener('keydown', key)
    window.addEventListener('fl:palette', ev)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('fl:palette', ev)
    }
  }, [])
  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      setTimeout(() => input.current?.focus(), 30)
    }
  }, [open])

  const items = useMemo(() => {
    const cj = JOURNEYS.find((j) => j.caseId === state.caseId) || JOURNEYS[1]
    const all = [
      ...JOURNEYS.map((j) => ({ label: `Journey ${j.id} — ${j.name}`, hint: j.line, icon: ICONS[j.icon], run: () => navigate(`/journey/${j.id}/scenario`) })),
      { label: 'Dashboard', hint: 'Unified view of all cases', icon: LayoutDashboard, run: () => navigate('/dashboard') },
      { label: 'Ledger', hint: 'Audit log & consent records', icon: ScrollText, run: () => navigate('/ledger') },
      { label: 'Home — journey selector', hint: 'One engine. Seven journeys.', icon: Compass, run: () => navigate('/') },
      {
        label: 'Run Agent',
        hint: `On ${cj.name} (${cj.caseId})`,
        icon: Play,
        run: () => {
          startRun(store, cj)
          navigate(`/journey/${cj.id}/agent`)
        },
      },
      { label: 'Export Brief', hint: `Download case-brief-${state.caseId}.md`, icon: Download, run: () => exportBrief() },
      { label: 'Toggle Demo Mode', hint: demo ? 'Stop the scripted demo' : 'Start the 80-second scripted demo', icon: Clapperboard, run: () => setDemo(!demo) },
      { label: 'Restart Demo', hint: 'Reset all state', icon: RotateCcw, run: restart },
    ]
    return all
      .map((x) => ({ ...x, score: Math.max(fuzzy(q, x.label), fuzzy(q, x.hint) * 0.8) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
  }, [q, state.caseId, demo, navigate, exportBrief, setDemo, restart, store])

  const go = (it) => {
    setOpen(false)
    it.run()
    if (!['Export Brief', 'Restart Demo', 'Toggle Demo Mode'].includes(it.label)) toast('ai', it.label)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/60 pt-[14vh] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div
            initial={{ y: -12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -12, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass w-[680px] overflow-hidden bg-ink-800/90"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Search size={20} className="text-slate-400" />
              <input
                ref={input}
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setSel(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setSel((s) => Math.min(items.length - 1, s + 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setSel((s) => Math.max(0, s - 1))
                  } else if (e.key === 'Enter' && items[sel]) go(items[sel])
                  else if (e.key === 'Escape') setOpen(false)
                }}
                placeholder="Search journeys, pages, actions…"
                className="flex-1 bg-transparent text-lg text-white outline-none placeholder:text-slate-500"
              />
              <kbd className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-400">Esc</kbd>
            </div>
            <div className="max-h-[420px] overflow-auto p-2">
              {items.map((it, i) => {
                const Icon = it.icon
                return (
                  <button
                    key={it.label}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(it)}
                    className={cx('flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left', i === sel ? 'bg-gold/15 ring-1 ring-gold/40' : '')}
                  >
                    <Icon size={18} className={i === sel ? 'text-gold' : 'text-slate-400'} />
                    <span className="flex-1">
                      <span className={cx('block font-semibold', i === sel ? 'text-gold' : 'text-white')}>{it.label}</span>
                      <span className="block text-xs text-slate-400">{it.hint}</span>
                    </span>
                    {i === sel && <CornerDownLeft size={15} className="text-gold" />}
                  </button>
                )
              })}
              {!items.length && <div className="px-4 py-8 text-center text-sm text-slate-500">No matches for “{q}”</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
