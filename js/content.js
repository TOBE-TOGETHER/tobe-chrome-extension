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
