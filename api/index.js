/**
 * Vercel Serverless Function Entrypoint for Explainable Credit Ledger
 * Zero external runtime dependencies required (uses built-in Node modules).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Load business logic from local api/lib/
const { scoreApplicant } = require('./lib/scoring');
const { scoreFraud } = require('./lib/fraud');
const { buildAmortizationSchedule, breakEven } = require('./lib/finance');
const { decide, RECOMMENDATION_LABELS } = require('./lib/decision');

// Database path in /tmp for Vercel serverless writable environment
const DB_FILE = path.join(os.tmpdir(), 'credit_ledger_db.json');

// Initial seed data with realistic diverse applicant profiles
function getInitialData() {
  const initialOfficer = {
    id: 'off_demo_001',
    full_name: 'Demo Credit Officer',
    officer_code: 'DEMO001',
    branch: 'Central Processing Unit',
    password: 'Demo@123',
    created_at: new Date().toISOString()
  };

  const seedAssessmentsInput = [
    {
      id: 'ast_seed_101',
      officer_id: 'off_demo_001',
      officer_name: 'Demo Credit Officer',
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
      identity_verification: 'verified',
      device_status: 'consistent',
      location_consistency: 'consistent',
      income_doc_variance_pct: 4,
      reference_check: 'verified_positive',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: 'ast_seed_102',
      officer_id: 'off_demo_001',
      officer_name: 'Demo Credit Officer',
      applicant_name: 'Sunita Devi',
      business_name: 'Devi Dairy & Milk Point',
      business_type: 'dairy',
      village: 'Mancherial',
      district: 'Mancherial',
      state: 'Telangana',
      id_reference: 'REF-TS-44120',
      years_operating: 6,
      monthly_revenue: 120000,
      monthly_expenses: 70000,
      digital_payment_pct: 60,
      savings_ratio: 40,
      existing_loan: 'no',
      existing_loan_amount: 0,
      repayment_history: 'good',
      dependents: 3,
      requested_amount: 200000,
      requested_tenure_months: 36,
      margin_pct: 22,
      identity_verification: 'verified',
      device_status: 'consistent',
      location_consistency: 'consistent',
      income_doc_variance_pct: 6,
      reference_check: 'verified_positive',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'ast_seed_103',
      officer_id: 'off_demo_001',
      officer_name: 'Demo Credit Officer',
      applicant_name: 'Vikram Singh',
      business_name: 'Singh Agri Inputs & Seed Hub',
      business_type: 'agri_input',
      village: 'Nizamabad Rural',
      district: 'Nizamabad',
      state: 'Telangana',
      id_reference: 'REF-TS-11234',
      years_operating: 2,
      monthly_revenue: 65000,
      monthly_expenses: 48000,
      digital_payment_pct: 45,
      savings_ratio: 20,
      existing_loan: 'yes',
      existing_loan_amount: 30000,
      repayment_history: 'average',
      dependents: 4,
      requested_amount: 100000,
      requested_tenure_months: 18,
      margin_pct: 15,
      identity_verification: 'partial',
      device_status: 'new',
      location_consistency: 'consistent',
      income_doc_variance_pct: 14,
      reference_check: 'verified_positive',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'ast_seed_104',
      officer_id: 'off_demo_001',
      officer_name: 'Demo Credit Officer',
      applicant_name: 'Farooq Ahmed',
      business_name: 'Ahmed Quick Mobile Repair',
      business_type: 'repair_services',
      village: 'Adilabad',
      district: 'Adilabad',
      state: 'Telangana',
      id_reference: 'REF-TS-67543',
      years_operating: 1,
      monthly_revenue: 45000,
      monthly_expenses: 39000,
      digital_payment_pct: 80,
      savings_ratio: 10,
      existing_loan: 'no',
      existing_loan_amount: 0,
      repayment_history: 'none',
      dependents: 1,
      requested_amount: 80000,
      requested_tenure_months: 12,
      margin_pct: 15,
      identity_verification: 'mismatch',
      device_status: 'flagged',
      location_consistency: 'inconsistent',
      income_doc_variance_pct: 35,
      reference_check: 'conflicting',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString()
    }
  ];

  const assessments = seedAssessmentsInput.map(item => {
    const creditResult = scoreApplicant(item);
    const fraudResult = scoreFraud(item, 0);
    const decision = decide(creditResult, fraudResult);
    const tenure = item.requested_tenure_months || 24;
    const moratorium = 0;
    const margin = item.margin_pct || 15;
    const amort = buildAmortizationSchedule({
      principal: creditResult.recommendedAmount || item.requested_amount,
      annualRatePct: creditResult.recommendedRate,
      tenureMonths: tenure,
      moratoriumMonths: moratorium,
    });
    const be = breakEven({
      monthlyRevenue: item.monthly_revenue,
      monthlyExpenses: item.monthly_expenses,
      marginPct: margin,
    });

    const isAuto = decision.autoDecision;
    const isDeclinedSeed = item.applicant_name === 'Farooq Ahmed';

    return {
      ...item,
      credit_score: creditResult.score,
      credit_band: creditResult.band,
      fraud_score: fraudResult.risk,
      fraud_band: fraudResult.band,
      decision_tier: decision.tier,
      recommendation: decision.recommendation,
      requires_officer_action: !isAuto,
      officer_decision: isDeclinedSeed ? 'declined' : (isAuto ? 'approved' : null),
      officer_decision_note: isDeclinedSeed ? 'Declined due to KYC mismatch and flagged device indicators.' : (isAuto ? 'Auto-approved — clean credit and fraud signals.' : null),
      officer_decision_by: isDeclinedSeed ? 'Demo Credit Officer' : (isAuto ? 'System' : null),
      officer_decision_at: (isAuto || isDeclinedSeed) ? item.created_at : null,
      result_json: JSON.stringify({
        credit: creditResult,
        fraud: fraudResult,
        decision,
        amortization: amort,
        breakEven: be,
        tenure, moratorium, margin
      })
    };
  });

  return {
    officers: [initialOfficer],
    assessments: assessments
  };
}

let inMemoryDb = null;

function loadDb() {
  if (inMemoryDb) return inMemoryDb;
  try {
    if (fs.existsSync(DB_FILE)) {
      inMemoryDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } else {
      inMemoryDb = getInitialData();
      saveDb();
    }
  } catch {
    inMemoryDb = getInitialData();
  }
  return inMemoryDb;
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDb, null, 2), 'utf8');
  } catch (err) {
    // In-memory fallback if disk write is disallowed
  }
}

const sessions = new Map();

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
}

function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    ...headers
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    if (typeof req.body === 'string' && req.body) {
      try {
        return resolve(JSON.parse(req.body));
      } catch (err) {
        return reject(err);
      }
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

module.exports = async function handler(req, res) {
  try {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
      });
      return res.end();
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url || '/', `http://${host}`);
    let pathname = parsedUrl.pathname || '/';

    // Clean /api prefix
    let apiPath = pathname.replace(/^\/api/, '');
    if (!apiPath.startsWith('/')) {
      apiPath = '/' + apiPath;
    }

    const dataStore = loadDb();
    const fallbackOfficer = (dataStore.officers && dataStore.officers[0]) || {
      id: 'off_demo_001',
      full_name: 'Demo Credit Officer',
      officer_code: 'DEMO001',
      branch: 'Central Processing Unit'
    };
    const cookies = parseCookies(req);
    const token = cookies.token || (req.headers.authorization || '').replace('Bearer ', '');
    const currentOfficer = sessions.get(token) || (token === 'demo_token' ? fallbackOfficer : null);
    const officer = currentOfficer || fallbackOfficer;

    // Auth routes
    if (apiPath === '/auth/login' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const { officer_code, password } = body;
        const found = dataStore.officers.find(o => o.officer_code === (officer_code || '').trim());
        if (!found || (found.password && found.password !== password)) {
          return sendJson(res, 401, { error: 'Invalid officer code or password' });
        }
        const newToken = 'tok_' + crypto.randomBytes(16).toString('hex');
        sessions.set(newToken, found);
        return sendJson(res, 200, {
          token: newToken,
          officer: { id: found.id, full_name: found.full_name, officer_code: found.officer_code, branch: found.branch }
        }, {
          'Set-Cookie': `token=${newToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`
        });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (apiPath === '/auth/register' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const { full_name, officer_code, branch, password } = body;
        if (!full_name || !officer_code || !password) {
          return sendJson(res, 400, { error: 'Full name, officer code, and password are required' });
        }
        if (password.length < 6) {
          return sendJson(res, 400, { error: 'Password must be at least 6 characters' });
        }
        if (dataStore.officers.some(o => o.officer_code === officer_code.trim())) {
          return sendJson(res, 409, { error: 'Officer code already registered' });
        }
        const newOfficer = {
          id: 'off_' + crypto.randomBytes(6).toString('hex'),
          full_name: full_name.trim(),
          officer_code: officer_code.trim(),
          branch: branch ? branch.trim() : null,
          password: password,
          created_at: new Date().toISOString()
        };
        dataStore.officers.push(newOfficer);
        saveDb();
        const newToken = 'tok_' + crypto.randomBytes(16).toString('hex');
        sessions.set(newToken, newOfficer);
        return sendJson(res, 201, {
          token: newToken,
          officer: { id: newOfficer.id, full_name: newOfficer.full_name, officer_code: newOfficer.officer_code, branch: newOfficer.branch }
        }, {
          'Set-Cookie': `token=${newToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`
        });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (apiPath === '/auth/logout' && req.method === 'POST') {
      if (token) sessions.delete(token);
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': 'token=; Path=/; HttpOnly; Max-Age=0'
      });
    }

    if (apiPath === '/auth/me' && req.method === 'GET') {
      return sendJson(res, 200, { officer });
    }

    // /api/assessments/stats
    if (apiPath === '/assessments/stats' && req.method === 'GET') {
      const rows = [...dataStore.assessments].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      const stats = {
        total: rows.length,
        approved: rows.filter((r) => r.officer_decision === 'approved').length,
        declined: rows.filter((r) => r.officer_decision === 'declined').length,
        pendingReview: rows.filter((r) => r.requires_officer_action && !r.officer_decision).length,
        fraudHigh: rows.filter((r) => r.fraud_band === 'High').length,
        fraudMedium: rows.filter((r) => r.fraud_band === 'Medium').length,
        fraudLow: rows.filter((r) => r.fraud_band === 'Low').length,
        creditBands: ['A', 'B', 'C', 'D', 'E'].map((b) => ({ band: b, count: rows.filter((r) => r.credit_band === b).length })),
        recommendationBreakdown: Object.keys(RECOMMENDATION_LABELS).map((k) => ({
          key: k,
          label: RECOMMENDATION_LABELS[k],
          count: rows.filter((r) => r.recommendation === k).length,
        })),
        recent: rows.slice(0, 8),
      };
      return sendJson(res, 200, { stats });
    }

    // /api/assessments
    if (apiPath === '/assessments' || apiPath.startsWith('/assessments?')) {
      if (req.method === 'GET') {
        const isPending = parsedUrl.searchParams.get('pending') === '1';
        let rows = [...dataStore.assessments];
        if (isPending) {
          rows = rows.filter((r) => r.requires_officer_action && !r.officer_decision);
        }
        rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        return sendJson(res, 200, { assessments: rows });
      }

      if (req.method === 'POST') {
        try {
          const input = await parseJsonBody(req);
          const required = ['applicant_name', 'business_type', 'monthly_revenue', 'monthly_expenses'];
          for (const f of required) {
            if (input[f] === undefined || input[f] === '') {
              return sendJson(res, 400, { error: `Missing required field: ${f}` });
            }
          }

          let duplicateCount = 0;
          if (input.id_reference) {
            const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
            duplicateCount = dataStore.assessments.filter(d =>
              d.id_reference &&
              d.id_reference.trim().toLowerCase() === input.id_reference.trim().toLowerCase() &&
              new Date(d.created_at).getTime() >= cutoffMs
            ).length;
          }

          const creditResult = scoreApplicant(input);
          const fraudResult = scoreFraud(input, duplicateCount);
          const decision = decide(creditResult, fraudResult);

          const tenure = Number(input.requested_tenure_months) || 24;
          const moratorium = Number(input.moratorium_months) || 0;
          const margin = Number(input.margin_pct) || 15;

          const amort = buildAmortizationSchedule({
            principal: creditResult.recommendedAmount || 10000,
            annualRatePct: creditResult.recommendedRate,
            tenureMonths: tenure,
            moratoriumMonths: moratorium,
          });
          const be = breakEven({
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

          const record = {
            id: 'ast_' + crypto.randomBytes(6).toString('hex'),
            officer_id: officer.id,
            officer_name: officer.full_name,
            applicant_name: input.applicant_name,
            business_name: input.business_name || null,
            business_type: input.business_type,
            village: input.village || null,
            district: input.district || null,
            state: input.state || null,
            id_reference: input.id_reference ? input.id_reference.trim() : null,
            years_operating: Number(input.years_operating) || 0,
            monthly_revenue: Number(input.monthly_revenue),
            monthly_expenses: Number(input.monthly_expenses),
            existing_loan: input.existing_loan || 'no',
            existing_loan_amount: Number(input.existing_loan_amount) || 0,
            repayment_history: input.repayment_history || 'none',
            digital_payment_pct: Number(input.digital_payment_pct) || 0,
            savings_ratio: Number(input.savings_ratio) || 0,
            dependents: Number(input.dependents) || 0,
            requested_amount: Number(input.requested_amount) || 0,
            requested_tenure_months: tenure,
            margin_pct: margin,
            identity_verification: input.identity_verification || 'partial',
            device_status: input.device_status || 'new',
            location_consistency: input.location_consistency || 'consistent',
            income_doc_variance_pct: Number(input.income_doc_variance_pct) || 0,
            reference_check: input.reference_check || 'unverifiable',
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

          dataStore.assessments.unshift(record);
          saveDb();
          return sendJson(res, 201, { assessment: record, result: resultPayload });
        } catch (err) {
          return sendJson(res, 500, { error: err.message });
        }
      }
    }

    // /api/assessments/simulate
    if (apiPath === '/assessments/simulate' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const { principal, annualRatePct, tenureMonths, moratoriumMonths, monthlyRevenue, monthlyExpenses, marginPct } = body;
        const amort = buildAmortizationSchedule({
          principal: Number(principal) || 0,
          annualRatePct: Number(annualRatePct) || 12,
          tenureMonths: Number(tenureMonths) || 24,
          moratoriumMonths: Number(moratoriumMonths) || 0,
        });
        const be = breakEven({
          monthlyRevenue: Number(monthlyRevenue) || 0,
          monthlyExpenses: Number(monthlyExpenses) || 0,
          marginPct: Number(marginPct) || 15,
        });
        return sendJson(res, 200, { amortization: amort, breakEven: be });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    // /api/assessments/:id/decision
    const decisionMatch = apiPath.match(/^\/assessments\/([^/]+)\/decision$/);
    if (decisionMatch && (req.method === 'PATCH' || req.method === 'POST')) {
      const id = decisionMatch[1];
      const item = dataStore.assessments.find(a => a.id === id);
      if (!item) return sendJson(res, 404, { error: 'Assessment not found' });
      try {
        const body = await parseJsonBody(req);
        const { officer_decision, officer_decision_note } = body;
        if (!['approved', 'declined'].includes(officer_decision)) {
          return sendJson(res, 400, { error: 'officer_decision must be "approved" or "declined"' });
        }
        if (officer_decision === 'declined' && !officer_decision_note?.trim()) {
          return sendJson(res, 400, { error: 'A note explaining the decline is required for audit purposes' });
        }
        item.officer_decision = officer_decision;
        item.officer_decision_note = officer_decision_note?.trim() || (officer_decision === 'approved' ? 'Approved after manual review.' : '');
        item.officer_decision_by = officer.full_name;
        item.officer_decision_at = new Date().toISOString();
        saveDb();
        return sendJson(res, 200, { assessment: item });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    // /api/assessments/:id
    const singleMatch = apiPath.match(/^\/assessments\/([^/]+)$/);
    if (singleMatch) {
      const id = singleMatch[1];
      const item = dataStore.assessments.find(a => a.id === id);
      if (!item) return sendJson(res, 404, { error: 'Assessment not found' });

      if (req.method === 'GET') {
        let resultObj = {};
        try {
          resultObj = JSON.parse(item.result_json);
        } catch {}
        return sendJson(res, 200, { assessment: item, result: resultObj });
      }

      if (req.method === 'DELETE') {
        dataStore.assessments = dataStore.assessments.filter(a => a.id !== id);
        saveDb();
        return sendJson(res, 200, { ok: true });
      }
    }

    return sendJson(res, 404, { error: `API endpoint not found: ${pathname}` });
  } catch (globalErr) {
    console.error('Unhandled Vercel function error:', globalErr);
    return sendJson(res, 500, { error: globalErr.message || 'Internal Server Error' });
  }
};
