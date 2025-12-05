// Global state
let currentUser = null;
let isAdmin = false;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Initialize based on current page
    const path = window.location.pathname;
    
    if (path.includes('dashboard.html') || path === '/dashboard') {
        initDashboard();
    } else if (path.includes('admin.html') || path === '/admin') {
        initAdminPanel();
    } else if (path.includes('login.html') || path === '/login') {
        initLoginPage();
    } else if (path.includes('register.html') || path === '/register') {
        initRegisterPage();
    } else if (path === '/' || path.includes('index.html')) {
        initLandingPage();
    }
    
    // Password toggle functionality
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
});

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (data.authenticated) {
            currentUser = data.user;
            isAdmin = data.isAdmin;
            
            // Redirect if trying to access login/register while logged in
            const path = window.location.pathname;
            if ((path.includes('login.html') || path.includes('register.html') || path === '/login' || path === '/register') && currentUser) {
                window.location.href = isAdmin ? '/admin' : '/dashboard';
            }
            
            // Redirect if trying to access admin without admin rights
            if ((path.includes('admin.html') || path === '/admin') && !isAdmin && currentUser) {
                window.location.href = '/dashboard';
            }
        } else {
            // Redirect to login if trying to access protected pages
            const path = window.location.pathname;
            if (path.includes('dashboard.html') || path.includes('admin.html') || path === '/dashboard' || path === '/admin') {
                window.location.href = '/login';
            }
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// Initialize Login Page
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            const loginBtn = this.querySelector('button[type="submit"]');
            const loginText = document.getElementById('loginText');
            const loginSpinner = document.getElementById('loginSpinner');
            
            // Show loading state
            loginText.style.display = 'none';
            loginSpinner.style.display = 'block';
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showMessage('success', data.message);
                    setTimeout(() => {
                        window.location.href = data.redirect;
                    }, 1000);
                } else {
                    showMessage('error', data.error || 'Login failed');
                }
            } catch (error) {
                showMessage('error', 'Network error. Please try again.');
            } finally {
                // Reset loading state
                loginText.style.display = 'block';
                loginSpinner.style.display = 'none';
            }
        });
    }
}

// Initialize Register Page
function initRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        // Password strength indicator
        const passwordInput = document.getElementById('regPassword');
        const strengthBar = document.querySelector('.strength-bar');
        const strengthText = document.querySelector('.strength-text');
        
        if (passwordInput) {
            passwordInput.addEventListener('input', function() {
                const password = this.value;
                let strength = 0;
                
                if (password.length >= 8) strength++;
                if (/[A-Z]/.test(password)) strength++;
                if (/[0-9]/.test(password)) strength++;
                if (/[^A-Za-z0-9]/.test(password)) strength++;
                
                const width = (strength / 4) * 100;
                strengthBar.style.width = width + '%';
                
                if (strength === 0) {
                    strengthBar.style.background = '#ef4444';
                    strengthText.textContent = 'Password strength: Very Weak';
                } else if (strength === 1) {
                    strengthBar.style.background = '#f97316';
                    strengthText.textContent = 'Password strength: Weak';
                } else if (strength === 2) {
                    strengthBar.style.background = '#eab308';
                    strengthText.textContent = 'Password strength: Fair';
                } else if (strength === 3) {
                    strengthBar.style.background = '#22c55e';
                    strengthText.textContent = 'Password strength: Good';
                } else {
                    strengthBar.style.background = '#16a34a';
                    strengthText.textContent = 'Password strength: Strong';
                }
            });
        }
        
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            
            if (password !== confirmPassword) {
                showMessage('error', 'Passwords do not match');
                return;
            }
            
            const registerBtn = this.querySelector('button[type="submit"]');
            const registerText = document.getElementById('registerText');
            const registerSpinner = document.getElementById('registerSpinner');
            
            // Show loading state
            registerText.style.display = 'none';
            registerSpinner.style.display = 'block';
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, confirmPassword })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showMessage('success', data.message);
                    setTimeout(() => {
                        window.location.href = data.redirect;
                    }, 1500);
                } else {
                    showMessage('error', data.error || 'Registration failed');
                }
            } catch (error) {
                showMessage('error', 'Network error. Please try again.');
            } finally {
                // Reset loading state
                registerText.style.display = 'block';
                registerSpinner.style.display = 'none';
            }
        });
    }
}

