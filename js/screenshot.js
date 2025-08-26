// Screenshot module for TOBE Chrome Extension
// Contains all screenshot-related functionality for popup and content scripts

// Screenshot module namespace
const Screenshot = {
    // DOM element references (will be initialized)
    captureVisibleBtn: null,
    captureFullPageBtn: null,
    captureSelectionBtn: null,
    screenshotPreview: null,

    // Initialize screenshot functionality in popup
    initPopup() {
        this.captureVisibleBtn = document.getElementById('captureVisible');
        this.captureFullPageBtn = document.getElementById('captureFullPage');
        this.captureSelectionBtn = document.getElementById('captureSelection');
        this.screenshotPreview = document.getElementById('screenshotPreview');

        // Set up event listeners
        if (this.captureVisibleBtn) {
            this.captureVisibleBtn.addEventListener('click', this.captureVisibleTab.bind(this));
        }
        if (this.captureFullPageBtn) {
            this.captureFullPageBtn.addEventListener('click', this.captureFullPage.bind(this));
        }
        if (this.captureSelectionBtn) {
            this.captureSelectionBtn.addEventListener('click', this.captureSelection.bind(this));
        }
    },

    // Capture visible tab screenshot
    async captureVisibleTab() {
        try {
            // Check if we're running in a Chrome extension context
            if (typeof chrome === 'undefined' || !chrome.tabs) {
                console.error('Chrome extension APIs not available for screenshot');
                this.showNotification('Screenshot feature requires Chrome extension context');
                return;
            }
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
            this.displayScreenshot(dataUrl);
            this.showNotification('Screenshot captured!');
        } catch (error) {
            console.error('Screenshot error:', error);
            this.showNotification('Failed to capture screenshot');
        }
    },

    // Capture full page screenshot
    async captureFullPage() {
        try {
            // Check if we're running in a Chrome extension context
            if (typeof chrome === 'undefined' || !chrome.tabs) {
                console.error('Chrome extension APIs not available for full page capture');
                this.showNotification('Full page capture requires Chrome extension context');
                return;
            }
            
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Check if content script is available on this page
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                this.showNotification('Full page capture is not available on this page type');
                return;
            }
            
            // Send message to content script to enable full page capture mode
            chrome.tabs.sendMessage(tab.id, { action: 'captureFullPage' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message to content script:', chrome.runtime.lastError);
                    this.showNotification('Full page capture not available on this page. Try using "Visible Tab" instead.');
                    return;
                }
                
                if (response && response.success) {
                    this.showNotification('Full page capture started. Please wait...');
                    // Close popup to allow user to see the capture progress
                    window.close();
                } else {
                    this.showNotification('Failed to start full page capture');
                }
            });
        } catch (error) {
            console.error('Full page capture error:', error);
            this.showNotification('Failed to start full page capture');
        }
    },

    // Capture selection area screenshot
    async captureSelection() {
        try {
            // Check if we're running in a Chrome extension context
            if (typeof chrome === 'undefined' || !chrome.tabs) {
                console.error('Chrome extension APIs not available for selection capture');
                this.showNotification('Selection capture requires Chrome extension context');
                return;
            }
            
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Check if content script is available on this page
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                this.showNotification('Selection capture is not available on this page type');
                return;
            }
            
            // Note: Content script is automatically injected via manifest.json
            // No need to manually inject here
            
            // Send message to content script to enable selection mode
            chrome.tabs.sendMessage(tab.id, { action: 'captureSelection' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message to content script:', chrome.runtime.lastError);
                    this.showNotification('Selection capture not available on this page. Try using "Visible Tab" instead.');
                    return;
                }
                
                if (response && response.success) {
                    this.showNotification('Selection mode enabled. Click and drag to select area.');
                    // Close popup to allow user to interact with the page
                    window.close();
                } else {
                    this.showNotification('Failed to enable selection mode');
                }
            });
        } catch (error) {
            console.error('Selection capture error:', error);
            this.showNotification('Failed to enable selection capture');
        }
    },

    // Display screenshot in preview area
    displayScreenshot(dataUrl) {
        if (!this.screenshotPreview) return;
        
        // Show the preview area and display screenshot
        this.screenshotPreview.style.display = 'block';
        this.screenshotPreview.innerHTML = `
            <img src="${dataUrl}" alt="Screenshot" style="cursor: pointer;" title="Click to download" />
        `;
        
        // Add event listener properly to avoid CSP violations
        const img = this.screenshotPreview.querySelector('img');
        if (img) {
            img.addEventListener('click', () => this.downloadScreenshot(dataUrl));
        }
    },

    // Download screenshot
    downloadScreenshot(dataUrl) {
        try {
            // Check if we're in a Chrome extension context
            if (typeof chrome === 'undefined' || !chrome.downloads) {
                console.error('Chrome downloads API not available');
                // Fallback: use traditional download method
                this.downloadWithFallback(dataUrl);
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
                            this.downloadWithFallback(dataUrl);
                        } else {
                            this.showNotification('Screenshot downloaded!');
                            // Clean up the object URL
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                        }
                    });
                })
                .catch(error => {
                    console.error('Error converting data URL to blob:', error);
                    // Fallback to traditional method
                    this.downloadWithFallback(dataUrl);
                });
                
        } catch (error) {
            console.error('Error in downloadScreenshot:', error);
            // Fallback to traditional method
            this.downloadWithFallback(dataUrl);
        }
    },

    // Fallback download method
    downloadWithFallback(dataUrl) {
        try {
            const link = document.createElement('a');
            link.download = `tobe-screenshot-${Date.now()}.png`;
            link.href = dataUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showNotification('Screenshot downloaded!');
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('Failed to download screenshot');
        }
    },

    // Show notification (will use global showNotification if available)
    showNotification(message) {
        if (typeof showNotification === 'function') {
            showNotification(message);
        } else {
            console.log('Screenshot notification:', message);
        }
    }
};

