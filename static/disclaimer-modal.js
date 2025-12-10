// Disclaimer Modal - Standalone JavaScript File
// Updated to match AI Agent Guardrails Analyzer v2 UI (Tailwind)

(function() {
    'use strict';
    
    let disclaimerAccepted = false;

    // Show disclaimer modal on page load
    window.addEventListener('DOMContentLoaded', function() {
        showDisclaimerModal();
    });

    function showDisclaimerModal() {
        // Create modal backdrop
        const modal = document.createElement('div');
        modal.id = 'disclaimerModal';
        // Tailwind classes for overlay: fixed, full screen, blurred backdrop, z-index high
        modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 transition-opacity duration-300 opacity-0';
        
        // Modal Content
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden transform scale-95 transition-all duration-300" id="modalContent">
                
                <div class="bg-white px-8 py-6 border-b border-slate-100 flex items-center gap-4 sticky top-0 z-10">
                    <div class="p-3 bg-red-50 rounded-lg shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900 font-heading">Important Disclaimer & Terms</h2>
                        <p class="text-sm text-gray-500 mt-1">Please review the following conditions before using this tool.</p>
                    </div>
                </div>
                
                <div class="p-8 overflow-y-auto space-y-6 bg-gray-50/50 custom-scrollbar">
                    
                    <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                        <h3 class="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            AI-Generated Content
                        </h3>
                        <p class="text-sm text-yellow-800 leading-relaxed">
                            This tool is developed <strong>in collaboration with AI</strong> and may generate inaccurate, incomplete, or misleading responses. AI models can make errors, and results should not be considered authoritative without human verification.
                        </p>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-5">
                        <h3 class="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Human-in-the-Loop Required
                        </h3>
                        <p class="text-sm text-blue-800 leading-relaxed">
                            <strong>Always maintain human oversight.</strong> All AI-generated analyses must be reviewed, validated, and verified by qualified personnel before being used for any decision-making or operational purposes.
                        </p>
                    </div>

                    <div class="bg-purple-50 border border-purple-200 rounded-xl p-5">
                        <h3 class="font-bold text-purple-900 mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Data Privacy & Storage
                        </h3>
                        <p class="text-sm text-purple-800 leading-relaxed">
                            <strong>Your prompts and data are NOT stored</strong> by this tool. However, data submitted is sent to external APIs (HuggingFace) for processing. Please refer to their privacy policies for data handling practices.
                        </p>
                    </div>

                    <div class="bg-red-50 border border-red-200 rounded-xl p-5">
                        <h3 class="font-bold text-red-900 mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            User Responsibility & Liability
                        </h3>
                        <p class="text-sm text-red-800 leading-relaxed">
                            <strong>You are solely responsible</strong> for any data you submit to this tool. <strong>The creator assumes no liability</strong> for any damages, losses, security breaches, or compliance violations resulting from use of this tool.
                        </p>
                    </div>

                    <div class="bg-slate-100 border border-slate-200 rounded-xl p-5">
                         <h3 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span class="text-lg">⚠️</span> Do Not Submit:
                        </h3>
                        <ul class="list-disc list-inside space-y-1 text-sm text-slate-700 ml-1">
                            <li>Personally Identifiable Information (PII)</li>
                            <li>Confidential or proprietary business data</li>
                            <li>Sensitive security information</li>
                            <li>Regulated data (HIPAA, GDPR, etc.)</li>
                            <li>Production credentials or API keys</li>
                        </ul>
                    </div>

                </div>

                <div class="bg-white p-6 border-t border-slate-100 flex flex-col gap-4 sticky bottom-0 z-10">
                    
                    <label class="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                        <input type="checkbox" id="acceptDisclaimer" class="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer">
                        <span class="text-sm text-gray-700">
                            I acknowledge that I have read and understood the above disclaimers. I agree to use this tool responsibly, maintain human oversight, and accept full responsibility.
                        </span>
                    </label>

                    <div class="flex gap-3">
                        <button id="declineBtn" class="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-200">
                            Decline
                        </button>
                        <button id="acceptBtn" disabled class="flex-1 px-6 py-3 bg-gray-300 text-white font-semibold rounded-lg cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2">
                            <span>Accept & Continue</span>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

        // Animation entry
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            const content = document.getElementById('modalContent');
            if (content) {
                content.classList.remove('scale-95');
                content.classList.add('scale-100');
            }
        });

        // Get elements
        const checkbox = document.getElementById('acceptDisclaimer');
        const acceptBtn = document.getElementById('acceptBtn');
        const declineBtn = document.getElementById('declineBtn');

        // Logic
        checkbox.addEventListener('change', function() {
            if (checkbox.checked) {
                acceptBtn.disabled = false;
                acceptBtn.classList.remove('bg-gray-300', 'cursor-not-allowed');
                acceptBtn.classList.add('bg-blue-600', 'hover:bg-blue-700', 'shadow-md', 'hover:shadow-lg');
            } else {
                acceptBtn.disabled = true;
                acceptBtn.classList.add('bg-gray-300', 'cursor-not-allowed');
                acceptBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'shadow-md', 'hover:shadow-lg');
            }
        });

        acceptBtn.addEventListener('click', function() {
            if (checkbox.checked) {
                disclaimerAccepted = true;
                
                // Animate out
                modal.classList.add('opacity-0');
                const content = document.getElementById('modalContent');
                content.classList.remove('scale-100');
                content.classList.add('scale-95');

                setTimeout(() => {
                    modal.remove();
                }, 300);
                
                sessionStorage.setItem('disclaimerAccepted', 'true');
                window.dispatchEvent(new CustomEvent('disclaimerAccepted'));
            }
        });

        // FIXED: Decline Button Logic
        declineBtn.addEventListener('click', function() {
            // Replace body content with Access Denied message
            document.body.innerHTML = `
               <div class="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center p-4">
                   <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border border-slate-200">
                       <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                           <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                           </svg>
                       </div>
                       <h2 class="text-2xl font-bold text-gray-900 mb-3 font-sans">Access Declined</h2>
                       <p class="text-gray-600 mb-8 leading-relaxed">
                           You must accept the terms of service and disclaimers to access the Guardrails Analyzer.
                       </p>
                       <button onclick="location.reload()" class="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
                           Reload & Try Again
                       </button>
                   </div>
                   <p class="mt-8 text-xs text-gray-400">© 2025 AI Agent Guardrails Analyzer</p>
               </div>
           `;
        });

        // Block outside click closing
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                const content = document.getElementById('modalContent');
                // Shake animation
                content.style.transition = 'transform 0.1s ease-in-out';
                content.style.transform = 'translateX(5px)';
                setTimeout(() => { content.style.transform = 'translateX(-5px)'; }, 100);
                setTimeout(() => { content.style.transform = 'translateX(5px)'; }, 200);
                setTimeout(() => { content.style.transform = 'translateX(0) scale(1)'; content.style.transition = 'all 0.3s'; }, 300);
            }
        });
    }

    // Check if already accepted
    if (sessionStorage.getItem('disclaimerAccepted') === 'true') {
        disclaimerAccepted = true;
        window.removeEventListener('DOMContentLoaded', showDisclaimerModal);
    }
})();