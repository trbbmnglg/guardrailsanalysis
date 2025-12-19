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
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>` 
        },
        "scope control": { 
            border: "border-blue-200 dark:border-blue-800/50", 
            bg: "bg-blue-50 dark:bg-blue-900/10", 
            text: "text-blue-700 dark:text-blue-300", 
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>`
        },
        "security": { 
            border: "border-red-200 dark:border-red-800/50", 
            bg: "bg-red-50 dark:bg-red-900/10", 
            text: "text-red-700 dark:text-red-300", 
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`
        },
        "privacy": { 
            border: "border-emerald-200 dark:border-emerald-800/50", 
            bg: "bg-emerald-50 dark:bg-emerald-900/10", 
            text: "text-emerald-700 dark:text-emerald-300", 
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>`
        },
        "input validation": { 
            border: "border-cyan-200 dark:border-cyan-800/50", 
            bg: "bg-cyan-50 dark:bg-cyan-900/10", 
            text: "text-cyan-700 dark:text-cyan-300", 
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>`
        },
        "output control": { 
            border: "border-pink-200 dark:border-pink-800/50", 
            bg: "bg-pink-50 dark:bg-pink-900/10", 
            text: "text-pink-700 dark:text-pink-300", 
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>`
        },
        "qa": { 
            border: "border-blue-200 dark:border-blue-800/50", 
            bg: "bg-blue-50 dark:bg-blue-900/10", 
            text: "text-blue-700 dark:text-blue-300", 
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
        },
        "default": { 
            border: "border-slate-200 dark:border-slate-700", 
            bg: "bg-slate-50 dark:bg-slate-800/50", 
            text: "text-slate-600 dark:text-slate-400", 
            icon: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
        }
    };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function cleanErrorMessage(errData, status) {
        if (!errData) return `Server Error (${status})`;
        let msg = errData.detail || errData.message || errData.error;
        if (!msg) return `Error (${status})`;

        if (Array.isArray(msg)) return msg.map(m => m.msg || JSON.stringify(m)).join(' | ');

        if (typeof msg === 'string') {
            msg = msg.trim();
            const innerErrorMatch = msg.match(/\{.*['"]error['"]\s*:\s*['"]([^'"]+)['"].*\}/);
            if (innerErrorMatch && innerErrorMatch[1]) {
                return innerErrorMatch[1]; 
            }
            if (/^\[['"](.+)['"]\]$/.test(msg)) {
                msg = msg.replace(/^\[['"]|['"]\]$/g, '');
            } else if (/^\(['"](.+)['"],?\)$/.test(msg)) {
                msg = msg.replace(/^\(['"]|['"],?\)$/g, '');
            }
            if (msg.startsWith('Error:')) msg = msg.substring(6).trim();
            if (msg.startsWith('Gatekeeper LLM Error:')) msg = msg.replace('Gatekeeper LLM Error:', '').trim();
        }
        return msg;
    }

    function init() {
        const saveKeyCheckbox = document.getElementById('saveApiKey');
        if (saveKeyCheckbox && saveKeyCheckbox.parentElement && saveKeyCheckbox.type === 'checkbox' && !saveKeyCheckbox.classList.contains('sr-only')) {
             const parent = saveKeyCheckbox.parentElement;
             const toggleHTML = `<label class="flex items-center gap-3 cursor-pointer group select-none"><div class="relative inline-flex items-center"><input type="checkbox" id="saveApiKey" class="sr-only peer"><div class="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600 transition-colors"></div></div><span class="text-sm text-gray-600 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-medium">Remember API key</span></label>`;
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
        if (instructionInput) instructionInput.addEventListener('input', () => charCount.textContent = instructionInput.value.length);
        if (analyzeBtn) analyzeBtn.addEventListener('click', async (e) => {
            e.preventDefault(); 
            if (!apiKeyInput.value.trim()) { showError('Please enter your HuggingFace API key.'); return; }
            if (!instructionInput.value.trim()) { showError('Please enter an instruction.'); return; }
            await analyzeInstruction(apiKeyInput.value.trim(), instructionInput.value.trim());
        });
      
        document.getElementById('exportPdfBtn')?.addEventListener('click', exportPdf);
        document.getElementById('exportJson')?.addEventListener('click', exportJson);
        document.getElementById('exportCsv')?.addEventListener('click', exportCsv);
        
        document.getElementById('clearApiKey')?.addEventListener('click', () => {
            apiKeyInput.value = ''; sessionStorage.removeItem('hf_api_key');
            showError('API key cleared.'); setTimeout(hideError, 2000);
        });
        document.getElementById('saveApiKey')?.addEventListener('change', (e) => {
            if (e.target.checked && apiKeyInput.value.trim()) sessionStorage.setItem('hf_api_key', apiKeyInput.value.trim());
            else sessionStorage.removeItem('hf_api_key');
        });
    }

    function loadCachedApiKey() {
        const cachedKey = sessionStorage.getItem('hf_api_key');
        if (cachedKey && apiKeyInput) apiKeyInput.value = cachedKey;
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
      let color = '#ef4444'; // Red
      let textColor = 'text-red-600 dark:text-red-400'; 
      let label = 'High Risk';
      
      if (score >= 80) { 
          color = '#10b981'; // Emerald
          textColor = 'text-emerald-600 dark:text-emerald-400'; 
          label = 'Secure';
      } else if (score >= 50) { 
          color = '#f59e0b'; // Amber
          textColor = 'text-amber-600 dark:text-amber-400';
          label = 'Moderate';
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
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <span class="text-4xl font-black ${textColor} tracking-tight leading-none">${score}%</span>
                    <span class="text-[8px] font-bold uppercase tracking-widest ${textColor} opacity-90">${label}</span>
                </div>
            </div>
        </div>`;
    }

    const AGENT_DEFS = {
        security: { 
            name: "Security Auditor", 
            role: "OWASP Specialist",
            icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`,
            color: "text-red-500"
        },
        privacy: { 
            name: "Privacy Officer", 
            role: "GDPR/PII Expert",
            icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>`,
            color: "text-emerald-500"
        },
        rai: { 
            name: "RAI Director", 
            role: "Ethics & Safety",
            icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>`,
            color: "text-purple-500"
        },
        qa: { 
            name: "QA Engineer", 
            role: "Quality Assurance",
            icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>`,
            color: "text-blue-500"
        },
        cost: { 
            name: "FinOps Architect", 
            role: "Cost & Latency",
            icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
            color: "text-amber-500"
        },
        green: { 
            name: "Green AI Officer", 
            role: "Sustainability",
            icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`,
            color: "text-emerald-600"
        },
        governance: { 
            name: "Governance Lead", 
            role: "Report Synthesis",
            icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
            color: "text-slate-500"
        }
    };
    
    // --- Helper: Render Agent Grid ---
    function initAgentGrid(activeAgents) {
        const grid = document.getElementById('agentGrid');
        if (!grid) return;
        
        grid.innerHTML = activeAgents.map((key, index) => {
            const agent = AGENT_DEFS[key];
            return `
                <div id="agent-card-${key}" class="agent-card agent-status-waiting relative bg-white dark:bg-[#151925] border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center gap-3 text-center h-32">
                    <div class="absolute top-2 right-2">
                       <div id="agent-icon-${key}" class="hidden text-emerald-500">
                            <svg class="w-5 h-5 checkmark-path" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                       </div>
                       <div id="agent-spinner-${key}" class="hidden">
                            <svg class="animate-spin w-4 h-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       </div>
                    </div>
                    
                    <div class="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${agent.color} opacity-80">
                        ${agent.icon}
                    </div>
                    
                    <div>
                        <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">${agent.name}</h4>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">${agent.role}</span>
                    </div>
    
                    <div class="w-full bg-slate-100 dark:bg-slate-800 h-1 mt-1 rounded-full overflow-hidden">
                        <div id="agent-bar-${key}" class="h-full bg-indigo-500 w-0 transition-all duration-300"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function updateAgentStatus(key, status) {
          const card = document.getElementById(`agent-card-${key}`);
          const icon = document.getElementById(`agent-icon-${key}`);
          const spinner = document.getElementById(`agent-spinner-${key}`);
          const bar = document.getElementById(`agent-bar-${key}`);
          
          if (!card) return;
    
          // --- FIX: SAFETY CHECK ---
          // If the card is already completed, NEVER switch it back to active/waiting
          if (card.classList.contains('agent-status-completed')) {
              return; 
          }
    
          if (status === 'active') {
              card.classList.remove('agent-status-waiting', 'agent-status-completed');
              card.classList.add('agent-status-active');
              spinner.classList.remove('hidden');
              icon.classList.add('hidden');
              bar.style.width = '60%'; 
              
              const name = AGENT_DEFS[key]?.name || 'Agent';
              document.getElementById('swarmStatusText').innerText = `${name} is auditing...`;
              
          } else if (status === 'completed') {
              card.classList.remove('agent-status-active', 'agent-status-waiting');
              card.classList.add('agent-status-completed');
              spinner.classList.add('hidden');
              icon.classList.remove('hidden');
              bar.style.width = '100%';
          }
    }
    
    // --- MAIN ANALYSIS ---
    async function analyzeInstruction(apiKey, instruction) {
        hideError();
        hideResults();
        showLoading(); // Shows the Agent Grid
    
        const enableProfiling = document.getElementById('aiProfilingToggle')?.checked || false;
        const enableRagDeepScan = document.getElementById('enableRagDeepScan')?.checked || false;
        const enableGreenAI = document.getElementById('greenAIToggle')?.checked || false;
        const selectedEngine = document.querySelector('input[name="engineOption"]:checked')?.value || 'deepseek';
    
        // 1. DETERMINE AGENT LIST & INIT GRID
        let activeAgents = ['security', 'privacy', 'rai', 'qa'];
        if (enableProfiling) activeAgents.push('cost');
        if (enableGreenAI) activeAgents.push('green');
        activeAgents.push('governance');
        
        initAgentGrid(activeAgents);
        
        // Set first agent to active initially
        updateAgentStatus(activeAgents[0], 'active');
    
        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    instruction: instruction, 
                    api_key: apiKey,
                    enable_profiling: enableProfiling, 
                    enable_rag_deep_scan: enableRagDeepScan,
                    enable_greenai_analysis: enableGreenAI,
                    analysis_engine: selectedEngine
                })
            });
    
            if (!response.ok) throw new Error(`Server Error: ${response.status}`);
    
            // 2. READ STREAM
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let completedCount = 0;
    
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
    
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer
    
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const msg = JSON.parse(line);
                        
                        if (msg.type === 'progress') {
                          // Mark CURRENT agent as done
                          updateAgentStatus(msg.agent, 'completed');
                          completedCount++;
                          
                          // Update Progress Bar
                          const percent = Math.round((completedCount / activeAgents.length) * 100);
                          document.getElementById('progressBar').style.width = `${percent}%`;
                          document.getElementById('progressPercentage').innerText = `${percent}%`;
    
                          // --- FIX: SMART ACTIVATION ---
                          const nextWaiting = activeAgents.find(key => {
                              const el = document.getElementById(`agent-card-${key}`);
                              return el && el.classList.contains('agent-status-waiting');
                          });
    
                          if (nextWaiting) {
                              updateAgentStatus(nextWaiting, 'active');
                          }
    
                      } else if (msg.type === 'result') {
                            // FINAL SUCCESS
                            analysisResults = msg.data;
                            
                            // Fix formatting if needed
                            if (analysisResults.guardrails) {
                                analysisResults.guardrails = analysisResults.guardrails.map(g => ({
                                    ...g,
                                    severity: g.risk_level || g.severity || "Medium",
                                    mechanism: g.recommendation || g.mechanism || "No recommendation provided.",
                                    triggers: Array.isArray(g.triggers) ? g.triggers : [],
                                    enforcement: g.enforcement || "Review",
                                    location: g.location || ""
                                }));
                            }
                            
                            document.getElementById('swarmStatusText').innerText = "Audit Complete!";
                            setTimeout(() => {
                                hideLoading();
                                displayResults(enableProfiling, enableRagDeepScan, enableGreenAI);
                                scrollToSummary();
                            }, 1000);
    
                        } else if (msg.type === 'error') {
                            throw new Error(msg.message);
                        }
                    } catch (e) {
                        console.warn("Stream parse error:", e);
                    }
                }
            }
    
        } catch (error) {
            console.error("Analysis failed:", error);
            hideLoading();
            showError(error.message || 'Connection lost.');
        }
    }
  
    function scrollToSummary() { 
        const el = document.getElementById("executive-summary");
        if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
    }

    const BG_ICONS = {
        active: `<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" /></svg>`,
        missing: `<svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" /></svg>`
    };
  
    // --- DISPLAY ENGINE ---
    function displayResults(enableProfiling, enableRagDeepScan, enableGreenAI) {
        if (!analysisResults) return;

        const container = document.getElementById('resultsSection');
        
        // 1. Calculate Stats
        const gapData = performGapAnalysis(analysisResults.guardrails);
        const presentGuardrails = analysisResults.guardrails.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        const missingGuardrails = analysisResults.guardrails.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");

        // Determine Theme for Score Card based on score
        let scoreColor = "text-red-500";
        let barColor = "bg-red-500";
        if (gapData.score >= 80) { scoreColor = "text-emerald-500"; barColor = "bg-emerald-500"; }
        else if (gapData.score >= 50) { scoreColor = "text-amber-500"; barColor = "bg-amber-500"; }

        // 2. Render Executive Summary
        const summaryGridCols = enableGreenAI ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3';

        const summaryHTML = `
        <div id="executive-summary" class="grid ${summaryGridCols} gap-6 mb-10 fade-in">
            
            <div class="relative group bg-white dark:bg-[#1e2130] rounded-none border border-slate-200 dark:border-slate-700 shadow-sm p-6 overflow-hidden transition-all hover:shadow-md aspect-square flex flex-col justify-between">
                <div class="absolute top-0 left-0 w-full h-1 ${barColor}"></div>
                
                <div class="absolute inset-0 flex flex-col items-center justify-center z-10">
                    ${renderScoreChart(gapData.score)}
                </div>

                <div class="absolute bottom-6 w-full text-center z-20">
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Safety Rating</p>
                </div>
            </div>

            <div onclick="window.guardrailAnalyzer.filterByStatus('active')" class="cursor-pointer relative group bg-white dark:bg-[#1e2130] rounded-none border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md aspect-square">
                <div class="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                
                <div class="absolute -bottom-6 -right-6 w-40 h-40 text-blue-50 dark:text-blue-900/10 opacity-50 dark:opacity-20 transform -rotate-12 transition-transform group-hover:scale-110 pointer-events-none">
                    ${BG_ICONS.active}
                </div>

                <div class="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <div class="text-8xl font-black text-blue-600 dark:text-blue-400 tracking-tighter drop-shadow-sm leading-none">
                        ${presentGuardrails.length}
                    </div>
                </div>

                <div class="absolute bottom-6 w-full text-center z-20">
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Active Guardrails</p>
                </div>
            </div>

            <div onclick="window.guardrailAnalyzer.filterByStatus('missing')" class="cursor-pointer relative group bg-white dark:bg-[#1e2130] rounded-none border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md aspect-square">
                <div class="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                
                <div class="absolute -bottom-6 -right-6 w-40 h-40 text-red-50 dark:text-red-900/10 opacity-50 dark:opacity-20 transform -rotate-12 transition-transform group-hover:scale-110 pointer-events-none">
                    ${BG_ICONS.missing}
                </div>

                <div class="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <div class="text-8xl font-black text-red-500 dark:text-red-400 tracking-tighter drop-shadow-sm leading-none">
                        ${missingGuardrails.length}
                    </div>
                </div>

                <div class="absolute bottom-6 w-full text-center z-20">
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Missing Guardrails</p>
                </div>
            </div>

            ${enableGreenAI ? `<div id="slot-green-ai" class="h-full"></div>` : ''}
        </div>`;

        const performanceRowHTML = enableProfiling ? `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12 fade-in">
                <div id="slot-latency-engine" class="lg:col-span-4 h-full"></div>
                <div id="slot-latency-waterfall" class="lg:col-span-8 h-full"></div>
            </div>` : '';

        const filterHTML = `
            <div class="sticky top-0 z-40 bg-slate-50/90 dark:bg-[#0f111a]/90 backdrop-blur-md py-4 mb-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 overflow-x-auto custom-scroll px-2" id="categoryFilters">
            </div>`;

        container.innerHTML = summaryHTML + filterHTML + '<div id="guardrailsDisplay" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20"></div>' + performanceRowHTML;

        // Initialize Modules
        if (enableGreenAI && window.greenAIMonitor) {
            window.greenAIMonitor.render(analysisResults.green_ai_analysis, 'slot-green-ai');
        }
        
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

    // --- CARD RENDERER (SQUARE Grid Tiles) ---
    function renderGuardrails(guardrails) { 
        const container = document.getElementById('guardrailsDisplay');
        if (guardrails.length === 0) { 
            container.innerHTML = `<div class="col-span-3 p-12 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-none">No results found.</div>`; 
            return; 
        }
        
        container.innerHTML = guardrails.map((g, idx) => {
             const isMissing = g.name.toUpperCase().startsWith('MISSING') || !g.location || g.location.trim() === "";
             
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
                    
                    <div class="w-16 h-16 mb-4 ${theme.text} transition-transform duration-500 group-hover:scale-110 opacity-90 flex items-center justify-center">
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
        if (!analysisResults) return;
        
        let pool = analysisResults.guardrails;
        if (currentStatusFilter === 'active') {
            pool = pool.filter(g => !g.name.toUpperCase().startsWith('MISSING') && g.location !== "");
        } else if (currentStatusFilter === 'missing') {
            pool = pool.filter(g => g.name.toUpperCase().startsWith('MISSING') || g.location === "");
        }

        const counts = {};
        pool.forEach(g => counts[g.category] = (counts[g.category] || 0) + 1);
        
        const allCats = ['all', ...new Set(analysisResults.guardrails.map(g => g.category))];
        
        const container = document.getElementById('categoryFilters');
        if (container) {
            container.innerHTML = allCats.map(cat => {
                const count = cat === 'all' ? pool.length : (counts[cat] || 0);
                const isSelected = currentCategoryFilter === cat;
                
                const activeClass = "bg-indigo-600 text-white shadow-lg border-transparent";
                const inactiveClass = "bg-white dark:bg-[#151925] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700";
                
                const opacityClass = count === 0 && cat !== 'all' ? "opacity-50" : "opacity-100";

                return `
                <button onclick="window.guardrailAnalyzer.filterByCategory('${escapeHtml(cat)}')" 
                    class="shrink-0 px-4 py-2 rounded-none text-xs font-bold transition-all duration-300 border flex items-center gap-2 ${isSelected ? activeClass : inactiveClass} ${opacityClass}">
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
    
    // --- ADDED MISSING HELPER ---
    function saveAsJson(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis_report_${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function exportJson() { if(analysisResults) saveAsJson(analysisResults); }
    function exportCsv() { if(analysisResults) { /* Implement CSV logic here */ } }

    function showLoading() { loadingState.classList.remove('hidden'); analyzeBtn.disabled = true; }
    function hideLoading() { loadingState.classList.add('hidden'); analyzeBtn.disabled = false; progressBar.style.width = '0%'; }
    function updateProgress(percent, text) { progressBar.style.width = percent + '%'; progressText.textContent = text; }
    function showError(msg) { errorState.classList.remove('hidden'); document.getElementById('errorMessage').innerText = msg; setTimeout(hideError, 5000); }
    function hideError() { errorState.classList.add('hidden'); }
    function hideResults() { resultsSection.classList.add('hidden'); }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

    window.guardrailAnalyzer = { 
        filterByCategory: filterByCategory, 
        filterByStatus: filterByStatus,
        version: '4.8.0-absolute-alignment' 
    };
})();