const { request } = require("express");
const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please enter username"],
  },

  email: {
    type: String,
    required: [true, "Please enter email"],
    unique: true,
    match: [/.+@.+\..+/, "Please enter a valid email address"],
  },

  password: {
    type: String,
    required: [true, "Please enter password"],
    minlength: [8, "Password must be at least 8 characters"],
  },

  portfolio: {
    availableFunds: {
      type: Number,
      default: 0,
      required: true,
    },

    stocks: [
      {
        ticker: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        avgPrice: { type: Number, required: true, min: 0 },
      },
    ],
  },

  transactions: [
    {
      type: { type: String, enum: ['buy','sell'], required: true },
      ticker: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      total: { type: Number, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ],

  realizedGainLoss: {
    type: Number,
    default: 0,
  },

  watchlist: {
    stocks: [
      {
        ticker: { type: String, required: true },
      },
    ],
  },

  currentLoginTime: {
    type: Date, default: Date.now, index: true 
  },

  lastLoginBonus: {
     type: Date, default: Date.now, index: true 
  },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
