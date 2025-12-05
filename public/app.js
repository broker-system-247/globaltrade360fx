// Global state and utilities for GlobalTrade360

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (data.authenticated) {
            // User is logged in
            window.currentUser = data.user;
            window.isAdmin = data.isAdmin;
            
            // Redirect if trying to access login/register while logged in
            const path = window.location.pathname;
            if ((path.includes('login') || path.includes('register')) && !path.includes('admin')) {
                window.location.href = data.isAdmin ? '/admin' : '/dashboard';
            }
            
            // Hide admin link from non-admin users
            const adminLinks = document.querySelectorAll('.admin-link, .admin-login-link');
            adminLinks.forEach(link => {
                if (!data.isAdmin) {
                    link.style.display = 'none';
                }
            });
            
        } else {
            // User is not logged in
            // Redirect if trying to access protected pages
            const path = window.location.pathname;
            const protectedPages = ['/dashboard', '/admin', '/support', '/ai-chat'];
            if (protectedPages.some(page => path.includes(page))) {
                window.location.href = '/login';
            }
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// Logout function
window.logout = async function() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout failed:', error);
    }
};

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('Failed to copy', 'error');
    });
}

// Validate email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate password strength
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return {
        score: strength,
        level: strength === 0 ? 'Very Weak' : 
               strength === 1 ? 'Weak' : 
               strength === 2 ? 'Fair' : 
               strength === 3 ? 'Good' : 'Strong'
    };
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Get URL parameters
function getUrlParams() {
    const params = {};
    window.location.search.substring(1).split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) params[key] = decodeURIComponent(value || '');
    });
    return params;
}

// Set URL parameter
function setUrlParam(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value);
    window.history.pushState({}, '', url);
}

// Remove URL parameter
function removeUrlParam(key) {
    const url = new URL(window.location);
    url.searchParams.delete(key);
    window.history.pushState({}, '', url);
}

// Generate random ID
function generateId(length = 8) {
    return Math.random().toString(36).substr(2, length);
}

// Format large numbers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
}

// Calculate percentage change
function calculateChange(oldValue, newValue) {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
}

// Sleep/delay function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// API request wrapper
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    };
    
    const config = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(endpoint, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Load market data
async function loadMarketData() {
    try {
        const data = await apiRequest('/api/market');
        
        // Update any market data displays on the page
        const marketDisplays = document.querySelectorAll('.market-data, .crypto-price');
        marketDisplays.forEach(display => {
            const symbol = display.getAttribute('data-symbol');
            if (symbol && data.crypto[symbol]) {
                const info = data.crypto[symbol];
                display.innerHTML = `
                    <span class="price">$${info.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <span class="change ${info.change >= 0 ? 'positive' : 'negative'}">
                        ${info.change >= 0 ? '+' : ''}${info.change.toFixed(2)}%
                    </span>
                `;
            }
        });
        
        return data;
    } catch (error) {
        console.error('Failed to load market data:', error);
        return null;
    }
}

// Load user data
async function loadUserData() {
    try {
        const data = await apiRequest('/api/user/dashboard');
        
        // Update any user data displays
        const balanceDisplays = document.querySelectorAll('.user-balance, .balance-amount');
        balanceDisplays.forEach(display => {
            display.textContent = formatCurrency(data.stats.balance);
        });
        
        return data;
    } catch (error) {
        console.error('Failed to load user data:', error);
        return null;
    }
}

// Initialize tooltips
function initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', function(e) {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('data-tooltip');
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
            
            this._tooltip = tooltip;
        });
        
        element.addEventListener('mouseleave', function() {
            if (this._tooltip) {
                this._tooltip.remove();
                delete this._tooltip;
            }
        });
    });
}

// Initialize modals
function initModals() {
    const modals = document.querySelectorAll('.modal');
    const modalTriggers = document.querySelectorAll('[data-modal]');
    
    // Open modal on trigger click
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    });
    
    // Close modal on close button click
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
            });
        }
    });
    
    // Close modal on outside click
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modals.forEach(modal => {
                if (modal.style.display === 'flex') {
                    modal.style.display = 'none';
                }
            });
        }
    });
}

// Initialize tabs
function initTabs() {
    const tabContainers = document.querySelectorAll('.tabs-container');
    
    tabContainers.forEach(container => {
        const tabs = container.querySelectorAll('.tab-btn');
        const contents = container.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Show active content
                contents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === tabId + 'Tab') {
                        content.classList.add('active');
                    }
                });
            });
        });
    });
}

// Initialize forms
function initForms() {
    const forms = document.querySelectorAll('form:not([data-no-init])');
    
    forms.forEach(form => {
        // Add loading state on submit
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = `
                    <span class="spinner"></span>
                    <span>Processing...</span>
                `;
                submitBtn.disabled = true;
                
                // Revert after form submission completes
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 3000);
            }
        });
        
        // Add form validation
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (!this.value.trim()) {
                    this.classList.add('error');
                } else {
                    this.classList.remove('error');
                }
            });
            
            input.addEventListener('input', function() {
                this.classList.remove('error');
            });
        });
    });
}

// Add CSS for components
const componentStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    }
    
    .notification.success {
        border-left: 4px solid var(--success);
    }
    
    .notification.error {
        border-left: 4px solid var(--danger);
    }
    
    .notification.info {
        border-left: 4px solid var(--info);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: var(--gray);
        cursor: pointer;
        padding: 0.25rem;
    }
    
    .tooltip {
        position: fixed;
        background: var(--dark);
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: var(--radius);
        font-size: 0.875rem;
        z-index: 10000;
        pointer-events: none;
        white-space: nowrap;
    }
    
    .tooltip::before {
        content: '';
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px 5px 0;
        border-style: solid;
        border-color: var(--dark) transparent transparent;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    input.error, textarea.error {
        border-color: var(--danger) !important;
    }
    
    .spinner {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s linear infinite;
        margin-right: 0.5rem;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .status-badge.success {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success);
    }
    
    .status-badge.warning {
        background: rgba(245, 158, 11, 0.1);
        color: var(--warning);
    }
    
    .status-badge.danger {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger);
    }
    
    .status-badge.info {
        background: rgba(59, 130, 246, 0.1);
        color: var(--info);
    }
    
    .positive {
        color: var(--success);
    }
    
    .negative {
        color: var(--danger);
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = componentStyles;
document.head.appendChild(styleSheet);

// Export functions for use in other files
window.GlobalTrade360 = {
    checkAuthStatus,
    logout,
    showNotification,
    formatCurrency,
    formatDate,
    copyToClipboard,
    isValidEmail,
    checkPasswordStrength,
    apiRequest,
    loadMarketData,
    loadUserData,
    initTooltips,
    initModals,
    initTabs,
    initForms
};

// Auto-initialize components when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.GlobalTrade360.initTooltips();
    window.GlobalTrade360.initModals();
    window.GlobalTrade360.initTabs();
    window.GlobalTrade360.initForms();
    
    // Auto-update market data every 30 seconds if on relevant page
    if (window.location.pathname.includes('dashboard') || 
        window.location.pathname.includes('market') ||
        window.location.pathname === '/') {
        window.GlobalTrade360.loadMarketData();
        setInterval(() => window.GlobalTrade360.loadMarketData(), 30000);
    }
});
