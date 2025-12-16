(function() {
    'use strict';

    // Bold, recognizable Leaf/Sprout Icons
    const LEAF_SVGS = {
        green: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full text-emerald-600 drop-shadow-sm"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75M12 4.5v15" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 12a3 3 0 0 1 3-3 3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3z" /><path d="M2.05 13.5a9 9 0 0 1 19.9 0" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/></svg>`,
        
        // Using a distinct "Withered/Warning" leaf shape for Amber/Red
        amber: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18m0-18C7.5 3 4 6.5 4 10.5c0 2.5 1.5 4.5 3.5 5.5M12 3c4.5 0 8 3.5 8 7.5 0 2.5-1.5 4.5-3.5 5.5" /></svg>`,
        
        red: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full text-red-700"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>`
    };

    // Simple Leaf Path for general use
    const SIMPLE_LEAF = `<svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full"><path d="M11 20a7 7 0 0 1-1.2-13.9C15.5 5 17 4.48 19 2c1 2 2 6.5-2 11a7 7 0 0 1-6 7z"></path><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M11 20v-6"></path></svg>`;

    function render(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !data || !data.status) return;

        const statusLower = String(data.status).toLowerCase();
        
        // Configuration per status
        const config = {
            green: {
                icon: LEAF_SVGS.green, // Or switch to SIMPLE_LEAF and add class text-emerald-500
                bg: "bg-emerald-50",
                border: "border-emerald-200",
                text: "text-emerald-900",
                badge: "bg-emerald-100 text-emerald-700",
                bar: "bg-emerald-500"
            },
            amber: {
                icon: LEAF_SVGS.amber,
                bg: "bg-amber-50",
                border: "border-amber-200",
                text: "text-amber-900",
                badge: "bg-amber-100 text-amber-700",
                bar: "bg-amber-500"
            },
            red: {
                icon: LEAF_SVGS.red,
                bg: "bg-red-50",
                border: "border-red-200",
                text: "text-red-900",
                badge: "bg-red-100 text-red-700",
                bar: "bg-red-600"
            }
        };

        const theme = config[statusLower] || config.green;
        
        // Icon Logic: Use simple leaf for Green/Amber, Alert for Red
        const visualIcon = statusLower === 'red' ? LEAF_SVGS.red : SIMPLE_LEAF;
        const iconColor = statusLower === 'green' ? 'text-emerald-500' : (statusLower === 'amber' ? 'text-amber-500' : 'text-red-500');

        const html = `
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in">
                <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div class="flex items-center gap-2">
                        <span class="text-emerald-600">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                        <h3 class="font-bold text-slate-800 text-sm uppercase tracking-wide">Environmental Impact</h3>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${theme.badge} border-opacity-20">
                        ${data.status} AI
                    </span>
                </div>

                <div class="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    <div class="md:col-span-2 flex flex-col items-center justify-center text-center">
                        <div class="w-16 h-16 ${iconColor} drop-shadow-sm mb-2 transform hover:scale-110 transition-transform duration-500">
                            ${visualIcon}
                        </div>
                        <span class="text-[10px] font-mono text-slate-400 uppercase">Est. Footprint</span>
                        <span class="text-xs font-bold text-slate-600">${data.estimated_kwh_per_1k_req || '0'} kWh / 1k</span>
                    </div>

                    <div class="md:col-span-7 border-l border-r border-slate-100 px-6 border-dashed">
                        <div class="mb-4">
                            <div class="flex justify-between items-end mb-1">
                                <h4 class="text-sm font-bold text-slate-700">Efficiency Score</h4>
                                <span class="text-sm font-mono font-bold ${theme.text}">${data.energy_score}/100</span>
                            </div>
                            <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div class="h-full ${theme.bar} transition-all duration-1000" style="width: ${data.energy_score}%"></div>
                            </div>
                        </div>
                        
                        <div class="relative">
                            <p class="text-sm text-slate-600 leading-relaxed line-clamp-2" title="${data.reasoning}">
                                ${data.reasoning}
                            </p>
                        </div>
                    </div>

                    <div class="md:col-span-3 bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-green-600">🌱</span>
                            <span class="text-xs font-bold text-slate-500 uppercase">Quick Tip</span>
                        </div>
                        <p class="text-xs text-slate-600 font-medium italic leading-relaxed">
                            "${data.optimization_tip}"
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