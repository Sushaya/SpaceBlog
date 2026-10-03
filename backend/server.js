require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import Database connection & initial setup
require('./database/database');

// Import Routes
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const likesRoutes = require('./routes/likes');
const bookmarksRoutes = require('./routes/bookmarks');
const commentsRoutes = require('./routes/comments');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const messagesRoutes = require('./routes/messages');
const reportsRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

// Import Ultimate Upgrade Routes
const storiesRoutes = require('./routes/stories');
const reelsRoutes = require('./routes/reels');
const communitiesRoutes = require('./routes/communities');
const analyticsRoutes = require('./routes/analytics');
const hashtagsRoutes = require('./routes/hashtags');
const followsRoutes = require('./routes/follows');
const sseRoutes = require('./routes/sse');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for flexible external images & video streams
    crossOriginEmbedderPolicy: false
}));

// Rate Limiting (Prevent Brute Force)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api', limiter);

// CORS & Parsing Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve Frontend Static Files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/posts', likesRoutes);
app.use('/api', bookmarksRoutes);
app.use('/api', commentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);

// Ultimate Feature Endpoints
app.use('/api/stories', storiesRoutes);
app.use('/api/reels', reelsRoutes);
app.use('/api/communities', communitiesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/hashtags', hashtagsRoutes);
app.use('/api/social', followsRoutes);
app.use('/api/sse', sseRoutes);

// Catch-all route to serve frontend HTML for SPA routing fallback if needed
app.use((req, res, next) => {
    // If request starts with /api, pass to error handler
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found.' });
    }
    
    // Serve frontend index by default
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
        if (err) {
            next(err);
        }
    });
});

// Global Error Handler (No sensitive stack trace leakage)
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'An unexpected internal server error occurred.' 
            : (err.message || 'An unexpected internal server error occurred.')
    });
});

if (require.main === module || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`=================================================`);
        console.log(`🚀 BlogSpace Ultimate Server running on http://localhost:${PORT}`);
        console.log(`=================================================`);
    });
}

module.exports = app;
