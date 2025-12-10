function analyzeProfile(guardrails) {
        let totalBaseLatency = 30; 
        let highestTier = 1; 
        let breakdown = [];

        guardrails.forEach(g => {
            // FIX: Skip this item if it is a "Missing" guardrail
            // In your system, missing guardrails have an empty 'location' string
            if (!g.location || g.location.trim() === "") {
                return; 
            }

            let tier = 1; 
            let mechLabel = "Standard Check"; 
            let mechKey = "regex"; 
            
            if (g.complexity_tier) { 
                tier = g.complexity_tier; 
                mechLabel = `AI Classified (Tier ${tier})`; 
            } else {
                const text = (g.description + " " + g.mechanism).toLowerCase();
                // ... (existing tier detection logic) ...
                if (text.includes("deep think") || text.includes("reasoning chain") || text.includes("o3")) mechKey = "llm_judge";
                else if (text.includes("agent") || text.includes("plan")) mechKey = "agentic";
                else if (text.includes("fact") || text.includes("rag") || text.includes("source")) mechKey = "rag";
                else if (text.includes("gpt-5") || text.includes("claude 4.5")) mechKey = "legal";
                else if (text.includes("vector") || text.includes("qwen")) mechKey = "embedding";
                else if (text.includes("pii") || text.includes("anonymize")) mechKey = "ner";
                else if (text.includes("classifier") || text.includes("toxicity")) mechKey = "classifier";
                else if (text.includes("schema") || text.includes("json")) mechKey = "schema";
                
                const data = MECHANISM_COSTS[mechKey]; 
                if (data) {
                    tier = data.tier; 
                    mechLabel = data.label;
                }
            }

            if (tier > highestTier) highestTier = tier;
            
            let baseCost = 5; 
            if (tier === 2) baseCost = 80; 
            if (tier === 3) baseCost = 800; 
            if (tier === 4) baseCost = 2500;
            
            if (!g.complexity_tier && MECHANISM_COSTS[mechKey]) { 
                baseCost = MECHANISM_COSTS[mechKey].base; 
            }
            
            breakdown.push({ name: g.name, baseCost: baseCost, tier: tier, label: mechLabel });
        });

        // Default to Tier 1 if no active guardrails are found
        if (breakdown.length === 0) highestTier = 1;

        const tierKey = `tier${highestTier}`; 
        const model = MODEL_TIERS[tierKey];
        
        let finalLatency = 0; 
        breakdown.forEach(item => { 
            const multiplier = item.tier > 1 ? model.latencyFactor : 1; 
            finalLatency += (item.baseCost * multiplier); 
        });

        const optimizationTips = getOptimizationTips(breakdown, highestTier);
        
        return { 
            model: model, 
            tierLevel: highestTier, 
            totalLatency: Math.round(finalLatency + totalBaseLatency), 
            breakdown: breakdown.sort((a,b) => b.tier - a.tier), 
            tips: optimizationTips 
        };
    }