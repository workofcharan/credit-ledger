/**
 * Decision engine
 */

function decide(creditResult, fraudResult) {
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

const RECOMMENDATION_LABELS = {
  auto_approve: 'Auto-Approved',
  alt_data_approval: 'Recommend: Alternative-Data Approval',
  manual_verification: 'Recommend: Manual Verification',
  decline_fraud_investigation: 'Recommend: Decline — Pending Fraud Investigation',
};

module.exports = { decide, RECOMMENDATION_LABELS };
