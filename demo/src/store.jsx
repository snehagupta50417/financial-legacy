import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SEED_AUDIT, SEED_CONSENTS, CASES, now } from './data'
import { buildBrief, downloadFile } from './lib/util'

const Ctx = createContext(null)

let auditSeq = 100
const fresh = () => ({
  caseId: 'FLX-8842',
  bannerOpen: true,
  audit: SEED_AUDIT.map((a, i) => ({ ...a, id: i + 1 })).reverse(),
  consents: SEED_CONSENTS.map((c) => ({ ...c })),
  uploads: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] },
  runs: { 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle', 5: 'idle', 6: 'idle', 7: 'idle' },
  spotlight: 'off', // off | pending | on | done
  j1Chips: ['Forgotten bank account / FD'],
  j2Checked: { fd: false, lhc: false },
  requested: {},
  j3: { path: 'nominee', signed: false, ref: null },
  j5: { letter: false, escalated: 0, branch: 'rejected' },
  j6: { consent: 'pending' },
  permLog: [],
  j7: { country: 'All', status: { consulate: 'done', apostille: 'todo', passport: 'done', arabic: 'done', attest: 'todo', eid: 'todo', lhc: 'progress' } },
  briefPulse: 0,
  highlight: null,
  ledgerFlash: 0,
})

export function StoreProvider({ children }) {
  const [state, setState] = useState(fresh)
  const [toasts, setToasts] = useState([])
  const [demo, setDemo] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const navigate = useNavigate()
  const stateRef = useRef(state)
  stateRef.current = state

  const set = useCallback((patch) => {
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }))
  }, [])

  const toast = useCallback((kind, text) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t.slice(-3), { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }, [])

  const log = useCallback((caseId, type, text) => {
    setState((s) => ({ ...s, audit: [{ id: ++auditSeq, caseId, type, text, ts: now() }, ...s.audit] }))
  }, [])

  const exportBrief = useCallback(
    (caseId, opts = {}) => {
      const id = caseId || stateRef.current.caseId
      if (!opts.silent) downloadFile(`case-brief-${id}.md`, buildBrief(stateRef.current, id))
      log(id, 'letter', 'Case brief exported (.md) with audit trail')
      setState((s) => ({ ...s, briefPulse: s.briefPulse + 1 }))
      toast('brief', 'Case brief exported — audit trail included')
    },
    [log, toast],
  )

  const restart = useCallback(() => {
    setState(fresh())
    setResetKey((k) => k + 1)
    navigate('/')
    window.scrollTo(0, 0)
    toast('ok', 'Demo restarted — all state reset')
  }, [navigate, toast])

  const setCase = useCallback((id) => setState((s) => (s.caseId === id ? s : { ...s, caseId: id })), [])

  const value = useMemo(
    () => ({ state, set, toast, log, exportBrief, restart, setCase, toasts, demo, setDemo, resetKey, stateRef, cases: CASES }),
    [state, set, toast, log, exportBrief, restart, setCase, toasts, demo, resetKey],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
