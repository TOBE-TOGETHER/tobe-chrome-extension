// Timestamp converter module for TOBE Chrome Extension
// Contains all timestamp conversion functionality

// Timestamp module namespace
const Timestamp = {
    // DOM element references (will be initialized)
    timestampInput: null,
    dateInput: null,
    convertToDateBtn: null,
    convertToTimestampBtn: null,
    dateResult: null,
    timestampResult: null,
    currentTimestamp: null,
    currentDate: null,
    copyCurrentBtn: null,
    updateInterval: null,

    // Initialize timestamp functionality in popup
    initPopup() {
        this.timestampInput = document.getElementById('timestampInput');
        this.dateInput = document.getElementById('dateInput');
        this.convertToDateBtn = document.getElementById('convertToDate');
        this.convertToTimestampBtn = document.getElementById('convertToTimestamp');
        this.dateResult = document.getElementById('dateResult');
        this.timestampResult = document.getElementById('timestampResult');
        this.currentTimestamp = document.getElementById('currentTimestamp');
        this.currentDate = document.getElementById('currentDate');
        this.copyCurrentBtn = document.getElementById('copyCurrent');

        // Set up event listeners
        if (this.convertToDateBtn) {
            this.convertToDateBtn.addEventListener('click', this.convertTimestampToDate.bind(this));
        }
        if (this.convertToTimestampBtn) {
            this.convertToTimestampBtn.addEventListener('click', this.convertDateToTimestamp.bind(this));
        }
        if (this.copyCurrentBtn) {
            this.copyCurrentBtn.addEventListener('click', this.copyCurrentTimestamp.bind(this));
        }

        // Set up keyboard shortcuts
        if (this.timestampInput) {
            this.timestampInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.convertTimestampToDate();
                }
            });
        }

        if (this.dateInput) {
            this.dateInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.convertDateToTimestamp();
                }
            });
        }

        // Initialize current time display
        if (this.currentTimestamp && this.currentDate) {
            this.updateCurrentTime();
            // Update current time every second
            this.updateInterval = setInterval(() => this.updateCurrentTime(), 1000);
        }
    },

    // Cleanup function (for future use)
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    },

    // Convert timestamp to human-readable date
    convertTimestampToDate() {
        const timestamp = this.timestampInput.value.trim();
        if (!timestamp) {
            this.dateResult.textContent = 'Please enter a timestamp';
            return;
        }
        
        try {
            let date;
            const num = parseInt(timestamp);
            
            if (isNaN(num)) {
                this.dateResult.textContent = 'Invalid timestamp format';
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
                this.dateResult.textContent = 'Invalid timestamp';
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
            
            this.dateResult.textContent = `${formattedDate} (${date.toISOString()})`;
        } catch (error) {
            this.dateResult.textContent = 'Error converting timestamp';
            console.error('Timestamp conversion error:', error);
        }
    },

    // Convert date to timestamp
    convertDateToTimestamp() {
        const dateValue = this.dateInput.value;
        if (!dateValue) {
            this.timestampResult.textContent = 'Please select a date';
            return;
        }
        
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                this.timestampResult.textContent = 'Invalid date';
                return;
            }
            
            const seconds = Math.floor(date.getTime() / 1000);
            const milliseconds = date.getTime();
            
            this.timestampResult.textContent = `Seconds: ${seconds}\nMilliseconds: ${milliseconds}`;
        } catch (error) {
            this.timestampResult.textContent = 'Error converting date';
            console.error('Date conversion error:', error);
        }
    },

    // Update current time display
    updateCurrentTime() {
        if (!this.currentTimestamp || !this.currentDate) return;
        
        const now = new Date();
        const seconds = Math.floor(now.getTime() / 1000);
        const milliseconds = now.getTime();
        
        this.currentTimestamp.textContent = `Timestamp: ${seconds} (${milliseconds})`;
        this.currentDate.textContent = `Date: ${now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        })}`;
    },

    // Copy current timestamp to clipboard
    copyCurrentTimestamp() {
        const now = new Date();
        const seconds = Math.floor(now.getTime() / 1000);
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(seconds.toString()).then(() => {
                this.showNotification('Current timestamp copied!');
            }).catch(() => {
                this.showNotification('Failed to copy timestamp');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = seconds.toString();
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Current timestamp copied!');
        }
    },

    // Show notification (will use global showNotification if available)
    showNotification(message) {
        if (typeof showNotification === 'function') {
            showNotification(message);
        } else {
            console.log('Timestamp notification:', message);
        }
    },

    // Utility functions for external use
    getTimestamp() {
        return Math.floor(Date.now() / 1000);
    },

    getTimestampMs() {
        return Date.now();
    },

    formatTimestamp(timestamp, inSeconds = true) {
        const date = new Date(inSeconds ? timestamp * 1000 : timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    },

    parseTimestamp(timestampStr) {
        const num = parseInt(timestampStr);
        if (isNaN(num)) return null;
        
        // Auto-detect seconds vs milliseconds
        if (timestampStr.length === 10) {
            return new Date(num * 1000);
        } else if (timestampStr.length === 13) {
            return new Date(num);
        } else {
            // Try both and return the more reasonable one
            const asSeconds = new Date(num * 1000);
            const asMs = new Date(num);
            
            // If seconds result is in reasonable range (after 1970, before 3000)
            const secondsTime = asSeconds.getTime();
            if (secondsTime > 0 && secondsTime < 32503680000000) { // Year 3000
                return asSeconds;
            }
            return asMs;
        }
    }
};

// Auto-initialize if in popup context
if (typeof window !== 'undefined' && window.location.href.includes('popup.html')) {
    // Will be initialized by popup.js calling Timestamp.initPopup()
}
