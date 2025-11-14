const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
    symbol: { type: String, required: true, unique: true, index: true },
    open: { type: Number },
    high: { type: Number },
    low: { type: Number },
    price: { type: Number, required: true, default: 0 },
    change_amount: { type: Number, default: 0 },
    change_percent: { type: String, default: '0%' },
    lastRefresh: { type: Date, default: Date.now, index: true }
});

// Pre-save hook to set open, high, and low to price if not provided
StockSchema.pre('save', function (next) {
    if (this.open === undefined) this.open = this.price;
    if (this.high === undefined) this.high = this.price;
    if (this.low === undefined) this.low = this.price;
    next();
});

const Stock = mongoose.model('Stock', StockSchema);

module.exports = Stock;
