// AI Agent Guardrail Analyzer - Enterprise Agentic Edition
// Author: Robert Bumanglag
// Backend: Python CrewAI (FastAPI)

(function() {
    'use strict';

    // Global state
    let analysisResults = null;
    let currentCategoryFilter = 'all';
    let currentStatusFilter = 'active'; 

    // DOM elements
    let apiKeyInput, instructionInput, charCount, analyzeBtn;
    let loadingState, errorState, resultsSection;
    let progressBar, progressText;

    // --- CONFIG: Premium Aesthetics ---
    const CATEGORY_THEMES = {
        "security": { 
            bg: "from-red-50 to-white dark:from-red-900/20 dark:to-[#1e2130]",
            text: "text-red-600 dark:text-red-400",
            border: "group-hover:border-red-200 dark:group-hover:border-red-800",
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>`
        },
        "privacy": { 
            bg: "from-emerald-50 to-white dark:from-emerald-900/20 dark:to-[#1e2130]",
            text: "text-emerald-600 dark:text-emerald-400",
            border: "group-hover:border-emerald-200 dark:group-hover:border-emerald-800",
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`
        },
        "responsible ai": { 
            bg: "from-purple-50 to-white dark:from-purple-900/20 dark:to-[#1e2130]",
            text: "text-purple-600 dark:text-purple-400",
            border: "group-hover:border-purple-200 dark:group-hover:border-purple-800",
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>`
        },
        "qa": { 
            bg: "from-blue-50 to-white dark:from-blue-900/20 dark:to-[#1e2130]",
            text: "text-blue-600 dark:text-blue-400",
            border: "group-hover:border-blue-200 dark:group-hover:border-blue-800",
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>`
        },
        "default": { 
            bg: "from-slate-50 to-white dark:from-slate-800/30 dark:to-[#1e2130]",
            text: "text-slate-500 dark:text-slate-400",
            border: "group-hover:border-slate-300 dark:group-hover:border-slate-600",
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>`
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

        setupEventListeners();
        loadCachedApiKey();
        
        // Fix for toggle checkbox UI
        const saveKeyCheckbox = document.getElementById('saveApiKey');
        if (saveKeyCheckbox && saveKeyCheckbox.parentElement && saveKeyCheckbox.type === 'checkbox' && !saveKeyCheckbox.classList.contains('sr-only')) {
             const parent = saveKeyCheckbox.parentElement;
             const toggleHTML = `<label class="flex items-center gap-3 cursor-pointer group select-none"><div class="relative inline-flex items-center"><input type="checkbox" id="saveApiKey" class="sr-only peer"><div class="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 transition-colors"></div></div><span class="text-sm text-gray-600 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-medium">Remember API key</span></label>`;
             const tempDiv = document.createElement('div'); tempDiv.innerHTML = toggleHTML;
             if (tempDiv.firstElementChild) parent.parentNode.replaceChild(tempDiv.firstElementChild, parent);
        }
    }

    function setupEventListeners() {
        if (instructionInput) instructionInput.addEventListener('input', () => charCount.textContent = instructionInput.value.length);
        if (analyzeBtn) analyzeBtn.addEventListener('click', async () => {
            if (!apiKeyInput.value.trim()) { showError('Please enter your HuggingFace API key.'); return; }
            if (!instructionInput.value.trim()) { showError('Please enter an instruction.'); return; }
            await analyzeInstruction(apiKeyInput.value.trim(), instructionInput.value.trim());
        });
        document.getElementById('exportPdfBtn')?.addEventListener('click', exportPdf);
        document.getElementById('exportJson')?.addEventListener('click', () => { if(analysisResults) saveAsJson(analysisResults); });
    }

    function saveAsJson(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'guardrails.json'; a.click();
    }
    
    function loadCachedApiKey() {
        const cachedKey = sessionStorage.getItem('hf_api_key');
        if (cachedKey && apiKeyInput) apiKeyInput.value = cachedKey;
    }

    function cleanAndParseJSON(rawText) {
        let clean = rawText.replace(/```json\s*|\s*```/g, '').trim();
        try { return JSON.parse(clean); } catch (e) {
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) { try { return JSON.parse(match[0]); } catch (e2) {} }
            throw new Error("Could not extract valid JSON.");
        }
    }

    // --- GAP ANALYSIS ENGINE ---
    function performGapAnalysis(foundGuardrails) {
        const expectedDimensions = [
            { id: "security", weight: 2.0, categories: ["Security", "Compliance"] },
            { id: "privacy", weight: 2.0, categories: ["Privacy"] },
            { id: "rai", weight: 1.5, categories: ["Responsible AI", "Ethics"] },
            { id: "validation", weight: 1.5, categories: ["Input Validation", "Output Control", "QA"] }
        ];
        
        let totalPossible = 0; 
        let earned = 0;
        const present = foundGuardrails.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location);

        expectedDimensions.forEach(dim => {
            totalPossible += dim.weight;
            const hasCoverage = present.some(g => dim.categories.some(c => g.category.toLowerCase().includes(c.toLowerCase())));
            if (hasCoverage) earned += dim.weight;
        });

        const score = totalPossible === 0 ? 0 : Math.round((earned / totalPossible) * 100);
        return { score };
    }

    // --- MAIN ANALYSIS ---
    async function analyzeInstruction(apiKey, instruction) {
        hideError(); hideResults(); showLoading();
    
        try {
            const enableProfiling = document.getElementById('aiProfilingToggle')?.checked || false;
            const enableRagDeepScan = document.getElementById('enableRagDeepScan')?.checked || false;
            const enableGreenAI = document.getElementById('greenAIToggle')?.checked || false;
          
            updateProgress(10, 'Initializing Analysis Crew...');
    
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
    
            if (!response.ok) throw new Error(`Backend Error: ${response.status}`);
            const data = await response.json();
            if (!data.result) throw new Error("Empty result.");
            
            let parsed = cleanAndParseJSON(data.result); 
            if (parsed.guardrails) {
                parsed.guardrails = parsed.guardrails.map(g => ({
                    ...g,
                    severity: g.risk_level || g.severity || "Medium", 
                    mechanism: g.recommendation || g.mechanism || "Standard check",
                    triggers: Array.isArray(g.triggers) ? g.triggers : [],
                    enforcement: g.enforcement || "Review", 
                    location: g.location || "" 
                }));
            }
            
            analysisResults = parsed;
            updateProgress(100, 'Done!');
            
            setTimeout(() => { 
                hideLoading(); 
                displayResults(enableProfiling, enableGreenAI);
                scrollToSummary();
            }, 500);
    
        } catch (error) {
            hideLoading(); showError(error.message);
        }
    }

    function scrollToSummary() { 
        const el = document.getElementById("executive-summary");
        if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
    }
  
    // --- DISPLAY ENGINE ---
    function displayResults(enableProfiling, enableGreenAI) {
        if (!analysisResults) return;

        const container = document.getElementById('resultsSection');
        
        // 1. Calculate Stats
        const gapData = performGapAnalysis(analysisResults.guardrails);
        const presentGuardrails = analysisResults.guardrails.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        const missingGuardrails = analysisResults.guardrails.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");

        // 2. Render Executive Summary (Bio-Cards)
        const summaryHTML = `
        <div id="executive-summary" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 fade-in">
            <div class="relative group bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-900/20 dark:to-[#1e2130] rounded-[2rem] border border-white/50 dark:border-slate-700 shadow-lg p-6 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
                <div class="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                <div class="flex items-center justify-between mb-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white">Score</span>
                    <svg class="w-6 h-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div class="text-center py-4">
                    <div class="text-7xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter drop-shadow-sm mb-2">${gapData.score}</div>
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Safety Rating</p>
                </div>
            </div>

            <div onclick="window.guardrailAnalyzer.filterByStatus('active')" class="cursor-pointer relative group bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-900/20 dark:to-[#1e2130] rounded-[2rem] border border-white/50 dark:border-slate-700 shadow-lg p-6 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200 dark:hover:border-emerald-800">
                <div class="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                <div class="flex items-center justify-between mb-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white">Active</span>
                    <svg class="w-6 h-6 text-emerald-300 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04C2.32 10.25 5.253 17.5 12 21.056c6.747-3.556 9.68-10.806 8.618-15.072z" /></svg>
                </div>
                <div class="text-center py-4">
                    <div class="text-7xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter drop-shadow-sm mb-2">${presentGuardrails.length}</div>
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Active Controls</p>
                </div>
            </div>

            <div onclick="window.guardrailAnalyzer.filterByStatus('missing')" class="cursor-pointer relative group bg-gradient-to-b from-red-50 to-white dark:from-red-900/20 dark:to-[#1e2130] rounded-[2rem] border border-white/50 dark:border-slate-700 shadow-lg p-6 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 hover:border-red-200 dark:hover:border-red-800">
                <div class="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                <div class="flex items-center justify-between mb-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500 text-white">Risks</span>
                    <svg class="w-6 h-6 text-red-300 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div class="text-center py-4">
                    <div class="text-7xl font-black text-red-500 dark:text-red-400 tracking-tighter drop-shadow-sm mb-2">${missingGuardrails.length}</div>
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Missing Guards</p>
                </div>
            </div>
        </div>`;

        // 3. UNIFIED PERFORMANCE DASHBOARD ROW
        // Creates a seamless 3-column grid for Latency | Green AI | Waterfall
        let performanceRowHTML = '';
        if (enableProfiling) {
            performanceRowHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12 fade-in">
                <div id="slot-latency-engine" class="${enableGreenAI ? 'lg:col-span-4 xl:col-span-3' : 'lg:col-span-4'} h-full"></div>

                ${enableGreenAI ? `<div id="slot-green-ai" class="lg:col-span-4 xl:col-span-3 h-full"></div>` : ''}

                <div id="slot-latency-waterfall" class="${enableGreenAI ? 'lg:col-span-4 xl:col-span-6' : 'lg:col-span-8'} h-full"></div>
            </div>`;
        } else if (enableGreenAI) {
            // Fallback: If only Green AI is on, center it
            performanceRowHTML = `<div id="slot-green-ai" class="max-w-md mx-auto mb-12 fade-in h-96"></div>`;
        }

        // 4. Category Filter Bar
        const filterHTML = `
            <div class="sticky top-0 z-40 bg-slate-50/90 dark:bg-[#0f111a]/90 backdrop-blur-md py-4 mb-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 overflow-x-auto custom-scroll px-2" id="categoryFilters">
                </div>`;

        // 5. Build Final Layout
        container.innerHTML = summaryHTML + performanceRowHTML + filterHTML + '<div id="guardrailsDisplay" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20"></div>';

        // 6. Initialize Modules into specific slots
        if (enableGreenAI && window.greenAIMonitor) {
            window.greenAIMonitor.render(analysisResults.green_ai_analysis, 'slot-green-ai');
        }
        
        if (enableProfiling && window.latencyProfiler) {
            // Render Latency components into their split slots
            window.latencyProfiler.analyze(
                analysisResults.guardrails, 
                analysisResults.tiering_strategy,
                { engine: 'slot-latency-engine', waterfall: 'slot-latency-waterfall' }
            );
        }

        container.classList.remove('hidden');
        applyFilters();
    }

    // --- CARD RENDERER (Vertical Bio-Card) ---
    function renderGuardrails(guardrails) { 
        const container = document.getElementById('guardrailsDisplay');
        if (guardrails.length === 0) { 
            container.innerHTML = `<div class="col-span-3 p-12 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">No results found.</div>`; 
            return; 
        }
        
        container.innerHTML = guardrails.map((g, idx) => {
             const isMissing = g.name.toUpperCase().startsWith('MISSING') || !g.location || g.location.trim() === "";
             
             // Theme
             const catLower = (g.category || 'default').toLowerCase();
             let theme = CATEGORY_THEMES['default']; 
             for (const [key, style] of Object.entries(CATEGORY_THEMES)) {
                 if (catLower.includes(key)) { theme = style; break; }
             }

             const badgeClass = isMissing ? "bg-red-500 shadow-red-200 dark:shadow-none" : "bg-emerald-500 shadow-emerald-200 dark:shadow-none";
             const statusText = isMissing ? "MISSING" : "ACTIVE";
             
             return `
            <div class="relative group bg-gradient-to-b ${theme.bg} rounded-[2rem] shadow-sm border border-white/50 dark:border-slate-700 overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-2 ${theme.border} fade-in" style="animation-delay: ${idx * 0.05}s">
                
                <div class="absolute top-5 left-5 z-20">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-md ${badgeClass}">
                        ${statusText}
                    </span>
                </div>
                
                <div class="absolute top-5 right-5 z-20">
                    <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">${escapeHtml(g.severity)}</span>
                </div>

                <div class="p-8 pb-10 flex flex-col items-center text-center relative z-10 h-full">
                    
                    <div class="w-20 h-20 mb-6 ${theme.text} transition-transform duration-500 group-hover:scale-110 drop-shadow-sm opacity-90">
                        ${theme.icon}
                    </div>

                    <h3 class="text-lg font-black text-slate-800 dark:text-white leading-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        ${escapeHtml(g.name.replace(/^MISSING:\s*/i, ''))}
                    </h3>
                    
                    <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                        ${escapeHtml(g.category)}
                    </p>

                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        ${escapeHtml(g.description)}
                    </p>
                </div>

                <div class="absolute inset-x-0 bottom-0 z-30 transform translate-y-[105%] transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) group-hover:translate-y-0">
                    <div class="bg-white/95 dark:bg-[#151925]/95 backdrop-blur-xl border-t border-indigo-100 dark:border-slate-700 p-6 rounded-t-[2rem] shadow-2xl h-full flex flex-col">
                        
                        <div class="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 shrink-0"></div>

                        <div class="overflow-y-auto custom-scroll pr-1 space-y-4 text-left">
                            <div>
                                <h4 class="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1">Mechanism</h4>
                                <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                                    ${escapeHtml(g.mechanism)}
                                </div>
                            </div>

                            <div>
                                <h4 class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Context</h4>
                                ${!isMissing ? 
                                    `<div class="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 font-mono text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 leading-relaxed break-words">"${escapeHtml(g.location)}"</div>` 
                                    : 
                                    `<div class="text-xs italic text-slate-400">Not detected in prompt</div>`
                                }
                            </div>

                            <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                                <span class="text-[10px] font-bold text-slate-400 uppercase">Action</span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${escapeHtml(g.enforcement)}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>`;
        }).join('');
    }

    // --- FILTERS & UI ---
    function filterByStatus(status) { currentStatusFilter = status; applyFilters(); }
    function filterByCategory(category) { currentCategoryFilter = category; applyFilters(); }
    
    function applyFilters() {
        if (!analysisResults) return;
        let filtered = analysisResults.guardrails;
        if (currentStatusFilter === 'active') filtered = filtered.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        else if (currentStatusFilter === 'missing') filtered = filtered.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");
        if (currentCategoryFilter !== 'all') filtered = filtered.filter(g => g.category === currentCategoryFilter);
        renderGuardrails(filtered);
        updateCategoryChips();
    }

    function updateCategoryChips() {
        const allCats = ['all', ...new Set(analysisResults.guardrails.map(g => g.category))];
        const counts = {};
        analysisResults.guardrails.forEach(g => counts[g.category] = (counts[g.category] || 0) + 1);
        
        const container = document.getElementById('categoryFilters');
        if (container) {
            container.innerHTML = allCats.map(cat => {
                const count = cat === 'all' ? analysisResults.guardrails.length : counts[cat];
                const isSelected = currentCategoryFilter === cat;
                
                const activeClass = "bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-200 dark:ring-indigo-900 border-transparent";
                const inactiveClass = "bg-white dark:bg-[#151925] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700";
                
                return `
                <button onclick="window.guardrailAnalyzer.filterByCategory('${escapeHtml(cat)}')" 
                    class="shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border flex items-center gap-2 ${isSelected ? activeClass : inactiveClass}">
                    <span>${escapeHtml(cat === 'all' ? 'All Categories' : cat)}</span>
                    <span class="px-1.5 py-0.5 rounded-md text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}">
                        ${count}
                    </span>
                </button>`;
            }).join('');
        }
    }

    // --- ROBUST PDF EXPORT ---
    function exportPdf() {
        const element = document.getElementById('resultsSection');
        if (!element || element.classList.contains('hidden')) { 
            showError("No analysis results to export."); 
            return; 
        }

        const btn = document.getElementById('exportPdfBtn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = `<svg class="animate-spin h-4 w-4 text-white inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...`;
        btn.disabled = true;

        const opt = {
            margin:       [0.3, 0.3, 0.3, 0.3],
            filename:     `Guardrail_Audit_${new Date().toISOString().slice(0,10)}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                letterRendering: true,
                scrollY: 0,
                windowWidth: 1400 
            },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
        };

        setTimeout(() => {
            window.html2pdf().set(opt).from(element).save().then(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }).catch(err => {
                console.error("PDF Export failed:", err);
                btn.innerHTML = originalText;
                btn.disabled = false;
                showError("PDF Export failed. Check console for details.");
            });
        }, 500);
    }

    function showLoading() { loadingState.classList.remove('hidden'); analyzeBtn.disabled = true; }
    function hideLoading() { loadingState.classList.add('hidden'); analyzeBtn.disabled = false; progressBar.style.width = '0%'; }
    function updateProgress(percent, text) { progressBar.style.width = percent + '%'; progressText.textContent = text; }
    function showError(msg) { errorState.classList.remove('hidden'); document.getElementById('errorMessage').textContent = msg; setTimeout(hideError, 5000); }
    function hideError() { errorState.classList.add('hidden'); }
    function hideResults() { resultsSection.classList.add('hidden'); }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

    window.guardrailAnalyzer = { filterByCategory, filterByStatus };
})();