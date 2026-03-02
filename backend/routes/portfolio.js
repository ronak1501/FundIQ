const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const navCache = require('../utils/navCache');
const router = express.Router();

// ── In-memory portfolio store (memDB mode) ────────────────────────────────
const memPortfolios = {};

// ══════════════════════════════════════════════════════════════
// NAV fetching — respects daily cache, never hits API twice
// ══════════════════════════════════════════════════════════════

/**
 * Calculate trailing returns (1Y absolute, 3Y, 5Y, SI CAGR).
 */
function calculateReturns(history) {
    if (!history || history.length < 2) return null;

    const latest = parseFloat(history[0].nav);
    const parseDate = (d) => {
        const [day, month, year] = d.split('-').map(Number);
        return new Date(year, month - 1, day).getTime();
    };

    const now = parseDate(history[0].date);
    const findNav = (years) => {
        const targetTs = now - (years * 365 * 24 * 60 * 60 * 1000);
        // Find the first point that is older than or equal to target timestamp
        const point = history.find(p => parseDate(p.date) <= targetTs);
        return point ? parseFloat(point.nav) : null;
    };

    const inceptionNav = parseFloat(history[history.length - 1].nav);
    const inceptionDate = parseDate(history[history.length - 1].date);
    const yearsSinceInception = (now - inceptionDate) / (365 * 24 * 60 * 60 * 1000);

    const nav1Y = findNav(1);
    const nav3Y = findNav(3);
    const nav5Y = findNav(5);

    const calc = (current, past, years) => {
        if (!past || past <= 0) return null;
        if (years <= 1) return ((current / past) - 1) * 100;
        return (Math.pow(current / past, 1 / years) - 1) * 100;
    };

    return {
        ret1Y: calc(latest, nav1Y, 1),
        ret3Y: calc(latest, nav3Y, 3),
        ret5Y: calc(latest, nav5Y, 5),
        retSI: calc(latest, inceptionNav, yearsSinceInception),
        siYears: yearsSinceInception
    };
}

/**
 * Fetch NAV for a single scheme.
 * Returns cached data if available (up to 24 h old).
 * Only hits mfapi.in when cache is empty or expired.
 */
async function fetchNAV(schemeCode, forceRefresh = false) {
    if (!forceRefresh) {
        const cached = navCache.get(schemeCode);
        // Important: check if returns AND siYears are present (old cache entries might lack them)
        if (cached && cached.returns && typeof cached.returns.siYears === 'number') {
            return cached;
        }
    }

    try {
        const { data } = await axios.get(
            `https://api.mfapi.in/mf/${schemeCode}`,
            { timeout: 12000 }
        );
        const latestNav = parseFloat(data.data?.[0]?.nav) || 0;
        const returns = calculateReturns(data.data);

        const result = {
            nav: latestNav,
            schemeName: data.meta?.scheme_name || '',
            fundHouse: data.meta?.fund_house || '',
            schemeCategory: data.meta?.scheme_category || 'Equity',
            schemeSubCategory: data.meta?.scheme_sub_category || '',
            returns
        };
        navCache.set(schemeCode, result);
        return result;
    } catch (err) {
        console.error(`Error fetching NAV for ${schemeCode}:`, err.message);
        // Return stale cache if API fails — better than nothing
        const stale = navCache.getMeta(schemeCode)?.data;
        return stale ?? { nav: 0, schemeName: '', fundHouse: '', schemeCategory: 'Equity', schemeSubCategory: '', returns: null };
    }
}

/**
 * Refresh NAVs for a list of holdings in PARALLEL.
 * Uses cache where available — only calls API for misses.
 */
async function refreshNavs(holdings, forceRefresh = false) {
    if (!holdings.length) return holdings;
    const navResults = await Promise.all(
        holdings.map(h => fetchNAV(h.schemeCode, forceRefresh))
    );
    return holdings.map((h, i) => {
        const nd = navResults[i];
        return nd.nav > 0 ? { ...h, currentNav: nd.nav, returns: nd.returns } : h;
    });
}

// ══════════════════════════════════════════════════════════════
// Portfolio business logic
// ══════════════════════════════════════════════════════════════

