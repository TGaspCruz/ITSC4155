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
// app.use((req, res, next) => {
//     // If a client requests /dashboard.html directly and there's no session user, redirect to login
//     if (req.path === '/dashboard.html' && (!req.session || !req.session.user)) {
//         return res.redirect('/');
//     }
//     next();
// });

// Serve static files after session middleware so the middleware above can protect specific files
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register/register.html');
});

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
        // Use findOne to avoid getting an array and reassigning const
        const user = await User.findOne({ email: email, password: password });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        req.session.user = {username: user.username, email: user.email};
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

    const newUser = new User({ username, email, password });
    
    newUser.save()
        .then(() => {
            res.status(200).json({ success: true, message: 'Registration successful', redirect: '/' });
        })
        .catch(err => {
            console.error('Error in /register:', err);
            // Duplicate key (unique email) error from Mongo
            if (err && err.code === 11000) {
                return res.status(409).json({ success: false, message: 'Email already in use' });
            }
            // Validation errors from mongoose
            if (err && err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(e => e.message).join('; ');
                return res.status(400).json({ success: false, message: messages });
            }
            return res.status(500).json({ success: false, message: 'Error registering new user. Please try again later.' });
        });
});



module.exports = app;