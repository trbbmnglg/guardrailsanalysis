(function() {
    'use strict';

    // --- CUSTOM PLANT ILLUSTRATIONS (SVG) ---
    // These paths mimic the "Peace Lily" style images provided.
    
    const PLANT_SVGS = {
        // 🌿 GREEN: Healthy, Upright Plant
        green: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-md">
            <path d="M35 65 L40 90 L60 90 L65 65 Z" fill="#E6D5C3" stroke="#D4B59E" stroke-width="2" stroke-linejoin="round"/>
            <path d="M32 65 L68 65" stroke="#D4B59E" stroke-width="2" stroke-linecap="round"/>
            
            <path d="M50 65 Q 50 45 50 30" stroke="#10B981" stroke-width="2" stroke-linecap="round" />
            <path d="M50 30 Q 35 20 30 35 Q 40 50 50 30" fill="#34D399" stroke="#10B981" stroke-width="1.5"/>
            
            <path d="M50 65 Q 70 50 80 40" stroke="#10B981" stroke-width="2" stroke-linecap="round" />
            <path d="M80 40 Q 90 25 70 25 Q 65 35 80 40" fill="#34D399" stroke="#10B981" stroke-width="1.5"/>
            
            <path d="M50 65 Q 30 50 20 40" stroke="#10B981" stroke-width="2" stroke-linecap="round" />
            <path d="M20 40 Q 10 25 30 25 Q 35 35 20 40" fill="#34D399" stroke="#10B981" stroke-width="1.5"/>
            
            <path d="M50 65 Q 45 40 45 20" stroke="#10B981" stroke-width="2" />
            <path d="M45 20 Q 40 5 50 5 Q 60 5 55 20" fill="#FEF3C7" stroke="#FDE68A" />
            <line x1="50" y1="10" x2="50" y2="18" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
        </svg>`,

        // 🍂 AMBER: Wilting, Drooping Plant
        amber: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-sm">
            <path d="M35 65 L40 90 L60 90 L65 65 Z" fill="#E6D5C3" stroke="#D4B59E" stroke-width="2" stroke-linejoin="round"/>
            <path d="M32 65 L68 65" stroke="#D4B59E" stroke-width="2" stroke-linecap="round"/>
            
            <path d="M50 65 Q 80 60 85 75" stroke="#D97706" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M85 75 Q 95 85 80 90 Q 75 80 85 75" fill="#FBBF24" stroke="#D97706" stroke-width="1.5"/>

            <path d="M50 65 Q 20 60 15 75" stroke="#D97706" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M15 75 Q 5 85 20 90 Q 25 80 15 75" fill="#FBBF24" stroke="#D97706" stroke-width="1.5"/>
            
            <path d="M50 65 Q 50 50 60 55" stroke="#D97706" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M60 55 Q 70 60 65 70 Q 55 65 60 55" fill="#F59E0B" stroke="#D97706" stroke-width="1.5"/>
        </svg>`,

        // 🥀 RED: Dead, Withered Brown Plant
        red: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-sm opacity-90">
            <path d="M35 65 L40 90 L60 90 L65 65 Z" fill="#E6D5C3" stroke="#D4B59E" stroke-width="2" stroke-linejoin="round"/>
            <path d="M32 65 L68 65" stroke="#D4B59E" stroke-width="2" stroke-linecap="round"/>
            
            <path d="M50 65 Q 85 65 90 90" stroke="#78350F" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M90 90 Q 95 95 85 98 Q 80 90 90 90" fill="#92400E" stroke="#78350F" stroke-width="1.5"/>

            <path d="M50 65 Q 15 65 10 90" stroke="#78350F" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M10 90 Q 5 95 15 98 Q 20 90 10 90" fill="#92400E" stroke="#78350F" stroke-width="1.5"/>
            
            <path d="M65 92 Q 75 92 80 95" stroke="#78350F" stroke-width="1"/>
            <path d="M80 95 Q 85 98 75 98 Q 70 95 80 95" fill="#78350F" opacity="0.6"/>
        </svg>`
    };

    function render(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !data || !data.status) return;

        const statusLower = String(data.status).toLowerCase();
        
        // Configuration per status
        const config = {
            green: {
                svg: PLANT_SVGS.green,
                bg: "bg-emerald-50",
                text: "text-emerald-900",
                badge: "bg-emerald-100 text-emerald-700",
                bar: "bg-emerald-500"
            },
            amber: {
                svg: PLANT_SVGS.amber,
                bg: "bg-amber-50",
                text: "text-amber-900",
                badge: "bg-amber-100 text-amber-700",
                bar: "bg-amber-500"
            },
            red: {
                svg: PLANT_SVGS.red,
                bg: "bg-stone-50", // Withered/Dead look
                text: "text-stone-800",
                badge: "bg-stone-200 text-stone-700",
                bar: "bg-stone-500"
            }
        };

        const theme = config[statusLower] || config.green;

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
                        <div class="w-24 h-24 mb-2 transition-transform duration-700 hover:scale-105">
                            ${theme.svg}
                        </div>
                        <span class="text-[10px] font-mono text-slate-400 uppercase">Est. Footprint</span>
                        <span class="text-xs font-bold text-slate-600">${data.estimated_kwh_per_1k_req || '0'} kWh / 1k</span>
                    </div>

                    <div class="md:col-span-6 border-l border-r border-slate-100 px-6 border-dashed">
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
                            <p class="text-sm text-slate-600 leading-relaxed line-clamp-3" title="${data.reasoning}">
                                ${data.reasoning}
                            </p>
                        </div>
                    </div>

                    <div class="md:col-span-4 bg-slate-50 rounded-lg p-4 border border-slate-100 h-full flex flex-col justify-center">
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