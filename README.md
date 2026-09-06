# Explainable Credit Ledger
### AI-Powered Fraud Detection & Explainable Credit Scoring · Smart India Hackathon 2026

A credit-officer dashboard where **no automated system can reject an applicant.**
It can only auto-approve a clean case; every other outcome — a thin credit file, a
noisy fraud signal, even a high fraud-risk flag — is referred to a human officer
with a full, factor-by-factor explanation. This is the core protection for genuine
applicants: they are never silently declined by an algorithm.

## Why two scores, not one

Most alternative-credit tools blend "can they repay?" and "is this genuine?" into
one score. That's how a thin-file, genuine applicant and an actual fraud attempt
end up looking the same to the model. This system keeps them separate end to end:

- **Credit score** (0–100, explainable): cash-flow surplus, business stability,
  repayment history, digital payment adoption, savings discipline, household/debt load.
- **Fraud score** (0–100, explainable): identity verification match, device
  reputation, location consistency, declared-vs-verified income variance,
  reference/co-signer check, and a repeat-application check across the whole
  system (not just one officer's own cases).

An application is **auto-approved only when both scores are clean.** Everything
else goes to the **Review Queue**, where an officer approves or declines — a
decline requires a written note and is recorded with the officer's name for audit.

## Site structure (real hyperlinks throughout, not a single demo page)

| Page | Purpose |
|---|---|
| `index.html` | Landing page |
| `about.html` | Full methodology write-up |
| `help.html` | FAQ |
| `privacy.html` | Data use notes |
| `login.html` / `register.html` | Officer auth |
| `dashboard.html` | Smart dashboard — KPIs, charts, recent activity |
| `new-assessment.html` | Application intake form |
| `report.html?id=...` | Full explainable report for one application, with officer decision controls |
| `review-queue.html` | All cases awaiting an officer decision |
| `history.html` | Every application on file |
| `compare.html` | Side-by-side comparison of up to 3 applicants |

## Tech stack

- **Hosting:** Firebase Hosting (static `public/` folder)
- **API:** Firebase Cloud Functions (Express app) — see `functions/index.js`
- **Database:** Firestore (`officers` and `assessments` collections)
- **Frontend:** Vanilla HTML/CSS/JS, no build step, no framework
- **Charts:** Chart.js · **PDF export:** jsPDF + html2canvas (real multi-page PDF, not browser print)

## Deploying

See **`DEPLOY.md`** for full step-by-step instructions. In short:

```bash
npm install -g firebase-tools
firebase login
cd functions && npm install && cd ..
# edit .firebaserc with your real Firebase project ID
firebase deploy
```

## Demo login

- **Officer Code:** `DEMO001`
- **Password:** `Demo@123`

(Created automatically the first time anyone logs in on a fresh deployment.)

## Notes

- This is a hackathon prototype. The scoring logic is intentionally rule-based
  and fully transparent at this stage — see `functions/lib/scoring.js`,
  `fraud.js`, and `decision.js`. A production system could layer a validated
  ML model underneath while keeping the same explanation and human-review
  guarantees on top.
- Do not enter real government ID numbers into the "Applicant ID / Phone
  Reference" field in a demo deployment — see `privacy.html`.
# credit-ledger
