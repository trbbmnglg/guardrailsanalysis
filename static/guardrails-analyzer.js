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
                
                if (!apiKey) {
                    showError('Please enter your HuggingFace API key.');
                    return;
                }
                if (!instruction) {
                    showError('Please enter an agent instruction to analyze.');
                    return;
                }
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
    }

    function renderGuardrails(guardrails) { 
        const container = document.getElementById('guardrailsDisplay');
        if (guardrails.length === 0) { container.innerHTML = `<div class="p-8 text-center text-gray-500">No results found for this filter.</div>`; return; }
        
        container.innerHTML = guardrails.map((g, idx) => {
             const isMissing = g.name.toUpperCase().startsWith('MISSING');
             const sevLower = (g.severity || 'medium').toLowerCase();
             let sevBadgeClass = "bg-blue-50 text-blue-700";
             if (sevLower === 'critical') sevBadgeClass = "bg-red-100 text-red-700";
             else if (sevLower === 'high') sevBadgeClass = "bg-orange-100 text-orange-700";
             else if (sevLower === 'medium') sevBadgeClass = "bg-yellow-100 text-yellow-800";

             return `<div class="p-4 border rounded-lg mb-4 bg-white shadow-sm ${isMissing ? 'border-dashed border-red-200' : 'border-slate-200'}">
                <div class="flex justify-between items-start">
                    <h3 class="font-bold ${isMissing ? 'text-red-700' : 'text-slate-800'}">${escapeHtml(g.name)}</h3>
                    <span class="px-2 py-0.5 text-xs rounded font-bold uppercase ${sevBadgeClass}">${g.severity}</span>
                </div>
                <p class="text-sm text-gray-600 mt-1">${escapeHtml(g.description)}</p>
                <div class="mt-2 text-xs text-gray-400 font-mono">${isMissing ? 'Missing Control' : `"${escapeHtml(g.location)}"`}</div>
             </div>`;
        }).join('');
    }

    function applyFilters() {
        if (!analysisResults) return;
        let filtered = analysisResults.guardrails;
        if (currentStatusFilter === 'active') filtered = filtered.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        else if (currentStatusFilter === 'missing') filtered = filtered.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");
        if (currentSeverityFilter !== 'all') filtered = filtered.filter(g => g.severity?.toLowerCase() === currentSeverityFilter.toLowerCase());
        if (currentCategoryFilter !== 'all') filtered = filtered.filter(g => g.category === currentCategoryFilter);
        renderGuardrails(filtered);
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

    function exportPdf() { /* ... HTML2PDF Logic ... */ }
    function exportJson() {
        if (!analysisResults) return;
        const blob = new Blob([JSON.stringify(analysisResults, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'guardrail-analysis.json'; a.click();
    }
    function exportCsv() { /* ... CSV Logic ... */ }
    
    function showLoading() { loadingState.classList.remove('hidden'); analyzeBtn.disabled = true; }
    function hideLoading() { loadingState.classList.add('hidden'); analyzeBtn.disabled = false; progressBar.style.width = '0%'; }
    function updateProgress(percent, text) { progressBar.style.width = percent + '%'; progressText.textContent = text; }
    function showError(message) { errorState.classList.remove('hidden'); document.getElementById('errorMessage').textContent = message; setTimeout(hideError, 5000); }
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