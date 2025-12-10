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
        "Scope Control": { gradient: "bg-gradient-to-r from-blue-600 to-blue-700", badge: "bg-blue-50 text-blue-700 border-blue-200" },
        "Ethical Conduct": { gradient: "bg-gradient-to-r from-purple-600 to-purple-700", badge: "bg-purple-50 text-purple-700 border-purple-200" },
        "Security & Compliance": { gradient: "bg-gradient-to-r from-red-600 to-red-700", badge: "bg-red-50 text-red-700 border-red-200" },
        "Safety Controls": { gradient: "bg-gradient-to-r from-orange-600 to-orange-700", badge: "bg-orange-50 text-orange-700 border-orange-200" },
        "Privacy Protection": { gradient: "bg-gradient-to-r from-emerald-600 to-emerald-700", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        "Quality Assurance": { gradient: "bg-gradient-to-r from-indigo-600 to-indigo-700", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
        "Accountability": { gradient: "bg-gradient-to-r from-gray-600 to-gray-700", badge: "bg-gray-50 text-gray-700 border-gray-200" },
        "Input Validation": { gradient: "bg-gradient-to-r from-cyan-600 to-cyan-700", badge: "bg-cyan-50 text-cyan-700 border-cyan-200" },
        "Output Control": { gradient: "bg-gradient-to-r from-pink-600 to-pink-700", badge: "bg-pink-50 text-pink-700 border-pink-200" },
        "Operational Limits": { gradient: "bg-gradient-to-r from-yellow-600 to-yellow-700", badge: "bg-yellow-50 text-yellow-700 border-yellow-200" }
    };

    const defaultStyle = { gradient: "bg-gradient-to-r from-gray-600 to-gray-700", badge: "bg-gray-50 text-gray-700 border-gray-200" };

    const severityStyles = {
        "Critical": { badge: "bg-red-50 text-red-700 border border-red-200 ring-1 ring-red-600/10" },
        "High": { badge: "bg-orange-50 text-orange-700 border border-orange-200 ring-1 ring-orange-600/10" },
        "Medium": { badge: "bg-yellow-50 text-yellow-700 border border-yellow-200 ring-1 ring-yellow-600/10" },
        "Low": { badge: "bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-600/10" }
    };

    const defaultSeverity = { 
        badge: "bg-gray-50 text-gray-700 border border-gray-200 ring-1 ring-gray-600/10" 
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
                // DoS Prevention
                if (instruction.length > 50000) {
                    showError('Input exceeds safety limits (50k characters). Please shorten your instruction.');
                    return;
                }
                await analyzeInstruction(apiKey, instruction);
            });
        }

        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => {
                const element = document.getElementById('resultsSection');
                if (!element || element.classList.contains('hidden')) {
                    alert("No results to export yet.");
                    return;
                }
                const opt = {
                    margin: [0.5, 0.5],
                    filename: 'Guardrail_Analysis_Report.pdf',
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                };
                const originalBtnText = exportPdfBtn.innerHTML;
                exportPdfBtn.innerHTML = '⏳ Generating...';
                exportPdfBtn.disabled = true;
                window.html2pdf().set(opt).from(element).save().then(() => {
                    exportPdfBtn.innerHTML = originalBtnText;
                    exportPdfBtn.disabled = false;
                });
            });
        }

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

        document.getElementById('exportJson')?.addEventListener('click', exportJson);
        document.getElementById('exportCsv')?.addEventListener('click', exportCsv);
    }

    function setupToggleButtons() {
        const toggleApiKey = document.getElementById('toggleApiKey');
        const apiKeyContent = document.getElementById('apiKeyContent');
        const apiKeyMinusIcon = document.getElementById('apiKeyMinusIcon');
        const apiKeyPlusIcon = document.getElementById('apiKeyPlusIcon');

        if (toggleApiKey && apiKeyContent) {
            toggleApiKey.addEventListener('click', () => {
                apiKeyContent.classList.toggle('hidden');
                const isHidden = apiKeyContent.classList.contains('hidden');
                if (isHidden) {
                    apiKeyPlusIcon?.classList.remove('hidden');
                    apiKeyMinusIcon?.classList.add('hidden');
                } else {
                    apiKeyPlusIcon?.classList.add('hidden');
                    apiKeyMinusIcon?.classList.remove('hidden');
                }
            });
        }

        const toggleHowItWorks = document.getElementById('toggleHowItWorks');
        const howItWorksContent = document.getElementById('howItWorksContent');
        const howItWorksMinusIcon = document.getElementById('howItWorksMinusIcon');
        const howItWorksPlusIcon = document.getElementById('howItWorksPlusIcon');

        if (toggleHowItWorks && howItWorksContent) {
            toggleHowItWorks.addEventListener('click', () => {
                howItWorksContent.classList.toggle('hidden');
                const isHidden = howItWorksContent.classList.contains('hidden');
                if (isHidden) {
                    howItWorksPlusIcon?.classList.remove('hidden');
                    howItWorksMinusIcon?.classList.add('hidden');
                } else {
                    howItWorksPlusIcon?.classList.add('hidden');
                    howItWorksMinusIcon?.classList.remove('hidden');
                }
            });
        }
    }

    function loadCachedApiKey() {
        const cachedKey = sessionStorage.getItem('hf_api_key');
        if (cachedKey && apiKeyInput) apiKeyInput.value = cachedKey;
    }

    // --- NEW: Robust JSON Parser ---
    function cleanAndParseJSON(rawText) {
        // 1. Try stripping markdown code blocks
        let clean = rawText.replace(/```json\s*|\s*```/g, '').trim();
        // 2. Try stripping generic code blocks
        clean = clean.replace(/```\s*|\s*```/g, '').trim();
        
        try {
            return JSON.parse(clean);
        } catch (e) {
            // 3. Fallback: Try identifying the JSON object with regex
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    return JSON.parse(match[0]);
                } catch (e2) {
                    throw new Error("Could not extract valid JSON from response.");
                }
            }
            throw new Error("Model response was not valid JSON.");
        }
    }
    // -------------------------------

    // --- CrewAI Loading Visualization ---
    function simulateLoadingSteps() {
        const steps = [
            "🕵️ [Agent: Security Auditor] Scanning for OWASP/NIST vulnerabilities...",
            "🔒 [Agent: Privacy Validator] Checking for PII & Data Residency risks...",
            "🛡️ [Agent: Controls Specialist] Verifying Scope & Input boundaries...",
            "⚖️ [Agent: Ethics Auditor] Analyzing Fairness & Accountability...",
            "🧪 [Agent: QA Engineer] Running logical consistency checks...",
            "⚡ [Agent: Ops Checker] Simulating infinite loops & token limits...",
            "📝 [Crew Manager] Synthesizing final Guardrail Report..."
        ];
        let stepIndex = 0;
        
        // Clear any existing interval to prevent duplicates
        if (window.loadingInterval) clearInterval(window.loadingInterval);
        
        window.loadingInterval = setInterval(() => {
            const loadingElement = document.getElementById('loadingState');
            if (!loadingElement || loadingElement.classList.contains('hidden')) {
                clearInterval(window.loadingInterval);
                return;
            }
            const progressText = document.getElementById('progressText');
            if (progressText) progressText.textContent = steps[stepIndex];
            stepIndex = (stepIndex + 1) % steps.length;
        }, 1500);
    }
  
    // --- MAIN ANALYSIS FUNCTION (Connects to Python Backend) ---
    async function analyzeInstruction(apiKey, instruction, retries = 2) {
        hideError();
        hideResults();
        showLoading();
        simulateLoadingSteps();

        try {
            updateProgress(10, 'Sending to Python CrewAI Backend...');

            // Fetch from your local FastAPI backend (relative path for Docker/HF Spaces)
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instruction: instruction,
                    api_key: apiKey
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Backend Error: ${response.status}`);
            }

            updateProgress(75, 'CrewAI Agents are processing...');
            
            const data = await response.json();
            
            updateProgress(90, 'Formatting results...');
            
            // The result from CrewAI comes in the 'result' field (stringified JSON)
            // We use our robust parser to handle it
            if (!data.result) throw new Error("Backend returned empty result.");
            
            analysisResults = cleanAndParseJSON(data.result); 
            
            // Pass profiling flag if needed (logic can be handled here or in python)
            const useAiProfiling = document.getElementById('aiProfilingToggle')?.checked;
            analysisResults.aiProfilingEnabled = useAiProfiling;

            updateProgress(100, 'Audit complete!');
            
            if (window.loadingInterval) clearInterval(window.loadingInterval);
            setTimeout(() => { hideLoading(); displayResults(); }, 500);

        } catch (error) {
            console.error("Analysis failed:", error);
            if (window.loadingInterval) clearInterval(window.loadingInterval);
            hideLoading();
            showError(error.message || 'Connection to Python backend failed.');
        }
    }

    function performGapAnalysis(foundGuardrails) {
        const requiredCategories = [
            { key: "Security & Compliance", label: "Critical Security Controls", weight: 2 },
            { key: "Privacy Protection", label: "Privacy & Data Handling", weight: 2 },
            { key: "Scope Control", label: "Scope Boundaries", weight: 1.5 },
            { key: "Input Validation", label: "Input Validation", weight: 1.5 },
            { key: "Output Control", label: "Output Sanitization", weight: 1 },
            { key: "Ethical Conduct", label: "Ethical Guidelines", weight: 1 },
            { key: "Accountability", label: "Escalation Protocols", weight: 1 }
        ];

        const foundCategories = new Set(foundGuardrails.map(g => g.category.toLowerCase().trim()));
        let totalWeight = 0;
        let currentScore = 0;
        const breakdown = [];

        requiredCategories.forEach(req => {
            totalWeight += req.weight;
            if (foundCategories.has(req.key.toLowerCase())) {
                currentScore += req.weight;
                breakdown.push({ label: `Has ${req.label}`, status: 'pass' });
            } else {
                breakdown.push({ label: `Missing ${req.label}`, status: 'fail' });
            }
        });

        const finalScore = Math.round((currentScore / totalWeight) * 100);
        return { score: finalScore, breakdown: breakdown };
    }

    // Helper to Generate BIG Donut Chart
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

    function displayResults() {
        if (!analysisResults) return;

        const critical = analysisResults.guardrails.filter(g => g.severity?.toLowerCase() === 'critical').length;
        const high = analysisResults.guardrails.filter(g => g.severity?.toLowerCase() === 'high').length;
        const total = analysisResults.guardrails.length;

        document.getElementById('totalGuardrails').textContent = total;
        document.getElementById('criticalCount').textContent = critical;
        document.getElementById('highCount').textContent = high;

        // Gap Analysis
        const gapAnalysis = performGapAnalysis(analysisResults.guardrails);
        
        // FIX: Better alignment for Score Card (Flexbox Fix)
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
            const sevStyle = severityStyles[g.severity] || defaultSeverity;
            const catStyle = categoryStyles[g.category] || defaultStyle;
            
            return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden fade-in" style="animation-delay: ${idx * 0.05}s">
                <div class="${catStyle.gradient} p-5 text-white">
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
                            <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Mechanism</h4>
                            <div class="pl-3 border-l-4 border-blue-400">
                                <p class="text-sm text-gray-700 leading-relaxed">${escapeHtml(g.mechanism)}</p>
                            </div>
                        </div>
                        <div>
                            <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Enforcement</h4>
                            <div class="pl-3 border-l-4 border-purple-400">
                                <p class="text-sm text-gray-700 leading-relaxed">${escapeHtml(g.enforcement)}</p>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col h-full justify-between">
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
                        
                        <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end text-xs text-gray-400 gap-1">
                            <span class="font-mono truncate max-w-[200px]" title="${escapeHtml(g.location)}">Line: ${escapeHtml(g.location)}</span>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // ... (Keep Export & UI Helper functions)
    function exportJson() {
        if (!analysisResults) return;
        const blob = new Blob([JSON.stringify(analysisResults, null, 2)], { type: 'application/json' });
        downloadFile(blob, 'guardrail-analysis.json');
    }

    function exportCsv() {
        if (!analysisResults) return;
        const headers = ['Name', 'Category', 'Severity', 'Description', 'Mechanism', 'Triggers', 'Enforcement', 'Location'];
        const rows = analysisResults.guardrails.map(g => [
            g.name, g.category, g.severity, g.description, g.mechanism,
            g.triggers.join('; '), g.enforcement, g.location
        ]);
        
        const escapeCsvField = (field) => {
            if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
        };
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(escapeCsvField).join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        downloadFile(blob, 'guardrail-analysis.csv');
    }

    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function showLoading() { loadingState.classList.remove('hidden'); analyzeBtn.disabled = true; }
    function hideLoading() { loadingState.classList.add('hidden'); analyzeBtn.disabled = false; progressBar.style.width = '0%'; }
    function updateProgress(percent, text) { progressBar.style.width = percent + '%'; progressText.textContent = text; }
    function showError(message) { errorState.classList.remove('hidden'); document.getElementById('errorMessage').textContent = message; if (!message.includes('API key') && !message.includes('required')) { setTimeout(hideError, 5000); } }
    function hideError() { errorState.classList.add('hidden'); }
    function hideResults() { resultsSection.classList.add('hidden'); }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

    window.guardrailAnalyzer = { filterByCategory: filterByCategory, version: '3.3.0-enterprise-agent' };
})();