import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Vault, Download, Clapperboard, Search, CheckCircle2, AlertTriangle, Sparkles, Info, FileText,
  RotateCcw, Maximize, Minimize, ChevronDown, ChevronRight, Wrench, XCircle, Shield,
} from 'lucide-react'
import { useStore } from '../store'
import { CASES, CASE_IDS, JOURNEYS } from '../data'
import { cx } from '../lib/util'

export const openPalette = () => window.dispatchEvent(new CustomEvent('fl:palette'))

export function TopNav() {
  const { state, setCase, exportBrief, demo, setDemo, toast } = useStore()
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()
  const c = CASES[state.caseId]
  const link = ({ isActive }) =>
    cx('whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition', isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-900/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-4 px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/30">
            <Vault size={20} />
          </span>
          <span className="whitespace-nowrap font-display text-lg font-bold tracking-tight text-white">
            FinLegacy <span className="text-gold">AI</span>
          </span>
        </Link>
        <nav className="ml-4 flex items-center gap-1">
          <NavLink to="/" end className={link}>Journeys</NavLink>
          <NavLink to="/dashboard" className={link}>Dashboard</NavLink>
          <NavLink to="/ledger" className={link}>Ledger</NavLink>
        </nav>
        <div className="relative ml-2">
          <button
            onClick={() => setMenu((m) => !m)}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm hover:bg-white/10"
          >
            <span className="h-2 w-2 rounded-full bg-ai shadow-[0_0_8px_#22D3EE]" />
            <span className="num font-semibold text-white">{c.id}</span>
            <span className="hidden text-slate-400 xl:inline">· {c.title}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="glass absolute left-0 top-11 z-50 w-80 bg-ink-800/95 p-1.5"
              >
                {CASE_IDS.map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      setCase(id)
                      setMenu(false)
                      toast('ai', `Switched to case ${id}`)
                      navigate(`/journey/${CASES[id].journey}/workspace`)
                    }}
                    className={cx(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10',
                      id === state.caseId && 'bg-white/[0.06]',
                    )}
                  >
                    <span>
                      <span className="num font-semibold text-white">{id}</span>
                      <span className="block text-xs text-slate-400">{CASES[id].subtitle}</span>
                    </span>
                    <ChevronRight size={14} className="text-slate-500" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={openPalette} className="btn-ghost whitespace-nowrap px-3" title="Search (Ctrl+K)">
            <Search size={16} />
            <kbd className="hidden whitespace-nowrap rounded bg-white/10 px-1.5 text-[11px] text-slate-300 lg:inline">Ctrl K</kbd>
          </button>
          <button onClick={() => exportBrief()} className="btn-brief whitespace-nowrap" title="Export Case Brief (.md)">
            <Download size={16} /> <span className="hidden lg:inline">Export Case Brief (.md)</span>
          </button>
          <button
            onClick={() => setDemo(!demo)}
            className={cx('btn-gold whitespace-nowrap', !demo && 'animate-pulsegold')}
          >
            <Clapperboard size={16} /> {demo ? 'Exit Demo' : 'Demo Mode'}
          </button>
        </div>
      </div>
    </header>
  )
}

const TOAST = {
  ok: { icon: CheckCircle2, cls: 'text-ok border-ok/30' },
  ai: { icon: Sparkles, cls: 'text-ai border-ai/30' },
  gold: { icon: Sparkles, cls: 'text-gold border-gold/40' },
  miss: { icon: XCircle, cls: 'text-miss border-miss/30' },
  warn: { icon: AlertTriangle, cls: 'text-warn border-warn/30' },
  brief: { icon: FileText, cls: 'text-brief border-brief/30' },
  info: { icon: Info, cls: 'text-slate-200 border-white/15' },
  lock: { icon: Shield, cls: 'text-warn border-warn/30' },
}
export function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="pointer-events-none fixed right-6 top-20 z-[120] flex w-[400px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const k = TOAST[t.kind] || TOAST.info
          const Icon = k.icon
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className={cx('glass pointer-events-auto flex items-start gap-3 bg-ink-800/90 px-4 py-3', k.cls)}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <span className="text-sm font-medium text-slate-100">{t.text}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export function PresenterToolbar() {
  const { restart, demo, setDemo, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [fs, setFs] = useState(false)
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])
  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.().catch(() => toast('warn', 'Fullscreen blocked by the browser'))
  }
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="glass flex items-center gap-1 bg-ink-800/90 p-1.5"
          >
            <button onClick={restart} className="btn-ghost border-0 px-3 py-2"><RotateCcw size={15} /> Restart Demo</button>
            <button onClick={toggleFs} className="btn-ghost border-0 px-3 py-2">
              {fs ? <Minimize size={15} /> : <Maximize size={15} />} {fs ? 'Exit full' : 'Fullscreen'}
            </button>
            <button onClick={() => setDemo(!demo)} className="btn-ghost border-0 px-3 py-2 text-gold">
              <Clapperboard size={15} /> {demo ? 'Stop demo' : 'Demo Mode'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Presenter toolbar"
        className={cx('glass grid h-12 w-12 place-items-center bg-ink-800/90 text-slate-300 hover:text-white', open && 'text-gold')}
      >
        <Wrench size={18} />
      </button>
    </div>
  )
}

export function journeyById(id) {
  return JOURNEYS.find((j) => j.id === Number(id))
}
