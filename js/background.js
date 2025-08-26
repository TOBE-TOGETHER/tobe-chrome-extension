// Background service worker for TOBE Chrome Extension

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('TOBE Chrome Extension installed successfully!');
        
        // Set default settings
        chrome.storage.local.set({
            settings: {
                theme: 'light',
                autoFormat: false,
                screenshotFormat: 'png',
                timestampFormat: 'local'
            }
        });
    }
    
    // Create context menu for JSON formatting
    chrome.contextMenus.create({
        id: 'formatJson',
        title: 'Format JSON',
        contexts: ['selection'],
        documentUrlPatterns: ['<all_urls>']
    });
});

// Handle messages from popup, main page, and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        // Check if sender is valid
        if (!sender || !sender.tab) {
            console.warn('Invalid sender in message listener');
            sendResponse({ error: 'Invalid sender' });
            return;
        }
        
        switch (request.action) {
            case 'captureVisibleTab':
                handleCaptureVisibleTab(sender.tab, sendResponse);
                return true;
                
            case 'captureSelectionArea':
                handleCaptureSelectionArea(request.data, sender.tab, sendResponse);
                return true;
                
            case 'getSettings':
                handleGetSettings(sendResponse);
                return true;
                
            case 'updateSettings':
                handleUpdateSettings(request.settings, sendResponse);
                return true;
                
            default:
                sendResponse({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Error in message listener:', error);
        sendResponse({ error: 'Internal error: ' + error.message });
    }
});

// Handle visible tab capture
async function handleCaptureVisibleTab(tab, sendResponse) {
    try {
        // Validate tab data
        if (!tab || !tab.windowId) {
            console.error('Invalid tab data for capture:', tab);
            sendResponse({ success: false, error: 'Invalid tab data' });
            return;
        }
        
        // Capture the visible tab with retry logic
        let dataUrl = null;
        let retryCount = 0;
        const maxRetries = 2;
        
        while (!dataUrl && retryCount < maxRetries) {
            try {
                dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
                    format: 'png',
                    quality: 100
                });
                
                if (!dataUrl) {
                    throw new Error('No data URL returned from capture');
                }
                
            } catch (error) {
                retryCount++;
                console.warn(`Capture attempt ${retryCount}/${maxRetries} failed:`, error);
                
                if (retryCount < maxRetries) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 200));
                } else {
                    throw error;
                }
            }
        }
        
        if (!dataUrl) {
            throw new Error('Failed to capture after all retries');
        }
        
        // Store the screenshot data for popup to access
        chrome.storage.local.set({
            lastScreenshot: {
                dataUrl: dataUrl,
                timestamp: Date.now(),
                type: 'visible'
            }
        }, () => {
            sendResponse({ success: true, dataUrl });
        });
        
    } catch (error) {
        console.error('Capture visible tab error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle selection area capture
async function handleCaptureSelectionArea(selectionData, tab, sendResponse) {
    try {
        // Validate selection data
        if (!selectionData || typeof selectionData.x !== 'number' || typeof selectionData.y !== 'number' || 
            typeof selectionData.width !== 'number' || typeof selectionData.height !== 'number') {
            sendResponse({ success: false, error: 'Invalid selection data' });
            return;
        }
        
        // Validate tab
        if (!tab || !tab.windowId) {
            sendResponse({ success: false, error: 'Invalid tab data' });
            return;
        }
        
        // First capture the entire visible tab
        const fullDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png',
            quality: 100
        });
        
        if (!fullDataUrl) {
            sendResponse({ success: false, error: 'Failed to capture visible tab' });
            return;
        }
        
        // Create a canvas to crop the selected area
        const canvas = new OffscreenCanvas(selectionData.width, selectionData.height);
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            sendResponse({ success: false, error: 'Failed to create canvas context' });
            return;
        }
        
        // Convert data URL to blob first
        const response = await fetch(fullDataUrl);
        const blob = await response.blob();
        
        // Create image bitmap from blob (works in service workers)
        const imageBitmap = await createImageBitmap(blob);
        
        try {
            // Draw the cropped area to the canvas
            ctx.drawImage(imageBitmap, 
                selectionData.x, selectionData.y, selectionData.width, selectionData.height,
                0, 0, selectionData.width, selectionData.height
            );
            
            // Convert canvas to blob
            const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
            
            // Convert blob to data URL
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                
                // Store the screenshot data for popup to access
                chrome.storage.local.set({
                    lastScreenshot: {
                        dataUrl: dataUrl,
                        timestamp: Date.now(),
                        type: 'selection'
                    }
                }, () => {
                    sendResponse({ success: true, dataUrl: dataUrl });
                });
            };
            reader.onerror = () => {
                sendResponse({ success: false, error: 'Failed to convert blob to data URL' });
            };
            reader.readAsDataURL(croppedBlob);
            
        } catch (error) {
            console.error('Canvas drawing error:', error);
            sendResponse({ success: false, error: 'Failed to draw image to canvas' });
        }
        
    } catch (error) {
        console.error('Capture selection area error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle settings retrieval
async function handleGetSettings(sendResponse) {
    try {
        const result = await chrome.storage.local.get('settings');
        sendResponse({ success: true, settings: result.settings });
    } catch (error) {
        console.error('Get settings error:', error);
        sendResponse({ success: false, error: error.message });
    }
}



// Handle settings update
async function handleUpdateSettings(settings, sendResponse) {
    try {
        await chrome.storage.local.set({ settings });
        sendResponse({ success: true });
    } catch (error) {
        console.error('Update settings error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'formatJson') {
        handleFormatJsonContextMenu(info, tab);
    }
});

// Handle JSON formatting from context menu
async function handleFormatJsonContextMenu(info, tab) {
    try {
        const selectedText = info.selectionText.trim();
        
        if (!selectedText) {
            console.warn('No text selected for JSON formatting');
            return;
        }
        
        // Validate if the selected text looks like JSON
        let isValidJson = false;
        try {
            JSON.parse(selectedText);
            isValidJson = true;
        } catch (e) {
            // Not valid JSON, but we'll still try to format it
            console.log('Selected text is not valid JSON, but will attempt to format');
        }
        
        // Store the selected text for the JSON formatter page
        await chrome.storage.local.set({
            contextMenuJsonData: {
                text: selectedText,
                isValidJson: isValidJson,
                timestamp: Date.now()
            }
        });
        
        // Reuse existing JSON formatter tab if present; otherwise create a new one
        const formatterUrl = chrome.runtime.getURL('html/json-format.html');
        const existingTabs = await chrome.tabs.query({ url: formatterUrl });
        if (existingTabs && existingTabs.length > 0) {
            const targetTab = existingTabs[0];
            await chrome.tabs.update(targetTab.id, { active: true });
            // Notify the page to reload data from storage
            try {
                await chrome.tabs.sendMessage(targetTab.id, { action: 'loadJsonFromStorage' });
            } catch (err) {
                // If messaging fails (e.g., page not ready), fallback to reloading the tab
                await chrome.tabs.reload(targetTab.id);
            }
        } else {
            await chrome.tabs.create({ url: formatterUrl });
        }
        
    } catch (error) {
        console.error('Error handling JSON format context menu:', error);
    }
}


