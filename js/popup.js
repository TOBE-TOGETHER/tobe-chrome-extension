// Utility Functions
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 10px 20px;
        border-radius: 6px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Tab switching functionality
function switchTab(tabName) {
    // Remove active class from all tabs and panels
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    // Add active class to selected tab and panel (only for non-JSON tabs)
    if (tabName !== 'json') {
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
}

// Open new tab functions
function openJsonFormatter() {
    try {
        const jsonUrl = chrome.runtime.getURL('html/json-format.html');
        console.log('Checking for existing JSON formatter tab...');
        
        // First, check if the JSON formatter tab is already open
        chrome.tabs.query({}, (tabs) => {
            if (chrome.runtime.lastError) {
                console.error('Error querying tabs:', chrome.runtime.lastError);
                // Fallback: create new tab
                createJsonFormatterTab(jsonUrl);
                return;
            }
            
            // Look for existing JSON formatter tab
            const existingTab = tabs.find(tab => tab.url === jsonUrl);
            
            if (existingTab) {
                console.log('Found existing JSON formatter tab:', existingTab.id);
                // Activate the existing tab
                chrome.tabs.update(existingTab.id, { active: true }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error activating existing tab:', chrome.runtime.lastError);
                    } else {
                        console.log('Activated existing JSON formatter tab');
                        // Focus the window containing the tab
                        chrome.windows.update(existingTab.windowId, { focused: true });
                    }
                });
            } else {
                console.log('No existing JSON formatter tab found, creating new one');
                // Create new tab
                createJsonFormatterTab(jsonUrl);
            }
        });
    } catch (error) {
        console.error('Error in openJsonFormatter:', error);
        alert('Failed to open JSON formatter. Please try again.');
    }
}

function createJsonFormatterTab(jsonUrl) {
    try {
        if (typeof chrome === 'undefined' || !chrome.tabs) {
            console.error('Chrome tabs API not available');
            return;
        }
        
        chrome.tabs.create({
            url: jsonUrl,
            active: true
        }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error('Error creating JSON formatter tab:', chrome.runtime.lastError);
            } else {
                console.log('JSON formatter tab created successfully:', tab);
            }
        });
    } catch (error) {
        console.error('Error in createJsonFormatterTab:', error);
    }
}

// Tab switching event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, setting up tab listeners');
    // Set up tab click listeners
    const tabButtons = document.querySelectorAll('.tab-btn');
    console.log('Found tab buttons:', tabButtons.length);
    
    tabButtons.forEach(btn => {
        const tabName = btn.getAttribute('data-tab');
        console.log('Setting up listener for tab:', tabName);
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Tab clicked:', tabName);
            
            // If JSON tab is clicked, directly open JSON formatter
            if (tabName === 'json') {
                console.log('Opening JSON formatter...');
                openJsonFormatter();
                return;
            }
            
            // Otherwise, switch to the selected tab
            switchTab(tabName);
        });
    });
    
    // Initialize screenshot functionality
    Screenshot.initPopup();
    
    // Initialize timestamp functionality
    Timestamp.initPopup();
});

// Note: Global functions now handled by respective modules
