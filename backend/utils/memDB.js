/**
 * In-memory database fallback when MongoDB is unavailable.
 * Data is stored in memory (resets on restart) so you can
 * test the app without setting up MongoDB.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Simple in-memory store
const store = {
    users: [],
    portfolios: []
};

// Seed a demo user synchronously so test@demo.com / password123 works out of the box
store.users.push({
    _id: crypto.randomBytes(12).toString('hex'),
    name: 'Demo User',
    email: 'test@demo.com',
    password: bcrypt.hashSync('password123', 10),
    riskProfile: 'Moderate',
    createdAt: new Date()
});

function generateId() {
    return crypto.randomBytes(12).toString('hex');
}

const memDB = {
    // --- USER ---
    async findUserByEmail(email) {
        return store.users.find(u => u.email === email.toLowerCase()) || null;
    },
    async findUserById(id) {
        return store.users.find(u => u._id === id) || null;
    },
    async createUser({ name, email, password, riskProfile }) {
        const hashed = await bcrypt.hash(password, 12);
        const user = {
            _id: generateId(),
            name,
            email: email.toLowerCase(),
            password: hashed,
            riskProfile: riskProfile || 'Moderate',
            createdAt: new Date()
        };
        store.users.push(user);
        return user;
    },
    async comparePassword(user, candidate) {
        return bcrypt.compare(candidate, user.password);
    },

    // --- PORTFOLIO ---
    async findPortfolioByUser(userId) {
        return store.portfolios.find(p => p.user === userId) || null;
    },
    async createPortfolio(userId) {
        const portfolio = { _id: generateId(), user: userId, holdings: [], lastUpdated: new Date() };
        store.portfolios.push(portfolio);
        return portfolio;
    },
    async savePortfolio(portfolio) {
        const idx = store.portfolios.findIndex(p => p._id === portfolio._id);
        if (idx >= 0) store.portfolios[idx] = { ...portfolio, lastUpdated: new Date() };
        return portfolio;
    }
};

module.exports = memDB;
