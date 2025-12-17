(function() {
    'use strict';

    // --- CUSTOM "SIMPLE LEAF" ILLUSTRATION (SVG) ---
    // Reference: Single broad leaf with veins
    const PLANT_SVGS = {
        green: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-xl filter saturate-110">
            <path d="M50 15 Q 90 15 90 50 Q 90 85 50 85 Q 10 85 10 50 Q 10 15 50 15 Z" fill="#34D399" stroke="#059669" stroke-width="2" />
            <path d="M50 85 L 50 95" stroke="#059669" stroke-width="3" stroke-linecap="round" />
            <path d="M50 15 L 50 85" stroke="#059669" stroke-width="2" />
            <path d="M50 30 L 80 40" stroke="#059669" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
            <path d="M50 30 L 20 40" stroke="#059669" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
            <path d="M50 50 L 85 60" stroke="#059669" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
            <path d="M50 50 L 15 60" stroke="#059669" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
            <path d="M50 70 L 75 78" stroke="#059669" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
            <path d="M50 70 L 25 78" stroke="#059669" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
        </svg>`,
        amber: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-md">
            <path d="M50 15 Q 90 20 85 55 Q 80 90 50 85 Q 15 80 15 50 Q 20 15 50 15 Z" fill="#FBBF24" stroke="#D97706" stroke-width="2" />
            <path d="M50 85 L 55 95" stroke="#D97706" stroke-width="3" stroke-linecap="round" />
            <path d="M50 15 Q 55 50 50 85" stroke="#D97706" stroke-width="2" />
        </svg>`,
        red: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-sm opacity-90 sepia">
            <path d="M50 15 Q 80 25 80 50 Q 75 80 50 85 Q 20 80 20 50 Q 20 25 50 15 Z" fill="#92400E" stroke="#78350F" stroke-width="2" />
            <path d="M50 85 L 45 95" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
            <path d="M50 15 L 50 85" stroke="#78350F" stroke-width="2" />
            <circle cx="35" cy="40" r="3" fill="#78350F" opacity="0.4"/>
        </svg>`
    };

    function render(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !data || !data.status) return;

        const statusLower = String(data.status).toLowerCase();
        
        const config = {
            green: { svg: PLANT_SVGS.green, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
            amber: { svg: PLANT_SVGS.amber, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
            red: { svg: PLANT_SVGS.red, color: "bg-red-500", text: "text-red-500 dark:text-red-400" }
        };

        const theme = config[statusLower] || config.green;

        // ALIGNMENT STRATEGY:
        // 1. Fixed height container for visual (h-32) to match Safety Circle
        // 2. Text sizing adjusted
        const html = `
            <div class="relative group bg-white dark:bg-[#1e2130] rounded-none border border-slate-200 dark:border-slate-700 shadow-sm p-6 overflow-hidden transition-all hover:shadow-md aspect-square flex flex-col justify-center items-center h-full">
                
                <div class="absolute top-0 left-0 w-full h-1 ${theme.color}"></div>
                
                <div class="h-28 w-full flex items-center justify-center mb-2">
                    <div class="w-24 h-24 transition-transform duration-700 hover:scale-110">
                        ${theme.svg}
                    </div>
                </div>

                <div class="text-center w-full">
                    <div class="text-7xl font-black ${theme.text} tracking-tighter drop-shadow-sm mb-2 leading-none">
                        ${data.energy_score}
                    </div>
                    
                    <div class="h-6 flex items-center justify-center mb-4">
                        <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                            Green AI Score
                        </p>
                    </div>
                    
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