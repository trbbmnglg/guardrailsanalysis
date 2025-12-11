// AI Agent Guardrail Analyzer - Enterprise Latency Profiler
(function() {
    'use strict';

    const MODEL_TIERS = {
        "tier1": { name: "DeepSeek-V3 / Llama 3.3", type: "Hyper-Efficient", avgCostPer1M: 0.27, latencyFactor: 0.2, description: "Late 2024/2025 efficiency kings. DeepSeek-V3 offers GPT-4 class intelligence at 1/10th the cost.", icon: "⚡" },
        "tier2": { name: "GPT-5-mini / Claude 4.5 Haiku", type: "Enterprise Standard", avgCostPer1M: 0.60, latencyFactor: 0.8, description: "The new standard for high-volume tasks. Balances speed with 'lite' reasoning capabilities.", icon: "⚖️" },
        "tier3": { name: "GPT-5 / Claude 4.5 Sonnet", type: "Frontier Reasoning", avgCostPer1M: 12.00, latencyFactor: 3.5, description: "State-of-the-art 2025 models. Required for 'Deep Think', complex agentic planning, and nuance.", icon: "🧠" },
        "tier4": { name: "Gemini 3 Pro / OpenAI o3", type: "Deep Reasoning / O-Series", avgCostPer1M: 25.00, latencyFactor: 10.0, description: "Specialized for extended reasoning (System 2 thinking). Extremely high latency but near-perfect accuracy.", icon: "🔮" }
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
            tips.push({ title: "Parallel Execution Pattern", icon: "⚡", impact: "High", desc: `You have ${parallelCandidates.length} independent checks. Running these in parallel (<code>Promise.all</code>) could save <b>~${Math.round(savedMs)}ms</b>.` });
        }
        if (tierLevel >= 2 && tierLevel <= 3) {
             tips.push({ title: "DeepSeek-V3 Offload", icon: "📉", impact: "High (Cost)", desc: `<b>Cost Saving:</b> Consider routing your classifiers and PII checks to <b>DeepSeek-V3</b>. It offers GPT-4 class performance at <b>$0.27/1M tokens</b>, significantly cheaper than GPT-5-mini.` });
        }
        const asyncCandidates = breakdown.filter(b => (b.name.toLowerCase().includes('audit') || b.name.toLowerCase().includes('log') || b.name.toLowerCase().includes('monitor')) && b.tier >= 2);
        if (asyncCandidates.length > 0) {
            tips.push({ title: "Async Post-Processing", icon: "⏳", impact: "Medium", desc: `Move the <b>${asyncCandidates[0].name}</b> check to a background job. Compliance logging should not block the user response.` });
        }
        if (tierLevel === 4) {
            tips.push({ title: "Reasoning Latency Warning", icon: "🐢", impact: "Critical", desc: "<b>User Experience Risk:</b> You are using 'System 2' reasoning models (Gemini 3 / o3). These models explicitly pause to 'think', adding seconds of latency. Ensure you show a 'Thinking...' UI state to the user." });
        }
        return tips;
    }

    function analyzeProfile(guardrails) {
        console.log('📊 analyzeProfile: Input count:', guardrails.length);
        
        let totalBaseLatency = 30; 
        let highestTier = 1; 
        let breakdown = [];

        guardrails.forEach(g => {
            // 1. Check if name starts with "MISSING" or location is empty
            if (g.name.toUpperCase().startsWith("MISSING") || !g.location || g.location.trim().length < 2) {
                return; // Skip this item - it incurs no latency
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

        // Default to Tier 1 if no active guardrails are found
        if (breakdown.length === 0) highestTier = 1;

        const tierKey = `tier${highestTier}`; 
        const model = MODEL_TIERS[tierKey];
        
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

    function renderReport(guardrails) {
      
        console.log('🔍 Latency Profiler: renderReport called');
        console.log('📊 Guardrails received:', guardrails.length);
  
        const container = document.getElementById('latencyReportSection');
        if (!container) {
            console.error('❌ latencyReportSection container not found!');
            return;
        }

        console.log('✅ Container found, analyzing...');
        const data = analyzeProfile(guardrails);

        console.log('📈 Analysis complete:', {
          tierLevel: data.tierLevel,
          totalLatency: data.totalLatency,
          breakdownCount: data.breakdown.length,
          tipsCount: data.tips.length
        });
        const isTier4 = data.tierLevel === 4;
        const isTier3 = data.tierLevel === 3;
        
        let cardBorder = "border-slate-200";
        let headerBg = "bg-slate-50";
        if (isTier4) { cardBorder = "border-purple-300"; headerBg = "bg-purple-50"; }
        else if (isTier3) { cardBorder = "border-orange-300"; headerBg = "bg-orange-50"; }

        const costIcons = '💰'.repeat(data.tierLevel);
        const speedIcon = data.tierLevel === 1 ? '⚡⚡⚡' : data.tierLevel === 2 ? '⚡⚡' : data.tierLevel === 3 ? '🐢' : '🐢🐢';

        function getLatencyColor(ms) {
            if (ms < 100) return "text-emerald-600";
            if (ms < 800) return "text-blue-600";
            return "text-orange-600";
        }
        function getTierBadge(tier) {
            if (tier === 1) return "bg-emerald-100 text-emerald-700";
            if (tier === 2) return "bg-blue-100 text-blue-700";
            if (tier === 3) return "bg-orange-100 text-orange-700";
            return "bg-purple-100 text-purple-700"; 
        }
        function getBarColor(tier) {
            if (tier === 1) return "bg-emerald-400";
            if (tier === 2) return "bg-blue-500";
            if (tier === 3) return "bg-orange-500";
            return "bg-purple-500"; 
        }

        const html = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 fade-in">
            <div class="col-span-1 bg-white rounded-lg shadow-sm border ${cardBorder} flex flex-col overflow-hidden">
                <div class="${headerBg} px-4 py-3 border-b border-opacity-50 flex justify-between items-center">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Infrastructure Profile</span>
                    <div class="flex gap-2 text-xs" title="Cost vs Speed Rating">
                        <span class="opacity-70">${costIcons}</span>
                        <span class="text-slate-300">|</span>
                        <span>${speedIcon}</span>
                    </div>
                </div>
                <div class="p-5 flex-1 flex flex-col">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="text-3xl">${data.model.icon}</span>
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
                            <span class="text-blue-600 text-lg">🔧</span>
                            <h3 class="font-bold text-blue-900 text-sm uppercase tracking-wide">Optimization Opportunities</h3>
                        </div>
                        <div class="divide-y divide-blue-50">
                            ${data.tips.map(tip => `
                                <div class="p-4 hover:bg-blue-50/50 transition-colors">
                                    <div class="flex items-start gap-3">
                                        <div class="mt-1 bg-white p-1.5 rounded border border-blue-100 text-lg shadow-sm">${tip.icon}</div>
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
        console.log('✅ Profiler rendered successfully!');

        
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
    // Expose the render function as 'analyze' so guardrails-analyzer.js can call it
    window.latencyProfiler = { analyze: renderReport };
    console.log('🚀 Enterprise Optimization Engine (2025 Hybrid Edition) Loaded');
})();