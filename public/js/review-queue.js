document.addEventListener('DOMContentLoaded', async () => {
  const officer = await initProtectedPage();
  if (!officer) return;
  await loadQueue();
});

async function loadQueue() {
  const wrap = document.getElementById('queueContent');
  if (!wrap) return;

  try {
    const { assessments } = await API.get('/assessments?pending=1');
    if (!assessments || !assessments.length) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="emoji">✅</div>
          <h3>Review queue is all clear!</h3>
          <p>No pending applications require officer review right now.</p>
          <a href="/new-assessment.html" class="btn btn-primary btn-sm" style="margin-top:10px;">+ New Assessment</a>
        </div>`;
      return;
    }

    wrap.innerHTML = `
      <div style="margin-bottom:16px; font-size:14px; color:var(--text-muted);">
        <strong>${assessments.length}</strong> application(s) awaiting your decision. None are automatically declined.
      </div>
      <table class="hist-table">
        <thead>
          <tr>
            <th>Applicant &amp; Business</th>
            <th>Location</th>
            <th>Credit Band</th>
            <th>Fraud Risk</th>
            <th>System Recommendation</th>
            <th>Submitted</th>
            <th style="text-align:right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${assessments.map((a) => `
            <tr>
              <td>
                <strong>${escapeHtml(a.applicant_name)}</strong>
                <div style="font-size:12.5px; color:var(--text-muted);">${escapeHtml(a.business_name || (a.business_type || '').replace(/_/g, ' '))}</div>
              </td>
              <td>${escapeHtml(a.village || '—')}${a.state ? ', ' + escapeHtml(a.state) : ''}</td>
              <td><span class="band-pill band-${a.credit_band}" style="padding:2px 10px; font-size:12px;">Band ${a.credit_band} (${a.credit_score})</span></td>
              <td><span class="fraud-pill fraud-${a.fraud_band}">${a.fraud_band} (${a.fraud_score})</span></td>
              <td><span class="rec-pill">${RECOMMENDATION_LABELS[a.recommendation] || a.recommendation}</span></td>
              <td style="font-size:13px; color:var(--text-muted);">${new Date(a.created_at).toLocaleDateString('en-IN')}</td>
              <td style="text-align:right;"><a class="btn btn-primary btn-sm" href="/report.html?id=${a.id}">Review &amp; Decide →</a></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
}
