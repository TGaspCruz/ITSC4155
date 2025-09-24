const express = require('express');
const session = require('express-session');
const app = express();
const mongoose = require("mongoose");
require('dotenv').config();
const User = require("./models/user.model");

mongoose.connect("mongodb://127.0.0.1/InvestmentProjectDB")
    .then(() => {
        console.log("Database is connected successfully");
    })
    .catch((error) => console.log(error));


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true
}));

// Block direct static access to dashboard.html when not logged in
app.use((req, res, next) => {
    // If a client requests /dashboard.html directly and there's no session user, redirect to login
    if (req.path === '/dashboard.html' && (!req.session || !req.session.user)) {
        return res.redirect('/');
    }
    next();
});

// Serve static files after session middleware so the middleware above can protect specific files
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


// app.get('/register', (req, res) => {
//     res.sendFile(__dirname + '/public/register/register.html');
// });

app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    } else {
        return res.sendFile(__dirname + '/public/dashboard.html');
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
    
        // checks for both email and password to match and if one or the other is wrong, it will send a message for which one is wrong
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Email not associated with account' });
        }
        else if (user.password !== password) {
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }
        req.session.user = {username: user.username, email: user.email};
        // const user = await User.findOne({ email: email, password: password });
        // if (!user) {
        //     return res.status(401).json({ success: false, message: 'Email not associated with account or incorrect password' });
        // }
        // req.session.user = {username: user.username, email: user.email};
        return res.status(200).json({ success: true, message: 'Login successful', redirect: '/dashboard' });
    } catch (error) {
        console.error('Error in /login:', error);
        res.status(500).json({ success: false, message: 'Error logging in. Please try again later.' });
    }
});

app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    console.log('Register payload:', req.body);

    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'username, email and password are required' });
    }

    // email pattern check
    const emailRegex = /.+@.+\..+/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    // password length check
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    const newUser = new User({ username, email, password, portfolio: { availableFunds: 1000, stocks: [] } });

    newUser.save()
        .then((savedUser) => {
            // set session to the saved user info
            req.session.user = { username: savedUser.username, email: savedUser.email };
            res.status(200).json({ success: true, message: 'Registration successful', redirect: '/dashboard' });
        })
        .catch(err => {
            console.error('Error in /register:', err);
            // Duplicate key (unique email) error from Mongo
            if (err && err.code === 11000) {
                return res.status(409).json({ success: false, message: 'Email already registered. Please log in instead' });
            }
            // Validation errors from mongoose
            if (err && err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(e => e.message).join('; ');
                return res.status(400).json({ success: false, message: messages });
            }
            return res.status(500).json({ success: false, message: 'Error registering new user. Please try again later.' });
        });
});

app.get('/api/stockList', async (req, res) => {
    try {
        const stockListResponse = await fetch(`https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${process.env.API_KEY}`);
        if (!stockListResponse.ok) {
            throw new Error(`AlphaVantage HTTP ${stockListResponse.status}`);
        }
        const stockListJson = await stockListResponse.json();
        console.log('Fetched stock list:', stockListJson);
        res.json({ success: true, stockList: stockListJson });
    } catch (err) {
        console.error('Error in /api/stockList:', err);
        return res.status(500).json({ success: false, message: 'Error fetching stock data', detail: String(err) });
    }
});


// Return the logged-in user's info and portfolio
app.get('/api/user', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.email) {
            return res.status(401).json({ success: false, message: 'Not logged in' });
        }

        const user = await User.findOne({ username: req.session.user.username, email: req.session.user.email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.json({ success: true, username: user.username, email: user.email, portfolio: user.portfolio });
    } catch (err) {
        console.error('Error in /api/user:', err);
        return res.status(500).json({ success: false, message: 'Error fetching user data', detail: String(err) });
    }
});
// Logout route - destroys the session
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.clearCookie && res.clearCookie('connect.sid');
        return res.json({ success: true, message: 'Logged out' });
    });
});


module.exports = app;