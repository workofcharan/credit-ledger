/**
 * Common utilities and session setup for Explainable Credit Ledger
 */

async function initProtectedPage() {
  const officer = await requireSession();
  if (!officer) return null;

  const nameEl = document.getElementById('officerName');
  const avatarEl = document.getElementById('avatarInitial');
  if (nameEl) nameEl.textContent = officer.full_name || officer.officer_code;
  if (avatarEl) avatarEl.textContent = (officer.full_name || officer.officer_code || '?').charAt(0).toUpperCase();

  markActiveNav();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await API.post('/auth/logout');
      if (typeof ClientStore !== 'undefined') {
        ClientStore.setCurrentOfficer(null);
      }
      window.location.href = '/login.html';
    });
  }

  // Update review queue badge in nav if element exists
  updateNavBadge();

  return officer;
}

async function updateNavBadge() {
  const badge = document.getElementById('queueBadge');
  if (!badge) return;
  try {
    const { assessments } = await API.get('/assessments?pending=1');
    if (assessments && assessments.length > 0) {
      badge.textContent = assessments.length;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}

function markActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a[href]').forEach((a) => {
    const target = a.getAttribute('href').split('/').pop();
    if (target === currentPath || (currentPath === '' && target === 'index.html')) {
      a.setAttribute('aria-current', 'page');
      a.classList.add('active');
    } else {
      a.removeAttribute('aria-current');
      a.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', markActiveNav);

const money = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

const RECOMMENDATION_LABELS = {
  auto_approve: 'Auto-Approved',
  alt_data_approval: 'Recommend: Alternative-Data Approval',
  manual_verification: 'Recommend: Manual Verification',
  decline_fraud_investigation: 'Recommend: Decline — Pending Fraud Investigation',
};

function bandColor(band) {
  return { A: '#128a3e', B: '#4f8f1f', C: '#b45309', D: '#c2540a', E: '#b91c1c' }[band] || '#4f8f1f';
}

function fraudColor(band) {
  return { Low: '#128a3e', Medium: '#b45309', High: '#b91c1c' }[band] || '#b45309';
}

function statusLabel(r) {
  if (!r.requires_officer_action) {
    return '<span class="band-pill band-A" style="padding:2px 10px; font-size:12px;">Auto-Approved</span>';
  }
  if (!r.officer_decision) {
    return '<span class="band-pill band-C" style="padding:2px 10px; font-size:12px;">Pending Review</span>';
  }
  if (r.officer_decision === 'approved') {
    return '<span class="band-pill band-A" style="padding:2px 10px; font-size:12px;">Approved (Officer)</span>';
  }
  return '<span class="band-pill band-E" style="padding:2px 10px; font-size:12px;">Declined (Officer)</span>';
}

/* Compare selection persistence in localStorage */
function getCompareSelection() {
  try { return JSON.parse(localStorage.getItem('ecl_compare') || '[]'); } catch { return []; }
}
function setCompareSelection(ids) {
  localStorage.setItem('ecl_compare', JSON.stringify(ids.slice(0, 3)));
}
