(function() {
    'use strict';

    // --- CUSTOM "BIG LEAF" ILLUSTRATIONS (SVG) ---
    const PLANT_SVGS = {
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
        amber: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-md">
            <path d="M50 95 Q 55 80 60 70" stroke="#D97706" stroke-width="3" stroke-linecap="round" />
            <path d="M60 70 Q 20 60 20 40 Q 30 15 60 30 Q 90 25 90 50 Q 85 70 60 70 Z" fill="#FBBF24" stroke="#D97706" stroke-width="2" />
            <path d="M60 70 Q 55 50 60 30" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-opacity="0.6" />
            <circle cx="40" cy="45" r="4" fill="#B45309" opacity="0.6" />
        </svg>`,
        red: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-sm opacity-90 filter sepia">
            <path d="M50 95 Q 60 90 65 85" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
            <path d="M65 85 Q 35 80 40 60 Q 30 40 50 45 Q 60 20 80 40 Q 95 45 90 70 Q 85 85 65 85 Z" fill="#92400E" stroke="#78350F" stroke-width="2" stroke-linejoin="round" />
            <path d="M65 85 Q 60 65 65 50" stroke="#78350F" stroke-width="1" />
            <circle cx="75" cy="55" r="3" fill="#78350F" opacity="0.3" />
        </svg>`
    };

    function render(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !data || !data.status) return;

        const statusLower = String(data.status).toLowerCase();
        
        // Configuration: Matching Summary Cards (Square, Top Border Only)
        const config = {
            green: { svg: PLANT_SVGS.green, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
            amber: { svg: PLANT_SVGS.amber, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
            red: { svg: PLANT_SVGS.red, color: "bg-red-500", text: "text-red-500 dark:text-red-400" }
        };

        const theme = config[statusLower] || config.green;

        // Matches 'Safety Score' card structure EXACTLY
        const html = `
            <div class="relative group bg-white dark:bg-[#1e2130] rounded-none border border-slate-200 dark:border-slate-700 shadow-sm p-6 overflow-hidden transition-all hover:shadow-md aspect-square flex flex-col justify-center items-center h-full">
                
                <div class="absolute top-0 left-0 w-full h-1 ${theme.color}"></div>
                
                <div class="flex items-center gap-2 mb-2 absolute top-6 left-6">
                    <span class="px-2 py-0.5 rounded-none text-[10px] font-black uppercase tracking-widest ${theme.color} text-white">
                        Carbon Impact
                    </span>
                </div>

                <div class="w-40 h-40 mt-4 mb-2 transition-transform duration-700 hover:scale-110">
                    ${theme.svg}
                </div>

                <div class="text-center">
                    <div class="text-7xl font-black ${theme.text} tracking-tighter drop-shadow-sm mb-1">
                        ${data.energy_score}
                    </div>
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">
                        Green AI Score
                    </p>
                    
                    <div class="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-none border border-slate-200 dark:border-slate-700">
                         <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                         <span class="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            ~${data.estimated_kwh_per_1k_req || '0'} kWh <span class="text-slate-400 font-normal">/ 1k</span>
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    window.greenAIMonitor = { render: render };
})();