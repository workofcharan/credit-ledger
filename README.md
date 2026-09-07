# 📊 Explainable Credit Ledger
### AI-Powered Fraud Detection & Explainable Credit Scoring · Smart India Hackathon 2026

An enterprise credit-officer dashboard where **no automated system can reject an applicant.** The engine can only auto-approve clean cases; every other outcome — thin credit files, edge-case financial signals, or potential fraud alerts — is routed to a human officer with factor-by-factor explainability.

---

## 📑 Table of Contents

1. [🌟 Core Philosophy: The Dual-Score Architecture](#-core-philosophy-the-dual-score-architecture)
2. [🚀 Quick Start & Local Setup](#-quick-start--local-setup)
3. [🔑 Demo Credentials](#-demo-credentials)
4. [📖 Complete Step-by-Step User Guide](#-complete-step-by-step-user-guide)
   - [1. Authentication & Officer Access](#1-authentication--officer-access)
   - [2. Officer Dashboard & KPI Monitoring](#2-officer-dashboard--kpi-monitoring)
   - [3. Creating a New Credit Assessment](#3-creating-a-new-credit-assessment)
   - [4. Deep-Dive Explainable Report](#4-deep-dive-explainable-report)
   - [5. Interactive Financial Structuring & Sensitivity Simulation](#5-interactive-financial-structuring--sensitivity-simulation)
   - [6. Human Decision Controls & Audit Trail](#6-human-decision-controls--audit-trail)
   - [7. Review Queue Management](#7-review-queue-management)
   - [8. Application History, Search & Audit Filters](#8-application-history-search--audit-filters)
   - [9. Side-by-Side Applicant Comparison](#9-side-by-side-applicant-comparison)
   - [10. PDF Report Export](#10-pdf-report-export)
5. [🎭 Pre-Loaded Demo Personas & Test Cases](#-pre-loaded-demo-personas--test-cases)
6. [📂 Project Directory Structure](#-project-directory-structure)
7. [☁️ Deployment Options](#️-deployment-options)
8. [🛡️ Privacy, Security & Compliance](#️-privacy-security--compliance)

---

## 🌟 Core Philosophy: The Dual-Score Architecture

Traditional credit scoring models bundle **"Can they repay?"** (ability) and **"Is this applicant genuine?"** (identity & integrity) into a single opaque black-box score. When an unbanked or micro-enterprise applicant has no formal bureau history, traditional systems misclassify them as high risk and auto-reject them.

**Explainable Credit Ledger separates these two dimensions completely:**

```
                    ┌─────────────────────────┐
                    │ Applicant Data Intake   │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
     ┌───────────────────────┐       ┌───────────────────────┐
     │  Credit Score (0–100) │       │  Fraud Score (0–100)  │
     │  • Cash-flow surplus  │       │  • ID verification   │
     │  • Business stability │       │  • Device integrity   │
     │  • Digital payments   │       │  • Location match     │
     │  • Savings discipline │       │  • Income doc variance│
     │  • Debt-to-income     │       │  • Repeat check (30d) │
     └───────────┬───────────┘       └───────────┬───────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                   ┌─────────────▼─────────────┐
                   │    Decision Engine Evaluator   │
                   └─────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌───────────────┐       ┌─────────────────┐      ┌─────────────────┐
│ AUTO-APPROVED │       │  REVIEW QUEUE   │      │ FRAUD ESCALATE  │
│ (Clean file & │       │ (Thin file, low │      │ (Severe anomaly │
│ zero anomaly) │       │  history, edge) │      │  human review)  │
└───────────────┘       └────────┬────────┘      └────────┬────────┘
                                 │                        │
                                 └───────────┬────────────┘
                                             ▼
                                ┌─────────────────────────┐
                                │   HUMAN CREDIT OFFICER  │
                                │ • View Full Breakdown   │
                                │ • Simulate Loan Terms   │
                                │ • Approve / Decline     │
                                │   (Declines require     │
                                │    mandatory audit note)│
                                └─────────────────────────┘
```

- **Credit Score (0–100):** Measures financial repayment ability and business sustainability.
- **Fraud Score (0–100):** Measures digital footprint consistency, biometric/ID match, device trust, and duplicate application frequency across all branches.
- **Strict Human-in-the-Loop Guarantee:** The algorithm **cannot decline applicants on its own**. Only a human officer can decline, and an audit note is strictly mandatory for compliance.

---

## 🚀 Quick Start & Local Setup

The project uses pure vanilla web technologies with a lightweight, zero-dependency Node.js backend server.

### Prerequisites
- Node.js (v16.x or newer installed)
- Any modern web browser (Chrome, Edge, Firefox, Safari)

### Installation & Launch

1. **Clone or navigate into the repository:**
   ```bash
   cd credit-ledger
   ```

2. **Start the local server:**
   ```bash
   npm start
   ```
   *(Alternatively: `node server.js` or `npm run dev`)*

3. **Open the browser:**
   Navigate to:
   ```
   http://localhost:3000
   ```

---

## 🔑 Demo Credentials

To test without setting up a new profile, use the pre-seeded officer credentials:

| Field | Value |
|---|---|
| **Officer Code / ID** | `DEMO001` |
| **Password** | `Demo@123` |

*(You can also click **"Register as a new officer"** on the login screen to create custom credentials stored locally).*

---

## 📖 Complete Step-by-Step User Guide

### 1. Authentication & Officer Access
- Navigate to `/login.html` (or click **"Officer Portal"** on the landing page).
- Enter your Officer Code and Password.
- Once authenticated, a secure session token is initialized, granting access to protected evaluation routes.
- To log out at any time, click **"Sign Out"** in the top navigation bar.

---

### 2. Officer Dashboard & KPI Monitoring
Located at `/dashboard.html`, the dashboard is the primary mission-control interface:

- **Executive KPI Cards:**
  - **Total Applications:** Total volume assessed on file.
  - **Pending Human Review:** Cases needing immediate attention in the queue.
  - **Approval Rate:** Real-time percentage of approved credit files.
  - **Average Credit Score:** Benchmark health of portfolio applicants.
- **Portfolio Distribution Charts:** Visual representation of credit bands (Band A to Band D) and fraud risk classifications.
- **Recent Activity Table:** Quick links to the latest 5 submitted applications with status badges (`Approved`, `Review Queue`, `Declined`).
- **Quick Action Buttons:** Fast shortcuts to `+ New Assessment`, `Review Queue`, and `Compare`.

---

### 3. Creating a New Credit Assessment
Located at `/new-assessment.html`, this page allows officers to assess a borrower by providing financial and alternative data.

#### Method A: Instant One-Click Demo Presets
At the top of the form, three instant preset buttons allow testing realistic borrower profiles with a single click:
1. **🟢 Clean Kirana Store:** Established grocery store with healthy digital payment ratio, high savings, and clean identity match *(Results in Auto-Approval or Band A)*.
2. **🟡 Thin-File Artisan:** Traditional handloom weaver with solid daily income but zero prior bureau history *(Demonstrates how unbanked genuine applicants are protected from auto-rejection)*.
3. **🔴 High Fraud Risk:** Inconsistent declared vs verified income, mismatched geo-location, and flagged device *(Routes directly to Fraud Review with explainability)*.

#### Method B: Manual Assessment Entry
Fill out the intuitive, structured intake sections:
- **Applicant & Business Information:** Name, Business Name, Location (Village, District, State), Business Type (e.g., Kirana, Agriculture, Handloom, Repair Services, Food Stalls), and Operating Experience.
- **Financial Profile:** Monthly Revenue (₹), Monthly Operational Expenses (₹), Digital Transaction % (UPI/POS), and Savings Ratio %.
- **Credit & Banking Signals:** Existing loan obligations, EMI amounts, and Repayment History (`None / First-time`, `Good`, `Average`, `Poor`).
- **Fraud & Alternative Verification Signals:**
  - *ID Reference Number*
  - *Identity Verification* (`Verified`, `Partial`, `Mismatch`)
  - *Device Status* (`Trusted`, `New Device`, `Flagged Emulator/VPN`)
  - *Location Consistency* (`Consistent`, `Moderate Distance`, `Inconsistent`)
  - *Income Document Variance %*
  - *Reference & Co-signer Check* (`Verified`, `Unreachable`, `Conflicting`)
- **Loan Request Details:** Requested Principal Amount (₹) and Tenure (Months).

Click **"Generate Assessment"** to process the data through the dual-scoring engine. You will be redirected immediately to the explainable report.

---

### 4. Deep-Dive Explainable Report
Located at `/report.html?id=<ASSESSMENT_ID>`, this is the central decision cockpit for each application:

- **Header Banner:** Displays applicant name, reference ID, enterprise type, and current decision state (`Approved`, `Declined`, or `Referred for Officer Review`).
- **Dual Score Gauges:**
  - **Credit Score Arc (0–100):** Visual meter with Credit Band badge (Band A: 80+, Band B: 65-79, Band C: 50-64, Band D: <50), recommended loan size, interest rate, and maximum eligibility limit.
  - **Fraud Score Arc (0–100):** Visual meter with Risk Classification (`Low`, `Medium`, `High`), duplicate check count across the last 30 days, and device/location indicators.
- **Transparent Factor Breakdown Tables:**
  - Detailed point allotment for each score factor (e.g., *Cash Flow Surplus: 18/20 pts*, *Digital Adoption: 12/15 pts*, *Identity Verification Match: 25/25 pts*).
  - Clear rationale explanations next to each bar explaining *why* points were added or deducted.

---

### 5. Interactive Financial Structuring & Sensitivity Simulation
Inside the report page, officers can tailor the loan package in real time to match borrower cash flow:

- **Loan Tenure Slider (3 to 60 months):** Adjust the repayment timeline.
- **Target Profit Margin Slider (5% to 60%):** Stress-test the borrower's operating margin.
- **Moratorium Period Switch (0 to 12 months):** Toggle an interest-only grace period for seasonal businesses (e.g., harvest cycles).
- **Live Output Updates:**
  - Dynamic **Monthly EMI**, **Total Interest**, and **Total Payable Amount**.
  - **Dynamic Chart.js Amortization Curve:** Visualizes principal balance paydown over time.
  - **Full Month-by-Month Amortization Table:** Breaks down Principal vs. Interest vs. Remaining Balance.
  - **Break-Even Snapshot:** Computes required break-even revenue and safety margin buffer.

---

### 6. Human Decision Controls & Audit Trail
At the bottom of pending reports:

- **Approve Loan:** Approves the application with the tailored or recommended terms.
- **Decline Application:** 
  - **Strict Requirement:** A descriptive review reason **must** be entered into the text area before declining.
  - Logs the deciding officer's name, timestamp, and audit justification.
  - Protects applicants from arbitrary rejection and ensures full regulatory accountability.

---

### 7. Review Queue Management
Located at `/review-queue.html`:

- Lists all applications that were **not auto-approved** and are awaiting an officer's manual review.
- Displays key summary badges: Credit Band, Fraud Risk, Requested Amount, and Flag Reason.
- Click **"Review Case →"** on any item to open the decision view.

---

### 8. Application History, Search & Audit Filters
Located at `/history.html`:

- **Universal Search Bar:** Real-time instant search by Applicant Name, Business Name, Village/City, or Reference ID.
- **Status Filter:** Filter by `All Statuses`, `Approved`, `Pending Review`, or `Declined`.
- **Compare Checkboxes:** Select 2 or 3 applicant cards directly from the history list and click **"⚖️ Compare Selected (N)"** to launch side-by-side analysis.

---

### 9. Side-by-Side Applicant Comparison
Located at `/compare.html` (or `/compare.html?ids=ID1,ID2`):

- Compare up to **3 applicants side-by-side**.
- **Interactive Selector Dropdowns:** Switch applicants on the fly.
- **Key Metrics Comparison:** Side-by-side view of Credit Score, Fraud Risk, Revenue, Monthly Expenses, Disposable Surplus, and Digital % Adoption.
- **Highlight Differences Toggle:** Instantly illuminates discrepancies between profiles.
- **Direct Action Links:** Quick navigation back to individual reports.

---

### 10. PDF Report Export
On any report page (`/report.html`):
- Click **"📄 Download PDF Report"** in the top-right corner.
- Generates a multi-page, publication-ready PDF using `html2canvas` and `jsPDF`.
- Captures all charts, factor breakdown tables, amortization schedules, and decision audit stamps for offline archiving.

---

## 🎭 Pre-Loaded Demo Personas & Test Cases

| Persona | Scenario | Expected Outcome | Key Feature Highlighted |
|---|---|---|---|
| **Anil Reddy** *(Kirana Store)* | 4 yrs operating, ₹90k rev, 80% digital, verified ID. | **Auto-Approved (Band A)** | Standard clean micro-business path with prime interest rate. |
| **Lakshmi Devi** *(Handloom Weaver)* | 3 yrs operating, ₹36k rev, zero prior loans, verified ID. | **Review Queue (Band B/C)** | **Thin-file protection:** High repayment capacity despite lack of credit bureau history. |
| **Karan Sharma** *(Electronics Hub)* | Inconsistent revenue docs (+60% variance), flagged device, location mismatch. | **Fraud Referral (High Risk)** | Separate fraud engine isolates identity risk without skewing baseline financial models. |

---

## 📂 Project Directory Structure

```text
credit-ledger/
├── api/
│   ├── index.js             # Vercel serverless entrypoint
│   └── lib/                 # Core scoring, fraud, decision & financial engines
│       ├── scoring.js       # Explainable 0-100 credit scoring rules
│       ├── fraud.js         # Explainable 0-100 fraud detection rules
│       ├── decision.js      # Decision matrix & threshold engine
│       └── finance.js       # EMI, amortization & break-even calculation
├── data/
│   └── db.json              # Local persistent JSON database
├── public/
│   ├── index.html           # Landing page
│   ├── dashboard.html       # Officer dashboard with KPIs & charts
│   ├── new-assessment.html  # Application intake form with quick presets
│   ├── report.html          # Explainable report, simulator & decision controls
│   ├── review-queue.html    # Dedicated queue for pending cases
│   ├── history.html         # Audit trail & searchable applicant history
│   ├── compare.html         # Multi-applicant side-by-side comparison
│   ├── login.html           # Officer login
│   ├── register.html        # Officer registration
│   ├── about.html           # Methodology and architecture writeup
│   ├── help.html            # FAQ & usage guide
│   ├── privacy.html         # Privacy & data guidelines
│   ├── css/                 # Modern styling & design system
│   └── js/                  # Frontend controllers, Chart.js, PDF generation
├── server.js                # Built-in zero-dependency local Node.js server
├── DEPLOY.md                # Detailed cloud deployment guide
└── README.md                # Project documentation & user manual
```

---

## ☁️ Deployment Options

### Deploy to Vercel (Instant 1-Click)
1. Push repository to GitHub.
2. Import project into [Vercel](https://vercel.com/new).
3. Deploy directly — zero configuration needed (`vercel.json` and `/api` handle routing).

### Deploy to Firebase
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase login` and `firebase init`
3. Deploy with `firebase deploy`

---

## 🛡️ Privacy, Security & Compliance

- **No Data Hawking:** All demo calculations operate transparently.
- **Fair Lending Compliance:** Transparent scoring prevents algorithmic bias against rural and thin-file entrepreneurs.
- **Strict Auditability:** Every decision records the officer's ID, timestamp, and review rationale.

---

### 💡 Support & Feedback
Built for **Smart India Hackathon 2026**. For questions, feature suggestions, or documentation help, check out [help.html](file:///public/help.html) or open an issue on the repository.
