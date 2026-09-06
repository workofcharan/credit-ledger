const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { scoreApplicant } = require('./lib/scoring');
const { scoreFraud } = require('./lib/fraud');
const { buildAmortizationSchedule, breakEven } = require('./lib/finance');
const { decide, RECOMMENDATION_LABELS } = require('./lib/decision');

admin.initializeApp();
const db = admin.firestore();
const officersCol = db.collection('officers');
const assessmentsCol = db.collection('assessments');

// For a real deployment: firebase functions:secrets:set JWT_SECRET
const SECRET = process.env.JWT_SECRET || 'credit-ledger-dev-secret-change-in-production';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

/* ============================== AUTH ============================== */
function requireAuth(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.officer = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}
function signToken(officer) {
  return jwt.sign(
    { id: officer.id, full_name: officer.full_name, officer_code: officer.officer_code, branch: officer.branch || null },
    SECRET,
    { expiresIn: '8h' }
  );
}
function setAuthCookie(res, token) {
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 8 * 60 * 60 * 1000 });
}
let seeded = false;
async function seedDemoOfficer() {
  const existing = await officersCol.where('officer_code', '==', 'DEMO001').limit(1).get();
  if (existing.empty) {
    const hash = bcrypt.hashSync('Demo@123', 10);
    await officersCol.add({
      full_name: 'Demo Credit Officer',
      officer_code: 'DEMO001',
      branch: 'Central Processing Unit',
      password_hash: hash,
      created_at: new Date().toISOString(),
    });
  }
}

