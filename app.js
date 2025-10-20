const express = require("express");
const session = require("express-session");
const app = express();
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/user.model");

mongoose.connect("mongodb://127.0.0.1/InvestmentProjectDB")
    .then(() => {
        console.log("Database is connected successfully");
    })
    .catch((error) => console.log(error));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({ secret: process.env.SECRET_KEY, resave: false, saveUninitialized: true}));
// Serve static files after session middleware so the middleware above can protect specific files
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.get("/dashboard", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/");
    } else {
        return res.sendFile(__dirname + "/public/dashboard.html");
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
        return res.status(200).json({ success: true, message: 'Login successful', redirect: '/dashboard' });
    } catch (error) {
        console.error('Error in /login:', error);
        res.status(500).json({ success: false, message: 'Error logging in. Please try again later.' });
    }
});

app.post("/register", (req, res) => {
    const { username, email, password } = req.body;
    console.log("Register payload:", req.body);
    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "username, email and password are required",
        });
    }
    // email pattern check
    const emailRegex = /.+@.+\..+/;
    if (!emailRegex.test(email)) {
        return res
        .status(400)
        .json({
            success: false,
            message: "Please enter a valid email address" 
        });
    }
    // password length check
    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters",
        });
    }
    // new user from given data in form
    const newUser = new User({
        username,
        email,
        password,
        portfolio: { availableFunds: 1000, stocks: [] },
    });

    newUser.save()
        .then((savedUser) => {
        // set session to the saved user info
            req.session.user = {
                username: savedUser.username,
                email: savedUser.email,
            };
            res.status(200).json({
                success: true,
                message: "Registration successful",
                redirect: "/dashboard",
            });
        })
        .catch((err) => {
        console.error("Error in /register:", err);
        // Duplicate key (unique email) error from Mongo
        if (err && err.code === 11000) {
            return res.status(409).json({ 
                success: false, 
                message: "Email already in use" 
            });
        }
        // Validation errors from mongoose
        if (err && err.name === "ValidationError") {
            const messages = Object.values(err.errors).map((e) => e.message).join("; ");
            return res.status(400).json({ 
                success: false, 
                message: messages 
            });
        }
        return res.status(500).json({
            success: false,
            message: "Error registering new user. Please try again later.",
            });
        });
});

app.get("/api/stockList", async (req, res) => {
  try {
    // Demokey
    const stockListResponse = await fetch("https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo");
    // const stockListReRponse = await fetch(`https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${process.env.API_KEY}`);
    if (!stockListResponse.ok) {
      throw new Error(`AlphaVantage HTTP ${stockListResponse.status}`);
    }
    const stockListJson = await stockListResponse.json();
    console.log("Fetched stock list:", stockListJson);
    res.json({ success: true, stockList: stockListJson });
  } catch (err) {
    console.error("Error in /api/stockList:", err);
    return res.status(500).json({
        success: false,
        message: "Error fetching stock data",
        detail: String(err),
        });
    }
});

// Logout route - destroys the session
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ success: false, message: "Logout failed", redirect: '/'});
        }
        res.clearCookie && res.clearCookie("connect.sid");
        return res.json({ success: true, message: "Logged out", redirect: '/'});
    });
});

//buy stock request. when the user clicks the confirm button to buy stock, this is called.
app.post("/api/buyStock", async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });

    const { ticker, price, quantity } = req.body;
    const user = await User.findOne({ email: req.session.user.email });
    const totalCost = price * quantity;

    if (user.portfolio.availableFunds < totalCost) {
        return res.status(400).json({ success: false, message: 'Insufficient funds' });
    }

    user.portfolio.availableFunds -= totalCost;

    // Aggregate stocks by ticker
    let stock = user.portfolio.stocks.find(s => s.ticker === ticker);
    if (stock) {
        // Calculate new avgPrice
        const prevTotal = stock.avgPrice * stock.quantity;
        const newTotal = price * quantity;
        const newQty = stock.quantity + Number(quantity);
        stock.avgPrice = (prevTotal + newTotal) / newQty;
        stock.quantity = newQty;
    } else {
        user.portfolio.stocks.push({ ticker, quantity: Number(quantity), avgPrice: Number(price) });
    }
    await user.save();
    res.json({ success: true, message: "Successful buy", availableFunds: user.portfolio.availableFunds });
});

