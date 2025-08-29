// JSON Formatter - Refactored Architecture
// ===========================================

// Core Data Structures
// ====================

class JsonNode {
    constructor(value, type, level, parent = null) {
        this.value = value;
        this.type = type; // 'object', 'array', 'primitive'
        this.level = level;
        this.parent = parent;
        this.children = [];
        this.isExpanded = true;
        this.lineNumber = 0;
        this.element = null; // 对应的DOM元素
        this.key = null; // 对象属性的键名
    }
}

class JsonTree {
    constructor() {
        this.root = null;
        this.nodes = new Map();
        this.visibleNodes = [];
        this.lineCounter = 1;
    }
    
    build(jsonData) {
        this.root = this.createNode(jsonData, 0);
        this.buildTree(this.root, jsonData, 0);
        this.calculateLineNumbers();
    }
    
    createNode(value, level, key = null) {
        let type = 'primitive';
        if (Array.isArray(value)) {
            type = 'array';
        } else if (value !== null && typeof value === 'object') {
            type = 'object';
        }
        
        const node = new JsonNode(value, type, level);
        node.key = key;
        return node;
    }
    
    buildTree(parent, value, level) {
        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                const child = this.createNode(item, level + 1, index);
                child.parent = parent;
                parent.children.push(child);
                this.buildTree(child, item, level + 1);
            });
        } else if (value !== null && typeof value === 'object') {
            Object.entries(value).forEach(([key, val]) => {
                const child = this.createNode(val, level + 1, key);
                child.parent = parent;
                parent.children.push(child);
                this.buildTree(child, val, level + 1);
            });
        }
    }
    
    calculateLineNumbers() {
        this.lineCounter = 1;
        this.visibleNodes = [];
        this.calculateVisibleNodes(this.root);
    }
    
    calculateVisibleNodes(node) {
        if (!node) return;
        
        node.lineNumber = this.lineCounter++;
        this.visibleNodes.push(node);
        
        if (node.isExpanded && node.children.length > 0) {
            node.children.forEach(child => {
                this.calculateVisibleNodes(child);
            });
        }
    }
    
    toggleNode(node) {
        node.isExpanded = !node.isExpanded;
        this.calculateLineNumbers();
        return this.visibleNodes;
    }
    
    expandAll() {
        this.expandNode(this.root);
        this.calculateLineNumbers();
        return this.visibleNodes;
    }
    
    collapseAll() {
        this.collapseNode(this.root);
        this.calculateLineNumbers();
        return this.visibleNodes;
    }
    
    expandNode(node) {
        if (!node) return;
        node.isExpanded = true;
        node.children.forEach(child => {
            this.expandNode(child);
        });
    }
    
    collapseNode(node) {
        if (!node) return;
        node.isExpanded = false;
        node.children.forEach(child => {
            this.collapseNode(child);
        });
    }
}

// Core Renderer
// =============

class JsonRenderer {
    constructor(container) {
        this.container = container;
        this.tree = new JsonTree();
        this.stateManager = new StateManager();
    }
    
    render(jsonData) {
        try {
            // 构建树结构
            this.tree.build(jsonData);
            
            // 恢复保存的状态
            this.stateManager.restoreState(this.tree);
            
            // 生成HTML
            this.generateHTML();
            
            // 绑定事件
            this.bindEvents();
            
            return true;
        } catch (error) {
            console.error('Render error:', error);
            return false;
        }
    }
    
    generateHTML() {
        const html = this.renderNode(this.tree.root);
        this.container.innerHTML = html;
    }
    
    renderNode(node) {
        if (!node) return '';
        
        let html = '';
        
        // 如果是对象属性（有key），需要特殊处理
        if (node.key !== null && node.parent && node.parent.type === 'object') {
            html += this.renderObjectPropertyNode(node);
        } else {
            // 渲染当前节点
            html += this.renderNodeContent(node);
        }
        
        // 渲染子节点（如果展开）
        if (node.isExpanded && node.children.length > 0) {
            node.children.forEach(child => {
                html += this.renderNode(child);
            });
            
            // 为数组和对象添加结束括号
            if (node.type === 'array' || node.type === 'object') {
                html += this.renderClosingBracket(node);
            }
        }
        
        return html;
    }
    
    renderNodeContent(node) {
        const indentClass = node.level > 0 ? ` json-indent-${node.level}` : '';
        const toggleHtml = this.renderToggle(node);
        const contentHtml = this.renderValue(node);
        
        return `
            <div class="json-line-container${indentClass}" data-node-id="${node.lineNumber}">
                <div class="json-line-numbers">
                    <span class="json-line-number">${node.lineNumber}</span>
                    ${toggleHtml}
                </div>
                <div class="json-line-content">${contentHtml}</div>
            </div>
        `;
    }
    
    renderToggle(node) {
        if (node.children.length === 0) return '';
        
        const state = node.isExpanded ? 'expanded' : 'collapsed';
        return `<span class="json-toggle ${state}" data-node-id="${node.lineNumber}"></span>`;
    }
    
