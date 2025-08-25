// DOM elements
const captureVisibleBtn = document.getElementById('captureVisible');
const captureSelectionBtn = document.getElementById('captureSelection');
const screenshotPreview = document.getElementById('screenshotPreview');

// Check for stored screenshot on popup load
async function checkForStoredScreenshot() {
    try {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            return;
        }
        
        const result = await chrome.storage.local.get('lastScreenshot');
        if (result.lastScreenshot && result.lastScreenshot.dataUrl) {
            // Check if screenshot is recent (within last 30 seconds)
            const now = Date.now();
            const screenshotAge = now - result.lastScreenshot.timestamp;
            
            if (screenshotAge < 30000) { // 30 seconds
                displayScreenshot(result.lastScreenshot.dataUrl);
                showNotification('Screenshot loaded from selection!');
            } else {
                // Clear old screenshot
                chrome.storage.local.remove('lastScreenshot');
            }
        }
    } catch (error) {
        console.error('Error checking for stored screenshot:', error);
    }
}

// Time converter elements
const timestampInput = document.getElementById('timestampInput');
const dateInput = document.getElementById('dateInput');
const convertToDateBtn = document.getElementById('convertToDate');
const convertToTimestampBtn = document.getElementById('convertToTimestamp');
const dateResult = document.getElementById('dateResult');
const timestampResult = document.getElementById('timestampResult');
const currentTimestamp = document.getElementById('currentTimestamp');
const currentDate = document.getElementById('currentDate');
const copyCurrentBtn = document.getElementById('copyCurrent');

// Screenshot Functions
async function captureVisibleTab() {
    try {
        // Check if we're running in a Chrome extension context
        if (typeof chrome === 'undefined' || !chrome.tabs) {
            console.error('Chrome extension APIs not available for screenshot');
            showNotification('Screenshot feature requires Chrome extension context');
            return;
        }
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        displayScreenshot(dataUrl);
        showNotification('Screenshot captured!');
    } catch (error) {
        console.error('Screenshot error:', error);
        showNotification('Failed to capture screenshot');
    }
}

async function captureSelection() {
    try {
        // Check if we're running in a Chrome extension context
        if (typeof chrome === 'undefined' || !chrome.tabs) {
            console.error('Chrome extension APIs not available for selection capture');
            showNotification('Selection capture requires Chrome extension context');
            return;
        }
        
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if content script is available on this page
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            showNotification('Selection capture is not available on this page type');
            return;
        }
        
        // 设置截图状态和用户提示
        setCaptureMode(true);
        
        // Try to inject content script if not already present
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['js/content.js']
            });
        } catch (injectionError) {
            console.log('Content script may already be injected or page not accessible');
        }
        
        // Send message to content script to enable selection mode
        chrome.tabs.sendMessage(tab.id, { action: 'captureSelection' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error sending message to content script:', chrome.runtime.lastError);
                showNotification('Selection capture not available on this page. Try using "Visible Tab" instead.');
                setCaptureMode(false);
                return;
            }
            
            if (response && response.success) {
                showNotification('Selection mode enabled. Click and drag to select area.');
                // Close popup to allow user to interact with the page
                window.close();
            } else {
                showNotification('Failed to enable selection mode');
                setCaptureMode(false);
            }
        });
    } catch (error) {
        console.error('Selection capture error:', error);
        showNotification('Failed to enable selection capture');
        setCaptureMode(false);
    }
}

function setCaptureMode(enabled) {
    const preview = document.getElementById('screenshotPreview');
    if (enabled) {
        preview.classList.add('capture-mode');
        // 更新提示文本
        const placeholder = preview.querySelector('.placeholder');
        if (placeholder) {
            placeholder.innerHTML = `
                <span>🎯</span>
                <p>Drag to select area</p>
            `;
        }
    } else {
        preview.classList.remove('capture-mode');
        // 恢复原始提示文本
        const placeholder = preview.querySelector('.placeholder');
        if (placeholder) {
            placeholder.innerHTML = `
                <span>📸</span>
                <p>Click to capture</p>
            `;
        }
    }
}

function displayScreenshot(dataUrl) {
    // 重置截图状态
    setCaptureMode(false);
    
    screenshotPreview.innerHTML = `
        <img src="${dataUrl}" alt="Screenshot" style="cursor: pointer;" title="Click to download" />
    `;
    
    // Add event listener properly to avoid CSP violations
    const img = screenshotPreview.querySelector('img');
    if (img) {
        img.addEventListener('click', () => downloadScreenshot(dataUrl));
    }
}

function enableScreenshotPreviewClick() {
    // Add click event to screenshot preview area
    screenshotPreview.addEventListener('click', async (e) => {
        // If there's already an image, don't trigger selection
        if (screenshotPreview.querySelector('img')) {
            return;
        }
        
        // 设置截图状态
        setCaptureMode(true);
        
        // Trigger selection capture
        await captureSelection();
    });
}

