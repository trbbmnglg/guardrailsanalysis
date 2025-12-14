// AI Agent Guardrail Analyzer - Enterprise Latency Profiler
(function() {
    'use strict';

    // SVG Icons Definition
    const ICONS = {
        lightning: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`,
        scale: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>`,
        cpu: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>`,
        sparkles: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>`,
        dollar: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        clock: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        boltSmall: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`,
        arrowsExpand: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>`,
        chartDown: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>`,
        hourglass: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        turtle: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        tools: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`
    };

    const MODEL_TIERS = {
        "tier1": { 
            name: "DeepSeek-V3 / Llama 3.3", 
            type: "Hyper-Efficient", 
            avgCostPer1M: 0.27, 
            latencyFactor: 0.2, 
            description: "Late 2024/2025 efficiency kings. DeepSeek-V3 offers GPT-4 class intelligence at 1/10th the cost.", 
            icon: ICONS.lightning,
            iconColor: "text-amber-500"
        },
        "tier2": { 
            name: "GPT-5-mini / Claude 4.5 Haiku", 
            type: "Enterprise Standard", 
            avgCostPer1M: 0.60, 
            latencyFactor: 0.8, 
            description: "The new standard for high-volume tasks. Balances speed with 'lite' reasoning capabilities.", 
            icon: ICONS.scale,
            iconColor: "text-blue-500"
        },
        "tier3": { 
            name: "GPT-5 / Claude 4.5 Sonnet", 
            type: "Frontier Reasoning", 
            avgCostPer1M: 12.00, 
            latencyFactor: 3.5, 
            description: "State-of-the-art 2025 models. Required for 'Deep Think', complex agentic planning, and nuance.", 
            icon: ICONS.cpu,
            iconColor: "text-indigo-500"
        },
        "tier4": { 
            name: "Gemini 3 Pro / OpenAI o3", 
            type: "Deep Reasoning / O-Series", 
            avgCostPer1M: 25.00, 
            latencyFactor: 10.0, 
            description: "Specialized for extended reasoning (System 2 thinking). Extremely high latency but near-perfect accuracy.", 
            icon: ICONS.sparkles,
            iconColor: "text-purple-600"
        }
    };

    const MECHANISM_COSTS = {
        "regex": { base: 2, label: "Regex Pattern", tier: 1 },
        "keyword": { base: 2, label: "Keyword Blocklist", tier: 1 },
        "schema": { base: 5, label: "JSON Schema", tier: 1 },
        "type_check": { base: 1, label: "Type Check", tier: 1 },
        "classifier": { base: 60, label: "Toxicity Classifier", tier: 2 },
        "ner": { base: 80, label: "PII Extraction", tier: 2 },
        "context_check": { base: 120, label: "Context Scan", tier: 2 },
        "embedding": { base: 100, label: "Vector Search (Qwen-Max)", tier: 3 },
        "rag": { base: 800, label: "Fact Verification", tier: 3 },
        "legal": { base: 900, label: "Legal Compliance", tier: 3 },
        "llm_judge": { base: 2500, label: "Deep Think Judge", tier: 4 },
        "agentic": { base: 3000, label: "Multi-Step Planning", tier: 4 }
    };

    function getOptimizationTips(breakdown, tierLevel) {
        let tips = [];
        const parallelCandidates = breakdown.filter(b => b.baseCost > 50); 
        if (parallelCandidates.length > 1) {
            const savedMs = parallelCandidates.reduce((acc, curr) => acc + curr.baseCost, 0) - Math.max(...parallelCandidates.map(b => b.baseCost));
            tips.push({ 
                title: "Parallel Execution Pattern", 
                icon: ICONS.arrowsExpand, 
                impact: "High", 
                desc: `You have ${parallelCandidates.length} independent checks. Running these in parallel (<code>Promise.all</code>) could save <b>~${Math.round(savedMs)}ms</b>.` 
            });
        }
        if (tierLevel >= 2 && tierLevel <= 3) {
             tips.push({ 
                 title: "DeepSeek-V3 Offload", 
                 icon: ICONS.chartDown, 
                 impact: "High (Cost)", 
                 desc: `<b>Cost Saving:</b> Consider routing your classifiers and PII checks to <b>DeepSeek-V3</b>. It offers GPT-4 class performance at <b>$0.27/1M tokens</b>, significantly cheaper than GPT-5-mini.` 
            });
        }
        const asyncCandidates = breakdown.filter(b => (b.name.toLowerCase().includes('audit') || b.name.toLowerCase().includes('log') || b.name.toLowerCase().includes('monitor')) && b.tier >= 2);
        if (asyncCandidates.length > 0) {
            tips.push({ 
                title: "Async Post-Processing", 
                icon: ICONS.hourglass, 
                impact: "Medium", 
                desc: `Move the <b>${asyncCandidates[0].name}</b> check to a background job. Compliance logging should not block the user response.` 
            });
        }
        if (tierLevel === 4) {
            tips.push({ 
                title: "Reasoning Latency Warning", 
                icon: ICONS.clock, 
                impact: "Critical", 
                desc: "<b>User Experience Risk:</b> You are using 'System 2' reasoning models (Gemini 3 / o3). These models explicitly pause to 'think', adding seconds of latency. Ensure you show a 'Thinking...' UI state to the user." 
            });
        }
        return tips;
    }

    // MAIN ANALYSIS FUNCTION (Hybrid Override Logic)
    function analyzeProfile(guardrails, backendStrategy) {
        console.log('📊 analyzeProfile: Input count:', guardrails.length);
        
        let totalBaseLatency = 30; 
        let highestTier = 1; 
        let breakdown = [];

        guardrails.forEach(g => {
            if (g.name.toUpperCase().startsWith("MISSING") || !g.location || g.location.trim().length < 2) {
                return; 
            }

            let tier = 1; 
            let mechLabel = "Standard Check"; 
            let mechKey = "regex";
            
            if (g.complexity_tier) { 
                tier = g.complexity_tier; 
                mechLabel = `AI Classified (Tier ${tier})`; 
            } else {
                const text = (g.description + " " + g.mechanism).toLowerCase();
                
                if (text.includes("deep think") || text.includes("reasoning chain") || text.includes("o3")) mechKey = "llm_judge";
                else if (text.includes("agent") || text.includes("plan")) mechKey = "agentic";
                else if (text.includes("fact") || text.includes("rag") || text.includes("source")) mechKey = "rag";
                else if (text.includes("gpt-5") || text.includes("claude 4.5")) mechKey = "legal";
                else if (text.includes("vector") || text.includes("qwen")) mechKey = "embedding";
                else if (text.includes("pii") || text.includes("anonymize")) mechKey = "ner";
                else if (text.includes("classifier") || text.includes("toxicity")) mechKey = "classifier";
                else if (text.includes("schema") || text.includes("json")) mechKey = "schema";
                
                const data = MECHANISM_COSTS[mechKey]; 
                if (data) {
                    tier = data.tier; 
                    mechLabel = data.label;
                }
            }

            if (tier > highestTier) highestTier = tier;
            
            let baseCost = 5; 
            if (tier === 2) baseCost = 80; 
            if (tier === 3) baseCost = 800; 
            if (tier === 4) baseCost = 2500;
            
            if (!g.complexity_tier && MECHANISM_COSTS[mechKey]) { 
                baseCost = MECHANISM_COSTS[mechKey].base; 
            }
            
            breakdown.push({ name: g.name, baseCost: baseCost, tier: tier, label: mechLabel });
        });

        if (breakdown.length === 0) highestTier = 1;

        // --- HYBRID OVERRIDE START ---
        let model;
        
        // If the backend AI (Cost Architect) provided a strategy, assume it knows best
        if (backendStrategy && backendStrategy.selected_tier) {
            console.log("⚡ Hybrid Mode: Applying AI Cost Architect Strategy...");
            
            // Try to extract the tier number from string "Tier 3" or similar
            const match = backendStrategy.selected_tier.match(/(\d)/);
            if (match) highestTier = parseInt(match[0]);
            
            const tierKey = `tier${highestTier}`; 
            model = MODEL_TIERS[tierKey] || MODEL_TIERS['tier2']; // Fallback safety

            // Use the AI's justification for the description if it's substantial
            if (backendStrategy.justification && backendStrategy.justification.length > 20) {
                model = { ...model, description: backendStrategy.justification };
            }
        } else {
            console.log("⚡ Client Mode: Using local tier calculation.");
            const tierKey = `tier${highestTier}`; 
            model = MODEL_TIERS[tierKey];
        }
        // --- HYBRID OVERRIDE END ---
        
        let finalLatency = 0; 
        breakdown.forEach(item => { 
            const multiplier = item.tier > 1 ? model.latencyFactor : 1; 
            finalLatency += (item.baseCost * multiplier); 
        });

        const optimizationTips = getOptimizationTips(breakdown, highestTier);
        
        return { 
            model: model, 
            tierLevel: highestTier, 
            totalLatency: Math.round(finalLatency + totalBaseLatency), 
            breakdown: breakdown.sort((a,b) => b.tier - a.tier), 
            tips: optimizationTips 
        };
    }

    const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    const formatNum = (num) => new Intl.NumberFormat('en-US').format(num);

    function renderReport(guardrails, backendStrategy = null) {
      
        console.log('🔍 Latency Profiler: renderReport called');
  
        const container = document.getElementById('latencyReportSection');
        if (!container) return;

        // PASS THE BACKEND STRATEGY TO THE ANALYSIS
        const data = analyzeProfile(guardrails, backendStrategy);
        const isTier4 = data.tierLevel === 4;
        const isTier3 = data.tierLevel === 3;
        
        let cardBorder = "border-slate-200";
        let headerBg = "bg-slate-50";
        if (isTier4) { cardBorder = "border-purple-300"; headerBg = "bg-purple-50"; }
        else if (isTier3) { cardBorder = "border-indigo-300"; headerBg = "bg-indigo-50"; }

        // GENERATE SVG REPEAT STRINGS
        // Cost Icon: Repeat Dollar Sign
        const costIconsHTML = Array(data.tierLevel).fill(ICONS.dollar).join('');
        
        // Speed Icon: Tier 1/2 = Bolt, Tier 3/4 = Clock
        let speedIconHTML = '';
        let speedColorClass = '';
        
        if (data.tierLevel === 1) {
            speedIconHTML = ICONS.boltSmall + ICONS.boltSmall + ICONS.boltSmall;
            speedColorClass = "text-amber-500";
        } else if (data.tierLevel === 2) {
            speedIconHTML = ICONS.boltSmall + ICONS.boltSmall;
            speedColorClass = "text-blue-500";
        } else if (data.tierLevel === 3) {
            speedIconHTML = ICONS.clock;
            speedColorClass = "text-indigo-500";
        } else {
            speedIconHTML = ICONS.clock + ICONS.clock;
            speedColorClass = "text-purple-500";
        }

        function getLatencyColor(ms) {
            if (ms < 100) return "text-emerald-600";
            if (ms < 800) return "text-blue-600";
            return "text-orange-600";
        }
        function getTierBadge(tier) {
            if (tier === 1) return "bg-emerald-100 text-emerald-700";
            if (tier === 2) return "bg-blue-100 text-blue-700";
            if (tier === 3) return "bg-indigo-100 text-indigo-700";
            return "bg-purple-100 text-purple-700"; 
        }
        function getBarColor(tier) {
            if (tier === 1) return "bg-emerald-400";
            if (tier === 2) return "bg-blue-500";
            if (tier === 3) return "bg-indigo-500";
            return "bg-purple-500"; 
        }

        const html = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 fade-in">
            <div class="col-span-1 bg-white rounded-lg shadow-sm border ${cardBorder} flex flex-col overflow-hidden">
                <div class="${headerBg} px-4 py-3 border-b border-opacity-50 flex justify-between items-center">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Infrastructure Profile</span>
                    
                    <div class="flex items-center gap-2" title="Cost vs Speed Rating">
                         <div class="flex items-center gap-0.5 opacity-60 text-slate-600" title="Cost Rating">
                            ${costIconsHTML}
                         </div>
                         <span class="text-slate-300 text-xs">|</span>
                         <div class="flex items-center gap-0.5 ${speedColorClass}" title="Latency Rating">
                            ${speedIconHTML}
                         </div>
                    </div>
                </div>
                <div class="p-5 flex-1 flex flex-col">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-8 h-8 ${data.model.iconColor}">
                            ${data.model.icon}
                        </div>
                        <h3 class="font-bold text-slate-800 text-lg leading-tight">${data.model.name}</h3>
                    </div>
                    <span class="inline-block bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium px-2 py-1 rounded w-fit mb-4">
                        ${data.model.type}
                    </span>
                    <p class="text-sm text-slate-600 mb-6 flex-1">${data.model.description}</p>
                    <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div class="flex justify-between items-end mb-2">
                            <label class="text-xs font-bold text-slate-500 uppercase">Monthly Volume</label>
                            <span id="volumeDisplay" class="text-sm font-bold text-blue-600">100,000 reqs</span>
                        </div>
                        <input type="range" id="volumeSlider" min="1" max="100" value="10" step="1" 
                               class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mb-4 accent-blue-600">
                        <div class="flex justify-between items-center border-t border-slate-200 pt-3">
                            <span class="text-xs text-slate-500">Est. Monthly Bill</span>
                            <div class="text-right">
                                <div id="monthlyCostDisplay" class="text-lg font-black text-slate-800">$0.00</div>
                                <div class="text-[10px] text-slate-400">@ ~${formatCurrency(data.model.avgCostPer1M)} / 1M</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-span-1 lg:col-span-2 flex flex-col gap-6">
                <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 class="font-bold text-slate-700 text-sm uppercase tracking-wide">Latency Waterfall</h3>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-400">Total Overhead:</span>
                            <span class="text-xl font-black ${getLatencyColor(data.totalLatency)}">${data.totalLatency}ms</span>
                        </div>
                    </div>
                    <div class="p-5 space-y-3">
                        ${data.breakdown.slice(0, 5).map(item => `
                            <div class="flex items-center gap-3 text-sm group">
                                <div class="w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${getTierBadge(item.tier)}">T${item.tier}</div>
                                <div class="w-1/3 truncate text-slate-700 font-medium" title="${item.name}">${item.name}</div>
                                <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div class="h-full rounded-full ${getBarColor(item.tier)}" style="width: ${Math.min(100, (item.baseCost / 1000) * 100)}%"></div>
                                </div>
                                <div class="w-20 text-right font-mono text-slate-400 text-xs">~${Math.round(item.baseCost * (item.tier > 1 ? data.model.latencyFactor : 1))}ms</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${data.tips.length > 0 ? `
                    <div class="bg-white rounded-lg shadow-sm border border-blue-100 overflow-hidden">
                        <div class="px-5 py-3 border-b border-blue-100 bg-blue-50 flex items-center gap-2">
                            <span class="text-blue-600">
                                ${ICONS.tools}
                            </span>
                            <h3 class="font-bold text-blue-900 text-sm uppercase tracking-wide">Optimization Opportunities</h3>
                        </div>
                        <div class="divide-y divide-blue-50">
                            ${data.tips.map(tip => `
                                <div class="p-4 hover:bg-blue-50/50 transition-colors">
                                    <div class="flex items-start gap-3">
                                        <div class="mt-1 bg-white p-1.5 rounded border border-blue-100 text-blue-500 shadow-sm">
                                            ${tip.icon}
                                        </div>
                                        <div>
                                            <h4 class="font-bold text-slate-800 text-sm mb-1">${tip.title}</h4>
                                            <p class="text-sm text-slate-600 leading-relaxed">${tip.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
        `;

        container.innerHTML = html;
        container.classList.remove('hidden');

        // Calculator Logic
        const slider = document.getElementById('volumeSlider');
        const volDisplay = document.getElementById('volumeDisplay');
        const costDisplay = document.getElementById('monthlyCostDisplay');
        
        if (slider && volDisplay && costDisplay) {
            const getVolume = (val) => {
                if (val <= 20) return val * 1000;
                if (val <= 60) return (val - 20) * 25000 + 20000;
                return (val - 60) * 250000 + 1000000;
            };
            const update = () => {
                const reqs = getVolume(slider.value);
                const totalTokens = reqs * 500; // AVG_TOKENS_PER_REQ
                const estimatedCost = (totalTokens / 1000000) * data.model.avgCostPer1M;
                volDisplay.textContent = reqs >= 1000000 ? (reqs / 1000000).toFixed(1) + 'M reqs' : formatNum(reqs) + ' reqs';
                costDisplay.textContent = formatCurrency(estimatedCost);
            };
            slider.addEventListener('input', update);
            slider.value = 24; 
            update();
        }
    }
    
    window.latencyProfiler = { analyze: renderReport };
    console.log('🚀 Enterprise Optimization Engine (2025 Hybrid Edition) Loaded');
})();