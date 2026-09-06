document.addEventListener('DOMContentLoaded', async () => {
  const officer = await initProtectedPage();
  if (!officer) return;

  try {
    const { stats } = await API.get('/assessments/stats');
    if (!stats) return;
    renderKpis(stats);
    renderQueueBadge(stats.pendingReview);
    if (typeof Chart !== 'undefined') {
      renderRecChart(stats.recommendationBreakdown);
      renderFraudChart(stats);
      renderCreditChart(stats.creditBands);
    }
    renderRecentTable(stats.recent || []);
    renderPendingPreview((stats.recent || []).filter((r) => r.requires_officer_action && !r.officer_decision));
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function renderKpis(stats) {
  const strip = document.getElementById('kpiStrip');
  if (!strip) return;
  strip.innerHTML = `
    <div class="kpi-card"><div class="label">Total Applications</div><div class="value">${stats.total}</div></div>
    <div class="kpi-card good"><div class="label">Approved</div><div class="value">${stats.approved}</div></div>
    <div class="kpi-card warn"><div class="label">Pending Review</div><div class="value">${stats.pendingReview}</div></div>
    <div class="kpi-card danger"><div class="label">High Fraud Risk</div><div class="value">${stats.fraudHigh}</div></div>
    <div class="kpi-card"><div class="label">Officer Declines</div><div class="value">${stats.declined}</div></div>
  `;
}

function renderQueueBadge(count) {
  const badge = document.getElementById('queueBadge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

function renderRecChart(breakdown) {
  const ctx = document.getElementById('recChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: (breakdown || []).map((b) => (b.label || '').replace('Recommend: ', '')),
      datasets: [{
        data: (breakdown || []).map((b) => b.count),
        backgroundColor: ['#128a3e', '#0f9488', '#b45309', '#b91c1c']
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { stepSize: 1, precision: 0 } } }
    },
  });
}

function renderFraudChart(stats) {
  const ctx = document.getElementById('fraudChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Low', 'Medium', 'High'],
      datasets: [{
        data: [stats.fraudLow || 0, stats.fraudMedium || 0, stats.fraudHigh || 0],
        backgroundColor: ['#128a3e', '#b45309', '#b91c1c']
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    },
  });
}

function renderCreditChart(bands) {
  const ctx = document.getElementById('creditChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: (bands || []).map((b) => 'Band ' + b.band),
      datasets: [{
        data: (bands || []).map((b) => b.count),
        backgroundColor: (bands || []).map((b) => bandColor(b.band))
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { stepSize: 1, precision: 0 } } }
    },
  });
}

function renderRecentTable(rows) {
  const wrap = document.getElementById('recentTableWrap');
  if (!wrap) return;
  if (!rows || !rows.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="emoji">🗂️</div><p>No applications yet — start with New Assessment.</p></div>';
    return;
  }
  wrap.innerHTML = `
    <table class="hist-table">
      <thead><tr><th>Applicant</th><th>Credit</th><th>Fraud</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <td>
              <strong>${escapeHtml(r.applicant_name)}</strong>
              <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(r.business_name || (r.business_type || '').replace(/_/g, ' '))}</div>
            </td>
            <td><span class="band-pill band-${r.credit_band}" style="padding:2px 10px; font-size:12px;">Band ${r.credit_band} (${r.credit_score})</span></td>
            <td><span class="fraud-pill fraud-${r.fraud_band}">${r.fraud_band} (${r.fraud_score})</span></td>
            <td>${statusLabel(r)}</td>
            <td><a class="btn btn-outline btn-sm" href="/report.html?id=${r.id}">View Report</a></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderPendingPreview(rows) {
  const wrap = document.getElementById('pendingPreviewWrap');
  if (!wrap) return;
  if (!rows || !rows.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="emoji">✅</div><p>All clean! Nothing waiting on officer review right now.</p></div>';
    return;
  }
  wrap.innerHTML = `
    <table class="hist-table">
      <thead><tr><th>Applicant</th><th>Recommendation</th><th>Action</th></tr></thead>
      <tbody>
        ${rows.slice(0, 5).map((r) => `
          <tr>
            <td>
              <strong>${escapeHtml(r.applicant_name)}</strong>
              <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(r.village || '')}${r.state ? ', ' + escapeHtml(r.state) : ''}</div>
            </td>
            <td><span class="rec-pill">${RECOMMENDATION_LABELS[r.recommendation] || r.recommendation}</span></td>
            <td><a class="btn btn-primary btn-sm" href="/report.html?id=${r.id}">Review Case →</a></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}