    renderValue(node) {
        if (node.type === 'primitive') {
            return this.renderPrimitive(node);
        } else if (node.type === 'array') {
            return this.renderArray(node);
        } else if (node.type === 'object') {
            return this.renderObject(node);
        }
        return '';
    }
    
    renderPrimitive(node) {
        const value = node.value;
        const isLast = this.isLastChild(node);
        const comma = !isLast ? '<span class="json-comma">,</span>' : '';
        
        if (value === null) {
            return `<span class="json-null">null</span>${comma}`;
        } else if (typeof value === 'boolean') {
            return `<span class="json-boolean">${value}</span>${comma}`;
        } else if (typeof value === 'number') {
            return `<span class="json-number">${value}</span>${comma}`;
        } else if (typeof value === 'string') {
            return `<span class="json-string">"${this.escapeHtml(value)}"</span>${comma}`;
        }
        return '';
    }
    
    renderArray(node) {
        const isLast = this.isLastChild(node);
        const comma = !isLast ? '<span class="json-comma">,</span>' : '';
        
        if (node.children.length === 0) {
            return `<span class="json-bracket">[</span><span class="json-bracket">]</span>${comma}`;
        }
        
        // 如果节点没有展开，显示完整的数组格式
        if (!node.isExpanded) {
            return `<span class="json-bracket">[</span><span class="json-bracket">]</span>${comma}`;
        }
        
        return `<span class="json-bracket">[</span>`;
    }
    
    renderObject(node) {
        const isLast = this.isLastChild(node);
        const comma = !isLast ? '<span class="json-comma">,</span>' : '';
        
        if (node.children.length === 0) {
            return `<span class="json-bracket">{</span><span class="json-bracket">}</span>${comma}`;
        }
        
        // 如果节点没有展开，显示完整的对象格式
        if (!node.isExpanded) {
            return `<span class="json-bracket">{</span><span class="json-bracket">}</span>${comma}`;
        }
        
        return `<span class="json-bracket">{</span>`;
    }
    
    renderObjectPropertyNode(node) {
        const indentClass = node.level > 0 ? ` json-indent-${node.level}` : '';
        const toggleHtml = this.renderToggle(node);
        const isLast = this.isLastChild(node);
        const comma = !isLast ? '<span class="json-comma">,</span>' : '';
        
        let valueHtml = '';
        let shouldAddComma = true; // 控制是否添加逗号
        
        if (node.type === 'primitive') {
            valueHtml = this.renderPrimitiveValue(node.value);
        } else if (node.type === 'array' || node.type === 'object') {
            // 对于复杂类型，根据展开状态显示不同的格式
            if (!node.isExpanded || node.children.length === 0) {
                // 收缩状态或空数组/对象：显示完整的括号
                const brackets = node.type === 'array' ? '[]' : '{}';
                valueHtml = `<span class="json-bracket">${brackets[0]}</span><span class="json-bracket">${brackets[1]}</span>`;
            } else {
                // 展开状态：只显示开始括号，不添加逗号
                const bracket = node.type === 'array' ? '[' : '{';
                valueHtml = `<span class="json-bracket">${bracket}</span>`;
                shouldAddComma = false; // 开始括号后不添加逗号
            }
        }
        
        const finalComma = shouldAddComma ? comma : '';
        
        return `
            <div class="json-line-container${indentClass}" data-node-id="${node.lineNumber}">
                <div class="json-line-numbers">
                    <span class="json-line-number">${node.lineNumber}</span>
                    ${toggleHtml}
                </div>
                <div class="json-line-content">
                    <span class="json-key">"${this.escapeHtml(node.key)}"</span><span class="json-comma">: </span>${valueHtml}${finalComma}
                </div>
            </div>
        `;
    }
    
    renderClosingBracket(node) {
        const isLast = this.isLastChild(node);
        const comma = !isLast ? '<span class="json-comma">,</span>' : '';
        const closingBracket = node.type === 'array' ? ']' : '}';
        
        return `
            <div class="json-line-container${node.level > 0 ? ` json-indent-${node.level}` : ''}" data-node-id="${node.lineNumber + 1}">
                <div class="json-line-numbers">
                    <span class="json-line-number">${node.lineNumber + 1}</span>
                </div>
                <div class="json-line-content"><span class="json-bracket">${closingBracket}</span>${comma}</div>
            </div>
        `;
    }
    
    renderPrimitiveValue(value) {
        if (value === null) {
            return `<span class="json-null">null</span>`;
        } else if (typeof value === 'boolean') {
            return `<span class="json-boolean">${value}</span>`;
        } else if (typeof value === 'number') {
            return `<span class="json-number">${value}</span>`;
        } else if (typeof value === 'string') {
            return `<span class="json-string">"${this.escapeHtml(value)}"</span>`;
        }
        return '';
    }
    
    isLastChild(node) {
        if (!node.parent) return true;
        const siblings = node.parent.children;
        return siblings[siblings.length - 1] === node;
    }
    
    bindEvents() {
        this.bindToggleEvents();
        this.bindKeyboardEvents();
    }
    
