const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { dbAsync } = require('../database/database');

// Server-Sent Events (SSE) Stream Endpoint for Real-time Notifications & Chat Updates
router.get('/stream', (req, res) => {
    const token = req.query.token;

    if (!token) {
        return res.status(401).json({ error: 'Token required for SSE connection.' });
    }

    let user;
    try {
        user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return res.status(403).json({ error: 'Invalid or expired SSE token.' });
    }

    // Set SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial handshake ping
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE Stream Active', userId: user.id })}\n\n`);

    // Periodic heartbeat & unread checks
    const intervalId = setInterval(async () => {
        try {
            const unreadNotifs = await dbAsync.get(
                'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
                [user.id]
            );
            const unreadMsgs = await dbAsync.get(
                'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
                [user.id]
            );

            const payload = {
                type: 'unread_update',
                notifications_unread: unreadNotifs ? unreadNotifs.count : 0,
                messages_unread: unreadMsgs ? unreadMsgs.count : 0,
                timestamp: new Date().toISOString()
            };

            res.write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch (err) {
            // Suppress error in interval stream
        }
    }, 5000);

    // Clean up connection on client disconnect
    req.on('close', () => {
        clearInterval(intervalId);
        res.end();
    });
});

module.exports = router;
