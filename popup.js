/**
 * Enhanced Popup Script with Premium UI
 */

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggle-panel');
    const container = document.querySelector('.container');
    
    // Check if we're on a Dune page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        const isDunePage = currentTab.url && (currentTab.url.includes('dune.com') || currentTab.url.includes('dune.xyz'));
        
        if (!isDunePage) {
            // Update UI for non-Dune pages
            container.classList.add('disabled-state');
            toggleButton.innerHTML = 'Invalid Query Embed Link';
            toggleButton.disabled = true;
            
            // Update info section
            const infoSection = document.querySelector('.info-section');
            infoSection.innerHTML = `
                <div class="info-header">
                    <span>Follow the instructions below to use the scraper</span>
                </div>
                <div style="color: #e1e5f2; line-height: 1.6;">
                    <ol style="margin: 8px 0 0 20px; color: #e1e5f2;">
                        <li>Go to your query on <strong>dune.com</strong>.</li>
                        <li>Click the <em>Share</em> button.</li>
                        <li>Select <em>Embed</em> and copy the embed link.</li>
                        <li>Navigate to that embed link in your browser.</li>
                    </ol>
                    <div style="margin-top: 10px; font-size: 0.9em; color: #9aa5c4;">
                        Example: <code>https://dune.com/embeds/12345/67890</code>
                    </div>
                </div>
            `;
            return;
        }
        
        // Bind toggle panel button for Dune pages
        toggleButton.addEventListener('click', () => {
            // Add loading state
            toggleButton.innerHTML = 'Opening Panel...';
            toggleButton.disabled = true;
            
            // First, try to inject the content script if it's not already loaded
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ['content.js']
            }, () => {
                // Wait a moment for the script to initialize
                setTimeout(() => {
                    chrome.tabs.sendMessage(currentTab.id, { action: 'togglePanel' }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error:', chrome.runtime.lastError);
                            toggleButton.innerHTML = 'Error Opening Panel';
                            setTimeout(() => {
                                toggleButton.innerHTML = 'Open Scraper Panel';
                                toggleButton.disabled = false;
                            }, 2000);
                        } else {
                            // Success animation
                            toggleButton.innerHTML = 'Panel Opened!';
                            setTimeout(() => {
                                window.close(); // Close popup after opening panel
                            }, 500);
                        }
                    });
                }, 100);
            });
        });
    });
});