/**
 * Compare Applicants — Interactive Multi-Applicant Comparison View
 * Explains credit & fraud scores side-by-side with full interactive controls.
 */

let allAvailableAssessments = [];
let highlightDifferences = true;

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
    // 1. Fetch all available assessments for selection
    const res = await API.get('/assessments');
    allAvailableAssessments = (res?.assessments || []).filter(a => a && a.id);

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
          <p>You need at least 2 applications on file to compare them side-by-side.</p>
          <div style="display:flex; gap:12px; justify-content:center; margin-top:14px;">
            <a href="/new-assessment.html" class="btn btn-primary btn-sm">+ Create Another Assessment</a>
            <a href="/report.html?id=${allAvailableAssessments[0].id}" class="btn btn-outline btn-sm">View Single Report</a>
          </div>
        </div>`;
      return;
    }

    // 2. Get current compare selection
    let selection = getCompareSelection();

    // Filter selection to ensure all IDs exist in allAvailableAssessments
    selection = selection.filter(id => allAvailableAssessments.some(a => a.id === id));

    // If 1 applicant is selected, preserve it and pair with a 2nd available applicant
    if (selection.length === 1 && allAvailableAssessments.length >= 2) {
      const second = allAvailableAssessments.find(a => a.id !== selection[0]);
      if (second) {
        selection.push(second.id);
        setCompareSelection(selection);
      }
    } else if (selection.length === 0 && allAvailableAssessments.length >= 2) {
      // If 0 selected, default to first 2 available
      selection = allAvailableAssessments.slice(0, 2).map(a => a.id);
      setCompareSelection(selection);
    }

    // 3. Extract details for selected items directly from available assessments
    let validDetails = selection.map(id => {
      const a = allAvailableAssessments.find(item => item.id === id);
      if (!a) return null;
      let r = {};
      try {
        r = typeof a.result_json === 'string' ? JSON.parse(a.result_json) : (a.result_json || {});
      } catch {}
      return { assessment: a, result: r };
    }).filter(Boolean);

    // If somehow we have fewer than 2 valid details, fallback to first 2
    if (validDetails.length < 2 && allAvailableAssessments.length >= 2) {
      selection = allAvailableAssessments.slice(0, 2).map(a => a.id);
      setCompareSelection(selection);
      validDetails = selection.map(id => {
        const a = allAvailableAssessments.find(item => item.id === id);
        let r = {};
        try { r = typeof a.result_json === 'string' ? JSON.parse(a.result_json) : (a.result_json || {}); } catch {}
        return { assessment: a, result: r };
      }).filter(Boolean);
    }

    const currentSelectedIds = validDetails.map(d => d.assessment.id);
    setCompareSelection(currentSelectedIds);

    // Compute best values across compared candidates
    const scores = validDetails.map(d => d.assessment.credit_score || 0);
    const maxCreditScore = Math.max(...scores);

    const fraudRisks = validDetails.map(d => d.assessment.fraud_score || 0);
    const minFraudRisk = Math.min(...fraudRisks);

    const surpluses = validDetails.map(d => (d.assessment.monthly_revenue || 0) - (d.assessment.monthly_expenses || 0));
    const maxSurplus = Math.max(...surpluses);

    const rates = validDetails.map(d => d.result?.credit?.recommendedRate || 14);
    const minRate = Math.min(...rates);

    // Unselected applicants available to add
    const unselected = allAvailableAssessments.filter(a => !currentSelectedIds.includes(a.id));

    // Column class: 2 or 3 columns
    const totalSlots = Math.min(validDetails.length + (unselected.length > 0 && validDetails.length < 3 ? 1 : 0), 3);
    const colClass = totalSlots === 3 ? 'compare-col-3' : 'compare-col-2';

    // Dropdown builder for switching applicant in a column
    function buildSelectOptions(currentId) {
      return allAvailableAssessments.map(item => {
        const selected = item.id === currentId ? 'selected' : '';
        const band = item.credit_band || 'C';
        const label = `${escapeHtml(item.applicant_name)} (${escapeHtml(item.business_name || item.business_type || 'Business')} · Band ${band})`;
        return `<option value="${item.id}" ${selected}>${label}</option>`;
      }).join('');
    }

    wrap.innerHTML = `
      <div class="compare-toolbar">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span style="font-size:15px; font-weight:700; color:var(--text-main);">
            Comparing <strong>${validDetails.length}</strong> of ${allAvailableAssessments.length} Applicants
          </span>
          <span style="font-size:12.5px; color:var(--text-muted);">(Side-by-side explainability matrix)</span>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          ${validDetails.length < 3 && unselected.length > 0 ? `
            <select id="addApplicantSelect" class="form-input" style="padding:6px 12px; font-size:13px; max-width:240px; cursor:pointer;">
              <option value="">+ Add applicant to compare...</option>
              ${unselected.map(u => `<option value="${u.id}">${escapeHtml(u.applicant_name)} (Band ${u.credit_band || 'C'})</option>`).join('')}
            </select>
          ` : ''}
          <button class="btn btn-outline btn-sm" id="toggleHighlightsBtn" title="Toggle best metric tags">
            ${highlightDifferences ? '⭐ Hide Best Badges' : '⭐ Show Best Badges'}
          </button>
          <button class="btn btn-outline btn-sm" id="resetCompareBtn">↺ Reset Top 2</button>
          <button class="btn btn-outline btn-sm" id="printCompareBtn">🖨️ Print</button>
        </div>
      </div>

      <div class="compare-grid ${colClass}">
        ${validDetails.map(({ assessment: a, result: r }, idx) => {
          const surplus = (a.monthly_revenue || 0) - (a.monthly_expenses || 0);
          const rate = r?.credit?.recommendedRate || (a.credit_band === 'A' ? 9.5 : a.credit_band === 'B' ? 11.5 : 14);
          const recAmount = r?.credit?.recommendedAmount || a.requested_amount;

          const isBestCredit = highlightDifferences && validDetails.length > 1 && a.credit_score === maxCreditScore && maxCreditScore > 0;
          const isBestFraud = highlightDifferences && validDetails.length > 1 && a.fraud_score === minFraudRisk;
          const isBestSurplus = highlightDifferences && validDetails.length > 1 && surplus === maxSurplus && maxSurplus > 0;
          const isBestRate = highlightDifferences && validDetails.length > 1 && rate === minRate;

          const needsDecision = a.requires_officer_action && !a.officer_decision;

          return `
            <div class="compare-card">
              <button class="btn-ghost btn-sm remove-compare-btn" data-remove-id="${a.id}" style="position:absolute; top:12px; right:12px; color:var(--text-faint); font-size:16px; cursor:pointer; padding:2px 8px;" title="Remove applicant from comparison">✕</button>

              <div style="margin-bottom:12px; padding-right:24px;">
                <label style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">
                  Applicant ${idx + 1}
                </label>
                <select class="form-input switch-applicant-select" data-current-id="${a.id}" style="font-weight:600; padding:6px 10px; font-size:13.5px; width:100%;">
                  ${buildSelectOptions(a.id)}
                </select>
              </div>

              <div class="biz">
                ${escapeHtml(a.business_name || (a.business_type || '').replace(/_/g, ' '))} · ${escapeHtml(a.village || '')}${a.state ? ', ' + escapeHtml(a.state) : ''}
              </div>
              
              <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
                <span class="band-pill band-${a.credit_band}">Credit Band ${a.credit_band} (${a.credit_score})</span>
                <span class="fraud-pill fraud-${a.fraud_band}">Fraud ${a.fraud_band} (${a.fraud_score})</span>
              </div>

              <div class="compare-row">
                <span class="k">Credit Score</span>
                <span class="v" style="color:${bandColor(a.credit_band)};">
                  ${a.credit_score} / 100
                  ${isBestCredit ? '<span class="best-tag">Best</span>' : ''}
                </span>
              </div>

              <div class="compare-row">
                <span class="k">Fraud Risk</span>
                <span class="v" style="color:${fraudColor(a.fraud_band)};">
                  ${a.fraud_score} / 100
                  ${isBestFraud ? '<span class="best-tag">Lowest Risk</span>' : ''}
                </span>
              </div>

              <div class="compare-row">
                <span class="k">Decision Status</span>
                <span class="v">${statusLabel(a)}</span>
              </div>

              <div class="compare-row">
                <span class="k">Recommendation</span>
                <span class="v" style="font-size:12px; max-width:60%; text-align:right;">
                  ${RECOMMENDATION_LABELS[a.recommendation] || a.recommendation}
                </span>
              </div>

              <div class="compare-row">
                <span class="k">Monthly Revenue</span>
                <span class="v">${money(a.monthly_revenue)}</span>
              </div>

              <div class="compare-row">
                <span class="k">Monthly Expenses</span>
                <span class="v">${money(a.monthly_expenses)}</span>
              </div>

              <div class="compare-row">
                <span class="k">Monthly Surplus</span>
                <span class="v" style="color:var(--teal-deep);">
                  ${money(surplus)}
                  ${isBestSurplus ? '<span class="best-tag">Highest</span>' : ''}
                </span>
              </div>

              <div class="compare-row">
                <span class="k">Requested Loan</span>
                <span class="v">${money(a.requested_amount)} (${a.requested_tenure_months || 24}m)</span>
              </div>

              <div class="compare-row">
                <span class="k">Recommended Loan</span>
                <span class="v" style="color:var(--teal-deep);">
                  ${money(recAmount)}
                </span>
              </div>

              <div class="compare-row">
                <span class="k">Recommended Rate</span>
                <span class="v">
                  ${rate}%
                  ${isBestRate ? '<span class="best-tag">Lowest Rate</span>' : ''}
                </span>
              </div>

              <div class="compare-row">
                <span class="k">Digital Payments</span>
                <span class="v">${a.digital_payment_pct || 0}%</span>
              </div>

              <div class="compare-row">
                <span class="k">Years in Operation</span>
                <span class="v">${a.years_operating} yrs</span>
              </div>

              <div class="compare-row">
                <span class="k">Identity Verification</span>
                <span class="v">${escapeHtml(a.identity_verification || 'verified')}</span>
              </div>

              <div class="compare-row">
                <span class="k">Device Reputation</span>
                <span class="v">${escapeHtml(a.device_status || 'trusted')}</span>
              </div>

              <div style="margin-top:16px; display:flex; flex-direction:column; gap:8px;">
                ${needsDecision ? `
                  <a class="btn btn-primary btn-sm btn-block" href="/report.html?id=${a.id}">Review &amp; Decide Case →</a>
                ` : `
                  <a class="btn btn-outline btn-sm btn-block" href="/report.html?id=${a.id}">View Full Report →</a>
                `}
              </div>
            </div>
          `;
        }).join('')}

        ${validDetails.length < 3 && unselected.length > 0 ? `
          <div class="compare-empty-slot">
            <div class="slot-icon">➕</div>
            <h4 style="font-size:15px; margin-bottom:6px;">Add 3rd Applicant</h4>
            <p style="font-size:12.5px; color:var(--text-muted); margin-bottom:16px; max-width:220px;">
              Select another applicant to compare 3 cases side-by-side.
            </p>
            <select id="slotAddSelect" class="form-input" style="padding:8px 12px; font-size:13px; max-width:240px; width:100%; cursor:pointer;">
              <option value="">Choose applicant...</option>
              ${unselected.map(u => `<option value="${u.id}">${escapeHtml(u.applicant_name)} (Band ${u.credit_band || 'C'})</option>`).join('')}
            </select>
          </div>
        ` : ''}
      </div>`;

    // Handler: Switch applicant in column (with clean position swap if already selected)
    wrap.querySelectorAll('.switch-applicant-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const newId = e.target.value;
        const oldId = sel.dataset.currentId;
        if (!newId || newId === oldId) return;

        let current = getCompareSelection();
        const oldIndex = current.indexOf(oldId);
        const existingIndex = current.indexOf(newId);

        if (existingIndex !== -1 && oldIndex !== -1) {
          // Swap positions
          current[existingIndex] = oldId;
          current[oldIndex] = newId;
        } else if (oldIndex !== -1) {
          current[oldIndex] = newId;
        } else {
          current.push(newId);
        }

        setCompareSelection(current);
        renderCompareView();
      });
    });

    // Handler: Add applicant from top toolbar select
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

    // Handler: Add applicant from empty slot select
    document.getElementById('slotAddSelect')?.addEventListener('change', (e) => {
      const newId = e.target.value;
      if (!newId) return;
      let current = getCompareSelection();
      if (!current.includes(newId) && current.length < 3) {
        current.push(newId);
        setCompareSelection(current);
        renderCompareView();
      }
    });

    // Handler: Toggle best metric badges
    document.getElementById('toggleHighlightsBtn')?.addEventListener('click', () => {
      highlightDifferences = !highlightDifferences;
      renderCompareView();
    });

    // Handler: Reset to default top 2
    document.getElementById('resetCompareBtn')?.addEventListener('click', () => {
      const top2 = allAvailableAssessments.slice(0, 2).map(a => a.id);
      setCompareSelection(top2);
      showToast('Reset comparison to top 2 applicants.');
      renderCompareView();
    });

    // Handler: Print comparison
    document.getElementById('printCompareBtn')?.addEventListener('click', () => {
      window.print();
    });

    // Handler: Remove an applicant
    wrap.querySelectorAll('.remove-compare-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idToRemove = btn.dataset.removeId;
        let remaining = getCompareSelection().filter(id => id !== idToRemove);

        if (remaining.length === 0 && allAvailableAssessments.length >= 2) {
          remaining = allAvailableAssessments.slice(0, 2).map(a => a.id);
          showToast('Comparison requires at least 1 applicant; reset to defaults.');
        } else if (remaining.length === 1 && allAvailableAssessments.length >= 2) {
          // If only 1 remains, pair with another available applicant or show with empty slot
          const next = allAvailableAssessments.find(a => a.id !== remaining[0]);
          if (next) remaining.push(next.id);
        }

        setCompareSelection(remaining);
        renderCompareView();
      });
    });

  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message || 'Error loading comparison view.')}</p></div>`;
  }
}
