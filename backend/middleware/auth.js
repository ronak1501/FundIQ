const jwt = require('jsonwebtoken');

const SECRET = () => process.env.JWT_SECRET || 'fallback_secret_key';

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authenticated' });

        const decoded = jwt.verify(token, SECRET());

        if (global.USE_MEM_DB) {
            const memDB = require('../utils/memDB');
            const user = await memDB.findUserById(decoded.id);
            if (!user) return res.status(401).json({ message: 'User not found' });
            req.user = { ...user, _id: user._id };
            return next();
        }

        const User = require('../models/User');
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) return res.status(401).json({ message: 'User not found' });
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
