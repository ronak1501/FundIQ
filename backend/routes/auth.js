const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const SECRET = () => process.env.JWT_SECRET || 'fallback_secret_key';
const signToken = (id) => jwt.sign({ id }, SECRET(), { expiresIn: '7d' });

// ── REGISTER ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, riskProfile } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ message: 'Name, email and password are required' });

        if (global.USE_MEM_DB) {
            const memDB = require('../utils/memDB');
            const existing = await memDB.findUserByEmail(email);
            if (existing) return res.status(400).json({ message: 'Email already registered' });
            const user = await memDB.createUser({ name, email, password, riskProfile });
            return res.status(201).json({
                token: signToken(user._id),
                user: { id: user._id, name: user.name, email: user.email, riskProfile: user.riskProfile }
            });
        }

        const User = require('../models/User');
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ message: 'Email already registered' });
        const user = await User.create({ name, email, password, riskProfile });
        res.status(201).json({
            token: signToken(user._id),
            user: { id: user._id, name: user.name, email: user.email, riskProfile: user.riskProfile }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Registration failed: ' + err.message });
    }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email and password are required' });

        if (global.USE_MEM_DB) {
            const memDB = require('../utils/memDB');
            const user = await memDB.findUserByEmail(email);
            if (!user) return res.status(401).json({ message: 'Invalid email or password' });
            const ok = await memDB.comparePassword(user, password);
            if (!ok) return res.status(401).json({ message: 'Invalid email or password' });
            return res.json({
                token: signToken(user._id),
                user: { id: user._id, name: user.name, email: user.email, riskProfile: user.riskProfile }
            });
        }

        const User = require('../models/User');
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || !(await user.comparePassword(password)))
            return res.status(401).json({ message: 'Invalid email or password' });
        res.json({
            token: signToken(user._id),
            user: { id: user._id, name: user.name, email: user.email, riskProfile: user.riskProfile }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Login failed: ' + err.message });
    }
});

// ── ME ────────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });
        const decoded = jwt.verify(token, SECRET());

        if (global.USE_MEM_DB) {
            const memDB = require('../utils/memDB');
            const user = await memDB.findUserById(decoded.id);
            if (!user) return res.status(401).json({ message: 'User not found' });
            const { password: _, ...safe } = user;
            return res.json({ ...safe, id: safe._id });
        }

        const User = require('../models/User');
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.status(401).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

module.exports = router;
