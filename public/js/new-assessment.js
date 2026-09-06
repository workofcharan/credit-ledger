document.addEventListener('DOMContentLoaded', async () => {
  const officer = await initProtectedPage();
  if (!officer) return;

  // Segmented buttons interaction
  document.querySelectorAll('.segmented').forEach((group) => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      group.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  function segValue(name) {
    const active = document.querySelector(`.segmented[data-name="${name}"] .seg-btn.active`);
    return active ? active.dataset.value : null;
  }

  function setSegValue(name, val) {
    const group = document.querySelector(`.segmented[data-name="${name}"]`);
    if (!group) return;
    group.querySelectorAll('.seg-btn').forEach((b) => {
      if (b.dataset.value === val) b.classList.add('active');
      else b.classList.remove('active');
    });
  }

  function setFormValues(data) {
    const form = document.getElementById('assessForm');
    for (const [key, val] of Object.entries(data)) {
      const input = form.elements[key];
      if (input && input.tagName !== 'BUTTON') {
        input.value = val;
      }
    }
    if (data.existing_loan) setSegValue('existing_loan', data.existing_loan);
    if (data.identity_verification) setSegValue('identity_verification', data.identity_verification);
    if (data.device_status) setSegValue('device_status', data.device_status);
    if (data.location_consistency) setSegValue('location_consistency', data.location_consistency);
  }

  // Quick Load Presets
  const cleanPreset = {
    applicant_name: 'Anil Reddy',
    business_name: 'Reddy Provisions & General Store',
    village: 'Nalgonda',
    district: 'Nalgonda',
    state: 'Telangana',
    business_type: 'kirana_store',
    years_operating: '4',
    monthly_revenue: '90000',
    monthly_expenses: '55000',
    digital_payment_pct: '80',
    savings_ratio: '30',
    existing_loan: 'no',
    existing_loan_amount: '0',
    repayment_history: 'good',
    dependents: '2',
    id_reference: 'REF-TS-2026-01',
    identity_verification: 'verified',
    device_status: 'trusted',
    location_consistency: 'consistent',
    income_doc_variance_pct: '5',
    reference_check: 'verified',
    requested_amount: '120000',
    requested_tenure_months: '24'
  };

  const thinFilePreset = {
    applicant_name: 'Lakshmi Devi',
    business_name: 'Maa Lakshmi Handloom Weaving',
    village: 'Pochampally',
    district: 'Yadadri Bhuvanagiri',
    state: 'Telangana',
    business_type: 'handicraft',
    years_operating: '3',
    monthly_revenue: '36000',
    monthly_expenses: '22000',
    digital_payment_pct: '45',
    savings_ratio: '25',
    existing_loan: 'no',
    existing_loan_amount: '0',
    repayment_history: 'none',
    dependents: '1',
    id_reference: 'REF-TS-2026-02',
    identity_verification: 'verified',
    device_status: 'trusted',
    location_consistency: 'consistent',
    income_doc_variance_pct: '8',
    reference_check: 'verified',
    requested_amount: '50000',
    requested_tenure_months: '18'
  };

  const fraudPreset = {
    applicant_name: 'Karan Sharma',
    business_name: 'Sharma Electronics & Mobile Hub',
    village: 'Nagpur',
    district: 'Nagpur',
    state: 'Maharashtra',
    business_type: 'repair_services',
    years_operating: '1',
    monthly_revenue: '110000',
    monthly_expenses: '70000',
    digital_payment_pct: '30',
    savings_ratio: '10',
    existing_loan: 'yes',
    existing_loan_amount: '40000',
    repayment_history: 'average',
    dependents: '2',
    id_reference: 'REF-MH-2026-99',
    identity_verification: 'partial',
    device_status: 'flagged',
    location_consistency: 'inconsistent',
    income_doc_variance_pct: '60',
    reference_check: 'conflicting',
    requested_amount: '200000',
    requested_tenure_months: '24'
  };

  const loadCleanBtn = document.getElementById('loadCleanBtn');
  if (loadCleanBtn) {
    loadCleanBtn.addEventListener('click', () => {
      setFormValues(cleanPreset);
      showToast('Loaded Clean Kirana profile.');
    });
  }

  const loadThinFileBtn = document.getElementById('loadThinFileBtn');
  if (loadThinFileBtn) {
    loadThinFileBtn.addEventListener('click', () => {
      setFormValues(thinFilePreset);
      showToast('Loaded Thin-File Artisan profile.');
    });
  }

  const loadFraudBtn = document.getElementById('loadFraudBtn');
  if (loadFraudBtn) {
    loadFraudBtn.addEventListener('click', () => {
      setFormValues(fraudPreset);
      showToast('Loaded High Fraud Risk profile.');
    });
  }

  document.getElementById('resetFormBtn').addEventListener('click', () => {
    document.getElementById('assessForm').reset();
    setSegValue('existing_loan', 'no');
    setSegValue('identity_verification', 'verified');
    setSegValue('device_status', 'trusted');
    setSegValue('location_consistency', 'consistent');
  });

  document.getElementById('assessForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    payload.existing_loan = segValue('existing_loan') || 'no';
    payload.identity_verification = segValue('identity_verification') || 'verified';
    payload.device_status = segValue('device_status') || 'trusted';
    payload.location_consistency = segValue('location_consistency') || 'consistent';
    payload.margin_pct = Number(payload.margin_pct) || 15;
    payload.moratorium_months = Number(payload.moratorium_months) || 0;
    payload.monthly_revenue = Number(payload.monthly_revenue) || 0;
    payload.monthly_expenses = Number(payload.monthly_expenses) || 0;
    payload.years_operating = Number(payload.years_operating) || 0;
    payload.requested_amount = Number(payload.requested_amount) || 0;
    payload.requested_tenure_months = Number(payload.requested_tenure_months) || 24;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> <span>Generating Assessment...</span>';
    try {
      const res = await API.post('/assessments', payload);
      const created = res?.assessment || res;
      if (created && created.id) {
        window.location.href = `/report.html?id=${created.id}&new=1`;
        return;
      }
      // Direct client fallback creation if response was empty
      if (typeof handleClientFallback === 'function') {
        const fallbackRes = await handleClientFallback('POST', '/assessments', payload);
        if (fallbackRes?.assessment?.id) {
          window.location.href = `/report.html?id=${fallbackRes.assessment.id}&new=1`;
          return;
        }
      }
      throw new Error(res?.error || 'Failed to create assessment record');
    } catch (err) {
      showToast(err.message || 'Error creating assessment', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span>Generate Assessment</span>';
    }
  });
});
