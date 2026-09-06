let allAssessments = [];

document.addEventListener('DOMContentLoaded', async () => {
  const officer = await initProtectedPage();
  if (!officer) return;

  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');

  if (searchInput) searchInput.addEventListener('input', renderHistoryList);
  if (statusFilter) statusFilter.addEventListener('change', renderHistoryList);

  await loadHistory();
});

async function loadHistory() {
  const wrap = document.getElementById('historyContent');
  try {
    const { assessments } = await API.get('/assessments');
    allAssessments = assessments || [];
    renderHistoryList();
  } catch (err) {
    if (wrap) wrap.innerHTML = `<p>${escapeHtml(err.message)}</p>`;
  }
}

function updateCompareBtnBadge() {
  const btn = document.getElementById('goToCompareBtn');
  if (!btn) return;
  const sel = getCompareSelection();
  btn.textContent = `Compare Selected (${sel.length})`;
  if (sel.length >= 2) {
    btn.classList.remove('btn-outline');
    btn.classList.add('btn-primary');
  } else {
    btn.classList.add('btn-outline');
    btn.classList.remove('btn-primary');
  }
}

function renderHistoryList() {
  const wrap = document.getElementById('historyContent');
  if (!wrap) return;

  updateCompareBtnBadge();

  if (!allAssessments.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="emoji">🗂️</div><p>No assessments yet. <a href="/new-assessment.html">Create your first assessment.</a></p></div>';
    return;
  }

  const query = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const filter = document.getElementById('statusFilter')?.value || 'all';

  let filtered = allAssessments.filter((a) => {
    // Search query
    const matchQuery = !query ||
      (a.applicant_name && a.applicant_name.toLowerCase().includes(query)) ||
      (a.business_name && a.business_name.toLowerCase().includes(query)) ||
      (a.village && a.village.toLowerCase().includes(query)) ||
      (a.district && a.district.toLowerCase().includes(query));

    if (!matchQuery) return false;

    // Status filter
    if (filter === 'pending') {
      return a.requires_officer_action && !a.officer_decision;
    }
    if (filter === 'auto_approved') {
      return !a.requires_officer_action;
    }
    if (filter === 'officer_approved') {
      return a.requires_officer_action && a.officer_decision === 'approved';
    }
    if (filter === 'declined') {
      return a.officer_decision === 'declined';
    }
    return true;
  });

  if (!filtered.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="emoji">🔍</div><p>No matching applications found for this filter.</p></div>';
    return;
  }

  const selection = getCompareSelection();

  wrap.innerHTML = `
    <table class="hist-table">
      <thead>
        <tr>
          <th style="width:40px;">Compare</th>
          <th>Applicant &amp; Business</th>
          <th>Location</th>
          <th>Credit Band</th>
          <th>Fraud Risk</th>
          <th>Status</th>
          <th>Date</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map((a) => `
          <tr>
            <td>
              <input type="checkbox" class="compare-check" data-id="${a.id}" ${selection.includes(a.id) ? 'checked' : ''} title="Select to compare">
            </td>
            <td>
              <strong>${escapeHtml(a.applicant_name)}</strong>
              <div style="font-size:12.5px; color:var(--text-muted);">${escapeHtml(a.business_name || (a.business_type || '').replace(/_/g, ' '))}</div>
            </td>
            <td>${escapeHtml(a.village || '—')}${a.state ? ', ' + escapeHtml(a.state) : ''}</td>
            <td><span class="band-pill band-${a.credit_band}" style="padding:2px 10px; font-size:12px;">Band ${a.credit_band} (${a.credit_score})</span></td>
            <td><span class="fraud-pill fraud-${a.fraud_band}">${a.fraud_band} (${a.fraud_score})</span></td>
            <td>${statusLabel(a)}</td>
            <td style="font-size:13px; color:var(--text-muted);">${new Date(a.created_at).toLocaleDateString('en-IN')}</td>
            <td style="text-align:right;" class="row-actions">
              <a class="btn btn-outline btn-sm" href="/report.html?id=${a.id}">View</a>
              <button class="btn btn-danger btn-sm" data-del-id="${a.id}">Delete</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  wrap.querySelectorAll('.compare-check').forEach((cb) => {
    cb.addEventListener('change', () => {
      let sel = getCompareSelection();
      if (cb.checked) {
        if (sel.length >= 3) {
          cb.checked = false;
          showToast('You can compare up to 3 applicants at a time.', 'error');
          return;
        }
        if (!sel.includes(cb.dataset.id)) sel.push(cb.dataset.id);
      } else {
        sel = sel.filter((id) => id !== cb.dataset.id);
      }
      setCompareSelection(sel);
      updateCompareBtnBadge();
    });
  });

  wrap.querySelectorAll('[data-del-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this assessment record?')) return;
      try {
        await API.del(`/assessments/${btn.dataset.delId}`);
        setCompareSelection(getCompareSelection().filter((id) => id !== btn.dataset.delId));
        showToast('Assessment deleted.');
        await loadHistory();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}
