// AI Agent Guardrail Analyzer - Enterprise Agentic Edition
// Author: Robert Bumanglag
// Backend: Python CrewAI (FastAPI)

(function() {
    'use strict';

    // Global state
    let analysisResults = null;
    let currentFilter = 'all';

    // DOM elements
    let apiKeyInput, instructionInput, charCount, analyzeBtn;
    let loadingState, errorState, resultsSection;
    let progressBar, progressText;

    // --- CONFIG: Flat UI Colors ---
    const categoryStyles = {
        "security": { gradient: "bg-gradient-to-r from-red-600 to-red-700", badge: "bg-red-50 text-red-700 border-red-200" },
        "security & compliance": { gradient: "bg-gradient-to-r from-red-600 to-red-700", badge: "bg-red-50 text-red-700 border-red-200" },
        "compliance": { gradient: "bg-gradient-to-r from-red-600 to-red-700", badge: "bg-red-50 text-red-700 border-red-200" },
        
        "privacy": { gradient: "bg-gradient-to-r from-emerald-600 to-emerald-700", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        "privacy protection": { gradient: "bg-gradient-to-r from-emerald-600 to-emerald-700", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        
        "scope": { gradient: "bg-gradient-to-r from-blue-600 to-blue-700", badge: "bg-blue-50 text-blue-700 border-blue-200" },
        "scope control": { gradient: "bg-gradient-to-r from-blue-600 to-blue-700", badge: "bg-blue-50 text-blue-700 border-blue-200" },
        
        "ethical": { gradient: "bg-gradient-to-r from-purple-600 to-purple-700", badge: "bg-purple-50 text-purple-700 border-purple-200" },
        "ethical conduct": { gradient: "bg-gradient-to-r from-purple-600 to-purple-700", badge: "bg-purple-50 text-purple-700 border-purple-200" },
        
        "input validation": { gradient: "bg-gradient-to-r from-cyan-600 to-cyan-700", badge: "bg-cyan-50 text-cyan-700 border-cyan-200" },
        "output control": { gradient: "bg-gradient-to-r from-pink-600 to-pink-700", badge: "bg-pink-50 text-pink-700 border-pink-200" },
        
        "default": { gradient: "bg-gradient-to-r from-gray-600 to-gray-700", badge: "bg-gray-50 text-gray-700 border-gray-200" }
    };

    const severityStyles = {
        "Critical": { badge: "bg-red-50 text-red-700 border border-red-200 ring-1 ring-red-600/10" },
        "High": { badge: "bg-orange-50 text-orange-700 border border-orange-200 ring-1 ring-orange-600/10" },
        "Medium": { badge: "bg-yellow-50 text-yellow-700 border border-yellow-200 ring-1 ring-yellow-600/10" },
        "Low": { badge: "bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-600/10" }
    };

    // New styles for Enforcement actions
    const actionStyles = {
        "block": "bg-red-100 text-red-800 border-red-200",
        "mask": "bg-blue-100 text-blue-800 border-blue-200",
        "log": "bg-gray-100 text-gray-800 border-gray-200",
        "human review": "bg-amber-100 text-amber-800 border-amber-200",
        "filter": "bg-purple-100 text-purple-800 border-purple-200",
        "default": "bg-slate-100 text-slate-800 border-slate-200"
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
            if (btnContainer && btnContainer.parentElement && !document.getElementById('aiProfilingToggle')) {
                const toggleDiv = document.createElement('div');
                toggleDiv.className = "mt-4 mb-4 flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100 shadow-sm";
                toggleDiv.innerHTML = `
                    <div class="flex items-center h-5">
                        <input type="checkbox" id="aiProfilingToggle" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer">
                    </div>
                    <div class="ml-2 text-sm">
                        <label for="aiProfilingToggle" class="font-medium text-indigo-900 cursor-pointer">Enable AI-Powered Latency Profiling</label>
                        <p class="text-xs text-indigo-500">Slower analysis, but detects "hidden" complexity (e.g., Semantic vs. Keyword checks)</p>
                    </div>
                `;
                btnContainer.parentElement.insertBefore(toggleDiv, btnContainer);
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
                if (instruction.length > 50000) {
                    showError('Input exceeds safety limits (50k characters). Please shorten your instruction.');
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
            
            if (btn && content) {
                btn.addEventListener('click', () => {
                    content.classList.toggle('hidden');
                    if (content.classList.contains('hidden')) {
                        plus?.classList.remove('hidden');
                        minus?.classList.add('hidden');
                    } else {
                        plus?.classList.add('hidden');
                        minus?.classList.remove('hidden');
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
        try {
            return JSON.parse(clean);
        } catch (e) {
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) {
                try { return JSON.parse(match[0]); } catch (e2) {}
            }
            throw new Error("Could not extract valid JSON from response.");
        }
    }

    // --- REVERTED: REWARD-BASED SCORING ---
    function performGapAnalysis(foundGuardrails) {
        // We look for these "Concepts", allowing for loose matching on names
        const requiredCategories = [
            { id: "security", keywords: ["security", "compliance", "auth", "access"], label: "Critical Security Controls", weight: 2 },
            { id: "privacy", keywords: ["privacy", "data", "pii", "gdpr", "handling"], label: "Privacy & Data Handling", weight: 2 },
            { id: "scope", keywords: ["scope", "boundar", "limit", "capability"], label: "Scope Boundaries", weight: 1.5 },
            { id: "input", keywords: ["input", "validation", "sanitize", "injection"], label: "Input Validation", weight: 1.5 },
            { id: "output", keywords: ["output", "response", "format"], label: "Output Sanitization", weight: 1 },
            { id: "ethical", keywords: ["ethic", "bias", "fairness", "harm"], label: "Ethical Guidelines", weight: 1 },
            { id: "accountability", keywords: ["accountab", "audit", "log", "monitor", "escalat"], label: "Accountability & Logs", weight: 1 }
        ];

        const foundStrings = foundGuardrails.map(g => g.category.toLowerCase() + " " + g.name.toLowerCase());
        
        let totalWeight = 0;
        let currentScore = 0;
        const breakdown = [];

        requiredCategories.forEach(req => {
            totalWeight += req.weight;
            
            // Check if ANY found guardrail matches ANY keyword for this requirement
            const isPresent = foundStrings.some(str => 
                req.keywords.some(keyword => str.includes(keyword))
            );

            if (isPresent) {
                currentScore += req.weight;
                breakdown.push({ label: `Has ${req.label}`, status: 'pass' });
            } else {
                breakdown.push({ label: `Missing ${req.label}`, status: 'fail' });
            }
        });

        const finalScore = Math.round((currentScore / totalWeight) * 100);
        return { score: finalScore, breakdown: breakdown };
    }

    function renderScoreChart(score) {
        let color = '#dc2626'; // Red
        let textColor = 'text-red-700';
        
        if (score >= 80) { color = '#16a34a'; textColor = 'text-green-700'; }
        else if (score >= 50) { color = '#ea580c'; textColor = 'text-orange-700'; }

        const radius = 45; 
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (score / 100) * circumference;

        return `
            <div class="relative flex flex-col items-center justify-center">
                <div class="relative w-28 h-28">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="10"></circle>
                        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${color}" stroke-width="10" 
                                stroke-dasharray="${circumference}" 
                                stroke-dashoffset="${offset}" 
                                stroke-linecap="round"
                                style="transition: stroke-dashoffset 1s ease-in-out;"></circle>
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-3xl font-bold ${textColor}">${score}%</span>
                    </div>
                </div>
                <div class="mt-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Coverage Score
                </div>
            </div>
        `;
    }
  
    async function analyzeInstruction(apiKey, instruction) {
        hideError();
        hideResults();
        showLoading();
    
        try {
            const enableProfiling = document.getElementById('aiProfilingToggle')?.checked || false;
    
            updateProgress(10, enableProfiling ? 'Initializing Full Agent Crew...' : 'Initializing Core Audit Agents...');
    
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    instruction: instruction, 
                    api_key: apiKey,
                    enable_profiling: enableProfiling
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
    
            // Normalization
            if (parsed.guardrails) {
                parsed.guardrails = parsed.guardrails.map(g => ({
                    ...g,
                    severity: g.risk_level || g.severity || "Medium", 
                    mechanism: g.recommendation || g.mechanism || "No recommendation provided.",
                    triggers: Array.isArray(g.triggers) ? g.triggers : [],
                    enforcement: g.enforcement || "Review", // Fallback if missing
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

        const critical = analysisResults.guardrails.filter(g => g.severity?.toLowerCase() === 'critical').length;
        const high = analysisResults.guardrails.filter(g => g.severity?.toLowerCase() === 'high').length;
        const total = analysisResults.guardrails.length;

        document.getElementById('totalGuardrails').textContent = total;
        document.getElementById('criticalCount').textContent = critical;
        document.getElementById('highCount').textContent = high;

        const gapAnalysis = performGapAnalysis(analysisResults.guardrails);
        
        const scoreEl = document.getElementById('coverageScore');
        if (scoreEl) {
            scoreEl.className = 'flex flex-col items-center justify-center py-2 h-full'; 
            scoreEl.innerHTML = renderScoreChart(gapAnalysis.score);
        }

        const breakdownContainer = document.getElementById('recommendations');
        const checklistHTML = `
        <div class="mb-6 bg-white bg-opacity-50 rounded-lg p-4">
            <h4 class="font-bold text-purple-900 mb-3 uppercase text-xs tracking-wider">Gap Analysis</h4>
            <ul class="space-y-2">
                ${gapAnalysis.breakdown.map(item => `
                    <li class="flex items-center gap-3">
                        <span class="${item.status === 'pass' ? 'text-green-600' : 'text-red-500'} text-lg font-bold">
                            ${item.status === 'pass' ? '✅' : '❌'}
                        </span>
                        <span class="text-gray-800 font-medium ${item.status === 'fail' ? 'opacity-75' : ''}">
                            ${escapeHtml(item.label)}
                        </span>
                    </li>
                `).join('')}
            </ul>
        </div>`;

        const recsHTML = `
        <h4 class="font-bold text-purple-900 mb-3 uppercase text-xs tracking-wider">AI Suggestions</h4>
        <ul class="space-y-3">
            ${analysisResults.recommendations.map(rec => `
                <li class="flex items-start gap-3">
                    <span class="text-purple-600 mt-0.5">⚡</span>
                    <span class="text-gray-700 text-sm leading-relaxed">${escapeHtml(rec)}</span>
                </li>
            `).join('')}
        </ul>`;

        breakdownContainer.innerHTML = checklistHTML + recsHTML;

        const categories = ['all', ...new Set(analysisResults.guardrails.map(g => g.category))];
        renderCategoryFilters(categories);
        renderGuardrails(analysisResults.guardrails);

        if (window.latencyProfiler) {
            window.latencyProfiler.analyze(analysisResults.guardrails);
        }

        resultsSection.classList.remove('hidden');
    }

    function renderCategoryFilters(categories) {
        const container = document.getElementById('categoryFilters');
        const counts = {};
        analysisResults.guardrails.forEach(g => { counts[g.category] = (counts[g.category] || 0) + 1; });
        const total = analysisResults.guardrails.length;

        container.innerHTML = categories.map(cat => {
            const count = cat === 'all' ? total : (counts[cat] || 0);
            const isDisabled = count === 0;
            const label = cat === 'all' ? `All Categories (${count})` : `${cat} (${count})`;
            
            return `
            <button onclick="window.guardrailAnalyzer.filterByCategory('${escapeHtml(cat)}')" 
                    ${isDisabled ? 'disabled' : ''}
                    class="px-4 py-2 rounded-lg font-medium transition-all text-sm border ${
                currentFilter === cat 
                    ? 'bg-blue-600 text-white shadow-md border-blue-600' 
                    : isDisabled 
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-transparent' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-sm'
            }">
                ${escapeHtml(label)}
            </button>
        `;
        }).join('');
    }

    function filterByCategory(category) {
        currentFilter = category;
        const filtered = category === 'all' 
            ? analysisResults.guardrails 
            : analysisResults.guardrails.filter(g => g.category === category);
        const categories = ['all', ...new Set(analysisResults.guardrails.map(g => g.category))];
        renderCategoryFilters(categories);
        renderGuardrails(filtered);
    }

    function renderGuardrails(guardrails) {
        const container = document.getElementById('guardrailsDisplay');
        
        if (guardrails.length === 0) {
            container.innerHTML = '<div class="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100"><p class="text-gray-500 text-lg">No guardrails found.</p></div>';
            return;
        }

        container.innerHTML = guardrails.map((g, idx) => {
            const sevStyle = severityStyles[g.severity] || severityStyles["Medium"];
            const catKey = g.category.toLowerCase();
            let styleToUse = categoryStyles["default"];
            for (const key in categoryStyles) {
                if (catKey.includes(key)) {
                    styleToUse = categoryStyles[key];
                    break;
                }
            }
            
            // Resolve Action Style
            const actionKey = (g.enforcement || "default").toLowerCase();
            let actionClass = actionStyles["default"];
            for (const key in actionStyles) {
                if (actionKey.includes(key)) {
                    actionClass = actionStyles[key];
                    break;
                }
            }

            return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden fade-in" style="animation-delay: ${idx * 0.05}s">
                <div class="${styleToUse.gradient} p-5 text-white">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h3 class="text-xl font-bold mb-1">${escapeHtml(g.name)}</h3>
                            <p class="text-white text-opacity-90 text-sm">${escapeHtml(g.description)}</p>
                        </div>
                        <div class="flex flex-col items-end gap-2 ml-4">
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${sevStyle.badge}">
                                ${escapeHtml(g.severity)}
                            </span>
                            <span class="px-2 py-0.5 rounded text-[10px] uppercase font-medium bg-white/20 text-white border border-white/30">
                                ${escapeHtml(g.category)}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Action</h4>
                            </div>
                            <span class="inline-block px-3 py-1 rounded text-xs font-bold border uppercase tracking-wide ${actionClass}">
                                ${escapeHtml(g.enforcement)}
                            </span>
                        </div>

                        <div>
                            <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Mechanism</h4>
                            <div class="pl-3 border-l-4 border-blue-400">
                                <p class="text-sm text-gray-700 leading-relaxed">${escapeHtml(g.mechanism)}</p>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-4">
                        ${g.location ? `
                            <div>
                                <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Detected In Context</h4>
                                <div class="bg-slate-50 border border-slate-200 rounded p-3 text-xs font-mono text-slate-600 italic">
                                    "${escapeHtml(g.location)}"
                                </div>
                            </div>
                        ` : ''}

                        <div>
                            <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Triggers</h4>
                            <ul class="space-y-2">
                                ${g.triggers.map(t => `
                                    <li class="flex items-start gap-2.5">
                                        <svg class="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span class="text-sm text-gray-700 leading-relaxed">${escapeHtml(t)}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // Export PDF Helper
    function exportPdf() {
        const element = document.getElementById('resultsSection');
        if (!element || element.classList.contains('hidden')) {
            alert("No results to export yet.");
            return;
        }
        const btn = document.getElementById('exportPdfBtn');
        const oldText = btn.innerHTML;
        btn.innerHTML = 'Generating...';
        btn.disabled = true;

        const opt = {
            margin: [0.5, 0.5],
            filename: 'Guardrail_Analysis_Report.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        window.html2pdf().set(opt).from(element).save().then(() => {
            btn.innerHTML = oldText;
            btn.disabled = false;
        });
    }

    function exportJson() {
        if (!analysisResults) return;
        const blob = new Blob([JSON.stringify(analysisResults, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'guardrail-analysis.json';
        a.click();
    }

    function exportCsv() {
        if (!analysisResults) return;
        const rows = [
            ["Name", "Category", "Severity", "Enforcement", "Mechanism", "Location"],
            ...analysisResults.guardrails.map(g => [g.name, g.category, g.severity, g.enforcement, g.mechanism, g.location])
        ];
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "guardrail_analysis.csv");
        document.body.appendChild(link);
        link.click();
    }

    function showLoading() { loadingState.classList.remove('hidden'); analyzeBtn.disabled = true; }
    function hideLoading() { loadingState.classList.add('hidden'); analyzeBtn.disabled = false; progressBar.style.width = '0%'; }
    function updateProgress(percent, text) { progressBar.style.width = percent + '%'; progressText.textContent = text; }
    function showError(message) { errorState.classList.remove('hidden'); document.getElementById('errorMessage').textContent = message; if (!message.includes('API key')) setTimeout(hideError, 5000); }
    function hideError() { errorState.classList.add('hidden'); }
    function hideResults() { resultsSection.classList.add('hidden'); }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

    window.guardrailAnalyzer = { filterByCategory: filterByCategory, version: '3.8.0-reward-enforce' };
})();