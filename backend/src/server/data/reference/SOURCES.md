# Reference data — sources

> Documentation review — 18 October 2026. These are provenance notes for public reference data in synthetic fixtures. This review does not refresh rates, NAVs or branch/procedure data, or certify current financial advice. Revalidate original sources before real-data use.

Real **public** reference data used to make demo and test data realistic. It contains institutions, branches, fund schemes, prices, pincodes and rates — **no personal data**. People and identifiers in demos are synthetic and always masked (`../synthetic/`).

Refresh with `node scripts/fetch-reference-data.mjs` (from `frontend/`). Each file records its `fetchedOn` date.

| File | Contents | Source | Notes |
| --- | --- | --- | --- |
| `mutual-funds.json` | 15 long-running schemes from major fund houses: AMFI scheme code, ISIN, plan/option, latest NAV, monthly NAV history since launch | [AMFI NAV file](https://portal.amfiindia.com/spages/NAVAll.txt) (official, daily) + [mfapi.in](https://www.mfapi.in/) (free NAV history API) | Scheme names change over time (e.g. HDFC Equity Fund → HDFC Flexi Cap Fund; SBI Blue Chip → SBI Large Cap); demos use the name current at the document's date |
| `bank-branches.json` | ~290 real branches of SBI, HDFC, ICICI, PNB, Bank of Baroda, Axis, Kotak, Canara in 10 cities: IFSC, MICR, branch, address, district, pincode | [Razorpay IFSC dataset](https://github.com/razorpay/ifsc) (MIT licence), sourced from RBI's IFSC lists | Raw city tags can be wrong; the generator also matches district and address, and skips government/processing branches |
| `pincodes.json` | Post offices, district and state for the branches' pincodes | [India Post pincode API](https://api.postalpincode.in) (free, community-run) | — |
| `rbi-rates.json` | Policy repo rate, Bank Rate | [RBI homepage](https://www.rbi.org.in/), "Current Rates" | Bank Rate drives delay interest: banks Bank Rate + 4% (RBI Directions 2025), insurers Bank Rate + 2% (IRDAI 2024) |

**Curated, not fetched** (in `../synthetic/formats.ts`): savings account number lengths by bank, LIC plan names and table numbers of the 2004–2015 era. Verify before using outside demos.

**Considered and not used:** data.gov.in (works with its public sample key, but no dataset needed now); bank FD rate pages and LIC plan pages (no API; would need scraping).
