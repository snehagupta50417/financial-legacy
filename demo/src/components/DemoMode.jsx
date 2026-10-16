import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play, SkipBack, SkipForward, X, Vault } from 'lucide-react'
import { useStore } from '../store'
import { JOURNEYS } from '../data'
import { startRun } from './AgentRun'
import { loadSamples } from '../pages/Journey'
import { decideConsent } from '../journeys/J6'
import { clock, cx, slowScroll } from '../lib/util'

const J2 = JOURNEYS[1]
const TOTAL = 80000
const later = (ms, fn) => setTimeout(fn, ms)

function chapters({ navigate, store }) {
  const { set, log, toast, exportBrief, stateRef } = store
  const top = () => window.scrollTo({ top: 0 })
  return [
    {
      t: 0,
      caption: '₹78,000+ crore is unclaimed. Not lost — unguided.',
      enter: () => {
        set((s) => ({
          bannerOpen: true,
          runs: { ...s.runs, 2: 'idle' },
          uploads: { ...s.uploads, 2: [] },
          spotlight: 'off',
          j2Checked: { fd: false, lhc: false },
          j5: { letter: false, escalated: 0, branch: 'rejected' },
          j6: { consent: 'pending' },
          highlight: null,
        }))
        navigate('/')
        top()
      },
      actions: [
        [2600, () => slowScroll(380, 3000)],
        [6400, () => slowScroll(0, 1200)],
      ],
    },
    {
      t: 8,
      caption: 'A family. Four documents. One question.',
      enter: () => {
        navigate('/journey/2/scenario')
        top()
      },
      actions: [
        [3200, () => navigate('/journey/2/upload')],
        [4400, () => loadSamples({ ...store, state: stateRef.current }, J2)],
      ],
    },
    {
      t: 16,
      caption: 'The agent reads everything.',
      enter: () => {
        set((s) => ({ runs: { ...s.runs, 2: 'idle' }, spotlight: 'off' }))
        navigate('/journey/2/agent')
        top()
      },
      actions: [[1900, () => startRun({ ...store, state: stateRef.current }, J2)]],
    },
    {
      t: 26,
      title: false,
      caption: 'It finds what no one uploaded.',
      enter: () => {
        const s = stateRef.current
        if (s.runs[2] !== 'running') {
          navigate('/journey/2/agent')
          set((x) => ({ runs: { ...x.runs, 2: 'done' }, uploads: { ...x.uploads, 2: J2.samples } }))
        }
        later(150, () => set({ spotlight: 'on' }))
      },
      actions: [
        [3300, () => set((s) => ({ spotlight: 'done', runs: { ...s.runs, 2: 'done' } }))],
        [3900, () => {
          navigate('/journey/2/workspace')
          top()
        }],
      ],
    },
    {
      t: 32,
      caption: 'Every rupee, every institution, every next step.',
      enter: () => {
        set((s) => ({ runs: { ...s.runs, 2: 'done' }, spotlight: s.spotlight === 'off' ? 'off' : 'done' }))
        navigate('/dashboard')
        top()
      },
      actions: [
        [2400, () => slowScroll('#quadrants', 3200)],
        [6200, () => {
          set({ highlight: 'lic' })
          toast('gold', 'Next action: File LIC Form 3783 → LIC · today')
        }],
        [8000, () => slowScroll('#brief', 3000)],
      ],
    },
    {
      t: 44,
      caption: "Rejected? There's a path.",
      enter: () => {
        set((s) => ({ j5: { ...s.j5, letter: false, escalated: 0 }, highlight: null }))
        navigate('/journey/5/workspace')
        top()
      },
      actions: [
        [2100, () => {
          set((s) => ({ j5: { ...s.j5, letter: true } }))
          log('FLX-7301', 'extracted', 'Reason code NDC-04 parsed · 61 days left in window')
          toast('miss', 'Rejection parsed — NDC-04 · 61 days left')
        }],
        [5200, () => slowScroll('#j5-letter', 2600)],
      ],
    },
    {
      t: 54,
      caption: 'Consent first. Every action logged.',
      enter: () => {
        set({ j6: { consent: 'pending' } })
        navigate('/journey/6/workspace')
        top()
      },
      actions: [
        [2000, () => decideConsent(store, 'approved')],
        [3900, () => {
          set((s) => ({ ledgerFlash: s.ledgerFlash + 1 }))
          navigate('/ledger')
          top()
        }],
      ],
    },
    {
      t: 60,
      caption: 'One engine. Seven journeys. One brief.',
      enter: () => {},
      actions: [
        [1700, () => { navigate('/journey/1/workspace'); top() }],
        [3200, () => { navigate('/journey/3/workspace'); top() }],
        [4700, () => { navigate('/journey/4/workspace'); top() }],
        [6200, () => { navigate('/journey/7/workspace'); top() }],
        [7500, () => {
          navigate('/dashboard')
          later(400, () => slowScroll('#brief', 700))
        }],
        [8600, () => exportBrief('FLX-8842', { silent: true })],
        [9200, () => slowScroll('#moat', 700)],
      ],
    },
    {
      t: 70,
      title: false,
      end: true,
      caption: 'FinLegacy AI. The guide between grieving families and cold institutions.',
      enter: () => {},
      actions: [],
    },
  ]
}

