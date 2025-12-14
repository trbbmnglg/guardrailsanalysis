// AI Agent Guardrail Analyzer - Enterprise Agentic Edition
// Author: Robert Bumanglag
// Backend: Python CrewAI (FastAPI)

(function() {
    'use strict';

    // Global state
    let analysisResults = null;
    let currentCategoryFilter = 'all';
    let currentStatusFilter = 'active'; 
    let currentSeverityFilter = 'all';

    // DOM elements
    let apiKeyInput, instructionInput, charCount, analyzeBtn;
    let loadingState, errorState, resultsSection;
    let progressBar, progressText;

    // --- CONFIG: Flat UI Colors & Icons ---
    const categoryStyles = {
        "responsible ai": { 
            border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-700", 
            accent: "bg-purple-600", iconBg: "bg-purple-100", iconColor: "text-purple-600",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>` 
        },
        "scope control": { 
            border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700", 
            accent: "bg-blue-600", iconBg: "bg-blue-100", iconColor: "text-blue-600",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>`
        },
        "security": { 
            border: "border-red-200", bg: "bg-red-50", text: "text-red-700", 
            accent: "bg-red-600", iconBg: "bg-red-100", iconColor: "text-red-600",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`
        },
        "privacy": { 
            border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", 
            accent: "bg-emerald-600", iconBg: "bg-emerald-100", iconColor: "text-emerald-600",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>`
        },
        "input validation": { 
            border: "border-cyan-200", bg: "bg-cyan-50", text: "text-cyan-700", 
            accent: "bg-cyan-600", iconBg: "bg-cyan-100", iconColor: "text-cyan-600",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>`
        },
        "output control": { 
            border: "border-pink-200", bg: "bg-pink-50", text: "text-pink-700", 
            accent: "bg-pink-600", iconBg: "bg-pink-100", iconColor: "text-pink-600",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>`
        },
        "qa": { 
            border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700", 
            accent: "bg-blue-600", iconBg: "bg-blue-100", iconColor: "text-blue-600",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
        },
        "default": { 
            border: "border-slate-200", bg: "bg-slate-50", text: "text-slate-600", 
            accent: "bg-slate-500", iconBg: "bg-slate-100", iconColor: "text-slate-500",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
        }
    };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function init() {
        apiKeyInput = document.getElementById('apiKey');
        instructionInput = document.getElementById('instructionInput');
        charCount = document.getElementById('charCount');
        analyzeBtn = document.getElementById('analyzeBtn');
        loadingState = document.getElementById('loadingState');
        errorState = document.getElementById('errorState');
        resultsSection = document.getElementById('resultsSection');
        progressBar = document.getElementById('progressBar');
        progressText = document.getElementById('progressText');

        if (analyzeBtn) {
            const btnContainer = analyzeBtn.parentElement; 
            if (btnContainer && btnContainer.parentElement && !document.getElementById('analysisControlsContainer')) {
                const controlsContainer = document.createElement('div');
                controlsContainer.id = 'analysisControlsContainer';
                controlsContainer.className = "mt-6 space-y-3 p-4 border border-gray-100 rounded-lg bg-gray-50";

                controlsContainer.innerHTML = `
                    <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        Advanced Analysis Settings
                    </h3>
                    <label class="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" id="enableRagDeepScan" class="mt-1 rounded text-blue-600 focus:ring-blue-500" checked>
                      <div>
                          <span class="text-sm font-medium text-gray-800">Deep Compliance Scan</span>
                      </div>
                    </label>
                    <label class="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" id="aiProfilingToggle" class="mt-1 rounded text-blue-600 focus:ring-blue-500" checked>
                      <div>
                          <span class="text-sm font-medium text-gray-800">Latency & Cost Profiling</span>
                          <p class="text-xs text-gray-500">Enables the 'Cloud FinOps Architect' agent.</p>
                      </div>
                    </label>
                `;
                btnContainer.parentElement.insertBefore(controlsContainer, btnContainer);
            }
        }

        setupEventListeners();
        loadCachedApiKey();
        setupToggleButtons();
    }

    function setupEventListeners() {
        let debounceTimer;
        if (instructionInput) {
            instructionInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    charCount.textContent = instructionInput.value.length;
                }, 100);
            });
        }

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', async () => {
                const apiKey = apiKeyInput.value.trim();
                const instruction = instructionInput.value.trim();
                if (!apiKey) { showError('Please enter your HuggingFace API key.'); return; }
                if (!instruction) { showError('Please enter an agent instruction to analyze.'); return; }
                await analyzeInstruction(apiKey, instruction);
            });
        }
        
        document.getElementById('exportPdfBtn')?.addEventListener('click', exportPdf);
        document.getElementById('exportJson')?.addEventListener('click', exportJson);
        document.getElementById('exportCsv')?.addEventListener('click', exportCsv);
        
        const clearKeyBtn = document.getElementById('clearApiKey');
        if (clearKeyBtn) {
            clearKeyBtn.addEventListener('click', () => {
                apiKeyInput.value = '';
                sessionStorage.removeItem('hf_api_key');
                showError('API key cleared from memory.');
                setTimeout(hideError, 2000);
            });
        }

        const saveKeyCheckbox = document.getElementById('saveApiKey');
        if (saveKeyCheckbox) {
            saveKeyCheckbox.addEventListener('change', (e) => {
                if (e.target.checked && apiKeyInput.value.trim()) {
                    sessionStorage.setItem('hf_api_key', apiKeyInput.value.trim());
                } else {
                    sessionStorage.removeItem('hf_api_key');
                }
            });
        }
    }

    function setupToggleButtons() {
        const bindToggle = (btnId, contentId, minusId, plusId) => {
            const btn = document.getElementById(btnId);
            const content = document.getElementById(contentId);
            const minus = document.getElementById(minusId);
            const plus = document.getElementById(plusId);
            const subtitle = document.getElementById('apiKeySubtitle');
            const isApiKeyToggle = btnId === 'toggleApiKey';

            if (btn && content) {
                if (isApiKeyToggle) {
                    content.classList.remove('hidden');
                    minus?.classList.remove('hidden');
                    plus?.classList.add('hidden');
                    subtitle?.classList.add('hidden'); 
                } else {
                    content.classList.add('hidden');
                    minus?.classList.add('hidden');
                    plus?.classList.remove('hidden');
                }

                btn.addEventListener('click', () => {
                    content.classList.toggle('hidden');
                    if (content.classList.contains('hidden')) {
                        plus?.classList.remove('hidden');
                        minus?.classList.add('hidden');
                        if (isApiKeyToggle && subtitle) subtitle.classList.remove('hidden'); 
                    } else {
                        plus?.classList.add('hidden');
                        minus?.classList.remove('hidden');
                        if (isApiKeyToggle && subtitle) subtitle.classList.add('hidden'); 
                    }
                });
            }
        };
        bindToggle('toggleApiKey', 'apiKeyContent', 'apiKeyMinusIcon', 'apiKeyPlusIcon');
        bindToggle('toggleHowItWorks', 'howItWorksContent', 'howItWorksMinusIcon', 'howItWorksPlusIcon');
    }

    function loadCachedApiKey() {
        const cachedKey = sessionStorage.getItem('hf_api_key');
        if (cachedKey && apiKeyInput) apiKeyInput.value = cachedKey;
    }

    function cleanAndParseJSON(rawText) {
        let clean = rawText.replace(/```json\s*|\s*```/g, '').trim();
        clean = clean.replace(/```\s*|\s*```/g, '').trim();
        try { return JSON.parse(clean); } catch (e) {
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) { try { return JSON.parse(match[0]); } catch (e2) {} }
            throw new Error("Could not extract valid JSON from response.");
        }
    }

    // GAP ANALYSIS & CONFIDENCE FUNCTIONS
    function performGapAnalysis(foundGuardrails) {
        const expectedDimensions = [
            { id: "security", label: "Security & Compliance", backendCategories: ["Security", "Security & Compliance", "Compliance"], weight: 2.0 },
            { id: "privacy", label: "Privacy & Data Protection", backendCategories: ["Privacy", "Privacy Protection"], weight: 2.0 },
            { id: "responsible_ai", label: "Responsible AI & Ethics", backendCategories: ["Responsible AI", "Ethics", "Ethical", "Ethical Conduct"], weight: 1.5 },
            { id: "scope", label: "Scope Control & Boundaries", backendCategories: ["Scope Control", "Scope"], weight: 1.5 },
            { id: "validation", label: "Input/Output Validation", backendCategories: ["Input Validation", "Output Control", "QA"], weight: 1.5 },
            { id: "oversight", label: "Human Oversight & Monitoring", backendCategories: ["QA", "Oversight", "Monitoring"], weight: 1.0 }
        ];
        const presentGuardrails = foundGuardrails.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location && g.location.trim().length > 0);
        const missingGuardrails = foundGuardrails.filter(g => g.name.toUpperCase().startsWith('MISSING') || !g.location || g.location.trim().length === 0);
        
        let totalPossibleScore = 0; let earnedScore = 0; const breakdown = []; const dimensionDetails = [];

        expectedDimensions.forEach(dimension => {
            totalPossibleScore += dimension.weight;
            const presentInDimension = presentGuardrails.filter(g => dimension.backendCategories.some(cat => g.category.toLowerCase() === cat.toLowerCase()));
            const missingInDimension = missingGuardrails.filter(g => dimension.backendCategories.some(cat => g.category.toLowerCase() === cat.toLowerCase()));
            
            if (presentInDimension.length > 0) {
                earnedScore += dimension.weight;
                breakdown.push({ label: `${dimension.label}`, status: 'pass', weight: dimension.weight, count: presentInDimension.length });
            } else if (missingInDimension.length > 0) {
                breakdown.push({ label: `${dimension.label}`, status: 'fail', weight: dimension.weight, count: missingInDimension.length });
            } else {
                breakdown.push({ label: `${dimension.label} (Not Assessed)`, status: 'neutral', weight: dimension.weight, count: 0 });
            }
            dimensionDetails.push({ dimension: dimension.label, present: presentInDimension.length, missing: missingInDimension.length, covered: presentInDimension.length > 0 });
        });
        
        const finalScore = totalPossibleScore === 0 ? 0 : Math.round((earnedScore / totalPossibleScore) * 100);
        const confidence = calculateAIConfidence(foundGuardrails);
        return { score: finalScore, breakdown: breakdown, confidence: confidence };
    }

    function calculateAIConfidence(guardrails) {
        let confidenceScore = 100; let issues = [];
        const uncategorized = guardrails.filter(g => !g.category || g.category === "default" || g.category.length < 3);
        if (uncategorized.length > 0) { confidenceScore -= Math.min(20, uncategorized.length * 5); issues.push(`${uncategorized.length} uncategorized items`); }
        const weakDescriptions = guardrails.filter(g => !g.description || g.description.length < 20);
        if (weakDescriptions.length > guardrails.length * 0.3) { confidenceScore -= 15; issues.push("Weak descriptions"); }
        return { score: Math.max(0, confidenceScore), level: confidenceScore >= 85 ? "High" : confidenceScore >= 70 ? "Medium" : "Low", issues: issues };
    }

    function renderScoreChart(score, confidence) {
      let color = '#dc2626'; let textColor = 'text-red-700'; let trustTextColor = 'text-red-600'; let trustLevelText = 'High Risk';
      if (score >= 80) { trustTextColor = 'text-green-600'; trustLevelText = 'Low Risk'; color = '#16a34a'; textColor = 'text-green-700'; } 
      else if (score >= 50) { trustTextColor = 'text-yellow-600'; trustLevelText = 'Moderate Risk'; color = '#ea580c'; textColor = 'text-orange-700'; }
        
        const radius = 45; const circumference = 2 * Math.PI * radius; const offset = circumference - (score / 100) * circumference;
        return `
            <div class="relative flex flex-col items-center justify-center">
                <div class="relative w-28 h-28">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="10"></circle>
                        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" style="transition: stroke-dashoffset 1s ease-in-out;"></circle>
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-3xl font-bold ${textColor}">${score}%</span>
                        ${confidence ? `<span class="text-[10px] font-medium ${trustTextColor}">${trustLevelText}</span>` : ''}
                    </div>
                </div>
                <div class="mt-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">Safety Score</div>
            </div>`;
    }

    // --- MAIN ANALYSIS FUNCTION ---
    async function analyzeInstruction(apiKey, instruction) {
        hideError();
        hideResults();
        showLoading();
    
        try {
            const enableProfiling = document.getElementById('aiProfilingToggle')?.checked || false;
            const enableRagDeepScan = document.getElementById('enableRagDeepScan')?.checked || false;
          
            updateProgress(10, enableProfiling ? 'Initializing Full Agent Crew...' : 'Initializing Core Audit Agents...');
    
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    instruction: instruction, 
                    api_key: apiKey,
                    enable_profiling: enableProfiling, 
                    enable_rag_deep_scan: enableRagDeepScan
                })
            });
    
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Backend Error: ${response.status}`);
            }
    
            updateProgress(75, 'Generating Report...');
            const data = await response.json();
            
            if (!data.result) throw new Error("Backend returned empty result.");
            
            let parsed = cleanAndParseJSON(data.result); 
            
            if (parsed.guardrails) {
                parsed.guardrails = parsed.guardrails.map(g => ({
                    ...g,
                    severity: g.risk_level || g.severity || "Medium", 
                    mechanism: g.recommendation || g.mechanism || "No recommendation provided.",
                    triggers: Array.isArray(g.triggers) ? g.triggers : [],
                    enforcement: g.enforcement || "Review", 
                    location: g.location || "" 
                }));
            }
            
            analysisResults = parsed;
            updateProgress(100, 'Report Ready!');
            
            setTimeout(() => { 
                hideLoading(); 
                displayResults(); 
            }, 500);
    
        } catch (error) {
            console.error("Analysis failed:", error);
            hideLoading();
            showError(error.message || 'Connection to backend failed.');
        }
    }
  
    function displayResults() {
        if (!analysisResults) return;

        // 1. Calculate Stats
        const presentGuardrails = analysisResults.guardrails.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        const missingGuardrails = analysisResults.guardrails.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");

        document.getElementById('activeCount').textContent = presentGuardrails.length;
        document.getElementById('missingTotalCount').textContent = missingGuardrails.length;
        document.getElementById('missingCriticalCount').textContent = missingGuardrails.filter(g => g.severity?.toLowerCase() === 'critical').length;
        document.getElementById('missingHighCount').textContent = missingGuardrails.filter(g => g.severity?.toLowerCase() === 'high').length;

        // 2. Score Calculation
        const gapAnalysis = performGapAnalysis(analysisResults.guardrails);
        const scoreEl = document.getElementById('coverageScore');
        if (scoreEl) {
            scoreEl.className = 'flex flex-col items-center justify-center py-2 h-full'; 
            scoreEl.innerHTML = renderScoreChart(gapAnalysis.score, gapAnalysis.confidence);
        }

        // 3. Render Breakdown (Grid)
        const breakdownContainer = document.getElementById('recommendations');
        const checklistHTML = `
            <div class="mb-8">
                <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-3">
                             <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-200 ring-1 ring-indigo-100"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                            Governance Insights
                        </h2>
                        <p class="text-slate-500 mt-1 ml-14">AI-verified compliance gaps and remediation steps</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${gapAnalysis.breakdown.map((item, i) => {
                        const isPass = item.status === 'pass';
                        const isNeutral = item.status === 'neutral';
                        let containerClass = isPass ? "bg-emerald-50/50 border-emerald-100" : isNeutral ? "bg-slate-50 border-slate-100" : "bg-red-50/50 border-red-100";
                        let iconClass = isPass ? "bg-emerald-100 text-emerald-600" : isNeutral ? "bg-slate-200 text-slate-400" : "bg-red-100 text-red-600";
                        let icon = isPass ? `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>` : isNeutral ? `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>` : `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
                        return `<div class="flex items-center gap-4 p-4 rounded-xl border ${containerClass} fade-in" style="animation-delay: ${i * 0.05}s"><div class="h-12 w-12 rounded-lg ${iconClass} flex items-center justify-center flex-shrink-0">${icon}</div><div class="flex-1 min-w-0"><div class="flex items-center justify-between mb-1"><span class="font-bold text-slate-800 text-sm truncate pr-2">${escapeHtml(item.label)}</span><span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isPass ? 'bg-emerald-100 text-emerald-700' : isNeutral ? 'bg-slate-200 text-slate-500' : 'bg-red-100 text-red-700'}">${isPass ? '+' + item.weight + ' PTS' : 'MISSING'}</span></div><div class="text-xs text-slate-500 truncate">${item.count > 0 ? `<span class="font-semibold text-slate-700">${item.count}</span> controls verified` : 'No controls detected'}</div></div></div>`;
                    }).join('')}
                </div>
            </div>`;
        
        const recsHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-8 fade-in">
                 <h2 class="text-xl font-bold text-slate-900 flex items-center gap-3 mb-6">
                    <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></span>
                    Strategic Recommendations
                </h2>
                <div class="space-y-3">
                    ${analysisResults.recommendations.map((rec, i) => `
                        <div class="flex items-start gap-4 p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all duration-200"><div class="flex-shrink-0 mt-0.5"><div class="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm text-xs font-bold text-slate-400">${i + 1}</div></div><div class="flex-1"><p class="text-slate-700 text-sm font-medium leading-relaxed">${escapeHtml(rec)}</p></div></div>
                    `).join('')}
                </div>
            </div>`;
        breakdownContainer.innerHTML = checklistHTML + recsHTML;

        // --- RENDER LATENCY PROFILER (HYBRID MODE) ---
        const latencyContainer = document.getElementById('latencyReportSection');
        
        if (window.latencyProfiler) {
            console.log('📊 Rendering Latency Profiler...');
            
            // EXTRACT TIERING STRATEGY (Backend Overrides)
            // If profiling was ON, this object exists. If OFF, it's null.
            const backendStrategy = analysisResults.tiering_strategy || null;
            
            if (backendStrategy) {
                console.log('⚡ Hybrid Mode: Using Backend Cost Strategy', backendStrategy);
            } else {
                console.log('⚡ Client Mode: Calculating Latency locally');
            }

            // PASS BOTH ARGUMENTS
            window.latencyProfiler.analyze(analysisResults.guardrails, backendStrategy);
            
            latencyContainer.classList.remove('hidden');
        } else {
            console.error('❌ Latency profiler script not loaded!');
        }

        resultsSection.classList.remove('hidden');
        // Initial filter application to render guardrails (and update UI)
        applyFilters();
    }

    function renderGuardrails(guardrails) { 
        const container = document.getElementById('guardrailsDisplay');
        if (guardrails.length === 0) { 
            container.innerHTML = `<div class="p-8 text-center text-gray-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">No results found for this filter.</div>`; 
            return; 
        }
        
        container.innerHTML = guardrails.map((g, idx) => {
             const isMissing = g.name.toUpperCase().startsWith('MISSING') || !g.location || g.location.trim() === "";
             
             // Dynamic Theme Selection
             const catLower = (g.category || 'default').toLowerCase();
             let theme = categoryStyles['default']; // Default fallback
             
             // Partial match strategy for categories
             for (const [key, style] of Object.entries(categoryStyles)) {
                 if (catLower.includes(key)) {
                     theme = style;
                     break;
                 }
             }

             // Visual States
             const cardOpacity = isMissing ? "border-dashed opacity-90" : "";
             const cardBg = isMissing ? "bg-slate-50" : "bg-white";
             const borderColor = isMissing ? "border-red-200" : theme.border;
             const accentColor = isMissing ? "bg-red-400" : theme.accent;
             const nameColor = isMissing ? "text-red-700" : "text-slate-900";

             // Severity Badge Color
             let sevBadgeClass = "bg-slate-100 text-slate-600";
             const sevLower = (g.severity || 'low').toLowerCase();
             if (sevLower === 'critical') sevBadgeClass = "bg-red-100 text-red-700 border-red-200";
             else if (sevLower === 'high') sevBadgeClass = "bg-orange-100 text-orange-700 border-orange-200";
             else if (sevLower === 'medium') sevBadgeClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
             else sevBadgeClass = "bg-green-100 text-green-700 border-green-200";

             return `
            <div class="relative group rounded-xl border ${borderColor} ${cardBg} ${cardOpacity} shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden mb-4 fade-in" style="animation-delay: ${idx * 0.05}s">
                
                <div class="absolute left-0 top-0 bottom-0 w-1.5 ${accentColor}"></div>

                <div class="p-5 pl-7">
                    <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-1">
                                <div class="w-8 h-8 rounded-lg ${isMissing ? 'bg-red-100 text-red-600' : theme.iconBg + ' ' + theme.iconColor} flex items-center justify-center shrink-0">
                                    ${isMissing ? `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>` : theme.icon}
                                </div>
                                <h3 class="text-lg font-bold ${nameColor} leading-tight">
                                    ${escapeHtml(g.name.replace(/^MISSING:\s*/i, ''))}
                                </h3>
                                ${isMissing ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-600 border border-red-200">Missing</span>` : ''}
                            </div>
                            <p class="text-sm text-slate-500 leading-relaxed max-w-3xl ml-11">${escapeHtml(g.description)}</p>
                        </div>
                        
                        <div class="flex items-center gap-2 flex-shrink-0 self-start mt-1">
                            <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${sevBadgeClass}">
                                ${escapeHtml(g.severity)}
                            </span>
                            <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200 bg-white text-slate-500 shadow-sm">
                                ${escapeHtml(g.category)}
                            </span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-100 border-dashed">
                        
                        <div>
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Enforcement Strategy</div>
                            <div class="flex items-start gap-3 mb-3">
                                 <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    ${escapeHtml(g.enforcement || "Review")}
                                </span>
                                <div class="text-sm text-slate-600 leading-snug pt-0.5 pl-2">
                                    ${escapeHtml(g.mechanism)}
                                </div>
                            </div>

                            ${g.triggers && g.triggers.length > 0 ? `
                                <div class="flex flex-wrap gap-2">
                                    ${g.triggers.map(t => `
                                        <span class="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-medium">
                                            ${escapeHtml(t)}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>

                        <div>
                             <div class="flex items-center justify-between mb-2">
                                 <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detected Context</div>
                                 ${!isMissing ? '<span class="text-emerald-600 text-[10px] font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Verified</span>' : ''}
                             </div>
                             
                             <div class="relative bg-slate-50/50 rounded-lg border border-slate-200 p-3 flex-grow min-h-[60px]">
                                ${!isMissing ? `
                                    <div class="font-mono text-xs text-slate-600 leading-relaxed whitespace-pre-wrap select-all">"${escapeHtml(g.location)}"</div>
                                ` : `
                                    <div class="flex items-center justify-center h-full gap-2 py-2">
                                        <svg class="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span class="text-xs italic text-slate-400">Not detected in current instruction set</span>
                                    </div>
                                `}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // --- FILTERS ---
    function applyFilters() {
        if (!analysisResults) return;
        let filtered = analysisResults.guardrails;
        
        // Status Filter
        if (currentStatusFilter === 'active') filtered = filtered.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        else if (currentStatusFilter === 'missing') filtered = filtered.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");
        
        // Severity Filter
        if (currentSeverityFilter !== 'all') filtered = filtered.filter(g => g.severity?.toLowerCase() === currentSeverityFilter.toLowerCase());
        
        // Category Filter
        if (currentCategoryFilter !== 'all') filtered = filtered.filter(g => g.category === currentCategoryFilter);
        
        renderGuardrails(filtered);
        
        // CRITICAL FIX: Update the UI buttons/counts after filtering
        updateFilterUI(); 
    }

    function filterBySummaryCard(type) {
        currentCategoryFilter = 'all'; 
        switch(type) {
            case 'active': currentStatusFilter = 'active'; currentSeverityFilter = 'all'; break;
            case 'missing': currentStatusFilter = 'missing'; currentSeverityFilter = 'all'; break;
            case 'critical': currentStatusFilter = 'missing'; currentSeverityFilter = 'critical'; break;
            case 'high': currentStatusFilter = 'missing'; currentSeverityFilter = 'high'; break;
        }
        applyFilters();
    }

    function filterByStatus(status) { currentStatusFilter = status; currentSeverityFilter = 'all'; applyFilters(); }
    function filterByCategory(category) { currentCategoryFilter = category; applyFilters(); }
    function resetFilters() { currentStatusFilter = 'active'; currentSeverityFilter = 'all'; currentCategoryFilter = 'all'; applyFilters(); }

    // --- UI UPDATES (The Missing Piece) ---
    function updateFilterUI() {
        // 1. Update Status Buttons State
        const statuses = ['active', 'missing', 'all'];
        statuses.forEach(s => {
            const btn = document.getElementById(`btn-status-${s}`);
            if (btn) {
                const isActive = currentStatusFilter === s;
                btn.className = isActive 
                    ? "px-4 py-1.5 rounded-md text-sm font-bold transition-all shadow-sm bg-white text-blue-700 ring-1 ring-black/5"
                    : "px-4 py-1.5 rounded-md text-sm font-medium transition-all text-gray-500 hover:text-gray-900 hover:bg-gray-200/50";
            }
        });

        // 2. Update Filter Badge
        const badge = document.getElementById('activeFilterBadge');
        const badgeText = document.getElementById('activeFilterText');
        if (badge && badgeText) {
            if (currentSeverityFilter !== 'all') {
                badge.classList.remove('hidden');
                badgeText.textContent = `Filtered by: ${currentSeverityFilter.charAt(0).toUpperCase() + currentSeverityFilter.slice(1)}`;
                // Color code the badge based on filter type
                badge.className = currentSeverityFilter === 'critical' 
                    ? 'ml-auto px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-2' 
                    : 'ml-auto px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 flex items-center gap-2';
            } else {
                badge.classList.add('hidden');
            }
        }

        // 3. Render Category Buttons (Dynamic)
        // We calculate counts based on the CURRENT status/severity view so empty categories disappear
        let contextGuardrails = analysisResults.guardrails;
        
        if (currentStatusFilter === 'active') {
            contextGuardrails = contextGuardrails.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        } else if (currentStatusFilter === 'missing') {
            contextGuardrails = contextGuardrails.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");
        }
        
        if (currentSeverityFilter !== 'all') {
            contextGuardrails = contextGuardrails.filter(g => g.severity?.toLowerCase() === currentSeverityFilter.toLowerCase());
        }

        const categories = ['all', ...new Set(contextGuardrails.map(g => g.category))].sort();
        const counts = {};
        contextGuardrails.forEach(g => { counts[g.category] = (counts[g.category] || 0) + 1; });
        const total = contextGuardrails.length;

        const container = document.getElementById('categoryFilters');
        if (container) {
            container.innerHTML = categories.map(cat => {
                const count = cat === 'all' ? total : (counts[cat] || 0);
                if (count === 0 && cat !== 'all') return ''; // Skip empty categories
                
                const label = cat === 'all' ? `All (${count})` : `${cat} (${count})`;
                const isActive = currentCategoryFilter === cat;
                
                return `
                <button onclick="window.guardrailAnalyzer.filterByCategory('${escapeHtml(cat)}')" 
                        class="px-3 py-1.5 rounded-lg font-medium transition-all text-xs border ${
                    isActive 
                        ? 'bg-blue-600 text-white shadow-md border-blue-600' 
                        : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200 shadow-sm'
                }">
                    ${escapeHtml(label)}
                </button>
            `;
            }).join('');
        }
    }

    function exportPdf() { /* ... HTML2PDF ... */ 
        const element = document.getElementById('resultsSection');
        if (!element || element.classList.contains('hidden')) { alert("No results."); return; }
        const btn = document.getElementById('exportPdfBtn');
        const oldText = btn.innerHTML; btn.innerHTML = 'Generating...'; btn.disabled = true;
        const opt = { margin: 0.5, filename: 'Guardrail_Analysis.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } };
        window.html2pdf().set(opt).from(element).save().then(() => { btn.innerHTML = oldText; btn.disabled = false; });
    }
    function exportJson() {
        if (!analysisResults) return;
        const blob = new Blob([JSON.stringify(analysisResults, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'guardrail-analysis.json'; a.click();
    }
    function exportCsv() {
        if (!analysisResults) return;
        const rows = [["Name","Category","Severity","Enforcement","Mechanism","Location"], ...analysisResults.guardrails.map(g => [g.name, g.category, g.severity, g.enforcement, g.mechanism, g.location])];
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "guardrail_analysis.csv"); document.body.appendChild(link); link.click();
    }
    
    function showLoading() { loadingState.classList.remove('hidden'); analyzeBtn.disabled = true; }
    function hideLoading() { loadingState.classList.add('hidden'); analyzeBtn.disabled = false; progressBar.style.width = '0%'; }
    function updateProgress(percent, text) { progressBar.style.width = percent + '%'; progressText.textContent = text; }
    function showError(message) { errorState.classList.remove('hidden'); document.getElementById('errorMessage').textContent = message; if (!message.includes('API key')) setTimeout(hideError, 5000); }
    function hideError() { errorState.classList.add('hidden'); }
    function hideResults() { resultsSection.classList.add('hidden'); }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

    window.guardrailAnalyzer = { 
        filterByCategory: filterByCategory, 
        filterByStatus: filterByStatus,
        filterBySummaryCard: filterBySummaryCard,
        resetFilters: resetFilters
    };
})();