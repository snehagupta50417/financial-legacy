# Hackathon demo (`demo/`)

> **This is a hackathon demo, not the product.** The product is built in [`frontend/`](../frontend/) and defined by [ONE_PAGER.md](../ONE_PAGER.md) → [PRD.md](../PRD.md). Everything here is hardcoded and simulated: no documents are read, nothing is sent, no money moves.

A front-end-only demo (React + Vite) with an 80-second scripted **Demo Mode** for filming.

## How it relates to the product

The demo was built before the current documents. It tells the same story in a more theatrical way, with these differences:

| In the demo | In the product (PRD) |
| --- | --- |
| Name "FinLegacy AI" | Financial Legacy |
| Seven "journeys" | Three journeys. The demo's journeys map onto them: Living individual → **Discover**; Will & estate, Helping an elderly relative → **Plan a legacy**; Family after a death, Nominee/legal heir, Rejected claim, NRI family → **Find and claim after a death** |
| Dashboard and ledger pages up front | Assistant-first: conversation and the next task come first; records and tasks support it |
| "Hidden asset discovered" with a confidence score | A **potential match**, never confirmed until a document or the institution supports it; it is not counted in reviewed totals |
| Opening line "₹78,000+ crore is unclaimed" | Use the cited figures in [BRD §3](../BRD.md#3-market-opportunity) (e.g. ₹60,518 crore in public-sector banks' DEA Fund, Jan 2026) |
| A will-drafting wizard | The product does not draft wills; it prepares notes for a lawyer |
| Verify-style claim checks, ledger, copilot | Consent, audit trail and copilot match the PRD's principles; the Verify console is a Later capability (FL-56) |

If the demo is used publicly, keep its "Simulated" framing and avoid presenting the differences above as product features.

## Run it

From the `demo/` folder:

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173 at 1920×1080 (press F11 or use the presenter toolbar's Fullscreen).

## Presenting

- **Demo Mode** (gold button, or Ctrl+K → "Toggle Demo Mode") plays the scripted walkthrough with chapter cards and subtitles.
  - `Space` pause/resume · `←` / `→` previous/next chapter · `Esc` exit · click a tick on the progress bar to jump.
- **Presenter toolbar** (wrench, bottom-right): Restart Demo (resets all state), Fullscreen, Demo Mode.
- **Ctrl+K**: jump to any page, run the agent, export the brief.
- **Copilot** (teal button): try "How did you find the hidden FD?".

Data lives in `src/data.js`; shared state in `src/store.jsx`; the demo script in `src/components/DemoMode.jsx`.
