let ASSESSMENT = null;
let RESULT = null;
let balanceChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  const officer = await initProtectedPage();
  if (!officer) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const isNew = params.get('new') === '1';

  if (!id) {
    document.getElementById('reportRoot').innerHTML = `
      <div class="empty-state">
        <div class="emoji">🔍</div>
        <h3>No application specified</h3>
        <p>Please go to <a href="/history.html">History</a> to select an assessment report to view.</p>
      </div>`;
    return;
  }

  try {
    const { assessment, result } = await API.get(`/assessments/${id}`);
    ASSESSMENT = assessment;
    RESULT = result;
    render();
    if (isNew) {
      showToast('Assessment created successfully!');
    }
  } catch (err) {
    document.getElementById('reportRoot').innerHTML = `
      <div class="empty-state">
        <div class="emoji">⚠️</div>
        <h3>Unable to load report</h3>
        <p>${escapeHtml(err.message)}</p>
        <a href="/history.html" class="btn btn-outline btn-sm" style="margin-top:10px;">Return to History</a>
      </div>`;
  }
});

function decisionBannerHtml() {
  const a = ASSESSMENT, r = RESULT;
  const finalized = !!a.officer_decision;
  const isApproved = a.officer_decision === 'approved';
  const isDeclined = a.officer_decision === 'declined';

  if (finalized) {
    const cls = isApproved ? 'decision-approved' : 'decision-fraud';
    const icon = isApproved ? '✅' : '⛔';
    return `
      <div class="decision-banner ${cls}">
        <div class="icon">${icon}</div>
        <div>
          <h2>${isApproved ? 'Approved' : 'Declined'}${a.officer_decision_by === 'System' ? ' (Automatic)' : ' by ' + escapeHtml(a.officer_decision_by || 'Officer')}</h2>
          <p>${escapeHtml(a.officer_decision_note || '')}</p>
          <p style="margin-top:8px; font-size:12.5px; color:var(--text-faint);">Decided ${new Date(a.officer_decision_at || a.created_at).toLocaleString()}</p>
        </div>
      </div>`;
  }

  const cls = r?.decision?.recommendation === 'decline_fraud_investigation' ? 'decision-fraud' : 'decision-referred';
  const icon = r?.decision?.recommendation === 'decline_fraud_investigation' ? '🕵️' : '⏳';
  return `
    <div class="decision-banner ${cls}">
      <div class="icon">${icon}</div>
      <div>
        <h2>${r?.decision?.headline || 'Referred for Officer Review'}</h2>
        <p>${escapeHtml(r?.decision?.explanation || '')}</p>
        <div style="margin-top:10px;"><span class="rec-pill">${RECOMMENDATION_LABELS[r?.decision?.recommendation] || (r?.decision?.recommendation || '')}</span></div>
      </div>
    </div>`;
}

function decisionControlsHtml() {
  if (ASSESSMENT.officer_decision) return '';
  return `
    <div class="decision-controls" id="decisionControls">
      <h3 style="font-size:15px; margin-bottom:6px;">Officer Decision Controls</h3>
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:10px;">
        The system cannot reject an applicant on its own. A human officer makes the final call. A written note is mandatory if declining, to maintain a clear audit trail.
      </p>
      <textarea id="decisionNote" placeholder="Enter review note (required for decline, optional for approval)..."></textarea>
      <div class="actions">
        <button class="btn btn-danger" id="declineBtn">Decline Application</button>
        <button class="btn btn-primary" id="approveBtn">Approve Loan</button>
      </div>
    </div>`;
}

function scheduleTableHtml(schedule) {
  if (!schedule || !schedule.length) return '<tbody><tr><td colspan="5">No schedule available</td></tr></tbody>';
  return `
    <thead><tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
    <tbody>
      ${schedule.map((r) => `
        <tr class="${r.phase === 'moratorium' ? 'phase-moratorium' : ''}">
          <td>Month ${r.month}${r.phase === 'moratorium' ? ' (Moratorium)' : ''}</td>
          <td>${money(r.payment)}</td>
          <td>${money(r.principalPaid)}</td>
          <td>${money(r.interestPaid)}</td>
          <td>${money(r.balance)}</td>
        </tr>`).join('')}
    </tbody>`;
}