// Initialize Dashboard
function initDashboard() {
    if (!currentUser) return;
    
    // Load user data
    loadDashboardData();
    
    // Set user info
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userEmail').textContent = currentUser.email;
    
    // Deposit button
    document.getElementById('showDepositForm')?.addEventListener('click', function() {
        showModal('depositModal');
    });
    
    // Start trading
    document.getElementById('startTrade')?.addEventListener('click', async function() {
        const amount = parseFloat(document.getElementById('tradeAmount').value);
        const pair = document.getElementById('tradePair').value;
        
        if (!amount || amount < 50) {
            alert('Minimum trade amount is $50');
            return;
        }
        
        try {
            const response = await fetch('/api/trade/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, pair })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Trade started successfully! Results will appear shortly.');
                loadDashboardData(); // Refresh data
            } else {
                alert(data.error || 'Trade failed to start');
            }
        } catch (error) {
            alert('Network error. Please try again.');
        }
    });
    
    // Confirm deposit
    document.getElementById('confirmDeposit')?.addEventListener('click', async function() {
        const amount = parseFloat(document.getElementById('depositAmount').value);
        const currency = document.getElementById('depositCurrency').value;
        
        if (!amount || amount < 50) {
            alert('Minimum deposit is $50');
            return;
        }
        
        try {
            const response = await fetch('/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, currency })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`Deposit initiated! Please send ${amount} ${currency} to:\n\n${data.address}\n\nYour balance will update after confirmation.`);
                hideModal('depositModal');
                loadDashboardData();
            } else {
                alert(data.error || 'Deposit failed');
            }
        } catch (error) {
            alert('Network error. Please try again.');
        }
    });
    
    // Copy address buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const addressId = this.getAttribute('data-address');
            const address = document.getElementById(addressId).textContent;
            
            navigator.clipboard.writeText(address).then(() => {
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    this.innerHTML = originalText;
                }, 2000);
            });
        });
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Click outside modal to close
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Load market data periodically
    setInterval(loadMarketData, 30000);
    loadMarketData();
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch('/api/user/dashboard');
        const data = await response.json();
        
        if (data.user) {
            // Update user info
            document.getElementById('userBalance').textContent = data.stats.balance.toFixed(2);
            document.getElementById('totalBalance').textContent = data.stats.balance.toFixed(2);
            document.getElementById('totalProfit').textContent = data.stats.totalProfit.toFixed(2);
            document.getElementById('totalDeposited').textContent = data.stats.totalDeposited.toFixed(2);
            document.getElementById('successRate').textContent = data.stats.successRate;
            
            // Update recent trades
            const tradesContainer = document.getElementById('recentTrades');
            if (tradesContainer) {
                tradesContainer.innerHTML = '';
                
                if (data.recentTrades.length === 0) {
                    tradesContainer.innerHTML = '<div class="table-row"><div colspan="5" class="text-center">No trades yet</div></div>';
                } else {
                    data.recentTrades.forEach(trade => {
                        const row = document.createElement('div');
                        row.className = 'table-row';
                        row.innerHTML = `
                            <div>${trade.pair}</div>
                            <div>$${trade.amount.toFixed(2)}</div>
                            <div class="${trade.profit >= 0 ? 'change up' : 'change down'}">
                                $${trade.profit.toFixed(2)} (${trade.percent}%)
                            </div>
                            <div><span class="status-badge status-active">${trade.status}</span></div>
                            <div>${new Date(trade.timestamp).toLocaleTimeString()}</div>
                        `;
                        tradesContainer.appendChild(row);
                    });
                }
            }
        }
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// Load market data
async function loadMarketData() {
    try {
        const response = await fetch('/api/market-data');
        const data = await response.json();
        
        const ticker = document.getElementById('marketTicker');
        if (ticker) {
            ticker.innerHTML = '';
            
            Object.entries(data.crypto).forEach(([pair, info]) => {
                const tickerItem = document.createElement('div');
                tickerItem.className = 'ticker-item';
                tickerItem.innerHTML = `
                    <span style="font-weight: bold;">${pair.split('/')[0]}</span>
                    <span class="price ${info.change >= 0 ? 'up' : 'down'}">$${info.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <span class="change ${info.change >= 0 ? 'up' : 'down'}">${info.change >= 0 ? '+' : ''}${info.change.toFixed(2)}%</span>
                `;
                ticker.appendChild(tickerItem);
            });
        }
    } catch (error) {
        console.error('Failed to load market data:', error);
    }
}

