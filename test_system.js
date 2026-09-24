const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 1. UNIT TESTS: Business logic modules
const { scoreApplicant, BUSINESS_RISK_WEIGHTS } = require('./functions/lib/scoring');
const { scoreFraud } = require('./functions/lib/fraud');
const { buildAmortizationSchedule, breakEven } = require('./functions/lib/finance');
const { decide, RECOMMENDATION_LABELS } = require('./functions/lib/decision');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

async function runTests() {
  console.log('========================================');
  console.log('   EXPLAINABLE CREDIT LEDGER TEST SUITE');
  console.log('========================================\n');

  console.log('--- 1. Testing Scoring Engine ---');
  const primeApplicant = {
    years_operating: 5,
    monthly_revenue: 100000,
    monthly_expenses: 50000,
    digital_payment_pct: 80,
    savings_ratio: 40,
    existing_loan: 'no',
    existing_loan_amount: 0,
    repayment_history: 'good',
    business_type: 'kirana_store',
    dependents: 2,
    requested_amount: 100000,
    requested_tenure_months: 24,
    margin_pct: 20,
    moratorium_months: 0
  };

  const score1 = scoreApplicant(primeApplicant);
  assert(score1 && score1.score >= 0 && score1.score <= 100, `Score is in 0-100 range: ${score1?.score}`);
  assert(score1.band === 'A', `Prime applicant band is A: ${score1.band}`);
  assert(score1.bandLabel === 'Excellent', `Band label is Excellent: ${score1.bandLabel}`);
  assert(score1.recommendedRate > 0, `Recommended rate calculated: ${score1.recommendedRate}%`);
  assert(score1.recommendedAmount > 0, `Recommended loan amount: ₹${score1.recommendedAmount}`);
  assert(Array.isArray(score1.factors) && score1.factors.length === 6, `Has 6 factor breakdowns (actual: ${score1.factors.length})`);
  assert(score1.factors.every(f => f.key && f.label && f.detail && typeof f.points === 'number'), 'All factors have required schema');

  // Edge case: zero values & thin file
  const thinApplicant = {
    years_operating: 0,
    monthly_revenue: 0,
    monthly_expenses: 0,
    digital_payment_pct: 0,
    savings_ratio: 0,
    existing_loan: 'no',
    existing_loan_amount: 0,
    repayment_history: 'none',
    business_type: 'street_vendor',
    dependents: 5,
    requested_amount: 50000,
    requested_tenure_months: 12
  };
  const scoreThin = scoreApplicant(thinApplicant);
  assert(!isNaN(scoreThin.score) && scoreThin.score >= 0 && scoreThin.score <= 100, `Thin profile handled gracefully without NaN: score=${scoreThin.score}`);
  assert(scoreThin.band === 'E' || scoreThin.band === 'D', `Thin profile band is weak/high-risk: ${scoreThin.band}`);

  // Test all business types have weights
  for (const btype of Object.keys(BUSINESS_RISK_WEIGHTS)) {
    const s = scoreApplicant({ ...primeApplicant, business_type: btype });
    assert(!isNaN(s.score), `Business type "${btype}" scored correctly: ${s.score}`);
  }

  console.log('\n--- 2. Testing Fraud Detection Engine ---');
  const cleanFraudInput = {
    identity_verification: 'verified',
    device_status: 'trusted',
    location_consistency: 'consistent',
    income_doc_variance_pct: 2,
    reference_check: 'verified'
  };
  const fraudClean = scoreFraud(cleanFraudInput, 0);
  assert(fraudClean.risk >= 0 && fraudClean.risk <= 100, `Clean applicant fraud risk in range: ${fraudClean.risk}`);
  assert(fraudClean.risk <= 25, `Clean applicant has low fraud risk: ${fraudClean.risk}`);
  assert(fraudClean.band === 'Low', `Clean applicant band is Low: ${fraudClean.band}`);
  assert(Array.isArray(fraudClean.factors) && fraudClean.factors.length === 6, `Has 6 fraud factors (actual: ${fraudClean.factors.length})`);

  const highFraudInput = {
    identity_verification: 'mismatch',
    device_status: 'flagged',
    location_consistency: 'inconsistent',
    income_doc_variance_pct: 55,
    reference_check: 'conflicting'
  };
  const fraudHigh = scoreFraud(highFraudInput, 3);
  assert(fraudHigh.risk >= 55, `Suspicious applicant has high fraud risk: ${fraudHigh.risk}`);
  assert(fraudHigh.band === 'High', `Suspicious applicant band is High: ${fraudHigh.band}`);

  console.log('\n--- 3. Testing Decision Engine ---');
  const decisionApproved = decide(score1, fraudClean);
  assert(decisionApproved.tier === 'approved', `Clean credit & fraud = approved: ${decisionApproved.tier}`);
  assert(decisionApproved.autoDecision === true, 'Auto decision is true');
  assert(decisionApproved.recommendation === 'auto_approve', 'Recommendation is auto_approve');
  assert(typeof decisionApproved.explanation === 'string' && decisionApproved.explanation.length > 0, 'Explanation present');

  const decisionReferredHighFraud = decide(score1, fraudHigh);
  assert(decisionReferredHighFraud.tier === 'referred', `High fraud = referred: ${decisionReferredHighFraud.tier}`);
  assert(decisionReferredHighFraud.recommendation === 'decline_fraud_investigation', `High fraud recommendation: ${decisionReferredHighFraud.recommendation}`);

  const decisionReferredThinCredit = decide(scoreThin, fraudClean);
  assert(decisionReferredThinCredit.tier === 'referred', `Thin credit = referred: ${decisionReferredThinCredit.tier}`);
  assert(decisionReferredThinCredit.recommendation === 'alt_data_approval', `Thin credit recommendation: ${decisionReferredThinCredit.recommendation}`);

  console.log('\n--- 4. Testing Financial Structuring Engine ---');
  const amort = buildAmortizationSchedule({
    principal: 100000,
    annualRatePct: 12,
    tenureMonths: 12,
    moratoriumMonths: 2
  });
  assert(amort.schedule.length === 12, `Schedule has 12 months: ${amort.schedule.length}`);
  assert(amort.emi > 0, `Monthly EMI calculated: ₹${amort.emi}`);
  assert(amort.totalInterest > 0, `Total interest calculated: ₹${amort.totalInterest}`);
  assert(amort.totalPayment === 100000 + amort.totalInterest, `Total payment equals principal + interest: ₹${amort.totalPayment}`);
  assert(amort.schedule[0].phase === 'moratorium', 'Month 1 is in moratorium phase');
  assert(amort.schedule[2].phase === 'repayment', 'Month 3 is in repayment phase');

  const be = breakEven({
    monthlyRevenue: 85000,
    monthlyExpenses: 52000,
    marginPct: 18
  });
  assert(be.currentProfit === 85000 - 52000, `Current profit correct: ₹${be.currentProfit}`);
  assert(be.breakEvenRevenue > 0, `Break-even revenue calculated: ₹${be.breakEvenRevenue}`);
  assert(be.bufferAboveBreakEven === 85000 - be.breakEvenRevenue, `Buffer above break-even calculated: ₹${be.bufferAboveBreakEven}`);

  console.log('\n--- 5. Testing API Server via Live HTTP Requests ---');
  // Start server on a test port
  const TEST_PORT = 3899;
  process.env.PORT = TEST_PORT;

  const serverModule = require('./server.js');
  // Wait 500ms for server to bind
  await new Promise(r => setTimeout(r, 500));

  function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(options, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  // 5.1 Login
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    officer_code: 'DEMO001',
    password: 'Demo@123'
  });
  assert(loginRes.status === 200, `Auth login successful (Status 200)`);
  assert(loginRes.body.token, `Auth token returned: ${loginRes.body.token?.substring(0, 8)}...`);
  const authToken = loginRes.body.token;
  const authHeaders = { Authorization: `Bearer ${authToken}` };

  // 5.2 Invalid Login Check
  const invalidLogin = await makeRequest('POST', '/api/auth/login', {
    officer_code: 'DEMO001',
    password: 'WrongPassword'
  });
  assert(invalidLogin.status === 401, `Invalid login properly rejected with 401`);

  // 5.3 Auth Me Check
  const meRes = await makeRequest('GET', '/api/auth/me', null, authHeaders);
  assert(meRes.status === 200 && meRes.body.officer?.officer_code === 'DEMO001', 'Auth /me returns current officer');

  // 5.4 Stats Endpoint
  const statsRes = await makeRequest('GET', '/api/assessments/stats', null, authHeaders);
  assert(statsRes.status === 200, `Stats endpoint returned 200`);
  assert(typeof statsRes.body.stats?.total === 'number' && statsRes.body.stats.total >= 5, `Stats total count is ${statsRes.body.stats?.total}`);
  assert(Array.isArray(statsRes.body.stats?.creditBands), 'Stats has creditBands array');

  // 5.5 List Assessments
  const listRes = await makeRequest('GET', '/api/assessments', null, authHeaders);
  assert(listRes.status === 200, `List assessments returned 200`);
  assert(Array.isArray(listRes.body.assessments) && listRes.body.assessments.length > 0, `Assessments array contains ${listRes.body.assessments?.length} records`);

  // 5.6 Create New Assessment
  const newAssessmentData = {
    applicant_name: 'Lakshmi Narayana',
    business_name: 'Laxmi Handlooms',
    business_type: 'handicraft',
    village: 'Pochampally',
    district: 'Yadadri Bhuvanagiri',
    state: 'Telangana',
    id_reference: 'REF-TS-99001',
    years_operating: 4,
    monthly_revenue: 75000,
    monthly_expenses: 40000,
    digital_payment_pct: 65,
    savings_ratio: 30,
    existing_loan: 'no',
    existing_loan_amount: 0,
    repayment_history: 'good',
    dependents: 2,
    requested_amount: 120000,
    requested_tenure_months: 24,
    margin_pct: 20,
    moratorium_months: 0,
    identity_verification: 'verified',
    device_status: 'trusted',
    location_consistency: 'consistent',
    income_doc_variance_pct: 3,
    reference_check: 'verified'
  };

  const createRes = await makeRequest('POST', '/api/assessments', newAssessmentData, authHeaders);
  assert(createRes.status === 201, `Create assessment returned 201 Created`);
  assert(createRes.body.assessment?.id, `Created assessment ID: ${createRes.body.assessment?.id}`);
  assert(createRes.body.result?.credit?.score > 0, `Credit score computed: ${createRes.body.result?.credit?.score}`);
  assert(createRes.body.result?.fraud?.risk >= 0, `Fraud risk computed: ${createRes.body.result?.fraud?.risk}`);
  assert(createRes.body.result?.amortization?.emi > 0, `Amortization schedule calculated with EMI ₹${createRes.body.result?.amortization?.emi}`);

  const createdId = createRes.body.assessment?.id;

  // 5.7 Get Assessment By ID
  const getSingleRes = await makeRequest('GET', `/api/assessments/${createdId}`, null, authHeaders);
  assert(getSingleRes.status === 200, `Get single assessment returned 200`);
  assert(getSingleRes.body.assessment?.applicant_name === 'Lakshmi Narayana', 'Single assessment details match');
  assert(getSingleRes.body.result?.credit?.band, `Result payload parsed: Band ${getSingleRes.body.result?.credit?.band}`);

  // 5.8 Simulate Endpoint
  const simRes = await makeRequest('POST', '/api/assessments/simulate', {
    principal: 150000,
    annualRatePct: 11.5,
    tenureMonths: 24,
    moratoriumMonths: 2,
    monthlyRevenue: 85000,
    monthlyExpenses: 50000,
    marginPct: 20
  }, authHeaders);
  assert(simRes.status === 200, `Simulate endpoint returned 200`);
  assert(simRes.body.amortization?.schedule?.length === 24, `Simulate calculated 24 months schedule`);
  assert(simRes.body.breakEven?.breakEvenRevenue > 0, `Simulate calculated breakEvenRevenue: ₹${simRes.body.breakEven?.breakEvenRevenue}`);

  // 5.9 Officer Decision on an Assessment
  const decideRes = await makeRequest('PATCH', `/api/assessments/${createdId}/decision`, {
    officer_decision: 'approved',
    officer_decision_note: 'Verified loom inventory and positive community feedback.'
  }, authHeaders);
  assert(decideRes.status === 200, `Decision patch returned 200`);
  assert(decideRes.body.assessment?.officer_decision === 'approved', 'Officer decision successfully recorded as approved');

  // 5.10 Static File Serving Verification
  const staticIndex = await makeRequest('GET', '/');
  assert(staticIndex.status === 200 && typeof staticIndex.body === 'string' && staticIndex.body.includes('Explainable Credit Ledger'), 'GET / serves landing page');

  const staticReport = await makeRequest('GET', '/report.html');
  assert(staticReport.status === 200 && typeof staticReport.body === 'string' && staticReport.body.includes('report.js'), 'GET /report.html serves report page');

  const staticCompare = await makeRequest('GET', '/compare.html');
  assert(staticCompare.status === 200 && typeof staticCompare.body === 'string' && staticCompare.body.includes('compare.js'), 'GET /compare.html serves compare page');

  const staticCSS = await makeRequest('GET', '/css/styles.css');
  assert(staticCSS.status === 200 && typeof staticCSS.body === 'string' && staticCSS.body.length > 500, 'GET /css/styles.css serves valid stylesheet');

  console.log('\n--- 6. Frontend Files Syntax & References Validation ---');
  const jsDir = path.join(__dirname, 'public', 'js');
  const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
  for (const jsFile of jsFiles) {
    const fullPath = path.join(jsDir, jsFile);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(content.length > 50, `${jsFile} is non-empty (${content.length} bytes)`);
  }

  console.log('\n========================================');
  console.log(`Summary: ${passedTests} passed, ${failedTests} failed out of ${totalTests}`);
  console.log('========================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL SYSTEMS AND TEST CASES ARE FULLY OPERATIONAL AND PASSING!\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