function calculateRiskScore(holdings) {
    if (!holdings.length) return 0;
    const weights = {
        equity: 80, elss: 75, sectoral: 90, thematic: 88,
        debt: 20, liquid: 10, overnight: 5, 'money market': 8,
        hybrid: 50, index: 60, fof: 55, gilt: 15, other: 50
    };
    const totalInvested = holdings.reduce((s, h) => s + (h.investedAmount || 0), 0);
    if (!totalInvested) return 0;
    let score = 0;
    holdings.forEach(h => {
        const cat = (h.category || '').toLowerCase();
        const w = Object.entries(weights).find(([k]) => cat.includes(k))?.[1] ?? 50;
        score += (w * (h.investedAmount || 0)) / totalInvested;
    });
    return Math.round(score);
}

function generateSuggestions(holdings, riskScore) {
    const suggestions = [];
    const cats = holdings.map(h => (h.category || '').toLowerCase());
    const hasEquity = cats.some(c => c.includes('equity') || c.includes('elss'));
    const hasDebt = cats.some(c => c.includes('debt') || c.includes('liquid') || c.includes('gilt'));
    const hasHybrid = cats.some(c => c.includes('hybrid'));
    const hasIndex = cats.some(c => c.includes('index'));

    if (riskScore > 70 && !hasDebt)
        suggestions.push({
            type: 'diversification', priority: 'high', title: 'Add Debt Allocation',
            description: 'Portfolio is equity-heavy. Adding 20-30% debt reduces volatility.',
            action: 'Consider ICICI Pru Short Term Fund or HDFC Corporate Bond Fund',
            suggestedFunds: ['ICICI Pru Short Term Fund', 'HDFC Corporate Bond Fund']
        });
    if (!hasIndex && holdings.length > 0)
        suggestions.push({
            type: 'cost-optimization', priority: 'medium', title: 'Consider Index Funds',
            description: 'Index funds have ultra-low expense ratios (~0.1%) and beat 80% of active funds long-term.',
            action: 'Try UTI Nifty 50 Index Fund or Nippon India Nifty 50 Index Fund',
            suggestedFunds: ['UTI Nifty 50 Index Fund', 'Nippon India Nifty 50 Index Fund']
        });
    if (!hasHybrid && riskScore > 40)
        suggestions.push({
            type: 'balance', priority: 'medium', title: 'Add Balanced Advantage Fund',
            description: 'BAFs auto-rebalance equity/debt based on market valuation.',
            action: 'Consider HDFC Balanced Advantage or Edelweiss BAF',
            suggestedFunds: ['HDFC Balanced Advantage', 'Edelweiss BAF']
        });
    if (holdings.length < 3)
        suggestions.push({
            type: 'diversification', priority: 'high', title: 'Diversify Your Portfolio',
            description: 'Fewer than 3 funds means high concentration risk. Aim for 4-6 across categories.',
            action: 'Add Large Cap, Mid Cap, and Debt funds',
            suggestedFunds: ['Nippon India Large Cap Fund', 'Parag Parikh Flexi Cap Fund']
        });
    if (holdings.length > 8)
        suggestions.push({
            type: 'consolidation', priority: 'low', title: 'Simplify & Consolidate',
            description: 'Too many funds leads to overlap. 4-6 quality funds is ideal.',
            action: 'Review overlapping holdings and merge similar categories'
        });
    if (!hasEquity && holdings.length > 0)
        suggestions.push({
            type: 'growth', priority: 'medium', title: 'Add Equity Exposure',
            description: 'No equity limits long-term growth. Equity delivers 12-15% CAGR over 10+ years.',
            action: 'Start SIP in a Flexi Cap or Large Cap fund',
            suggestedFunds: ['Parag Parikh Flexi Cap Fund', 'Mirae Asset Large Cap Fund']
        });

    return suggestions.slice(0, 4);
}

