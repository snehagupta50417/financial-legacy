import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, animate } from 'framer-motion'
import { X } from 'lucide-react'
import { clock, cx } from '../lib/util'

export function Card({ className, children, glow, ...rest }) {
  const glowCls = {
    gold: 'border-gold/40 shadow-[0_0_40px_-12px_rgba(245,197,66,0.45)]',
    ai: 'border-ai/30 shadow-[0_0_40px_-14px_rgba(34,211,238,0.4)]',
    brief: 'border-brief/30 shadow-[0_0_40px_-14px_rgba(167,139,250,0.45)]',
    miss: 'border-miss/30',
    ok: 'border-ok/30',
  }[glow]
  return (
    <div className={cx('glass p-5', glowCls, className)} {...rest}>
      {children}
    </div>
  )
}

const CHIP = {
  gold: 'bg-gold/15 text-gold border-gold/30',
  ok: 'bg-ok/15 text-ok border-ok/30',
  ai: 'bg-ai/15 text-ai border-ai/30',
  miss: 'bg-miss/15 text-miss border-miss/30',
  brief: 'bg-brief/15 text-brief border-brief/30',
  warn: 'bg-warn/15 text-warn border-warn/30',
  muted: 'bg-white/5 text-slate-300 border-white/10',
}
export function Chip({ tone = 'muted', className, children, onClick, active, title }) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      title={title}
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold transition',
        CHIP[tone],
        onClick && 'cursor-pointer hover:brightness-125 active:scale-95',
        active && 'ring-2 ring-offset-0 ring-current',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

export function Dot({ tone = 'ok', className }) {
  const c = { ok: 'bg-ok', miss: 'bg-miss', gold: 'bg-gold', ai: 'bg-ai', warn: 'bg-warn', muted: 'bg-slate-500' }[tone]
  return <span className={cx('inline-block h-2.5 w-2.5 rounded-full', c, className)} />
}

export function Ring({ value, size = 120, stroke = 10, label = 'Readiness', tone = 'gold' }) {
  const [shown, setShown] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const ctl = animate(prev.current, value, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (v) => setShown(v),
    })
    prev.current = value
    return () => ctl.stop()
  }, [value])
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = { gold: '#F5C542', ok: '#34D399', ai: '#22D3EE' }[tone]
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="num font-display text-2xl font-bold" style={{ color, fontSize: size * 0.22 }}>
          {Math.round(shown)}%
        </div>
        {label && <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>}
      </div>
    </div>
  )
}

export function CountUp({ value, format = (v) => Math.round(v).toLocaleString('en-IN'), duration = 1.6 }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const ctl = animate(0, value, { duration, ease: 'easeOut', onUpdate: setV })
    return () => ctl.stop()
  }, [value, duration])
  return <span className="num">{format(v)}</span>
}

export function useTypewriter(text, { speed = 18, start = true } = {}) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!start) return
    setN(0)
    const id = setInterval(() => {
      if (clock.paused) return
      setN((x) => {
        if (x >= text.length) {
          clearInterval(id)
          return x
        }
        return Math.min(text.length, x + 3)
      })
    }, speed)
    return () => clearInterval(id)
  }, [text, start, speed])
  return { out: text.slice(0, n), done: n >= text.length }
}

export function Cursor({ className }) {
  return <span className={cx('ml-0.5 inline-block h-[1.05em] w-[0.5em] translate-y-[0.15em] animate-blink bg-ai', className)} />
}

export function Modal({ open, onClose, title, children, wide, tone }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 20, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className={cx(
              'glass max-h-[88vh] w-full overflow-auto bg-ink-800/95 p-6',
              wide ? 'max-w-4xl' : 'max-w-xl',
              tone === 'miss' && 'border-miss/30',
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Drawer({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-[71] h-full w-[460px] max-w-full overflow-auto border-l border-white/10 bg-ink-800/95 p-6 backdrop-blur-xl"
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function Tabs({ tabs, value, onChange, tone = 'ai', className }) {
  const active = { ai: 'text-ai', gold: 'text-gold', brief: 'text-brief', miss: 'text-miss', ok: 'text-ok' }[tone]
  return (
    <div className={cx('inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1', className)}>
      {tabs.map((t) => {
        const k = t.key ?? t
        const on = value === k
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={cx(
              'relative rounded-lg px-3.5 py-2 text-sm font-semibold transition',
              on ? active : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {on && (
              <motion.span
                layoutId={`tab-${tabs.map((x) => x.key ?? x).join('')}`}
                className="absolute inset-0 rounded-lg bg-white/[0.08]"
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {t.icon}
              {t.label ?? t}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Empty({ icon, title, body, cta }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
      <div className="mb-3 rounded-2xl bg-white/5 p-3 text-slate-300">{icon}</div>
      <div className="font-display text-lg font-semibold text-white">{title}</div>
      {body && <p className="mt-1 max-w-md text-sm text-slate-400">{body}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  )
}

export function SectionTitle({ eyebrow, title, right, className }) {
  return (
    <div className={cx('mb-4 flex items-end justify-between gap-4', className)}>
      <div>
        {eyebrow && <div className="label mb-1">{eyebrow}</div>}
        <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>
      </div>
      {right}
    </div>
  )
}

export function Tip({ text, children, className }) {
  return (
    <span className={cx('group relative inline-flex', className)}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[260px] -translate-x-1/2 rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-xs text-slate-200 opacity-0 shadow-xl transition group-hover:opacity-100">
        {text}
      </span>
    </span>
  )
}

export function Typed({ text, className, speed = 14, start = true, onDone }) {
  const { out, done } = useTypewriter(text, { speed, start })
  const called = useRef(false)
  useEffect(() => {
    if (done && !called.current && start) {
      called.current = true
      onDone?.()
    }
  }, [done, start, onDone])
  return (
    <pre className={cx('whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200', className)}>
      {out}
      {!done && <Cursor />}
    </pre>
  )
}
