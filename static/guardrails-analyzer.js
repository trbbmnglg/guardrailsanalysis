// static/guardrails-analyzer.js

(function() {
    'use strict';

    // ... [Previous global state and init variables remain the same] ...
    let analysisResults = null;
    let currentFilter = 'all';

    // DOM elements
    let apiKeyInput, instructionInput, charCount, analyzeBtn;
    let loadingState, errorState, resultsSection;
    let progressBar, progressText;

    // --- VISUAL FIX: Modern Flat UI Colors (Replaces Heavy Gradients) ---
    // We switch from 'gradient' keys to 'border' and 'text' keys for a cleaner look
    const categoryStyles = {
        "security": { border: "border-red-500", bg: "bg-red-50", text: "text-red-700", icon: "🛡️" },
        "privacy": { border: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", icon: "🔒" },
        "responsible ai": { border: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", icon: "⚖️" },
        "qa": { border: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700", icon: "🧪" },
        "default": { border: "border-gray-400", bg: "bg-gray-50", text: "text-gray-700", icon: "📋" }
    };

    const severityStyles = {
        "Critical": { badge: "bg-red-100 text-red-800 border-red-200 ring-red-500/20", icon: "🚨" },
        "High": { badge: "bg-orange-100 text-orange-800 border-orange-200 ring-orange-500/20", icon: "🔥" },
        "Medium": { badge: "bg-yellow-100 text-yellow-800 border-yellow-200 ring-yellow-500/20", icon: "⚠️" },
        "Low": { badge: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20", icon: "ℹ️" }
    };

    const actionStyles = {
        "block": "bg-red-50 text-red-700 border-red-200",
        "mask": "bg-blue-50 text-blue-700 border-blue-200",
        "log": "bg-gray-50 text-gray-700 border-gray-200",
        "human review": "bg-amber-50 text-amber-700 border-amber-200",
        "filter": "bg-purple-50 text-purple-700 border-purple-200",
        "default": "bg-slate-50 text-slate-700 border-slate-200"
    };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ... [init, setupEventListeners, setupToggleButtons functions remain the same] ...
    
    function init() {
        // [Existing init logic]
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
        setupToggleButtons();
    }

    // ... [setupEventListeners, loadCachedApiKey, cleanAndParseJSON remain the same] ...
    function setupEventListeners() {
        // [Existing event listener logic]
        if (instructionInput) {
            instructionInput.addEventListener('input', () => {
                 charCount.textContent = instructionInput.value.length;
            });
        }
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', async () => {
                 // [Existing logic]
                 await analyzeInstruction(apiKeyInput.value.trim(), instructionInput.value.trim());
            });
        }
        // [Existing export logic]
         document.getElementById('exportJson')?.addEventListener('click', exportJson);
    }
    
    function setupToggleButtons() {
         // [Existing toggle logic]
         const bindToggle = (btnId, contentId, minusId, plusId) => {
            const btn = document.getElementById(btnId);
            const content = document.getElementById(contentId);
            if(btn && content) {
                btn.addEventListener('click', () => content.classList.toggle('hidden'));
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
        try { return JSON.parse(clean); } catch(e) { return {}; }
    }


    // ... [performGapAnalysis, renderScoreChart, analyzeInstruction, displayResults remain the same] ...
    
    // Gap Analysis (Keep existing logic)
    function performGapAnalysis(foundGuardrails) {
        // [Existing logic]
        return { score: 85, breakdown: [] }; // Placeholder for brevity, use original logic
    }
    
    function renderScoreChart(score) {
         // [Existing logic]
         return `<div>${score}%</div>`;
    }

    async function analyzeInstruction(apiKey, instruction) {
        // [Existing logic calling /analyze]
        // ...
        // displayResults();
    }
    
    function displayResults() {
        if (!analysisResults) return;
        
        // ... [Existing counter logic] ...

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
        container.innerHTML = categories.map(cat => {
            const isActive = currentFilter === cat;
            return `
            <button onclick="window.guardrailAnalyzer.filterByCategory('${escapeHtml(cat)}')" 
                    class="px-4 py-2 rounded-full font-medium transition-all text-sm border ${
                isActive 
                    ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-slate-200'
            }">
                ${cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
        `;
        }).join('');
    }
    
    function filterByCategory(cat) {
        currentFilter = cat;
        // [Existing filter logic]
    }

    // --- VISUAL FIX: COMPLETELY REDESIGNED RENDER FUNCTION ---
    function renderGuardrails(guardrails) {
        const container = document.getElementById('guardrailsDisplay');
        
        if (guardrails.length === 0) {
            container.innerHTML = '<div class="bg-white rounded-xl shadow-sm p-12 text-center border border-dashed border-gray-300"><p class="text-gray-500">No guardrails found.</p></div>';
            return;
        }

        container.innerHTML = guardrails.map((g, idx) => {
            // Determine Style
            const sevStyle = severityStyles[g.severity] || severityStyles["Medium"];
            let catStyle = categoryStyles["default"];
            
            // Fuzzy match category
            const catLower = g.category.toLowerCase();
            if (catLower.includes("security")) catStyle = categoryStyles["security"];
            else if (catLower.includes("privacy")) catStyle = categoryStyles["privacy"];
            else if (catLower.includes("responsible") || catLower.includes("ethic")) catStyle = categoryStyles["responsible ai"];
            else if (catLower.includes("qa") || catLower.includes("quality")) catStyle = categoryStyles["qa"];

            // Determine Action Style
            const actionKey = (g.enforcement || "default").toLowerCase();
            let actionClass = actionStyles["default"];
            for (const key in actionStyles) {
                if (actionKey.includes(key)) {
                    actionClass = actionStyles[key];
                    break;
                }
            }

            // New Layout: White card, Colored Top Border, Clean Typography
            return `
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300 fade-in group relative" style="animation-delay: ${idx * 0.05}s">
                
                <div class="absolute left-0 top-0 bottom-0 w-1.5 ${catStyle.bg.replace('bg-', 'bg-').replace('50', '500')}"></div>

                <div class="p-6 pl-8">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1 pr-4">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-lg">${catStyle.icon}</span>
                                <h3 class="text-lg font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">
                                    ${escapeHtml(g.name)}
                                </h3>
                            </div>
                            <p class="text-slate-600 text-sm leading-relaxed">${escapeHtml(g.description)}</p>
                        </div>
                        
                        <div class="flex flex-col items-end gap-2 shrink-0">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider shadow-sm ring-1 ring-inset ${sevStyle.badge}">
                                ${sevStyle.icon} ${escapeHtml(g.severity)}
                            </span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase text-slate-500 border border-slate-100 bg-slate-50">
                                ${escapeHtml(g.category)}
                            </span>
                        </div>
                    </div>

                    <div class="h-px bg-slate-100 my-4"></div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div class="space-y-3">
                            <div>
                                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Implementation Mechanism</h4>
                                <div class="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                    <p class="text-xs font-mono text-slate-700 break-words">${escapeHtml(g.mechanism)}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enforcement:</h4>
                                <span class="px-2 py-0.5 rounded text-xs font-bold border ${actionClass}">
                                    ${escapeHtml(g.enforcement)}
                                </span>
                            </div>
                        </div>

                        <div class="space-y-3">
                            ${g.location ? `
                                <div>
                                    <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Found In Context</h4>
                                    <div class="relative pl-3">
                                        <div class="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-200"></div>
                                        <p class="text-xs text-slate-500 italic line-clamp-2">"${escapeHtml(g.location)}"</p>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div>
                                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Triggers</h4>
                                <div class="flex flex-wrap gap-1.5">
                                    ${g.triggers.map(t => `
                                        <span class="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 font-mono">
                                            ${escapeHtml(t)}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // ... [Export functions and boilerplate remain the same] ...
    
    // [Manual re-attach exports]
    window.guardrailAnalyzer = { filterByCategory: filterByCategory, version: '3.9.0-clean-ui' };
    
    // Check for window load to init
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

})();