import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { PenLine, Eraser, ShieldCheck, AlertTriangle, Fingerprint, Copy, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store'
import { Card, Chip, Tabs } from '../components/ui'
import { RunBanner } from './J2'
import { cx } from '../lib/util'

const NOMINEE = [
  ['Form 3783 + death certificate', 'Claimant statement with nominee ID and bank details', 'Day 0'],
  ['Verification', 'Institution checks nominee identity and policy status', 'Day 2–7'],
  ['Payout', 'NEFT to nominee account', 'Day 8–15'],
]
const HEIR = [
  ['Legal Heir Certificate', 'Tehsildar / Revenue office', '10–30 days', true],
  ['Affidavit', 'On ₹100 stamp paper, notarised', '1 day'],
  ['Indemnity bond', 'With one surety, per institution format', '1–2 days', true],
  ['NOC from siblings', 'All Class-1 heirs sign relinquishment / NOC', '3–7 days', true],
  ['KYC', 'Claimant KYC — verify via CKYC', '1 day'],
  ['Submission', 'All documents to branch / RTA', '1 day'],
  ['Verification', 'Institution review & payout', '15–30 days'],
]

export default function J3({ j }) {
  const { state, set, log, toast } = useStore()
  const path = state.j3.path
  return (
    <div>
      <RunBanner j={j} />
      <div className="mb-5 flex items-center justify-between">
        <Tabs
          tabs={[
            { key: 'nominee', label: '(a) Nominee is known' },
            { key: 'heir', label: '(b) Legal heir — no nominee' },
          ]}
          value={path}
          onChange={(p) => {
            set((s) => ({ j3: { ...s.j3, path: p } }))
            toast('ai', p === 'nominee' ? 'Nominee path · 3 steps' : 'Legal-heir path · 7 steps')
          }}
          tone={path === 'nominee' ? 'ok' : 'gold'}
        />
        <div className="flex gap-2">
          {path === 'heir' && (
            <Chip tone="ai" onClick={() => {
              log(j.caseId, 'consent', 'Claimant Rohit Sharma verified via CKYC')
              toast('ok', 'Claimant verified via CKYC — match 0.97')
            }}>
              <Fingerprint size={13} /> verify claimant via CKYC
            </Chip>
          )}
          <Chip tone={path === 'nominee' ? 'ok' : 'warn'}>ETA {path === 'nominee' ? '8–15 working days' : '35–75 days'}</Chip>
        </div>
      </div>

      <Card glow={path === 'nominee' ? 'ok' : undefined} className={cx(path === 'heir' && 'border-warn/30')}>
        <div className="label mb-5">{path === 'nominee' ? 'LIC 974512388 · nominee Sunita Sharma' : 'CAMS folios 2 & 4 · no nominee · Rohit (Class-1 heir)'}</div>
        <div className={cx('grid gap-3', path === 'nominee' ? 'grid-cols-3' : 'grid-cols-7')}>
          {(path === 'nominee' ? NOMINEE : HEIR).map(([t, d, eta, warn], i) => (
            <motion.div
              key={path + t}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative"
            >
              <div className="mb-3 flex items-center">
                <span className={cx('num grid h-9 w-9 place-items-center rounded-full text-sm font-bold', path === 'nominee' ? 'bg-ok/20 text-ok' : 'bg-warn/20 text-warn')}>
                  {i + 1}
                </span>
                <span className={cx('ml-2 h-0.5 flex-1', path === 'nominee' ? 'bg-ok/30' : 'bg-warn/30')} />
              </div>
              <div className="font-semibold text-white">{t}</div>
              <div className="mt-1 text-xs text-slate-400">{d}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Chip tone="muted">{eta}</Chip>
                {warn && <Chip tone="warn"><AlertTriangle size={11} /> often delays</Chip>}
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-5">
        <ConsentSign j={j} />
        <NextSteps j={j} />
      </div>
    </div>
  )
}

function ConsentSign({ j }) {
  const { state, set, log, toast } = useStore()
  const canvas = useRef(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)
  const signed = state.j3.signed

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    ctx.strokeStyle = '#22D3EE'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
  }, [signed])

  const pos = (e) => {
    const r = canvas.current.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * canvas.current.width, ((e.clientY - r.top) / r.height) * canvas.current.height]
  }
  const down = (e) => {
    drawing.current = true
    const ctx = canvas.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(...pos(e))
  }
  const move = (e) => {
    if (!drawing.current) return
    const ctx = canvas.current.getContext('2d')
    ctx.lineTo(...pos(e))
    ctx.stroke()
    setHasInk(true)
  }
  const clear = () => {
    canvas.current.getContext('2d').clearRect(0, 0, canvas.current.width, canvas.current.height)
    setHasInk(false)
  }
  const sign = () => {
    const ref = 'FLX-8842-CLM-' + Math.floor(1000 + Math.random() * 9000)
    set((s) => ({
      j3: { ...s.j3, signed: true, ref },
      consents: [
        { id: 'CNS-' + Math.floor(100 + Math.random() * 900), caseId: j.caseId, who: 'Sunita Sharma', grantee: 'FinLegacy agent', scope: 'Submit claim documents on my behalf', status: 'active', ts: new Date().toLocaleTimeString('en-IN', { hour12: false }) },
        ...s.consents,
      ],
    }))
    log(j.caseId, 'consent', `Claimant e-signed consent · claim ref ${ref}`)
    toast('ok', 'Consent recorded in audit log')
  }

  return (
    <Card>
      <div className="label mb-2">Claimant consent</div>
      <p className="text-sm text-slate-300">
        I, <b className="text-white">Sunita Sharma</b>, allow FinLegacy AI to prepare and route claim documents for case FLX-8842. I can revoke this at any time from the Ledger.
      </p>
      {!signed ? (
        <>
          <div className="relative mt-4 overflow-hidden rounded-xl border border-white/15 bg-black/30">
            <canvas
              ref={canvas}
              width={800}
              height={200}
              className="h-[150px] w-full cursor-crosshair touch-none"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={() => (drawing.current = false)}
              onPointerLeave={() => (drawing.current = false)}
            />
            {!hasInk && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-slate-500">
                <span className="flex items-center gap-2"><PenLine size={16} /> Sign here</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={clear} className="btn-ghost"><Eraser size={15} /> Clear</button>
            <button
              onClick={() => (hasInk ? sign() : toast('warn', 'Please sign in the box first'))}
              className="btn-ok"
            >
              <ShieldCheck size={16} /> Sign & record consent
            </button>
          </div>
        </>
      ) : (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 rounded-xl border border-ok/30 bg-ok/[0.08] p-4">
          <div className="flex items-center gap-2 font-semibold text-ok"><CheckCircle2 size={18} /> Consent recorded</div>
          <div className="mt-1 text-sm text-slate-300">Signed {new Date().toLocaleDateString('en-IN')} · logged to audit ledger</div>
          <button
            onClick={() => {
              set((s) => ({ j3: { ...s.j3, signed: false, ref: null } }))
              toast('info', 'Signature cleared — sign again')
            }}
            className="mt-3 text-xs text-slate-400 underline hover:text-white"
          >
            Re-sign
          </button>
        </motion.div>
      )}
    </Card>
  )
}

function NextSteps({ j }) {
  const { state, toast } = useStore()
  const { ref, path } = state.j3
  return (
    <Card glow={ref ? 'ai' : undefined}>
      <div className="label mb-3">Claim reference & next steps</div>
      {ref ? (
        <>
          <div className="flex items-center gap-3">
            <span className="num rounded-xl bg-ai/10 px-4 py-2 font-mono text-xl font-bold text-ai">{ref}</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(ref).catch(() => {})
                toast('ok', 'Claim reference copied')
              }}
              className="btn-ghost py-2"
            >
              <Copy size={14} /> Copy
            </button>
          </div>
          <ol className="mt-4 space-y-2 text-sm">
            {(path === 'nominee'
              ? ['Print & sign Form 3783 (prefilled)', 'Submit at LIC Branch 9C with death certificate', 'Track payout — ETA 8–15 working days']
              : ['Apply for Legal Heir Certificate at Tehsildar, Haveli', 'Collect NOCs from all Class-1 heirs', 'Submit transmission pack to CAMS']
            ).map((s, i) => (
              <li key={s} className="flex gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-slate-200">
                <span className="num text-ai">{i + 1}.</span> {s}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className="grid min-h-[200px] place-items-center rounded-xl border border-dashed border-white/10 text-center text-sm text-slate-500">
          <div>
            Sign the consent to generate a claim reference.
            <div className="mt-1 text-xs">Nothing is submitted without the family's signature.</div>
          </div>
        </div>
      )}
    </Card>
  )
}
