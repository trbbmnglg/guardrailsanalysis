(function() {
    'use strict';

    // --- CUSTOM PLANT ILLUSTRATIONS (SVG) ---
    // Scaled up and refined for larger display
    
    const PLANT_SVGS = {
        // 🌿 GREEN: Lush, Vibrant Plant
        green: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-2xl filter saturate-110">
            <path d="M30 65 L35 90 L65 90 L70 65 Z" fill="#E6D5C3" stroke="#D4B59E" stroke-width="2" stroke-linejoin="round"/>
            <path d="M28 65 L72 65" stroke="#D4B59E" stroke-width="2" stroke-linecap="round"/>
            
            <path d="M50 65 Q 20 50 15 35 Q 30 25 50 65" fill="#10B981" stroke="#059669" stroke-width="1" />
            <path d="M50 65 Q 80 50 85 35 Q 70 25 50 65" fill="#10B981" stroke="#059669" stroke-width="1" />
            
            <path d="M50 65 Q 50 40 50 25" stroke="#059669" stroke-width="3" stroke-linecap="round" />
            
            <path d="M50 25 Q 30 10 50 0 Q 70 10 50 25" fill="#34D399" stroke="#059669" stroke-width="1.5"/>
            <path d="M50 25 L 50 5" stroke="#059669" stroke-width="0.5" stroke-opacity="0.5" />
            
            <circle cx="50" cy="15" r="3" fill="#FEF3C7" stroke="#F59E0B" />
        </svg>`,

        // 🍂 AMBER: Drooping, Slight Wilting
        amber: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-xl">
            <path d="M30 65 L35 90 L65 90 L70 65 Z" fill="#E6D5C3" stroke="#D4B59E" stroke-width="2" stroke-linejoin="round"/>
            <path d="M28 65 L72 65" stroke="#D4B59E" stroke-width="2" stroke-linecap="round"/>
            
            <path d="M50 65 Q 80 60 85 80" stroke="#D97706" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M50 65 Q 20 60 15 80" stroke="#D97706" stroke-width="2" stroke-linecap="round" fill="none"/>
            
            <path d="M85 80 Q 95 90 80 95 Q 75 85 85 80" fill="#FBBF24" stroke="#D97706" stroke-width="1.5"/>
            <path d="M15 80 Q 5 90 20 95 Q 25 85 15 80" fill="#FBBF24" stroke="#D97706" stroke-width="1.5"/>
            
            <path d="M50 65 Q 50 45 55 40 Q 60 45 50 65" fill="#FCD34D" stroke="#D97706" stroke-width="1"/>
        </svg>`,

        // 🥀 RED: Withered, Bare
        red: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-lg opacity-90 sepia-[.5]">
            <path d="M30 65 L35 90 L65 90 L70 65 Z" fill="#E6D5C3" stroke="#D4B59E" stroke-width="2" stroke-linejoin="round"/>
            <path d="M28 65 L72 65" stroke="#D4B59E" stroke-width="2" stroke-linecap="round"/>
            <path d="M40 70 L 45 80 L 42 85" stroke="#B45309" stroke-width="1" fill="none"/>
            
            <path d="M50 65 Q 85 65 90 90" stroke="#78350F" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M50 65 Q 15 65 10 90" stroke="#78350F" stroke-width="2" stroke-linecap="round" fill="none"/>
            
            <path d="M90 90 Q 95 95 85 98 Q 80 90 90 90" fill="#92400E" stroke="#78350F" stroke-width="1.5"/>
            <path d="M10 90 Q 5 95 15 98 Q 20 90 10 90" fill="#92400E" stroke="#78350F" stroke-width="1.5"/>
        </svg>`
    };

    function render(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !data || !data.status) return;

        const statusLower = String(data.status).toLowerCase();
        
        // --- Theme Configuration ---
        const config = {
            green: {
                svg: PLANT_SVGS.green,
                bgGradient: "from-emerald-50 to-white dark:from-emerald-900/20 dark:to-[#1e2130]",
                textMain: "text-emerald-700 dark:text-emerald-400",
                badge: "bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none",
                ring: "ring-emerald-100 dark:ring-emerald-900",
                scoreColor: "text-emerald-600 dark:text-emerald-400"
            },
            amber: {
                svg: PLANT_SVGS.amber,
                bgGradient: "from-amber-50 to-white dark:from-amber-900/20 dark:to-[#1e2130]",
                textMain: "text-amber-700 dark:text-amber-400",
                badge: "bg-amber-500 text-white shadow-amber-200 dark:shadow-none",
                ring: "ring-amber-100 dark:ring-amber-900",
                scoreColor: "text-amber-600 dark:text-amber-400"
            },
            red: {
                svg: PLANT_SVGS.red,
                bgGradient: "from-stone-50 to-white dark:from-red-900/10 dark:to-[#1e2130]",
                textMain: "text-stone-700 dark:text-stone-400",
                badge: "bg-red-500 text-white shadow-stone-200 dark:shadow-none",
                ring: "ring-stone-100 dark:ring-stone-900",
                scoreColor: "text-red-500 dark:text-red-400"
            }
        };

        const theme = config[statusLower] || config.green;

        const html = `
            <div class="relative group max-w-sm mx-auto bg-gradient-to-b ${theme.bgGradient} rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-white/50 dark:border-slate-700 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
                
                <div class="absolute top-6 left-6 z-20">
                    <span class="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg ${theme.badge}">
                        ${data.status} AI
                    </span>
                </div>

                <div class="absolute top-6 right-6 z-20 text-slate-300 dark:text-slate-600 animate-pulse">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>

                <div class="p-8 pb-12 flex flex-col items-center justify-center text-center relative z-10">
                    
                    <div class="w-72 h-72 -mt-4 mb-2 transition-transform duration-700 group-hover:scale-105 group-hover:-translate-y-4">
                        ${theme.svg}
                    </div>

                    <div class="flex flex-col items-center transition-all duration-300 group-hover:opacity-20 group-hover:blur-sm">
                        <div class="text-7xl font-black ${theme.scoreColor} tracking-tighter drop-shadow-sm">
                            ${data.energy_score}
                        </div>
                        <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
                            Efficiency Score
                        </div>
                        
                        <div class="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <span class="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                                ⚡ ${data.estimated_kwh_per_1k_req || '0'} kWh <span class="text-slate-400 font-normal">/ 1k reqs</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="absolute inset-x-0 bottom-0 z-30 transform translate-y-[105%] transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) group-hover:translate-y-0">
                    <div class="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-t border-white/20 dark:border-slate-700 p-6 rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                        
                        <div class="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>

                        <div class="space-y-4 text-left">
                            <div>
                                <h4 class="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                    Impact Analysis
                                </h4>
                                <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                    ${data.reasoning}
                                </p>
                            </div>

                            <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 class="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Optimization Strategy
                                </h4>
                                <p class="text-sm text-slate-500 dark:text-slate-400 italic">
                                    "${data.optimization_tip}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    window.greenAIMonitor = { render: render };
})();