function render() {
  const a = ASSESSMENT, r = RESULT;
  const root = document.getElementById('reportRoot');
  if (!root || !r) return;

  const creditPct = (r.credit?.score || 0) / 100;
  const fraudPct = (r.fraud?.risk || 0) / 100;

  root.innerHTML = `
    <div class="report-header">
      <div>
        <h1 style="font-size:22px; margin:0;">Assessment Report</h1>
        <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">
          Reference ID: <code>${escapeHtml(a.id_reference || a.id)}</code>
        </div>
      </div>
      <div class="report-actions">
        <button class="btn btn-outline btn-sm" id="downloadPdfBtn">📄 Download PDF Report</button>
      </div>
    </div>

    <div id="pdfCaptureArea">
      <div style="margin-bottom:14px; font-size:13.5px; color:var(--text-muted); background:var(--surface); padding:14px 18px; border-radius:var(--radius-md); border:1px solid var(--border);">
        <strong>${escapeHtml(a.applicant_name)}</strong> · ${escapeHtml(a.business_name || (a.business_type || '').replace(/_/g, ' '))} · ${escapeHtml(a.village || '')}${a.district ? ', ' + escapeHtml(a.district) : ''}${a.state ? ', ' + escapeHtml(a.state) : ''}
        · Reviewed by: ${escapeHtml(a.officer_name || 'Credit Officer')} · Date: ${new Date(a.created_at).toLocaleString('en-IN')}
      </div>

      ${decisionBannerHtml()}

      <!-- Credit Score Breakdown Hero -->
      <div class="score-hero">
        <div class="score-circle-wrap">
          <svg width="220" height="130" viewBox="0 0 220 130">
            <path d="M15 115 A95 95 0 0 1 205 115" fill="none" stroke="#eef1f6" stroke-width="16" stroke-linecap="round"/>
            <path d="M15 115 A95 95 0 0 1 205 115" fill="none" stroke="${bandColor(r.credit?.band)}" stroke-width="16" stroke-linecap="round" stroke-dasharray="298" stroke-dashoffset="${298 - 298 * creditPct}"/>
          </svg>
          <div class="score-num">${r.credit?.score || 0}</div>
          <div class="band-pill band-${r.credit?.band}">Credit Band ${r.credit?.band} · ${r.credit?.bandLabel}</div>
        </div>
        <div class="kpi-grid">
          <div class="kpi"><div class="label">Recommended Loan Amount</div><div class="value" style="color:var(--teal-deep);">${money(r.credit?.recommendedAmount)}</div></div>
          <div class="kpi"><div class="label">Recommended Interest Rate</div><div class="value">${r.credit?.recommendedRate}%</div></div>
          <div class="kpi"><div class="label">Max Eligible Sizing</div><div class="value">${money(r.credit?.maxEligible)}</div></div>
        </div>
      </div>

      <!-- Fraud Risk Breakdown Hero -->
      <div class="score-hero">
        <div class="score-circle-wrap">
          <svg width="220" height="130" viewBox="0 0 220 130">
            <path d="M15 115 A95 95 0 0 1 205 115" fill="none" stroke="#eef1f6" stroke-width="16" stroke-linecap="round"/>
            <path d="M15 115 A95 95 0 0 1 205 115" fill="none" stroke="${fraudColor(r.fraud?.band)}" stroke-width="16" stroke-linecap="round" stroke-dasharray="298" stroke-dashoffset="${298 - 298 * fraudPct}"/>
          </svg>
          <div class="score-num">${r.fraud?.risk || 0}</div>
          <div class="fraud-pill fraud-${r.fraud?.band}">Fraud Risk: ${r.fraud?.bandLabel}</div>
        </div>
        <div class="kpi-grid">
          <div class="kpi"><div class="label">Repeat Applications (30d)</div><div class="value">${r.fraud?.duplicateCount || 0}</div></div>
          <div class="kpi"><div class="label">Identity Match Status</div><div class="value" style="font-size:15px;">${escapeHtml(a.identity_verification || 'verified')}</div></div>
          <div class="kpi"><div class="label">Device Reputation</div><div class="value" style="font-size:15px;">${escapeHtml(a.device_status || 'trusted')}</div></div>
        </div>
      </div>

      <!-- Credit Factors List -->
      <div class="section-card">
        <h2>How the credit score was calculated</h2>
        <p class="desc">Rule-based scoring where every point is traceable to financial and alternative data signals.</p>
        <div class="factors-list">
          ${(r.credit?.factors || []).map((f) => `
            <div class="factor-row">
              <div class="name">${escapeHtml(f.label)}</div>
              <div><div class="detail">${escapeHtml(f.detail)}</div><div class="bar"><i style="width:${(f.points / f.max) * 100}%; background:${bandColor(r.credit?.band)}"></i></div></div>
              <div class="pts">${f.points} / ${f.max}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Fraud Factors List -->
      <div class="section-card">
        <h2>How the fraud score was calculated</h2>
        <p class="desc">Signals evaluated independently from repayment capacity to avoid penalizing genuine thin-file borrowers.</p>
        <div class="factors-list">
          ${(r.fraud?.factors || []).map((f) => `
            <div class="factor-row">
              <div class="name">${escapeHtml(f.label)}</div>
              <div><div class="detail">${escapeHtml(f.detail)}</div><div class="bar"><i style="width:${(f.points / f.max) * 100}%; background:${fraudColor(r.fraud?.band)}"></i></div></div>
              <div class="pts">${f.points} / ${f.max}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Financial Structuring Section -->
      <div class="section-card">
        <h2>Financial Structuring</h2>
        <p class="desc">Interactive repayment plan sized to the recommended amount with live EMI and amortization schedule.</p>
        <div class="structuring-grid">
          <div>
            <div class="control-row">
              <label><span>Loan Tenure</span><span id="tenureVal">${r.tenure || 24} months</span></label>
              <input type="range" id="tenureSlider" min="3" max="60" step="1" value="${r.tenure || 24}">
            </div>
            <div class="control-row">
              <label><span>Target Profit Margin</span><span id="marginVal">${r.margin || 15}%</span></label>
              <input type="range" id="marginSlider" min="5" max="60" step="1" value="${r.margin || 15}">
            </div>
            <div class="toggle-row">
              <button class="switch ${(r.moratorium || 0) > 0 ? 'on' : ''}" id="moratoriumSwitch"></button>
              <span>Add moratorium (interest-only) period</span>
            </div>
            <div class="control-row" id="moratoriumMonthsRow" style="${(r.moratorium || 0) > 0 ? '' : 'opacity:.4; pointer-events:none;'}">
              <label><span>Moratorium Period</span><span id="moratoriumVal">${r.moratorium || 0} months</span></label>
              <input type="range" id="moratoriumSlider" min="0" max="12" step="1" value="${r.moratorium || 0}">
            </div>
            <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr); margin-top:18px;">
              <div class="kpi"><div class="label">Monthly EMI</div><div class="value" id="emiVal">${money(r.amortization?.emi)}</div></div>
              <div class="kpi"><div class="label">Total Interest</div><div class="value" id="interestVal">${money(r.amortization?.totalInterest)}</div></div>
              <div class="kpi"><div class="label">Total Payable</div><div class="value" id="totalVal">${money(r.amortization?.totalPayment)}</div></div>
            </div>
          </div>
          <div><canvas id="balanceChart" height="220"></canvas></div>
        </div>
        <h3 class="form-section-title">Amortization Schedule</h3>
        <div class="table-scroll"><table class="schedule-table" id="scheduleTable">${scheduleTableHtml(r.amortization?.schedule)}</table></div>
      </div>

      <!-- Break-Even Section -->
      <div class="section-card">
        <h2>Break-Even Snapshot</h2>
        <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
          <div class="kpi"><div class="label">Break-Even Monthly Revenue</div><div class="value" id="beRevenue">${money(r.breakEven?.breakEvenRevenue)}</div></div>
          <div class="kpi"><div class="label">Current Monthly Profit</div><div class="value" id="beProfit">${money(r.breakEven?.currentProfit)}</div></div>
          <div class="kpi"><div class="label">Buffer Above Break-Even</div><div class="value" id="beBuffer" style="color:var(--success);">${money(r.breakEven?.bufferAboveBreakEven)}</div></div>
        </div>
      </div>

      ${decisionControlsHtml()}
    </div>
  `;

  if (r.amortization?.schedule) {
    renderBalanceChart(r.amortization.schedule);
  }
  wireStructuring();
  wireDecisionControls();
  document.getElementById('downloadPdfBtn')?.addEventListener('click', exportPdf);
}

function renderBalanceChart(schedule) {
  const ctx = document.getElementById('balanceChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (balanceChart) balanceChart.destroy();
  balanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: schedule.map((r) => 'M' + r.month),
      datasets: [{
        label: 'Loan Balance',
        data: schedule.map((r) => r.balance),
        borderColor: '#0f9488',
        backgroundColor: 'rgba(15,148,136,0.08)',
        fill: true,
        tension: 0.25,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN') } } }
    },
  });
}

function wireStructuring() {
  const tenureSlider = document.getElementById('tenureSlider');
  const marginSlider = document.getElementById('marginSlider');
  const moratoriumSwitch = document.getElementById('moratoriumSwitch');
  const moratoriumSlider = document.getElementById('moratoriumSlider');
  const moratoriumRow = document.getElementById('moratoriumMonthsRow');
  if (!tenureSlider || !marginSlider) return;

  async function recalc() {
    const tenure = Number(tenureSlider.value);
    const margin = Number(marginSlider.value);
    const on = moratoriumSwitch?.classList.contains('on');
    const moratorium = on ? Number(moratoriumSlider?.value || 0) : 0;
    
    document.getElementById('tenureVal').textContent = tenure + ' months';
    document.getElementById('marginVal').textContent = margin + '%';
    if (document.getElementById('moratoriumVal')) {
      document.getElementById('moratoriumVal').textContent = moratorium + ' months';
    }
    if (moratoriumRow) {
      moratoriumRow.style.opacity = on ? '1' : '.4';
      moratoriumRow.style.pointerEvents = on ? 'auto' : 'none';
    }
    
    try {
      const { amortization, breakEven } = await API.post('/assessments/simulate', {
        principal: RESULT?.credit?.recommendedAmount || 10000,
        annualRatePct: RESULT?.credit?.recommendedRate || 12,
        tenureMonths: tenure,
        moratoriumMonths: moratorium,
        monthlyRevenue: ASSESSMENT.monthly_revenue,
        monthlyExpenses: ASSESSMENT.monthly_expenses,
        marginPct: margin,
      });

      if (amortization) {
        document.getElementById('emiVal').textContent = money(amortization.emi);
        document.getElementById('interestVal').textContent = money(amortization.totalInterest);
        document.getElementById('totalVal').textContent = money(amortization.totalPayment);
        document.getElementById('scheduleTable').innerHTML = scheduleTableHtml(amortization.schedule);
        renderBalanceChart(amortization.schedule);
      }
      if (breakEven) {
        document.getElementById('beRevenue').textContent = money(breakEven.breakEvenRevenue);
        document.getElementById('beProfit').textContent = money(breakEven.currentProfit);
        document.getElementById('beBuffer').textContent = money(breakEven.bufferAboveBreakEven);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  tenureSlider.addEventListener('input', recalc);
  marginSlider.addEventListener('input', recalc);
  if (moratoriumSlider) moratoriumSlider.addEventListener('input', recalc);
  if (moratoriumSwitch) {
    moratoriumSwitch.addEventListener('click', () => {
      moratoriumSwitch.classList.toggle('on');
      recalc();
    });
  }
}

function wireDecisionControls() {
  const approveBtn = document.getElementById('approveBtn');
  const declineBtn = document.getElementById('declineBtn');
  if (!approveBtn) return;
  approveBtn.addEventListener('click', () => submitDecision('approved'));
  if (declineBtn) declineBtn.addEventListener('click', () => submitDecision('declined'));
}

async function submitDecision(officer_decision) {
  const note = (document.getElementById('decisionNote')?.value || '').trim();
  if (officer_decision === 'declined' && !note) {
    showToast('A note is mandatory to decline an application for audit purposes.', 'error');
    return;
  }
  try {
    const { assessment } = await API.patch(`/assessments/${ASSESSMENT.id}/decision`, {
      officer_decision,
      officer_decision_note: note
    });
    ASSESSMENT = assessment;
    showToast(officer_decision === 'approved' ? 'Application approved.' : 'Application declined with audit note.');
    render();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function exportPdf() {
  showToast('Preparing PDF Report…');
  const area = document.getElementById('pdfCaptureArea');
  if (!area) return;

  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    window.print();
    return;
  }

  try {
    const canvas = await html2canvas(area, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 48;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 38;

    pdf.setFontSize(14);
    pdf.text('Explainable Credit Ledger — Assessment Report', 24, 24);
    pdf.addImage(imgData, 'PNG', 24, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - position);

    while (heightLeft > 0) {
      pdf.addPage();
      position = -(imgHeight - heightLeft) + 24;
      pdf.addImage(imgData, 'PNG', 24, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Assessment_${(ASSESSMENT.applicant_name || 'applicant').replace(/\s+/g, '_')}_${ASSESSMENT.id}.pdf`);
    showToast('PDF downloaded successfully!');
  } catch (err) {
    console.error('PDF export error:', err);
    window.print();
  }
}