function downloadScreenshot(dataUrl) {
    try {
        // Check if we're in a Chrome extension context
        if (typeof chrome === 'undefined' || !chrome.downloads) {
            console.error('Chrome downloads API not available');
            // Fallback: use traditional download method
            downloadWithFallback(dataUrl);
            return;
        }
        
        // Use Chrome downloads API for better compatibility
        const filename = `tobe-screenshot-${Date.now()}.png`;
        
        // Convert data URL to blob
        fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                
                chrome.downloads.download({
                    url: url,
                    filename: filename,
                    saveAs: false
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        console.error('Download error:', chrome.runtime.lastError);
                        // Fallback to traditional method
                        downloadWithFallback(dataUrl);
                    } else {
                        showNotification('Screenshot downloaded!');
                        // Clean up the object URL
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }
                });
            })
            .catch(error => {
                console.error('Error converting data URL to blob:', error);
                // Fallback to traditional method
                downloadWithFallback(dataUrl);
            });
            
    } catch (error) {
        console.error('Error in downloadScreenshot:', error);
        // Fallback to traditional method
        downloadWithFallback(dataUrl);
    }
}

function downloadWithFallback(dataUrl) {
    try {
        const link = document.createElement('a');
        link.download = `tobe-screenshot-${Date.now()}.png`;
        link.href = dataUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Screenshot downloaded!');
    } catch (error) {
        console.error('Fallback download error:', error);
        showNotification('Failed to download screenshot');
    }
}

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

// Time Converter Functions
function convertTimestampToDate() {
    const timestamp = timestampInput.value.trim();
    if (!timestamp) {
        dateResult.textContent = 'Please enter a timestamp';
        return;
    }
    
    try {
        let date;
        const num = parseInt(timestamp);
        
        if (isNaN(num)) {
            dateResult.textContent = 'Invalid timestamp format';
            return;
        }
        
        // Check if it's seconds or milliseconds
        if (timestamp.length === 10) {
            // Seconds
            date = new Date(num * 1000);
        } else if (timestamp.length === 13) {
            // Milliseconds
            date = new Date(num);
        } else {
            // Try both
            date = new Date(num * 1000);
            if (date.getTime() < 1000000000000) {
                date = new Date(num);
            }
        }
        
        if (isNaN(date.getTime())) {
            dateResult.textContent = 'Invalid timestamp';
            return;
        }
        
        const formattedDate = date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        dateResult.textContent = `${formattedDate} (${date.toISOString()})`;
    } catch (error) {
        dateResult.textContent = 'Error converting timestamp';
        console.error('Timestamp conversion error:', error);
    }
}

function convertDateToTimestamp() {
    const dateValue = dateInput.value;
    if (!dateValue) {
        timestampResult.textContent = 'Please select a date';
        return;
    }
    
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
            timestampResult.textContent = 'Invalid date';
            return;
        }
        
        const seconds = Math.floor(date.getTime() / 1000);
        const milliseconds = date.getTime();
        
        timestampResult.textContent = `Seconds: ${seconds}\nMilliseconds: ${milliseconds}`;
    } catch (error) {
        timestampResult.textContent = 'Error converting date';
        console.error('Date conversion error:', error);
    }
}

function updateCurrentTime() {
    const now = new Date();
    const seconds = Math.floor(now.getTime() / 1000);
    const milliseconds = now.getTime();
    
    currentTimestamp.textContent = `Timestamp: ${seconds} (${milliseconds})`;
    currentDate.textContent = `Date: ${now.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    })}`;
}

function copyCurrentTimestamp() {
    const now = new Date();
    const seconds = Math.floor(now.getTime() / 1000);
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(seconds.toString()).then(() => {
            showNotification('Current timestamp copied!');
        }).catch(() => {
            showNotification('Failed to copy timestamp');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = seconds.toString();
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Current timestamp copied!');
    }
}

// Event listeners are now set up in DOMContentLoaded

// Tab switching event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, setting up tab listeners');
    
    // Check for stored screenshot first
    checkForStoredScreenshot();
    
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
    
    // Set up other event listeners
    if (captureVisibleBtn) {
        captureVisibleBtn.addEventListener('click', captureVisibleTab);
    }
    if (captureSelectionBtn) {
        captureSelectionBtn.addEventListener('click', captureSelection);
    }
    
    // Enable screenshot preview click for selection
    enableScreenshotPreviewClick();
    
    // Time converter event listeners
    if (convertToDateBtn) {
        convertToDateBtn.addEventListener('click', convertTimestampToDate);
    }
    if (convertToTimestampBtn) {
        convertToTimestampBtn.addEventListener('click', convertDateToTimestamp);
    }
    if (copyCurrentBtn) {
        copyCurrentBtn.addEventListener('click', copyCurrentTimestamp);
    }
    
    // Initialize current time display
    if (currentTimestamp && currentDate) {
        updateCurrentTime();
        // Update current time every second
        setInterval(updateCurrentTime, 1000);
    }
    
    // Add keyboard shortcuts for time converter
    if (timestampInput) {
        timestampInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                convertTimestampToDate();
            }
        });
    }
});

// Make functions globally available
window.downloadScreenshot = downloadScreenshot;
