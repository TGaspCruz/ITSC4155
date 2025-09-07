const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const mongoose = require("mongoose");
const { error } = require('console');

mongoose.connect("mongodb://127.0.0.1/InvestmentProjectDB")
.then(() => {
    console.log("Database is connected successfully");
})
.catch((error) => console.log(error));

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;