// Content script selection functionality
const ScreenshotSelection = {
    // Initialize selection capture functionality
    initContentScript() {
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            // Check if extension context is still valid
            if (!this.isExtensionContextValid()) {
                console.warn('Extension context invalid, ignoring message');
                sendResponse({ error: 'Extension context invalid' });
                return;
            }
            
            switch (request.action) {
                case 'captureSelection':
                    this.enableSelectionCapture();
                    sendResponse({ success: true });
                    break;
                    
                case 'captureFullPage':
                    this.enableFullPageCapture();
                    sendResponse({ success: true });
                    break;
                    
                default:
                    sendResponse({ error: 'Unknown action' });
            }
        });
    },

    // Check if extension context is valid
    isExtensionContextValid() {
        try {
            return typeof chrome !== 'undefined' && 
                   chrome.runtime && 
                   chrome.runtime.id;
        } catch (error) {
            return false;
        }
    },

    // Enable selection capture mode
    enableSelectionCapture() {
        // Check if selection mode is already active
        if (document.documentElement.classList.contains('screenshot-selection-mode')) {
            return;
        }
        
        let isSelecting = false;
        let startX, startY, endX, endY;
        let selectionBox = null;
        
        // Add crosshair cursor for selection mode
        document.documentElement.classList.add('screenshot-selection-mode');
        document.body.classList.add('screenshot-selection-mode');
        
        // Fallback: Set cursor style directly as well
        document.body.style.cursor = 'crosshair';
        document.documentElement.style.cursor = 'crosshair';
        
        function createSelectionBox() {
            selectionBox = document.createElement('div');
            selectionBox.className = 'screenshot-selection-box';
            selectionBox.style.cssText = `
                position: fixed;
                border: 2px dashed #667eea;
                background: rgba(102, 126, 234, 0.1);
                z-index: 10000;
                pointer-events: none;
                user-select: none;
            `;
            document.body.appendChild(selectionBox);
        }
        
        function updateSelectionBox() {
            if (!selectionBox) return;
            
            const left = Math.min(startX, endX);
            const top = Math.min(startY, endY);
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            
            selectionBox.style.left = left + 'px';
            selectionBox.style.top = top + 'px';
            selectionBox.style.width = width + 'px';
            selectionBox.style.height = height + 'px';
        }
        
        function removeSelectionBox() {
            if (selectionBox) {
                selectionBox.remove();
                selectionBox = null;
            }
        }
        
        function captureSelection() {
            if (!selectionBox) return;
            
            // Check if extension context is still valid
            if (!ScreenshotSelection.isExtensionContextValid()) {
                ScreenshotSelection.showSelectionNotification('Extension context invalid. Please refresh the page.', 'error');
                return;
            }
            
            const rect = selectionBox.getBoundingClientRect();
            const data = {
                x: rect.left + window.scrollX,
                y: rect.top + window.scrollY,
                width: rect.width,
                height: rect.height
            };
            
            // Send selection data to background script for capture
            try {
                chrome.runtime.sendMessage({
                    action: 'captureSelectionArea',
                    data: data
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Runtime error:', chrome.runtime.lastError);
                        ScreenshotSelection.showSelectionNotification('Failed to capture screenshot: Extension error', 'error');
                        return;
                    }
                    
                    if (response && response.success) {
                        // Show preview with toolbar
                        ScreenshotSelection.showScreenshotPreview(response.dataUrl, data);
                    } else {
                        const errorMsg = response && response.error ? response.error : 'Unknown error';
                        ScreenshotSelection.showSelectionNotification(`Failed to capture screenshot: ${errorMsg}`, 'error');
                    }
                });
            } catch (error) {
                console.error('Error sending message to background script:', error);
                ScreenshotSelection.showSelectionNotification('Failed to capture screenshot: Communication error', 'error');
            }
        }
        
        // Event listeners
        function handleMouseDown(e) {
            if (e.target === selectionBox) return;
            
            isSelecting = true;
            startX = e.clientX;
            startY = e.clientY;
            createSelectionBox();
            e.preventDefault();
        }
        
        function handleMouseMove(e) {
            if (!isSelecting) return;
            
            endX = e.clientX;
            endY = e.clientY;
            updateSelectionBox();
            e.preventDefault();
        }
        
        function handleMouseUp(e) {
            if (!isSelecting) return;
            
            isSelecting = false;
            captureSelection();
            removeSelectionBox();
            cleanup();
            e.preventDefault();
        }
        
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                isSelecting = false;
                removeSelectionBox();
                cleanup();
            }
        }
        
        function cleanup() {
            // Remove crosshair cursor
            document.documentElement.classList.remove('screenshot-selection-mode');
            document.body.classList.remove('screenshot-selection-mode');
            
            // Restore original cursor styles
            document.body.style.cursor = '';
            document.documentElement.style.cursor = '';
            
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('keydown', handleKeyDown);
        }
        
        // Add event listeners
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('keydown', handleKeyDown);
    },

    // Show selection notification
    showSelectionNotification(message, type) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            z-index: 10001;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    // Show screenshot preview with toolbar
    showScreenshotPreview(dataUrl, selectionData) {
        // Remove existing preview if any
        const existingPreview = document.getElementById('screenshot-preview-overlay');
        if (existingPreview) {
            existingPreview.remove();
        }
        
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'screenshot-preview-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 10000;
            pointer-events: none;
        `;
        
        // Create dark mask with transparent hole for selection area
        const mask = document.createElement('div');
        mask.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: auto;
            clip-path: polygon(
                0% 0%,
                100% 0%,
                100% 100%,
                0% 100%,
                0% 0%,
                ${selectionData.x}px 0%,
                ${selectionData.x}px ${selectionData.y}px,
                ${selectionData.x + selectionData.width}px ${selectionData.y}px,
                ${selectionData.x + selectionData.width}px ${selectionData.y + selectionData.height}px,
                ${selectionData.x}px ${selectionData.y + selectionData.height}px,
                ${selectionData.x}px ${selectionData.y}px,
                0% ${selectionData.y}px,
                0% 0%
            );
        `;
        
        // Create border for selection area
        const borderArea = document.createElement('div');
        borderArea.style.cssText = `
            position: absolute;
            left: ${selectionData.x}px;
            top: ${selectionData.y}px;
            width: ${selectionData.width}px;
            height: ${selectionData.height}px;
            background: transparent;
            border: 2px dashed #667eea;
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
            pointer-events: none;
            z-index: 10001;
        `;
        
        // Create toolbar with smart positioning
        const toolbar = document.createElement('div');
        
        // Calculate optimal toolbar position
        const toolbarPosition = this.calculateToolbarPosition(selectionData);
        
        toolbar.style.cssText = `
            position: fixed;
            left: ${toolbarPosition.left}px;
            top: ${toolbarPosition.top}px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border: 2px solid #667eea;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: auto;
            z-index: 10002;
            min-width: 100px;
            transition: all 0.2s ease;
        `;
        
        // Add a subtle connection indicator if toolbar is positioned adjacent to selection
        if (this.isToolbarAdjacent(toolbarPosition, selectionData)) {
            this.addConnectionIndicator(overlay, toolbarPosition, selectionData);
        }
        
        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.innerHTML = 'Download';
        downloadBtn.onclick = () => {
            this.downloadScreenshot(dataUrl);
            overlay.remove();
            document.removeEventListener('keydown', handlePreviewKeyDown);
        };
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = 'Copy';
        copyBtn.onclick = () => {
            this.copyScreenshotToClipboard(dataUrl);
            overlay.remove();
            document.removeEventListener('keydown', handlePreviewKeyDown);
        };
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = 'Close';
        closeBtn.onclick = () => {
            overlay.remove();
            document.removeEventListener('keydown', handlePreviewKeyDown);
        };

        // Apply simple, modern styles to toolbar buttons
        const baseBtnStyle = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 6px 10px;
            border-radius: 8px;
            border: none;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            color: #fff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            transition: transform .06s ease, box-shadow .2s ease, background-color .2s ease, opacity .2s ease;
            user-select: none;
            min-height: 32px;
        `;
        const styleBtn = (btn, bg, hoverBg) => {
            btn.style.cssText = baseBtnStyle + `background:${bg};`;
            btn.onmouseenter = () => { btn.style.background = hoverBg; btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.18)'; };
            btn.onmouseleave = () => { btn.style.background = bg; btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)'; };
            btn.onmousedown = () => { btn.style.transform = 'scale(0.98)'; };
            btn.onmouseup = () => { btn.style.transform = 'scale(1)'; };
        };
        styleBtn(downloadBtn, '#4f46e5', '#4338ca'); // indigo
        styleBtn(copyBtn, '#10b981', '#0ea871');     // emerald
        styleBtn(closeBtn, '#6b7280', '#4b5563');    // gray
        
        // Add buttons to toolbar
        toolbar.appendChild(downloadBtn);
        toolbar.appendChild(copyBtn);
        toolbar.appendChild(closeBtn);
        
        // Add elements to overlay
        overlay.appendChild(mask);
        overlay.appendChild(borderArea);
        overlay.appendChild(toolbar);
        
        // Add overlay to page
        document.body.appendChild(overlay);
        
        // Add ESC key listener for closing preview
        function handlePreviewKeyDown(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handlePreviewKeyDown);
            }
        }
        document.addEventListener('keydown', handlePreviewKeyDown);
        
        // Show success notification
        this.showSelectionNotification('Screenshot captured! Use toolbar to download or copy.', 'success');
    },

    // Download screenshot (content script version)
    downloadScreenshot(dataUrl) {
        try {
            const link = document.createElement('a');
            link.download = `tobe-screenshot-${Date.now()}.png`;
            link.href = dataUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showSelectionNotification('Screenshot downloaded!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showSelectionNotification('Failed to download screenshot', 'error');
        }
    },

    // Calculate optimal toolbar position
    calculateToolbarPosition(selectionData) {
        const toolbarWidth = 120; // Estimated toolbar width
        const toolbarHeight = 150; // Estimated toolbar height (3 buttons + padding)
        const margin = 12; // Margin from selection area
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Selection area bounds
        const selectionRight = selectionData.x + selectionData.width;
        const selectionBottom = selectionData.y + selectionData.height;
        
        let left, top;
        
        // Default position: right side of selection area, aligned with bottom
        left = selectionRight + margin;
        top = selectionBottom - toolbarHeight;
        
        // Check if toolbar fits on the right side
        if (left + toolbarWidth > viewportWidth - 20) {
            // Not enough space on right, try left side
            left = selectionData.x - toolbarWidth - margin;
            
            // If still not enough space on left, place inside selection area
            if (left < 20) {
                // Place at right edge of viewport with some margin
                left = viewportWidth - toolbarWidth - 20;
            }
        }
        
        // Ensure toolbar doesn't go below viewport
        if (top + toolbarHeight > viewportHeight - 20) {
            top = viewportHeight - toolbarHeight - 20;
        }
        
        // Ensure toolbar doesn't go above viewport
        if (top < 20) {
            top = 20;
        }
        
        // If selection area is very small, try to position above it
        if (selectionData.height < 100 && selectionData.y > toolbarHeight + margin + 20) {
            top = selectionData.y - toolbarHeight - margin;
            // Reset left position for above placement
            left = Math.min(selectionRight - toolbarWidth/2, viewportWidth - toolbarWidth - 20);
            left = Math.max(left, 20);
        }
        
        return { left, top };
    },

    // Check if toolbar is positioned adjacent to selection area
    isToolbarAdjacent(toolbarPosition, selectionData) {
        const margin = 24; // Consider adjacent if within this distance
        const selectionRight = selectionData.x + selectionData.width;
        const selectionLeft = selectionData.x;
        const selectionBottom = selectionData.y + selectionData.height;
        
        // Check if toolbar is to the right and close to selection
        const isRightAdjacent = toolbarPosition.left <= selectionRight + margin && 
                               toolbarPosition.left >= selectionRight - margin;
        
        // Check if toolbar is to the left and close to selection  
        const isLeftAdjacent = toolbarPosition.left + 120 >= selectionLeft - margin &&
                              toolbarPosition.left + 120 <= selectionLeft + margin;
        
        return isRightAdjacent || isLeftAdjacent;
    },

    // Add a subtle visual connection between toolbar and selection area
    addConnectionIndicator(overlay, toolbarPosition, selectionData) {
        const indicator = document.createElement('div');
        
        const selectionRight = selectionData.x + selectionData.width;
        const selectionBottom = selectionData.y + selectionData.height;
        const toolbarCenterY = toolbarPosition.top + 75; // Approximate toolbar center
        
        // Determine if toolbar is on right or left
        const isOnRight = toolbarPosition.left > selectionRight;
        
        if (isOnRight) {
            // Connection line from right edge of selection to toolbar
            indicator.style.cssText = `
                position: absolute;
                left: ${selectionRight}px;
                top: ${Math.min(selectionBottom - 10, toolbarCenterY)}px;
                width: ${toolbarPosition.left - selectionRight}px;
                height: 2px;
                background: linear-gradient(to right, #667eea, transparent);
                z-index: 10001;
                pointer-events: none;
                opacity: 0.6;
            `;
        } else {
            // Connection line from left edge of selection to toolbar
            indicator.style.cssText = `
                position: absolute;
                left: ${toolbarPosition.left + 120}px;
                top: ${Math.min(selectionBottom - 10, toolbarCenterY)}px;
                width: ${selectionData.x - (toolbarPosition.left + 120)}px;
                height: 2px;
                background: linear-gradient(to left, #667eea, transparent);
                z-index: 10001;
                pointer-events: none;
                opacity: 0.6;
            `;
        }
        
        overlay.appendChild(indicator);
    },

    // Enable full page capture mode
    async enableFullPageCapture() {
        try {
            // Get page dimensions
            const dpr = window.devicePixelRatio || 1;
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            const fullW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
            const fullH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
            
            // Check if page is too large
            const totalPixels = fullW * fullH;
            if (totalPixels > 80000000) { // 80MP limit
                this.showSelectionNotification('Page too large for full capture. Consider using selection mode.', 'error');
                return;
            }
            
            // Store original scroll position
            const originalScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const originalScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            // Calculate segments with overlap to avoid gaps
            const segmentHeight = Math.floor(viewportH * 0.9); // 90% of viewport height
            const segments = Math.ceil(fullH / segmentHeight);
            
            // Create canvas for stitching
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size
            canvas.width = fullW;
            canvas.height = fullH;
            
            // Capture segments with retry logic
            const capturedImages = [];
            let hiddenElements = null;
            
            for (let i = 0; i < segments; i++) {
                // Calculate scroll position for this segment
                const scrollY = Math.min(i * segmentHeight, fullH - viewportH);
                
                // Scroll to position
                window.scrollTo(0, scrollY);
                
                // Wait for page to settle with longer delay
                await new Promise(resolve => {
                    setTimeout(resolve, 300); // Increased from 100ms to 300ms
                });
                
                // Additional wait for any dynamic content
                await new Promise(resolve => {
                    requestAnimationFrame(() => {
                        setTimeout(resolve, 200);
                    });
                });
                
                // Hide fixed elements starting from the second segment (i > 0)
                if (i === 1 && !hiddenElements) {
                    // First time hiding elements (second segment)
                    hiddenElements = this.hideFixedElements();
                } else if (i === 0) {
                    // First segment - keep all elements visible
                    // Ensure any previously hidden elements are restored
                    if (hiddenElements) {
                        this.restoreFixedElements(hiddenElements);
                        hiddenElements = null;
                    }
                }
                
                // Capture visible area with retry logic
                let dataUrl = null;
                let retryCount = 0;
                const maxRetries = 3;
                
                while (!dataUrl && retryCount < maxRetries) {
                    try {
                        dataUrl = await this.captureVisibleArea();
                        if (dataUrl) {
                            capturedImages.push({
                                dataUrl: dataUrl,
                                scrollY: scrollY,
                                index: i
                            });
                        }
                    } catch (error) {
                        retryCount++;
                        console.warn(`Failed to capture segment ${i + 1}, attempt ${retryCount}/${maxRetries}:`, error);
                        
                        if (retryCount < maxRetries) {
                            // Wait before retry
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } else {
                            console.error(`Failed to capture segment ${i + 1} after ${maxRetries} attempts`);
                            this.showSelectionNotification(`Failed to capture segment ${i + 1} after ${maxRetries} attempts`, 'error');
                            return;
                        }
                    }
                }
            }
            
            // Restore original scroll position
            window.scrollTo(originalScrollLeft, originalScrollTop);
            
            // Restore hidden elements if any were hidden
            if (hiddenElements) {
                this.restoreFixedElements(hiddenElements);
            }
            
            // Stitch images together with error handling
            try {
                for (const imgData of capturedImages) {
                    const img = new Image();
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = imgData.dataUrl;
                    });
                    
                    // Draw image to canvas at correct position
                    ctx.drawImage(img, 0, imgData.scrollY);
                }
                
                // Convert canvas to data URL
                const fullPageDataUrl = canvas.toDataURL('image/png');
                
                // Show preview with download/copy options
                this.showFullPagePreview(fullPageDataUrl, {
                    width: fullW,
                    height: fullH,
                    segments: segments
                });
                
            } catch (stitchError) {
                console.error('Failed to stitch images:', stitchError);
                this.showSelectionNotification('Failed to create full page screenshot', 'error');
            }
            
        } catch (error) {
            console.error('Full page capture error:', error);
            this.showSelectionNotification('Failed to capture full page: ' + error.message, 'error');
        }
    },

    // Capture visible area (helper for full page capture)
    async captureVisibleArea() {
        return new Promise((resolve, reject) => {
            // Check if extension context is still valid
            if (!this.isExtensionContextValid()) {
                reject(new Error('Extension context invalid'));
                return;
            }
            
            // Send message to background script to capture visible tab
            chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Runtime error in captureVisibleArea:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                if (response && response.success && response.dataUrl) {
                    resolve(response.dataUrl);
                } else {
                    const errorMsg = response && response.error ? response.error : 'Failed to capture visible area';
                    reject(new Error(errorMsg));
                }
            });
        });
    },

    // Hide fixed elements to prevent duplication in full page screenshots
    hideFixedElements() {
        const hiddenElements = [];
        
        // Common selectors for fixed elements
        const fixedSelectors = [
            'header',
            'nav',
            '.header',
            '.navbar',
            '.navigation',
            '.fixed-header',
            '.sticky-header',
            '.top-bar',
            '.toolbar',
            '.menu-bar',
            '[style*="position: fixed"]',
            '[style*="position:fixed"]',
            '.fixed',
            '.sticky',
            '.floating',
            '.overlay',
            '.modal',
            '.popup',
            '.notification',
            '.toast',
            '.cookie-banner',
            '.ad-banner',
            '.social-share',
            '.scroll-to-top',
            '.back-to-top',
            '.floating-button',
            '.chat-widget',
            '.support-widget',
            '.live-chat',
            '.feedback-button'
        ];
        
        // Find and hide fixed elements
        fixedSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const computedStyle = window.getComputedStyle(element);
                    const position = computedStyle.position;
                    
                    // Check if element is fixed, sticky, or has fixed positioning
                    if (position === 'fixed' || position === 'sticky' || 
                        element.style.position === 'fixed' || 
                        element.style.position === 'sticky' ||
                        element.classList.contains('fixed') ||
                        element.classList.contains('sticky')) {
                        
                        // Store original visibility
                        const originalDisplay = element.style.display;
                        const originalVisibility = element.style.visibility;
                        const originalOpacity = element.style.opacity;
                        
                        // Hide the element
                        element.style.display = 'none';
                        element.style.visibility = 'hidden';
                        element.style.opacity = '0';
                        
                        // Store for restoration
                        hiddenElements.push({
                            element: element,
                            originalDisplay: originalDisplay,
                            originalVisibility: originalVisibility,
                            originalOpacity: originalOpacity
                        });
                    }
                });
            } catch (error) {
                console.warn('Error processing selector:', selector, error);
            }
        });
        
        // Also check for elements with inline fixed positioning
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            try {
                const style = element.style;
                if (style.position === 'fixed' || style.position === 'sticky') {
                    // Check if we haven't already hidden this element
                    const alreadyHidden = hiddenElements.some(hidden => hidden.element === element);
                    
                    if (!alreadyHidden) {
                        const originalDisplay = style.display;
                        const originalVisibility = style.visibility;
                        const originalOpacity = style.opacity;
                        
                        style.display = 'none';
                        style.visibility = 'hidden';
                        style.opacity = '0';
                        
                        hiddenElements.push({
                            element: element,
                            originalDisplay: originalDisplay,
                            originalVisibility: originalVisibility,
                            originalOpacity: originalOpacity
                        });
                    }
                }
            } catch (error) {
                // Ignore errors for individual elements
            }
        });
        
        console.log(`Hidden ${hiddenElements.length} fixed elements for full page capture`);
        return hiddenElements;
    },

    // Restore hidden fixed elements
    restoreFixedElements(hiddenElements) {
        if (!hiddenElements || !Array.isArray(hiddenElements)) {
            return;
        }
        
        hiddenElements.forEach(item => {
            try {
                if (item.element && item.element.style) {
                    // Restore original styles
                    if (item.originalDisplay !== undefined) {
                        item.element.style.display = item.originalDisplay;
                    }
                    if (item.originalVisibility !== undefined) {
                        item.element.style.visibility = item.originalVisibility;
                    }
                    if (item.originalOpacity !== undefined) {
                        item.element.style.opacity = item.originalOpacity;
                    }
                }
            } catch (error) {
                console.warn('Error restoring element:', error);
            }
        });
        
        console.log(`Restored ${hiddenElements.length} fixed elements`);
    },

    // Show full page preview
    showFullPagePreview(dataUrl, pageInfo) {
        // Create overlay similar to selection preview
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create preview container
        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;

        // Create preview image
        const previewImg = document.createElement('img');
        previewImg.src = dataUrl;
        previewImg.style.cssText = `
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        `;

        // Create info text
        const infoText = document.createElement('div');
        infoText.style.cssText = `
            margin-top: 12px;
            font-size: 14px;
            color: #666;
            text-align: center;
        `;
        infoText.textContent = `Full page: ${pageInfo.width}×${pageInfo.height}px (${pageInfo.segments} segments)`;

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            margin-top: 16px;
            justify-content: center;
        `;

        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.innerHTML = 'Download';
        downloadBtn.onclick = () => {
            this.downloadFullPageScreenshot(dataUrl);
            overlay.remove();
        };

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = 'Copy';
        copyBtn.onclick = () => {
            this.copyScreenshotToClipboard(dataUrl);
            overlay.remove();
        };

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = 'Close';
        closeBtn.onclick = () => {
            overlay.remove();
        };

        // Apply button styles
        const baseBtnStyle = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 6px 10px;
            border-radius: 8px;
            border: none;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            color: #fff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            transition: transform .06s ease, box-shadow .2s ease, background-color .2s ease, opacity .2s ease;
            user-select: none;
            min-height: 32px;
        `;
        const styleBtn = (btn, bg, hoverBg) => {
            btn.style.cssText = baseBtnStyle + `background:${bg};`;
            btn.onmouseenter = () => { btn.style.background = hoverBg; btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.18)'; };
            btn.onmouseleave = () => { btn.style.background = bg; btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)'; };
            btn.onmousedown = () => { btn.style.transform = 'scale(0.98)'; };
            btn.onmouseup = () => { btn.style.transform = 'scale(1)'; };
        };
        styleBtn(downloadBtn, '#4f46e5', '#4338ca');
        styleBtn(copyBtn, '#10b981', '#0ea871');
        styleBtn(closeBtn, '#6b7280', '#4b5563');

        // Assemble preview
        buttonContainer.appendChild(downloadBtn);
        buttonContainer.appendChild(copyBtn);
        buttonContainer.appendChild(closeBtn);

        previewContainer.appendChild(previewImg);
        previewContainer.appendChild(infoText);
        previewContainer.appendChild(buttonContainer);

        overlay.appendChild(previewContainer);
        document.body.appendChild(overlay);

        // Add ESC key listener
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    },

    // Download full page screenshot
    downloadFullPageScreenshot(dataUrl) {
        try {
            const link = document.createElement('a');
            link.download = `tobe-fullpage-${Date.now()}.png`;
            link.href = dataUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showSelectionNotification('Full page screenshot downloaded!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showSelectionNotification('Failed to download screenshot', 'error');
        }
    },

    // Copy screenshot to clipboard
    copyScreenshotToClipboard(dataUrl) {
        try {
            // Convert data URL to blob
            fetch(dataUrl)
                .then(res => res.blob())
                .then(blob => {
                    // Create clipboard item
                    const clipboardItem = new ClipboardItem({
                        'image/png': blob
                    });
                    
                    // Copy to clipboard
                    navigator.clipboard.write([clipboardItem]).then(() => {
                        this.showSelectionNotification('Screenshot copied to clipboard!', 'success');
                    }).catch(() => {
                        this.showSelectionNotification('Failed to copy to clipboard', 'error');
                    });
                })
                .catch(error => {
                    console.error('Copy error:', error);
                    this.showSelectionNotification('Failed to copy screenshot', 'error');
                });
        } catch (error) {
            console.error('Copy error:', error);
            this.showSelectionNotification('Failed to copy screenshot', 'error');
        }
    }
};

// Auto-initialize based on context
if (typeof window !== 'undefined') {
    if (window.location.href.includes('popup.html')) {
        // Popup context - will be initialized by popup.js
    } else {
        // Content script context
        ScreenshotSelection.initContentScript();
    }
}
