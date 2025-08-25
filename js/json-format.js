// JSON Formatter Page JavaScript

// DOM elements
const jsonInput = document.getElementById('jsonInput');
const jsonOutput = document.getElementById('jsonOutput');
const formatBtn = document.getElementById('formatBtn');
const clearBtn = document.getElementById('clearBtn');
const expandAllBtn = document.getElementById('expandAllBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');
const copyBtn = document.getElementById('copyBtn');
const toggleInputBtn = document.getElementById('toggleInputBtn');
const inputWindow = document.querySelector('.input-window');
const mainContent = document.querySelector('.main-content');

// Global variables
let currentJsonData = null;
let isExpanded = true;
let isInputCollapsed = false;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Add sample JSON for testing
    jsonInput.placeholder = `Paste your JSON here...
Example:
{
  "records": [
    {
      "id": "bbc5d93e22f4cbed0592edc0a2f106ec",
      "publicToAll": true,
      "publishTime": 1751006913000,
      "viewCount": 137,
      "likeCount": 4,
      "ownerId": 10,
      "ownerName": "Lucien Chen",
      "tags": [
        {"value": 27, "label": "Lyrics"},
        {"value": 50, "label": "100首经典"}
      ],
      "topic": "LANGUAGE"
    }
  ]
}`;
    
    // Load JSON from URL if present
    loadJsonFromUrl();
    
    // Load JSON from context menu if present
    loadJsonFromContextMenu();
    
    // Load input window state and set up toggle button
    loadInputWindowState();
    toggleInputBtn.addEventListener('click', toggleInputWindow);
});

// Listen for messages (e.g., from background to reload data)
try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request && request.action === 'loadJsonFromStorage') {
            loadJsonFromContextMenu();
            sendResponse({ ok: true });
        }
    });
} catch (e) {
    // ignore if not in extension context
}

// Load JSON from URL parameters
function loadJsonFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const jsonParam = urlParams.get('json');
    if (jsonParam) {
        try {
            jsonInput.value = decodeURIComponent(jsonParam);
            formatJson();
        } catch (error) {
            console.error('Error loading JSON from URL:', error);
        }
    }
}

// Load JSON from context menu
async function loadJsonFromContextMenu() {
    try {
        const result = await chrome.storage.local.get('contextMenuJsonData');
        if (result.contextMenuJsonData) {
            const { text, isValidJson, timestamp } = result.contextMenuJsonData;
            
            // Check if the data is recent (within last 30 seconds)
            const now = Date.now();
            if (now - timestamp < 30000) {
                jsonInput.value = text;
                formatJson();
                
                // Clear the stored data to avoid loading it again
                chrome.storage.local.remove('contextMenuJsonData');
                
                // Show success message
                if (isValidJson) {
                    showSuccess('JSON loaded from selection and formatted successfully!');
                } else {
                    showError('Selected text is not valid JSON, but attempting to format...');
                }
            }
        }
    } catch (error) {
        console.error('Error loading JSON from context menu:', error);
    }
}

// Format JSON function
function formatJson() {
    const input = jsonInput.value.trim();
    if (!input) {
        showError('Please enter some JSON data');
        return;
    }

    try {
        const parsed = JSON.parse(input);
        currentJsonData = parsed;
        const formatted = renderJson(parsed, 0, true); // Top level is always last
        jsonOutput.innerHTML = formatted;
        jsonOutput.classList.add('loaded');
        showSuccess('JSON formatted successfully!');
        
        // Add event listeners to toggle buttons
        addToggleListeners();
    } catch (error) {
        showError(`Invalid JSON: ${error.message}`);
        // Don't clear the JSON output area for errors
        return;
    }
}