export default function DemoMode() {
  const store = useStore()
  const { demo, setDemo, toast } = store
  const navigate = useNavigate()
  const chRef = useRef(null)
  if (!chRef.current) chRef.current = chapters({ navigate, store })
  const elapsed = useRef(0)
  const fired = useRef(new Set())
  const cur = useRef(-1)
  const [ui, setUi] = useState({ ch: 0, ms: 0, paused: false })

  // keep the chapter closures pointing at the latest store functions
  chRef.current = chapters({ navigate, store })

  const jump = useCallback((i) => {
    const CH = chRef.current
    i = Math.max(0, Math.min(CH.length - 1, i))
    elapsed.current = CH[i].t * 1000
    fired.current = new Set()
    CH.forEach((c, ci) => ci < i && c.actions.forEach((_, ai) => fired.current.add(`${ci}-${ai}`)))
    cur.current = i
    CH[i].enter()
    setUi((u) => ({ ...u, ch: i, ms: elapsed.current }))
  }, [])

  // start / stop
  useEffect(() => {
    if (!demo) {
      clock.paused = false
      return
    }
    clock.paused = false
    setUi({ ch: 0, ms: 0, paused: false })
    jump(0)
    const id = setInterval(() => {
      if (clock.paused) return
      const CH = chRef.current
      elapsed.current = Math.min(TOTAL, elapsed.current + 100)
      let i = 0
      CH.forEach((c, ci) => {
        if (c.t * 1000 <= elapsed.current) i = ci
      })
      if (i !== cur.current) {
        cur.current = i
        CH[i].enter()
      }
      const start = CH[i].t * 1000
      CH[i].actions.forEach(([at, fn], ai) => {
        const k = `${i}-${ai}`
        if (!fired.current.has(k) && start + at <= elapsed.current) {
          fired.current.add(k)
          fn()
        }
      })
      setUi((u) => ({ ...u, ch: i, ms: elapsed.current }))
    }, 100)
    return () => clearInterval(id)
  }, [demo, jump])

  // keys
  useEffect(() => {
    if (!demo) return
    const h = (e) => {
      if (e.key === ' ') {
        e.preventDefault()
        clock.paused = !clock.paused
        setUi((u) => ({ ...u, paused: clock.paused }))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        jump(cur.current + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        jump(cur.current - 1)
      } else if (e.key === 'Escape') {
        setDemo(false)
        toast('info', 'Demo Mode exited')
      }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [demo, jump, setDemo, toast])

  if (!demo) return null
  const CH = chRef.current
  const ch = CH[ui.ch]
  const into = ui.ms - ch.t * 1000
  const showTitle = ch.title !== false && into < 1800

  const togglePause = () => {
    clock.paused = !clock.paused
    setUi((u) => ({ ...u, paused: clock.paused }))
  }

  return (
    <>
      <AnimatePresence>
        {showTitle && (
          <motion.div
            key={`t${ui.ch}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[150] grid place-items-center bg-ink-900/85 backdrop-blur-md"
          >
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }} className="max-w-5xl px-10 text-center">
              <div className="label mb-5 text-gold">Chapter {ui.ch + 1}</div>
              <div className="font-display text-6xl font-bold leading-tight text-white">{ch.caption}</div>
            </motion.div>
          </motion.div>
        )}
        {ch.end && (
          <motion.div
            key="end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[150] grid place-items-center bg-gradient-to-b from-ink-900 to-ink-800"
          >
            <div className="text-center">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="mx-auto mb-8 grid h-24 w-24 place-items-center rounded-3xl bg-gold/15 text-gold ring-1 ring-gold/40 shadow-[0_0_80px_-10px_rgba(245,197,66,0.6)]">
                <Vault size={48} />
              </motion.div>
              <div className="font-display text-7xl font-extrabold text-white">
                FinLegacy <span className="text-gold">AI</span>
              </div>
              <div className="mx-auto mt-5 max-w-3xl font-display text-3xl text-slate-300">The guide between grieving families and cold institutions.</div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-10 inline-block rounded-full border border-white/15 px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Built in 36 hours
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 z-[160] w-[880px] max-w-[calc(100vw-2rem)] -translate-x-1/2">
        <AnimatePresence mode="wait">
          {!showTitle && !ch.end && (
            <motion.div
              key={`c${ui.ch}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.5 }}
              className="mb-3 rounded-2xl border border-white/10 bg-black/80 px-6 py-3 text-center font-display text-2xl font-semibold text-white backdrop-blur"
            >
              {ch.caption}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/90 px-4 py-2.5 backdrop-blur">
          <button onClick={() => jump(ui.ch - 1)} className="text-slate-400 hover:text-white"><SkipBack size={16} /></button>
          <button onClick={togglePause} className="grid h-8 w-8 place-items-center rounded-full bg-gold text-ink-900">
            {ui.paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button onClick={() => jump(ui.ch + 1)} className="text-slate-400 hover:text-white"><SkipForward size={16} /></button>
          <div className="relative mx-2 h-2 flex-1 rounded-full bg-white/10">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gold" style={{ width: `${(ui.ms / TOTAL) * 100}%` }} />
            {CH.map((c, i) => (
              <button
                key={i}
                onClick={() => jump(i)}
                title={`Ch ${i + 1}: ${c.caption}`}
                className={cx('absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full', i <= ui.ch ? 'bg-gold' : 'bg-white/40', 'hover:scale-150')}
                style={{ left: `${((c.t * 1000) / TOTAL) * 100}%` }}
              />
            ))}
          </div>
          <span className="num w-20 text-right font-mono text-xs text-slate-400">
            {Math.floor(ui.ms / 60000)}:{String(Math.floor((ui.ms % 60000) / 1000)).padStart(2, '0')} / 1:20
          </span>
          <button onClick={() => setDemo(false)} className="text-slate-400 hover:text-white" title="Exit (Esc)"><X size={16} /></button>
        </div>
      </div>
    </>
  )
}
