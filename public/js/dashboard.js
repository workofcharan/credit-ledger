document.addEventListener('DOMContentLoaded', async () => {
  const officer = await initProtectedPage();
  if (!officer) return;

  try {
    const res = await API.get('/assessments/stats');
    const stats = (res && res.stats) ? res.stats : res;
    if (!stats) return;

    renderKpis(stats);
    renderQueueBadge(stats.pendingReview);

    // Render charts with Chart.js or enhanced visual HTML fallback
    renderAllCharts(stats);

    renderRecentTable(stats.recent || []);
    renderPendingPreview((stats.recent || []).filter((r) => r.requires_officer_action && !r.officer_decision));

    if (window.CreditCopilot) {
      window.CreditCopilot.init(null, null);
    }
  } catch (err) {
    showToast(err.message || 'Error loading dashboard data', 'error');
  }
});

function renderKpis(stats) {
  const strip = document.getElementById('kpiStrip');
  if (!strip) return;
  strip.innerHTML = `
    <div class="kpi-card"><div class="label">Total Applications</div><div class="value">${stats.total || 0}</div></div>
    <div class="kpi-card good"><div class="label">Approved</div><div class="value">${stats.approved || 0}</div></div>
    <div class="kpi-card warn"><div class="label">Pending Review</div><div class="value">${stats.pendingReview || 0}</div></div>
    <div class="kpi-card danger"><div class="label">High Fraud Risk</div><div class="value">${stats.fraudHigh || 0}</div></div>
    <div class="kpi-card"><div class="label">Officer Declines</div><div class="value">${stats.declined || 0}</div></div>
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

function renderAllCharts(stats) {
  if (typeof Chart !== 'undefined') {
    renderRecChart(stats.recommendationBreakdown || []);
    renderFraudChart(stats);
    renderCreditChart(stats.creditBands || []);
  } else {
    // If Chart.js CDN is unavailable or blocked, render rich CSS graphical distribution bars
    renderVisualFallbackRec(stats.recommendationBreakdown || []);
    renderVisualFallbackFraud(stats);
    renderVisualFallbackCredit(stats.creditBands || []);
  }
}

function renderRecChart(breakdown) {
  const ctx = document.getElementById('recChart');
  if (!ctx) return;
  try {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: (breakdown || []).map((b) => (b.label || '').replace('Recommend: ', '')),
        datasets: [{
          data: (breakdown || []).map((b) => b.count || 0),
          backgroundColor: ['#10b981', '#0d9488', '#f59e0b', '#ef4444'],
          borderRadius: 6
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { stepSize: 1, precision: 0 }, grid: { color: 'rgba(0,0,0,0.04)' } },
          y: { grid: { display: false } }
        }
      },
    });
  } catch (e) {
    renderVisualFallbackRec(breakdown);
  }
}

function renderFraudChart(stats) {
  const ctx = document.getElementById('fraudChart');
  if (!ctx) return;
  try {
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Low Risk', 'Medium Risk', 'High Risk'],
        datasets: [{
          data: [stats.fraudLow || 0, stats.fraudMedium || 0, stats.fraudHigh || 0],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, font: { family: 'Inter', size: 12 } } }
        },
        cutout: '65%'
      },
    });
  } catch (e) {
    renderVisualFallbackFraud(stats);
  }
}

function renderCreditChart(bands) {
  const ctx = document.getElementById('creditChart');
  if (!ctx) return;
  try {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: (bands || []).map((b) => 'Band ' + b.band),
        datasets: [{
          data: (bands || []).map((b) => b.count || 0),
          backgroundColor: ['#10b981', '#059669', '#d97706', '#ea580c', '#dc2626'],
          borderRadius: 6
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { stepSize: 1, precision: 0 }, grid: { color: 'rgba(0,0,0,0.04)' } },
          x: { grid: { display: false } }
        }
      },
    });
  } catch (e) {
    renderVisualFallbackCredit(bands);
  }
}

function renderVisualFallbackRec(breakdown) {
  const container = document.getElementById('recChart')?.parentElement;
  if (!container) return;
  const total = breakdown.reduce((acc, b) => acc + (b.count || 0), 0) || 1;
  const colors = ['#10b981', '#0d9488', '#f59e0b', '#ef4444'];
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px; padding:10px 0; justify-content:center; height:100%;">
      ${breakdown.map((b, i) => {
        const pct = Math.round(((b.count || 0) / total) * 100);
        return `
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:600; margin-bottom:4px;">
              <span>${escapeHtml((b.label || '').replace('Recommend: ', ''))}</span>
              <span style="color:var(--text-muted);">${b.count || 0} (${pct}%)</span>
            </div>
            <div style="background:#e2e8f0; border-radius:6px; height:10px; overflow:hidden;">
              <div style="background:${colors[i % colors.length]}; width:${pct}%; height:100%; border-radius:6px;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderVisualFallbackFraud(stats) {
  const container = document.getElementById('fraudChart')?.parentElement;
  if (!container) return;
  const total = ((stats.fraudLow || 0) + (stats.fraudMedium || 0) + (stats.fraudHigh || 0)) || 1;
  const lowPct = Math.round(((stats.fraudLow || 0) / total) * 100);
  const medPct = Math.round(((stats.fraudMedium || 0) / total) * 100);
  const highPct = Math.round(((stats.fraudHigh || 0) / total) * 100);
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; padding:10px 0; justify-content:center; height:100%; width:100%;">
      <div style="display:flex; height:24px; border-radius:8px; overflow:hidden; box-shadow:var(--shadow-xs);">
        <div style="background:#10b981; width:${lowPct}%;" title="Low: ${stats.fraudLow || 0}"></div>
        <div style="background:#f59e0b; width:${medPct}%;" title="Medium: ${stats.fraudMedium || 0}"></div>
        <div style="background:#ef4444; width:${highPct}%;" title="High: ${stats.fraudHigh || 0}"></div>
      </div>
      <div style="display:flex; justify-content:space-around; text-align:center; font-size:12.5px; font-weight:600;">
        <div><span style="display:inline-block; width:10px; height:10px; background:#10b981; border-radius:50%; margin-right:4px;"></span>Low: ${stats.fraudLow || 0} (${lowPct}%)</div>
        <div><span style="display:inline-block; width:10px; height:10px; background:#f59e0b; border-radius:50%; margin-right:4px;"></span>Med: ${stats.fraudMedium || 0} (${medPct}%)</div>
        <div><span style="display:inline-block; width:10px; height:10px; background:#ef4444; border-radius:50%; margin-right:4px;"></span>High: ${stats.fraudHigh || 0} (${highPct}%)</div>
      </div>
    </div>
  `;
}

function renderVisualFallbackCredit(bands) {
  const container = document.getElementById('creditChart')?.parentElement;
  if (!container) return;
  const total = bands.reduce((acc, b) => acc + (b.count || 0), 0) || 1;
  const colors = ['#10b981', '#059669', '#d97706', '#ea580c', '#dc2626'];
  container.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:12px; height:100%; align-items:flex-end; padding:14px 10px;">
      ${bands.map((b, i) => {
        const pct = Math.max(12, Math.round(((b.count || 0) / total) * 100));
        return `
          <div style="display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; gap:6px;">
            <span style="font-size:12px; font-weight:700; color:var(--navy-900);">${b.count || 0}</span>
            <div style="background:${colors[i % colors.length]}; width:100%; max-width:48px; height:${pct}%; border-radius:6px 6px 0 0;"></div>
            <span style="font-size:11.5px; font-weight:600; color:var(--text-muted);">Band ${b.band}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
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
      <thead><tr><th>Applicant</th><th>Credit</th><th>Fraud</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead>
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
            <td style="text-align:right;" class="row-actions">
              <a class="btn btn-outline btn-sm" href="/compare.html?ids=${r.id}">⚖️ Compare</a>
              <a class="btn btn-outline btn-sm" href="/report.html?id=${r.id}">View</a>
            </td>
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
