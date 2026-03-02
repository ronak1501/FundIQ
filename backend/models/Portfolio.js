const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
    schemeCode: { type: String, required: true },
    schemeName: { type: String, required: true },
    fundHouse: { type: String },
    category: { type: String, default: 'Equity' },
    subCategory: { type: String, default: 'Large Cap' },
    units: { type: Number, required: true, min: 0 },
    investedAmount: { type: Number, required: true, min: 0 },
    buyNav: { type: Number, required: true },
    currentNav: { type: Number, default: 0 },
    purchaseDate: { type: Date, default: Date.now },
    isSIP: { type: Boolean, default: false },
    sipAmount: { type: Number, default: 0 },
    sipDay: { type: Number, default: 1 }
});

const portfolioSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    holdings: [holdingSchema],
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Portfolio', portfolioSchema);
