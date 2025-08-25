// Content script for TOBE Chrome Extension

// Check if extension context is valid
function isExtensionContextValid() {
    try {
        return typeof chrome !== 'undefined' && 
               chrome.runtime && 
               chrome.runtime.id;
    } catch (error) {
        return false;
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
        console.warn('Extension context invalid, ignoring message');
        sendResponse({ error: 'Extension context invalid' });
        return;
    }
    
    switch (request.action) {
        case 'captureSelection':
            enableSelectionCapture();
            sendResponse({ success: true });
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// Enable selection capture mode
function enableSelectionCapture() {
    let isSelecting = false;
    let startX, startY, endX, endY;
    let selectionBox = null;
    
    function createSelectionBox() {
        selectionBox = document.createElement('div');
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
        if (!isExtensionContextValid()) {
            showSelectionNotification('Extension context invalid. Please refresh the page.', 'error');
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
                    showSelectionNotification('Failed to capture screenshot: Extension error', 'error');
                    return;
                }
                
                if (response && response.success) {
                    // Show preview with toolbar
                    showScreenshotPreview(response.dataUrl, data);
                } else {
                    const errorMsg = response && response.error ? response.error : 'Unknown error';
                    showSelectionNotification(`Failed to capture screenshot: ${errorMsg}`, 'error');
                }
            });
        } catch (error) {
            console.error('Error sending message to background script:', error);
            showSelectionNotification('Failed to capture screenshot: Communication error', 'error');
        }
    }
    
    function showSelectionNotification(message, type) {
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
    }
    
    function showScreenshotPreview(dataUrl, selectionData) {
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
        
        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: auto;
            z-index: 10002;
        `;
        
        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download';
        downloadBtn.className = 'btn btn-primary';
        downloadBtn.style.cssText = `
            height: 36px;
            font-size: 13px;
            font-weight: 500;
            min-width: 80px;
        `;
        downloadBtn.onclick = () => {
            downloadScreenshot(dataUrl);
            overlay.remove();
            document.removeEventListener('keydown', handlePreviewKeyDown);
        };
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy';
        copyBtn.className = 'btn btn-success';
        copyBtn.style.cssText = `
            height: 36px;
            font-size: 13px;
            font-weight: 500;
            min-width: 80px;
        `;
        copyBtn.onclick = () => {
            copyScreenshotToClipboard(dataUrl);
            overlay.remove();
            document.removeEventListener('keydown', handlePreviewKeyDown);
        };
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.className = 'btn btn-danger';
        closeBtn.style.cssText = `
            height: 36px;
            font-size: 13px;
            font-weight: 500;
            min-width: 80px;
        `;
        closeBtn.onclick = () => {
            overlay.remove();
            document.removeEventListener('keydown', handlePreviewKeyDown);
        };
        
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
        showSelectionNotification('Screenshot captured! Use toolbar to download or copy.', 'success');
    }
    
    function downloadScreenshot(dataUrl) {
        try {
            const link = document.createElement('a');
            link.download = `tobe-screenshot-${Date.now()}.png`;
            link.href = dataUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showSelectionNotification('Screenshot downloaded!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            showSelectionNotification('Failed to download screenshot', 'error');
        }
    }
    
    function copyScreenshotToClipboard(dataUrl) {
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
                        showSelectionNotification('Screenshot copied to clipboard!', 'success');
                    }).catch(() => {
                        showSelectionNotification('Failed to copy to clipboard', 'error');
                    });
                })
                .catch(error => {
                    console.error('Copy error:', error);
                    showSelectionNotification('Failed to copy screenshot', 'error');
                });
        } catch (error) {
            console.error('Copy error:', error);
            showSelectionNotification('Failed to copy screenshot', 'error');
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
}

// Floating action button removed - no longer needed for dedicated JSON formatter page
