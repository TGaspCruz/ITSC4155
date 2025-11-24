const mongoose = require('mongoose');

const StockListCacheSchema = new mongoose.Schema({
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastRefresh: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('StockListCache', StockListCacheSchema);
