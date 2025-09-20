const express = require('express');
const session = require('express-session');
const app = express();
const mongoose = require("mongoose");
require('dotenv').config();
const User = require("./models/user.model");

mongoose.connect("mongodb://127.0.0.1/InvestmentProjectDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    })
    .then(() => {
        console.log("Database is connected successfully");
    })
    .catch((error) => console.log(error));


app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register/register.html');
});

app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
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

        req.session.userId = user._id;
        return res.status(200).json({ success: true, message: 'Login successful', redirect: '/dashboard' });
    } catch (error) {
        console.error('Error in /login:', error);
        res.status(500).json({ success: false, message: 'Error logging in. Please try again later.' });
    }
});

app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    console.log(req.body);
    const newUser = new User({
        username: username,
        email: email,
        password: password
    });
    newUser.save()
        .then(() => {
            res.status(200).redirect('/');
            //res.status(200).send('User registered successfully.');
        })
        .catch(err => {
            res.status(500).send('Error registering new user. Maybe email already exists.');
        });
});



module.exports = app;