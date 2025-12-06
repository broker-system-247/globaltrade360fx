const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'stevenlogan362@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-password'
    }
});

// In-memory storage (for demo)
let users = [];
let cryptoAddresses = {
    BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    ETH: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    USDT: 'TYASr8UVgUoSdxMJ5rS8H3dLF9BkTrBw1y',
    USDC: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
};
let aiComplaints = [];
let transactions = [];

// Session storage
const sessions = {};

// Generate session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Check authentication middleware
function checkAuth(req, res, next) {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId || !sessions[sessionId]) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = sessions[sessionId];
    next();
}

// Check admin middleware
function checkAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Auth endpoints
app.post('/api/register', (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;
    
    if (users.find(u => u.email === email || u.username === username)) {
        return res.status(400).json({ error: 'Email or username already registered' });
    }
    
    const newUser = {
        id: Date.now(),
        username,
        email,
        password,
        firstName,
        lastName,
        balance: 1000, // Bonus for new users
        investments: [],
        transactions: [],
        joinDate: new Date().toISOString(),
        isActive: true,
        isAdmin: false
    };
    
    users.push(newUser);
    
    // Create session
    const sessionId = generateSessionId();
    sessions[sessionId] = { ...newUser, password: undefined };
    
    res.json({ 
        success: true, 
        user: { ...newUser, password: undefined },
        sessionId 
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Admin login
    if ((username === 'admin' || username === 'globaltrade360' || username === 'stevenlogan362@gmail.com') && 
        password === 'myhandwork2025') {
        
        const adminUser = {
            id: 1,
            username: 'admin',
            email: 'stevenlogan362@gmail.com',
            firstName: 'Admin',
            lastName: 'System',
            balance: 0,
            investments: [],
            transactions: [],
            joinDate: new Date().toISOString(),
            isActive: true,
            isAdmin: true
        };
        
        const sessionId = generateSessionId();
        sessions[sessionId] = adminUser;
        
        return res.json({
            success: true,
            user: adminUser,
            sessionId,
            redirect: '/admin'
        });
    }
    
    // Regular user login
    const user = users.find(u => 
        (u.email === username || u.username === username) && 
        u.password === password
    );
    
    if (user) {
        const sessionId = generateSessionId();
        sessions[sessionId] = { ...user, password: undefined };
        
        res.json({ 
            success: true, 
            user: { ...user, password: undefined },
            sessionId,
            redirect: '/dashboard'
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
        delete sessions[sessionId];
    }
    res.json({ success: true });
});

// User endpoints
app.get('/api/user', checkAuth, (req, res) => {
    res.json({ success: true, user: req.user });
});

app.post('/api/user/update', checkAuth, (req, res) => {
    const { firstName, lastName, email } = req.body;
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex !== -1) {
        users[userIndex].firstName = firstName || users[userIndex].firstName;
        users[userIndex].lastName = lastName || users[userIndex].lastName;
        users[userIndex].email = email || users[userIndex].email;
        
        // Update session
        sessions[req.headers['x-session-id']] = users[userIndex];
        
        res.json({ success: true, user: users[userIndex] });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Investment endpoints
app.post('/api/invest', checkAuth, (req, res) => {
    const { plan, amount } = req.body;
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const plans = {
        basic: { min: 500, max: 5000, dailyReturn: 0.032, duration: 30 },
        pro: { min: 5000, max: 50000, dailyReturn: 0.048, duration: 60 },
        vip: { min: 50000, max: 9999999, dailyReturn: 0.075, duration: 90 }
    };
    
    const selectedPlan = plans[plan];
    
    if (!selectedPlan) {
        return res.status(400).json({ error: 'Invalid plan' });
    }
    
    if (amount < selectedPlan.min || amount > selectedPlan.max) {
        return res.status(400).json({ 
            error: `Amount must be between $${selectedPlan.min} and $${selectedPlan.max}` 
        });
    }
    
    if (users[userIndex].balance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Create investment
    const investment = {
        id: Date.now(),
        userId: req.user.id,
        plan,
        amount,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + selectedPlan.duration * 24 * 60 * 60 * 1000).toISOString(),
        dailyReturn: selectedPlan.dailyReturn,
        totalProfit: 0,
        status: 'active'
    };
    
    // Deduct amount from balance
    users[userIndex].balance -= amount;
    users[userIndex].investments.push(investment);
    
    // Add transaction
    const transaction = {
        id: Date.now(),
        userId: req.user.id,
        type: 'investment',
        amount: -amount,
        description: `Investment in ${plan} plan`,
        date: new Date().toISOString(),
        status: 'completed'
    };
    
    users[userIndex].transactions.push(transaction);
    transactions.push(transaction);
    
    res.json({ 
        success: true, 
        investment,
        balance: users[userIndex].balance 
    });
});

// Crypto addresses
app.get('/api/crypto-addresses', (req, res) => {
    res.json(cryptoAddresses);
});

app.post('/api/crypto-addresses', checkAuth, checkAdmin, (req, res) => {
    const { addresses } = req.body;
    cryptoAddresses = { ...cryptoAddresses, ...addresses };
    res.json({ success: true, addresses: cryptoAddresses });
});

// Deposit endpoint
app.post('/api/deposit', checkAuth, (req, res) => {
    const { amount, currency } = req.body;
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // In real app, you'd generate a unique deposit address
    const depositAddress = cryptoAddresses[currency] || 'Address not available';
    
    // Create pending transaction
    const transaction = {
        id: Date.now(),
        userId: req.user.id,
        type: 'deposit',
        amount: parseFloat(amount),
        currency,
        address: depositAddress,
        description: `Deposit of ${amount} ${currency}`,
        date: new Date().toISOString(),
        status: 'pending'
    };
    
    users[userIndex].transactions.push(transaction);
    transactions.push(transaction);
    
    // Simulate deposit confirmation after 10 seconds
    setTimeout(() => {
        const userIdx = users.findIndex(u => u.id === req.user.id);
        if (userIdx !== -1) {
            users[userIdx].balance += parseFloat(amount);
            
            // Update transaction status
            const transIdx = users[userIdx].transactions.findIndex(t => t.id === transaction.id);
            if (transIdx !== -1) {
                users[userIdx].transactions[transIdx].status = 'completed';
            }
            
            console.log(`Deposit completed for user ${req.user.id}: $${amount}`);
        }
    }, 10000);
    
    res.json({ 
        success: true, 
        address: depositAddress,
        transaction 
    });
});

// Withdrawal endpoint
app.post('/api/withdraw', checkAuth, (req, res) => {
    const { amount, walletAddress } = req.body;
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    if (users[userIndex].balance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    if (amount < 50) {
        return res.status(400).json({ error: 'Minimum withdrawal is $50' });
    }
    
    // Create withdrawal transaction
    const transaction = {
        id: Date.now(),
        userId: req.user.id,
        type: 'withdrawal',
        amount: -parseFloat(amount),
        walletAddress,
        description: `Withdrawal to ${walletAddress.substring(0, 10)}...`,
        date: new Date().toISOString(),
        status: 'processing'
    };
    
    users[userIndex].balance -= parseFloat(amount);
    users[userIndex].transactions.push(transaction);
    transactions.push(transaction);
    
    // Simulate processing
    setTimeout(() => {
        const userIdx = users.findIndex(u => u.id === req.user.id);
        if (userIdx !== -1) {
            const transIdx = users[userIdx].transactions.findIndex(t => t.id === transaction.id);
            if (transIdx !== -1) {
                users[userIdx].transactions[transIdx].status = 'completed';
                
                // Add successful withdrawal notification
                const notif = {
                    id: Date.now(),
                    type: 'withdrawal_success',
                    userId: req.user.id,
                    message: `Successfully withdrew $${amount} to ${walletAddress.substring(0, 10)}...`,
                    date: new Date().toISOString(),
                    read: false
                };
                // Add to notifications array if you have one
            }
        }
    }, 5000);
    
    res.json({ 
        success: true, 
        transaction,
        balance: users[userIndex].balance 
    });
});

// AI chat endpoint
app.post('/api/ai-chat', checkAuth, (req, res) => {
    const { message } = req.body;
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    let response = '';
    
    if (message.toLowerCase().includes('support') || 
        message.toLowerCase().includes('help') || 
        message.toLowerCase().includes('problem')) {
        
        // Add to complaints
        aiComplaints.push({
            id: Date.now(),
            userId: req.user.id,
            userEmail: user.email,
            message,
            date: new Date().toISOString(),
            status: 'new'
        });
        
        response = "I've forwarded your concern to our support team. They will contact you at your registered email within 24 hours. For immediate assistance, please email: stevenlogan362@gmail.com";
        
    } else if (message.toLowerCase().includes('deposit') || 
               message.toLowerCase().includes('address')) {
        
        response = `For deposits, please use these addresses:\n` +
                  `Bitcoin (BTC): ${cryptoAddresses.BTC}\n` +
                  `Ethereum (ETH): ${cryptoAddresses.ETH}\n` +
                  `USDT (TRC20): ${cryptoAddresses.USDT}\n` +
                  `Please send exact amount and wait for confirmation.`;
                  
    } else if (message.toLowerCase().includes('withdraw') || 
               message.toLowerCase().includes('withdrawal')) {
        
        response = "Withdrawals are processed within 5-10 minutes. Minimum withdrawal is $50. Please ensure your wallet address is correct.";
        
    } else if (message.toLowerCase().includes('profit') || 
               message.toLowerCase().includes('earning')) {
        
        const totalProfit = user.investments.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);
        response = `Your total profit so far is $${totalProfit.toFixed(2)}. Active investments continue to generate daily returns.`;
        
    } else if (message.toLowerCase().includes('trade') || 
               message.toLowerCase().includes('buy') || 
               message.toLowerCase().includes('sell')) {
        
        const advice = [
            "Based on current market analysis, I recommend a BUY position on BTC with target at $65,000. Stop loss at $62,500.",
            "Market sentiment is bullish. Consider opening long positions on major cryptocurrencies with 2% risk per trade.",
            "EUR/USD shows bearish momentum. Short position recommended with target at 1.0750.",
            "Our AI signals indicate STRONG BUY for ETH with projected 8% gain in next 24 hours.",
            "Market volatility is high. Recommend reducing position sizes and using tighter stop losses."
        ];
        response = advice[Math.floor(Math.random() * advice.length)];
        
    } else {
        const responses = [
            "I'm here to help with trading advice, market analysis, or platform assistance. What specific help do you need?",
            "For optimal results, consider diversifying your portfolio across multiple investment plans.",
            "Our AI trading system has an 89% success rate. Would you like me to explain how it works?",
            "Remember to always invest responsibly and never risk more than you can afford to lose.",
            "The platform offers automated trading to generate consistent profits. Would you like to know more?"
        ];
        response = responses[Math.floor(Math.random() * responses.length)];
    }
    
    res.json({ success: true, response });
});

// Admin endpoints
app.get('/api/admin/users', checkAuth, checkAdmin, (req, res) => {
    const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        investments: user.investments.length,
        joinDate: user.joinDate,
        isActive: user.isActive
    }));
    
    res.json({ success: true, users: safeUsers });
});

app.get('/api/admin/complaints', checkAuth, checkAdmin, (req, res) => {
    res.json({ success: true, complaints: aiComplaints });
});

app.post('/api/admin/update-user', checkAuth, checkAdmin, (req, res) => {
    const { userId, balance, isActive } = req.body;
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    if (balance !== undefined) users[userIndex].balance = parseFloat(balance);
    if (isActive !== undefined) users[userIndex].isActive = isActive;
    
    res.json({ success: true, user: users[userIndex] });
});

app.post('/api/admin/send-email', checkAuth, checkAdmin, async (req, res) => {
    const { to, subject, message } = req.body;
    
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text: message,
            html: `<div>${message}</div>`
        };
        
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// Market data endpoint
app.get('/api/market-data', (req, res) => {
    const marketData = {
        btc: (63842.15 + (Math.random() - 0.5) * 100).toFixed(2),
        eth: (3215.67 + (Math.random() - 0.5) * 20).toFixed(2),
        eur: (1.0824 + (Math.random() - 0.5) * 0.01).toFixed(4),
        btcChange: (Math.random() > 0.5 ? '+' : '-') + (Math.random() * 3).toFixed(2) + '%',
        ethChange: (Math.random() > 0.5 ? '+' : '-') + (Math.random() * 2.5).toFixed(2) + '%',
        timestamp: new Date().toISOString()
    };
    
    res.json(marketData);
});

// Live notifications
app.get('/api/live-notifications', (req, res) => {
    const notifications = [
        "Michael K. just made $5,240 profit from Bitcoin trading!",
        "Sarah J. successfully withdrew $12,500 to her bank account!",
        "David L. earned $3,200 profit from Pro Plan investment!",
        "New user registered with $5,000 initial deposit!",
        "VIP member achieved 7.8% daily return on investment!",
        "Instant withdrawal processed for $8,750!",
        "AI trading system generated 92% accurate signals today!",
        "Platform reaches $4.2B total trading volume!"
    ];
    
    const randomNotif = notifications[Math.floor(Math.random() * notifications.length)];
    
    res.json({
        success: true,
        notification: randomNotif,
        timestamp: new Date().toISOString()
    });
});

// Calculate profits for all users (cron job simulation)
setInterval(() => {
    users.forEach(user => {
        if (user.investments && user.investments.length > 0) {
            user.investments.forEach(investment => {
                if (investment.status === 'active') {
                    // Calculate profit for this interval
                    const secondsInDay = 86400;
                    const profitPerSecond = investment.amount * investment.dailyReturn / secondsInDay;
                    const profit = profitPerSecond * 300; // 5 minutes worth
                    
                    investment.totalProfit = (investment.totalProfit || 0) + profit;
                    user.balance += profit;
                    
                    // Add profit transaction
                    user.transactions.push({
                        id: Date.now(),
                        type: 'profit',
                        amount: profit,
                        description: `Daily profit from ${investment.plan} investment`,
                        date: new Date().toISOString()
                    });
                }
            });
        }
    });
    
    console.log('Profits calculated for all users at', new Date().toLocaleTimeString());
}, 300000); // Every 5 minutes

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Landing page: http://localhost:${PORT}`);
    console.log(`✅ User dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`✅ Admin panel: http://localhost:${PORT}/admin`);
    console.log(`✅ Admin login: username: admin, password: myhandwork2025`);
});