function buildStats(holdings) {
    const totalInvested = holdings.reduce((s, h) => s + (h.investedAmount || 0), 0);
    const currentValue = holdings.reduce((s, h) => s + ((h.units || 0) * (h.currentNav || h.buyNav || 0)), 0);
    const gainLoss = currentValue - totalInvested;
    const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;
    const riskScore = calculateRiskScore(holdings);
    const allocation = {};
    holdings.forEach(h => {
        const cat = h.category || 'Other';
        allocation[cat] = (allocation[cat] || 0) + (h.investedAmount || 0);
    });
    return {
        totalInvested: Math.round(totalInvested),
        currentValue: Math.round(currentValue),
        gainLoss: Math.round(gainLoss),
        gainLossPercent: parseFloat(gainLossPercent.toFixed(2)),
        riskScore,
        holdingsCount: holdings.length,
        allocation
    };
}

function getUserId(req) {
    return (req.user._id || req.user.id)?.toString();
}

function getMemPortfolio(userId) {
    if (!memPortfolios[userId]) {
        memPortfolios[userId] = { _id: `p_${userId}`, user: userId, holdings: [], lastUpdated: new Date() };
    }
    return memPortfolios[userId];
}

// Helper to build the response payload
function buildResponse(holdings) {
    const stats = buildStats(holdings);
    // Find the oldest NAV cache timestamp among this user's holdings
    const navUpdatedAt = navCache.oldestCachedAt();
    return {
        holdings,
        summary: stats,
        allocation: stats.allocation,
        suggestions: generateSuggestions(holdings, stats.riskScore),
        navUpdatedAt: navUpdatedAt || new Date(),  // when NAVs were last fetched from API
        lastUpdated: new Date()
    };
}

// ══════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════