    bindToggleEvents() {
        const toggles = this.container.querySelectorAll('.json-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeId = parseInt(toggle.dataset.nodeId);
                this.handleToggle(nodeId);
            });
        });
    }
    
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                window.formatJson();
            }
        });
    }
    
    handleToggle(nodeId) {
        const node = this.findNodeById(nodeId);
        if (!node) return;
        
        const visibleNodes = this.tree.toggleNode(node);
        this.updateDisplay(visibleNodes);
        this.stateManager.saveState(this.tree);
    }
    
    findNodeById(nodeId) {
        return this.tree.visibleNodes.find(node => node.lineNumber === nodeId);
    }
    
    updateDisplay(visibleNodes) {
        // 重新生成HTML并更新显示
        this.generateHTML();
        this.bindToggleEvents();
    }
    
    expandAll() {
        const visibleNodes = this.tree.expandAll();
        this.updateDisplay(visibleNodes);
        this.stateManager.saveState(this.tree);
    }
    
    collapseAll() {
        const visibleNodes = this.tree.collapseAll();
        this.updateDisplay(visibleNodes);
        this.stateManager.saveState(this.tree);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// State Manager
// =============

class StateManager {
    constructor() {
        this.storageKey = 'jsonFormatterState';
    }
    
    saveState(tree) {
        try {
            const state = this.serializeTree(tree.root);
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }
    
    restoreState(tree) {
        try {
            const savedState = localStorage.getItem(this.storageKey);
            if (savedState) {
                const state = JSON.parse(savedState);
                this.deserializeTree(tree.root, state);
            }
        } catch (error) {
            console.error('Failed to restore state:', error);
        }
    }
    
    serializeTree(node) {
        if (!node) return null;
        
        return {
            isExpanded: node.isExpanded,
            children: node.children.map(child => this.serializeTree(child))
        };
    }
    
    deserializeTree(node, state) {
        if (!node || !state) return;
        
        node.isExpanded = state.isExpanded;
        
        if (state.children && state.children.length === node.children.length) {
            state.children.forEach((childState, index) => {
                this.deserializeTree(node.children[index], childState);
            });
        }
    }
}

// Global Variables and DOM Elements
// =================================

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

let currentJsonData = null;
let jsonRenderer = null;
let isInputCollapsed = false;

// Initialize
// ==========

document.addEventListener('DOMContentLoaded', () => {
    initializeJsonFormatter();
    loadJsonFromUrl();
    loadJsonFromContextMenu();
    loadInputWindowState();
    setupEventListeners();
});

function initializeJsonFormatter() {
    jsonRenderer = new JsonRenderer(jsonOutput);
    
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
}

function setupEventListeners() {
    formatBtn.addEventListener('click', formatJson);
    clearBtn.addEventListener('click', clearAll);
    expandAllBtn.addEventListener('click', expandAll);
    collapseAllBtn.addEventListener('click', collapseAll);
    copyBtn.addEventListener('click', copyToClipboard);
    toggleInputBtn.addEventListener('click', toggleInputWindow);
    
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
}

// Core Functions
// ==============

function formatJson() {
    const input = jsonInput.value.trim();
    if (!input) {
        showError('Please enter some JSON data');
        return;
    }

    try {
        const parsed = JSON.parse(input);
        currentJsonData = parsed;
        
        const success = jsonRenderer.render(parsed);
        if (success) {
            jsonOutput.classList.add('loaded');
            showSuccess('JSON formatted successfully!');
        } else {
            showError('Failed to render JSON');
        }
    } catch (error) {
        showError(`Invalid JSON: ${error.message}`);
        return;
    }
}

function expandAll() {
    if (jsonRenderer) {
        jsonRenderer.expandAll();
        showSuccess('All items expanded!');
    }
}

function collapseAll() {
    if (jsonRenderer) {
        jsonRenderer.collapseAll();
        showSuccess('All items collapsed!');
    }
}

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

// Utility Functions
// =================

function showError(message) {
    const messageArea = document.getElementById('messageArea');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message error';
    errorDiv.textContent = message;
    
    messageArea.innerHTML = '';
    messageArea.appendChild(errorDiv);
    
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
    
    messageArea.innerHTML = '';
    messageArea.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

// Input Window Management
// =======================

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
    
    localStorage.setItem('jsonFormatterInputCollapsed', isInputCollapsed);
}

function loadInputWindowState() {
    const savedState = localStorage.getItem('jsonFormatterInputCollapsed');
    if (savedState === 'true') {
        isInputCollapsed = true;
        inputWindow.classList.add('collapsed');
        mainContent.classList.add('expanded');
        toggleInputBtn.classList.add('collapsed');
    }
}

// Chrome Extension Integration
// ===========================

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

async function loadJsonFromContextMenu() {
    try {
        const result = await chrome.storage.local.get('contextMenuJsonData');
        if (result.contextMenuJsonData) {
            const { text, isValidJson, timestamp } = result.contextMenuJsonData;
            
            const now = Date.now();
            if (now - timestamp < 30000) {
                jsonInput.value = text;
                formatJson();
                
                chrome.storage.local.remove('contextMenuJsonData');
                
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

// Chrome runtime message listener
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

// Global function for keyboard shortcuts
window.formatJson = formatJson;