// Render JSON with syntax highlighting and collapsible structure
function renderJson(obj, level = 0, isLastItem = false) {
    const indent = '  '.repeat(level);
    const nextIndent = '  '.repeat(level + 1);
    
    if (obj === null) {
        const comma = !isLastItem ? '<span class="json-comma">,</span>' : '';
        return `<span class="json-null">null</span>${comma}`;
    }
    
    if (typeof obj === 'boolean') {
        const comma = !isLastItem ? '<span class="json-comma">,</span>' : '';
        return `<span class="json-boolean">${obj}</span>${comma}`;
    }
    
    if (typeof obj === 'number') {
        const comma = !isLastItem ? '<span class="json-comma">,</span>' : '';
        return `<span class="json-number">${obj}</span>${comma}`;
    }
    
    if (typeof obj === 'string') {
        const comma = !isLastItem ? '<span class="json-comma">,</span>' : '';
        return `<span class="json-string">"${escapeHtml(obj)}"</span>${comma}`;
    }
    
    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            const comma = !isLastItem ? '<span class="json-comma">,</span>' : '';
            return `<span class="json-bracket">[</span><span class="json-bracket">]</span>${comma}`;
        }
        
        const hasComplexItems = obj.some(item => typeof item === 'object' && item !== null);
        
        if (!hasComplexItems) {
            // Simple array - render inline
            const items = obj.map((item, index) => {
                // Suppress per-item trailing commas; join will add separators
                return renderJson(item, level + 1, true);
            }).join('<span class="json-comma">, </span>');
            const comma = !isLastItem ? '<span class="json-comma">,</span>' : '';
            return `<span class="json-bracket">[</span> ${items} <span class="json-bracket">]</span>${comma}`;
        } else {
            // Complex array - 数组中的对象，展开符号在对象开始括号左边
            const items = obj.map((item, index) => {
                const isLast = index === obj.length - 1;
                
                if (typeof item === 'object' && item !== null) {
                    // 对象元素：展开符号在对象前面
                    const rendered = renderJson(item, level + 1, isLast);
                    const sep = !isLast ? '<span class="json-comma">,</span>' : '';
                    const placeholder = Array.isArray(item)
                        ? `<span class="json-bracket">[</span>${item.length}<span class="json-bracket"> items]</span>${sep}`
                        : `{${Object.keys(item).length} properties}${sep}`;
                    return `<div class="json-item json-array-object">
    <span class="json-toggle expanded" data-level="${level + 1}"></span>
    <div class="json-content expanded">${rendered}</div><div class="json-placeholder">${placeholder}</div>
</div>`;
                } else {
                    // 简单元素：直接渲染
                    const rendered = renderJson(item, level + 1, isLast);
                    return `<div class="json-item">${rendered}</div>`;
                }
            }).join('');
            
            const comma = !isLastItem ? '<span class="json-comma">,</span>' : '';
            return `<span class="json-bracket">[</span>
<div class="json-block">
${items}</div>
<div style="margin-left: 0px;"><span class="json-bracket">]</span>${comma}</div>`;
        }
    }
    
    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
            const comma = !isLastItem ? '<span class="json-comma">,</span>' : '';
            return `<span class="json-bracket">{</span><span class="json-bracket">}</span>${comma}`;
        }
        
        const items = keys.map((key, index) => {
            const value = obj[key];
            const isLast = index === keys.length - 1;
            const renderedValue = renderJson(value, level + 1, isLast);
            
            // 对象属性值是复杂类型（对象或数组），展开符号加在key左侧
            const needsToggle = (typeof value === 'object' && value !== null);
            
            if (needsToggle) {
                const sep = !isLast ? '<span class="json-comma">,</span>' : '';
                const placeholderVal = Array.isArray(value)
                    ? `<span class="json-bracket">[</span>${value.length}<span class="json-bracket"> items]</span>${sep}`
                    : `{${Object.keys(value).length} properties}${sep}`;
                return `<div class="json-item json-object-property">
    <span class="json-toggle expanded" data-level="${level + 1}"></span>
    <span class="json-key">"${escapeHtml(key)}"</span><span class="json-comma">: </span>
    <div class="json-content expanded">${renderedValue}</div>
    <div class="json-placeholder">${placeholderVal}</div>
</div>`;
            } else {
                return `<div class="json-item">
    <span class="json-spacer"></span>
    <span class="json-key">"${escapeHtml(key)}"</span><span class="json-comma">: </span>${renderedValue}
</div>`;
            }
        }).join('');
        
        const comma = !isLastItem ? '<span class="json-comma">,</span>' : '';
        return `<span class="json-bracket">{</span>
<div class="json-block">
${items}</div>
<div style="margin-left: 0px;"><span class="json-bracket">}</span>${comma}</div>`;
    }
    
    return '';
}

// Add event listeners to toggle buttons
function addToggleListeners() {
    const toggles = document.querySelectorAll('.json-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            // Find the json-content in the same parent element
            const content = this.parentElement.querySelector('.json-content');
            
            if (content) {
                const isExpanded = content.classList.contains('expanded');
                if (isExpanded) {
                    content.classList.remove('expanded');
                    content.classList.add('collapsed');
                    this.classList.remove('expanded');
                    this.classList.add('collapsed');
                } else {
                    content.classList.remove('collapsed');
                    content.classList.add('expanded');
                    this.classList.remove('collapsed');
                    this.classList.add('expanded');
                }
            }
        });
    });
}

