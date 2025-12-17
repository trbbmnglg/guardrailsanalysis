// ... (Previous constants and helper functions remain the same) ...

    // Updated Render Function to support "Split Mode"
    function renderReport(guardrails, backendStrategy = null, targets = null) {
        
        const data = analyzeProfile(guardrails, backendStrategy);
        const colors = getTierColor(data.tierLevel);
        
        // 1. Generate ENGINE Card HTML
        const engineHTML = `
        <div class="h-full bg-white dark:bg-[#1e2130] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative flex flex-col transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600">
            <div class="absolute top-0 left-0 w-full h-1.5 ${colors.bg}"></div>
            <div class="p-6 flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-6">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors.border} ${colors.lightBg} ${colors.text} dark:bg-opacity-10 dark:border-opacity-20">
                        Tier ${data.tierLevel}
                    </span>
                    <div class="flex gap-0.5 opacity-50">
                        ${Array(4).fill(0).map((_, i) => `<div class="w-1.5 h-1.5 rounded-full ${i < data.tierLevel ? colors.bg : 'bg-slate-200 dark:bg-slate-700'}"></div>`).join('')}
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
                    <p class="text-xs text-slate-600 dark:text-slate-400 text-center leading-relaxed">"${data.model.description}"</p>
                </div>
                <div class="space-y-4">
                    <div class="flex justify-between items-end">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Load</label>
                        <span id="volumeDisplay" class="text-sm font-bold text-slate-700 dark:text-white">100k reqs</span>
                    </div>
                    <input type="range" id="volumeSlider" min="1" max="100" value="10" step="1" class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600">
                    <div class="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                        <span class="text-xs font-semibold text-slate-500">Est. Cost</span>
                        <div class="text-right">
                            <div id="monthlyCostDisplay" class="text-xl font-black text-slate-800 dark:text-white">$0.00</div>
                            <div class="text-[10px] text-slate-400">@ ~${formatCurrency(data.model.avgCostPer1M)} / 1M</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        // 2. Generate WATERFALL Stack HTML
        const waterfallHTML = `
        <div class="flex flex-col gap-6 h-full">
            <div class="bg-white dark:bg-[#1e2130] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex-1">
                <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h4 class="font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-widest flex items-center gap-2">
                        <span class="text-indigo-500">${ICONS.clock}</span> Latency Waterfall
                    </h4>
                    <div class="text-right">
                        <span class="block text-2xl font-black ${data.totalLatency > 1000 ? 'text-orange-500' : 'text-emerald-500'} tracking-tight">~${data.totalLatency}ms</span>
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Total Overhead</span>
                    </div>
                </div>
                <div class="space-y-3 max-h-[400px] overflow-y-auto custom-scroll pr-2">
                    ${data.breakdown.length === 0 ? '<p class="text-sm text-slate-400 italic">No measurable latency factors detected.</p>' : 
                      data.breakdown.map(item => {
                        const pct = Math.min(100, (item.baseCost / 1000) * 100);
                        const barColor = item.tier === 1 ? 'bg-amber-400' : item.tier === 2 ? 'bg-blue-400' : item.tier === 3 ? 'bg-indigo-400' : 'bg-purple-400';
                        return `
                        <div class="group flex items-center gap-4 text-xs">
                            <div class="w-16 font-mono text-slate-400 text-right">~${Math.round(item.baseCost * (item.tier > 1 ? data.model.latencyFactor : 1))}ms</div>
                            <div class="flex-1 relative h-6 bg-slate-50 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 flex items-center px-2">
                                <div class="absolute left-0 top-0 bottom-0 ${barColor} opacity-20" style="width: ${pct}%"></div>
                                <div class="absolute left-0 bottom-0 h-0.5 ${barColor}" style="width: ${pct}%"></div>
                                <span class="relative z-10 font-bold text-slate-700 dark:text-slate-300 truncate">${item.name}</span>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
            ${data.tips.length > 0 ? `
             <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${data.tips.map(tip => `
                    <div class="bg-white dark:bg-[#1e2130] p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-${tip.color}-300 dark:hover:border-${tip.color}-700 transition-colors shadow-sm flex gap-3">
                        <div class="shrink-0 w-8 h-8 rounded-lg bg-${tip.color}-50 dark:bg-${tip.color}-900/20 text-${tip.color}-600 dark:text-${tip.color}-400 flex items-center justify-center border border-${tip.color}-100 dark:border-${tip.color}-800">
                            ${tip.icon}
                        </div>
                        <div>
                            <h5 class="font-bold text-slate-800 dark:text-white text-[10px] uppercase tracking-wide mb-0.5">${tip.title}</h5>
                            <p class="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">${tip.desc}</p>
                        </div>
                    </div>`).join('')}
             </div>` : ''}
        </div>`;

        // 3. RENDER LOGIC
        if (targets && targets.engine && targets.waterfall) {
            // Split Rendering (New Layout)
            const engineContainer = document.getElementById(targets.engine);
            const waterfallContainer = document.getElementById(targets.waterfall);
            if (engineContainer) { engineContainer.innerHTML = engineHTML; engineContainer.classList.remove('hidden'); }
            if (waterfallContainer) { waterfallContainer.innerHTML = waterfallHTML; waterfallContainer.classList.remove('hidden'); }
        } else {
            // Legacy Rendering (Fallback)
            const container = document.getElementById('latencyReportSection');
            if (container) {
                container.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 fade-in"><div class="lg:col-span-1">${engineHTML}</div><div class="lg:col-span-2">${waterfallHTML}</div></div>`;
                container.classList.remove('hidden');
            }
        }

        // Attach Calculator Events
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
                const estimatedCost = (reqs * 500 / 1000000) * data.model.avgCostPer1M;
                volDisplay.textContent = reqs >= 1000000 ? (reqs / 1000000).toFixed(1) + 'M reqs' : formatNum(reqs) + ' reqs';
                costDisplay.textContent = formatCurrency(estimatedCost);
            };
            slider.addEventListener('input', update);
            slider.value = 24; update();
        }
    }
    
    window.latencyProfiler = { analyze: renderReport };
})();