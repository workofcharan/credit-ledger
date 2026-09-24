/**
 * Macroeconomic & Climate Shock Stress Tester
 * Simulates extreme rural business disruptions (Monsoon Failure / Drought, Input Inflation, Interest Rate Hikes)
 * and recalculates post-shock DSCR (Debt Service Coverage Ratio) & solvency buffer.
 */

window.StressTester = {
  renderStressWidget(containerId, assessment, result) {
    const container = document.getElementById(containerId);
    if (!container || !assessment || !result) return;

    const baseRevenue = Number(assessment.monthly_revenue) || 0;
    const baseExpenses = Number(assessment.monthly_expenses) || 0;
    const baseEmi = Number(result?.amortization?.emi) || 0;
    const baseRate = Number(result?.credit?.recommendedRate) || 12;
    const tenure = Number(result?.tenure) || 24;
    const principal = Number(result?.credit?.recommendedAmount) || 100000;

    let revenueShockPct = 0; // 0% to -50%
    let costInflationPct = 0; // 0% to +40%
    let rateHikeBps = 0; // 0 to 400 bps

    function calculatePostShock() {
      const shockedRevenue = Math.max(baseRevenue * (1 - revenueShockPct / 100), 0);
      const shockedExpenses = baseExpenses * (1 + costInflationPct / 100);
      const shockedRate = baseRate + rateHikeBps / 100;

      // Recalculate EMI under new rate
      const monthlyRate = shockedRate / 12 / 100;
      let shockedEmi = baseEmi;
      if (monthlyRate > 0) {
        shockedEmi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
                     (Math.pow(1 + monthlyRate, tenure) - 1);
      }
      shockedEmi = Math.round(shockedEmi);

      const netCashFlow = shockedRevenue - shockedExpenses;
      const surplusAfterEmi = netCashFlow - shockedEmi;

      // DSCR = Net Operating Income / Debt Service (EMI)
      const dscr = shockedEmi > 0 ? (netCashFlow / shockedEmi).toFixed(2) : 'N/A';
      const isSolvent = surplusAfterEmi >= 0;

      let resilienceRating = 'High Resilience';
      let resilienceColor = 'var(--success)';
      let resilienceBadgeClass = 'good';

      if (Number(dscr) < 1.0 || !isSolvent) {
        resilienceRating = 'High Default Risk (Insolvent Under Shock)';
        resilienceColor = 'var(--danger)';
        resilienceBadgeClass = 'danger';
      } else if (Number(dscr) < 1.25) {
        resilienceRating = 'Vulnerable (Tight Margin)';
        resilienceColor = 'var(--warning)';
        resilienceBadgeClass = 'warn';
      } else if (Number(dscr) < 1.6) {
        resilienceRating = 'Moderate Resilience';
        resilienceColor = 'var(--teal-deep)';
        resilienceBadgeClass = 'good';
      }

      return {
        shockedRevenue: Math.round(shockedRevenue),
        shockedExpenses: Math.round(shockedExpenses),
        shockedRate: shockedRate.toFixed(1),
        shockedEmi,
        netCashFlow: Math.round(netCashFlow),
        surplusAfterEmi: Math.round(surplusAfterEmi),
        dscr,
        isSolvent,
        resilienceRating,
        resilienceColor,
        resilienceBadgeClass
      };
    }

    function updateView() {
      const metrics = calculatePostShock();

      container.innerHTML = `
        <div class="stress-test-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">🌪️</span>
                <h3 style="margin:0; font-size:16px; color:var(--navy-900);">Macroeconomic &amp; Climate Shock Stress Tester</h3>
              </div>
              <p style="margin:4px 0 0; font-size:12.5px; color:var(--text-muted);">
                Simulate revenue contraction, supply inflation, and interest rate spikes to assess repayment resilience.
              </p>
            </div>
            <div>
              <span class="kpi-card ${metrics.resilienceBadgeClass}" style="display:inline-block; padding:6px 14px; font-weight:700; font-size:13px; border-radius:20px; border:1px solid currentColor;">
                ${metrics.resilienceRating}
              </span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px; background:var(--surface-alt); padding:16px; border-radius:var(--radius-md);">
            <div>
              <div class="control-row">
                <label>
                  <span>🌾 Monsoon Failure / Revenue Drop</span>
                  <span id="revDropVal" style="font-weight:700; color:var(--danger);">-${revenueShockPct}%</span>
                </label>
                <input type="range" id="revDropSlider" min="0" max="50" step="5" value="${revenueShockPct}">
              </div>
              <div style="font-size:11.5px; color:var(--text-muted); margin-top:-4px;">Simulates drought, seasonal slumps, or local road closures</div>
            </div>

            <div>
              <div class="control-row">
                <label>
                  <span>📈 Raw Material Inflation</span>
                  <span id="costInfVal" style="font-weight:700; color:var(--warning);">+${costInflationPct}%</span>
                </label>
                <input type="range" id="costInfSlider" min="0" max="40" step="5" value="${costInflationPct}">
              </div>
              <div style="font-size:11.5px; color:var(--text-muted); margin-top:-4px;">Simulates fertilizer, fuel, electricity, or inventory price hikes</div>
            </div>

            <div>
              <div class="control-row">
                <label>
                  <span>🏦 Policy Repo Rate Spike</span>
                  <span id="rateHikeVal" style="font-weight:700; color:var(--navy-700);">+${rateHikeBps} bps</span>
                </label>
                <input type="range" id="rateHikeSlider" min="0" max="400" step="50" value="${rateHikeBps}">
              </div>
              <div style="font-size:11.5px; color:var(--text-muted); margin-top:-4px;">Simulates RBI policy tightening and lender cost-of-funds increase</div>
            </div>
          </div>

          <!-- Shock Outcomes Grid -->
          <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); margin-top:16px;">
            <div class="kpi">
              <div class="label">Post-Shock Revenue</div>
              <div class="value" style="font-size:18px;">₹${metrics.shockedRevenue.toLocaleString('en-IN')} <span style="font-size:11px; color:var(--text-muted);">(was ₹${baseRevenue.toLocaleString('en-IN')})</span></div>
            </div>

            <div class="kpi">
              <div class="label">Post-Shock Expenses</div>
              <div class="value" style="font-size:18px;">₹${metrics.shockedExpenses.toLocaleString('en-IN')} <span style="font-size:11px; color:var(--text-muted);">(was ₹${baseExpenses.toLocaleString('en-IN')})</span></div>
            </div>

            <div class="kpi">
              <div class="label">Adjusted Monthly EMI</div>
              <div class="value" style="font-size:18px; color:var(--navy-900);">₹${metrics.shockedEmi.toLocaleString('en-IN')} <span style="font-size:11px; color:var(--text-muted);">(@ ${metrics.shockedRate}%)</span></div>
            </div>

            <div class="kpi">
              <div class="label">Debt Service Coverage (DSCR)</div>
              <div class="value" style="font-size:20px; font-weight:700; color:${metrics.resilienceColor};">
                ${metrics.dscr}x
              </div>
            </div>

            <div class="kpi">
              <div class="label">Surplus Buffer After EMI</div>
              <div class="value" style="font-size:18px; font-weight:700; color:${metrics.surplusAfterEmi >= 0 ? 'var(--success)' : 'var(--danger)'};">
                ₹${metrics.surplusAfterEmi.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <!-- Quick Scenario Presets -->
          <div style="margin-top:14px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
            <span style="font-size:12px; font-weight:600; color:var(--text-muted);">Quick Stress Presets:</span>
            <button type="button" class="btn btn-outline btn-sm stress-preset-btn" data-rev="0" data-cost="0" data-rate="0">🔄 Baseline (No Shock)</button>
            <button type="button" class="btn btn-outline btn-sm stress-preset-btn" data-rev="25" data-cost="15" data-rate="100">🌾 Severe Drought (-25% Rev)</button>
            <button type="button" class="btn btn-outline btn-sm stress-preset-btn" data-rev="10" data-cost="30" data-rate="200">📈 Supply Chain Surge (+30% Cost)</button>
            <button type="button" class="btn btn-outline btn-sm stress-preset-btn" data-rev="40" data-cost="25" data-rate="300" style="border-color:var(--danger); color:var(--danger);">⚠️ Extreme Crisis Shock</button>
          </div>
        </div>
      `;

      // Attach event listeners
      const revSlider = container.querySelector('#revDropSlider');
      const costSlider = container.querySelector('#costInfSlider');
      const rateSlider = container.querySelector('#rateHikeSlider');

      revSlider.addEventListener('input', (e) => {
        revenueShockPct = Number(e.target.value);
        updateView();
      });

      costSlider.addEventListener('input', (e) => {
        costInflationPct = Number(e.target.value);
        updateView();
      });

      rateSlider.addEventListener('input', (e) => {
        rateHikeBps = Number(e.target.value);
        updateView();
      });

      container.querySelectorAll('.stress-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          revenueShockPct = Number(btn.dataset.rev);
          costInflationPct = Number(btn.dataset.cost);
          rateHikeBps = Number(btn.dataset.rate);
          updateView();
        });
      });
    }

    updateView();
  }
};
