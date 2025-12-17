// AI Agent Guardrail Analyzer - Enterprise Latency Profiler
(function() {
    'use strict';

    // --- 1. ASSETS & CONFIGURATION ---

    const ICONS = {
        lightning: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`,
        scale: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>`,
        cpu: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>`,
        sparkles: `<svg class="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>`,
        dollar: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        clock: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        boltSmall: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`,
        arrowsExpand: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>`,
        chartDown: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>`,
        hourglass: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        tools: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`
    };

    const MODEL_TIERS = {
        "tier1": { 
            name: "Llama 3.3 / DeepSeek", 
            type: "Hyper-Efficient", 
            avgCostPer1M: 0.27, 
            latencyFactor: 0.2, 
            description: "Maximum throughput for high-volume pattern matching.", 
            icon: ICONS.lightning,
            iconColor: "text-amber-500"
        },
        "tier2": { 
            name: "GPT-4o Mini / Haiku", 
            type: "Enterprise Standard", 
            avgCostPer1M: 0.60, 
            latencyFactor: 0.8, 
            description: "Balanced speed and intelligence for classification.", 
            icon: ICONS.scale,
            iconColor: "text-blue-500"
        },
        "tier3": { 
            name: "GPT-4o / Sonnet 3.5", 
            type: "Frontier Reasoning", 
            avgCostPer1M: 12.00, 
            latencyFactor: 3.5, 
            description: "High-fidelity reasoning for complex safety checks.", 
            icon: ICONS.cpu,
            iconColor: "text-indigo-500"
        },
        "tier4": { 
            name: "OpenAI o1 / o3", 
            type: "Chain-of-Thought", 
            avgCostPer1M: 25.00, 
            latencyFactor: 10.0, 
            description: "Deep research and extensive verification.", 
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
        "embedding": { base: 100, label: "Vector Search", tier: 3 },
        "rag": { base: 800, label: "Fact Verification", tier: 3 },
        "legal": { base: 900, label: "Legal Compliance", tier: 3 },
        "llm_judge": { base: 2500, label: "Deep Think Judge", tier: 4 },
        "agentic": { base: 3000, label: "Multi-Step Plan", tier: 4 }
    };

    // --- 2. LOGIC: ANALYSIS ENGINE ---

    function getOptimizationTips(breakdown, tierLevel) {
        let tips = [];
        const parallelCandidates = breakdown.filter(b => b.baseCost > 50); 
        
        if (parallelCandidates.length > 1) {
            const savedMs = parallelCandidates.reduce((acc, curr) => acc + curr.baseCost, 0) - Math.max(...parallelCandidates.map(b => b.baseCost));
            tips.push({ 
                title: "Parallel Execution", 
                icon: ICONS.arrowsExpand, 
                color: "blue",
                desc: `Running ${parallelCandidates.length} checks in parallel could save <b>~${Math.round(savedMs)}ms</b>.` 
            });
        }
        if (tierLevel >= 2 && tierLevel <= 3) {
             tips.push({ 
                 title: "Offload to DeepSeek", 
                 icon: ICONS.chartDown, 
                 color: "emerald",
                 desc: `Routing classifiers to DeepSeek-V3 can reduce costs by <b>~40%</b> vs GPT-4o-mini.` 
            });
        }
        const asyncCandidates = breakdown.filter(b => (b.name.toLowerCase().includes('audit') || b.name.toLowerCase().includes('log')) && b.tier >= 2);
        if (asyncCandidates.length > 0) {
            tips.push({ 
                title: "Async Processing", 
                icon: ICONS.hourglass, 
                color: "amber",
                desc: `Move <b>${asyncCandidates[0].name}</b> to a background job to unblock the UI.` 
            });
        }
        if (tierLevel === 4) {
            tips.push({ 
                title: "High Latency Warning", 
                icon: ICONS.clock, 
                color: "purple",
                desc: "System 2 models add significant delay. Ensure you have a 'Thinking...' UI state." 
            });
        }
        return tips;
    }

    function analyzeProfile(guardrails, backendStrategy) {
        let totalBaseLatency = 30; // Network overhead
        let highestTier = 1; 
        let breakdown = [];

        guardrails.forEach(g => {
            if (g.name.toUpperCase().startsWith("MISSING") || !g.location || g.location.trim().length < 2) return;

            let tier = 1; 
            let mechLabel = "Standard Check"; 
            let mechKey = "regex";
            
            if (g.complexity_tier) { 
                tier = g.complexity_tier; 
                mechLabel = `Tier ${tier} Check`; 
            } else {
                const text = (g.description + " " + g.mechanism).toLowerCase();
                if (text.includes("deep think") || text.includes("o1") || text.includes("o3")) mechKey = "llm_judge";
                else if (text.includes("agent") || text.includes("plan")) mechKey = "agentic";
                else if (text.includes("fact") || text.includes("rag")) mechKey = "rag";
                else if (text.includes("gpt-4") || text.includes("claude")) mechKey = "legal";
                else if (text.includes("vector")) mechKey = "embedding";
                else if (text.includes("pii")) mechKey = "ner";
                else if (text.includes("classifier")) mechKey = "classifier";
                else if (text.includes("schema")) mechKey = "schema";
                
                const data = MECHANISM_COSTS[mechKey]; 
                if (data) { tier = data.tier; mechLabel = data.label; }
            }

            if (tier > highestTier) highestTier = tier;
            let baseCost = MECHANISM_COSTS[mechKey] ? MECHANISM_COSTS[mechKey].base : 5;
            breakdown.push({ name: g.name, baseCost: baseCost, tier: tier, label: mechLabel });
        });

        if (breakdown.length === 0) highestTier = 1;

        // Hybrid Override
        let model;
        if (backendStrategy && backendStrategy.selected_tier) {
            const match = backendStrategy.selected_tier.match(/(\d)/);
            if (match) highestTier = parseInt(match[0]);
            const tierKey = `tier${highestTier}`; 
            model = MODEL_TIERS[tierKey] || MODEL_TIERS['tier2']; 
            if (backendStrategy.justification.length > 20) model = { ...model, description: backendStrategy.justification };
        } else {
            const tierKey = `tier${highestTier}`; 
            model = MODEL_TIERS[tierKey] || MODEL_TIERS['tier2'];
        }
        
        let finalLatency = 0; 
        breakdown.forEach(item => { 
            const multiplier = item.tier > 1 ? model.latencyFactor : 1; 
            finalLatency += (item.baseCost * multiplier); 
        });

        return { 
            model: model, 
            tierLevel: highestTier, 
            totalLatency: Math.round(finalLatency + totalBaseLatency), 
            breakdown: breakdown.sort((a,b) => b.tier - a.tier), 
            tips: getOptimizationTips(breakdown, highestTier) 
        };
    }

    // --- 3. UI HELPERS ---

    const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    const formatNum = (num) => new Intl.NumberFormat('en-US').format(num);

    function getTierColor(tier) {
        if (tier === 1) return { bg: "bg-amber-500", text: "text-amber-600", border: "border-amber-200", lightBg: "bg-amber-50" };
        if (tier === 2) return { bg: "bg-blue-500", text: "text-blue-600", border: "border-blue-200", lightBg: "bg-blue-50" };
        if (tier === 3) return { bg: "bg-indigo-500", text: "text-indigo-600", border: "border-indigo-200", lightBg: "bg-indigo-50" };
        return { bg: "bg-purple-600", text: "text-purple-600", border: "border-purple-200", lightBg: "bg-purple-50" };
    }

    // --- 4. RENDERER ---

    function renderReport(guardrails, backendStrategy = null) {
        const container = document.getElementById('latencyReportSection');
        if (!container) return;

        const data = analyzeProfile(guardrails, backendStrategy);
        const colors = getTierColor(data.tierLevel);
        
        // Dynamic HTML construction
        const html = `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 fade-in">
            
            <div class="lg:col-span-4 relative group">
                <div class="h-full bg-white dark:bg-[#1e2130] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative flex flex-col transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600">
                    
                    <div class="absolute top-0 left-0 w-full h-1.5 ${colors.bg}"></div>
                    
                    <div class="p-6 flex-1 flex flex-col">
                        <div class="flex items-center justify-between mb-6">
                            <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors.border} ${colors.lightBg} ${colors.text} dark:bg-opacity-10 dark:border-opacity-20">
                                Tier ${data.tierLevel} Engine
                            </span>
                            <div class="flex gap-0.5 opacity-50">
                                ${Array(4).fill(0).map((_, i) => 
                                    `<div class="w-1.5 h-1.5 rounded-full ${i < data.tierLevel ? colors.bg : 'bg-slate-200 dark:bg-slate-700'}"></div>`
                                ).join('')}
                            </div>
                        </div>

                        <div class="text-center mb-6">
                            <div class="w-20 h-20 mx-auto mb-4 ${data.model.iconColor} drop-shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                                ${data.model.icon}
                            </div>
                            <h3 class="text-xl font-black text-slate-800 dark:text-white leading-tight mb-1">${data.model.name}</h3>
                            <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">${data.model.type}</p>
                        </div>

                        <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-700 flex-1">
                            <p class="text-xs text-slate-600 dark:text-slate-400 text-center leading-relaxed">
                                "${data.model.description}"
                            </p>
                        </div>

                        <div class="space-y-4">
                            <div class="flex justify-between items-end">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Load</label>
                                <span id="volumeDisplay" class="text-sm font-bold text-slate-700 dark:text-white">100k reqs</span>
                            </div>
                            <input type="range" id="volumeSlider" min="1" max="100" value="10" step="1" 
                                   class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600">
                            
                            <div class="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                <span class="text-xs font-semibold text-slate-500">Est. Cost</span>
                                <div class="text-right">
                                    <div id="monthlyCostDisplay" class="text-xl font-black text-slate-800 dark:text-white">$0.00</div>
                                    <div class="text-[10px] text-slate-400">@ ~${formatCurrency(data.model.avgCostPer1M)} / 1M</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="lg:col-span-8 flex flex-col gap-6">
                
                <div class="bg-white dark:bg-[#1e2130] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <h4 class="font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-widest flex items-center gap-2">
                            <span class="text-indigo-500">${ICONS.clock}</span> Latency Waterfall
                        </h4>
                        <div class="text-right">
                            <span class="block text-2xl font-black ${data.totalLatency > 1000 ? 'text-orange-500' : 'text-emerald-500'} tracking-tight">
                                ~${data.totalLatency}ms
                            </span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase">Total Overhead</span>
                        </div>
                    </div>
                    
                    <div class="space-y-3 max-h-[300px] overflow-y-auto custom-scroll pr-2">
                        ${data.breakdown.length === 0 ? '<p class="text-sm text-slate-400 italic">No measurable latency factors detected.</p>' : 
                          data.breakdown.map(item => {
                            const pct = Math.min(100, (item.baseCost / 1000) * 100);
                            const tierColor = getTierColor(item.tier).text;
                            const barColor = item.tier === 1 ? 'bg-amber-400' : item.tier === 2 ? 'bg-blue-400' : item.tier === 3 ? 'bg-indigo-400' : 'bg-purple-400';
                            
                            return `
                            <div class="group flex items-center gap-4 text-xs">
                                <div class="w-16 font-mono text-slate-400 text-right">~${Math.round(item.baseCost * (item.tier > 1 ? data.model.latencyFactor : 1))}ms</div>
                                <div class="flex-1 relative h-8 bg-slate-50 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 flex items-center px-3">
                                    <div class="absolute left-0 top-0 bottom-0 ${barColor} opacity-20" style="width: ${pct}%"></div>
                                    <div class="absolute left-0 bottom-0 h-0.5 ${barColor}" style="width: ${pct}%"></div>
                                    <span class="relative z-10 font-bold text-slate-700 dark:text-slate-300 truncate">${item.name}</span>
                                </div>
                                <div class="w-20 text-right font-bold ${tierColor}">Tier ${item.tier}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

                ${data.tips.length > 0 ? `
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${data.tips.map(tip => `
                        <div class="bg-white dark:bg-[#1e2130] p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-${tip.color}-300 dark:hover:border-${tip.color}-700 transition-colors shadow-sm flex gap-4">
                            <div class="shrink-0 w-10 h-10 rounded-lg bg-${tip.color}-50 dark:bg-${tip.color}-900/20 text-${tip.color}-600 dark:text-${tip.color}-400 flex items-center justify-center border border-${tip.color}-100 dark:border-${tip.color}-800">
                                ${tip.icon}
                            </div>
                            <div>
                                <h5 class="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wide mb-1">${tip.title}</h5>
                                <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">${tip.desc}</p>
                            </div>
                        </div>
                    `).join('')}
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
})();