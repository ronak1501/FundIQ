const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// ── Global DB mode flag ────────────────────────────────────────────────────
global.USE_MEM_DB = false; // will be set before routes load

// ── Try MongoDB first, then start everything ───────────────────────────────
const uri = process.env.MONGODB_URI || '';
const hasValidURI = uri && !uri.includes('<username>') && uri.length > 30;

const bootServer = (useMem) => {
    global.USE_MEM_DB = useMem;

    // Load routes AFTER global flag is set
    const authRouter = require('./routes/auth');
    const portfolioRouter = require('./routes/portfolio');

    app.use('/api/auth', authRouter);
    app.use('/api/portfolio', portfolioRouter);

    app.get('/api/health', (req, res) => res.json({
        status: 'ok',
        mode: useMem ? 'in-memory' : 'mongodb',
        time: new Date()
    }));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`\n🚀 FundIQ Backend → http://localhost:${PORT}`);
        console.log(`   DB: ${useMem ? '⚡ In-Memory (data resets on restart)' : '🍃 MongoDB Atlas ✅'}\n`);
        if (useMem) {
            console.log('   ℹ️  To persist data, set a valid MONGODB_URI in backend/.env');
            console.log('   ℹ️  AND whitelist your IP in Atlas → Network Access → 0.0.0.0/0\n');
        }
    });
};

if (hasValidURI) {
    console.log('\n🔌 Connecting to MongoDB Atlas...');
    const mongoose = require('mongoose');

    const connectPromise = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 6000,
        connectTimeoutMS: 6000,
    });
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timed out after 7s')), 7000)
    );

    Promise.race([connectPromise, timeoutPromise])
        .then(() => { console.log('✅ MongoDB Atlas connected!'); bootServer(false); })
        .catch(err => {
            console.warn(`\n⚠️  MongoDB failed: ${err.message}`);
            console.warn('   Falling back to in-memory mode...\n');
            bootServer(true);
        });
} else {
    console.log('\n⚡ No MongoDB URI → starting in-memory mode');
    bootServer(true);
}

module.exports = app;
