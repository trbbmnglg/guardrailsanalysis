// static/green-ai-monitor.js
(function() {
    'use strict';

    const LEAF_SVGS = {
        green: `<svg viewBox="0 0 24 24" fill="none" class="w-full h-full text-emerald-500 drop-shadow-sm"><path d="M12 22C12 22 4 18 4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 4C11 4 16 4 18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22C12 22 13.5 17 11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="11" r="9" class="opacity-10 fill-emerald-200" stroke="none"/></svg>`,
        
        amber: `<svg viewBox="0 0 24 24" fill="none" class="w-full h-full text-amber-500 drop-shadow-sm"><path d="M12 21C12 21 5 17 5 11C5 7.68629 7.68629 5 11 5C14.3137 5 17 7.68629 17 11V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 5.5C16 5.5 19 6.5 20 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 21C12 21 13 17 11 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 8L7 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17 16L19 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
        
        red: `<svg viewBox="0 0 24 24" fill="none" class="w-full h-full text-amber-900 drop-shadow-md"><path d="M12 20.5C12 20.5 6 17 6 12C6 9.23858 8.23858 7 11 7C13.7614 7 16 9.23858 16 12V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 7C11 7 14 7 15 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 20.5C12 20.5 12.5 16.5 11 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10L6 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 15L18 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18 9L20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 14L2 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
    };

    function render(data, containerId) {
        const container = document.getElementById(containerId);
        
        // Defensive Check: Siguraduhing may container at may data.status
        if (!container || !data || !data.status) {
            console.warn("Green-AI Monitor: Data is incomplete or container not found.", { data, containerId });
            return;
        }

        // Safe conversion to lowercase to avoid TypeError
        const statusLower = String(data.status).toLowerCase();
        const iconObj = LEAF_SVGS[statusLower] || LEAF_SVGS.green;
        
        // Dynamic Colors Default (Green/Emerald)
        let bgClass = "bg-emerald-50 border-emerald-100";
        let textClass = "text-emerald-800";
        let barClass = "bg-emerald-500";
        
        if (statusLower === 'amber') {
            bgClass = "bg-amber-50 border-amber-100";
            textClass = "text-amber-800";
            barClass = "bg-amber-500";
        } else if (statusLower === 'red') {
            bgClass = "bg-stone-50 border-stone-200"; 
            textClass = "text-stone-800";
            barClass = "bg-amber-900";
        }

        // Use nullish coalescing (||) for fallback values in HTML template
        const html = `
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 fade-in h-full">
                <div class="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-32 gap-3">
                    <div class="w-20 h-20 transition-all duration-700 hover:scale-110">
                        ${iconObj}
                    </div>
                    <span class="text-xs font-bold uppercase tracking-widest ${textClass}">${data.status || 'UNKNOWN'} AI</span>
                </div>

                <div class="flex-1 flex flex-col justify-center">
                    <h3 class="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                        Energy Footprint
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200">
                            ${data.estimated_kwh_per_1k_req || '0'} kWh / 1k reqs
                        </span>
                    </h3>
                    <p class="text-sm text-slate-600 mb-4 leading-relaxed">
                        ${data.reasoning || 'No reasoning provided.'}
                    </p>

                    <div class="space-y-1 mb-4">
                        <div class="flex justify-between text-xs font-semibold text-slate-500">
                            <span>Efficiency Score</span>
                            <span>${data.energy_score || 0}/100</span>
                        </div>
                        <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full ${barClass} transition-all duration-1000" style="width: ${data.energy_score || 0}%"></div>
                        </div>
                    </div>

                    <div class="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-start gap-2">
                        <span class="text-green-600 mt-0.5">🌱</span>
                        <p class="text-xs text-slate-600 font-medium italic">
                            "${data.optimization_tip || 'Keep monitoring for better optimization.'}"
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    window.greenAIMonitor = { render: render };
})();