// Initialize Admin Panel
function initAdminPanel() {
    if (!isAdmin) return;
    
    // Load admin data
    loadAdminDashboard();
    
    // Navigation
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => {
                i.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Show corresponding section
            const section = this.getAttribute('data-section');
            if (section) {
                showAdminSection(section);
            }
        });
    });
    
    // Refresh button
    document.getElementById('refreshData')?.addEventListener('click', function() {
        loadAdminDashboard();
        showMessage('success', 'Data refreshed');
    });
    
    // Add funds button
    document.getElementById('addFundsBtn')?.addEventListener('click', function() {
        showModal('addFundsModal');
    });
    
    // Manage users button
    document.getElementById('manageUsersBtn')?.addEventListener('click', function() {
        showAdminSection('users');
    });
    
    // Add funds form
    document.getElementById('addFundsForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('fundsUserEmail').value;
        const amount = document.getElementById('fundsAmount').value;
        const notes = document.getElementById('fundsNotes').value;
        
        try {
            const response = await fetch('/api/admin/user/add-funds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: getUserIdByEmail(email), amount, note: notes })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('success', data.message);
                hideModal('addFundsModal');
                loadAdminDashboard();
            } else {
                showMessage('error', data.error || 'Failed to add funds');
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.');
        }
    });
    
    // Freeze funds form
    document.getElementById('freezeFundsForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('freezeUserEmail').value;
        const action = document.getElementById('freezeAction').value;
        const reason = document.getElementById('freezeReason').value;
        
        try {
            const response = await fetch('/api/admin/user/freeze-funds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: getUserIdByEmail(email), 
                    freeze: action === 'freeze',
                    reason 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('success', data.message);
                hideModal('freezeFundsModal');
                loadAdminDashboard();
            } else {
                showMessage('error', data.error || 'Failed to update funds status');
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.');
        }
    });
    
    // Search users
    document.getElementById('searchUsers')?.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#usersTableBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
    
    // Update time
    updateAdminTime();
    setInterval(updateAdminTime, 1000);
    
    // Load data periodically
    setInterval(loadAdminDashboard, 60000);
}

