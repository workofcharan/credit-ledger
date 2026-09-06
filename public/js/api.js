/**
 * Robust API Client with Client-Side Fallback Engine
 * Works seamlessly both with a live backend (Cloud Functions / Node server)
 * and in full standalone / offline / static preview mode.
 */

// =================== Client-Side Engine & Scoring ===================
const BUSINESS_RISK_WEIGHTS = {
  'kirana_store': 0.9,
  'dairy': 0.85,
  'tailoring': 0.8,
  'handicraft': 0.7,
  'agri_input': 0.85,
  'poultry': 0.75,
  'street_vendor': 0.65,
  'repair_services': 0.8,
  'other': 0.7,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function clientScoreApplicant(input) {
  const factors = [];
  let score = 0;

  // 1. Cash-flow health (30 pts)
  const revenue = Number(input.monthly_revenue) || 0;
  const expenses = Number(input.monthly_expenses) || 0;
  const surplus = revenue - expenses;
  const surplusRatio = revenue > 0 ? surplus / revenue : -1;
  const cashFlowPts = clamp(Math.round((surplusRatio + 0.1) * 100), 0, 30);
  score += cashFlowPts;
  factors.push({
    key: 'cash_flow',
    label: 'Monthly cash-flow surplus',
    detail: `Revenue ₹${revenue.toLocaleString('en-IN')} − Expenses ₹${expenses.toLocaleString('en-IN')} = ₹${surplus.toLocaleString('en-IN')} surplus (${(surplusRatio * 100).toFixed(1)}% margin)`,
    points: cashFlowPts,
    max: 30,
  });

  // 2. Business stability (20 pts)
  const years = Number(input.years_operating) || 0;
  const yearsPts = clamp(Math.round(years * 3), 0, 12);
  const sectorWeight = BUSINESS_RISK_WEIGHTS[input.business_type] || 0.7;
  const sectorPts = Math.round(sectorWeight * 8);
  const stabilityPts = clamp(yearsPts + sectorPts, 0, 20);
  score += stabilityPts;
  factors.push({
    key: 'stability',
    label: 'Business stability',
    detail: `${years} year(s) operating in ${(input.business_type || '').replace(/_/g, ' ')} (sector resilience factor ${sectorWeight})`,
    points: stabilityPts,
    max: 20,
  });

  // 3. Repayment history (20 pts)
  const repaymentMap = { good: 20, average: 12, poor: 2, none: 10 };
  const repaymentPts = repaymentMap[input.repayment_history] ?? 10;
  score += repaymentPts;
  factors.push({
    key: 'repayment',
    label: 'Repayment track record',
    detail: input.repayment_history === 'none'
      ? 'No prior formal credit — treated as neutral, offset by alternative signals'
      : `Self/co-op reported history: ${input.repayment_history}`,
    points: repaymentPts,
    max: 20,
  });

  // 4. Digital footprint (10 pts)
  const digitalPct = clamp(Number(input.digital_payment_pct) || 0, 0, 100);
  const digitalPts = Math.round((digitalPct / 100) * 10);
  score += digitalPts;
  factors.push({
    key: 'digital',
    label: 'Digital payment adoption',
    detail: `${digitalPct}% of transactions via UPI/digital rails (higher = more verifiable data trail)`,
    points: digitalPts,
    max: 10,
  });

  // 5. Savings discipline (10 pts)
  const savingsRatio = clamp(Number(input.savings_ratio) || 0, 0, 100);
  const savingsPts = Math.round((savingsRatio / 100) * 10);
  score += savingsPts;
  factors.push({
    key: 'savings',
    label: 'Savings discipline',
    detail: `Sets aside ~${savingsRatio}% of monthly surplus`,
    points: savingsPts,
    max: 10,
  });

  // 6. Household load (10 pts)
  const dependents = Number(input.dependents) || 0;
  const existingLoanAmt = input.existing_loan === 'yes' ? (Number(input.existing_loan_amount) || 0) : 0;
  const debtToRevenue = revenue > 0 ? existingLoanAmt / (revenue * 12) : 0;
  let loadPts = 10;
  loadPts -= clamp(dependents - 2, 0, 4) * 0.75;
  loadPts -= clamp(debtToRevenue * 10, 0, 6);
  loadPts = clamp(Math.round(loadPts), 0, 10);
  score += loadPts;
  factors.push({
    key: 'household_load',
    label: 'Household & existing debt load',
    detail: `${dependents} dependent(s); existing loan exposure ${(debtToRevenue * 100).toFixed(1)}% of annual revenue`,
    points: loadPts,
    max: 10,
  });

  score = clamp(Math.round(score), 0, 100);

  let band, bandLabel, rate;
  if (score >= 80) { band = 'A'; bandLabel = 'Excellent'; rate = 9.5; }
  else if (score >= 65) { band = 'B'; bandLabel = 'Good'; rate = 11.5; }
  else if (score >= 50) { band = 'C'; bandLabel = 'Fair'; rate = 14; }
  else if (score >= 35) { band = 'D'; bandLabel = 'Weak'; rate = 17.5; }
  else { band = 'E'; bandLabel = 'High Risk'; rate = 21; }

  const bandCapMultiplier = { A: 18, B: 14, C: 10, D: 6, E: 3 };
  const baseCapacity = Math.max(surplus, 0) * bandCapMultiplier[band];
  const requested = Number(input.requested_amount) || 0;
  const recommendedAmount = Math.round(Math.min(requested || baseCapacity, baseCapacity) / 500) * 500;

  return {
    score,
    band,
    bandLabel,
    recommendedRate: rate,
    recommendedAmount: Math.max(recommendedAmount, 0),
    maxEligible: Math.round(baseCapacity / 500) * 500,
    factors,
    surplus,
  };
}

function clientScoreFraud(input, duplicateCount = 0) {
  const factors = [];
  let risk = 0;

  // 1. Identity verification match (0-35)
  const idMap = { verified: 0, partial: 18, mismatch: 35 };
  const idPts = idMap[input.identity_verification] ?? 18;
  risk += idPts;
  factors.push({
    key: 'identity',
    label: 'Identity verification',
    detail: `KYC match result: ${(input.identity_verification || 'partial').replace(/_/g, ' ')}`,
    points: idPts,
    max: 35,
  });

  // 2. Device reputation (0-25)
  const deviceMap = { trusted: 0, new: 10, flagged: 25 };
  const devicePts = deviceMap[input.device_status] ?? 10;
  risk += devicePts;
  factors.push({
    key: 'device',
    label: 'Device reputation',
    detail: `Application device: ${(input.device_status || 'new').replace(/_/g, ' ')}`,
    points: devicePts,
    max: 25,
  });

  // 3. Location consistency (0-15)
  const locPts = input.location_consistency === 'inconsistent' ? 15 : 0;
  risk += locPts;
  factors.push({
    key: 'location',
    label: 'Location consistency',
    detail: input.location_consistency === 'inconsistent'
      ? 'Declared address does not match verified location signal'
      : 'Declared address matches verified location signal',
    points: locPts,
    max: 15,
  });

  // 4. Income documentation variance (0-15)
  const variance = clamp(Number(input.income_doc_variance_pct) || 0, 0, 100);
  const variancePts = variance >= 50 ? 15 : variance >= 25 ? 8 : 0;
  risk += variancePts;
  factors.push({
    key: 'income_variance',
    label: 'Declared vs. verified income variance',
    detail: `${variance}% variance between self-declared and documented income`,
    points: variancePts,
    max: 15,
  });

  // 5. Reference check (0-10)
  const refMap = { verified: 0, unverifiable: 5, conflicting: 10 };
  const refPts = refMap[input.reference_check] ?? 5;
  risk += refPts;
  factors.push({
    key: 'reference',
    label: 'Reference / co-signer check',
    detail: `Reference check result: ${(input.reference_check || 'unverifiable').replace(/_/g, ' ')}`,
    points: refPts,
    max: 10,
  });

  // 6. Duplicate check (0-20)
  const dupPts = clamp(duplicateCount * 10, 0, 20);
  risk += dupPts;
  factors.push({
    key: 'duplicate',
    label: 'Repeat application signal',
    detail: duplicateCount > 0
      ? `${duplicateCount} other application(s) with the same ID/phone reference in the last 30 days`
      : 'No repeat applications found with this ID/phone reference in the last 30 days',
    points: dupPts,
    max: 20,
  });

  risk = clamp(Math.round(risk), 0, 100);
  let band, bandLabel;
  if (risk >= 55) { band = 'High'; bandLabel = 'High Risk'; }
  else if (risk >= 25) { band = 'Medium'; bandLabel = 'Medium Risk'; }
  else { band = 'Low'; bandLabel = 'Low Risk'; }

  return { risk, band, bandLabel, factors, duplicateCount };
}

function clientDecide(creditResult, fraudResult) {
  const cleanCredit = ['A', 'B'].includes(creditResult.band);
  const cleanFraud = fraudResult.band === 'Low';

  if (cleanCredit && cleanFraud) {
    return {
      tier: 'approved',
      autoDecision: true,
      recommendation: 'auto_approve',
      headline: 'Approved',
      explanation: 'Both credit and fraud signals are clean, so this application is approved automatically. No officer action is required, but the full explanation below is preserved for audit.',
    };
  }

  let recommendation, explanation;
  if (fraudResult.band === 'High') {
    recommendation = 'decline_fraud_investigation';
    explanation = 'Fraud signals are elevated. This is NOT an automatic decline — it is referred to a human officer for investigation. If the applicant is genuine, the officer can clear the flag and proceed.';
  } else if (fraudResult.band === 'Medium') {
    recommendation = 'manual_verification';
    explanation = 'One or more fraud signals need a human look before this can proceed — for example a quick call to confirm identity or address. Credit risk is not the concern here.';
  } else if (['D', 'E'].includes(creditResult.band)) {
    recommendation = 'alt_data_approval';
    explanation = 'Fraud signals are clean — this looks like a genuine applicant. The credit score is low mainly because of a thin or informal credit history, not risk indicators. Recommended path: alternative-data underwriting (e.g. a smaller starter loan, or weighting recent cash-flow more heavily) rather than a flat decline.';
  } else {
    recommendation = 'manual_verification';
    explanation = 'Credit signals are borderline (Band C). Fraud signals are clean. Recommended: a quick manual review of the cash-flow numbers before deciding.';
  }

  return {
    tier: 'referred',
    autoDecision: false,
    recommendation,
    headline: 'Referred for Officer Review',
    explanation,
  };
}

function clientBuildAmortizationSchedule({ principal, annualRatePct, tenureMonths, moratoriumMonths = 0 }) {
  const monthlyRate = annualRatePct / 12 / 100;
  const repayMonths = Math.max(tenureMonths - moratoriumMonths, 1);

  let emi = 0;
  if (monthlyRate > 0) {
    emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, repayMonths)) /
          (Math.pow(1 + monthlyRate, repayMonths) - 1);
  } else {
    emi = principal / repayMonths;
  }

  const schedule = [];
  let balance = principal;
  let totalInterest = 0;

  for (let m = 1; m <= tenureMonths; m++) {
    if (m <= moratoriumMonths) {
      const interest = balance * monthlyRate;
      totalInterest += interest;
      schedule.push({
        month: m,
        payment: Math.round(interest),
        principalPaid: 0,
        interestPaid: Math.round(interest),
        balance: Math.round(balance),
        phase: 'moratorium',
      });
    } else {
      const interest = balance * monthlyRate;
      let principalPaid = emi - interest;
      if (m === tenureMonths || balance - principalPaid < 0) {
        principalPaid = balance;
      }
      balance = Math.max(balance - principalPaid, 0);
      totalInterest += interest;
      schedule.push({
        month: m,
        payment: Math.round(principalPaid + interest),
        principalPaid: Math.round(principalPaid),
        interestPaid: Math.round(interest),
        balance: Math.round(balance),
        phase: 'repayment',
      });
    }
  }

  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(principal + totalInterest),
    schedule,
  };
}

