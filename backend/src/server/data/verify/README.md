# Verify console demo fixtures

Everything here is synthetic. No real person, document, account or institution record is used, and nothing is sent anywhere.
The fixtures live in `claims.ts`; the expected results below are asserted by `backend/test/verify-*.test.ts`.

## The four claims

| Claim | Deceased | Claimant | Product | Planted discrepancies | Expected result |
| --- | --- | --- | --- | --- | --- |
| **A** (VER-0412) | Rajesh Kumar Sharma | Ananya Sharma, daughter and nominee | LIC policy ending 4821, via FinLegacy | None. Genuine death certificate (date of death 03 Mar 2026) | All four checks pass. **Low** risk. Approve |
| **B** (VER-0415) | Rajesh Kumar Sharma | Vikram Sharma, claimed nephew | Same LIC policy ending 4821, branch submission | (1) Death certificate shows 12 Mar 2026, the claim form says 03 Mar 2026. (2) The certificate's date field carries two authenticity signals (spacing and compression differ; saved after issue). (3) Same deceased and same policy as claim A. (4) Proof of relationship is not in the pack | Consistency, authenticity, duplicate and completeness all flagged. **High** risk. Escalate |
| **C** (VER-0398) | Sunita Verma | Arjun Verma, son | SBI fixed deposit ending 3307 | The indemnity form is missing. Everything else agrees | Completeness flagged. **Medium** risk. Request documents |
| **D** (VER-0391) | Mohan Iyer | Lakshmi Iyer, spouse and joint holder | HDFC savings account ending 9150, via FinLegacy | None. Received 13 days ago, so 2 days remain in the 15-day window | All four checks pass. **Low** risk. Approve |

## How dates work

`receivedDaysAgo` is relative to the moment the demo is seeded or reset, so the deadlines are the same every time:
D has 2 days left, C has 6, A has 9 and B has 10. The urgency sort is therefore D, C, then the duplicate pair A and B together.

## The authenticity signals are not forensics

The console does not analyse images or PDFs. A signal is metadata planted in the fixture (`signals` on a document) and is
shown as "signal from demo metadata". It is never described as proof of fraud, and a human reviewer makes every decision.

## Forcing "Couldn't complete, review manually"

Running checks with `simulateFailure` set to a check name (demo mode only) makes that check return `incomplete`.
An unreadable document (`readable: false`) does the same for consistency and authenticity. An incomplete check is never shown
as a pass and can never produce a Low rating.

## Claim A and the heir workflow

There is no "Ananya" in the heir workflow, so claim A is its own synthetic record. Rajesh Kumar Sharma is also the deceased in the
heir-side demo (Arjun Sharma's father), so the family is consistent, but the console never reads an heir's private case.
