const express = require("express");
const session = require("express-session");
const app = express();
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/user.model");

mongoose
  .connect("mongodb://127.0.0.1/InvestmentProjectDB")
  .then(() => {
    console.log("Database is connected successfully");
  })
  .catch((error) => console.log(error));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
  })
);

// Serve static files after session middleware so the middleware above can protect specific files
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/public/register/register.html");
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  } else {
    return res.sendFile(__dirname + "/public/dashboard.html");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    // Use findOne to avoid getting an array and reassigning const
    const user = await User.findOne({ email: email, password: password });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }
    req.session.user = { username: user.username, email: user.email };
    return res.status(200).json({
      success: true,
      message: "Login successful",
      redirect: "/dashboard",
    });
  } catch (error) {
    console.error("Error in /login:", error);
    res.status(500).json({
      success: false,
      message: "Error logging in. Please try again later.",
    });
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
      .json({ success: false, message: "Please enter a valid email address" });
  }

  // password length check
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
    });
  }

  const newUser = new User({
    username,
    email,
    password,
    portfolio: { availableFunds: 1000, stocks: [] },
  });

  newUser
    .save()
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
        return res
          .status(409)
          .json({ success: false, message: "Email already in use" });
      }
      // Validation errors from mongoose
      if (err && err.name === "ValidationError") {
        const messages = Object.values(err.errors)
          .map((e) => e.message)
          .join("; ");
        return res.status(400).json({ success: false, message: messages });
      }
      return res.status(500).json({
        success: false,
        message: "Error registering new user. Please try again later.",
      });
    });
});

app.get("/api/stockList", async (req, res) => {
  try {
    const stockListResponse = await fetch(
      `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${process.env.API_KEY}`
    );
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
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.clearCookie && res.clearCookie("connect.sid");
    return res.json({ success: true, message: "Logged out" });
  });
});

//buy stock request. when the user clicks the confirm button to buy stock, this is called.

app.post("/api/buyStock", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false }); //if not user, throw 401 error

  const { ticker, price, quantity } = req.body; // variables passed in the html post form body

  const user = await User.findOne({ email: req.session.user.email }); // find the matching users email

  const totalCost = price * quantity; //calculate the cost of the purchased stock

  if (user.portfolio.availableFunds < totalCost) {
    return res.status(400).json({ success: false });
  } // verify user has enough funds

  user.portfolio.availableFunds -= totalCost; //deduct funds
  user.portfolio.stocks.push({ ticker, quantity, avgPrice: price }); //add stock to the users owned stocks array
  await user.save(); //save
  res.json({ success: true }); //return success
});

app.post("/api/sellStock", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false }); //if not user, throw 401 error

  const { ticker, price, quantity } = req.body; // variables passed in the html post form body

  const user = await User.findOne({ email: req.session.user.email }); // find the matching users email

  const totalCost = price * quantity; //calculate the cost of the purchased stock

  if (user.portfolio.availableFunds < totalCost) {
    return res.status(400).json({ success: false });
  } // verify user has enough funds

  user.portfolio.availableFunds += totalCost; //add funds
  user.portfolio.stocks = user.portfolio.stocks.filter(
    (stock) => !(stock.ticker === ticker && stock.avgPrice === price)
  );
  //delete stock to the users owned stocks array
  await user.save(); //save
  res.json({ success: true }); //return success
});

module.exports = app;

//get the users funds
app.get("/api/getFunds", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  try {
    const user = await User.findOne({ email: req.session.user.email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      availableFunds: user.portfolio.availableFunds,
    });
  } catch (err) {
    console.error("Error fetching funds:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/getStocks", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  try {
    const user = await User.findOne({ email: req.session.user.email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, stocks: user.portfolio.stocks });
  } catch (err) {
    console.error("Error fetching stocks:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});
