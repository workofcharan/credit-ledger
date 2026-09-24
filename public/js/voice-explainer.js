/**
 * Multilingual Regional Voice AI Explainer
 * Translates credit decision factors & financial terms into 6 Indian languages
 * with Web Speech API Audio Synthesis for rural Bharat accessibility.
 */

window.VoiceExplainer = {
  currentUtterance: null,
  isPlaying: false,

  languages: {
    en: {
      name: 'English',
      native: 'English',
      voiceCode: 'en-IN',
      translate(ast, res) {
        const band = res?.credit?.band || 'A';
        const score = res?.credit?.score || 0;
        const emi = res?.amortization?.emi || 0;
        const amount = res?.credit?.recommendedAmount || 0;
        const fraudRisk = res?.fraud?.band || 'Low';
        const isApproved = ast?.officer_decision === 'approved' || res?.decision?.autoDecision;

        return {
          title: `Credit Summary for ${ast?.applicant_name || 'Applicant'}`,
          speech: `Hello ${ast?.applicant_name || ''}. Your credit assessment score is ${score} points out of 100, placing your application in Credit Band ${band}. Fraud risk has been verified as ${fraudRisk}. Based on your monthly business cash flow, your recommended loan amount is Rupees ${amount.toLocaleString('en-IN')} with an estimated monthly EMI of Rupees ${emi.toLocaleString('en-IN')}. ${isApproved ? 'Your loan application is approved.' : 'Your application is currently referred for officer review.'}`,
          points: [
            `Credit Score: ${score}/100 (Band ${band} - ${res?.credit?.bandLabel || 'Good'})`,
            `Recommended Sizing: ₹${amount.toLocaleString('en-IN')} @ ${res?.credit?.recommendedRate || 11.5}% interest`,
            `Estimated Monthly EMI: ₹${emi.toLocaleString('en-IN')}`,
            `Fraud Risk Check: ${fraudRisk} Risk Verified`
          ]
        };
      }
    },
    hi: {
      name: 'Hindi',
      native: 'हिन्दी',
      voiceCode: 'hi-IN',
      translate(ast, res) {
        const band = res?.credit?.band || 'A';
        const score = res?.credit?.score || 0;
        const emi = res?.amortization?.emi || 0;
        const amount = res?.credit?.recommendedAmount || 0;
        const fraudRisk = res?.fraud?.band === 'Low' ? 'कम (सुरक्षित)' : res?.fraud?.band === 'Medium' ? 'मध्यम' : 'उच्च जोखिम';
        const isApproved = ast?.officer_decision === 'approved' || res?.decision?.autoDecision;

        return {
          title: `${ast?.applicant_name || 'आवेदक'} के लिए क्रेडिट विवरण`,
          speech: `नमस्ते ${ast?.applicant_name || ''} जी। आपके व्यवसाय और कैश-फ्लो के आधार पर आपका क्रेडिट स्कोर 100 में से ${score} अंक है, जो ग्रेड ${band} में आता है। आपकी धोखाधड़ी जांच ${fraudRisk} पाई गई है। आपके लिए अनुशंसित ऋण राशि ${amount.toLocaleString('en-IN')} रुपये है, जिसकी मासिक किस्त यानी ईएमआई ${emi.toLocaleString('en-IN')} रुपये होगी। ${isApproved ? 'आपका ऋण आवेदन स्वीकृत हो गया है।' : 'आपका आवेदन अधिकारी समीक्षा के लिए रखा गया है।'}`,
          points: [
            `क्रेडिट स्कोर: ${score}/100 (श्रेणी ${band})`,
            `अनुशंसित ऋण राशि: ₹${amount.toLocaleString('en-IN')} (${res?.credit?.recommendedRate || 11.5}% वार्षिक ब्याज दर)`,
            `मासिक ईएमआई: ₹${emi.toLocaleString('en-IN')} प्रति माह`,
            `सुरक्षा जांच: ${fraudRisk}`
          ]
        };
      }
    },
    te: {
      name: 'Telugu',
      native: 'తెలుగు',
      voiceCode: 'te-IN',
      translate(ast, res) {
        const band = res?.credit?.band || 'A';
        const score = res?.credit?.score || 0;
        const emi = res?.amortization?.emi || 0;
        const amount = res?.credit?.recommendedAmount || 0;
        const fraudRisk = res?.fraud?.band === 'Low' ? 'తక్కువ (సురక్షితం)' : 'మధ్యస్థం';
        const isApproved = ast?.officer_decision === 'approved' || res?.decision?.autoDecision;

        return {
          title: `${ast?.applicant_name || 'దరఖాస్తుదారు'} క్రెడిట్ సారాంశం`,
          speech: `నమస్కారం ${ast?.applicant_name || ''} గారు. మీ వ్యాపార లావాదేవీలు మరియు క్యాష్ ఫ్లో ఆధారంగా మీ క్రెడిట్ స్కోర్ 100 కి ${score} పాయింట్లు. ఇది బ్యాండ్ ${band} లో ఉంది. మోసం ప్రమాద తనిఖీ ${fraudRisk} గా నిర్ధారించబడింది. మీ వ్యాపారానికి సిఫార్సు చేయబడిన రుణ మొత్తం రూపాయలు ${amount.toLocaleString('en-IN')}, మరియు నెలవారీ ఈఎంఐ రూపాయలు ${emi.toLocaleString('en-IN')}. ${isApproved ? 'మీ రుణ దరఖాస్తు ఆమోదించబడింది.' : 'మీ దరఖాస్తు అధికారి సమీక్షలో ఉంది.'}`,
          points: [
            `క్రెడిట్ స్కోర్: ${score}/100 (బ్యాండ్ ${band})`,
            `సిఫార్సు చేసిన లోన్ మొత్తం: ₹${amount.toLocaleString('en-IN')} (${res?.credit?.recommendedRate || 11.5}% వడ్డీ రేటు)`,
            `నెలవారీ ఈఎంఐ (EMI): ₹${emi.toLocaleString('en-IN')}`,
            `ధృవీకరణ: ${fraudRisk}`
          ]
        };
      }
    },
    ta: {
      name: 'Tamil',
      native: 'தமிழ்',
      voiceCode: 'ta-IN',
      translate(ast, res) {
        const band = res?.credit?.band || 'A';
        const score = res?.credit?.score || 0;
        const emi = res?.amortization?.emi || 0;
        const amount = res?.credit?.recommendedAmount || 0;

        return {
          title: `${ast?.applicant_name || 'விண்ணப்பதாரர்'} கடன் அறிக்கை`,
          speech: `வணக்கம் ${ast?.applicant_name || ''}. உங்கள் வணிக பணப்புழக்கத்தின் அடிப்படையில் உங்கள் கடன் மதிப்பீடு 100க்கு ${score} புள்ளிகள் ஆகும். உங்கள் பரிந்துரைக்கப்பட்ட கடன் தொகை ரூபாய் ${amount.toLocaleString('en-IN')}, மாத தவணை ரூபாய் ${emi.toLocaleString('en-IN')} ஆகும்.`,
          points: [
            `கடன் மதிப்பீடு: ${score}/100 (பிரிவு ${band})`,
            `பரிந்துரைக்கப்பட்ட கடன்: ₹${amount.toLocaleString('en-IN')}`,
            `மாதாந்திர தவணை (EMI): ₹${emi.toLocaleString('en-IN')}`
          ]
        };
      }
    },
    mr: {
      name: 'Marathi',
      native: 'मराठी',
      voiceCode: 'mr-IN',
      translate(ast, res) {
        const band = res?.credit?.band || 'A';
        const score = res?.credit?.score || 0;
        const emi = res?.amortization?.emi || 0;
        const amount = res?.credit?.recommendedAmount || 0;

        return {
          title: `${ast?.applicant_name || 'अर्जदार'} क्रेडिट अहवाल`,
          speech: `नमस्कार ${ast?.applicant_name || ''}. आपल्या व्यवसायाच्या आधारावर आपला क्रेडिट स्कोअर १०० पैकी ${score} आहे. आपल्यासाठी शिफारस केलेली कर्ज रक्कम ${amount.toLocaleString('en-IN')} रुपये आणि मासिक हप्ता ${emi.toLocaleString('en-IN')} रुपये आहे.`,
          points: [
            `क्रेडिट स्कोअर: ${score}/100 (श्रेणी ${band})`,
            `कर्ज रक्कम: ₹${amount.toLocaleString('en-IN')}`,
            `मासिक हप्ता: ₹${emi.toLocaleString('en-IN')}`
          ]
        };
      }
    },
    bn: {
      name: 'Bengali',
      native: 'বাংলা',
      voiceCode: 'bn-IN',
      translate(ast, res) {
        const band = res?.credit?.band || 'A';
        const score = res?.credit?.score || 0;
        const emi = res?.amortization?.emi || 0;
        const amount = res?.credit?.recommendedAmount || 0;

        return {
          title: `${ast?.applicant_name || 'আবেদনকারী'} ক্রেডিট রিপোর্ট`,
          speech: `নমস্কার ${ast?.applicant_name || ''}। আপনার ব্যবসায়ের উপর ভিত্তি করে আপনার ক্রেডিট স্কোর ১০০ এর মধ্যে ${score}। আপনার জন্য প্রস্তাবিত ঋণের পরিমাণ ${amount.toLocaleString('en-IN')} টাকা এবং মাসিক কিস্তি ${emi.toLocaleString('en-IN')} টাকা।`,
          points: [
            `ক্রেডিট স্কোর: ${score}/100 (ব্যান্ড ${band})`,
            `প্রস্তাবিত ঋণের পরিমাণ: ₹${amount.toLocaleString('en-IN')}`,
            `মাসিক কিস্তি: ₹${emi.toLocaleString('en-IN')}`
          ]
        };
      }
    }
  },

  renderVoiceWidget(containerId, assessment, result) {
    const container = document.getElementById(containerId);
    if (!container || !assessment || !result) return;

    let selectedLang = 'en';

    function updateView() {
      const langConfig = window.VoiceExplainer.languages[selectedLang] || window.VoiceExplainer.languages.en;
      const data = langConfig.translate(assessment, result);

      container.innerHTML = `
        <div class="voice-explainer-card">
          <div class="voice-card-header">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="voice-avatar-icon">🗣️</div>
              <div>
                <strong style="font-size:15px; color:var(--navy-900);">Multilingual Vernacular Audio Assistant (Bharat Voice AI)</strong>
                <div style="font-size:12px; color:var(--text-muted);">Explainable credit findings spoken aloud in native Indian languages</div>
              </div>
            </div>
            
            <div class="lang-pills">
              ${Object.keys(window.VoiceExplainer.languages).map(k => `
                <button type="button" class="lang-pill-btn ${k === selectedLang ? 'active' : ''}" data-lang="${k}">
                  ${window.VoiceExplainer.languages[k].native}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="voice-card-body" style="margin-top:14px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
              <h4 style="margin:0; font-size:15px; color:var(--navy-900); font-family:var(--font-display);">${escapeHtml(data.title)}</h4>
              <div style="display:flex; align-items:center; gap:8px;">
                <button type="button" class="btn btn-primary btn-sm" id="speakAudioBtn">
                  <span id="speakIcon">🔊</span> <span id="speakText">Play Voice Explanation</span>
                </button>
                <button type="button" class="btn btn-outline btn-sm" id="stopAudioBtn" style="display:none;">⏹️ Stop</button>
              </div>
            </div>

            <div style="font-size:13.5px; line-height:1.6; color:var(--text); background:var(--surface-alt); padding:12px 16px; border-radius:8px; border-left:4px solid var(--teal-deep);">
              "${escapeHtml(data.speech)}"
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-top:14px;">
              ${data.points.map(pt => `
                <div style="font-size:12.5px; background:#fff; padding:8px 12px; border:1px solid var(--border); border-radius:6px;">
                  📌 <strong>${escapeHtml(pt)}</strong>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      // Event handlers
      container.querySelectorAll('.lang-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          window.VoiceExplainer.stopSpeech();
          selectedLang = btn.dataset.lang;
          updateView();
        });
      });

      const speakBtn = container.querySelector('#speakAudioBtn');
      const stopBtn = container.querySelector('#stopAudioBtn');
      const speakText = container.querySelector('#speakText');
      const speakIcon = container.querySelector('#speakIcon');

      speakBtn.addEventListener('click', () => {
        if (window.VoiceExplainer.isPlaying) {
          window.VoiceExplainer.stopSpeech();
          speakText.textContent = 'Play Voice Explanation';
          speakIcon.textContent = '🔊';
          stopBtn.style.display = 'none';
        } else {
          window.VoiceExplainer.speak(data.speech, langConfig.voiceCode, () => {
            speakText.textContent = 'Play Voice Explanation';
            speakIcon.textContent = '🔊';
            stopBtn.style.display = 'none';
          });
          speakText.textContent = 'Playing...';
          speakIcon.textContent = '⏸️';
          stopBtn.style.display = 'inline-flex';
        }
      });

      stopBtn.addEventListener('click', () => {
        window.VoiceExplainer.stopSpeech();
        speakText.textContent = 'Play Voice Explanation';
        speakIcon.textContent = '🔊';
        stopBtn.style.display = 'none';
      });
    }

    updateView();
  },

  speak(text, langCode, onEndCallback) {
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis not supported in this browser.', 'warn');
      if (onEndCallback) onEndCallback();
      return;
    }

    this.stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Find best matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang === langCode || v.lang.startsWith(langCode.split('-')[0]));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      this.isPlaying = false;
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = () => {
      this.isPlaying = false;
      if (onEndCallback) onEndCallback();
    };

    this.currentUtterance = utterance;
    this.isPlaying = true;
    window.speechSynthesis.speak(utterance);
  },

  stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
  }
};
