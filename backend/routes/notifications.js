const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

// Get Logged-in User Notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const notifications = await dbAsync.all(
            `SELECT 
                notifications.*,
                users.full_name as sender_name,
                users.username as sender_username,
                users.avatar_url as sender_avatar,
                posts.title as post_title
             FROM notifications
             JOIN users ON notifications.sender_id = users.id
             LEFT JOIN posts ON notifications.post_id = posts.id
             WHERE notifications.user_id = ?
             ORDER BY notifications.created_at DESC
             LIMIT 50`,
            [userId]
        );

        const unreadCount = await dbAsync.get(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId]
        );

        res.json({
            notifications,
            unread_count: unreadCount ? unreadCount.count : 0
        });
    } catch (err) {
        console.error('Fetch notifications error:', err);
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// Mark Notifications as Read
router.put('/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { notification_id } = req.body;

        if (notification_id) {
            await dbAsync.run(
                'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
                [notification_id, userId]
            );
        } else {
            // Mark all as read
            await dbAsync.run(
                'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
                [userId]
            );
        }

        res.json({ message: 'Notifications marked as read.' });
    } catch (err) {
        console.error('Mark notification read error:', err);
        res.status(500).json({ error: 'Failed to update notifications.' });
    }
});

module.exports = router;
