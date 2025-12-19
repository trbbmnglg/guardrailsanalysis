// v3/static/js/guardrails-analyzer.js

// ... (Keep initAgentGrid and AGENT_DEFS constants from previous step) ...

// --- Helper: Update Single Agent Status (Real-Time) ---
function updateAgentStatus(key, status) {
    const card = document.getElementById(`agent-card-${key}`);
    const icon = document.getElementById(`agent-icon-${key}`);
    const spinner = document.getElementById(`agent-spinner-${key}`);
    const bar = document.getElementById(`agent-bar-${key}`);
    
    if (!card) return;

    if (status === 'active') {
        card.classList.remove('agent-status-waiting', 'agent-status-completed');
        card.classList.add('agent-status-active');
        spinner.classList.remove('hidden');
        icon.classList.add('hidden');
        bar.style.width = '60%'; // Indeterminate
        
        // Scroll slightly to keep active agent in view if needed
        // card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        const name = AGENT_DEFS[key]?.name || 'Agent';
        document.getElementById('swarmStatusText').innerText = `${name} is auditing...`;
        
    } else if (status === 'completed') {
        card.classList.remove('agent-status-active', 'agent-status-waiting');
        card.classList.add('agent-status-completed');
        spinner.classList.add('hidden');
        icon.classList.remove('hidden');
        bar.style.width = '100%';
    }
}

async function analyzeInstruction(apiKey, instruction) {
    hideError();
    hideResults();
    showLoading(); // Shows the Agent Grid

    const enableProfiling = document.getElementById('aiProfilingToggle')?.checked || false;
    const enableRagDeepScan = document.getElementById('enableRagDeepScan')?.checked || false;
    const enableGreenAI = document.getElementById('greenAIToggle')?.checked || false;
    const selectedEngine = document.querySelector('input[name="engineOption"]:checked')?.value || 'deepseek';

    // 1. DETERMINE AGENT LIST & INIT GRID
    let activeAgents = ['security', 'privacy', 'rai', 'qa'];
    if (enableProfiling) activeAgents.push('cost');
    if (enableGreenAI) activeAgents.push('green');
    activeAgents.push('governance');
    
    initAgentGrid(activeAgents);
    
    // Set first agent to active initially
    updateAgentStatus(activeAgents[0], 'active');

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                instruction: instruction, 
                api_key: apiKey,
                enable_profiling: enableProfiling, 
                enable_rag_deep_scan: enableRagDeepScan,
                enable_greenai_analysis: enableGreenAI,
                analysis_engine: selectedEngine
            })
        });

        if (!response.ok) throw new Error(`Server Error: ${response.status}`);

        // 2. READ STREAM
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let completedCount = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const msg = JSON.parse(line);
                    
                    if (msg.type === 'progress') {
                        // Mark current as done
                        updateAgentStatus(msg.agent, 'completed');
                        completedCount++;
                        
                        // Update Progress Bar
                        const percent = Math.round((completedCount / activeAgents.length) * 100);
                        document.getElementById('progressBar').style.width = `${percent}%`;
                        document.getElementById('progressPercentage').innerText = `${percent}%`;

                        // Activate next agent
                        const nextIdx = activeAgents.indexOf(msg.agent) + 1;
                        if (nextIdx < activeAgents.length) {
                            updateAgentStatus(activeAgents[nextIdx], 'active');
                        }

                    } else if (msg.type === 'result') {
                        // FINAL SUCCESS
                        analysisResults = msg.data;
                        
                        // Fix formatting if needed
                        if (analysisResults.guardrails) {
                            analysisResults.guardrails = analysisResults.guardrails.map(g => ({
                                ...g,
                                severity: g.risk_level || g.severity || "Medium",
                                mechanism: g.recommendation || g.mechanism || "No recommendation provided.",
                                triggers: Array.isArray(g.triggers) ? g.triggers : [],
                                enforcement: g.enforcement || "Review",
                                location: g.location || ""
                            }));
                        }
                        
                        document.getElementById('swarmStatusText').innerText = "Audit Complete!";
                        setTimeout(() => {
                            hideLoading();
                            displayResults(enableProfiling, enableRagDeepScan, enableGreenAI);
                            scrollToSummary();
                        }, 1000);

                    } else if (msg.type === 'error') {
                        throw new Error(msg.message);
                    }
                } catch (e) {
                    console.warn("Stream parse error:", e);
                }
            }
        }

    } catch (error) {
        console.error("Analysis failed:", error);
        hideLoading();
        showError(error.message || 'Connection lost.');
    }
}