// Expand all JSON items
function expandAll() {
    const contents = document.querySelectorAll('.json-content');
    const toggles = document.querySelectorAll('.json-toggle');
    
    contents.forEach(content => {
        content.classList.remove('collapsed');
        content.classList.add('expanded');
    });
    
    toggles.forEach(toggle => {
        toggle.classList.remove('collapsed');
        toggle.classList.add('expanded');
    });
    
    isExpanded = true;
}

// Collapse all JSON items
function collapseAll() {
    const contents = document.querySelectorAll('.json-content');
    const toggles = document.querySelectorAll('.json-toggle');
    
    contents.forEach(content => {
        content.classList.remove('expanded');
        content.classList.add('collapsed');
    });
    
    toggles.forEach(toggle => {
        toggle.classList.remove('expanded');
        toggle.classList.add('collapsed');
    });
    
    isExpanded = false;
}

// Copy formatted JSON to clipboard
function copyToClipboard() {
    if (!currentJsonData) {
        showError('No JSON data to copy');
        return;
    }
    
    const formattedJson = JSON.stringify(currentJsonData, null, 2);
    
    navigator.clipboard.writeText(formattedJson).then(() => {
        showSuccess('JSON copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showError('Failed to copy to clipboard');
    });
}

// Clear input and output
function clearAll() {
    jsonInput.value = '';
    jsonOutput.innerHTML = `
        <div class="placeholder">
            <span>📄</span>
            <p>Paste JSON in the input window and click Format to view</p>
        </div>
    `;
    jsonOutput.classList.remove('loaded');
    currentJsonData = null;
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const messageArea = document.getElementById('messageArea');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message error';
    errorDiv.textContent = message;
    
    // Clear existing messages
    messageArea.innerHTML = '';
    messageArea.appendChild(errorDiv);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 4000);
}

function showSuccess(message) {
    const messageArea = document.getElementById('messageArea');
    const successDiv = document.createElement('div');
    successDiv.className = 'message success';
    successDiv.textContent = message;
    
    // Clear existing messages
    messageArea.innerHTML = '';
    messageArea.appendChild(successDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to format
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        formatJson();
    }
    
    // Ctrl/Cmd + Shift + E to expand all
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        expandAll();
    }
    
    // Ctrl/Cmd + Shift + C to collapse all
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        collapseAll();
    }
    
    // Ctrl/Cmd + Shift + K to copy
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        copyToClipboard();
    }
});

// Event listeners
formatBtn.addEventListener('click', formatJson);
clearBtn.addEventListener('click', clearAll);
expandAllBtn.addEventListener('click', expandAll);
collapseAllBtn.addEventListener('click', collapseAll);
copyBtn.addEventListener('click', copyToClipboard);

// Auto-format on input change (debounced)
let formatTimeout;
jsonInput.addEventListener('input', () => {
    clearTimeout(formatTimeout);
    formatTimeout = setTimeout(() => {
        if (jsonInput.value.trim()) {
            formatJson();
        }
    }, 1000);
});

// Handle window resize for responsive design
window.addEventListener('resize', () => {
    // Re-render JSON if needed for responsive layout
    if (currentJsonData) {
        formatJson();
    }
});

// Toggle input window collapse/expand
function toggleInputWindow() {
    isInputCollapsed = !isInputCollapsed;
    
    if (isInputCollapsed) {
        inputWindow.classList.add('collapsed');
        mainContent.classList.add('expanded');
        toggleInputBtn.classList.add('collapsed');
    } else {
        inputWindow.classList.remove('collapsed');
        mainContent.classList.remove('expanded');
        toggleInputBtn.classList.remove('collapsed');
    }
    
    // Save state to localStorage
    localStorage.setItem('jsonFormatterInputCollapsed', isInputCollapsed);
}

// Load input window state from localStorage
function loadInputWindowState() {
    const savedState = localStorage.getItem('jsonFormatterInputCollapsed');
    if (savedState === 'true') {
        isInputCollapsed = true;
        inputWindow.classList.add('collapsed');
        mainContent.classList.add('expanded');
        toggleInputBtn.classList.add('collapsed');
    }
}
