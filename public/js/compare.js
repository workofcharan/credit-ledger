document.addEventListener('DOMContentLoaded', async () => {
  const officer = await initProtectedPage();
  if (!officer) return;

  await renderCompareView();
});

async function renderCompareView() {
  const wrap = document.getElementById('compareContent');
  if (!wrap) return;

  const selection = getCompareSelection();
  if (selection.length < 2) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="emoji">⚖️</div>
        <h3>Select applicants to compare</h3>
        <p>Please select 2 or 3 applicants from the <a href="/history.html">History</a> page to compare them side-by-side.</p>
        <a href="/history.html" class="btn btn-primary btn-sm" style="margin-top:10px;">Go to History →</a>
      </div>`;
    return;
  }

  try {
    const details = await Promise.all(selection.map((id) => API.get(`/assessments/${id}`)));
    const validDetails = details.filter(d => d && d.assessment);

    if (validDetails.length < 2) {
      wrap.innerHTML = `<div class="empty-state"><div class="emoji">⚠️</div><p>Some selected records could not be loaded. Please return to <a href="/history.html">History</a>.</p></div>`;
      return;
    }

    const colClass = validDetails.length === 3 ? 'compare-col-3' : 'compare-col-2';

    wrap.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
        <span style="font-size:14px; color:var(--text-muted);">Comparing <strong>${validDetails.length}</strong> applicants side-by-side</span>
        <button class="btn btn-outline btn-sm" id="clearCompareBtn">Clear Comparison</button>
      </div>

      <div class="compare-grid ${colClass}">
        ${validDetails.map(({ assessment: a, result: r }) => `
          <div class="compare-card" style="position:relative;">
            <button class="btn-ghost btn-sm remove-compare-btn" data-remove-id="${a.id}" style="position:absolute; top:12px; right:12px; color:var(--text-faint); font-size:16px; cursor:pointer;" title="Remove from comparison">✕</button>
            <h4 style="font-size:17px; margin-bottom:2px; padding-right:24px;">${escapeHtml(a.applicant_name)}</h4>
            <div class="biz" style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">
              ${escapeHtml(a.business_name || (a.business_type || '').replace(/_/g, ' '))} · ${escapeHtml(a.village || '')}${a.state ? ', ' + escapeHtml(a.state) : ''}
            </div>
            
            <div style="display:flex; gap:8px; margin-bottom:14px;">
              <span class="band-pill band-${a.credit_band}">Credit Band ${a.credit_band}</span>
              <span class="fraud-pill fraud-${a.fraud_band}">Fraud ${a.fraud_band}</span>
            </div>

            <div class="compare-row"><span class="k">Credit Score</span><span class="v" style="color:${bandColor(a.credit_band)};">${a.credit_score} / 100</span></div>
            <div class="compare-row"><span class="k">Fraud Risk</span><span class="v" style="color:${fraudColor(a.fraud_band)};">${a.fraud_score} / 100</span></div>
            <div class="compare-row"><span class="k">Status</span><span class="v">${statusLabel(a)}</span></div>
            <div class="compare-row"><span class="k">Recommendation</span><span class="v" style="font-size:12px;">${RECOMMENDATION_LABELS[a.recommendation] || a.recommendation}</span></div>
            <div class="compare-row"><span class="k">Monthly Revenue</span><span class="v">${money(a.monthly_revenue)}</span></div>
            <div class="compare-row"><span class="k">Monthly Expenses</span><span class="v">${money(a.monthly_expenses)}</span></div>
            <div class="compare-row"><span class="k">Monthly Surplus</span><span class="v">${money((a.monthly_revenue || 0) - (a.monthly_expenses || 0))}</span></div>
            <div class="compare-row"><span class="k">Requested Loan</span><span class="v">${money(a.requested_amount)} (${a.requested_tenure_months || 24}m)</span></div>
            <div class="compare-row"><span class="k">Recommended Loan</span><span class="v" style="color:var(--teal-deep);">${money(r?.credit?.recommendedAmount || a.requested_amount)}</span></div>
            <div class="compare-row"><span class="k">Digital Payments</span><span class="v">${a.digital_payment_pct || 0}%</span></div>
            <div class="compare-row"><span class="k">Years in Operation</span><span class="v">${a.years_operating} yrs</span></div>
            <div class="compare-row"><span class="k">Identity Check</span><span class="v">${escapeHtml(a.identity_verification || 'verified')}</span></div>
            
            <div style="margin-top:16px;">
              <a class="btn btn-outline btn-sm btn-block" href="/report.html?id=${a.id}">View Full Report →</a>
            </div>
          </div>
        `).join('')}
      </div>`;

    document.getElementById('clearCompareBtn')?.addEventListener('click', () => {
      setCompareSelection([]);
      renderCompareView();
    });

    wrap.querySelectorAll('.remove-compare-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idToRemove = btn.dataset.removeId;
        const remaining = getCompareSelection().filter(id => id !== idToRemove);
        setCompareSelection(remaining);
        renderCompareView();
      });
    });

  } catch (err) {
    wrap.innerHTML = `<p>${escapeHtml(err.message)}</p>`;
  }
}