app.post('/auth/login', async (req, res) => {
  try {
    if (!seeded) { await seedDemoOfficer(); seeded = true; }
    const { officer_code, password } = req.body;
    if (!officer_code || !password) return res.status(400).json({ error: 'Officer code and password are required' });
    const snap = await officersCol.where('officer_code', '==', officer_code.trim()).limit(1).get();
    if (snap.empty) return res.status(401).json({ error: 'Invalid officer code or password' });
    const doc = snap.docs[0];
    const officer = { id: doc.id, ...doc.data() };
    if (!bcrypt.compareSync(password, officer.password_hash)) return res.status(401).json({ error: 'Invalid officer code or password' });
    const token = signToken(officer);
    setAuthCookie(res, token);
    res.json({ token, officer: { id: officer.id, full_name: officer.full_name, officer_code: officer.officer_code, branch: officer.branch } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/auth/register', async (req, res) => {
  try {
    const { full_name, officer_code, branch, password } = req.body;
    if (!full_name || !officer_code || !password) return res.status(400).json({ error: 'Full name, officer code, and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = await officersCol.where('officer_code', '==', officer_code.trim()).limit(1).get();
    if (!existing.empty) return res.status(409).json({ error: 'Officer code already registered' });
    const hash = bcrypt.hashSync(password, 10);
    const ref = await officersCol.add({
      full_name: full_name.trim(), officer_code: officer_code.trim(), branch: branch?.trim() || null,
      password_hash: hash, created_at: new Date().toISOString(),
    });
    const officer = { id: ref.id, full_name: full_name.trim(), officer_code: officer_code.trim(), branch: branch?.trim() || null };
    const token = signToken(officer);
    setAuthCookie(res, token);
    res.status(201).json({ token, officer });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/auth/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });
app.get('/auth/me', requireAuth, (req, res) => res.json({ officer: req.officer }));

/* ============================== ASSESSMENTS ============================== */
const assessRouter = express.Router();
assessRouter.use(requireAuth);

assessRouter.post('/', async (req, res) => {
  try {
    const input = req.body;
    const required = ['applicant_name', 'business_type', 'monthly_revenue', 'monthly_expenses'];
    for (const f of required) {
      if (input[f] === undefined || input[f] === '') return res.status(400).json({ error: `Missing required field: ${f}` });
    }

    // Duplicate / repeat-application signal — org-wide, not just this officer.
    // Filtered by date in memory (not a Firestore range query) to avoid
    // requiring a composite index for this demo-scale dataset.
    let duplicateCount = 0;
    if (input.id_reference) {
      const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const dupSnap = await assessmentsCol.where('id_reference', '==', input.id_reference.trim()).get();
      duplicateCount = dupSnap.docs.filter((d) => new Date(d.data().created_at).getTime() >= cutoffMs).length;
    }

    const creditResult = scoreApplicant(input);
    const fraudResult = scoreFraud(input, duplicateCount);
    const decision = decide(creditResult, fraudResult);

    const tenure = Number(input.requested_tenure_months) || 24;
    const moratorium = Number(input.moratorium_months) || 0;
    const amort = buildAmortizationSchedule({
      principal: creditResult.recommendedAmount || 1,
      annualRatePct: creditResult.recommendedRate,
      tenureMonths: tenure,
      moratoriumMonths: moratorium,
    });
    const margin = Number(input.margin_pct) || 15;
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
      officer_id: req.officer.id,
      officer_name: req.officer.full_name,
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

    const ref = await assessmentsCol.add(record);
    res.status(201).json({ assessment: { id: ref.id, ...record }, result: resultPayload });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

assessRouter.post('/simulate', (req, res) => {
  const { principal, annualRatePct, tenureMonths, moratoriumMonths, monthlyRevenue, monthlyExpenses, marginPct } = req.body;
  const amort = buildAmortizationSchedule({
    principal: Number(principal) || 0, annualRatePct: Number(annualRatePct) || 12,
    tenureMonths: Number(tenureMonths) || 24, moratoriumMonths: Number(moratoriumMonths) || 0,
  });
  const be = breakEven({
    monthlyRevenue: Number(monthlyRevenue) || 0, monthlyExpenses: Number(monthlyExpenses) || 0, marginPct: Number(marginPct) || 15,
  });
  res.json({ amortization: amort, breakEven: be });
});

assessRouter.get('/stats', async (req, res) => {
  try {
    const snap = await assessmentsCol.orderBy('created_at', 'desc').limit(500).get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
        key: k, label: RECOMMENDATION_LABELS[k], count: rows.filter((r) => r.recommendation === k).length,
      })),
      recent: rows.slice(0, 8),
    };
    res.json({ stats });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

assessRouter.get('/', async (req, res) => {
  try {
    if (req.query.pending === '1') {
      // Single equality filter avoids needing a Firestore composite index;
      // the second condition (officer_decision is null) is applied in memory.
      const snap = await assessmentsCol.where('requires_officer_action', '==', true).get();
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => !r.officer_decision)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return res.json({ assessments: rows });
    }
    const snap = await assessmentsCol.orderBy('created_at', 'desc').limit(200).get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ assessments: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

assessRouter.get('/:id', async (req, res) => {
  try {
    const doc = await assessmentsCol.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Assessment not found' });
    const row = { id: doc.id, ...doc.data() };
    res.json({ assessment: row, result: JSON.parse(row.result_json) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Officer finalizes a referred case — the ONLY place a decline can happen.
assessRouter.patch('/:id/decision', async (req, res) => {
  try {
    const { officer_decision, officer_decision_note } = req.body;
    if (!['approved', 'declined'].includes(officer_decision)) {
      return res.status(400).json({ error: 'officer_decision must be "approved" or "declined"' });
    }
    if (officer_decision === 'declined' && !officer_decision_note?.trim()) {
      return res.status(400).json({ error: 'A note explaining the decline is required for audit purposes' });
    }
    const ref = assessmentsCol.doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Assessment not found' });
    await ref.update({
      officer_decision,
      officer_decision_note: officer_decision_note?.trim() || (officer_decision === 'approved' ? 'Approved after manual review.' : ''),
      officer_decision_by: req.officer.full_name,
      officer_decision_at: new Date().toISOString(),
    });
    const updated = await ref.get();
    res.json({ assessment: { id: updated.id, ...updated.data() } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

assessRouter.delete('/:id', async (req, res) => {
  try {
    const ref = assessmentsCol.doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Assessment not found' });
    await ref.delete();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use('/assessments', assessRouter);

exports.api = onRequest({ region: 'asia-south1' }, app);
