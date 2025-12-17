(function() {
    'use strict';

    // --- CUSTOM PLANT ILLUSTRATIONS (SVG) ---
    // These paths mimic the "Peace Lily" style images provided.
    
    const PLANT_SVGS = {
        // 🌿 GREEN: Healthy, Upright Plant
        green: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-xl filter">
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
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-md filter grayscale-[0.2]">
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
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-sm opacity-90 filter sepia contrast-125">
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
        
        // Configuration per status (Updated for Dark Mode)
        const config = {
            green: {
                svg: PLANT_SVGS.green,
                text: "text-emerald-600 dark:text-emerald-400",
                badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800",
                shadow: "shadow-emerald-100 dark:shadow-none"
            },
            amber: {
                svg: PLANT_SVGS.amber,
                text: "text-amber-600 dark:text-amber-400",
                badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800",
                shadow: "shadow-amber-100 dark:shadow-none"
            },
            red: {
                svg: PLANT_SVGS.red,
                text: "text-stone-600 dark:text-stone-400",
                badge: "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700",
                shadow: "shadow-stone-200 dark:shadow-none"
            }
        };

        const theme = config[statusLower] || config.green;

        const html = `
            <div class="relative group bg-white dark:bg-[#1e2130] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-visible fade-in p-10 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600">
                
                <div class="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
                    <div class="w-64 bg-slate-900/95 backdrop-blur text-white text-xs rounded-xl p-4 shadow-2xl border border-slate-700 text-left relative">
                        <div class="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-ping"></div>
                        <h4 class="font-bold text-indigo-300 mb-2 uppercase tracking-wide text-[10px]">AI Analysis</h4>
                        <p class="mb-3 text-slate-300 leading-relaxed">${data.reasoning}</p>
                        <div class="pt-3 border-t border-slate-700">
                            <span class="font-bold text-emerald-400 mb-1 block uppercase tracking-wide text-[10px]">Optimization Tip</span>
                            <p class="italic text-slate-400">"${data.optimization_tip}"</p>
                        </div>
                    </div>
                </div>

                <div class="absolute top-6 left-6">
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${theme.badge}">
                        ${data.status} AI
                    </span>
                </div>

                <div class="absolute top-6 right-6 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>

                <div class="w-56 h-56 mb-4 transition-transform duration-700 group-hover:scale-110 drop-shadow-2xl">
                    ${theme.svg}
                </div>

                <div class="relative z-10">
                    <div class="flex items-baseline justify-center gap-1">
                        <span class="text-6xl font-black ${theme.text} tracking-tighter">${data.energy_score}</span>
                        <span class="text-xl font-bold text-slate-300 dark:text-slate-600">/100</span>
                    </div>
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 mb-4">Green Efficiency Score</p>
                </div>

                <div class="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
                    <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span class="text-sm font-mono font-bold text-slate-600 dark:text-slate-300">
                        ~${data.estimated_kwh_per_1k_req || '0'} kWh <span class="text-slate-400 font-normal">/ 1k reqs</span>
                    </span>
                </div>

            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    window.greenAIMonitor = { render: render };
})();