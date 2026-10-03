const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'blogspace_super_secret_jwt_key_2026_change_in_production';

// Strict Auth Middleware - Requires valid JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ error: 'Access token required. Please log in.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
        }
        req.user = user;
        next();
    });
}

// Optional Auth Middleware - Doesn't fail if no token, but parses user if valid
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (!err) {
            req.user = user;
        } else {
            req.user = null;
        }
        next();
    });
}

// Admin Check Middleware
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    next();
}

module.exports = {
    authenticateToken,
    optionalAuth,
    requireAdmin,
    JWT_SECRET
};
