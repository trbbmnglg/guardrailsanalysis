(function() {
    'use strict';

    // --- CUSTOM "BIG LEAF" ILLUSTRATIONS (SVG) ---
    // A single, large leaf that changes health state.
    
    const PLANT_SVGS = {
        // 🌿 GREEN: Vibrant, Healthy, Upright Leaf
        green: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-xl filter saturate-110">
            <path d="M50 95 Q 50 80 50 65" stroke="#059669" stroke-width="4" stroke-linecap="round" />
            
            <path d="M50 75 Q 5 55 5 35 Q 20 5 50 15 Q 80 5 95 35 Q 95 55 50 75 Z" fill="#34D399" stroke="#059669" stroke-width="2" />
            
            <path d="M50 75 Q 50 45 50 20" stroke="#059669" stroke-width="2" stroke-linecap="round" />
            
            <path d="M50 60 L 25 45" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.6"/>
            <path d="M50 60 L 75 45" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.6"/>
            <path d="M50 45 L 30 30" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.6"/>
            <path d="M50 45 L 70 30" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.6"/>
            
            <circle cx="30" cy="35" r="3" fill="#E0F2FE" stroke="#BAE6FD" />
        </svg>`,

        // 🍂 AMBER: Yellowing, Curling Tip, Slightly Drooping
        amber: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-md">
            <path d="M50 95 Q 55 80 60 70" stroke="#D97706" stroke-width="3" stroke-linecap="round" />
            
            <path d="M60 70 Q 20 60 20 40 Q 30 15 60 30 Q 90 25 90 50 Q 85 70 60 70 Z" fill="#FBBF24" stroke="#D97706" stroke-width="2" />
            
            <path d="M60 70 Q 55 50 60 30" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-opacity="0.6" />
            
            <circle cx="40" cy="45" r="4" fill="#B45309" opacity="0.6" />
            <circle cx="75" cy="55" r="2" fill="#B45309" opacity="0.5" />
        </svg>`,

        // 🥀 RED: Withered, Brown, Crinkled, Holes
        red: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-sm opacity-90 filter sepia">
            <path d="M50 95 Q 60 90 65 85" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
            
            <path d="M65 85 Q 35 80 40 60 Q 30 40 50 45 Q 60 20 80 40 Q 95 45 90 70 Q 85 85 65 85 Z" fill="#92400E" stroke="#78350F" stroke-width="2" stroke-linejoin="round" />
            
            <path d="M65 85 Q 60 65 65 50" stroke="#78350F" stroke-width="1" />
            
            <path d="M55 55 L 60 60 L 52 65" stroke="#78350F" stroke-width="1" fill="none" />
            <circle cx="75" cy="55" r="3" fill="#78350F" opacity="0.3" />
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
                text: "text-emerald-700 dark:text-emerald-400",
                badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800",
                bar: "bg-emerald-500"
            },
            amber: {
                svg: PLANT_SVGS.amber,
                text: "text-amber-700 dark:text-amber-400",
                badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800",
                bar: "bg-amber-500"
            },
            red: {
                svg: PLANT_SVGS.red,
                text: "text-red-700 dark:text-red-400",
                badge: "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700",
                bar: "bg-red-500"
            }
        };

        const theme = config[statusLower] || config.green;

        // Note: We use h-full to ensure it fills the slot in the new 3-column layout
        const html = `
            <div class="h-full bg-white dark:bg-[#1e2130] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden fade-in flex flex-col hover:shadow-lg transition-shadow duration-300 hover:border-slate-300 dark:hover:border-slate-600">
                <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div class="flex items-center gap-2">
                        <span class="${theme.text}">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                        <h3 class="font-bold text-slate-700 dark:text-white text-xs uppercase tracking-widest">Carbon Impact</h3>
                    </div>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${theme.badge} border-opacity-50">
                        ${data.status} AI
                    </span>
                </div>

                <div class="p-6 flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50 dark:to-slate-800/30 opacity-50"></div>

                    <div class="w-32 h-32 mb-4 relative z-10 transition-transform duration-700 hover:scale-110 hover:-rotate-3">
                        ${theme.svg}
                    </div>

                    <div class="relative z-10">
                        <div class="text-5xl font-black ${theme.text} tracking-tighter mb-1">
                            ${data.energy_score}
                        </div>
                        <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
                            Efficiency Score
                        </div>
                        
                        <div class="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                             <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             <span class="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                                ~${data.estimated_kwh_per_1k_req || '0'} kWh <span class="text-slate-400 font-normal">/ 1k</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed">
                        "${data.optimization_tip}"
                    </p>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    window.greenAIMonitor = { render: render };
})();