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
            border: "border-purple-200 dark:border-purple-800/50", 
            bg: "bg-purple-50 dark:bg-purple-900/10", 
            text: "text-purple-700 dark:text-purple-300", 
            accent: "bg-purple-600", 
            iconBg: "bg-purple-100 dark:bg-purple-900/30", 
            iconColor: "text-purple-600 dark:text-purple-300",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>` 
        },
        "scope control": { 
            border: "border-blue-200 dark:border-blue-800/50", 
            bg: "bg-blue-50 dark:bg-blue-900/10", 
            text: "text-blue-700 dark:text-blue-300", 
            accent: "bg-blue-600", 
            iconBg: "bg-blue-100 dark:bg-blue-900/30", 
            iconColor: "text-blue-600 dark:text-blue-300",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>`
        },
        "security": { 
            border: "border-red-200 dark:border-red-800/50", 
            bg: "bg-red-50 dark:bg-red-900/10", 
            text: "text-red-700 dark:text-red-300", 
            accent: "bg-red-600", 
            iconBg: "bg-red-100 dark:bg-red-900/30", 
            iconColor: "text-red-600 dark:text-red-300",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`
        },
        "privacy": { 
            border: "border-emerald-200 dark:border-emerald-800/50", 
            bg: "bg-emerald-50 dark:bg-emerald-900/10", 
            text: "text-emerald-700 dark:text-emerald-300", 
            accent: "bg-emerald-600", 
            iconBg: "bg-emerald-100 dark:bg-emerald-900/30", 
            iconColor: "text-emerald-600 dark:text-emerald-300",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>`
        },
        "input validation": { 
            border: "border-cyan-200 dark:border-cyan-800/50", 
            bg: "bg-cyan-50 dark:bg-cyan-900/10", 
            text: "text-cyan-700 dark:text-cyan-300", 
            accent: "bg-cyan-600", 
            iconBg: "bg-cyan-100 dark:bg-cyan-900/30", 
            iconColor: "text-cyan-600 dark:text-cyan-300",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>`
        },
        "output control": { 
            border: "border-pink-200 dark:border-pink-800/50", 
            bg: "bg-pink-50 dark:bg-pink-900/10", 
            text: "text-pink-700 dark:text-pink-300", 
            accent: "bg-pink-600", 
            iconBg: "bg-pink-100 dark:bg-pink-900/30", 
            iconColor: "text-pink-600 dark:text-pink-300",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>`
        },
        "qa": { 
            border: "border-blue-200 dark:border-blue-800/50", 
            bg: "bg-blue-50 dark:bg-blue-900/10", 
            text: "text-blue-700 dark:text-blue-300", 
            accent: "bg-blue-600", 
            iconBg: "bg-blue-100 dark:bg-blue-900/30", 
            iconColor: "text-blue-600 dark:text-blue-300",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
        },
        "default": { 
            border: "border-slate-200 dark:border-slate-700", 
            bg: "bg-slate-50 dark:bg-slate-800/50", 
            text: "text-slate-600 dark:text-slate-400", 
            accent: "bg-slate-500", 
            iconBg: "bg-slate-100 dark:bg-slate-700", 
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

    function renderScoreChart(score) {
      // Logic for RAG colors
      let color = '#ef4444'; // Red (Default)
      let textColor = 'text-red-600 dark:text-red-400'; 
      let label = 'High Risk';
      
      if (score >= 80) { 
          color = '#10b981'; // Emerald Green
          textColor = 'text-emerald-600 dark:text-emerald-400'; 
          label = 'Secure';
      } else if (score >= 50) { 
          color = '#f59e0b'; // Amber
          textColor = 'text-amber-600 dark:text-amber-400';
          label = 'Moderate Risk';
      }
        
      const radius = 45; 
      const circumference = 2 * Math.PI * radius; 
      const offset = circumference - (score / 100) * circumference;
      
      return `
        <div class="relative flex flex-col items-center justify-center">
            <div class="relative w-32 h-32">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="${radius}" fill="none" class="stroke-slate-100 dark:stroke-slate-800" stroke-width="8"></circle>
                    <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" class="transition-all duration-1000 ease-out"></circle>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-4xl font-black ${textColor} tracking-tight">${score}%</span>
                    <span class="text-[10px] font-bold uppercase tracking-wider ${textColor} mt-1">${label}</span>
                </div>
            </div>
        </div>`;
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
        const el = document.getElementById("executive-summary");
        if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
    }
  
    // --- DISPLAY ENGINE ---
    function displayResults(enableProfiling, enableRagDeepScan, enableGreenAI) {
        if (!analysisResults) return;

        const container = document.getElementById('resultsSection');
        
        // 1. Calculate Stats
        const gapData = performGapAnalysis(analysisResults.guardrails);
        const presentGuardrails = analysisResults.guardrails.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        const missingGuardrails = analysisResults.guardrails.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");

        // Determine Theme for Score Card based on score (Only Top Bar)
        let topBarColor = "bg-red-500";
        let badgeColor = "bg-red-500";
        if (gapData.score >= 80) {
            topBarColor = "bg-emerald-500";
            badgeColor = "bg-emerald-500";
        } else if (gapData.score >= 50) {
            topBarColor = "bg-amber-500";
            badgeColor = "bg-amber-500";
        }

        // 2. Render Executive Summary (SQUARE Cards, Flat Design)
        // DYNAMIC GRID: 4 columns if Green AI is ON, 3 columns if OFF
        const summaryGridCols = enableGreenAI ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3';

        const summaryHTML = `
        <div id="executive-summary" class="grid ${summaryGridCols} gap-6 mb-10 fade-in">
            
            <div class="relative group bg-white dark:bg-[#1e2130] rounded-none border border-slate-200 dark:border-slate-700 shadow-sm p-6 overflow-hidden transition-all hover:shadow-md aspect-square flex flex-col justify-center items-center">
                <div class="absolute top-0 left-0 w-full h-1 ${topBarColor}"></div>
                <div class="flex items-center gap-2 mb-2 absolute top-6 left-6">
                    <span class="px-2 py-0.5 rounded-none text-[10px] font-black uppercase tracking-widest ${badgeColor} text-white">Score</span>
                </div>
                <div class="mt-4">
                    ${renderScoreChart(gapData.score)}
                </div>
                <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-4">Safety Rating</p>
            </div>

            <div onclick="window.guardrailAnalyzer.filterByStatus('active')" class="cursor-pointer relative group bg-white dark:bg-[#1e2130] rounded-none border border-slate-200 dark:border-slate-700 shadow-sm p-6 overflow-hidden transition-all hover:shadow-md aspect-square flex flex-col justify-center items-center">
                <div class="absolute top-0 left-0 w-full h-1 bg-blue-500"></div> 
                <div class="flex items-center gap-2 mb-2 absolute top-6 left-6">
                    <span class="px-2 py-0.5 rounded-none text-[10px] font-black uppercase tracking-widest bg-blue-500 text-white">Active</span>
                </div>
                <div class="text-center mt-2">
                    <div class="text-8xl font-black text-blue-600 dark:text-blue-400 tracking-tighter drop-shadow-sm mb-1">${presentGuardrails.length}</div>
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Active Guardrails</p>
                </div>
            </div>

            <div onclick="window.guardrailAnalyzer.filterByStatus('missing')" class="cursor-pointer relative group bg-white dark:bg-[#1e2130] rounded-none border border-slate-200 dark:border-slate-700 shadow-sm p-6 overflow-hidden transition-all hover:shadow-md aspect-square flex flex-col justify-center items-center">
                <div class="absolute top-0 left-0 w-full h-1 bg-red-500"></div> 
                <div class="flex items-center gap-2 mb-2 absolute top-6 left-6">
                    <span class="px-2 py-0.5 rounded-none text-[10px] font-black uppercase tracking-widest bg-red-500 text-white">Risks</span>
                </div>
                <div class="text-center mt-2">
                    <div class="text-8xl font-black text-red-500 dark:text-red-400 tracking-tighter drop-shadow-sm mb-1">${missingGuardrails.length}</div>
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Missing Guards</p>
                </div>
            </div>

            ${enableGreenAI ? `<div id="slot-green-ai" class="h-full"></div>` : ''}
        </div>`;

        // 3. UNIFIED PERFORMANCE DASHBOARD ROW (Latency Only)
        let performanceRowHTML = '';
        if (enableProfiling) {
            performanceRowHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12 fade-in">
                <div id="slot-latency-engine" class="lg:col-span-4 h-full"></div>

                <div id="slot-latency-waterfall" class="lg:col-span-8 h-full"></div>
            </div>`;
        }

        // 4. Category Filter Bar
        const filterHTML = `
            <div class="sticky top-0 z-40 bg-slate-50/90 dark:bg-[#0f111a]/90 backdrop-blur-md py-4 mb-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 overflow-x-auto custom-scroll px-2" id="categoryFilters">
            </div>`;

        // 5. Build Final Layout
        container.innerHTML = summaryHTML + performanceRowHTML + filterHTML + '<div id="guardrailsDisplay" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20"></div>';

        // 6. Initialize Modules into specific slots
        // Green AI is now in the TOP Summary row
        if (enableGreenAI && window.greenAIMonitor) {
            window.greenAIMonitor.render(analysisResults.green_ai_analysis, 'slot-green-ai');
        }
        
        // Latency is now in the 2nd row (split between Engine and Waterfall)
        if (enableProfiling && window.latencyProfiler) {
            window.latencyProfiler.analyze(
                analysisResults.guardrails, 
                analysisResults.tiering_strategy,
                { engine: 'slot-latency-engine', waterfall: 'slot-latency-waterfall' }
            );
        }

        container.classList.remove('hidden');
        applyFilters();
    }

    // --- CARD RENDERER (SQUARE Grid Tiles - Flat) ---
    function renderGuardrails(guardrails) { 
        const container = document.getElementById('guardrailsDisplay');
        if (guardrails.length === 0) { 
            container.innerHTML = `<div class="col-span-3 p-12 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-none">No results found.</div>`; 
            return; 
        }
        
        container.innerHTML = guardrails.map((g, idx) => {
             const isMissing = g.name.toUpperCase().startsWith('MISSING') || !g.location || g.location.trim() === "";
             
             // Theme
             const catLower = (g.category || 'default').toLowerCase();
             let theme = categoryStyles['default']; 
             for (const [key, style] of Object.entries(categoryStyles)) {
                 if (catLower.includes(key)) { theme = style; break; }
             }

             const badgeClass = isMissing ? "bg-red-500 shadow-none" : "bg-emerald-500 shadow-none";
             const statusText = isMissing ? "MISSING" : "ACTIVE";
             
             return `
            <div class="relative group bg-white dark:bg-[#1e2130] rounded-none shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-500 hover:shadow-md hover:-translate-y-1 fade-in aspect-square flex flex-col" style="animation-delay: ${idx * 0.05}s">
                
                <div class="absolute top-5 left-5 z-20">
                    <span class="px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-widest text-white ${badgeClass}">
                        ${statusText}
                    </span>
                </div>
                
                <div class="absolute top-5 right-5 z-20">
                    <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">${escapeHtml(g.severity)}</span>
                </div>

                <div class="p-6 flex-1 flex flex-col items-center justify-center text-center relative z-10">
                    
                    <div class="w-16 h-16 mb-4 ${theme.text} transition-transform duration-500 group-hover:scale-110 opacity-90">
                        ${theme.icon}
                    </div>

                    <h3 class="text-base font-black text-slate-800 dark:text-white leading-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                        ${escapeHtml(g.name.replace(/^MISSING:\s*/i, ''))}
                    </h3>
                    
                    <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                        ${escapeHtml(g.category)}
                    </p>

                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 px-2">
                        ${escapeHtml(g.description)}
                    </p>
                </div>

                <div class="absolute inset-x-0 bottom-0 z-30 transform translate-y-[105%] transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) group-hover:translate-y-0 h-2/3">
                    <div class="bg-white/95 dark:bg-[#151925]/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-700 p-5 shadow-2xl h-full flex flex-col rounded-none">
                        
                        <div class="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3 shrink-0"></div>

                        <div class="overflow-y-auto custom-scroll pr-1 space-y-3 text-left">
                            <div>
                                <h4 class="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1">Mechanism</h4>
                                <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-none p-2 text-[10px] font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                                    ${escapeHtml(g.mechanism)}
                                </div>
                            </div>

                            <div>
                                <h4 class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Context</h4>
                                ${!isMissing ? 
                                    `<div class="bg-slate-100 dark:bg-slate-800 rounded-none p-2 font-mono text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 leading-relaxed break-words">"${escapeHtml(g.location)}"</div>` 
                                    : 
                                    `<div class="text-[10px] italic text-slate-400">Not detected in prompt</div>`
                                }
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
                
                const activeClass = "bg-indigo-600 text-white shadow-lg border-transparent";
                const inactiveClass = "bg-white dark:bg-[#151925] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700";
                
                return `
                <button onclick="window.guardrailAnalyzer.filterByCategory('${escapeHtml(cat)}')" 
                    class="shrink-0 px-4 py-2 rounded-none text-xs font-bold transition-all duration-300 border flex items-center gap-2 ${isSelected ? activeClass : inactiveClass}">
                    <span>${escapeHtml(cat === 'all' ? 'All Categories' : cat)}</span>
                    <span class="px-1.5 py-0.5 rounded-none text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}">
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

    window.guardrailAnalyzer = { 
        filterByCategory: filterByCategory, 
        filterByStatus: filterByStatus,
        version: '4.3.0-summary-integration' 
    };
})();