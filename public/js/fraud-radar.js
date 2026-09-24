/**
 * AI Fraud Radar & Investigation Network Visualizer
 * Interactive 2D HTML5 canvas graph visualizer for cross-application entity resolution,
 * shared device/phone detection, and rural syndicate fraud ring tracking.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const officer = await initProtectedPage();
  if (!officer) return;

  const canvas = document.getElementById('fraudGraphCanvas');
  const ctx = canvas.getContext('2d');
  const inspectorEl = document.getElementById('entityInspector');
  const filterBtns = document.querySelectorAll('.radar-filter-btn');
  const searchInput = document.getElementById('radarSearchInput');

  let assessments = [];
  let nodes = [];
  let edges = [];
  let selectedNode = null;
  let hoveredNode = null;
  let activeFilter = 'all';
  let isDragging = false;
  let draggedNode = null;
  let dragOffset = { x: 0, y: 0 };
  let pulseAngle = 0;

  // Set canvas resolution
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 560;
  }
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    buildGraph();
  });

  // Load data
  try {
    const res = await API.get('/assessments');
    assessments = res.assessments || [];
    buildGraph();
    renderAnomalyFeed();
    updateMetrics();
    animate();
  } catch (err) {
    showToast('Failed to load assessment network data', 'error');
  }

  function buildGraph() {
    nodes = [];
    edges = [];

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const deviceMap = new Map();
    const locationMap = new Map();
    const idRefMap = new Map();

    // 1. Create Applicant nodes
    assessments.forEach((ast, idx) => {
      let result = {};
      try { result = JSON.parse(ast.result_json); } catch {}
      const fraudBand = ast.fraud_band || result.fraud?.band || 'Low';
      const fraudScore = ast.fraud_score !== undefined ? ast.fraud_score : (result.fraud?.risk || 0);

      // Angle distribution around center
      const angle = (idx / assessments.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.32 + (idx % 2 === 0 ? 30 : -30);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const appNode = {
        id: ast.id,
        type: 'applicant',
        label: ast.applicant_name,
        sub: ast.business_name || (ast.business_type || '').replace(/_/g, ' '),
        fraudBand,
        fraudScore,
        creditBand: ast.credit_band || result.credit?.band || 'A',
        creditScore: ast.credit_score || result.credit?.score || 80,
        assessment: ast,
        result,
        x,
        y,
        radius: 22,
        color: fraudBand === 'High' ? '#ef4444' : fraudBand === 'Medium' ? '#f59e0b' : '#10b981',
        icon: '👤'
      };
      nodes.push(appNode);

      // Group devices
      const dev = ast.device_status || 'new';
      if (!deviceMap.has(dev)) {
        const dNode = {
          id: 'dev_' + dev,
          type: 'device',
          label: `Device: ${dev.toUpperCase()}`,
          sub: `${dev === 'flagged' ? '⚠️ High Suspicion Hardware' : 'Verified Hardware'}`,
          x: centerX + (Math.random() - 0.5) * 220,
          y: centerY + (Math.random() - 0.5) * 160,
          radius: 16,
          color: dev === 'flagged' ? '#dc2626' : '#64748b',
          icon: '📱'
        };
        deviceMap.set(dev, dNode);
        nodes.push(dNode);
      }
      edges.push({
        from: appNode,
        to: deviceMap.get(dev),
        label: 'hardware_fingerprint',
        color: dev === 'flagged' ? 'rgba(220,38,38,0.6)' : 'rgba(100,116,139,0.3)',
        dash: dev === 'flagged' ? [4, 4] : []
      });

      // Group locations / villages
      const loc = ast.village || ast.district || 'Rural Hub';
      if (!locationMap.has(loc)) {
        const lNode = {
          id: 'loc_' + loc,
          type: 'location',
          label: `📍 ${loc}`,
          sub: `${ast.state || 'State'} Cluster`,
          x: centerX + Math.cos(angle + 0.3) * (radius * 0.7),
          y: centerY + Math.sin(angle + 0.3) * (radius * 0.7),
          radius: 15,
          color: '#3b82f6',
          icon: '📍'
        };
        locationMap.set(loc, lNode);
        nodes.push(lNode);
      }
      edges.push({
        from: appNode,
        to: locationMap.get(loc),
        label: 'geo_location',
        color: 'rgba(59,130,246,0.3)',
        dash: []
      });

      // Group ID References (Detect duplicates)
      if (ast.id_reference) {
        const refKey = ast.id_reference.trim().toUpperCase();
        if (!idRefMap.has(refKey)) {
          const rNode = {
            id: 'ref_' + refKey,
            type: 'id_ref',
            label: refKey,
            sub: 'KYC Reference Anchor',
            x: centerX + (Math.random() - 0.5) * 300,
            y: centerY + (Math.random() - 0.5) * 260,
            radius: 14,
            color: '#8b5cf6',
            icon: '🪪'
          };
          idRefMap.set(refKey, rNode);
          nodes.push(rNode);
        }
        edges.push({
          from: appNode,
          to: idRefMap.get(refKey),
          label: 'kyc_reference',
          color: 'rgba(139,92,246,0.4)',
          dash: []
        });
      }
    });
  }

  function updateMetrics() {
    const totalApps = assessments.length;
    const highFraud = assessments.filter(a => a.fraud_band === 'High').length;
    const medFraud = assessments.filter(a => a.fraud_band === 'Medium').length;
    const multiAppHits = assessments.filter(a => (a.fraud_score || 0) > 40).length;

    document.getElementById('radarMetricTotal').textContent = totalApps;
    document.getElementById('radarMetricHigh').textContent = highFraud;
    document.getElementById('radarMetricMedium').textContent = medFraud;
    document.getElementById('radarMetricRings').textContent = multiAppHits > 0 ? `${multiAppHits} Cluster Flags` : '0 Clean';
  }

  function renderAnomalyFeed() {
    const feed = document.getElementById('radarAnomalyFeed');
    if (!feed) return;

    const highOrMed = assessments.filter(a => a.fraud_band === 'High' || a.fraud_band === 'Medium' || (a.fraud_score || 0) > 20);

    if (highOrMed.length === 0) {
      feed.innerHTML = `<div style="padding:16px; font-size:13px; color:var(--text-muted); text-align:center;">✅ All active applications are clean on KYC and device reputation.</div>`;
      return;
    }

    feed.innerHTML = highOrMed.map(a => {
      const isHigh = a.fraud_band === 'High' || (a.fraud_score || 0) >= 55;
      const badgeCls = isHigh ? 'danger' : 'warn';
      const badgeText = isHigh ? '🚨 HIGH FRAUD RISK' : '⚠️ SUSPICIOUS ANOMALY';

      return `
        <div class="radar-alert-item ${isHigh ? 'alert-high' : 'alert-medium'}" data-id="${a.id}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="badge-pill ${badgeCls}" style="font-size:11px; font-weight:700; padding:2px 6px;">${badgeText}</span>
            <span style="font-size:11px; color:var(--text-muted);">${new Date(a.created_at).toLocaleDateString()}</span>
          </div>
          <div style="font-weight:700; font-size:13.5px; margin-top:4px; color:var(--navy-900);">
            ${escapeHtml(a.applicant_name)}
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
            ${escapeHtml(a.business_name || (a.business_type || '').replace(/_/g, ' '))} · ${escapeHtml(a.village || a.district || 'India')}
          </div>
          <div style="font-size:12px; margin-top:6px; background:rgba(255,255,255,0.7); padding:6px 8px; border-radius:4px; color:var(--text);">
            Flag: <code>${a.device_status === 'flagged' ? 'Flagged hardware' : a.identity_verification === 'mismatch' ? 'KYC mismatch' : 'Document turnover variance'}</code>
          </div>
        </div>
      `;
    }).join('');

    feed.querySelectorAll('.radar-alert-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const target = nodes.find(n => n.id === id);
        if (target) {
          selectedNode = target;
          inspectNode(target);
        }
      });
    });
  }

  function inspectNode(node) {
    if (!inspectorEl) return;

    if (!node) {
      inspectorEl.innerHTML = `
        <div class="empty-inspector">
          <div style="font-size:28px; margin-bottom:8px;">🔍</div>
          <strong style="color:var(--navy-900);">Select Any Network Node</strong>
          <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">
            Click on applicants, hardware devices, or KYC anchors to view identity relationships.
          </p>
        </div>
      `;
      return;
    }

    if (node.type === 'applicant') {
      const a = node.assessment;
      const isHigh = node.fraudBand === 'High';

      inspectorEl.innerHTML = `
        <div class="inspector-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span class="badge-pill ${isHigh ? 'danger' : 'good'}" style="font-size:11.5px; font-weight:700;">
              ${node.fraudBand} Fraud Risk (${node.fraudScore}/100)
            </span>
            <span class="band-pill band-${node.creditBand}" style="font-size:11px;">Credit Band ${node.creditBand}</span>
          </div>

          <h3 style="margin:8px 0 2px; font-size:17px; color:var(--navy-900);">${escapeHtml(node.label)}</h3>
          <div style="font-size:12.5px; color:var(--text-muted);">${escapeHtml(node.sub)} · ${escapeHtml(a.village || '')}, ${escapeHtml(a.state || '')}</div>

          <div style="margin-top:12px; background:var(--surface-alt); padding:10px; border-radius:6px; font-size:12.5px;">
            <div><strong>KYC Status:</strong> <code>${escapeHtml(a.identity_verification || 'verified')}</code></div>
            <div><strong>Device Status:</strong> <code>${escapeHtml(a.device_status || 'trusted')}</code></div>
            <div><strong>Monthly Revenue:</strong> ₹${(a.monthly_revenue || 0).toLocaleString('en-IN')}</div>
            <div><strong>Requested Sizing:</strong> ₹${(a.requested_amount || 0).toLocaleString('en-IN')}</div>
          </div>

          <div style="margin-top:16px; display:flex; gap:8px;">
            <a href="/report.html?id=${a.id}" class="btn btn-primary btn-sm" style="flex:1; text-align:center;">
              📄 Open Full Assessment
            </a>
            <a href="/compare.html?ids=${a.id}" class="btn btn-outline btn-sm" title="Compare">
              ⚖️
            </a>
          </div>
        </div>
      `;
    } else {
      inspectorEl.innerHTML = `
        <div class="inspector-card">
          <span class="badge-pill" style="background:#e0e7ff; color:#3730a3; font-weight:700; font-size:11.5px;">
            ${node.type.toUpperCase()} ANCHOR
          </span>
          <h3 style="margin:8px 0 2px; font-size:16px; color:var(--navy-900);">${escapeHtml(node.label)}</h3>
          <div style="font-size:12.5px; color:var(--text-muted);">${escapeHtml(node.sub || '')}</div>
          <p style="font-size:12px; margin-top:10px; color:var(--text);">
            Connected to <strong>${edges.filter(e => e.from === node || e.to === node).length}</strong> application(s) across the rural lending network.
          </p>
        </div>
      `;
    }
  }

  // Animation & Rendering Loop
  function animate() {
    pulseAngle += 0.03;
    draw();
    requestAnimationFrame(animate);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Draw radar concentric radar rings & scanning beam
    ctx.save();
    ctx.strokeStyle = 'rgba(15, 148, 136, 0.12)';
    ctx.lineWidth = 1;
    [100, 180, 260, 340].forEach(r => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
      ctx.stroke();
    });

    // Scanning radar line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const beamX = centerX + Math.cos(pulseAngle) * (Math.min(width, height) * 0.48);
    const beamY = centerY + Math.sin(pulseAngle) * (Math.min(width, height) * 0.48);
    ctx.lineTo(beamX, beamY);
    ctx.strokeStyle = 'rgba(15, 148, 136, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 2. Filter nodes based on active filter
    const visibleNodes = nodes.filter(n => {
      if (activeFilter === 'high') return n.fraudBand === 'High';
      if (activeFilter === 'medium') return n.fraudBand === 'Medium';
      if (activeFilter === 'low') return n.fraudBand === 'Low';
      return true;
    });
    const visibleSet = new Set(visibleNodes);

    // 3. Draw edges
    edges.forEach(e => {
      if (!visibleSet.has(e.from) && !visibleSet.has(e.to)) return;

      const isHighlighted = (selectedNode && (e.from === selectedNode || e.to === selectedNode)) ||
                            (hoveredNode && (e.from === hoveredNode || e.to === hoveredNode));

      ctx.save();
      ctx.beginPath();
      if (e.dash && e.dash.length) ctx.setLineDash(e.dash);
      ctx.moveTo(e.from.x, e.from.y);
      ctx.lineTo(e.to.x, e.to.y);
      ctx.strokeStyle = isHighlighted ? 'rgba(239, 68, 68, 0.8)' : e.color;
      ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
      ctx.stroke();
      ctx.restore();
    });

    // 4. Draw nodes
    nodes.forEach(n => {
      const isVisible = visibleSet.has(n);
      const opacity = isVisible ? 1 : 0.2;
      const isSelected = selectedNode === n;
      const isHovered = hoveredNode === n;

      ctx.save();
      ctx.globalAlpha = opacity;

      // Pulse ring on high fraud nodes
      if (n.fraudBand === 'High') {
        const pulse = 6 + Math.sin(pulseAngle * 3) * 4;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + pulse, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fill();
      }

      // Main circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
      ctx.fillStyle = n.color;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.stroke();

      // Icon / text
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.icon || '•', n.x, n.y);

      // Label below node
      ctx.fillStyle = 'var(--navy-900)';
      ctx.font = isSelected || isHovered ? 'bold 12px Inter, sans-serif' : '11px Inter, sans-serif';
      ctx.fillText(n.label, n.x, n.y + n.radius + 13);

      ctx.restore();
    });
  }

  // Mouse interaction
  function getNodeAt(x, y) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy <= (n.radius + 6) * (n.radius + 6)) {
        return n;
      }
    }
    return null;
  }

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = getNodeAt(x, y);

    if (hit) {
      isDragging = true;
      draggedNode = hit;
      selectedNode = hit;
      dragOffset.x = hit.x - x;
      dragOffset.y = hit.y - y;
      inspectNode(hit);
    } else {
      selectedNode = null;
      inspectNode(null);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && draggedNode) {
      draggedNode.x = x + dragOffset.x;
      draggedNode.y = y + dragOffset.y;
    } else {
      const hit = getNodeAt(x, y);
      hoveredNode = hit;
      canvas.style.cursor = hit ? 'pointer' : 'default';
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    draggedNode = null;
  });

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
    });
  });

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        selectedNode = null;
        inspectNode(null);
        return;
      }
      const match = nodes.find(n => n.label.toLowerCase().includes(q) || (n.sub && n.sub.toLowerCase().includes(q)));
      if (match) {
        selectedNode = match;
        inspectNode(match);
      }
    });
  }
});
