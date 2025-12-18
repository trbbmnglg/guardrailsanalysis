(function() {
    'use strict';
  
    const PLANT_SVGS = {
        green: `
            <svg viewBox="0 0 100 100" class="w-full h-full" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 60 C40 60 10 55 15 30 C25 20 45 40 50 60 Z" />
                <path d="M50 60 C60 60 90 55 85 30 C75 20 55 40 50 60 Z" />
                <path d="M50 60 C30 40 30 20 50 5 C70 20 70 40 50 60 Z" />
                <path d="M50 95 Q48 80 50 60" stroke="currentColor" stroke-width="3" fill="none" />
            </svg>
        `,
        amber: `<svg viewBox="0 0 100 100" fill="currentColor" class="w-full h-full"><path d="M50 15 Q 90 20 85 55 Q 80 90 50 85 Q 15 80 15 50 Q 20 15 50 15 Z" /></svg>`,
        red: `<svg viewBox="0 0 100 100" fill="currentColor" class="w-full h-full"><path d="M50 15 Q 80 25 80 50 Q 75 80 50 85 Q 20 80 20 50 Q 20 25 50 15 Z" /></svg>`
    };

    function render(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !data || !data.status) return;

        const statusLower = String(data.status).toLowerCase();
        
        // Config: Added 'bgIconColor' for the watermark
        const config = {
            green: { svg: PLANT_SVGS.green, border: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bgIconColor: "text-emerald-50 dark:text-emerald-900/20" },
            amber: { svg: PLANT_SVGS.amber, border: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", bgIconColor: "text-amber-50 dark:text-amber-900/20" },
            red: { svg: PLANT_SVGS.red, border: "bg-red-500", text: "text-red-500 dark:text-red-400", bgIconColor: "text-red-50 dark:text-red-900/20" }
        };

        const theme = config[statusLower] || config.green;

        const html = `
            <div class="relative group bg-white dark:bg-[#1e2130] rounded-none border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md aspect-square">
                
                <div class="absolute top-0 left-0 w-full h-1 ${theme.border}"></div>
                
                <div class="absolute -bottom-6 -right-6 w-40 h-40 ${theme.bgIconColor} opacity-60 dark:opacity-30 transform -rotate-12 transition-transform group-hover:scale-110 pointer-events-none">
                    ${theme.svg}
                </div>
                
                <div class="absolute inset-0 flex flex-col items-center justify-center z-10">
                    
                    <div class="text-8xl font-black ${theme.text} tracking-tighter drop-shadow-sm leading-none mb-2">
                        ${data.energy_score}
                    </div>

                    <div class="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm">
                         <svg class="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                         <span class="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            ~${data.estimated_kwh_per_1k_req || '0'} kWh
                        </span>
                    </div>
                </div>

                <div class="absolute bottom-6 w-full text-center z-20">
                    <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                        Green AI Score
                    </p>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    window.greenAIMonitor = { render: render };
})();