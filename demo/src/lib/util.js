import { CASES } from '../data'

export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')

export const cx = (...a) => a.filter(Boolean).join(' ')

// Shared pause flag so Demo Mode can freeze animations (Space key).
export const clock = { paused: false }

export function downloadFile(name, text, type = 'text/markdown') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Smooth, pausable scroll of the window to an absolute y or element.
export function slowScroll(target, duration = 4000) {
  return new Promise((resolve) => {
    let y
    if (typeof target === 'number') y = target
    else {
      const el = typeof target === 'string' ? document.querySelector(target) : target
      if (!el) return resolve()
      y = el.getBoundingClientRect().top + window.scrollY - 90
    }
    y = Math.max(0, Math.min(y, document.documentElement.scrollHeight - window.innerHeight))
    const start = window.scrollY
    let elapsed = 0
    let last = performance.now()
    const step = (t) => {
      if (!clock.paused) elapsed += t - last
      last = t
      const p = Math.min(1, elapsed / duration)
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      window.scrollTo(0, start + (y - start) * e)
      if (p < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
}

export function readinessOf(state, caseId) {
  const c = CASES[caseId]
  if (caseId === 'FLX-8842') {
    const n = Object.values(state.j2Checked).filter(Boolean).length
    return c.baseReadiness + n * 12
  }
  return c.baseReadiness
}

export function buildBrief(state, caseId) {
  const c = CASES[caseId]
  const total = c.assets.reduce((s, a) => s + a.value, 0)
  const lines = []
  lines.push(`# FinLegacy AI — Case Brief ${c.id}`)
  lines.push('')
  lines.push(`> Demo data only. Generated ${new Date().toLocaleString('en-IN')}.`)
  lines.push('')
  lines.push(`**Subject:** ${c.person.name} (${c.person.life}, ${c.person.city}) — ${c.person.status}  `)
  lines.push(`**Family:** ${c.heirs.map((h) => `${h.name} (${h.role})`).join(', ')}  `)
  lines.push(`**Readiness:** ${readinessOf(state, caseId)}%`)
  lines.push('')
  lines.push('## Assets identified')
  lines.push('')
  lines.push('| Institution | Asset | Value (₹) | Status |')
  lines.push('| --- | --- | ---: | --- |')
  c.assets.forEach((a) => lines.push(`| ${a.inst} | ${a.type} | ${a.value.toLocaleString('en-IN')} | ${a.status} |`))
  lines.push(`| **Total** | | **${total.toLocaleString('en-IN')}** | |`)
  lines.push('')
  lines.push('## Missing documents')
  lines.push('')
  c.missing.forEach((m) => {
    const done = state.j2Checked[m.id] || state.requested[m.id]
    lines.push(`- [${done ? 'x' : ' '}] ${m.doc} — obtain from: ${m.instrument}`)
  })
  lines.push('')
  lines.push('## Next actions')
  lines.push('')
  c.actions.forEach((a, i) => lines.push(`${i + 1}. ${a.text} → ${a.inst} · ${a.when}`))
  lines.push('')
  lines.push('## Consent record')
  lines.push('')
  const consents = state.consents.filter((x) => x.caseId === caseId)
  if (!consents.length) lines.push('- No consent records for this case.')
  consents.forEach((x) => lines.push(`- ${x.id} · ${x.who} → ${x.grantee} · ${x.scope} · **${x.status}** (${x.ts})`))
  lines.push('')
  lines.push('## Audit summary')
  lines.push('')
  const audit = state.audit.filter((x) => x.caseId === caseId)
  audit.slice(0, 25).forEach((x) => lines.push(`- \`${x.ts}\` [${x.type}] ${x.text}`))
  lines.push('')
  lines.push('---')
  lines.push('The family guides the journey. The agent reads documents, drafts filings, routes to portals.')
  return lines.join('\n')
}
