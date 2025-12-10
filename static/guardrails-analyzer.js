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

    // --- CONFIG: Flat UI Colors ---
    const categoryStyles = {
        "responsible ai": { gradient: "bg-gradient-to-r from-purple-600 to-purple-700", badge: "bg-purple-50 text-purple-700 border-purple-200" },
        "scope control": { gradient: "bg-gradient-to-r from-blue-600 to-blue-700", badge: "bg-blue-50 text-blue-700 border-blue-200" },
      
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

    function performGapAnalysis(foundGuardrails) {
        // 1. Define the buckets we want to measure
        // We map 'backendCategories' (from main.py) to these buckets explicitly.
        const scoringBuckets = [
            { 
                id: "security", 
                label: "Critical Security Controls", 
                backendCategories: ["Security"], // Exact match from main.py
                keywords: ["security", "auth", "access", "compliance", "encryption", "redact"], 
                weight: 2 
            },
            { 
                id: "privacy", 
                label: "Privacy & Data Handling", 
                backendCategories: ["Privacy"], 
                keywords: ["privacy", "pii", "gdpr", "data", "confidential"], 
                weight: 2 
            },
            { 
                id: "ai_safety", 
                label: "AI Safety & Ethics", 
                backendCategories: ["Responsible AI"], 
                keywords: ["ethic", "bias", "fairness", "harm", "responsible", "toxicity"], 
                weight: 1.5 
            },
            { 
                id: "scope", 
                label: "Scope & Boundaries", 
                backendCategories: ["Scope Control"], 
                keywords: ["scope", "limit", "boundar", "capability", "gatekeeping"], 
                weight: 1.5 
            },
            { 
                id: "validation", 
                label: "Input/Output Validation", 
                backendCategories: ["Input Validation", "Output Control", "QA"], 
                keywords: ["input", "output", "validate", "sanitize", "format", "structure", "quality"], 
                weight: 1.5 
            },
            { 
                id: "oversight", 
                label: "Accountability & Oversight", 
                backendCategories: [], // No direct backend equivalent, relies on keywords or specific names
                keywords: ["human", "oversight", "audit", "log", "monitor", "escalat", "attribution", "confidence"], 
                weight: 1 
            }
        ];
    
        let totalWeight = 0;
        let earnedScore = 0;
        const breakdown = [];
    
        scoringBuckets.forEach(bucket => {
            totalWeight += bucket.weight;
            
            // CHECK 1: Look for explicit Backend Category match
            // If the AI tagged it as "Responsible AI", it counts for the "AI Safety" bucket.
            const hasCategoryMatch = foundGuardrails.some(g => 
                bucket.backendCategories.includes(g.category)
            );
    
            // CHECK 2: Fallback to Keyword Search (in Name or Description)
            // Helpful if the AI miscategorized it but the text is clear.
            const hasKeywordMatch = foundGuardrails.some(g => {
                const text = (g.name + " " + g.description + " " + g.mechanism).toLowerCase();
                return bucket.keywords.some(k => text.includes(k));
            });
    
            if (hasCategoryMatch || hasKeywordMatch) {
                earnedScore += bucket.weight;
                breakdown.push({ label: `Has ${bucket.label}`, status: 'pass' });
            } else {
                breakdown.push({ label: `Missing ${bucket.label}`, status: 'fail' });
            }
        });
    
        // Calculate Percentage
        const finalScore = totalWeight === 0 ? 0 : Math.round((earnedScore / totalWeight) * 100);
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
                    Safety Score
                </div>
            </div>
        `;
    }

    // --- CORE FILTERING LOGIC ---
    function applyFilters() {
        if (!analysisResults) return;

        let filtered = analysisResults.guardrails;

        // 1. Apply Status Filter (Active vs Missing)
        if (currentStatusFilter === 'active') {
            filtered = filtered.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        } else if (currentStatusFilter === 'missing') {
            filtered = filtered.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");
        }

        // 2. Apply Severity Filter (From Summary Cards)
        if (currentSeverityFilter !== 'all') {
            filtered = filtered.filter(g => g.severity?.toLowerCase() === currentSeverityFilter.toLowerCase());
        }

        // 3. Apply Category Filter
        if (currentCategoryFilter !== 'all') {
            filtered = filtered.filter(g => g.category === currentCategoryFilter);
        }

        renderGuardrails(filtered);
        updateFilterUI();
    }

    function filterBySummaryCard(type) {
        // Reset category to ensure user sees the relevant items across all categories first
        currentCategoryFilter = 'all'; 

        switch(type) {
            case 'active':
                currentStatusFilter = 'active';
                currentSeverityFilter = 'all';
                break;
            case 'missing':
                currentStatusFilter = 'missing';
                currentSeverityFilter = 'all';
                break;
            case 'critical':
                currentStatusFilter = 'missing';
                currentSeverityFilter = 'critical';
                break;
            case 'high':
                currentStatusFilter = 'missing';
                currentSeverityFilter = 'high';
                break;
        }
        applyFilters();
    }

    function filterByStatus(status) {
        currentStatusFilter = status;
        currentSeverityFilter = 'all'; // Reset severity when manually changing status tab
        applyFilters();
    }

    function filterByCategory(category) {
        currentCategoryFilter = category;
        applyFilters();
    }
    
    function resetFilters() {
        currentStatusFilter = 'active';
        currentSeverityFilter = 'all';
        currentCategoryFilter = 'all';
        applyFilters();
    }

    function updateFilterUI() {
        // 1. Update Status Buttons
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

        // 2. Show/Hide Filter Badge
        const badge = document.getElementById('activeFilterBadge');
        const badgeText = document.getElementById('activeFilterText');
        if (badge && badgeText) {
            if (currentSeverityFilter !== 'all') {
                badge.classList.remove('hidden');
                badgeText.textContent = `Filtered by: ${currentSeverityFilter.charAt(0).toUpperCase() + currentSeverityFilter.slice(1)}`;
                badge.className = currentSeverityFilter === 'critical' ? 'ml-auto px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-2' 
                                : 'ml-auto px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 flex items-center gap-2';
            } else {
                badge.classList.add('hidden');
            }
        }

        // 3. Render Category Buttons based on current Status/Severity context
        let contextGuardrails = analysisResults.guardrails;
        
        // Filter context items by Status/Severity so category counts reflect what is currently viewable
        if (currentStatusFilter === 'active') {
            contextGuardrails = contextGuardrails.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        } else if (currentStatusFilter === 'missing') {
            contextGuardrails = contextGuardrails.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");
        }
        if (currentSeverityFilter !== 'all') {
            contextGuardrails = contextGuardrails.filter(g => g.severity?.toLowerCase() === currentSeverityFilter.toLowerCase());
        }

        const categories = ['all', ...new Set(contextGuardrails.map(g => g.category))];
        const counts = {};
        contextGuardrails.forEach(g => { counts[g.category] = (counts[g.category] || 0) + 1; });
        const total = contextGuardrails.length;

        const container = document.getElementById('categoryFilters');
        if (container) {
            container.innerHTML = categories.map(cat => {
                const count = cat === 'all' ? total : (counts[cat] || 0);
                const isDisabled = count === 0;
                const label = cat === 'all' ? `All (${count})` : `${cat} (${count})`;
                
                return `
                <button onclick="window.guardrailAnalyzer.filterByCategory('${escapeHtml(cat)}')" 
                        ${isDisabled ? 'disabled' : ''}
                        class="px-3 py-1.5 rounded-lg font-medium transition-all text-xs border ${
                    currentCategoryFilter === cat 
                        ? 'bg-blue-600 text-white shadow-md border-blue-600' 
                        : isDisabled 
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed border-transparent' 
                            : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200 shadow-sm'
                }">
                    ${escapeHtml(label)}
                </button>
            `;
            }).join('');
        }
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
        const presentGuardrails = analysisResults.guardrails.filter(g => 
            !g.name.toUpperCase().startsWith('MISSING') && g.location !== ""
        );
        const missingGuardrails = analysisResults.guardrails.filter(g => 
            g.name.toUpperCase().startsWith('MISSING') || g.location === ""
        );

        const missingCritical = missingGuardrails.filter(g => g.severity?.toLowerCase() === 'critical').length;
        const missingHigh = missingGuardrails.filter(g => g.severity?.toLowerCase() === 'high').length;

        // 2. Update UI Counts
        const activeCount = document.getElementById('activeCount');
        if(activeCount) activeCount.textContent = presentGuardrails.length;
        
        const missingTotal = document.getElementById('missingTotalCount');
        if(missingTotal) missingTotal.textContent = missingGuardrails.length;

        const missingCrit = document.getElementById('missingCriticalCount');
        if(missingCrit) missingCrit.textContent = missingCritical;

        const missingHi = document.getElementById('missingHighCount');
        if(missingHi) missingHi.textContent = missingHigh;

        // 3. Update Score (Updated Logic: Weighted Health Score)
        // Passes BOTH present and missing to calculate "Active / (Active + Missing)"
        const gapAnalysis = performGapAnalysis(presentGuardrails, missingGuardrails);
        const scoreEl = document.getElementById('coverageScore');
        if (scoreEl) {
            scoreEl.className = 'flex flex-col items-center justify-center py-2 h-full'; 
            scoreEl.innerHTML = renderScoreChart(gapAnalysis.score);
        }

        // 4. Render Recommendations
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
        <div class="flex items-center justify-between mb-4 p-2 bg-purple-50 rounded-lg border border-purple-100">
            <h4 class="font-bold text-purple-900 uppercase text-xs tracking-wider flex items-center gap-2">
                AI Suggestions
                <span class="bg-white text-purple-700 px-2 py-0.5 rounded-full text-[10px] border border-purple-100 shadow-sm">
                    ${analysisResults.recommendations.length}
                </span>
            </h4>
            
            <button id="toggleRecsBtn" class="group flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-4 py-1.5 rounded-full transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span id="toggleRecsText">Show Magic Fixes</span>
            </button>
        </div>

        <div id="recsContent" class="hidden transition-all duration-300 ease-in-out origin-top">
            <ul class="space-y-3 bg-white/40 p-4 rounded-xl border border-purple-100">
                ${analysisResults.recommendations.map((rec, i) => `
                    <li class="flex items-start gap-3 p-2 hover:bg-white rounded-lg transition-colors fade-in" style="animation-delay: ${i * 0.05}s">
                        <span class="text-purple-600 mt-0.5 text-lg">⚡</span>
                        <span class="text-gray-700 text-sm leading-relaxed">${escapeHtml(rec)}</span>
                    </li>
                `).join('')}
            </ul>
        </div>`;
        
        breakdownContainer.innerHTML = checklistHTML + recsHTML;

        // New: Event Listener for the Magic Button
        const toggleBtn = document.getElementById('toggleRecsBtn');
        const content = document.getElementById('recsContent');
        const btnText = document.getElementById('toggleRecsText');

        if (toggleBtn && content) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = content.classList.contains('hidden');
                
                if (isHidden) {
                    content.classList.remove('hidden');
                    btnText.textContent = "Minimize Suggestions";
                    // Update button style to look "active" (optional: simpler style when open)
                    toggleBtn.classList.remove('from-purple-600', 'to-indigo-600', 'text-white');
                    toggleBtn.classList.add('bg-purple-100', 'text-purple-700', 'border', 'border-purple-200');
                } else {
                    content.classList.add('hidden');
                    btnText.textContent = "Show Magic Fixes";
                    // Revert button style
                    toggleBtn.classList.add('from-purple-600', 'to-indigo-600', 'text-white');
                    toggleBtn.classList.remove('bg-purple-100', 'text-purple-700', 'border', 'border-purple-200');
                }
            });
        }

        // 5. Initial Render - Default to Active
        resetFilters();

        if (window.latencyProfiler) {
            window.latencyProfiler.analyze(analysisResults.guardrails);
        }

        resultsSection.classList.remove('hidden');
    }

    function renderGuardrails(guardrails) {
    const container = document.getElementById('guardrailsDisplay');
    
    if (guardrails.length === 0) {
        container.innerHTML = '<div class="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100"><p class="text-gray-500 text-lg">No guardrails found matching current filters.</p></div>';
        return;
    }

    container.innerHTML = guardrails.map((g, idx) => {
        const sevStyle = severityStyles[g.severity] || severityStyles["Medium"];
        
        // 1. Determine Category Style (for Badges)
        const catKey = g.category.toLowerCase();
        let styleToUse = categoryStyles["default"];
        for (const key in categoryStyles) {
            if (catKey.includes(key)) {
                styleToUse = categoryStyles[key];
                break;
            }
        }
        
        // --- FIX APPLIED HERE ---
        // Check if the guardrail is ACTIVE (Present) based on location
        const isActive = g.location && g.location.trim().length > 0;

        // Visual Logic:
        // - Active (Safe) = Professional Slate/Blue Gradient
        // - Missing (Risk) = Category Default (e.g., Red for Security)
        const headerGradient = isActive 
            ? "bg-gradient-to-r from-slate-700 to-slate-800" 
            : styleToUse.gradient;
        // ------------------------

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
            <div class="${headerGradient} p-5 text-white">
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

    window.guardrailAnalyzer = { 
        filterByCategory: filterByCategory, 
        filterByStatus: filterByStatus,
        filterBySummaryCard: filterBySummaryCard,
        resetFilters: resetFilters, 
        version: '3.9.6-weighted-scoring' 
    };
})();