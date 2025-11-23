const express = require("express");
const session = require("express-session");
const app = express();
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/user.model");
const Stock = require('./models/stock.model');
const StockListCache = require('./models/stockListCache.model');

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

        const oneDayMs = 24 * 60 * 60 * 1000;
        
        if (user && (Date.now() - new Date(user.lastLoginBonus).getTime()) > oneDayMs) {
            user.lastLoginBonus = Date.now();
            user.portfolio.availableFunds += 500;
            console.log(user.portfolio.availableFunds);
            console.log("Added funds");
        }
        user.currentLoginTime = Date.now();
        await user.save();
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

// Logout route - destroys the session
app.post("/logout", async (req, res) => {
    try {
        const { email } = req.session.user;
        const user = await User.findOne({ email});

        if (!user) {
            return res.status(400).json({ success: false , message: "No active session found" });
        }

        const logoutTime = Date.now();
        const minutes = Math.floor((logoutTime - user.currentLoginTime) / 60000);
        const addedFunds = minutes * 5;
        console.log(user.portfolio.availableFunds);
        user.portfolio.availableFunds += addedFunds;
        console.log(user.portfolio.availableFunds);
        await user.save();
        console.log("Funds saved");
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).json({ success: false, message: "Logout failed", redirect: '/'});
            }
            res.clearCookie && res.clearCookie("connect.sid");
            return res.json({ success: true, message: "Logged out", redirect: '/'});
        });
    } catch (error) {
        console.error('Error in /logout:', error);
        res.status(500).json({ success: false, message: 'Error logging out.', redirect: '/' });
    }
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
    
    user.transactions.push({
        type: 'buy',
        ticker,
        quantity: Number(quantity),
        price: Number(price),
        total: Number(totalCost),
        timestamp: new Date()
    });

    await user.save();
    res.json({ success: true, message: "Successful buy", availableFunds: user.portfolio.availableFunds });
});

