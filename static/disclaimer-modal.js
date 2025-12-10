// Disclaimer Modal - Standalone JavaScript File
(function() {
    'use strict';
    
    let disclaimerAccepted = false;

    // Show disclaimer modal on page load
    window.addEventListener('DOMContentLoaded', function() {
        showDisclaimerModal();
    });

    function showDisclaimerModal() {
        // Create modal backdrop and container
        const modal = document.createElement('div');
        modal.id = 'disclaimerModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.style.padding = '1rem';

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style="max-width: 42rem; max-height: 90vh; overflow-y: auto; border-radius: 1rem; background-color: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                <div style="background: linear-gradient(to right, #ef4444, #f97316); padding: 1.5rem; color: white; border-radius: 1rem 1rem 0 0;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" style="height: 2rem; width: 2rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h2 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Important Disclaimer & Terms of Use</h2>
                    </div>
                </div>
                
                <div style="padding: 2rem;">
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <!-- AI-Generated Content Warning -->
                        <div style="background-color: #fef3c7; border-left: 4px solid #fbbf24; padding: 1rem; border-radius: 0.5rem;">
                            <h3 style="font-weight: bold; color: #111827; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                                <svg xmlns="http://www.w3.org/2000/svg" style="height: 1.25rem; width: 1.25rem; color: #d97706;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                AI-Generated Content
                            </h3>
                            <p style="color: #374151; font-size: 0.875rem; margin: 0; line-height: 1.5;">
                                This tool is developed <strong>in collaboration with AI</strong> and may generate inaccurate, incomplete, or misleading responses. AI models can make errors, and results should not be considered authoritative without human verification.
                            </p>
                        </div>

                        <!-- Human-in-the-Loop Required -->
                        <div style="background-color: #dbeafe; border-left: 4px solid #60a5fa; padding: 1rem; border-radius: 0.5rem;">
                            <h3 style="font-weight: bold; color: #111827; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                                <svg xmlns="http://www.w3.org/2000/svg" style="height: 1.25rem; width: 1.25rem; color: #2563eb;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Human-in-the-Loop Required
                            </h3>
                            <p style="color: #374151; font-size: 0.875rem; margin: 0; line-height: 1.5;">
                                <strong>Always maintain human oversight.</strong> All AI-generated analyses must be reviewed, validated, and verified by qualified personnel before being used for any decision-making or operational purposes.
                            </p>
                        </div>

                        <!-- Data Privacy & Storage -->
                        <div style="background-color: #e9d5ff; border-left: 4px solid #a855f7; padding: 1rem; border-radius: 0.5rem;">
                            <h3 style="font-weight: bold; color: #111827; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                                <svg xmlns="http://www.w3.org/2000/svg" style="height: 1.25rem; width: 1.25rem; color: #9333ea;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Data Privacy & Storage
                            </h3>
                            <p style="color: #374151; font-size: 0.875rem; margin: 0; line-height: 1.5;">
                                <strong>Your prompts and data are NOT stored</strong> by this tool. However, data submitted is sent to external APIs (HuggingFace) for processing. Please refer to their privacy policies for data handling practices.
                            </p>
                        </div>

                        <!-- User Responsibility & Liability -->
                        <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 1rem; border-radius: 0.5rem;">
                            <h3 style="font-weight: bold; color: #111827; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                                <svg xmlns="http://www.w3.org/2000/svg" style="height: 1.25rem; width: 1.25rem; color: #dc2626;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                User Responsibility & Liability
                            </h3>
                            <p style="color: #374151; font-size: 0.875rem; margin: 0; line-height: 1.5;">
                                <strong>You are solely responsible</strong> for any data you submit to this tool, including ensuring compliance with your organization's data policies, regulations, and security requirements. <strong>The creator assumes no liability</strong> for any damages, losses, security breaches, or compliance violations resulting from use of this tool.
                            </p>
                        </div>

                        <!-- Do Not Submit List -->
                        <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 1rem; border-radius: 0.5rem;">
                            <h3 style="font-weight: bold; color: #111827; margin: 0 0 0.5rem 0;">⚠️ Do Not Submit:</h3>
                            <ul style="color: #374151; font-size: 0.875rem; margin: 0.5rem 0 0 1.25rem; line-height: 1.75; padding-left: 0;">
                                <li>Personally Identifiable Information (PII)</li>
                                <li>Confidential or proprietary business data</li>
                                <li>Sensitive security information</li>
                                <li>Data subject to regulatory compliance (HIPAA, GDPR, etc.)</li>
                                <li>Production credentials or API keys</li>
                            </ul>
                        </div>

                        <!-- Consent Checkbox -->
                        <div style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; background-color: #f3f4f6; border-radius: 0.5rem;">
                            <input type="checkbox" id="acceptDisclaimer" style="margin-top: 0.25rem; height: 1.25rem; width: 1.25rem; cursor: pointer;">
                            <label for="acceptDisclaimer" style="font-size: 0.875rem; color: #374151; cursor: pointer; line-height: 1.5;">
                                I acknowledge that I have read and understood the above disclaimers. I agree to use this tool responsibly, maintain human oversight of all outputs, and accept full responsibility for any data I submit.
                            </label>
                        </div>

                        <!-- Action Buttons -->
                        <div style="display: flex; gap: 0.75rem;">
                            <button id="acceptBtn" disabled style="flex: 1; background-color: #9ca3af; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: not-allowed; border: none; font-size: 1rem; transition: all 0.2s;">
                                I Accept - Continue to Tool
                            </button>
                            <button id="declineBtn" style="padding: 0.75rem 1.5rem; border: 2px solid #d1d5db; color: #374151; border-radius: 0.5rem; font-weight: 600; background-color: white; cursor: pointer; font-size: 1rem; transition: all 0.2s;">
                                Decline
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

        // Get elements
        const checkbox = document.getElementById('acceptDisclaimer');
        const acceptBtn = document.getElementById('acceptBtn');
        const declineBtn = document.getElementById('declineBtn');

        // Enable accept button when checkbox is checked
        checkbox.addEventListener('change', function() {
            if (checkbox.checked) {
                acceptBtn.disabled = false;
                acceptBtn.style.backgroundColor = '#2563eb';
                acceptBtn.style.cursor = 'pointer';
                acceptBtn.addEventListener('mouseenter', function() {
                    acceptBtn.style.backgroundColor = '#1d4ed8';
                });
                acceptBtn.addEventListener('mouseleave', function() {
                    acceptBtn.style.backgroundColor = '#2563eb';
                });
            } else {
                acceptBtn.disabled = true;
                acceptBtn.style.backgroundColor = '#9ca3af';
                acceptBtn.style.cursor = 'not-allowed';
            }
        });

        // Accept button handler
        acceptBtn.addEventListener('click', function() {
            if (checkbox.checked) {
                disclaimerAccepted = true;
                modal.remove();
                
                // Store acceptance in sessionStorage (optional)
                sessionStorage.setItem('disclaimerAccepted', 'true');
                
                // Dispatch custom event (optional - for integration with main app)
                window.dispatchEvent(new CustomEvent('disclaimerAccepted'));
            }
        });

        // Decline button handler
        declineBtn.addEventListener('click', function() {
            // Close window or redirect
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'about:blank';
            }
        });

        // Prevent closing modal by clicking backdrop
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                // Optional: Show warning that disclaimer must be accepted
                modal.style.animation = 'shake 0.5s';
                setTimeout(function() {
                    modal.style.animation = '';
                }, 500);
            }
        });
    }

    // Export function for manual usage if needed
    window.showDisclaimerModal = showDisclaimerModal;

    // Optional: Check if disclaimer was already accepted in this session
    if (sessionStorage.getItem('disclaimerAccepted') === 'true') {
        disclaimerAccepted = true;
        // Don't show modal again in same session
        window.removeEventListener('DOMContentLoaded', showDisclaimerModal);
    }
})();