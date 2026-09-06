/**
 * Explainable, rule-based alternative-data credit scoring for rural
 * micro-entrepreneurs who typically lack formal credit history.
 */

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

function scoreApplicant(input) {
  const factors = [];
  let score = 0;

  // 1. Cash-flow health (30 pts) — surplus relative to revenue
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

  // 2. Business stability (20 pts) — years operating + sector risk
  const years = Number(input.years_operating) || 0;
  const yearsPts = clamp(Math.round(years * 3), 0, 12);
  const sectorWeight = BUSINESS_RISK_WEIGHTS[input.business_type] || 0.7;
  const sectorPts = Math.round(sectorWeight * 8);
  const stabilityPts = clamp(yearsPts + sectorPts, 0, 20);
  score += stabilityPts;
  factors.push({
    key: 'stability',
    label: 'Business stability',
    detail: `${years} year(s) operating in ${input.business_type ? input.business_type.replace('_', ' ') : 'business'} (sector resilience factor ${sectorWeight})`,
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

  // Recommended amount: multiple of average monthly surplus, capped by band
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

module.exports = { scoreApplicant, BUSINESS_RISK_WEIGHTS };