// ── GET /portfolio ─────────────────────────────────────────────────────────
// Serves stored portfolio data instantly. NAVs come from the daily cache —
// zero external API calls on page load if cache is warm.
router.get('/', auth, async (req, res) => {
    try {
        let holdings;

        if (global.USE_MEM_DB) {
            const p = getMemPortfolio(getUserId(req));
            // Only apply cached NAVs — no fresh fetch unless cache is cold
            holdings = await refreshNavs(p.holdings, false);
        } else {
            const Portfolio = require('../models/Portfolio');
            const p = await Portfolio.findOne({ user: req.user._id }).lean();

            if (!p) {
                // Brand new user — nothing to fetch
                Portfolio.create({ user: req.user._id, holdings: [] }).catch(() => { });
                holdings = [];
            } else {
                // Apply daily-cached NAVs (only hits mfapi.in if cache is cold/expired)
                holdings = await refreshNavs(p.holdings || [], false);

                // Persist updated NAVs back to DB silently in background
                if (holdings.length > 0) {
                    const Portfolio2 = require('../models/Portfolio');
                    Portfolio2.updateOne(
                        { user: req.user._id },
                        { $set: { holdings, lastUpdated: new Date() } }
                    ).catch(() => { });
                }
            }
        }

        res.json(buildResponse(holdings));
    } catch (err) {
        console.error('GET /portfolio:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ── POST /portfolio/refresh-nav ────────────────────────────────────────────
// Force-refreshes NAVs for this user's holdings from mfapi.in.
// Invalidates cache entries, re-fetches in parallel, returns fresh data.
router.post('/refresh-nav', auth, async (req, res) => {
    try {
        let holdings;

        if (global.USE_MEM_DB) {
            const p = getMemPortfolio(getUserId(req));
            holdings = p.holdings;
        } else {
            const Portfolio = require('../models/Portfolio');
            const p = await Portfolio.findOne({ user: req.user._id }).lean();
            holdings = p?.holdings || [];
        }

        if (!holdings.length) return res.json(buildResponse([]));

        // Invalidate cache for user's holdings, then force-fetch fresh NAVs
        navCache.invalidate(holdings.map(h => h.schemeCode));
        const refreshed = await refreshNavs(holdings, true);

        // Persist to DB in background
        if (!global.USE_MEM_DB) {
            const Portfolio = require('../models/Portfolio');
            Portfolio.updateOne(
                { user: req.user._id },
                { $set: { holdings: refreshed, lastUpdated: new Date() } }
            ).catch(() => { });
        } else {
            const p = getMemPortfolio(getUserId(req));
            p.holdings = refreshed;
        }

        console.log(`🔄 NAV force-refreshed for ${refreshed.length} holdings`);
        res.json(buildResponse(refreshed));
    } catch (err) {
        console.error('POST /refresh-nav:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ── POST /portfolio/add ────────────────────────────────────────────────────
router.post('/add', auth, async (req, res) => {
    try {
        const { schemeCode, units, investedAmount, purchaseDate, isSIP, sipAmount, sipDay } = req.body;
        if (!schemeCode || !units || !investedAmount)
            return res.status(400).json({ message: 'schemeCode, units and investedAmount are required' });

        // Fetch NAV (uses cache if available — only fresh fetch if cache is cold)
        const nd = await fetchNAV(schemeCode);
        if (!nd.nav)
            return res.status(400).json({ message: 'Could not fetch NAV. Please verify the scheme code and try again.' });

        const newH = {
            _id: require('crypto').randomBytes(12).toString('hex'),
            schemeCode,
            schemeName: nd.schemeName || `Fund ${schemeCode}`,
            fundHouse: nd.fundHouse || '',
            category: nd.schemeCategory || 'Equity',
            subCategory: nd.schemeSubCategory || '',
            units: parseFloat(units),
            investedAmount: parseFloat(investedAmount),
            buyNav: parseFloat(investedAmount) / parseFloat(units),
            currentNav: nd.nav,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
            isSIP: isSIP || false,
            sipAmount: sipAmount ? parseFloat(sipAmount) : 0,
            sipDay: sipDay ? parseInt(sipDay) : 1
        };

        if (global.USE_MEM_DB) {
            const p = getMemPortfolio(getUserId(req));
            const idx = p.holdings.findIndex(h => h.schemeCode === schemeCode);
            if (idx >= 0) {
                const ex = p.holdings[idx];
                const tu = ex.units + newH.units;
                const ti = ex.investedAmount + newH.investedAmount;
                p.holdings[idx] = { ...ex, units: tu, investedAmount: ti, buyNav: ti / tu, currentNav: nd.nav };
            } else {
                p.holdings.push(newH);
            }
            p.lastUpdated = new Date();
            return res.json({ message: 'Holding added successfully', holdings: p.holdings });
        }

        const Portfolio = require('../models/Portfolio');
        let p = await Portfolio.findOne({ user: req.user._id });
        if (!p) p = await Portfolio.create({ user: req.user._id, holdings: [] });
        const idx = p.holdings.findIndex(h => h.schemeCode === schemeCode);
        if (idx >= 0) {
            const ex = p.holdings[idx];
            const tu = ex.units + newH.units;
            const ti = ex.investedAmount + newH.investedAmount;
            ex.units = tu; ex.investedAmount = ti;
            ex.buyNav = ti / tu; ex.currentNav = nd.nav;
        } else {
            p.holdings.push(newH);
        }
        p.lastUpdated = new Date();
        await p.save();
        res.json({ message: 'Holding added successfully', holdings: p.holdings });
    } catch (err) {
        console.error('POST /add:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ── DELETE /portfolio/holding/:id ─────────────────────────────────────────
router.delete('/holding/:id', auth, async (req, res) => {
    try {
        if (global.USE_MEM_DB) {
            const p = getMemPortfolio(getUserId(req));
            p.holdings = p.holdings.filter(h => h._id !== req.params.id);
            return res.json({ message: 'Holding removed' });
        }
        const Portfolio = require('../models/Portfolio');
        const p = await Portfolio.findOne({ user: req.user._id });
        if (!p) return res.status(404).json({ message: 'Portfolio not found' });
        p.holdings = p.holdings.filter(h => h._id.toString() !== req.params.id);
        await p.save();
        res.json({ message: 'Holding removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /portfolio/search ─────────────────────────────────────────────────
router.get('/search', auth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json([]);
        const { data } = await axios.get(
            `https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`,
            { timeout: 8000 }
        );
        res.json((data || []).slice(0, 15));
    } catch {
        res.status(500).json({ message: 'Search failed. Please try again.' });
    }
});

// ── GET /portfolio/nav/:schemeCode ─ current NAV only ─────────────────────
router.get('/nav/:schemeCode', auth, async (req, res) => {
    try {
        const nd = await fetchNAV(req.params.schemeCode);
        res.json(nd);
    } catch {
        res.status(500).json({ message: 'Failed to fetch NAV' });
    }
});

// ── GET /portfolio/nav-history/:schemeCode ─────────────────────────────────
// Returns full historical NAV array + current NAV + fund metadata.
// Used by AddFund to resolve NAV for any past purchase date.
// Cached in navCache for 24 h — survives server restarts via nav-cache.json.
router.get('/nav-history/:schemeCode', auth, async (req, res) => {
    const { schemeCode } = req.params;
    const HIST_KEY = `hist_${schemeCode}`;
    const TTL = (parseInt(process.env.NAV_CACHE_TTL_HOURS) || 24) * 3_600_000;

    try {
        // Serve from cache if still fresh
        const cached = navCache.getMeta(HIST_KEY);
        if (cached && cached.expiresAt > Date.now()) {
            return res.json(cached.data);
        }

        // Fetch full history from mfapi.in (contains ALL NAVs since fund inception)
        const { data } = await axios.get(
            `https://api.mfapi.in/mf/${schemeCode}`,
            { timeout: 12000 }
        );

        const currentNav = parseFloat(data.data?.[0]?.nav) || 0;
        const result = {
            schemeCode,
            schemeName: data.meta?.scheme_name || '',
            fundHouse: data.meta?.fund_house || '',
            schemeCategory: data.meta?.scheme_category || 'Equity',
            schemeSubCategory: data.meta?.scheme_sub_category || '',
            currentNav,
            history: data.data || []  // [{date:"DD-MM-YYYY", nav:"123.4567"}, ...]
        };

        // Cache the full history object for 24 h
        navCache.setRaw(HIST_KEY, result, TTL);

        // Also pre-warm the per-scheme current-NAV entry (saves a round-trip on next portfolio load)
        navCache.set(schemeCode, {
            nav: currentNav,
            schemeName: result.schemeName,
            fundHouse: result.fundHouse,
            schemeCategory: result.schemeCategory,
            schemeSubCategory: result.schemeSubCategory,
        });

        res.json(result);
    } catch (err) {
        console.error('GET /nav-history:', err.message);
        res.status(500).json({ message: 'Failed to fetch NAV history. Please try again.' });
    }
});

// ── POST /portfolio/sip-projection ───────────────────────────────────────
router.post('/sip-projection', auth, async (req, res) => {
    try {
        const { monthlyAmount = 10000, years = 10, expectedReturn = 12 } = req.body;
        const rate = parseFloat(expectedReturn) / 100 / 12;
        const months = parseInt(years) * 12;
        const amt = parseFloat(monthlyAmount);
        const invested = amt * months;
        const maturity = amt * ((Math.pow(1 + rate, months) - 1) / rate) * (1 + rate);
        const yearlyData = Array.from({ length: parseInt(years) }, (_, i) => {
            const m = (i + 1) * 12;
            const v = amt * ((Math.pow(1 + rate, m) - 1) / rate) * (1 + rate);
            return { year: i + 1, invested: Math.round(amt * m), value: Math.round(v) };
        });
        res.json({ invested: Math.round(invested), maturity: Math.round(maturity), gains: Math.round(maturity - invested), yearlyData });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /portfolio/cache-status (debug/info) ──────────────────────────────
router.get('/cache-status', auth, async (req, res) => {
    res.json({
        cachedFunds: navCache.size,
        validKeys: navCache.validKeys().length,
        oldestCacheAt: navCache.oldestCachedAt(),
        nextRefreshIn: (() => {
            const oldest = navCache.oldestCachedAt();
            if (!oldest) return null;
            const ttlMs = (parseInt(process.env.NAV_CACHE_TTL_HOURS) || 24) * 3600000;
            const diffMs = (oldest + ttlMs) - Date.now();
            if (diffMs <= 0) return 'expired';
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            return `${h}h ${m}m`;
        })()
    });
});

module.exports = router;
