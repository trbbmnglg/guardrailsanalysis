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
        "responsible ai": { gradient: "bg-gradient-to-r from-purple-600 to-purple-700", badge: "bg-purple-50 text-purple-700 border-purple-200" },
        
        "quality assurance": { gradient: "bg-gradient-to-r from-orange-500 to-orange-600", badge: "bg-orange-50 text-orange-700 border-orange-200" },
        
        "default": { gradient: "bg-gradient-to-r from-gray-600 to-gray-700", badge: "bg-gray-50 text-gray-700 border-gray-200" }
    };

    const severityStyles = {
        "Critical": { badge: "bg-red-50 text-red-700 border border-red-200 ring-1 ring-red-600/10" },
        "High": { badge: "bg-orange-50 text-orange-700 border border-orange-200 ring-1 ring-orange-600/10" },
        "Medium": { badge: "bg-yellow-50 text-yellow-700 border border-yellow-200 ring-1 ring-yellow-600/10" },
        "Low": { badge: "bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-600/10" }
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

        setupEventListeners();
        loadCachedApiKey();
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
        
        // Export Buttons
        document.getElementById('exportPdfBtn')?.addEventListener('click', exportPdf);
        document.getElementById('exportJson')?.addEventListener('click', exportJson);
        document.getElementById('exportCsv')?.addEventListener('click', exportCsv);
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

    // --- ANALYZE FUNCTION ---
    async function analyzeInstruction(apiKey, instruction) {
        hideError();
        hideResults();
        showLoading();

        try {
            updateProgress(10, 'Initializing Agents...');

            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instruction: instruction, api_key: apiKey })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Backend Error: ${response.status}`);
            }

            updateProgress(60, 'Agents are auditing (Security, Privacy, QA)...');
            const data = await response.json();
            
            updateProgress(90, 'Calculating Compute Tiers...');
            if (!data.result) throw new Error("Backend returned empty result.");
            
            let parsed = cleanAndParseJSON(data.result); 

            // --- DATA NORMALIZATION ADAPTER ---
            // Maps Python output (risk_level) to JS expected format (severity)
            if (parsed.guardrails) {
                parsed.guardrails = parsed.guardrails.map(g => ({
                    ...g,
                    severity: g.risk_level || g.severity || "Medium", // Map risk_level to severity
                    mechanism: g.recommendation || g.mechanism || "No recommendation provided.", // Map recommendation to mechanism
                    triggers: g.triggers || [] // Ensure triggers exists
                }));
            }
            
            analysisResults = parsed;

            updateProgress(100, 'Report Ready!');
            
            setTimeout(() => { hideLoading(); displayResults(); }, 500);

        } catch (error) {
            console.error("Analysis failed:", error);
            hideLoading();
            showError(error.message || 'Connection to Python backend failed.');
        }
    }

    // --- DISPLAY LOGIC ---
    function displayResults() {
        if (!analysisResults) return;

        const guardrails = analysisResults.guardrails || [];
        const tiering = analysisResults.tiering_strategy || null;

        // Update Counts
        const critical = guardrails.filter(g => (g.severity || '').toLowerCase() === 'critical').length;
        const high = guardrails.filter(g => (g.severity || '').toLowerCase() === 'high').length;
        
        document.getElementById('totalGuardrails').textContent = guardrails.length;
        document.getElementById('criticalCount').textContent = critical;
        document.getElementById('highCount').textContent = high;

        // Render Tiering Section (New)
        renderTieringSection(tiering);

        // Render Guardrails List
        const categories = ['all', ...new Set(guardrails.map(g => g.category))];
        renderCategoryFilters(categories);
        renderGuardrails(guardrails);

        // Render Score Chart (Simple version)
        const scoreEl = document.getElementById('coverageScore');
        if (scoreEl) {
            // Simple calculation: 100 minus penalty points
            let score = 100 - (critical * 15) - (high * 10);
            if (score < 0) score = 0;
            scoreEl.innerHTML = renderScoreChart(score);
        }

        resultsSection.classList.remove('hidden');
    }

    function renderTieringSection(tiering) {
        // Find or create container
        let container = document.getElementById('tieringSection');
        if (!container) {
            container = document.createElement('div');
            container.id = 'tieringSection';
            container.className = "mb-8 fade-in";
            // Insert after metrics
            const metrics = document.querySelector('.grid.grid-cols-2.gap-4');
            if (metrics) metrics.parentNode.insertBefore(container, metrics.nextSibling);
        }

        if (!tiering) {
            container.innerHTML = '';
            return;
        }

        // Determine color based on Tier
        let tierColor = "bg-blue-50 text-blue-800 border-blue-200";
        if (tiering.selected_tier === "Tier 3") tierColor = "bg-orange-50 text-orange-800 border-orange-200";
        if (tiering.selected_tier === "Tier 4") tierColor = "bg-purple-50 text-purple-800 border-purple-200";

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span>💰</span> Cost & Compute Analysis
                    </h3>
                    <span class="px-3 py-1 rounded-full text-sm font-bold border ${tierColor}">
                        ${escapeHtml(tiering.selected_tier)}
                    </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p class="text-xs text-gray-500 uppercase font-semibold">Model Class</p>
                        <p class="text-lg font-bold text-gray-800">${escapeHtml(tiering.model_class)}</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p class="text-xs text-gray-500 uppercase font-semibold">Est. Cost</p>
                        <p class="text-lg font-bold text-gray-800">${escapeHtml(tiering.estimated_cost)} <span class="text-xs font-normal text-gray-500">/1M tokens</span></p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p class="text-xs text-gray-500 uppercase font-semibold">Latency Impact</p>
                        <p class="text-lg font-bold text-gray-800">${escapeHtml(tiering.latency_impact)}</p>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-100">
                    <p class="text-sm text-gray-600 italic">
                        <span class="font-semibold not-italic text-gray-700">Justification:</span> 
                        ${escapeHtml(tiering.justification)}
                    </p>
                </div>
            </div>
        `;
    }

    function renderScoreChart(score) {
        let color = '#dc2626'; 
        if (score >= 80) color = '#16a34a';
        else if (score >= 50) color = '#ea580c';

        return `
            <div class="relative flex flex-col items-center justify-center h-full">
                <span class="text-4xl font-extrabold" style="color:${color}">${score}%</span>
                <span class="text-xs text-gray-400 uppercase tracking-widest mt-1">Safety Score</span>
            </div>
        `;
    }

    function renderCategoryFilters(categories) {
        const container = document.getElementById('categoryFilters');
        if(!container) return;
        
        container.innerHTML = categories.map(cat => {
            const isSelected = currentFilter === cat;
            return `
            <button onclick="window.guardrailAnalyzer.filterByCategory('${escapeHtml(cat)}')" 
                    class="px-4 py-2 rounded-lg font-medium text-sm border transition-colors ${
                        isSelected 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }">
                ${cat === 'all' ? 'All' : escapeHtml(cat)}
            </button>
        `;
        }).join('');
    }

    function filterByCategory(category) {
        currentFilter = category;
        const allGuardrails = analysisResults.guardrails || [];
        const filtered = category === 'all' 
            ? allGuardrails 
            : allGuardrails.filter(g => g.category === category);
        
        renderGuardrails(filtered);
        renderCategoryFilters(['all', ...new Set(allGuardrails.map(g => g.category))]);
    }

    function renderGuardrails(guardrails) {
        const container = document.getElementById('guardrailsDisplay');
        if (!container) return;

        if (guardrails.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-gray-400">No guardrails found for this category.</div>';
            return;
        }

        container.innerHTML = guardrails.map((g, idx) => {
            // Safety check for category
            const catKey = (g.category || 'default').toLowerCase();
            let styleToUse = categoryStyles["default"];
            
            // Find fuzzy match for style
            Object.keys(categoryStyles).forEach(key => {
                if (catKey.includes(key)) styleToUse = categoryStyles[key];
            });

            const sevKey = g.severity || "Medium";
            const sevStyle = severityStyles[sevKey] || severityStyles["Medium"];

            return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4 fade-in">
                <div class="${styleToUse.gradient} p-4 text-white">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-bold text-lg">${escapeHtml(g.name)}</h3>
                            <p class="text-white/80 text-sm mt-1">${escapeHtml(g.description)}</p>
                        </div>
                        <span class="bg-white/20 px-2 py-1 rounded text-xs font-bold uppercase backdrop-blur-sm border border-white/30">
                            ${escapeHtml(g.category)}
                        </span>
                    </div>
                </div>
                <div class="p-5">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="${sevStyle.badge} px-2 py-1 rounded text-xs font-bold uppercase">
                            ${escapeHtml(sevKey)} Risk
                        </span>
                    </div>
                    
                    <div class="mb-2">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Recommendation</h4>
                        <p class="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                            ${escapeHtml(g.mechanism)}
                        </p>
                    </div>

                    ${g.triggers && g.triggers.length > 0 ? `
                        <div>
                            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Triggers</h4>
                            <div class="flex flex-wrap gap-2">
                                ${g.triggers.map(t => `<span class="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100">${escapeHtml(t)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');
    }

    // Helper: Export functions same as before...
    function exportJson() {
        if (!analysisResults) return;
        const blob = new Blob([JSON.stringify(analysisResults, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'guardrail-analysis.json';
        a.click();
    }
    
    // Stub for PDF/CSV to save space (keep your existing implementation)
    function exportPdf() { alert("PDF Export triggered"); }
    function exportCsv() { alert("CSV Export triggered"); }

    function showLoading() { loadingState.classList.remove('hidden'); analyzeBtn.disabled = true; }
    function hideLoading() { loadingState.classList.add('hidden'); analyzeBtn.disabled = false; progressBar.style.width = '0%'; }
    function updateProgress(percent, text) { progressBar.style.width = percent + '%'; progressText.textContent = text; }
    function showError(message) { errorState.classList.remove('hidden'); document.getElementById('errorMessage').textContent = message; }
    function hideError() { errorState.classList.add('hidden'); }
    function hideResults() { resultsSection.classList.add('hidden'); if(document.getElementById('tieringSection')) document.getElementById('tieringSection').remove(); }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

    window.guardrailAnalyzer = { filterByCategory: filterByCategory, version: '4.0.0-tiering' };
})();