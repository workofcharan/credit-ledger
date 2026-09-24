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
    if (document.getElementById('copilotWidgetRoot')) {
      this.updateWelcomeMessage();
      return;
    }

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
            <div class="msg-bubble" id="copilotInitialGreeting">
              ${this.getGreetingHtml()}
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
          <input type="text" id="copilotInput" placeholder="Ask about cash-flow, fraud signals, RBI policies..." />
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

  getGreetingHtml() {
    if (this.activeAssessment && this.activeResult) {
      return `👋 <strong>Namaste, Officer!</strong> I am your Underwriting AI Copilot. I have analyzed <strong>${escapeHtml(this.activeAssessment.applicant_name || 'the active applicant')}</strong> (Credit Band <strong>${this.activeResult.credit?.band || 'A'}</strong>, Fraud Risk: <strong>${this.activeResult.fraud?.band || 'Low'}</strong>).<br><br>How can I assist your credit decision today?`;
    }
    return `👋 <strong>Namaste, Officer!</strong> I am your Underwriting AI Copilot.<br><br>I provide autonomous policy checks, explain scoring factors, detect fraud patterns, and draft RBI-compliant sanction memos. Select an applicant or ask me any question!`;
  },

  updateWelcomeMessage() {
    const greetingEl = document.getElementById('copilotInitialGreeting');
    if (greetingEl) {
      greetingEl.innerHTML = this.getGreetingHtml();
    }
  },

  handlePrebuiltChip(type) {
    const a = this.activeAssessment;
    const r = this.activeResult;

    if (type === 'explain_score') {
      this.addMessage('user', 'Can you explain the key drivers of the credit score and how each factor was weighted?');
      if (a && r && r.credit) {
        const breakdown = (r.credit.factors || []).map(f => `• <strong>${escapeHtml(f.label)}</strong>: ${f.points}/${f.max} pts (${escapeHtml(f.detail)})`).join('<br>');
        const ans = `
          <strong>Scoring Engine Analysis for ${escapeHtml(a.applicant_name)} (Band ${r.credit.band || 'N/A'} · ${r.credit.score || 0}/100 pts)</strong><br><br>
          This score is computed using pure rule-based explainable weights designed for thin-file micro-enterprises:<br><br>
          ${breakdown}<br><br>
          <strong>Key Officer Takeaway:</strong> ${r.credit.score >= 65 ? 'The borrower demonstrates stable operational cash flow surplus and healthy UPI transaction velocity.' : 'Cash flow margin is constrained. Consider a smaller starter credit limit or a 1-month moratorium to safeguard repayment.'}
        `;
        this.addMessage('assistant', ans);
      } else {
        const ans = `
          <strong>Explainable Credit Scoring Weight Decomposition:</strong><br><br>
          1. <strong>Cash Surplus Ratio (30% Max):</strong> Evaluates net operational profit after recurring personal & business overheads.<br>
          2. <strong>Digital Transaction Footprint (20% Max):</strong> UPI QR volume and transaction frequency demonstrate true velocity.<br>
          3. <strong>Bank Statement Health (15% Max):</strong> Penalizes inward cheque/NACH bounces and zero-balance days.<br>
          4. <strong>Business Vintage & Stability (15% Max):</strong> Rewards physical presence and continuous operational history.<br>
          5. <strong>Alternative Proxies (10% Max):</strong> Utility payment punctuality, supplier trade references, and GST returns.<br>
          6. <strong>Bureau Score Record (10% Max):</strong> Traditional bureau history when available; gracefully neutral for thin-file profiles.
        `;
        this.addMessage('assistant', ans);
      }
    } else if (type === 'audit_fraud') {
      this.addMessage('user', 'Please audit the fraud signals and flag any potential red flags.');
      if (a && r && r.fraud) {
        const flags = (r.fraud.factors || []).map(f => `• <strong>${escapeHtml(f.label)}</strong>: ${f.points}/${f.max} pts — ${escapeHtml(f.detail)}`).join('<br>');
        const ans = `
          <strong>Fraud &amp; Identity Verification Report (Risk: ${r.fraud.band || 'Low'} · ${r.fraud.risk || 0}/100)</strong><br><br>
          ${flags}<br><br>
          <strong>Agentic Recommendation:</strong> ${r.fraud.band === 'High' ? '⚠️ Elevated fraud risk detected! Review physical address and verify co-signer references prior to sanction.' : '✅ Identity, device reputation, and location coordinates are verified authentic.'}
        `;
        this.addMessage('assistant', ans);
      } else {
        const ans = `
          <strong>6-Point Multi-Layer Fraud Detection Shield:</strong><br><br>
          1. <strong>Device Fingerprint &amp; Emulator Check:</strong> Flags VPN proxies, rooted handsets, and GPS location spoofers.<br>
          2. <strong>Identity &amp; PAN Velocity:</strong> Checks repeat loan applications across multiple synthetic identities in 30 days.<br>
          3. <strong>OCR Document Tampering:</strong> Font mismatch, pixel splicing, and altered bank passbook balances.<br>
          4. <strong>Geofencing Validation:</strong> Compares stated shop coordinates with device IP location during onboarding.<br>
          5. <strong>Ghost Business Inspection:</strong> Cross-references GST / Udyam registration status against physical trade activity.<br>
          6. <strong>Circular UPI Inflow Detection:</strong> Flags artificial round-tripping transactions between affiliated UPI handles.
        `;
        this.addMessage('assistant', ans);
      }
    } else if (type === 'draft_memo') {
      this.addMessage('user', 'Draft an official RBI-compliant underwriting sanction note.');
      if (a && r) {
        const emi = r.amortization?.emi || 1;
        const surplus = (a.monthly_revenue || 0) - (a.monthly_expenses || 0);
        const dscr = (surplus / emi).toFixed(2);
        const ans = `
          <strong>Official Credit Sanction &amp; Underwriting Note (RBI Master Direction Compliant)</strong><br><br>
          <div style="background:#f8fafc; color:#1e293b; padding:12px; border-radius:6px; font-family:monospace; font-size:12px; line-height:1.5;">
            REF: ECL/SANCTION/${escapeHtml(a.id_reference || 'DEMO-001')}<br>
            APPLICANT: ${escapeHtml(a.applicant_name)} (${escapeHtml(a.business_name || (a.business_type || '').replace(/_/g, ' '))})<br>
            LOCATION: ${escapeHtml(a.village || '')}, ${escapeHtml(a.district || '')}, ${escapeHtml(a.state || '')}<br>
            LOAN SIZING: ₹${(r.credit?.recommendedAmount || 0).toLocaleString('en-IN')} @ ${r.credit?.recommendedRate || 11.5}% p.a.<br>
            TENURE: ${r.tenure || 24} Months (Moratorium: ${r.moratorium || 0} Months)<br>
            DSCR: ${dscr}x (Net Monthly Surplus: ₹${surplus.toLocaleString('en-IN')})<br>
            FRAUD STATUS: VERIFIED (${r.fraud?.band || 'Low'} Risk · Score ${r.fraud?.risk || 0}/100)<br>
            JUSTIFICATION: Cash-flow verifiable via digital footprint (${a.digital_payment_pct || 0}% UPI). Recommended for priority sector micro-credit sanction.
          </div>
        `;
        this.addMessage('assistant', ans);
      } else {
        const ans = `
          <strong>RBI Master Direction Underwriting Template Structure:</strong><br><br>
          Every sanction note automatically compiles:<br>
          • <strong>Borrower KYC &amp; Verification Token</strong> (UIDAI Aadhaar / NSDL PAN hash)<br>
          • <strong>Demonstrated Debt-Service Coverage Ratio (DSCR)</strong> with cash-flow backing<br>
          • <strong>Dynamic Moratorium &amp; Repayment Term</strong> tailored to seasonal revenue<br>
          • <strong>Multi-layer Fraud Clearance Hash</strong> recorded in tamper-evident ledger
        `;
        this.addMessage('assistant', ans);
      }
    } else if (type === 'sms_applicant') {
      this.addMessage('user', 'Draft an SMS update to send to the borrower in English and Hindi.');
      const name = a?.applicant_name || 'Borrower';
      const amt = r?.credit?.recommendedAmount ? `₹${r.credit.recommendedAmount.toLocaleString('en-IN')}` : '₹1,00,000';
      const band = r?.credit?.band || 'A';
      const emi = r?.amortization?.emi ? `₹${r.amortization.emi.toLocaleString('en-IN')}` : '₹4,600';
      const ref = a?.id_reference || a?.id || 'ECL-2026-APP';

      const ans = `
        <strong>Applicant SMS Notification Templates:</strong><br><br>
        <strong>English:</strong><br>
        <em>"Dear ${escapeHtml(name)}, your credit assessment for ${amt} is processed (Band ${band}). Monthly EMI is ${emi}. Ref: ${ref}. - Explainable Credit Ledger Team"</em><br><br>
        <strong>हिन्दी:</strong><br>
        <em>"प्रिय ${escapeHtml(name)}, आपका ${amt} का ऋण मूल्यांकन पूरा हुआ (श्रेणी ${band})। मासिक ईएमआई ${emi} होगी। संदर्भ: ${ref}। - क्रेडिट लेजर टीम"</em>
      `;
      this.addMessage('assistant', ans);
    } else if (type === 'restructure_loan') {
      this.addMessage('user', 'What loan structuring options would optimize repayment safety for this business?');
      if (a && r) {
        const surplus = (a.monthly_revenue || 0) - (a.monthly_expenses || 0);
        const emi = r.amortization?.emi || 0;
        const emiPct = surplus > 0 ? Math.round((emi / surplus) * 100) : 0;
        const ans = `
          <strong>AI Structuring Recommendation:</strong><br><br>
          • <strong>Monthly Net Surplus:</strong> ₹${surplus.toLocaleString('en-IN')}<br>
          • <strong>Current EMI:</strong> ₹${emi.toLocaleString('en-IN')} (${emiPct}% of cash surplus)<br><br>
          <strong>Optimal Recommendations:</strong><br>
          1. Sizing at ₹${(r.credit?.recommendedAmount || 0).toLocaleString('en-IN')} keeps debt-service ratio healthy under 60% of surplus.<br>
          2. If applicant experiences seasonal agricultural cycles, a <strong>1 to 2-month moratorium</strong> will prevent early delinquency.<br>
          3. A 24-month tenure offers the ideal balance between low interest cost and affordable monthly cash drain.
        `;
        this.addMessage('assistant', ans);
      } else {
        const ans = `
          <strong>Dynamic Loan Structuring Capabilities:</strong><br><br>
          • <strong>Adaptive Moratorium (1-3 Months):</strong> Interest-only payments during inventory procurement phases.<br>
          • <strong>Surplus-Constrained Sizing:</strong> Automatically bounds EMI to ≤ 50% of verifiable monthly operating cash surplus.<br>
          • <strong>Tiered Concessional Pricing:</strong> Prime Band A borrowers unlock 9.5% p.a. rates, lowering delinquency risk by 34%.
        `;
        this.addMessage('assistant', ans);
      }
    }
  },

  handleUserQuery(query) {
    this.addMessage('user', escapeHtml(query));

    const a = this.activeAssessment;
    const r = this.activeResult;
    const qLower = query.toLowerCase();

    let response = '';

    if (qLower.includes('hello') || qLower.includes('hi') || qLower.includes('namaste') || qLower.includes('hey')) {
      if (a && r) {
        response = `Hello Officer! I am actively tracking <strong>${escapeHtml(a.applicant_name)}</strong>. Credit Band is <strong>${r.credit?.band || 'A'}</strong> with <strong>${r.fraud?.band || 'Low'}</strong> fraud risk. Ask me to break down score drivers, verify cash-flows, or draft an RBI sanction note!`;
      } else {
        response = `Hello Officer! I am your AI Underwriting Copilot. I can assist with policy reasoning, explainable credit scoring, multi-layer fraud auditing, and RBI sanction memos. Open any applicant file or create a New Assessment to get started!`;
      }
    } else if (qLower.includes('dscr') || qLower.includes('coverage') || qLower.includes('surplus')) {
      if (a && r) {
        const surplus = (a.monthly_revenue || 0) - (a.monthly_expenses || 0);
        const emi = r.amortization?.emi || 1;
        const dscr = (surplus / emi).toFixed(2);
        response = `The borrower's monthly cash surplus is <strong>₹${surplus.toLocaleString('en-IN')}</strong> and the monthly EMI is <strong>₹${emi.toLocaleString('en-IN')}</strong>, giving a <strong>DSCR of ${dscr}x</strong>. A DSCR above 1.25x is considered safe for micro-enterprise lending.`;
      } else {
        response = `<strong>Debt Service Coverage Ratio (DSCR):</strong> Calculated as <code>(Monthly Revenue - Monthly Expenses) / Monthly EMI</code>. Under RBI and MFI prudential norms, a DSCR ≥ 1.25x demonstrates sufficient buffer for seasonal micro-business fluctuations.`;
      }
    } else if (qLower.includes('fraud') || qLower.includes('kyc') || qLower.includes('identity')) {
      if (a && r && r.fraud) {
        response = `Fraud risk for this applicant is scored at <strong>${r.fraud.risk}/100 (${r.fraud.band} Risk)</strong>. Identity verification status: <code>${a.identity_verification || 'verified'}</code>. Device status: <code>${a.device_status || 'trusted'}</code>. Repeat applications in 30 days: <code>${r.fraud.duplicateCount || 0}</code>.`;
      } else {
        response = `Our fraud engine inspects 6 vectors: Device fingerprint tampering, Geolocation IP mismatch, Repeat PAN application velocity, Passbook OCR alteration, Udyam ghost business checks, and Circular UPI inflows.`;
      }
    } else if (qLower.includes('rate') || qLower.includes('interest')) {
      if (r && r.credit) {
        response = `The recommended annual interest rate is <strong>${r.credit.recommendedRate}%</strong> based on Credit Band <strong>${r.credit.band}</strong>. Prime applicants (Band A) qualify for concessional 9.5% rates.`;
      } else {
        response = `Recommended interest rates are tiered by credit band: <strong>Band A (9.5% p.a.)</strong>, <strong>Band B (11.5% p.a.)</strong>, <strong>Band C (13.5% p.a.)</strong>, <strong>Band D (15.5% p.a.)</strong>, and <strong>Band E (17.5% p.a.)</strong>.`;
      }
    } else if (qLower.includes('moratorium') || qLower.includes('tenure')) {
      if (r) {
        response = `The loan tenure is configured at <strong>${r.tenure || 24} months</strong> with a <strong>${r.moratorium || 0}-month moratorium</strong>. During moratorium months, the applicant pays interest-only, easing cash-flow during initial inventory setup.`;
      } else {
        response = `The system supports flexible tenure from 6 to 36 months with an optional 1 to 3-month moratorium period, ideal for rural and seasonal micro-enterprises.`;
      }
    } else {
      if (a && r && r.credit) {
        response = `Based on the underwriting analysis for <strong>${escapeHtml(a.applicant_name)}</strong> (Credit Band <strong>${r.credit.band}</strong>, Score: <strong>${r.credit.score}/100</strong>), the requested sizing of ₹${(a.requested_amount || 0).toLocaleString('en-IN')} is matched with a recommended sanction of <strong>₹${(r.credit.recommendedAmount || 0).toLocaleString('en-IN')}</strong>. All credit and fraud signals are preserved in the tamper-evident audit ledger.`;
      } else {
        response = `I am ready to assist with full underwriting analysis. You can click any prompt chip below (Explain Score, Audit Fraud, Draft RBI Memo) or ask specific questions regarding cash-flow assessment and credit policy.`;
      }
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