app.post("/api/sellStock", async (req, res) => {
        if (!req.session.user) return res.status(401).json({ success: false });

        const { ticker, price, quantity } = req.body;
        const user = await User.findOne({ email: req.session.user.email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (!user.portfolio.stocks) return res.status(400).json({ success: false, message: "No stocks to sell" });

        let stock = user.portfolio.stocks.find(s => s.ticker === ticker);
        if (!stock || stock.quantity < quantity) {
            return res.status(400).json({ success: false, message: "Not enough stock to sell" });
        }

        // Calculate total sale value
        const totalValue = price * quantity;
        user.portfolio.availableFunds += totalValue;

        // Adjust quantity
        stock.quantity -= Number(quantity);
        if (stock.quantity <= 0) {
                // Remove stock from portfolio
                user.portfolio.stocks = user.portfolio.stocks.filter(s => s.ticker !== ticker);
        }
        await user.save();
        res.json({ success: true, message: "Successful sell"});
});

//get the users funds
app.get("/api/getFunds", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }
  try {
    const user = await User.findOne({ email: req.session.user.email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({success: true, availableFunds: user.portfolio.availableFunds})
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server failure"});
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
        return res.json({ success: true, username: user.username, portfolio: user.portfolio });
    } catch (err) {
        console.error('Error in /api/user:', err);
        return res.status(500).json({ success: false, message: 'Error fetching user data', detail: String(err) });
    }
});

app.get("/api/getStocks", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Not logged in" });
    }
});

app.get('/api/search/:ticker', async (req, res) => {
    try {
        const ticker = req.params.ticker;
        if (!ticker || typeof ticker !== 'string' || ticker.length < 1) {
            return res.status(400).json({ success: false, message: 'Invalid ticker parameter' });
        }
        // Demo Key
        const searchResponse = await fetch(`https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=tesco&apikey=demo`);
        //const searchResponse = await fetch(`https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${ticker}&apikey=${process.env.API_KEY}`);
        if (!searchResponse.ok) {
            throw new Error(`AlphaVantage HTTP ${searchResponse.status}`);
        }
        const stockListMatches = await searchResponse.json();
        console.log('Fetched search results:', stockListMatches);
        return res.json({ success: true, bestMatches: stockListMatches.bestMatches || [] });
    } catch (err) {
        console.error('Error in /api/search:', err);
        return res.status(500).json({ success: false, message: 'Error performing search', detail: String(err) });
    }
});

app.get('/api/quote/:ticker', async (req, res) => {
    try {
        const ticker = req.params.ticker;
        if (!ticker || typeof ticker !== 'string' || ticker.length < 1) {
            return res.status(400).json({ success: false, message: 'Invalid ticker parameter' });
        }
        // Demo Key
        const quoteResponse = await fetch("https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=demo");
        //const quoteResponse = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${process.env.API_KEY}`);
        if (!quoteResponse.ok) {
            throw new Error(`AlphaVantage HTTP ${quoteResponse.status}`);
        }
        const quoteJson = await quoteResponse.json();
        if (!quoteJson || Object.keys(quoteJson['Global Quote']).length === 0) {
            return res.json({ success: false, message: "Ticker Symbol Not Found "});
        }
        console.log('Fetched global quote:', quoteJson);
        return res.json({ success: true, quote: quoteJson['Global Quote']});
    } catch (err) {
        console.error('Error in /api/quote:', err);
        return res.status(500).json({ success: false, message: 'Error fetching quote', detail: String(err) });
    }
});

app.post("/api/updatePrice", async (req, res) => {
    const stockId = req.body.ticker;
    const newPrice = req.body.price;

    parseFloat(newPrice);
    const user = await User.findOne({ email: req.session.user.email });

    const stockToUpdate = user.portfolio.stocks.find(
        (stock) => stock.ticker.toString() === stockId
    );
    if (stockToUpdate) {
        stockToUpdate.avgPrice = newPrice;
        await user.save();

        res.json({ success: true });
    } else console.error("Error updating stocks");
});

module.exports = app;