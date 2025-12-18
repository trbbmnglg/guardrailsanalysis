(function() {
    'use strict';

    const PLANT_SVGS = {
        green: `
        <svg viewBox="0 0 100 100" fill="none" class="w-full h-full drop-shadow-xl filter saturate-110">
            <path d="M50 15 Q 90 15 90 50 Q 90 85 50 85 Q 10 85 10 50 Q 10 15 50 15 Z" fill="#34D399" stroke="#059669" stroke-width="2" />
            <path d="M50 85 L 50 95" stroke="#059669" stroke-width="3" stroke-linecap="round" />
            <path d="M50 15 L 50 85" stroke="#059669" stroke-width="2" />
            <path d="M50 30 L 80 40" stroke="#059669" stroke-width="1.5" opacity="0.6"/>
            <path d="M50 30 L 20 40" stroke="#059669" stroke-width="1.5" opacity="0.6"/>
            <path d="M50 50 L 85 60" stroke="#059669" stroke-width="1.5" opacity="0.6"/>
            <path d="M50 50 L 15 60" stroke="#059669" stroke-width="1.5" opacity="0.6"/>
        </svg>`,
        amber: `<svg viewBox="0 0 100 100" fill="none" class="w-full h-full"><path d="M50 15 Q 90 20 85 55 Q 80 90 50 85 Q 15 80 15 50 Q 20 15 50 15 Z" fill="#FBBF24" stroke="#D97706" stroke-width="2" /></svg>`,
        red: `<svg viewBox="0 0 100 100" fill="none" class="w-full h-full"><path d="M50 15 Q 80 25 80 50 Q 75 80 50 85 Q 20 80 20 50 Q 20 25 50 15 Z" fill="#92400E" stroke="#78350F" stroke-width="2" /></svg>`
    };

    function render(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !data) return;

        const theme = { color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", svg: PLANT_SVGS.green };
        
        const html = `
            <div class="relative group bg-white dark:bg-[#1e2130] rounded-none border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md aspect-square">
                
                <div class="absolute top-0 left-0 w-full h-1 ${theme.color}"></div>
                
                <div class="absolute inset-0 flex flex-col items-center justify-center pb-16">
                    <div class="w-20 h-20 mb-2 transition-transform duration-700 hover:scale-110">
                        ${theme.svg}
                    </div>
                    <div class="text-7xl font-black ${theme.text} tracking-tighter drop-shadow-sm leading-none">
                        ${data.energy_score}
                    </div>
                </div>

                <div class="absolute bottom-14 w-full text-center">
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                        Green AI Score
                    </p>
                </div>
                
                <div class="absolute bottom-4 w-full flex justify-center">
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