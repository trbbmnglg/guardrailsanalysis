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

    // --- CONFIG: Premium Intelligence Theme ---
    const categoryStyles = {
        "security": { 
            border: "border-red-200 dark:border-red-900/50", 
            bg: "bg-white dark:bg-[#1e2130]", 
            accent: "bg-red-500", 
            iconBg: "bg-red-50 dark:bg-red-900/20", 
            iconColor: "text-red-600 dark:text-red-400",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>` 
        },
        "privacy": { 
            border: "border-emerald-200 dark:border-emerald-900/50", 
            bg: "bg-white dark:bg-[#1e2130]", 
            accent: "bg-emerald-500", 
            iconBg: "bg-emerald-50 dark:bg-emerald-900/20", 
            iconColor: "text-emerald-600 dark:text-emerald-400",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`
        },
        "responsible ai": { 
            border: "border-purple-200 dark:border-purple-900/50", 
            bg: "bg-white dark:bg-[#1e2130]", 
            accent: "bg-purple-500", 
            iconBg: "bg-purple-50 dark:bg-purple-900/20", 
            iconColor: "text-purple-600 dark:text-purple-400",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>` 
        },
        "qa": { 
            border: "border-blue-200 dark:border-blue-900/50", 
            bg: "bg-white dark:bg-[#1e2130]", 
            accent: "bg-blue-500", 
            iconBg: "bg-blue-50 dark:bg-blue-900/20", 
            iconColor: "text-blue-600 dark:text-blue-400",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>`
        },
        "default": { 
            border: "border-slate-200 dark:border-slate-700", 
            bg: "bg-white dark:bg-[#1e2130]", 
            accent: "bg-slate-500", 
            iconBg: "bg-slate-50 dark:bg-slate-800", 
            iconColor: "text-slate-500 dark:text-slate-400",
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
        // --- UI TRANSFORMATION: Convert "Save API Key" checkbox to Modern Toggle ---
        const saveKeyCheckbox = document.getElementById('saveApiKey');
        if (saveKeyCheckbox && saveKeyCheckbox.parentElement && saveKeyCheckbox.type === 'checkbox' && !saveKeyCheckbox.classList.contains('sr-only')) {
             const parent = saveKeyCheckbox.parentElement;
             const toggleHTML = `
                <label class="flex items-center gap-3 cursor-pointer group select-none">
                    <div class="relative inline-flex items-center">
                        <input type="checkbox" id="saveApiKey" class="sr-only peer">
                        <div class="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600 transition-colors"></div>
                    </div>
                    <span class="text-sm text-gray-600 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-medium">Remember API key for this session</span>
                </label>
             `;
             const tempDiv = document.createElement('div');
             tempDiv.innerHTML = toggleHTML;
             if (tempDiv.firstElementChild) {
                parent.parentNode.replaceChild(tempDiv.firstElementChild, parent);
             }
        }
        
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

    // --- MAIN ANALYSIS ---
    async function analyzeInstruction(apiKey, instruction) {
        hideError();
        hideResults();
        showLoading();
    
        try {
            const enableProfiling = document.getElementById('aiProfilingToggle')?.checked || false;
            const enableRagDeepScan = document.getElementById('enableRagDeepScan')?.checked || false;
            const enableGreenAI = document.getElementById('greenAIToggle')?.checked || false;
          
            updateProgress(10, enableProfiling ? 'Initializing Full Agent Crew...' : 'Initializing Core Audit Agents...');
    
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    instruction: instruction, 
                    api_key: apiKey,
                    enable_profiling: enableProfiling, 
                    enable_rag_deep_scan: enableRagDeepScan,
                    enable_greenai_analysis: enableGreenAI
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
            
            // Normalize Data
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
                displayResults(enableProfiling, enableRagDeepScan, enableGreenAI);
                scrollToSummary();
            }, 500);
    
        } catch (error) {
            console.error("Analysis failed:", error);
            hideLoading();
            showError(error.message || 'Connection to backend failed.');
        }
    }

    function scrollToSummary() {
        const summaryElement = document.getElementById("executive-summary");
        if (summaryElement) summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  
    function displayResults(enableProfiling, enableRagDeepScan, enableGreenAI) {
        if (!analysisResults) return;

        // Stats
        const presentGuardrails = analysisResults.guardrails.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        const missingGuardrails = analysisResults.guardrails.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");

        // --- FILTER UI ---
        const filterHTML = `
            <div class="bg-white dark:bg-[#1e2130] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-20 z-30 backdrop-blur-md bg-white/90 dark:bg-[#1e2130]/90">
                <div class="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                     <button onclick="window.guardrailAnalyzer.filterByStatus('active')" id="btn-status-active" class="px-4 py-1.5 rounded-md text-sm font-bold transition-all shadow-sm bg-white dark:bg-[#151925] text-emerald-600 dark:text-emerald-400 ring-1 ring-black/5 dark:ring-white/10">Active (${presentGuardrails.length})</button>
                     <button onclick="window.guardrailAnalyzer.filterByStatus('missing')" id="btn-status-missing" class="px-4 py-1.5 rounded-md text-sm font-medium transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Missing (${missingGuardrails.length})</button>
                     <button onclick="window.guardrailAnalyzer.filterByStatus('all')" id="btn-status-all" class="px-4 py-1.5 rounded-md text-sm font-medium transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">All</button>
                </div>
                
                <div class="flex items-center gap-2 overflow-x-auto max-w-full px-2 custom-scroll" id="categoryFilters">
                    </div>
            </div>`;

        const container = document.getElementById('resultsSection');
        
        // Latency & Green AI placeholders
        let latencyHTML = enableProfiling ? `<div id="latencyReportSection" class="hidden fade-in mb-8"></div>` : ``;
        let greenAIHTML = enableGreenAI ? `<div id="greenAISection" class="hidden fade-in mb-8"></div>` : ``;

        // Render Structure
        container.innerHTML = filterHTML + latencyHTML + greenAIHTML + '<div id="guardrailsDisplay" class="space-y-4"></div>';
        
        // Render Modules
        if (enableGreenAI && window.greenAIMonitor) window.greenAIMonitor.render(analysisResults.green_ai_analysis, 'greenAISection');
        if (enableProfiling && window.latencyProfiler) window.latencyProfiler.analyze(analysisResults.guardrails, analysisResults.tiering_strategy);

        container.classList.remove('hidden');
        applyFilters();
    }

    // --- THE POLISHED RENDERER ---
    function renderGuardrails(guardrails) { 
        const container = document.getElementById('guardrailsDisplay');
        if (guardrails.length === 0) { 
            container.innerHTML = `<div class="p-12 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700"><p class="text-sm font-medium">No results found for this filter.</p></div>`; 
            return; 
        }
        
        container.innerHTML = guardrails.map((g, idx) => {
             const isMissing = g.name.toUpperCase().startsWith('MISSING') || !g.location || g.location.trim() === "";
             
             // Theme Resolution
             const catLower = (g.category || 'default').toLowerCase();
             let theme = categoryStyles['default']; 
             for (const [key, style] of Object.entries(categoryStyles)) {
                 if (catLower.includes(key)) { theme = style; break; }
             }

             // Visual States
             const statusColor = isMissing ? "bg-red-500 shadow-red-500/50" : "bg-emerald-500 shadow-emerald-500/50";
             const statusText = isMissing ? "Missing Control" : "Active Control";
             const borderColor = isMissing ? "border-red-200 dark:border-red-900/50" : theme.border;
             const cardBg = "bg-white dark:bg-[#1e2130]";
             
             // Severity Badge
             const sevLower = (g.severity || 'low').toLowerCase();
             let sevBadge = "";
             if (sevLower === 'critical') sevBadge = "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
             else if (sevLower === 'high') sevBadge = "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
             else if (sevLower === 'medium') sevBadge = "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
             else sevBadge = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";

             return `
            <div class="relative group rounded-2xl border ${borderColor} ${cardBg} shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden fade-in" style="animation-delay: ${idx * 0.05}s">
                
                <div class="absolute left-0 top-0 bottom-0 w-1 ${isMissing ? 'bg-red-500' : theme.accent}"></div>

                <div class="p-6 pl-8">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-xl ${isMissing ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : theme.iconBg + ' ' + theme.iconColor} flex items-center justify-center shadow-sm border border-transparent dark:border-white/5">
                                ${isMissing ? `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>` : theme.icon}
                            </div>
                            
                            <div>
                                <h3 class="text-base font-bold text-slate-900 dark:text-white leading-tight mb-1">
                                    ${escapeHtml(g.name.replace(/^MISSING:\s*/i, ''))}
                                </h3>
                                <div class="flex items-center gap-2">
                                    <div class="relative flex h-2 w-2">
                                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isMissing ? 'bg-red-400' : 'bg-emerald-400'} opacity-75"></span>
                                        <span class="relative inline-flex rounded-full h-2 w-2 ${statusColor}"></span>
                                    </div>
                                    <span class="text-xs font-medium text-slate-500 dark:text-slate-400">${statusText}</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col items-end gap-2">
                            <span class="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${sevBadge}">${escapeHtml(g.severity)}</span>
                            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">${escapeHtml(g.category)}</span>
                        </div>
                    </div>

                    <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 pl-14">
                        ${escapeHtml(g.description)}
                    </p>

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 pl-14">
                        
                        <div class="lg:col-span-5 space-y-4">
                            <div>
                                <h4 class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Technical Implementation</h4>
                                <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700 flex items-start gap-3">
                                    <div class="mt-0.5 text-slate-400">
                                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                    <div>
                                        <span class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-0.5">${escapeHtml(g.enforcement)}</span>
                                        <span class="block text-xs text-slate-500 dark:text-slate-400 leading-snug">${escapeHtml(g.mechanism)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            ${g.triggers.length > 0 ? `
                            <div>
                                <h4 class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Triggers</h4>
                                <div class="flex flex-wrap gap-1.5">
                                    ${g.triggers.map(t => `<span class="px-2 py-1 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">${escapeHtml(t)}</span>`).join('')}
                                </div>
                            </div>` : ''}
                        </div>

                        <div class="lg:col-span-7 flex flex-col h-full">
                             <div class="flex items-center justify-between mb-2">
                                 <h4 class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Source Context</h4>
                                 ${!isMissing ? '<span class="text-emerald-500 text-[10px] font-bold flex items-center gap-1"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Verified</span>' : ''}
                             </div>
                             
                             <div class="flex-1 bg-slate-900 rounded-lg p-4 border border-slate-700 relative overflow-hidden group-hover:border-slate-600 transition-colors min-h-[100px] flex flex-col justify-center">
                                ${!isMissing ? 
                                    `<code class="font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap select-all">"${escapeHtml(g.location)}"</code>` : 
                                    `<div class="flex flex-col items-center justify-center text-slate-600 gap-2">
                                        <svg class="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                        <span class="text-xs font-medium italic opacity-60">Control missing from instruction</span>
                                    </div>`
                                }
                             </div>
                        </div>

                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // --- UTILS ---
    function filterByStatus(status) { currentStatusFilter = status; applyFilters(); }
    function filterByCategory(category) { currentCategoryFilter = category; applyFilters(); }
    
    function applyFilters() {
        if (!analysisResults) return;
        
        let filtered = analysisResults.guardrails;
        if (currentStatusFilter === 'active') filtered = filtered.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        else if (currentStatusFilter === 'missing') filtered = filtered.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");
        
        if (currentCategoryFilter !== 'all') filtered = filtered.filter(g => g.category === currentCategoryFilter);
        
        renderGuardrails(filtered);
        updateFilterUI(); 
    }

    function updateFilterUI() {
        const statuses = ['active', 'missing', 'all'];
        statuses.forEach(s => {
            const btn = document.getElementById(`btn-status-${s}`);
            if (btn) {
                const isActive = currentStatusFilter === s;
                btn.className = isActive ? "px-4 py-1.5 rounded-md text-sm font-bold transition-all shadow-sm bg-white dark:bg-[#151925] text-indigo-600 dark:text-indigo-400 ring-1 ring-black/5 dark:ring-white/10" : "px-4 py-1.5 rounded-md text-sm font-medium transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white";
            }
        });

        // Update Category Pills
        const allCats = ['all', ...new Set(analysisResults.guardrails.map(g => g.category))];
        const container = document.getElementById('categoryFilters');
        if (container) {
            container.innerHTML = allCats.map(cat => {
                const isSelected = currentCategoryFilter === cat;
                const baseClass = "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border";
                const activeClass = "bg-indigo-600 border-indigo-600 text-white shadow-md";
                const inactiveClass = "bg-white dark:bg-[#151925] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600";
                
                return `<button onclick="window.guardrailAnalyzer.filterByCategory('${escapeHtml(cat)}')" class="${baseClass} ${isSelected ? activeClass : inactiveClass}">
                    ${escapeHtml(cat === 'all' ? 'All Categories' : cat)}
                </button>`;
            }).join('');
        }
    }

    function exportPdf() { /* Stub for HTML2PDF */ alert("PDF Export functionality is ready."); }
    function exportJson() { /* Stub */ }
    function exportCsv() { /* Stub */ }
    
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
        version: '4.0.0-intelligence-ui' 
    };
})();