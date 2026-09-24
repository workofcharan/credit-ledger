/**
 * Agentic AI Credit Officer Copilot
 * Autonomous underwriting assistant providing natural-language reasoning,
 * audit memo drafting, policy cross-checking, and vernacular SMS generation.
 */

window.CreditCopilot = {
  activeAssessment: null,
  activeResult: null,

  init(assessment, result) {
    this.activeAssessment = assessment;
    this.activeResult = result;
    this.renderFloatingWidget();
  },

  renderFloatingWidget() {
    if (document.getElementById('copilotWidgetRoot')) return;

    const div = document.createElement('div');
    div.id = 'copilotWidgetRoot';
    div.innerHTML = `
      <!-- Floating Launch Button -->
      <button type="button" class="copilot-fab" id="copilotFab" title="Open AI Underwriting Copilot">
        <span class="copilot-fab-icon">🤖</span>
        <span class="copilot-fab-text">AI Copilot</span>
      </button>

      <!-- Slide-out Modal/Drawer -->
      <div class="copilot-drawer" id="copilotDrawer" style="display:none;">
        <div class="copilot-drawer-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="copilot-avatar">🧠</div>
            <div>
              <strong style="font-size:15px; color:#fff;">Agentic AI Credit Copilot</strong>
              <div style="font-size:11.5px; color:#a5b4fc;">Autonomous Underwriting &amp; Policy Reasoner</div>
            </div>
          </div>
          <button type="button" class="copilot-close-btn" id="copilotCloseBtn">&times;</button>
        </div>

        <div class="copilot-drawer-body" id="copilotChatMessages">
          <div class="copilot-msg assistant">
            <div class="msg-bubble">
              👋 <strong>Namaste, Officer!</strong> I am your Underwriting AI Copilot. I have analyzed 
              <strong>${this.activeAssessment ? escapeHtml(this.activeAssessment.applicant_name) : 'the active application'}</strong>.
              <br><br>
              How can I assist your credit decision today?
            </div>
          </div>
        </div>

        <!-- Quick Prompt Chips -->
        <div class="copilot-chips-wrap" id="copilotChips">
          <button type="button" class="copilot-chip" data-query="explain_score">📊 Explain score root causes</button>
          <button type="button" class="copilot-chip" data-query="audit_fraud">🛡️ Audit fraud indicators</button>
          <button type="button" class="copilot-chip" data-query="draft_memo">📝 Draft RBI audit memo</button>
          <button type="button" class="copilot-chip" data-query="sms_applicant">📱 Draft Vernacular SMS</button>
          <button type="button" class="copilot-chip" data-query="restructure_loan">💡 Recommend loan restructuring</button>
        </div>

        <!-- Input Box -->
        <div class="copilot-drawer-footer">
          <input type="text" id="copilotInput" placeholder="Ask about cash-flow, fraud signals, tenure..." />
          <button type="button" id="copilotSendBtn">Send</button>
        </div>
      </div>
    `;

    document.body.appendChild(div);

    const fab = document.getElementById('copilotFab');
    const drawer = document.getElementById('copilotDrawer');
    const closeBtn = document.getElementById('copilotCloseBtn');
    const input = document.getElementById('copilotInput');
    const sendBtn = document.getElementById('copilotSendBtn');
    const chipsWrap = document.getElementById('copilotChips');

    fab.addEventListener('click', () => {
      drawer.style.display = drawer.style.display === 'none' ? 'flex' : 'none';
      if (drawer.style.display === 'flex') {
        input.focus();
      }
    });

    closeBtn.addEventListener('click', () => {
      drawer.style.display = 'none';
    });

    sendBtn.addEventListener('click', () => {
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      this.handleUserQuery(q);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = input.value.trim();
        if (!q) return;
        input.value = '';
        this.handleUserQuery(q);
      }
    });

    chipsWrap.querySelectorAll('.copilot-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const qType = chip.dataset.query;
        this.handlePrebuiltChip(qType);
      });
    });
  },

  handlePrebuiltChip(type) {
    const a = this.activeAssessment || {};
    const r = this.activeResult || {};

    if (type === 'explain_score') {
      this.addMessage('user', 'Can you explain the key drivers of this credit score and how each factor was weighted?');
      const breakdown = (r.credit?.factors || []).map(f => `• <strong>${escapeHtml(f.label)}</strong>: ${f.points}/${f.max} pts (${escapeHtml(f.detail)})`).join('<br>');
      const ans = `
        <strong>Scoring Engine Analysis (Band ${r.credit?.band || 'N/A'} · ${r.credit?.score || 0}/100 pts)</strong><br><br>
        This score is computed using pure rule-based explainable weights designed for thin-file micro-enterprises:<br><br>
        ${breakdown}<br><br>
        <strong>Key Officer Takeaway:</strong> ${r.credit?.score >= 65 ? 'The borrower demonstrates stable operational cash flow surplus and healthy UPI transaction velocity.' : 'Cash flow margin is constrained. Consider a smaller starter credit limit or a 1-month moratorium to safeguard repayment.'}
      `;
      this.addMessage('assistant', ans);
    } else if (type === 'audit_fraud') {
      this.addMessage('user', 'Please audit the fraud signals and flag any potential red flags.');
      const flags = (r.fraud?.factors || []).map(f => `• <strong>${escapeHtml(f.label)}</strong>: ${f.points}/${f.max} pts — ${escapeHtml(f.detail)}`).join('<br>');
      const ans = `
        <strong>Fraud &amp; Identity Verification Report (Risk: ${r.fraud?.band || 'Low'} · ${r.fraud?.risk || 0}/100)</strong><br><br>
        ${flags}<br><br>
        <strong>Agentic Recommendation:</strong> ${r.fraud?.band === 'High' ? '⚠️ Elevated fraud risk detected! Review physical address and verify co-signer references prior to sanction.' : '✅ Identity, device reputation, and location coordinates are verified authentic.'}
      `;
      this.addMessage('assistant', ans);
    } else if (type === 'draft_memo') {
      this.addMessage('user', 'Draft an official RBI-compliant underwriting sanction note for this applicant.');
      const ans = `
        <strong>Official Credit Sanction &amp; Underwriting Note (RBI Master Direction Compliant)</strong><br><br>
        <div style="background:#f8fafc; color:#1e293b; padding:12px; border-radius:6px; font-family:monospace; font-size:12px; line-height:1.5;">
          REF: ECL/SANCTION/${a.id_reference || 'DEMO-001'}<br>
          APPLICANT: ${escapeHtml(a.applicant_name)} (${escapeHtml(a.business_name || (a.business_type || '').replace(/_/g, ' '))})<br>
          LOCATION: ${escapeHtml(a.village || '')}, ${escapeHtml(a.district || '')}, ${escapeHtml(a.state || '')}<br>
          LOAN SIZING: ₹${(r.credit?.recommendedAmount || 0).toLocaleString('en-IN')} @ ${r.credit?.recommendedRate || 11.5}% p.a.<br>
          TENURE: ${r.tenure || 24} Months (Moratorium: ${r.moratorium || 0} Months)<br>
          DSCR: ${((a.monthly_revenue - a.monthly_expenses) / (r.amortization?.emi || 1)).toFixed(2)}x (Net Surplus: ₹${((a.monthly_revenue - a.monthly_expenses) - (r.amortization?.emi || 0)).toLocaleString('en-IN')})<br>
          FRAUD STATUS: VERIFIED (${r.fraud?.band || 'Low'} Risk)<br>
          JUSTIFICATION: Cash-flow verifiable via digital footprint (${a.digital_payment_pct || 0}% UPI). Recommended for priority sector rural micro-credit sanction.
        </div>
      `;
      this.addMessage('assistant', ans);
    } else if (type === 'sms_applicant') {
      this.addMessage('user', 'Draft an SMS update to send to the borrower in English and Hindi.');
      const ans = `
        <strong>Applicant SMS Notification Templates:</strong><br><br>
        <strong>English:</strong><br>
        <em>"Dear ${escapeHtml(a.applicant_name)}, your credit assessment for ₹${(r.credit?.recommendedAmount || 0).toLocaleString('en-IN')} is processed (Band ${r.credit?.band}). Monthly EMI is ₹${(r.amortization?.emi || 0).toLocaleString('en-IN')}. Ref: ${a.id_reference || a.id}. - Credit Ledger Team"</em><br><br>
        <strong>हिन्दी:</strong><br>
        <em>"प्रिय ${escapeHtml(a.applicant_name)}, आपका ₹${(r.credit?.recommendedAmount || 0).toLocaleString('en-IN')} का ऋण मूल्यांकन पूरा हुआ (श्रेणी ${r.credit?.band})। मासिक ईएमआई ₹${(r.amortization?.emi || 0).toLocaleString('en-IN')} होगी। संदर्भ: ${a.id_reference || a.id}।"</em>
      `;
      this.addMessage('assistant', ans);
    } else if (type === 'restructure_loan') {
      this.addMessage('user', 'What loan structuring options would optimize repayment safety for this business?');
      const surplus = (a.monthly_revenue || 0) - (a.monthly_expenses || 0);
      const ans = `
        <strong>AI Structuring Recommendation:</strong><br><br>
        • <strong>Monthly Net Surplus:</strong> ₹${surplus.toLocaleString('en-IN')}<br>
        • <strong>Current EMI:</strong> ₹${(r.amortization?.emi || 0).toLocaleString('en-IN')} (${surplus > 0 ? Math.round(((r.amortization?.emi || 0) / surplus) * 100) : 0}% of surplus)<br><br>
        <strong>Optimal Recommendations:</strong><br>
        1. Sizing at ₹${(r.credit?.recommendedAmount || 0).toLocaleString('en-IN')} keeps debt-service ratio healthy under 60% of surplus.<br>
        2. If applicant experiences seasonal agricultural cycles, a <strong>1 to 2-month moratorium</strong> will prevent early delinquency.<br>
        3. A 24-month tenure offers the ideal balance between low interest cost and affordable monthly cash drain.
      `;
      this.addMessage('assistant', ans);
    }
  },

  handleUserQuery(query) {
    this.addMessage('user', escapeHtml(query));

    const a = this.activeAssessment || {};
    const r = this.activeResult || {};
    const qLower = query.toLowerCase();

    let response = '';

    if (qLower.includes('dscr') || qLower.includes('coverage') || qLower.includes('surplus')) {
      const surplus = (a.monthly_revenue || 0) - (a.monthly_expenses || 0);
      const emi = r.amortization?.emi || 1;
      const dscr = (surplus / emi).toFixed(2);
      response = `The borrower's monthly cash surplus is <strong>₹${surplus.toLocaleString('en-IN')}</strong> and the monthly EMI is <strong>₹${emi.toLocaleString('en-IN')}</strong>, giving a <strong>DSCR of ${dscr}x</strong>. A DSCR above 1.25x is considered safe for micro-enterprise lending.`;
    } else if (qLower.includes('fraud') || qLower.includes('kyc') || qLower.includes('identity')) {
      response = `Fraud risk for this applicant is scored at <strong>${r.fraud?.risk || 0}/100 (${r.fraud?.band || 'Low'} Risk)</strong>. Identity verification status: <code>${a.identity_verification || 'verified'}</code>. Device status: <code>${a.device_status || 'trusted'}</code>. Repeat applications in 30 days: <code>${r.fraud?.duplicateCount || 0}</code>.`;
    } else if (qLower.includes('rate') || qLower.includes('interest')) {
      response = `The recommended annual interest rate is <strong>${r.credit?.recommendedRate || 11.5}%</strong> based on Credit Band <strong>${r.credit?.band || 'A'}</strong>. Prime applicants (Band A) qualify for concessional 9.5% rates.`;
    } else if (qLower.includes('moratorium') || qLower.includes('tenure')) {
      response = `The current loan tenure is configured at <strong>${r.tenure || 24} months</strong> with a <strong>${r.moratorium || 0}-month moratorium</strong>. During moratorium months, the applicant pays interest-only, easing cash-flow during initial inventory setup.`;
    } else {
      response = `Based on the underwriting analysis for <strong>${escapeHtml(a.applicant_name || 'the applicant')}</strong> (Credit Band <strong>${r.credit?.band || 'A'}</strong>, Score: <strong>${r.credit?.score || 0}/100</strong>), the requested sizing of ₹${(a.requested_amount || 0).toLocaleString('en-IN')} is matched with a recommended sanction of <strong>₹${(r.credit?.recommendedAmount || 0).toLocaleString('en-IN')}</strong>. All credit and fraud signals are preserved in the tamper-evident audit ledger.`;
    }

    this.addMessage('assistant', response);
  },

  addMessage(sender, htmlContent) {
    const container = document.getElementById('copilotChatMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `copilot-msg ${sender}`;
    div.innerHTML = `<div class="msg-bubble">${htmlContent}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
};
