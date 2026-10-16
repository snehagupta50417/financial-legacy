# FinLegacy AI — hackathon demo

> **This is a hackathon demo, not the product.** It was built before the current documents and does not follow them: it shows seven journeys (the [PRD](../PRD.md) has three), a dashboard-style UI (the PRD is assistant-first), the working name "FinLegacy AI", and an opening figure ("₹78,000+ crore unclaimed") that does not match the cited figures in [BRD §3](../BRD.md#3-market-opportunity). Everything in it is hardcoded and simulated. The product is built in [`frontend/`](../frontend/).

Front-end-only demo of the FinLegacy agent across 7 life journeys. All data is hardcoded; nothing is parsed, sent or paid.

```bash
npm install
npm run dev
```

Open http://localhost:5173 at 1920×1080 (press F11 or use the presenter toolbar's Fullscreen).

## Presenting

- **Demo Mode** (gold button, or Ctrl+K → "Toggle Demo Mode") plays an ~80s scripted walkthrough with chapter cards and subtitles.
  - `Space` pause/resume · `←` / `→` previous/next chapter · `Esc` exit · click a tick on the progress bar to jump.
- **Presenter toolbar** (wrench, bottom-right): Restart Demo (resets all state), Fullscreen, Demo Mode.
- **Ctrl+K**: jump to any journey, Dashboard, Ledger, run the agent, export the brief.
- **Copilot** (teal button): try "How did you find the hidden FD?".

## Routes

`/` journeys · `/journey/:id/{scenario|upload|agent|workspace}` · `/dashboard` · `/ledger`

## Stack

React 18 + Vite 5 + Tailwind 3 + framer-motion + lucide-react. Data lives in `src/data.js`; shared state in `src/store.jsx`; the demo script is in `src/components/DemoMode.jsx`.