app.post("/api/sellStock", async (req, res) => {
        if (!req.session.user) return res.status(401).json({ success: false });

        const { ticker, price, quantity, avgPrice } = req.body;
        const user = await User.findOne({ email: req.session.user.email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        let stock = user.portfolio.stocks.find(s => s.ticker === ticker);
        if (!stock || stock.quantity < quantity) {
            return res.status(400).json({ success: false, message: "Not enough stock to sell" });
        }

        // Calculate total sale value
        const totalValue = price * quantity;
        user.portfolio.availableFunds += totalValue;

        const realizedGainLoss = (price - avgPrice) * quantity;
        user.portfolio.realizedGainLoss += realizedGainLoss;

        // Record transaction
        
        user.transactions.push({
            type: 'sell',
            ticker,
            quantity: Number(quantity),
            price: Number(price),
            total: Number(totalValue),
            timestamp: new Date()
        });
        // Adjust quantity
        stock.quantity -= Number(quantity);
        if (stock.quantity <= 0) {
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

    const user = await User.findOne({ email: req.session.user.email });
    return res.json({
      success: true,
      availableFunds: user.portfolio.availableFunds,
      stocks: user.portfolio.stocks,
    });
});

app.get('/api/search/:ticker', async (req, res) => {
    try {
        const ticker = req.params.ticker;
        if (!ticker || typeof ticker !== 'string' || ticker.length < 1) {
            return res.status(400).json({ success: false, message: 'Invalid ticker parameter' });//
        }
        // Demo Key
        //const searchResponse = await fetch(`https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=tesco&apikey=demo`);
        const searchResponse = await fetch(`https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${ticker}&apikey=${process.env.API_KEY}`);
        if (!searchResponse.ok) {
            throw new Error(`AlphaVantage HTTP ${searchResponse.status}`);
        }
        const stockListMatches = await searchResponse.json();
        console.log('Fetched search results:', stockListMatches);
        return res.json({ success: true, bestMatches: stockListMatches.bestMatches});
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
        const symbol = ticker.toUpperCase();

        // Check DB cache first (24 hours freshness)
        const oneDayMs = 24 * 60 * 60 * 1000;
        const existing = await Stock.findOne({ symbol });
        if (existing && (Date.now() - new Date(existing.lastRefresh).getTime()) < oneDayMs) {
        // Data from our DB
            const quote = {
                '01. symbol': existing.symbol,
                '02. open': existing.open.toString(),
                '03. high': existing.high.toString(),
                '04. low': existing.low.toString(),
                '05. price': existing.price.toString(),
                '09. change': existing.change_amount.toString(),
                '10. change percent': existing.change_percent
            };
            return res.json({ success: true, quote });
        }

        // Data is old, call API for fresh data
        //const apiKey = process.env.API_KEY || 'demo';
        //const quoteResponse = await fetch("https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=demo");
        const quoteResponse = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${process.env.API_KEY}`);
        if (!quoteResponse.ok) {
        // API fails, send whatever we have in DB
            if (existing) {
                const quote = {
                '01. symbol': existing.symbol,
                '02. open': existing.open.toString(),
                '03. high': existing.high.toString(),
                '04. low': existing.low.toString(),
                '05. price': existing.price.toString(),
                '09. change': existing.change_amount.toString(),
                '10. change percent': existing.change_percent
                };
                return res.json({ success: true, quote, note: 'Returned cached stale data due to upstream error' });
            }
                throw new Error(`AlphaVantage HTTP ${quoteResponse.status}`);
        }
        const quoteJson = await quoteResponse.json();
        const quote = quoteJson?.['Global Quote'];
        console.log(quote);
        // API calls are used up if quote is empty
        if (!quote) {
            // Return whatever old data is in database if we have it
            console.log(existing);
            if (existing) {
                const quote = {
                '01. symbol': existing.symbol,
                '02. open': existing.open.toString(),
                '03. high': existing.high.toString(),
                '04. low': existing.low.toString(),
                '05. price': existing.price.toString(),
                '09. change': existing.change_amount.toString(),
                '10. change percent': existing.change_percent
                };
                return res.json({ success: true, quote, note: 'Returned cached stale data due to upstream error' });
            }
            return res,json({ success: false, message: "No more API call done" });_
        }

        if (!quoteJson || Object.keys(quote).length === 0) {
            return res.json({ success: false, message: "Ticker Symbol Not Found " });
        }

        // Setup data needed to insert in mongoDB
        const mongoQuoteObject = {
            symbol: (quote['01. symbol']),
            open: parseFloat(quote['02. open']),
            high: parseFloat(quote['03. high']),
            low: parseFloat(quote['04. low']),
            price: parseFloat(quote['05. price']),
            change_amount: parseFloat(quote['09. change']),
            change_percent: (quote['10. change percent'])
        };

        // DB update with new data fetched from API
        await Stock.findOneAndUpdate({ symbol: mongoQuoteObject.symbol }, { 
            symbol: mongoQuoteObject.symbol,
            open: mongoQuoteObject.open,
            high: mongoQuoteObject.high,
            low: mongoQuoteObject.low,
            price: mongoQuoteObject.price,
            change_amount: mongoQuoteObject.change_amount,
            change_percent: mongoQuoteObject.change_percent,
            lastRefresh: new Date()
        }, { upsert: true, new: true });

        return res.json({ success: true, quote });
    } catch (err) {
        console.error('Error in /api/quote:', err);
        return res.status(500).json({ success: false, message: 'Error fetching quote', detail: String(err) });
    }
});

app.get("/api/stockList", async (req, res) => {
    try {
        const oneDayMs = 24 * 60 * 60 * 1000;
        // Check cache in DB
        let cache = await StockListCache.findOne();
        if (cache && (Date.now() - new Date(cache.lastRefresh).getTime()) < oneDayMs) {
            return res.json({ success: true, stockList: cache.data, lastUpdated: cache.lastRefresh });
        }

        // Fetch fresh data from upstream
        //const apiKey = process.env.API_KEY || 'demo';
        //const stockListResponse = await fetch("https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo");
        const stockListResponse = await fetch(`https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${process.env.API_KEY}`);
        if (!stockListResponse.ok) {
            // Return whatever is in DB if new data fetch fails
            if (cache) {
                return res.json({ success: true, stockList: cache.data, lastUpdated: cache.lastRefresh, note: 'Returned cached data due to upstream error' });
            }
            throw new Error(`AlphaVantage HTTP ${stockListResponse.status}`);
        }
        const stockListJson = await stockListResponse.json();

        // Update cache by making new document
        if (!cache) {
            cache = new StockListCache({ data: stockListJson, lastRefresh: new Date() });
        } else {
            cache.data = stockListJson;
            cache.lastRefresh = new Date();
        }
        await cache.save();

        // Try to upsert individual Stock docs for faster per-symbol queries later
        try {
            const lists = [];
            if (stockListJson.top_gainers && Array.isArray(stockListJson.top_gainers)) lists.push(...stockListJson.top_gainers);
            if (stockListJson.top_losers && Array.isArray(stockListJson.top_losers)) lists.push(...stockListJson.top_losers);
            if (stockListJson.most_actively_traded && Array.isArray(stockListJson.most_actively_traded)) lists.push(...stockListJson.most_actively_traded);
            for (const s of lists) {
                const sym = (s.ticker).toUpperCase();
                if (!sym) continue;
                const price = Number(s.price);
                const open = Number(s.price);
                const high = Number(s.price);
                const low = Number(s.price);
                const change_amount = Number(s.change_amount);
                const change_percent = s.change_percentage;
                await Stock.findOneAndUpdate({ symbol: sym }, {
                    symbol: sym,
                    price,
                    open,
                    high,
                    low,
                    change_amount,
                    change_percent,
                    lastRefresh: new Date()
                    }, { upsert: true, new: true });
        }
        } catch (e) {
            console.error('Error upserting individual stocks from stockList:', e);
        }

        res.json({ success: true, stockList: stockListJson, lastUpdated: cache.lastRefresh });
    } catch (err) {
        console.error("Error in /api/stockList:", err);
        return res.status(500).json({
            success: false,
            message: "Error fetching stock data",
            detail: String(err),
            });
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

app.get("/api/user/watchlist", async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.email) {
            return res.status(401).json({ success: false, message: 'Not logged in' });
        }

        const user = await User.findOne({ username: req.session.user.username, email: req.session.user.email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.json({ success: true, watchlist: user.watchlist.stocks});
    } catch (err) {
        console.error('Error in /api/user/watchlist:', err);
        return res.status(500).json({ success: false, message: 'Error fetching user watchlist', detail: String(err) });
    }
});
// Add watchlist item to user watchlist
app.post('/api/user/addWatchlistItem', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { ticker } = req.body;
        if (!ticker) {
            return res.status(400).json({ success: false, message: "Ticker is required" });
        }

        const user = await User.findOne({ email: req.session.user.email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check if ticker already exists in watchlist
        const alreadyExists = user.watchlist.stocks.some(stock => stock.ticker === ticker);
        if (alreadyExists) {
            return res.status(400).json({ success: false, message: "Stock already in watchlist" });
        }

        user.watchlist.stocks.push({ ticker });
        await user.save();

        res.json({
            success: true,
            message: "Stock added to watchlist",
            watchlist: user.watchlist.stocks
        });
    } catch (err) {
        console.error('Error in /api/user/addWatchlistItem', err);
        res.status(500).json({ success: false, message: 'Error adding stock', detail: String(err) });
    }
});

// remove watchlist stock item from user
app.delete('/api/user/watchlist/:ticker', async (req, res) => {
    try {
        if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { ticker } = req.params;

        // Find user by session email
        const user = await User.findOne({ email: req.session.user.email });
        if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
        }

        // Remove stock from watchlist
        user.watchlist.stocks = user.watchlist.stocks.filter(
            stock => stock.ticker !== ticker
        );

        await user.save();

        res.json({
            success: true,
            message: `Removed ${ticker} from watchlist`,
            watchlist: user.watchlist.stocks
        });
    } catch (err) {
        console.error('Error in DELETE /api/user/watchlist/:ticker', err);
        res.status(500).json({ success: false, message: 'Error removing stock', detail: String(err) });
    }
});
// Query URL to determine the transaction type and sort
app.get('/api/transactions', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.email) {
            return res.status(401).json({ success: false, message: 'Not logged in' });
        }
        const { type, sort } = req.query;
        const user = await User.findOne({ email: req.session.user.email });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        let transactions = (user.transactions);
        if (type && (type === 'buy' || type === 'sell')) {
            transactions = transactions.filter(t => t.type === type);
        }
        
        transactions.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (sort === 'oldest') transactions.reverse();

        return res.json({ success: true, transactions });
    } catch (err) {
        console.error('Error in /api/transactions:', err);
        return res.status(500).json({ success: false, message: 'Error fetching transactions', detail: String(err) });
    }
});

module.exports = app;