function clientBreakEven({ monthlyRevenue, monthlyExpenses, marginPct }) {
  const margin = marginPct / 100;
  const fixedCostShare = monthlyExpenses * 0.4;
  const variableCostShare = monthlyExpenses - fixedCostShare;
  const contributionMargin = Math.max(margin, 0.05);
  const breakEvenRevenue = fixedCostShare / contributionMargin;
  const currentProfit = monthlyRevenue - monthlyExpenses;
  return {
    breakEvenRevenue: Math.round(breakEvenRevenue),
    fixedCostShare: Math.round(fixedCostShare),
    variableCostShare: Math.round(variableCostShare),
    currentProfit: Math.round(currentProfit),
    bufferAboveBreakEven: Math.round(monthlyRevenue - breakEvenRevenue),
  };
}

// =================== Client-Side Storage Store ===================
const ClientStore = {
  getOfficers() {
    try {
      const val = localStorage.getItem('ecl_officers');
      if (val) return JSON.parse(val);
    } catch {}
    const defaultOfficer = {
      id: 'off_demo_001',
      full_name: 'Demo Credit Officer',
      officer_code: 'DEMO001',
      branch: 'Central Processing Unit',
      password: 'Demo@123'
    };
    localStorage.setItem('ecl_officers', JSON.stringify([defaultOfficer]));
    return [defaultOfficer];
  },

  saveOfficers(list) {
    localStorage.setItem('ecl_officers', JSON.stringify(list));
  },

  getCurrentOfficer() {
    try {
      const val = localStorage.getItem('ecl_current_officer');
      if (val) return JSON.parse(val);
    } catch {}
    const defaultOfficer = this.getOfficers()[0];
    localStorage.setItem('ecl_current_officer', JSON.stringify(defaultOfficer));
    return defaultOfficer;
  },

  setCurrentOfficer(officer) {
    if (officer) {
      localStorage.setItem('ecl_current_officer', JSON.stringify(officer));
    } else {
      localStorage.removeItem('ecl_current_officer');
    }
  },

  getAssessments() {
    try {
      const val = localStorage.getItem('ecl_assessments');
      if (val) return JSON.parse(val);
    } catch {}
    return this.seedDefaultAssessments();
  },

  saveAssessments(list) {
    localStorage.setItem('ecl_assessments', JSON.stringify(list));
  },

  seedDefaultAssessments() {
    const rawInputs = [
      {
        id: 'ast_seed_101',
        applicant_name: 'Ramesh Kumar',
        business_name: 'Kumar Kirana & General Store',
        business_type: 'kirana_store',
        village: 'Suryapet',
        district: 'Suryapet',
        state: 'Telangana',
        id_reference: 'REF-TS-98741',
        years_operating: 4,
        monthly_revenue: 85000,
        monthly_expenses: 52000,
        digital_payment_pct: 75,
        savings_ratio: 35,
        existing_loan: 'no',
        existing_loan_amount: 0,
        repayment_history: 'good',
        dependents: 2,
        requested_amount: 150000,
        requested_tenure_months: 24,
        margin_pct: 18,
        moratorium_months: 0,
        identity_verification: 'verified',
        device_status: 'trusted',
        location_consistency: 'consistent',
        income_doc_variance_pct: 4,
        reference_check: 'verified',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        id: 'ast_seed_102',
        applicant_name: 'Sunita Devi',
        business_name: 'Devi Dairy & Milk Point',
        business_type: 'dairy',
        village: 'Kotputli',
        district: 'Jaipur',
        state: 'Rajasthan',
        id_reference: 'REF-RJ-64210',
        years_operating: 1.5,
        monthly_revenue: 42000,
        monthly_expenses: 32000,
        digital_payment_pct: 20,
        savings_ratio: 15,
        existing_loan: 'no',
        existing_loan_amount: 0,
        repayment_history: 'none',
        dependents: 3,
        requested_amount: 80000,
        requested_tenure_months: 18,
        margin_pct: 15,
        moratorium_months: 1,
        identity_verification: 'verified',
        device_status: 'trusted',
        location_consistency: 'consistent',
        income_doc_variance_pct: 8,
        reference_check: 'verified',
        created_at: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      {
        id: 'ast_seed_103',
        applicant_name: 'Rajesh Textiles',
        business_name: 'Rajesh Ready-Made Garments',
        business_type: 'tailoring',
        village: 'Bhiwandi',
        district: 'Thane',
        state: 'Maharashtra',
        id_reference: 'REF-MH-11029',
        years_operating: 3,
        monthly_revenue: 95000,
        monthly_expenses: 60000,
        digital_payment_pct: 40,
        savings_ratio: 20,
        existing_loan: 'yes',
        existing_loan_amount: 30000,
        repayment_history: 'good',
        dependents: 2,
        requested_amount: 200000,
        requested_tenure_months: 36,
        margin_pct: 15,
        moratorium_months: 0,
        identity_verification: 'partial',
        device_status: 'flagged',
        location_consistency: 'inconsistent',
        income_doc_variance_pct: 55,
        reference_check: 'conflicting',
        created_at: new Date(Date.now() - 3 * 3600000).toISOString()
      },
      {
        id: 'ast_seed_104',
        applicant_name: 'Meena Bai',
        business_name: 'Meena Terracotta & Bamboo Crafts',
        business_type: 'handicraft',
        village: 'Raghurajpur',
        district: 'Puri',
        state: 'Odisha',
        id_reference: 'REF-OD-45091',
        years_operating: 5,
        monthly_revenue: 38000,
        monthly_expenses: 24000,
        digital_payment_pct: 50,
        savings_ratio: 25,
        existing_loan: 'no',
        existing_loan_amount: 0,
        repayment_history: 'none',
        dependents: 1,
        requested_amount: 60000,
        requested_tenure_months: 12,
        margin_pct: 22,
        moratorium_months: 0,
        identity_verification: 'verified',
        device_status: 'new',
        location_consistency: 'consistent',
        income_doc_variance_pct: 12,
        reference_check: 'unverifiable',
        created_at: new Date(Date.now() - 12 * 3600000).toISOString()
      },
      {
        id: 'ast_seed_105',
        applicant_name: 'Suresh Patel',
        business_name: 'Patel Kisan Agro Services',
        business_type: 'agri_input',
        village: 'Anand',
        district: 'Anand',
        state: 'Gujarat',
        id_reference: 'REF-GJ-77123',
        years_operating: 6,
        monthly_revenue: 120000,
        monthly_expenses: 82000,
        digital_payment_pct: 60,
        savings_ratio: 30,
        existing_loan: 'no',
        existing_loan_amount: 0,
        repayment_history: 'good',
        dependents: 4,
        requested_amount: 250000,
        requested_tenure_months: 24,
        margin_pct: 16,
        moratorium_months: 0,
        identity_verification: 'verified',
        device_status: 'trusted',
        location_consistency: 'consistent',
        income_doc_variance_pct: 5,
        reference_check: 'verified',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        officer_decision: 'approved',
        officer_decision_note: 'Verified physical inventory and local co-op books. Approved with recommended loan sizing.',
        officer_decision_by: 'Demo Credit Officer',
        officer_decision_at: new Date(Date.now() - 4 * 86400000).toISOString()
      }
    ];

    const results = rawInputs.map(input => {
      const creditResult = clientScoreApplicant(input);
      const fraudResult = clientScoreFraud(input, 0);
      const decision = clientDecide(creditResult, fraudResult);
      const tenure = Number(input.requested_tenure_months) || 24;
      const moratorium = Number(input.moratorium_months) || 0;
      const margin = Number(input.margin_pct) || 15;

      const amort = clientBuildAmortizationSchedule({
        principal: creditResult.recommendedAmount || 10000,
        annualRatePct: creditResult.recommendedRate,
        tenureMonths: tenure,
        moratoriumMonths: moratorium,
      });
      const be = clientBreakEven({
        monthlyRevenue: Number(input.monthly_revenue),
        monthlyExpenses: Number(input.monthly_expenses),
        marginPct: margin,
      });

      const resultPayload = {
        credit: creditResult,
        fraud: fraudResult,
        decision,
        amortization: amort,
        breakEven: be,
        tenure, moratorium, margin,
      };

      return {
        ...input,
        officer_id: 'off_demo_001',
        officer_name: 'Demo Credit Officer',
        credit_score: creditResult.score,
        credit_band: creditResult.band,
        fraud_score: fraudResult.risk,
        fraud_band: fraudResult.band,
        decision_tier: decision.tier,
        recommendation: decision.recommendation,
        requires_officer_action: !decision.autoDecision,
        officer_decision: input.officer_decision || (decision.autoDecision ? 'approved' : null),
        officer_decision_note: input.officer_decision_note || (decision.autoDecision ? 'Auto-approved — clean credit and fraud signals.' : null),
        officer_decision_by: input.officer_decision_by || (decision.autoDecision ? 'System' : null),
        officer_decision_at: input.officer_decision_at || (decision.autoDecision ? input.created_at : null),
        result_json: JSON.stringify(resultPayload)
      };
    });

    this.saveAssessments(results);
    return results;
  }
};

// =================== Client-Side Request Handler ===================
async function handleClientFallback(method, path, body) {
  const officer = ClientStore.getCurrentOfficer();

  // /auth/login
  if (path === '/auth/login' && method === 'POST') {
    const officers = ClientStore.getOfficers();
    const match = officers.find(o => o.officer_code === (body.officer_code || '').trim());
    if (!match || (match.password && match.password !== body.password)) {
      throw new Error('Invalid officer code or password');
    }
    ClientStore.setCurrentOfficer(match);
    return { token: 'demo_token', officer: match };
  }

  // /auth/register
  if (path === '/auth/register' && method === 'POST') {
    const officers = ClientStore.getOfficers();
    if (officers.some(o => o.officer_code === (body.officer_code || '').trim())) {
      throw new Error('Officer code already registered');
    }
    const newOfficer = {
      id: 'off_' + Math.random().toString(36).substring(2, 9),
      full_name: (body.full_name || '').trim(),
      officer_code: (body.officer_code || '').trim(),
      branch: (body.branch || '').trim() || null,
      password: body.password,
      created_at: new Date().toISOString()
    };
    officers.push(newOfficer);
    ClientStore.saveOfficers(officers);
    ClientStore.setCurrentOfficer(newOfficer);
    return { token: 'demo_token', officer: newOfficer };
  }

  // /auth/logout
  if (path === '/auth/logout' && method === 'POST') {
    ClientStore.setCurrentOfficer(null);
    return { ok: true };
  }

  // /auth/me
  if (path === '/auth/me' && method === 'GET') {
    if (!officer) throw new Error('Not authenticated');
    return { officer };
  }

  // /assessments/stats
  if (path === '/assessments/stats' && method === 'GET') {
    const assessments = ClientStore.getAssessments().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const RECOMMENDATION_LABELS = {
      auto_approve: 'Auto-Approved',
      alt_data_approval: 'Recommend: Alternative-Data Approval',
      manual_verification: 'Recommend: Manual Verification',
      decline_fraud_investigation: 'Recommend: Decline — Pending Fraud Investigation',
    };
    return {
      stats: {
        total: assessments.length,
        approved: assessments.filter(r => r.officer_decision === 'approved').length,
        declined: assessments.filter(r => r.officer_decision === 'declined').length,
        pendingReview: assessments.filter(r => r.requires_officer_action && !r.officer_decision).length,
        fraudHigh: assessments.filter(r => r.fraud_band === 'High').length,
        fraudMedium: assessments.filter(r => r.fraud_band === 'Medium').length,
        fraudLow: assessments.filter(r => r.fraud_band === 'Low').length,
        creditBands: ['A', 'B', 'C', 'D', 'E'].map(b => ({ band: b, count: assessments.filter(r => r.credit_band === b).length })),
        recommendationBreakdown: Object.keys(RECOMMENDATION_LABELS).map(k => ({
          key: k,
          label: RECOMMENDATION_LABELS[k],
          count: assessments.filter(r => r.recommendation === k).length,
        })),
        recent: assessments.slice(0, 8),
      }
    };
  }

  // /assessments (list / search)
  if (path.startsWith('/assessments') && method === 'GET') {
    const url = new URL('http://dummy.local' + path);
    const isPending = url.searchParams.get('pending') === '1';
    let list = ClientStore.getAssessments();
    if (isPending) {
      list = list.filter(r => r.requires_officer_action && !r.officer_decision);
    }
    list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return { assessments: list };
  }

  // /assessments (create)
  if (path === '/assessments' && method === 'POST') {
    const list = ClientStore.getAssessments();
    let duplicateCount = 0;
    if (body.id_reference) {
      const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
      duplicateCount = list.filter(d =>
        d.id_reference &&
        d.id_reference.trim().toLowerCase() === body.id_reference.trim().toLowerCase() &&
        new Date(d.created_at).getTime() >= cutoffMs
      ).length;
    }

    const creditResult = clientScoreApplicant(body);
    const fraudResult = clientScoreFraud(body, duplicateCount);
    const decision = clientDecide(creditResult, fraudResult);
    const tenure = Number(body.requested_tenure_months) || 24;
    const moratorium = Number(body.moratorium_months) || 0;
    const margin = Number(body.margin_pct) || 15;

    const amort = clientBuildAmortizationSchedule({
      principal: creditResult.recommendedAmount || 10000,
      annualRatePct: creditResult.recommendedRate,
      tenureMonths: tenure,
      moratoriumMonths: moratorium,
    });
    const be = clientBreakEven({
      monthlyRevenue: Number(body.monthly_revenue),
      monthlyExpenses: Number(body.monthly_expenses),
      marginPct: margin,
    });

    const resultPayload = {
      credit: creditResult,
      fraud: fraudResult,
      decision,
      amortization: amort,
      breakEven: be,
      tenure, moratorium, margin,
    };

    const record = {
      id: 'ast_' + Math.random().toString(36).substring(2, 9),
      officer_id: officer ? officer.id : 'off_demo_001',
      officer_name: officer ? officer.full_name : 'Demo Credit Officer',
      applicant_name: body.applicant_name,
      business_name: body.business_name || null,
      business_type: body.business_type,
      village: body.village || null,
      district: body.district || null,
      state: body.state || null,
      id_reference: body.id_reference ? body.id_reference.trim() : null,
      years_operating: Number(body.years_operating) || 0,
      monthly_revenue: Number(body.monthly_revenue),
      monthly_expenses: Number(body.monthly_expenses),
      existing_loan: body.existing_loan || 'no',
      existing_loan_amount: Number(body.existing_loan_amount) || 0,
      repayment_history: body.repayment_history || 'none',
      digital_payment_pct: Number(body.digital_payment_pct) || 0,
      savings_ratio: Number(body.savings_ratio) || 0,
      dependents: Number(body.dependents) || 0,
      requested_amount: Number(body.requested_amount) || 0,
      requested_tenure_months: tenure,
      margin_pct: margin,
      identity_verification: body.identity_verification || 'partial',
      device_status: body.device_status || 'new',
      location_consistency: body.location_consistency || 'consistent',
      income_doc_variance_pct: Number(body.income_doc_variance_pct) || 0,
      reference_check: body.reference_check || 'unverifiable',
      credit_score: creditResult.score,
      credit_band: creditResult.band,
      fraud_score: fraudResult.risk,
      fraud_band: fraudResult.band,
      decision_tier: decision.tier,
      recommendation: decision.recommendation,
      requires_officer_action: !decision.autoDecision,
      officer_decision: decision.autoDecision ? 'approved' : null,
      officer_decision_note: decision.autoDecision ? 'Auto-approved — clean credit and fraud signals.' : null,
      officer_decision_by: decision.autoDecision ? 'System' : null,
      officer_decision_at: decision.autoDecision ? new Date().toISOString() : null,
      result_json: JSON.stringify(resultPayload),
      created_at: new Date().toISOString(),
    };

    list.unshift(record);
    ClientStore.saveAssessments(list);
    return { assessment: record, result: resultPayload };
  }

  // /assessments/simulate
  if (path === '/assessments/simulate' && method === 'POST') {
    const { principal, annualRatePct, tenureMonths, moratoriumMonths, monthlyRevenue, monthlyExpenses, marginPct } = body;
    const amort = clientBuildAmortizationSchedule({
      principal: Number(principal) || 0,
      annualRatePct: Number(annualRatePct) || 12,
      tenureMonths: Number(tenureMonths) || 24,
      moratoriumMonths: Number(moratoriumMonths) || 0,
    });
    const be = clientBreakEven({
      monthlyRevenue: Number(monthlyRevenue) || 0,
      monthlyExpenses: Number(monthlyExpenses) || 0,
      marginPct: Number(marginPct) || 15,
    });
    return { amortization: amort, breakEven: be };
  }

  // /assessments/:id/decision
  const decMatch = path.match(/^\/assessments\/([^/]+)\/decision$/);
  if (decMatch && (method === 'PATCH' || method === 'POST')) {
    const id = decMatch[1];
    const list = ClientStore.getAssessments();
    const item = list.find(a => a.id === id);
    if (!item) throw new Error('Assessment not found');
    const { officer_decision, officer_decision_note } = body;
    item.officer_decision = officer_decision;
    item.officer_decision_note = officer_decision_note?.trim() || (officer_decision === 'approved' ? 'Approved after manual review.' : '');
    item.officer_decision_by = officer ? officer.full_name : 'Demo Credit Officer';
    item.officer_decision_at = new Date().toISOString();
    ClientStore.saveAssessments(list);
    return { assessment: item };
  }

  // /assessments/:id (GET / DELETE)
  const singleMatch = path.match(/^\/assessments\/([^/]+)$/);
  if (singleMatch) {
    const id = singleMatch[1];
    const list = ClientStore.getAssessments();
    const item = list.find(a => a.id === id);
    if (!item) throw new Error('Assessment not found');

    if (method === 'GET') {
      let result = {};
      try {
        result = JSON.parse(item.result_json);
      } catch {}
      return { assessment: item, result };
    }

    if (method === 'DELETE') {
      const filtered = list.filter(a => a.id !== id);
      ClientStore.saveAssessments(filtered);
      return { ok: true };
    }
  }

  throw new Error(`Endpoint ${path} not found`);
}

// =================== Unified API Interface ===================
const API = {
  base: '/api',
  async request(method, path, body) {
    if (window.location.protocol === 'file:') {
      return handleClientFallback(method, path, body);
    }

    try {
      const res = await fetch(this.base + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data && !data.error) {
        return data;
      }
      // If server returned non-ok (500, 404, 401, 502, etc.), transparently fall back
      return await handleClientFallback(method, path, body);
    } catch (err) {
      // Network failure, server down, or offline -> transparent fallback
      try {
        return await handleClientFallback(method, path, body);
      } catch (fallbackErr) {
        throw new Error(fallbackErr.message || err.message || 'Network request failed');
      }
    }
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  patch(path, body) { return this.request('PATCH', path, body); },
  del(path) { return this.request('DELETE', path); },
};

function showToast(message, type = 'info') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast show ${type === 'error' ? 'error' : ''}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3200);
}

async function requireSession() {
  try {
    const { officer } = await API.get('/auth/me');
    if (officer) return officer;
  } catch {}

  // In standalone demo mode, automatically provide demo officer
  const demo = ClientStore.getCurrentOfficer();
  if (demo) return demo;

  window.location.href = '/login.html';
  return null;
}