// Load admin dashboard data
async function loadAdminDashboard() {
    try {
        // Load dashboard stats
        const statsResponse = await fetch('/api/admin/dashboard');
        const statsData = await statsResponse.json();
        
        // Update stats
        document.getElementById('totalUsers').textContent = statsData.stats.totalUsers;
        document.getElementById('totalDeposits').textContent = statsData.stats.totalDeposits.toFixed(0);
        document.getElementById('platformProfit').textContent = statsData.stats.platformProfit.toFixed(0);
        
        // Update stats grid
        const statsGrid = document.getElementById('adminStats');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${statsData.stats.totalUsers}</h3>
                        <p>Total Users</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3>$${statsData.stats.totalDeposits.toFixed(0)}</h3>
                        <p>Total Deposits</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="stat-info">
                        <h3>$${statsData.stats.platformProfit.toFixed(0)}</h3>
                        <p>Platform Profit</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${statsData.stats.pendingWithdrawals}</h3>
                        <p>Pending Withdrawals</p>
                    </div>
                </div>
            `;
        }
        
        // Update recent activity
        const activityContainer = document.getElementById('recentActivity');
        if (activityContainer) {
            let activityHtml = '';
            
            // Add recent users
            statsData.recentActivity.users.slice(0, 3).forEach(user => {
                activityHtml += `
                    <div class="activity-item">
                        <i class="fas fa-user-plus"></i>
                        <span>New user: ${user.email}</span>
                        <small>${new Date(user.registrationDate).toLocaleDateString()}</small>
                    </div>
                `;
            });
            
            // Add recent deposits
            statsData.recentActivity.deposits.slice(0, 2).forEach(deposit => {
                activityHtml += `
                    <div class="activity-item">
                        <i class="fas fa-arrow-down"></i>
                        <span>Deposit: $${deposit.amount} from ${deposit.user || 'Unknown'}</span>
                    </div>
                `;
            });
            
            activityContainer.innerHTML = activityHtml || '<p>No recent activity</p>';
        }
        
        // Load users
        const usersResponse = await fetch('/api/admin/users');
        const usersData = await usersResponse.json();
        
        // Update users table
        const usersTableBody = document.getElementById('usersTableBody');
        if (usersTableBody) {
            usersTableBody.innerHTML = '';
            
            usersData.users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id.substring(0, 8)}...</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>$${user.balance.toFixed(2)}</td>
                    <td class="${user.totalProfit >= 0 ? 'change up' : 'change down'}">
                        $${user.totalProfit.toFixed(2)}
                    </td>
                    <td>
                        <span class="status-badge ${user.fundsFrozen ? 'status-frozen' : user.status === 'active' ? 'status-active' : 'status-pending'}">
                            ${user.fundsFrozen ? 'Frozen' : user.status}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary view-user" data-email="${user.email}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-warning freeze-user" data-email="${user.email}" data-frozen="${user.fundsFrozen}">
                                <i class="fas ${user.fundsFrozen ? 'fa-unlock' : 'fa-lock'}"></i>
                            </button>
                            <button class="btn btn-sm btn-success add-funds-user" data-email="${user.email}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </td>
                `;
                usersTableBody.appendChild(row);
            });
            
            // Add event listeners to user action buttons
            document.querySelectorAll('.view-user').forEach(btn => {
                btn.addEventListener('click', function() {
                    const email = this.getAttribute('data-email');
                    viewUserDetails(email);
                });
            });
            
            document.querySelectorAll('.freeze-user').forEach(btn => {
                btn.addEventListener('click', function() {
                    const email = this.getAttribute('data-email');
                    const frozen = this.getAttribute('data-frozen') === 'true';
                    showFreezeFundsModal(email, frozen);
                });
            });
            
            document.querySelectorAll('.add-funds-user').forEach(btn => {
                btn.addEventListener('click', function() {
                    const email = this.getAttribute('data-email');
                    showAddFundsModal(email);
                });
            });
        }
        
    } catch (error) {
        console.error('Failed to load admin data:', error);
        showMessage('error', 'Failed to load dashboard data');
    }
}

