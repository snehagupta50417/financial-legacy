import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileX2, Clock, Users, UploadCloud, Check, Copy, Download, ArrowUpRight, Hourglass, Wand2, CircleDot } from 'lucide-react'
import { useStore } from '../store'
import { Card, Chip, Tip, Typed } from '../components/ui'
import { RunBanner, Readiness } from './J2'
import { cx, downloadFile } from '../lib/util'

export const RESUBMIT = `To,
The Senior Divisional Manager,
LIC of India, Chennai Divisional Office

Ref: Policy No. 881204557 · Your letter dated 16-Aug-2026 (Reason code NDC-04)

Subject: Re-submission of death claim with proof of legal heirship

Sir/Madam,

Your letter states that the claim could not be settled because the nominee is deceased (NDC-04). As the daughter and Class-1 legal heir of the late policyholder, I am re-submitting the claim with:

1. Legal Heir Certificate issued by Tahsildar, Mylapore
2. Affidavit and indemnity bond as per LIC format
3. NOC from other legal heirs
4. Death certificates of the policyholder and the nominee

I request that the claim be settled within 30 days as per IRDAI (Protection of Policyholders' Interests) Regulations.

Yours faithfully,
Meera Iyer`

const RTI = `To the Grievance Redressal Officer, LIC Chennai DO

Ref: Death claim, Policy No. 881204557 — submitted 03-Jun-2026

No decision has been communicated in over 90 days. Under IRDAI regulations, claims must be settled or repudiated within 30 days of the last required document. Please provide, within 15 days:
1. The current status of the claim and the officer handling it;
2. Any requirement still pending from my side;
3. The reasons for the delay.

If I do not hear from you, I will approach the Insurance Ombudsman, Chennai.

Meera Iyer`

const LADDER = [
  ['Day 1', 'Grievance to branch GRO', 'Bima Bharosa portal'],
  ['Day 15', 'Reminder + escalate to DO', 'Written reminder'],
  ['Day 30', 'IRDAI Insurance Ombudsman', 'Chennai Ombudsman'],
]

