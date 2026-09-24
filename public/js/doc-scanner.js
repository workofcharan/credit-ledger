/**
 * Smart Document OCR & Digital Tampering Inspector
 * Performs simulated computer vision OCR and forensic forgery detection.
 */

window.DocScanner = {
  sampleTemplates: {
    aadhaar_clean: {
      docType: 'Aadhaar Card (UIDAI Verified)',
      name: 'Ramesh Kumar',
      idRef: 'REF-TS-98741',
      village: 'Suryapet',
      district: 'Suryapet',
      state: 'Telangana',
      revenue: 85000,
      businessType: 'kirana_store',
      tamperScore: 2,
      tamperStatus: 'clean',
      highlights: [
        { label: 'UIDAI QR Code Cryptographic Signature', status: 'verified', note: 'Valid digital signature from UIDAI authority.' },
        { label: 'Typography & Microprint Consistency', status: 'verified', note: 'Uniform font kerning and pixel density across document.' },
        { label: 'Hologram & Emblem Reflection', status: 'verified', note: 'Optical variable ink matches standard Indian government template.' }
      ]
    },
    pan_clean: {
      docType: 'PAN Card (Income Tax Dept)',
      name: 'Sunita Devi',
      idRef: 'REF-RJ-64210',
      village: 'Kotputli',
      district: 'Jaipur',
      state: 'Rajasthan',
      revenue: 42000,
      businessType: 'dairy',
      tamperScore: 4,
      tamperStatus: 'clean',
      highlights: [
        { label: 'NSDL / UTIITSL Database Match', status: 'verified', note: 'Permanent Account Number active and verified.' },
        { label: 'Photo Layer Blending', status: 'verified', note: 'Natural halftone raster pattern without copy-paste boundary artifacts.' }
      ]
    },
    khata_tampered: {
      docType: 'Khata Book / Bank Passbook (Flagged)',
      name: 'Rajesh Textiles',
      idRef: 'REF-MH-11029',
      village: 'Bhiwandi',
      district: 'Thane',
      state: 'Maharashtra',
      revenue: 95000,
      businessType: 'tailoring',
      tamperScore: 78,
      tamperStatus: 'tampered',
      highlights: [
        { label: 'Altered Revenue Digits (Font Artifact Mismatch)', status: 'flagged', note: 'Digit "9" exhibits inconsistent pixel compression and anti-aliasing compared to surrounding figures.' },
        { label: 'Stamp & Bank Seal Overlay Splicing', status: 'flagged', note: 'Bank seal edges show digital lasso artifact with color gradient discontinuity.' },
        { label: 'Document EXIF Creation Date Anomaly', status: 'flagged', note: 'PDF generated via editing software 30 minutes before submission; metadata inconsistent with physical scan.' }
      ]
    },
    gst_return: {
      docType: 'GST GSTR-3B Return Summary',
      name: 'Suresh Patel',
      idRef: 'REF-GJ-77123',
      village: 'Anand',
      district: 'Anand',
      state: 'Gujarat',
      revenue: 120000,
      businessType: 'agri_input',
      tamperScore: 3,
      tamperStatus: 'clean',
      highlights: [
        { label: 'GSTN Portal Filing Hash', status: 'verified', note: 'ARN reference matched against central GST network.' },
        { label: 'Turnover vs Bank Credit Reconciliation', status: 'verified', note: 'Declared turnover matches UPI and bank transaction totals with 2.8% natural variance.' }
      ]
    }
  },

  scanSample(sampleKey) {
    const data = this.sampleTemplates[sampleKey];
    if (!data) return null;
    return {
      ...data,
      scanId: 'ocr_' + Math.random().toString(36).substring(2, 9),
      scannedAt: new Date().toISOString()
    };
  },

  analyzeUploadedFile(fileName, fileSize) {
    // Generate realistic OCR inspection based on file characteristics
    const isSuspect = fileName.toLowerCase().includes('edit') || fileName.toLowerCase().includes('copy') || fileSize > 8000000;
    const tamperScore = isSuspect ? 68 : Math.floor(Math.random() * 12) + 2;
    const status = tamperScore > 40 ? 'tampered' : tamperScore > 20 ? 'suspicious' : 'clean';

    return {
      docType: 'Uploaded Document (' + fileName + ')',
      tamperScore,
      tamperStatus: status,
      scanId: 'ocr_up_' + Math.random().toString(36).substring(2, 9),
      scannedAt: new Date().toISOString(),
      highlights: [
        {
          label: 'Font & Resolution Uniformity',
          status: tamperScore > 40 ? 'flagged' : 'verified',
          note: tamperScore > 40 ? 'Localized pixel density shifts detected around numerical figures.' : 'Typography and compression artifacts are consistent.'
        },
        {
          label: 'Metadata Integrity & EXIF Analysis',
          status: tamperScore > 40 ? 'flagged' : 'verified',
          note: tamperScore > 40 ? 'Multiple PDF modification tags detected without cryptographic signing.' : 'File header matches genuine mobile camera capture.'
        },
        {
          label: 'OCR Text Extracted',
          status: 'verified',
          note: 'Successfully parsed tabular figures and personal identity identifiers.'
        }
      ]
    };
  },

  renderScannerWidget(containerId, onAutoFillCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="ocr-scanner-box">
        <div class="ocr-scanner-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="ocr-icon">📸</div>
            <div>
              <strong style="font-size:15px; color:var(--navy-900);">AI Document OCR &amp; Tampering Inspector</strong>
              <div style="font-size:12.5px; color:var(--text-muted);">Optical verification for Aadhaar, PAN, Bank Passbook &amp; GST documents</div>
            </div>
          </div>
          <span class="badge-pill" style="background:#e6f4ea; color:#137333; font-weight:600; font-size:12px; padding:4px 10px; border-radius:12px;">AI Vision Active</span>
        </div>

        <div style="margin-top:14px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          <span style="font-size:12.5px; font-weight:600; color:var(--text-muted);">Load Demo Sample:</span>
          <button type="button" class="btn btn-outline btn-sm ocr-sample-btn" data-sample="aadhaar_clean">🪪 Clean Aadhaar</button>
          <button type="button" class="btn btn-outline btn-sm ocr-sample-btn" data-sample="pan_clean">🪪 Clean PAN Card</button>
          <button type="button" class="btn btn-outline btn-sm ocr-sample-btn" data-sample="gst_return">📑 Clean GST Return</button>
          <button type="button" class="btn btn-outline btn-sm ocr-sample-btn btn-sample-flagged" data-sample="khata_tampered" style="border-color:var(--danger); color:var(--danger);">⚠️ Forged / Altered Passbook</button>
        </div>

        <div class="ocr-dropzone" id="ocrDropzone">
          <input type="file" id="ocrFileInput" accept="image/*,.pdf" style="display:none;">
          <div style="font-size:24px; margin-bottom:6px;">📤</div>
          <div style="font-weight:600; font-size:13.5px;">Drag &amp; drop document image / PDF, or <span style="color:var(--navy-700); text-decoration:underline; cursor:pointer;" id="ocrBrowseLink">browse files</span></div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Supports PNG, JPG, PDF up to 10MB</div>
        </div>

        <div id="ocrResultArea" style="display:none; margin-top:14px;"></div>
      </div>
    `;

    // Bind event listeners
    const dropzone = container.querySelector('#ocrDropzone');
    const fileInput = container.querySelector('#ocrFileInput');
    const browseLink = container.querySelector('#ocrBrowseLink');
    const resultArea = container.querySelector('#ocrResultArea');

    browseLink.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('click', (e) => {
      if (e.target !== browseLink) fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    container.querySelectorAll('.ocr-sample-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sampleKey = btn.dataset.sample;
        const scanResult = window.DocScanner.scanSample(sampleKey);
        displayResult(scanResult, true);
      });
    });

    function handleFile(file) {
      resultArea.style.display = 'block';
      resultArea.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-muted);">🔍 Running AI Computer Vision &amp; Font Tampering Scan on <strong>${escapeHtml(file.name)}</strong>...</div>`;
      setTimeout(() => {
        const scanResult = window.DocScanner.analyzeUploadedFile(file.name, file.size);
        displayResult(scanResult, false);
      }, 700);
    }

    function displayResult(scan, isSample) {
      resultArea.style.display = 'block';
      const isTampered = scan.tamperStatus === 'tampered' || scan.tamperScore > 40;
      const statusColor = isTampered ? 'var(--danger)' : 'var(--success)';
      const statusBg = isTampered ? '#fdf2f2' : '#f0fdf4';
      const statusBadge = isTampered ? '🚨 TAMPERING DETECTED' : '✅ DOCUMENT VERIFIED GENUINE';

      resultArea.innerHTML = `
        <div class="ocr-result-card" style="background:${statusBg}; border:1px solid ${statusColor}; border-radius:var(--radius-md); padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
            <div>
              <span style="display:inline-block; font-size:12px; font-weight:700; color:${statusColor}; background:rgba(255,255,255,0.8); padding:3px 8px; border-radius:6px; margin-bottom:4px;">
                ${statusBadge}
              </span>
              <h4 style="margin:0 0 2px; font-size:15px; color:var(--navy-900);">${escapeHtml(scan.docType)}</h4>
              <div style="font-size:12px; color:var(--text-muted);">Inspection ID: <code>${scan.scanId}</code> · Scanned at ${new Date(scan.scannedAt).toLocaleTimeString()}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:12px; color:var(--text-muted);">Tampering Risk Index</div>
              <div style="font-size:20px; font-weight:700; color:${statusColor};">${scan.tamperScore}%</div>
            </div>
          </div>

          <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
            ${scan.highlights.map(h => `
              <div style="background:rgba(255,255,255,0.7); padding:8px 12px; border-radius:6px; font-size:12.5px; border-left:3px solid ${h.status === 'flagged' ? 'var(--danger)' : 'var(--success)'};">
                <strong style="color:var(--navy-900);">${escapeHtml(h.label)}:</strong> ${escapeHtml(h.note)}
              </div>
            `).join('')}
          </div>

          ${isSample && scan.name ? `
            <div style="margin-top:14px; padding-top:12px; border-top:1px dashed rgba(0,0,0,0.1); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div style="font-size:12.5px; color:var(--text-muted);">
                Extracted: <strong>${escapeHtml(scan.name)}</strong> · ${escapeHtml(scan.idRef || '')} · ₹${(scan.revenue || 0).toLocaleString('en-IN')}/mo
              </div>
              <button type="button" class="btn btn-primary btn-sm" id="autoFillFieldsBtn">✨ Auto-Fill Form from OCR</button>
            </div>
          ` : ''}
        </div>
      `;

      const autoFillBtn = resultArea.querySelector('#autoFillFieldsBtn');
      if (autoFillBtn && onAutoFillCallback) {
        autoFillBtn.addEventListener('click', () => {
          onAutoFillCallback(scan);
          showToast('Form auto-filled from document OCR!');
        });
      }
    }
  }
};