// View user details
async function viewUserDetails(email) {
    try {
        // First get user ID from users list
        const usersResponse = await fetch('/api/admin/users');
        const usersData = await usersResponse.json();
        const user = usersData.users.find(u => u.email === email);
        
        if (!user) {
            showMessage('error', 'User not found');
            return;
        }
        
        // Get detailed user info
        const detailResponse = await fetch(`/api/admin/user/${user.id}`);
        const detailData = await detailResponse.json();
        
        const modalContent = document.getElementById('userDetailsContent');
        if (modalContent) {
            modalContent.innerHTML = `
                <div class="user-details">
                    <div class="detail-section">
                        <h4>User Information</h4>
                        <p><strong>ID:</strong> ${detailData.user.id}</p>
                        <p><strong>Username:</strong> ${detailData.user.username}</p>
                        <p><strong>Email:</strong> ${detailData.user.email}</p>
                        <p><strong>Status:</strong> ${detailData.user.status}</p>
                        <p><strong>Registered:</strong> ${new Date(detailData.user.registrationDate).toLocaleString()}</p>
                        <p><strong>Last Login:</strong> ${detailData.user.lastLogin ? new Date(detailData.user.lastLogin).toLocaleString() : 'Never'}</p>
                        <p><strong>Referral Code:</strong> ${detailData.user.referralCode || 'N/A'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Financial Information</h4>
                        <p><strong>Current Balance:</strong> $${detailData.financials.currentBalance.toFixed(2)}</p>
                        <p><strong>Total Deposited:</strong> $${detailData.financials.totalDeposited.toFixed(2)}</p>
                        <p><strong>Total Withdrawn:</strong> $${detailData.financials.totalWithdrawn.toFixed(2)}</p>
                        <p><strong>Net Profit:</strong> $${detailData.financials.netProfit.toFixed(2)}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Account Status</h4>
                        <p><strong>Funds Frozen:</strong> ${detailData.user.fundsFrozen ? 'Yes' : 'No'}</p>
                        <p><strong>KYC Verified:</strong> ${detailData.user.kycVerified ? 'Yes' : 'No'}</p>
                        <p><strong>Trading Level:</strong> ${detailData.user.tradingLevel || 'Beginner'}</p>
                    </div>
                    
                    <div class="detail-actions">
                        <button class="btn btn-warning freeze-btn" onclick="showFreezeFundsModal('${email}', ${detailData.user.fundsFrozen})">
                            <i class="fas ${detailData.user.fundsFrozen ? 'fa-unlock' : 'fa-lock'}"></i>
                            ${detailData.user.fundsFrozen ? 'Unfreeze Funds' : 'Freeze Funds'}
                        </button>
                        <button class="btn btn-success add-funds-btn" onclick="showAddFundsModal('${email}')">
                            <i class="fas fa-plus"></i> Add Funds
                        </button>
                    </div>
                </div>
            `;
            
            showModal('userDetailsModal');
        }
    } catch (error) {
        console.error('Failed to load user details:', error);
        showMessage('error', 'Failed to load user details');
    }
}

// Show add funds modal
function showAddFundsModal(email) {
    document.getElementById('fundsUserEmail').value = email;
    showModal('addFundsModal');
}

// Show freeze funds modal
function showFreezeFundsModal(email, currentlyFrozen) {
    document.getElementById('freezeUserEmail').value = email;
    document.getElementById('freezeAction').value = currentlyFrozen ? 'unfreeze' : 'freeze';
    showModal('freezeFundsModal');
}

// Get user ID by email (helper function)
function getUserIdByEmail(email) {
    // This would ideally come from the server
    // For now, we'll extract it from the DOM or make another request
    const userRow = document.querySelector(`[data-email="${email}"]`)?.closest('tr');
    if (userRow) {
        return userRow.querySelector('td:first-child').textContent + '...';
    }
    return null;
}

// Show admin section
function showAdminSection(section) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
        document.getElementById('adminPageTitle').textContent = section.charAt(0).toUpperCase() + section.slice(1);
    }
    
    // Load section data if needed
    if (section === 'users') {
        loadAdminDashboard(); // Reload to get latest users
    }
}

// Update admin time
function updateAdminTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }
}

// Initialize Landing Page
function initLandingPage() {
    // Nothing special needed for landing page
    console.log('Landing page initialized');
}

// Utility Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function showMessage(type, text) {
    // Remove any existing message
    const existingMsg = document.querySelector('.message');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    // Find where to insert the message
    const form = document.querySelector('form');
    if (form) {
        form.parentNode.insertBefore(messageDiv, form.nextSibling);
    } else {
        document.body.appendChild(messageDiv);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Logout function (can be called from anywhere)
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Make logout function available globally
window.logout = logout;
