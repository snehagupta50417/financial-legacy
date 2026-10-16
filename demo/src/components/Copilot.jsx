import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, X, Send, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { Chip, Cursor } from './ui'
import { clock, cx } from '../lib/util'

const ANSWERS = {
  fd: {
    text:
      'Rohit’s father never uploaded an FD — but his HDFC savings statement shows a credit of ₹2,800 on the 1st of every month from the same internal account, labelled “INT PAYOUT”.\n\nThat is the signature of a monthly-payout fixed deposit. Working back:\n₹2,800 × 12 = ₹33,600 a year\n₹33,600 ÷ 8% p.a. ≈ ₹4,20,000 principal\n\nConfidence is 0.93 because the amount, timing and narration all match. It stays “inferred” until the family uploads the FD receipt.',
    cites: [
      { label: 'HDFC Statement p.3', go: '/journey/2/workspace', hl: 'src:HDFC Bank Statement' },
      { label: 'Reasoning step 3', go: '/journey/2/agent', hl: 'step3' },
    ],
  },
  week: {
    text:
      'Top 3 for this week:\n\n1. File LIC Form 3783 → LIC Branch 9C · today. It’s prefilled; Sunita just signs.\n2. Apply for the Legal Heir Certificate → Tehsildar, Haveli · takes ~12 days, so start now.\n3. Request the FD receipt → HDFC Bank · confirms the hidden ₹4,20,000.',
    cites: [
      { label: 'Dashboard · Next actions', go: '/dashboard', hl: 'lic' },
      { label: 'Missing documents', go: '/journey/2/workspace', hl: 'src:HDFC Bank Statement' },
    ],
  },
  safe: {
    text:
      'Consent first, always. Nothing is shared or opened until the person who owns the data says yes — and they can say “view-only” or revoke at any time.\n\nEvery action — upload, extraction, inference, letter, consent — is written to an audit log with a timestamp and the consent it relied on. In this demo nothing leaves your browser; in production, documents stay encrypted and no money ever moves through FinLegacy.',
    cites: [
      { label: 'Ledger · Consent', go: '/ledger', hl: null },
      { label: 'Journey 6 · Permission log', go: '/journey/6/workspace', hl: null },
    ],
  },
  other: {
    text: 'This is demo data — in the live product I’d answer from your case documents and the audit trail. Try one of the suggested questions.',
    cites: [],
  },
}
const SUGGEST = [
  ['How did you find the hidden FD?', 'fd'],
  ['What do we do this week?', 'week'],
  ["Is my family's data safe?", 'safe'],
]

export const openCopilot = (q) => window.dispatchEvent(new CustomEvent('fl:copilot', { detail: q }))

export default function Copilot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const { set, toast, resetKey } = useStore()
  const navigate = useNavigate()
  const body = useRef(null)

  useEffect(() => setMsgs([]), [resetKey])
  useEffect(() => {
    const h = (e) => {
      setOpen(true)
      if (e.detail) ask(e.detail)
    }
    window.addEventListener('fl:copilot', h)
    return () => window.removeEventListener('fl:copilot', h)
  })
  useEffect(() => {
    if (body.current) body.current.scrollTop = body.current.scrollHeight
  })

  const ask = (q, key) => {
    const k = key || SUGGEST.find(([s]) => s.toLowerCase() === q.toLowerCase())?.[1] || (/fd|hidden|deposit/i.test(q) ? 'fd' : /week|next|todo/i.test(q) ? 'week' : /safe|privacy|data/i.test(q) ? 'safe' : 'other')
    setMsgs((m) => [...m, { role: 'user', text: q }, { role: 'ai', key: k, id: Date.now() }])
    setInput('')
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        className="fixed bottom-24 right-6 z-[60] grid h-14 w-14 place-items-center rounded-2xl bg-ai text-ink-900 shadow-[0_10px_40px_-8px_rgba(34,211,238,0.7)]"
        title="Copilot"
      >
        {open ? <X size={22} /> : <Bot size={24} />}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass fixed bottom-40 right-6 z-[60] flex h-[560px] w-[440px] flex-col overflow-hidden border-ai/30 bg-ink-800/95"
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <Sparkles size={16} className="text-ai" />
              <span className="font-display font-semibold text-white">Copilot</span>
              <Chip tone="ai" className="ml-auto">FLX case-aware</Chip>
            </div>
            <div ref={body} className="flex-1 space-y-3 overflow-auto p-4">
              {!msgs.length && (
                <div className="text-sm text-slate-400">
                  Ask anything about the case. I cite where every answer comes from.
                </div>
              )}
              {msgs.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-white/10 px-3.5 py-2 text-sm text-white">{m.text}</div>
                ) : (
                  <Answer
                    key={m.id}
                    a={ANSWERS[m.key]}
                    onCite={(c) => {
                      set({ highlight: c.hl })
                      navigate(c.go)
                      toast('ai', `Source highlighted — ${c.label}`)
                    }}
                  />
                ),
              )}
            </div>
            <div className="border-t border-white/10 p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SUGGEST.map(([s, k]) => (
                  <Chip key={k} tone="ai" onClick={() => ask(s, k)}>{s}</Chip>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (input.trim()) ask(input.trim())
                }}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
              >
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this case…" className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
                <button className="text-ai hover:text-white"><Send size={16} /></button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Answer({ a, onCite }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      if (clock.paused) return
      setN((x) => {
        if (x >= a.text.length) {
          clearInterval(id)
          return x
        }
        return x + 4
      })
    }, 18)
    return () => clearInterval(id)
  }, [a])
  const done = n >= a.text.length
  return (
    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-ai/20 bg-ai/[0.06] px-3.5 py-2.5">
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
        {a.text.slice(0, n)}
        {!done && <Cursor />}
      </div>
      {done && a.cites.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex flex-wrap gap-1.5">
          {a.cites.map((c) => (
            <button key={c.label} onClick={() => onCite(c)} className={cx('rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[11px] text-gold hover:bg-gold/20')}>
              [{c.label}]
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}
