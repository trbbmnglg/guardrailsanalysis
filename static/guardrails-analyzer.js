// AI Agent Guardrail Analyzer - Enterprise Agentic Edition
// Version: 4.0.0 (Governance Control Plane)
// Backend: Python CrewAI (FastAPI)

(function() {
    'use strict';

    // --- 1. CSS & STYLE INJECTION ---
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
        .animate-entry { animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .glass-panel { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); border: 1px solid rgba(229, 231, 235, 0.5); }
        .terminal-font { font-family: 'Menlo', 'Monaco', 'Courier New', monospace; }
        .gradient-text { background-clip: text; -webkit-background-clip: text; color: transparent; background-image: linear-gradient(to right, #4f46e5, #9333ea); }
    `;
    document.head.appendChild(styleSheet);

    // --- 2. GLOBAL STATE ---
    let analysisResults = null;
    let currentCategoryFilter = 'all';
    let currentStatusFilter = 'active'; 
    let currentSeverityFilter = 'all';

    // DOM Elements
    let apiKeyInput, instructionInput, charCount, analyzeBtn;
    let loadingState, errorState, resultsSection;
    let progressBar, progressText;

    // --- 3. CONFIGURATION (Colors & Icons) ---
    const categoryStyles = {
        "responsible ai": { gradient: "bg-gradient-to-r from-purple-600 to-purple-700", icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>` },
        "security": { gradient: "bg-gradient-to-r from-red-600 to-red-700", icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>` },
        "privacy": { gradient: "bg-gradient-to-r from-emerald-600 to-emerald-700", icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>` },
        "default": { gradient: "bg-gradient-to-r from-gray-600 to-gray-700", icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` }
    };

    // --- 4. VISUALIZATION GENERATORS ---

    // Governance Radar Chart (SVG)
    function generateRadarChart(dimensions) {
        const size = 280;
        const center = size / 2;
        const radius = 90;
        const angleStep = (Math.PI * 2) / dimensions.length;
        
        // Calculate polygon points
        const points = dimensions.map((d, i) => {
            const value = d.covered ? 1 : 0.35; // 100% radius if covered, 35% if missing
            const x = center + radius * value * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + radius * value * Math.sin(i * angleStep - Math.PI / 2);
            return `${x},${y}`;
        }).join(' ');

        // Generate Labels & Axes
        const axes = dimensions.map((d, i) => {
            const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
            const labelX = center + (radius + 20) * Math.cos(i * angleStep - Math.PI / 2);
            const labelY = center + (radius + 15) * Math.sin(i * angleStep - Math.PI / 2);
            const labelText = d.dimension.split(' ')[0].substring(0, 10);
            
            return `
                <line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />
                <text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" 
                      class="text-[9px] font-bold fill-gray-500 uppercase tracking-wider">${labelText}</text>
            `;
        }).join('');

        return `
        <div class="relative flex justify-center items-center py-2 animate-entry">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="overflow-visible">
                <circle cx="${center}" cy="${center}" r="${radius}" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
                <circle cx="${center}" cy="${center}" r="${radius * 0.66}" fill="none" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4 4"/>
                <circle cx="${center}" cy="${center}" r="${radius * 0.33}" fill="none" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4 4"/>
                ${axes}
                <polygon points="${points}" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" stroke-width="2" stroke-linejoin="round" />
                ${dimensions.map((d, i) => {
                    const value = d.covered ? 1 : 0.35;
                    const x = center + radius * value * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + radius * value * Math.sin(i * angleStep - Math.PI / 2);
                    return `<circle cx="${x}" cy="${y}" r="3" fill="${d.covered ? '#10b981' : '#ef4444'}" stroke="white" stroke-width="1.5" />`;
                }).join('')}
            </svg>
        </div>`;
    }

    // --- 5. CORE LOGIC & ANALYSIS ---

    function performGapAnalysis(foundGuardrails) {
        // Maps backend categories to 6 core dimensions
        const expectedDimensions = [
            { id: "security", label: "Security & Compliance", backendCategories: ["Security", "Security & Compliance", "Compliance"], weight: 2.0 },
            { id: "privacy", label: "Privacy & Data Protection", backendCategories: ["Privacy", "Privacy Protection"], weight: 2.0 },
            { id: "responsible_ai", label: "Responsible AI", backendCategories: ["Responsible AI", "Ethics", "Ethical", "Ethical Conduct"], weight: 1.5 },
            { id: "scope", label: "Scope Control", backendCategories: ["Scope Control", "Scope"], weight: 1.5 },
            { id: "validation", label: "Input/Output QA", backendCategories: ["Input Validation", "Output Control", "QA"], weight: 1.5 },
            { id: "oversight", label: "Human Oversight", backendCategories: ["QA", "Oversight", "Monitoring"], weight: 1.0 }
        ];

        let totalPossibleScore = 0, earnedScore = 0;
        const dimensionDetails = [];

        expectedDimensions.forEach(dim => {
            totalPossibleScore += dim.weight;
            const hasCoverage = foundGuardrails.some(g => 
                !g.name.toUpperCase().startsWith('MISSING') && 
                g.location && g.location.trim().length > 0 &&
                dim.backendCategories.some(cat => g.category.toLowerCase().includes(cat.toLowerCase()))
            );
            
            if (hasCoverage) earnedScore += dim.weight;
            dimensionDetails.push({ dimension: dim.label, covered: hasCoverage });
        });

        const finalScore = totalPossibleScore === 0 ? 0 : Math.round((earnedScore / totalPossibleScore) * 100);
        
        // Simple confidence logic
        const validItems = foundGuardrails.filter(g => g.description && g.description.length > 20).length;
        const confidenceScore = Math.min(100, Math.max(50, (validItems / foundGuardrails.length) * 100 + 10));

        return { 
            score: finalScore, 
            confidence: { score: Math.round(confidenceScore), level: confidenceScore > 80 ? 'High' : 'Medium' },
            dimensions: dimensionDetails,
            methodology: "AI-Governed Weighted Coverage"
        };
    }

    function cleanAndParseJSON(rawText) {
        try {
            let clean = rawText.replace(/```json\s*|\s*```/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
            throw new Error("Could not extract valid JSON.");
        }
    }

    // --- 6. MAIN UI RENDERING ---

    function displayResults() {
        if (!analysisResults) return;

        const presentGuardrails = analysisResults.guardrails.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        const missingGuardrails = analysisResults.guardrails.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");
        const missingCritical = missingGuardrails.filter(g => g.severity?.toLowerCase() === 'critical').length;
        const gapAnalysis = performGapAnalysis(analysisResults.guardrails);

        // -- RENDER: Summary "Control Plane" --
        const summaryContainer = document.getElementById('summarySection') || document.createElement('div');
        summaryContainer.id = 'summarySection';
        
        // Ensure container is in the right place
        const oldScoreEl = document.getElementById('coverageScore');
        if (oldScoreEl && oldScoreEl.parentElement && oldScoreEl.parentElement.parentElement) {
             // Hide old layout elements
            oldScoreEl.parentElement.parentElement.style.display = 'none';
            // Insert new section if not already there
            if (!document.getElementById('summarySection')) {
                resultsSection.insertBefore(summaryContainer, oldScoreEl.parentElement.parentElement);
            }
        }

        summaryContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-entry">
                <div class="glass-panel rounded-xl p-4 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Safety Score</h3>
                    <div class="flex items-end gap-2 mt-2">
                        <span class="text-4xl font-black ${gapAnalysis.score >= 80 ? 'text-emerald-600' : gapAnalysis.score >= 50 ? 'text-orange-500' : 'text-red-600'}">
                            ${gapAnalysis.score}%
                        </span>
                        <span class="text-xs mb-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium border border-gray-200">
                            ${gapAnalysis.confidence.level} Conf.
                        </span>
                    </div>
                </div>

                <button onclick="window.guardrailAnalyzer.filterBySummaryCard('active')" 
                    class="bg-white rounded-xl p-4 border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all text-left relative overflow-hidden group">
                    <h3 class="text-xs font-bold text-blue-600 uppercase tracking-wider">Active Controls</h3>
                    <div class="flex items-end gap-2 mt-2">
                        <span class="text-3xl font-bold text-gray-800">${presentGuardrails.length}</span>
                        <span class="text-xs text-blue-600 mb-1 font-medium">Enforced</span>
                    </div>
                </button>

                <button onclick="window.guardrailAnalyzer.filterBySummaryCard('critical')" 
                    class="bg-red-50 rounded-xl p-4 border border-red-100 hover:border-red-300 hover:shadow-md transition-all text-left relative overflow-hidden group">
                    <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg class="w-16 h-16 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <h3 class="text-xs font-bold text-red-600 uppercase tracking-wider">Critical Gaps</h3>
                    <div class="flex items-end gap-2 mt-2">
                        <span class="text-3xl font-bold text-red-700">${missingCritical}</span>
                        <span class="text-xs bg-white text-red-600 px-2 py-0.5 rounded border border-red-200 font-bold mb-1">Action Required</span>
                    </div>
                </button>

                <button onclick="window.guardrailAnalyzer.filterBySummaryCard('missing')" 
                    class="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all text-left">
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Missing</h3>
                    <div class="flex items-end gap-2 mt-2">
                        <span class="text-3xl font-bold text-gray-700">${missingGuardrails.length}</span>
                        <span class="text-xs text-gray-400 mb-1">In Roadmap</span>
                    </div>
                </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-bold text-gray-700 text-sm uppercase tracking-wide">Governance Map</h4>
                    </div>
                    <div class="flex-grow flex items-center justify-center">
                        ${generateRadarChart(gapAnalysis.dimensions)}
                    </div>
                </div>

                <div class="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-0 overflow-hidden flex flex-col shadow-lg">
                    <div class="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="flex gap-1.5"><div class="w-2.5 h-2.5 rounded-full bg-red-500"></div><div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div><div class="w-2.5 h-2.5 rounded-full bg-green-500"></div></div>
                            <span class="text-xs font-mono text-gray-400 ml-2">ai_remediations.sh</span>
                        </div>
                        <span class="text-xs text-indigo-400 font-mono">Agent v2.1</span>
                    </div>
                    <div class="p-4 overflow-y-auto max-h-[280px] scrollbar-hide">
                        <ul class="space-y-3 font-mono text-sm">
                            ${analysisResults.recommendations.map((rec, i) => `
                                <li class="flex items-start gap-3 text-gray-300 animate-entry" style="animation-delay: ${i * 0.1}s">
                                    <span class="text-indigo-500 shrink-0">$</span>
                                    <span class="leading-relaxed"><span class="text-green-400 font-bold">SUGGESTION:</span> ${escapeHtml(rec)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;

        resetFilters();
        resultsSection.classList.remove('hidden');

        // Latency Profiler Hook (Optional)
        if (window.latencyProfiler) window.latencyProfiler.analyze(analysisResults.guardrails);
    }

    function renderGuardrails(guardrails) {
        const container = document.getElementById('guardrailsDisplay');
        
        if (guardrails.length === 0) {
            container.innerHTML = `<div class="col-span-full p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">No guardrails found matching filters.</div>`;
            return;
        }

        container.innerHTML = guardrails.map((g, idx) => {
            const isActive = g.location && g.location.trim().length > 0;
            const statusColor = isActive ? 'emerald' : 'red';
            const sevColor = g.severity.toLowerCase() === 'critical' ? 'bg-red-600 text-white' : g.severity.toLowerCase() === 'high' ? 'bg-orange-500 text-white' : 'bg-blue-100 text-blue-800';
            
            // Get icon
            let iconSvg = categoryStyles.default.icon;
            for (const key in categoryStyles) {
                if (g.category.toLowerCase().includes(key)) { iconSvg = categoryStyles[key].icon; break; }
            }

            return `
            <div class="group bg-white rounded-lg border ${isActive ? 'border-emerald-200' : 'border-red-200'} shadow-sm hover:shadow-lg transition-all duration-300 animate-entry overflow-hidden flex flex-col" style="animation-delay: ${idx * 0.05}s">
                <div class="px-5 py-3 border-b ${isActive ? 'border-emerald-100 bg-emerald-50/30' : 'border-red-100 bg-red-50/30'} flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}"></div>
                        <span class="text-[10px] font-black tracking-widest ${isActive ? 'text-emerald-700' : 'text-red-600'}">
                            ${isActive ? 'ACTIVE' : 'MISSING'}
                        </span>
                        ${!isActive ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${sevColor}">${g.severity}</span>` : ''}
                    </div>
                    <span class="text-[10px] font-mono text-gray-500 uppercase">${escapeHtml(g.category)}</span>
                </div>

                <div class="p-5 flex-grow">
                    <div class="flex items-start gap-3 mb-4">
                        <div class="text-${isActive ? 'emerald' : 'red'}-600 bg-gray-50 p-1.5 rounded-lg border border-gray-100">${iconSvg}</div>
                        <div>
                            <h3 class="text-base font-bold text-gray-800 leading-tight mb-1">${escapeHtml(g.name)}</h3>
                            <p class="text-xs text-gray-500 leading-relaxed">${escapeHtml(g.description)}</p>
                        </div>
                    </div>

                    <div class="bg-slate-900 rounded-md border border-slate-700 overflow-hidden mt-2 shadow-inner">
                        <div class="flex items-center justify-between px-3 py-1 bg-slate-800 border-b border-slate-700">
                            <span class="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Logic / Enforcement</span>
                            <span class="text-[9px] text-blue-400 font-mono">${escapeHtml(g.enforcement)}</span>
                        </div>
                        <div class="p-3">
                            <code class="text-xs font-mono text-green-400 block leading-relaxed break-words">${escapeHtml(g.mechanism)}</code>
                        </div>
                    </div>

                    ${g.location ? `
                        <div class="mt-3 flex items-start gap-2">
                            <span class="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded w-full truncate border border-gray-200">
                                📍 ${escapeHtml(g.location)}
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>`;
        }).join('');
    }

    // --- 7. FILTERING & UTILS ---

    function applyFilters() {
        if (!analysisResults) return;
        let filtered = analysisResults.guardrails;

        // Status Filter
        if (currentStatusFilter === 'active') {
            filtered = filtered.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        } else if (currentStatusFilter === 'missing') {
            filtered = filtered.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");
        }

        // Severity Filter
        if (currentSeverityFilter !== 'all') {
            filtered = filtered.filter(g => g.severity?.toLowerCase() === currentSeverityFilter.toLowerCase());
        }

        // Category Filter
        if (currentCategoryFilter !== 'all') {
            filtered = filtered.filter(g => g.category === currentCategoryFilter);
        }

        renderGuardrails(filtered);
        updateFilterUI();
    }

    function updateFilterUI() {
        // Update Status Buttons
        ['active', 'missing', 'all'].forEach(s => {
            const btn = document.getElementById(`btn-status-${s}`);
            if (btn) btn.className = currentStatusFilter === s 
                ? "px-4 py-1.5 rounded-md text-sm font-bold bg-white text-blue-700 shadow-sm ring-1 ring-black/5" 
                : "px-4 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100";
        });

        // Update Category Pills
        const cats = ['all', ...new Set(analysisResults.guardrails.map(g => g.category))];
        const container = document.getElementById('categoryFilters');
        if (container) {
            container.innerHTML = cats.map(cat => {
                const isActive = currentCategoryFilter === cat;
                return `<button onclick="window.guardrailAnalyzer.filterByCategory('${escapeHtml(cat)}')" 
                    class="px-3 py-1 rounded-full text-xs font-medium border transition-all ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}">
                    ${escapeHtml(cat)}
                </button>`;
            }).join('');
        }
    }

    function filterBySummaryCard(type) {
        currentCategoryFilter = 'all';
        if (type === 'active') { currentStatusFilter = 'active'; currentSeverityFilter = 'all'; }
        else if (type === 'missing') { currentStatusFilter = 'missing'; currentSeverityFilter = 'all'; }
        else if (type === 'critical') { currentStatusFilter = 'missing'; currentSeverityFilter = 'critical'; }
        applyFilters();
    }

    function filterByStatus(s) { currentStatusFilter = s; currentSeverityFilter = 'all'; applyFilters(); }
    function filterByCategory(c) { currentCategoryFilter = c; applyFilters(); }
    function resetFilters() { currentStatusFilter = 'active'; currentSeverityFilter = 'all'; currentCategoryFilter = 'all'; applyFilters(); }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- 8. INITIALIZATION & API ---

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

        // Initial Controls Setup
        if (analyzeBtn && !document.getElementById('analysisControlsContainer')) {
            const controls = document.createElement('div');
            controls.id = 'analysisControlsContainer';
            controls.className = "mt-6 space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50";
            controls.innerHTML = `
                <h3 class="text-sm font-bold text-gray-700">Analysis Configuration</h3>
                <label class="flex items-center gap-3"><input type="checkbox" id="enableRagDeepScan" class="rounded text-blue-600" checked><span class="text-sm">Deep Compliance Scan (OWASP/NIST)</span></label>
                <label class="flex items-center gap-3"><input type="checkbox" id="aiProfilingToggle" class="rounded text-blue-600" checked><span class="text-sm">Latency & Cost Profiling</span></label>
            `;
            analyzeBtn.parentElement.parentElement.insertBefore(controls, analyzeBtn.parentElement);
        }

        if (instructionInput) {
            instructionInput.addEventListener('input', () => { charCount.textContent = instructionInput.value.length; });
        }

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', async () => {
                const apiKey = apiKeyInput.value.trim();
                const instruction = instructionInput.value.trim();
                if (!apiKey || !instruction) return showError('Please check API Key and Instruction inputs.');
                
                hideError(); resultsSection.classList.add('hidden'); loadingState.classList.remove('hidden'); analyzeBtn.disabled = true;

                try {
                    updateProgress(10, 'Initializing Agent Crew...');
                    const response = await fetch('/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            instruction: instruction, api_key: apiKey,
                            enable_profiling: document.getElementById('aiProfilingToggle').checked,
                            enable_rag_deep_scan: document.getElementById('enableRagDeepScan').checked
                        })
                    });

                    if (!response.ok) throw new Error(`Server Error: ${response.status}`);
                    
                    updateProgress(80, 'Processing Report...');
                    const data = await response.json();
                    if (!data.result) throw new Error("Empty result from backend.");
                    
                    let parsed = cleanAndParseJSON(data.result);
                    parsed.guardrails = parsed.guardrails.map(g => ({
                        ...g, 
                        severity: g.risk_level || g.severity || "Medium",
                        mechanism: g.recommendation || g.mechanism || "No mechanism provided.",
                        location: g.location || ""
                    }));

                    analysisResults = parsed;
                    updateProgress(100, 'Done!');
                    setTimeout(() => { loadingState.classList.add('hidden'); analyzeBtn.disabled = false; displayResults(); }, 500);

                } catch (err) {
                    console.error(err);
                    loadingState.classList.add('hidden'); analyzeBtn.disabled = false;
                    showError(err.message || "Analysis Failed.");
                }
            });
        }
        
        // Load Cached Key
        const cachedKey = sessionStorage.getItem('hf_api_key');
        if (cachedKey && apiKeyInput) apiKeyInput.value = cachedKey;
    }

    // UI Helpers
    function updateProgress(pct, txt) { progressBar.style.width = pct + '%'; progressText.textContent = txt; }
    function showError(msg) { errorState.classList.remove('hidden'); document.getElementById('errorMessage').textContent = msg; }
    function hideError() { errorState.classList.add('hidden'); }

    // Bootstrap
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    // Export Global API
    window.guardrailAnalyzer = { 
        filterByCategory, filterByStatus, filterBySummaryCard, resetFilters,
        version: '4.0.0-enterprise'
    };

})();