export default function J5({ j }) {
  const { state, set, log, toast } = useStore()
  const [branch, setBranch] = useState('rejected')
  const [evidence, setEvidence] = useState([false, false, false])
  const [rti, setRti] = useState(false)
  const { letter, escalated } = state.j5

  const upload = () => {
    set((s) => ({ j5: { ...s.j5, letter: true }, uploads: { ...s.uploads, 5: s.uploads[5].length ? s.uploads[5] : j.samples } }))
    log(j.caseId, 'uploaded', 'LIC rejection letter uploaded')
    log(j.caseId, 'extracted', 'Reason code NDC-04 parsed · 61 days left in window')
    toast('miss', 'Rejection parsed — NDC-04 · 61 days left')
  }
  const escalate = () => {
    if (escalated >= LADDER.length) return toast('info', 'All escalation steps complete')
    const [day, what] = LADDER[escalated]
    set((s) => ({ j5: { ...s.j5, escalated: s.j5.escalated + 1 } }))
    log(j.caseId, 'letter', `Escalation ${day}: ${what}`)
    toast('ok', `Escalated — ${what}`)
  }

  return (
    <div>
      <RunBanner j={j} />
      <div className="mb-5 grid grid-cols-3 gap-4">
        <BranchCard icon={<FileX2 />} title="Claim rejected" active={branch === 'rejected'} onClick={() => setBranch('rejected')} tone="miss" />
        <BranchCard icon={<Hourglass />} title="Institution has not responded" active={branch === 'silent'} onClick={() => setBranch('silent')} tone="warn" />
        <Tip text="On the roadmap — mediation & court-filing support for competing claims" className="w-full">
          <BranchCard
            icon={<Users />}
            title="Competing heirs / dispute filed"
            roadmap
            onClick={() => toast('info', 'Roadmap: competing-heirs mediation (see Journey 4 · Disputed will for today’s tools)')}
          />
        </Tip>
      </div>

      {branch === 'silent' ? (
        <Card>
          <div className="label mb-2">No response in 90+ days</div>
          <p className="text-slate-300">Claim submitted 03-Jun-2026 · no acknowledgement since. The next step is a formal follow-up that starts the grievance clock.</p>
          {rti ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4"><Typed text={RTI} speed={10} /></div>
          ) : (
            <button
              onClick={() => {
                setRti(true)
                log(j.caseId, 'letter', 'RTI-style follow-up drafted for LIC Chennai DO')
                toast('ai', 'Follow-up drafted')
              }}
              className="btn-ai mt-4"
            >
              <Wand2 size={16} /> Draft RTI-style follow-up
            </button>
          )}
        </Card>
      ) : !letter ? (
        <Card className="p-10">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-2xl bg-miss/10 p-4 text-miss"><UploadCloud size={36} /></div>
            <div className="mt-3 font-display text-2xl font-semibold text-white">Upload the rejection letter</div>
            <p className="mt-1 text-slate-400">The agent reads the reason code, the deadline, and what the institution actually needs.</p>
            <button onClick={upload} className="btn-miss mt-5 px-6 py-3 text-base">
              <UploadCloud size={18} /> Upload LIC_Rejection_Letter_NDC04.pdf
            </button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px] gap-5">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="col-span-2">
              <Card glow="miss" className="h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="label text-miss">Parsed rejection · LIC Policy 881204557</div>
                    <div className="mt-2 font-display text-3xl font-bold text-white">Reason code NDC-04</div>
                    <div className="mt-1 text-lg text-slate-300">Nominee deceased — legal heirship required</div>
                  </div>
                  <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <Chip tone="miss" className="px-4 py-2 text-base"><Clock size={16} /> 61 days left</Chip>
                  </motion.div>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>90-day representation window</span>
                    <span className="num">29 / 90 days used</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(29 / 90) * 100}%` }} transition={{ duration: 1.2 }} className="h-full bg-miss" />
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-white/[0.04] p-3 text-sm text-slate-300">
                  <b className="text-ok">Not a denial of benefit.</b> LIC needs proof of who the legal heirs are because the nominee has died.
                </div>
              </Card>
            </motion.div>
            <Readiness value={58} sub="Heirship evidence is the only blocker." />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-5">
            <Card>
              <div className="label mb-3">Evidence board</div>
              {['Legal Heir Certificate', 'Affidavit + indemnity bond', 'Re-submission to LIC DO'].map((e, i) => (
                <button
                  key={e}
                  onClick={() => {
                    setEvidence((x) => x.map((v, k) => (k === i ? !v : v)))
                    toast(evidence[i] ? 'info' : 'ok', `${e} ${evidence[i] ? 'reopened' : 'done'}`)
                    if (!evidence[i]) log(j.caseId, 'uploaded', `${e} marked complete`)
                  }}
                  className={cx('mb-2 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left', evidence[i] ? 'border-ok/30 bg-ok/[0.07]' : 'border-white/10 bg-white/[0.02]')}
                >
                  <span className={cx('num grid h-7 w-7 place-items-center rounded-full text-xs font-bold', evidence[i] ? 'bg-ok text-ink-900' : 'bg-white/10 text-slate-300')}>
                    {evidence[i] ? <Check size={14} /> : i + 1}
                  </span>
                  <span className={cx('font-semibold', evidence[i] ? 'text-ok' : 'text-white')}>{e}</span>
                  {i < 2 && <span className="ml-auto text-slate-600">→</span>}
                </button>
              ))}
              <div className="mt-5 label mb-3">Escalation ladder</div>
              <div className="flex items-start">
                {LADDER.map(([d, w, via], i) => {
                  const done = i < escalated
                  return (
                    <div key={d} className="flex flex-1 items-start">
                      <div className="flex flex-col items-center text-center">
                        <motion.span
                          animate={done ? { scale: [1, 1.25, 1] } : {}}
                          className={cx('grid h-10 w-10 place-items-center rounded-full border-2', done ? 'border-ok bg-ok/20 text-ok' : 'border-white/20 text-slate-500')}
                        >
                          {done ? <Check size={16} /> : <CircleDot size={16} />}
                        </motion.span>
                        <div className={cx('mt-2 text-xs font-bold', done ? 'text-ok' : 'text-slate-400')}>{d}</div>
                        <div className="mt-0.5 w-32 text-xs text-slate-300">{w}</div>
                        <div className="text-[11px] text-slate-500">{via}</div>
                      </div>
                      {i < LADDER.length - 1 && <div className={cx('mt-5 h-0.5 flex-1', done ? 'bg-ok/50' : 'bg-white/10')} />}
                    </div>
                  )
                })}
              </div>
              <button onClick={escalate} className="btn-ok mt-4"><ArrowUpRight size={16} /> Escalate</button>
            </Card>
            <Card>
              <div className="label mb-3">Re-submission letter</div>
              <div id="j5-letter" className="max-h-[380px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-4">
                <Typed text={RESUBMIT} speed={8} />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(RESUBMIT).catch(() => {})
                    toast('ok', 'Letter copied to clipboard')
                  }}
                  className="btn-ghost"
                >
                  <Copy size={15} /> Copy
                </button>
                <button
                  onClick={() => {
                    downloadFile('LIC_resubmission_FLX-7301.txt', RESUBMIT, 'text/plain')
                    log(j.caseId, 'letter', 'Re-submission letter downloaded')
                    toast('ok', 'Letter downloaded (.txt)')
                  }}
                  className="btn-ok"
                >
                  <Download size={15} /> Download .txt
                </button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function BranchCard({ icon, title, active, onClick, tone, roadmap }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'glass flex w-full items-center gap-4 p-5 text-left transition hover:-translate-y-0.5',
        active && tone === 'miss' && 'border-miss/50 bg-miss/[0.08]',
        active && tone === 'warn' && 'border-warn/50 bg-warn/[0.08]',
        roadmap && 'opacity-60',
      )}
    >
      <span className={cx('grid h-11 w-11 place-items-center rounded-xl', active ? (tone === 'miss' ? 'bg-miss/20 text-miss' : 'bg-warn/20 text-warn') : 'bg-white/5 text-slate-400')}>{icon}</span>
      <span className="flex-1 font-display text-lg font-semibold text-white">{title}</span>
      {active && <Chip tone={tone}>active</Chip>}
      {roadmap && <Chip>roadmap</Chip>}
    </button>
  )
}
