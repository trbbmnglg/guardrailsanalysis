(function() {
    'use strict';

    // --- CUSTOM "SIMPLE LEAF" ILLUSTRATION (SVG) ---
    const PLANT_SVGS = {
        green: `
              <style>
                  .leaf-blade { fill: #1E7F43; } /* Dark Green */
                  .leaf-vein { stroke: #6BC46D; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; fill: none; } /* Light Green */
                </style>
                <path class="leaf-blade" d="M50 60 C40 60 10 55 15 30 C25 20 45 40 50 60 Z" />
                <path class="leaf-blade" d="M50 60 C60 60 90 55 85 30 C75 20 55 40 50 60 Z" />
                <path class="leaf-blade" d="M50 60 C30 40 30 20 50 5 C70 20 70 40 50 60 Z" />
                <path class="leaf-vein" d="M50 95 Q48 80 50 60" stroke-width="3" />
                <path class="leaf-vein" d="M50 60 L50 20" stroke-width="2" />
                <path class="leaf-vein" d="M50 60 Q40 50 25 38" stroke-width="2" />
                <path class="leaf-vein" d="M50 60 Q60 50 75 38" stroke-width="2" />
              </svg>
              `,
        amber: `<svg viewBox="0 0 100 100" fill="none" class="w-full h-full"><path d="M50 15 Q 90 20 85 55 Q 80 90 50 85 Q 15 80 15 50 Q 20 15 50 15 Z" fill="#FBBF24" stroke="#D97706" stroke-width="2" /></svg>`,
        red: `<svg viewBox="0 0 100 100" fill="none" class="w-full h-full"><path d="M50 15 Q 80 25 80 50 Q 75 80 50 85 Q 20 80 20 50 Q 20 25 50 15 Z" fill="#92400E" stroke="#78350F" stroke-width="2" /></svg>`
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

        // ALIGNMENT FIX:
        // 1. Label at absolute bottom-8 (Aligns with other cards)
        // 2. Content centered in remaining top space
        // 3. Pill inserted below score number
        
        const html = `
            <div class="relative group bg-white dark:bg-[#1e2130] rounded-none border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md aspect-square flex flex-col items-center">
                
                <div class="absolute top-0 left-0 w-full h-1 ${theme.color}"></div>
                
                <div class="flex-1 flex flex-col items-center justify-center pb-8">
                    <div class="w-20 h-20 mb-2 transition-transform duration-700 hover:scale-110">
                        ${theme.svg}
                    </div>
                    
                    <div class="text-8xl font-black ${theme.text} tracking-tighter drop-shadow-sm leading-none mb-1">
                        ${data.energy_score}
                    </div>

                    <div class="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-none border border-slate-200 dark:border-slate-700">
                         <svg class="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                         <span class="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            ~${data.estimated_kwh_per_1k_req || '0'} kWh <span class="text-slate-400 font-normal">/ 1k</span>
                        </span>
                    </div>
                </div>

                <div class="absolute bottom-8 w-full text-center">
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