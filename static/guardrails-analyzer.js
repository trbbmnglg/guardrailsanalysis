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
// --- CONFIG: Flat UI Colors & Icons ---
    const categoryStyles = {
        "responsible ai": { 
            gradient: "bg-gradient-to-r from-purple-600 to-purple-700", 
            badge: "bg-purple-50 text-purple-700 border-purple-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>` 
        },
        "scope control": { 
            gradient: "bg-gradient-to-r from-blue-600 to-blue-700", 
            badge: "bg-blue-50 text-blue-700 border-blue-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>`
        },
        "security": { 
            gradient: "bg-gradient-to-r from-red-600 to-red-700", 
            badge: "bg-red-50 text-red-700 border-red-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`
        },
        "security & compliance": { 
            gradient: "bg-gradient-to-r from-red-600 to-red-700", 
            badge: "bg-red-50 text-red-700 border-red-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>`
        },
        "compliance": { 
            gradient: "bg-gradient-to-r from-red-600 to-red-700", 
            badge: "bg-red-50 text-red-700 border-red-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>`
        },
        "privacy": { 
            gradient: "bg-gradient-to-r from-emerald-600 to-emerald-700", 
            badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>`
        },
        "privacy protection": { 
            gradient: "bg-gradient-to-r from-emerald-600 to-emerald-700", 
            badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.578-4.18M12 21a9 9 0 00-9-9 9 9 0 009 9z" /></svg>`
        },
        "scope": { 
            gradient: "bg-gradient-to-r from-blue-600 to-blue-700", 
            badge: "bg-blue-50 text-blue-700 border-blue-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>`
        },
        "ethical": { 
            gradient: "bg-gradient-to-r from-purple-600 to-purple-700", 
            badge: "bg-purple-50 text-purple-700 border-purple-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
        },
        "ethical conduct": { 
            gradient: "bg-gradient-to-r from-purple-600 to-purple-700", 
            badge: "bg-purple-50 text-purple-700 border-purple-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
        },
        "input validation": { 
            gradient: "bg-gradient-to-r from-cyan-600 to-cyan-700", 
            badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>`
        },
        "output control": { 
            gradient: "bg-gradient-to-r from-pink-600 to-pink-700", 
            badge: "bg-pink-50 text-pink-700 border-pink-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>`
        },
        "default": { 
            gradient: "bg-gradient-to-r from-gray-600 to-gray-700", 
            badge: "bg-gray-50 text-gray-700 border-gray-200",
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>`
        }
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
        
        // Ensure we only insert the controls once and that the parent container exists
        if (btnContainer && btnContainer.parentElement && !document.getElementById('analysisControlsContainer')) {
            
            const controlsContainer = document.createElement('div');
            controlsContainer.id = 'analysisControlsContainer'; // Unique ID for the container
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
                  <input type="checkbox" id="aiProfilingToggle" class="mt-1 rounded text-blue-600 focus:ring-blue-500" checked>
                  <div>
                      <span class="text-sm font-medium text-gray-800">Latency & Cost Profiling</span>
                  </div>
                </label>
            `;
            
            // Insert the new container before the button container
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
            
            // New for API Key: Subtitle element
            const subtitle = document.getElementById('apiKeySubtitle');
            const isApiKeyToggle = btnId === 'toggleApiKey';

            if (btn && content) {
                // Initialize the state for the API Key section: it starts open.
                if (isApiKeyToggle) {
                    content.classList.remove('hidden');
                    minus?.classList.remove('hidden');
                    plus?.classList.add('hidden');
                    subtitle?.classList.add('hidden'); // Subtitle is hidden when open
                } else {
                    // Default behavior for other toggles (How It Works): start closed
                    content.classList.add('hidden');
                    minus?.classList.add('hidden');
                    plus?.classList.remove('hidden');
                }

                btn.addEventListener('click', () => {
                    content.classList.toggle('hidden');
                    
                    if (content.classList.contains('hidden')) {
                        // Minimized State
                        plus?.classList.remove('hidden');
                        minus?.classList.add('hidden');
                        
                        if (isApiKeyToggle && subtitle) {
                            subtitle.classList.remove('hidden'); // Show subtitle to aid centering
                        }

                    } else {
                        // Maximized State
                        plus?.classList.add('hidden');
                        minus?.classList.remove('hidden');
                        
                        if (isApiKeyToggle && subtitle) {
                            subtitle.classList.add('hidden'); // Hide subtitle when open
                        }
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
    // 1. Define expected coverage dimensions
    // These map DIRECTLY to the categories in main.py Agent backstories
    const expectedDimensions = [
        { 
            id: "security", 
            label: "Security & Compliance",
            backendCategories: ["Security", "Security & Compliance", "Compliance"],
            weight: 2.0,
            description: "Authentication, authorization, injection prevention, secure data handling"
        },
        { 
            id: "privacy", 
            label: "Privacy & Data Protection",
            backendCategories: ["Privacy", "Privacy Protection"],
            weight: 2.0,
            description: "PII handling, GDPR/CCPA compliance, data residency, consent"
        },
        { 
            id: "responsible_ai", 
            label: "Responsible AI & Ethics",
            backendCategories: ["Responsible AI", "Ethics", "Ethical", "Ethical Conduct"],
            weight: 1.5,
            description: "Bias detection, fairness, accountability, harm prevention"
        },
        { 
            id: "scope", 
            label: "Scope Control & Boundaries",
            backendCategories: ["Scope Control", "Scope"],
            weight: 1.5,
            description: "Task limitations, capability boundaries, out-of-scope handling"
        },
        { 
            id: "validation", 
            label: "Input/Output Validation",
            backendCategories: ["Input Validation", "Output Control", "QA"],
            weight: 1.5,
            description: "Format validation, schema checks, sanitization, quality assurance"
        },
        { 
            id: "oversight", 
            label: "Human Oversight & Monitoring",
            backendCategories: ["QA", "Oversight", "Monitoring"],
            weight: 1.0,
            description: "Logging, escalation paths, audit trails, human-in-the-loop"
        }
    ];

    // 2. Separate present vs missing guardrails based on AI analysis
    const presentGuardrails = foundGuardrails.filter(g => 
        !g.name.toUpperCase().startsWith('MISSING') && 
        g.location && 
        g.location.trim().length > 0
    );
    
    const missingGuardrails = foundGuardrails.filter(g => 
        g.name.toUpperCase().startsWith('MISSING') || 
        !g.location || 
        g.location.trim().length === 0
    );

    // 3. Score each dimension based PURELY on AI categorization
    let totalPossibleScore = 0;
    let earnedScore = 0;
    const breakdown = [];
    const dimensionDetails = [];

    expectedDimensions.forEach(dimension => {
        totalPossibleScore += dimension.weight;

        // Find present guardrails in this dimension
        const presentInDimension = presentGuardrails.filter(g => 
            dimension.backendCategories.some(cat => 
                g.category.toLowerCase() === cat.toLowerCase()
            )
        );

        // Find missing guardrails in this dimension
        const missingInDimension = missingGuardrails.filter(g => 
            dimension.backendCategories.some(cat => 
                g.category.toLowerCase() === cat.toLowerCase()
            )
        );

        // Scoring logic
        if (presentInDimension.length > 0) {
            // Dimension is covered
            earnedScore += dimension.weight;
            breakdown.push({ 
                label: `${dimension.label}`,
                status: 'pass',
                weight: dimension.weight,
                count: presentInDimension.length,
                details: presentInDimension.map(g => g.name)
            });
        } else if (missingInDimension.length > 0) {
            // AI explicitly identified gaps in this dimension
            breakdown.push({ 
                label: `${dimension.label}`,
                status: 'fail',
                weight: dimension.weight,
                count: missingInDimension.length,
                details: missingInDimension.map(g => g.name)
            });
        } else {
            // No evidence from AI analysis - assume expected but not found
            breakdown.push({ 
                label: `${dimension.label} (Not Assessed)`,
                status: 'neutral',
                weight: dimension.weight,
                count: 0,
                details: []
            });
        }

        // Track detailed stats per dimension
        dimensionDetails.push({
            dimension: dimension.label,
            present: presentInDimension.length,
            missing: missingInDimension.length,
            covered: presentInDimension.length > 0
        });
    });

    // 4. Calculate final percentage
    const finalScore = totalPossibleScore === 0 ? 0 : Math.round((earnedScore / totalPossibleScore) * 100);

    // 5. Calculate confidence based on agent agreement
    const confidence = calculateAIConfidence(foundGuardrails);

    return { 
        score: finalScore, 
        breakdown: breakdown,
        confidence: confidence,
        stats: {
            totalPresent: presentGuardrails.length,
            totalMissing: missingGuardrails.length,
            earnedPoints: earnedScore.toFixed(1),
            possiblePoints: totalPossibleScore.toFixed(1),
            dimensionsCovered: dimensionDetails.filter(d => d.covered).length,
            totalDimensions: expectedDimensions.length
        },
        dimensions: dimensionDetails,
        methodology: "AI-Governed Weighted Coverage (CrewAI Multi-Agent)"
    };
}

// NEW: Calculate confidence in AI analysis quality
function calculateAIConfidence(guardrails) {
    // Indicators of high-quality AI analysis:
    // 1. All guardrails have valid categories (not "default" or empty)
    // 2. All have descriptions and mechanisms
    // 3. Present items have location quotes
    // 4. Balanced distribution (not all critical, not all low)

    let confidenceScore = 100;
    let issues = [];

    // Check 1: Valid categorization
    const uncategorized = guardrails.filter(g => 
        !g.category || g.category === "default" || g.category.length < 3
    );
    if (uncategorized.length > 0) {
        const penalty = Math.min(20, uncategorized.length * 5);
        confidenceScore -= penalty;
        issues.push(`${uncategorized.length} uncategorized items (-${penalty}%)`);
    }

    // Check 2: Quality of descriptions
    const weakDescriptions = guardrails.filter(g => 
        !g.description || g.description.length < 20
    );
    if (weakDescriptions.length > guardrails.length * 0.3) {
        confidenceScore -= 15;
        issues.push("Weak descriptions (-15%)");
    }

    // Check 3: Location verification for present items
    const presentItems = guardrails.filter(g => 
        !g.name.toUpperCase().startsWith('MISSING')
    );
    const missingLocations = presentItems.filter(g => 
        !g.location || g.location.trim().length === 0
    );
    if (missingLocations.length > 0) {
        const penalty = Math.min(25, missingLocations.length * 8);
        confidenceScore -= penalty;
        issues.push(`${missingLocations.length} present items lack location proof (-${penalty}%)`);
    }

    // Check 4: Severity distribution (should have variety)
    const severityCounts = {};
    guardrails.forEach(g => {
        severityCounts[g.severity] = (severityCounts[g.severity] || 0) + 1;
    });
    const dominantSeverity = Object.values(severityCounts).some(count => 
        count > guardrails.length * 0.7
    );
    if (dominantSeverity && guardrails.length > 5) {
        confidenceScore -= 10;
        issues.push("Severity imbalance (-10%)");
    }

    return {
        score: Math.max(0, confidenceScore),
        level: confidenceScore >= 85 ? "High" : confidenceScore >= 70 ? "Medium" : "Low",
        issues: issues
    };
}

    function renderScoreChart(score, confidence) {
      let color = '#dc2626';
      let textColor = 'text-red-700';
      let trustTextColor = 'text-red-600'; 
      let trustLevelText = 'High Risk'; // Default to High Risk
      
      if (score >= 80) {
          // Score 80% or higher is considered a strong pass
          trustTextColor = 'text-green-600'; 
          trustLevelText = 'Low Risk';
      } else if (score >= 50) {
          // Score 50% - 79% is moderate risk
          trustTextColor = 'text-yellow-600';
          trustLevelText = 'Moderate Risk';
      } else {
          // Score below 50% is critical risk
          trustTextColor = 'text-red-600';
          trustLevelText = 'High Risk';
      }
        
        // Safety Score Color Logic (The main percentage and circle)
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
                        ${confidence ? `
                            <span class="text-[10px] font-medium ${trustTextColor}">
                                ${trustLevelText}
                            </span>
                        ` : ''}
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
            
            console.log("Guardrails with tiers:", 
              parsed.guardrails.map(g => ({name: g.name, tier: g.complexity_tier}))
            );
            
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
    document.getElementById('activeCount').textContent = presentGuardrails.length;
    document.getElementById('missingTotalCount').textContent = missingGuardrails.length;
    document.getElementById('missingCriticalCount').textContent = missingCritical;
    document.getElementById('missingHighCount').textContent = missingHigh;

    // 3. AI-Governed Score Calculation
    const gapAnalysis = performGapAnalysis(analysisResults.guardrails);
    
    const scoreEl = document.getElementById('coverageScore');
    if (scoreEl) {
        scoreEl.className = 'flex flex-col items-center justify-center py-2 h-full'; 
        scoreEl.innerHTML = renderScoreChart(gapAnalysis.score, gapAnalysis.confidence);
    }

    const breakdownContainer = document.getElementById('recommendations');
   // --- START OF NEW RENDERING LOGIC ---

    // 1. Compliance Scorecard (The Grid)
    const checklistHTML = `
        <div class="mb-8">
            <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white text-lg shadow-md shadow-indigo-200">🛡️</span>
                        Governance Insights
                    </h2>
                    <p class="text-slate-500 mt-1 ml-14">AI-verified compliance gaps and remediation steps</p>
                </div>
                
                <div class="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                    <div class="text-right">
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Analysis Confidence</div>
                        <div class="text-sm font-bold ${gapAnalysis.confidence.level === 'High' ? 'text-emerald-600' : 'text-amber-500'}">
                            ${gapAnalysis.confidence.score}% (${gapAnalysis.confidence.level})
                        </div>
                    </div>
                    <div class="relative flex h-3 w-3">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${gapAnalysis.confidence.level === 'High' ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-3 w-3 ${gapAnalysis.confidence.level === 'High' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${gapAnalysis.breakdown.map((item, i) => {
                    const isPass = item.status === 'pass';
                    const isNeutral = item.status === 'neutral';
                    
                    // Dynamic Styles based on Status
                    let containerClass = isPass ? "bg-emerald-50/50 border-emerald-100 hover:border-emerald-300" 
                                       : isNeutral ? "bg-slate-50 border-slate-100"
                                       : "bg-red-50/50 border-red-100 hover:border-red-300";
                    
                    let iconClass = isPass ? "bg-emerald-100 text-emerald-600" 
                                  : isNeutral ? "bg-slate-200 text-slate-400"
                                  : "bg-red-100 text-red-600";
                                  
                    let icon = isPass ? `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
                             : isNeutral ? `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>`
                             : `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;

                    return `
                        <div class="flex items-center gap-4 p-4 rounded-xl border ${containerClass} transition-all duration-300 group fade-in" style="animation-delay: ${i * 0.05}s">
                            <div class="h-12 w-12 rounded-lg ${iconClass} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                ${icon}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="font-bold text-slate-800 text-sm truncate pr-2">${escapeHtml(item.label)}</span>
                                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isPass ? 'bg-emerald-100 text-emerald-700' : isNeutral ? 'bg-slate-200 text-slate-500' : 'bg-red-100 text-red-700'}">
                                        ${isPass ? '+' + item.weight + ' PTS' : 'MISSING'}
                                    </span>
                                </div>
                                <div class="text-xs text-slate-500 truncate flex items-center gap-1">
                                    ${item.count > 0 ? `<span class="font-semibold text-slate-700">${item.count}</span> controls verified` : 'No controls detected'}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // 2. Actionable Recommendations (The Cards)
    const recsHTML = `
        <div class="relative overflow-hidden bg-slate-900 rounded-xl p-6 text-white shadow-xl">
            <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div class="relative z-10 flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
                <div class="flex items-center gap-3">
                    <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </span>
                    <div>
                        <h3 class="font-bold text-lg tracking-tight">AI Strategy</h3>
                        <p class="text-xs text-slate-400">Recommended actions to improve score</p>
                    </div>
                </div>
                
                <button id="toggleRecsBtn" class="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold transition-all flex items-center gap-2">
                    <span id="toggleRecsText">Hide Actions</span>
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
            </div>

            <div id="recsContent" class="grid grid-cols-1 gap-3 transition-all duration-300">
                ${analysisResults.recommendations.map((rec, i) => `
                    <div class="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-400/30 transition-all group cursor-default">
                        <div class="mt-1 flex-shrink-0">
                            <div class="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:text-indigo-200 group-hover:scale-110 transition-all">
                                <span class="text-xs">⚡</span>
                            </div>
                        </div>
                        <div class="text-sm text-slate-200 leading-relaxed font-medium">
                            ${escapeHtml(rec)}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    breakdownContainer.innerHTML = checklistHTML + recsHTML;

    // --- END OF NEW RENDERING LOGIC ---
        
        console.log('🤖 AI Governance Score:', gapAnalysis);
  
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

        // ADD DEBUG HERE:
        console.log('🚀 About to call latency profiler...');
        console.log('Profiler exists?', !!window.latencyProfiler);
        console.log('Guardrails count:', analysisResults.guardrails.length);

        if (window.latencyProfiler) {
            console.log('✅ Calling latency profiler...');
            window.latencyProfiler.analyze(analysisResults.guardrails);
        } else{
            console.error('❌ Latency profiler not found!');
        }

        resultsSection.classList.remove('hidden');
    }

    function renderGuardrails(guardrails) {
        const container = document.getElementById('guardrailsDisplay');
        
        if (guardrails.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <div class="p-4 bg-white rounded-full shadow-sm mb-4">
                        <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <p class="text-slate-500 font-medium">No guardrails found matching current filters.</p>
                    <button onclick="window.guardrailAnalyzer.resetFilters()" class="mt-2 text-sm text-blue-600 hover:underline font-medium">Clear filters</button>
                </div>`;
            return;
        }

        container.innerHTML = guardrails.map((g, idx) => {
            // 1. Determine Status (Active vs Missing)
            const isMissing = g.name.toUpperCase().startsWith('MISSING') || !g.location || g.location.trim() === "";
            
            // 2. Determine Styling based on Category & Severity
            const catLower = g.category.toLowerCase();
            let theme = { border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-600', icon: '🛡️', accent: 'bg-slate-500' };
            
            if (catLower.includes('security')) theme = { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', icon: '🔒', accent: 'bg-red-600' };
            else if (catLower.includes('privacy')) theme = { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '👁️', accent: 'bg-emerald-600' };
            else if (catLower.includes('ethics') || catLower.includes('responsible')) theme = { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', icon: '⚖️', accent: 'bg-purple-600' };
            else if (catLower.includes('scope')) theme = { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', icon: '🎯', accent: 'bg-blue-600' };
            else if (catLower.includes('input') || catLower.includes('output')) theme = { border: 'border-cyan-200', bg: 'bg-cyan-50', text: 'text-cyan-700', icon: '⚡', accent: 'bg-cyan-600' };

            // Severity Badge Logic
            const sevLower = (g.severity || 'low').toLowerCase();
            let sevBadgeClass = "bg-slate-100 text-slate-600";
            if (sevLower === 'critical') sevBadgeClass = "bg-red-100 text-red-700 border-red-200 ring-1 ring-red-500/20";
            else if (sevLower === 'high') sevBadgeClass = "bg-orange-100 text-orange-700 border-orange-200 ring-1 ring-orange-500/20";
            else if (sevLower === 'medium') sevBadgeClass = "bg-amber-100 text-amber-700 border-amber-200 ring-1 ring-amber-500/20";
            else if (sevLower === 'low') sevBadgeClass = "bg-green-100 text-green-700 border-green-200 ring-1 ring-green-500/20";

            // Card Opacity for Missing items
            const cardOpacity = isMissing ? "opacity-75 border-dashed" : "opacity-100";
            const cardBg = isMissing ? "bg-slate-50/50" : "bg-white";

            return `
            <div class="relative group rounded-xl border ${theme.border} ${cardBg} ${cardOpacity} shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden fade-in" style="animation-delay: ${idx * 0.05}s">
                
                <div class="absolute left-0 top-0 bottom-0 w-1.5 ${theme.accent}"></div>

                <div class="p-5 pl-7">
                    <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                        <div class="flex-1">
                            <div class="flex items-center gap-2.5 mb-1.5">
                                <span class="text-xl filter drop-shadow-sm">${theme.icon}</span>
                                <h3 class="text-lg font-bold text-slate-900 leading-tight">
                                    ${escapeHtml(g.name.replace('MISSING:', '').trim())}
                                </h3>
                                ${isMissing ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-500 border border-slate-300">Missing</span>` : ''}
                            </div>
                            <p class="text-sm text-slate-500 leading-relaxed max-w-3xl">${escapeHtml(g.description)}</p>
                        </div>
                        
                        <div class="flex items-center gap-2 flex-shrink-0 self-start mt-1">
                            <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${sevBadgeClass}">
                                ${escapeHtml(g.severity)}
                            </span>
                            <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200 bg-white text-slate-500 shadow-sm">
                                ${escapeHtml(g.category)}
                            </span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-5 border-t border-slate-100/80 border-dashed">
                        
                        <div class="lg:col-span-5 space-y-5">
                            
                            <div class="flex flex-col gap-1">
                                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Action & Mechanism</h4>
                                <div class="flex items-start gap-3">
                                     <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                        <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        ${escapeHtml(g.enforcement || "Review")}
                                    </span>
                                    <div class="text-sm text-slate-600 leading-snug pt-0.5 border-l-2 border-slate-200 pl-3">
                                        ${escapeHtml(g.mechanism)}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trigger Conditions</h4>
                                <div class="flex flex-wrap gap-2">
                                    ${g.triggers.map(t => `
                                        <span class="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-500 text-xs hover:border-slate-300 hover:text-slate-700 transition-colors cursor-default shadow-sm">
                                            ${escapeHtml(t)}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="lg:col-span-7 flex flex-col h-full">
                             <div class="flex items-center justify-between mb-2">
                                 <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detected Context</h4>
                                 ${!isMissing ? '<span class="text-emerald-600 text-[10px] font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Verified in prompt</span>' : ''}
                             </div>
                             
                             <div class="relative bg-slate-50/80 rounded-lg border border-slate-200 p-4 flex-grow group-hover:border-slate-300 transition-colors min-h-[100px]">
                                ${!isMissing ? `
                                    <div class="absolute top-2 right-2 flex gap-1.5">
                                        <div class="w-2.5 h-2.5 rounded-full bg-red-200/50"></div>
                                        <div class="w-2.5 h-2.5 rounded-full bg-amber-200/50"></div>
                                        <div class="w-2.5 h-2.5 rounded-full bg-green-200/50"></div>
                                    </div>
                                    <div class="font-mono text-xs text-slate-600 leading-relaxed whitespace-pre-wrap mt-2 select-all">"${escapeHtml(g.location)}"</div>
                                ` : `
                                    <div class="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-4">
                                        <svg class="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span class="text-xs italic opacity-60">Not detected in current instruction set</span>
                                    </div>
                                `}
                             </div>
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