/**
 * Explainable, rule-based fraud risk scoring — deliberately separate from
 * credit scoring. Credit risk answers "can they repay?"; fraud risk answers
 * "is this really them, and is this application genuine?". Keeping the two
 * scores apart is what lets a genuine, thin-credit-file applicant avoid
 * being lumped in with actual fraud.
 */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function scoreFraud(input, duplicateCount = 0) {
  const factors = [];
  let risk = 0;

  // 1. Identity verification match (0-35)
  const idMap = { verified: 0, partial: 18, mismatch: 35 };
  const idPts = idMap[input.identity_verification] ?? 18;
  risk += idPts;
  factors.push({
    key: 'identity',
    label: 'Identity verification',
    detail: `KYC match result: ${(input.identity_verification || 'partial').replace('_', ' ')}`,
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
    detail: `Application device: ${(input.device_status || 'new').replace('_', ' ')}`,
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
    detail: `Reference check result: ${(input.reference_check || 'unverifiable').replace('_', ' ')}`,
    points: refPts,
    max: 10,
  });

  // 6. Duplicate / repeat application signal (0-20, not user-entered — computed server-side)
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

module.exports = { scoreFraud };
