/**
 * Compare Applicants — Interactive Multi-Applicant Comparison View
 */

let allAvailableAssessments = [];

document.addEventListener('DOMContentLoaded', async () => {
  const officer = await initProtectedPage();
  if (!officer) return;

  // Check URL query params for ?ids=...
  const urlParams = new URLSearchParams(window.location.search);
  const idsParam = urlParams.get('ids');
  if (idsParam) {
    const passedIds = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (passedIds.length > 0) {
      setCompareSelection(passedIds);
    }
  }

  await renderCompareView();
});

async function renderCompareView() {
  const wrap = document.getElementById('compareContent');
  if (!wrap) return;

  try {
    // 1. Fetch all available assessments for selection dropdowns
    const res = await API.get('/assessments');
    allAvailableAssessments = (res?.assessments || []).filter(a => a && a.id);

    // 2. Get current compare selection
    let selection = getCompareSelection();

    // If fewer than 2 applicants are selected, auto-select the first 2 available
    if (selection.length < 2 && allAvailableAssessments.length >= 2) {
      selection = allAvailableAssessments.slice(0, 2).map(a => a.id);
      setCompareSelection(selection);
    }

    if (allAvailableAssessments.length === 0) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🗂️</div>
          <h3>No applications on file yet</h3>
          <p>Please create assessments first to compare them side-by-side.</p>
          <a href="/new-assessment.html" class="btn btn-primary btn-sm" style="margin-top:12px;">+ Create New Assessment</a>
        </div>`;
      return;
    }

    if (allAvailableAssessments.length === 1) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="emoji">ℹ️</div>
          <h3>Only 1 application available</h3>
          <p>You need at least 2 applications to compare them side-by-side.</p>
          <div style="display:flex; gap:12px; justify-content:center; margin-top:14px;">
            <a href="/new-assessment.html" class="btn btn-primary btn-sm">+ Create Another Assessment</a>
            <a href="/report.html?id=${allAvailableAssessments[0].id}" class="btn btn-outline btn-sm">View Single Report</a>
          </div>
        </div>`;
      return;
    }

    // 3. Load details for selected IDs
    let details = await Promise.all(
      selection.map(id => API.get(`/assessments/${id}`).catch(() => null))
    );
    let validDetails = (details || []).filter(d => d && d.assessment && d.assessment.id);

    // If some selected IDs were invalid, replace with available records
    if (validDetails.length < 2 && allAvailableAssessments.length >= 2) {
      const fallbackIds = allAvailableAssessments.slice(0, 2).map(a => a.id);
      setCompareSelection(fallbackIds);
      details = await Promise.all(
        fallbackIds.map(id => API.get(`/assessments/${id}`).catch(() => null))
      );
      validDetails = (details || []).filter(d => d && d.assessment && d.assessment.id);
    }

    const currentSelectedIds = validDetails.map(d => d.assessment.id);
    setCompareSelection(currentSelectedIds);

    const colClass = validDetails.length === 3 ? 'compare-col-3' : 'compare-col-2';

    // Build applicant select dropdown options
    function buildSelectOptions(currentId) {
      return allAvailableAssessments.map(item => {
        const selected = item.id === currentId ? 'selected' : '';
        const band = item.credit_band || 'C';
        const label = `${escapeHtml(item.applicant_name)} (${escapeHtml(item.business_name || item.business_type || 'Business')} · Band ${band})`;
        return `<option value="${item.id}" ${selected}>${label}</option>`;
      }).join('');
    }

    // Unselected applicants that can be added
    const unselected = allAvailableAssessments.filter(a => !currentSelectedIds.includes(a.id));

    wrap.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; margin-bottom:20px;">
        <div>
          <span style="font-size:15px; font-weight:600; color:var(--text-main);">Comparing <strong>${validDetails.length}</strong> applicants</span>
          <span style="font-size:13px; color:var(--text-muted); margin-left:8px;">(Switch or add applicants below)</span>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          ${validDetails.length < 3 && unselected.length > 0 ? `
            <div style="display:flex; align-items:center; gap:6px;">
              <select id="addApplicantSelect" class="form-input" style="padding:6px 12px; font-size:13px; max-width:240px;">
                <option value="">+ Add applicant to compare...</option>
                ${unselected.map(u => `<option value="${u.id}">${escapeHtml(u.applicant_name)}</option>`).join('')}
              </select>
            </div>
          ` : ''}
          <button class="btn btn-outline btn-sm" id="resetCompareBtn">Reset to Default</button>
        </div>
      </div>

      <div class="compare-grid ${colClass}">
        ${validDetails.map(({ assessment: a, result: r }, idx) => `
          <div class="compare-card" style="position:relative;">
            ${validDetails.length > 2 ? `
              <button class="btn-ghost btn-sm remove-compare-btn" data-remove-id="${a.id}" style="position:absolute; top:12px; right:12px; color:var(--text-faint); font-size:16px; cursor:pointer;" title="Remove from comparison">✕</button>
            ` : ''}

            <div style="margin-bottom:12px;">
              <label style="font-size:11.5px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); font-weight:600; display:block; margin-bottom:4px;">
                Applicant ${idx + 1}
              </label>
              <select class="form-input switch-applicant-select" data-current-id="${a.id}" style="font-weight:600; padding:6px 10px; font-size:14px; width:100%;">
                ${buildSelectOptions(a.id)}
              </select>
            </div>

            <div class="biz" style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
              ${escapeHtml(a.business_name || (a.business_type || '').replace(/_/g, ' '))} · ${escapeHtml(a.village || '')}${a.state ? ', ' + escapeHtml(a.state) : ''}
            </div>
            
            <div style="display:flex; gap:8px; margin-bottom:14px;">
              <span class="band-pill band-${a.credit_band}">Credit Band ${a.credit_band} (${a.credit_score})</span>
              <span class="fraud-pill fraud-${a.fraud_band}">Fraud ${a.fraud_band} (${a.fraud_score})</span>
            </div>

            <div class="compare-row"><span class="k">Credit Score</span><span class="v" style="color:${bandColor(a.credit_band)}; font-weight:700;">${a.credit_score} / 100</span></div>
            <div class="compare-row"><span class="k">Fraud Risk</span><span class="v" style="color:${fraudColor(a.fraud_band)}; font-weight:700;">${a.fraud_score} / 100</span></div>
            <div class="compare-row"><span class="k">Decision Status</span><span class="v">${statusLabel(a)}</span></div>
            <div class="compare-row"><span class="k">Recommendation</span><span class="v" style="font-size:12px;">${RECOMMENDATION_LABELS[a.recommendation] || a.recommendation}</span></div>
            <div class="compare-row"><span class="k">Monthly Revenue</span><span class="v">${money(a.monthly_revenue)}</span></div>
            <div class="compare-row"><span class="k">Monthly Expenses</span><span class="v">${money(a.monthly_expenses)}</span></div>
            <div class="compare-row"><span class="k">Monthly Surplus</span><span class="v" style="font-weight:600; color:var(--teal-deep);">${money((a.monthly_revenue || 0) - (a.monthly_expenses || 0))}</span></div>
            <div class="compare-row"><span class="k">Requested Loan</span><span class="v">${money(a.requested_amount)} (${a.requested_tenure_months || 24}m)</span></div>
            <div class="compare-row"><span class="k">Recommended Loan</span><span class="v" style="color:var(--teal-deep); font-weight:700;">${money(r?.credit?.recommendedAmount || a.requested_amount)}</span></div>
            <div class="compare-row"><span class="k">Digital Payments</span><span class="v">${a.digital_payment_pct || 0}%</span></div>
            <div class="compare-row"><span class="k">Years in Operation</span><span class="v">${a.years_operating} yrs</span></div>
            <div class="compare-row"><span class="k">Identity Check</span><span class="v">${escapeHtml(a.identity_verification || 'verified')}</span></div>
            <div class="compare-row"><span class="k">Device Status</span><span class="v">${escapeHtml(a.device_status || 'trusted')}</span></div>
            
            <div style="margin-top:16px;">
              <a class="btn btn-outline btn-sm btn-block" href="/report.html?id=${a.id}">View Full Report →</a>
            </div>
          </div>
        `).join('')}
      </div>`;

    // Handler: Switch applicant in a column
    wrap.querySelectorAll('.switch-applicant-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const newId = e.target.value;
        const oldId = sel.dataset.currentId;
        if (!newId || newId === oldId) return;

        let current = getCompareSelection();
        const index = current.indexOf(oldId);
        if (index !== -1) {
          current[index] = newId;
        } else {
          current.push(newId);
        }
        // Deduplicate
        current = [...new Set(current)];
        setCompareSelection(current);
        renderCompareView();
      });
    });

    // Handler: Add 3rd applicant
    document.getElementById('addApplicantSelect')?.addEventListener('change', (e) => {
      const newId = e.target.value;
      if (!newId) return;
      let current = getCompareSelection();
      if (!current.includes(newId) && current.length < 3) {
        current.push(newId);
        setCompareSelection(current);
        renderCompareView();
      }
    });

    // Handler: Reset to default top 2
    document.getElementById('resetCompareBtn')?.addEventListener('click', () => {
      const top2 = allAvailableAssessments.slice(0, 2).map(a => a.id);
      setCompareSelection(top2);
      renderCompareView();
    });

    // Handler: Remove an applicant
    wrap.querySelectorAll('.remove-compare-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idToRemove = btn.dataset.removeId;
        const remaining = getCompareSelection().filter(id => id !== idToRemove);
        setCompareSelection(remaining);
        renderCompareView();
      });
    });

  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message || 'Error loading comparison view.')}</p></div>`;
  }
}
