const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Get Short Video Reels Feed
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;

        const reels = await dbAsync.all(
            `SELECT 
                reels.*,
                users.full_name as author_name,
                users.username as author_username,
                users.avatar_url as author_avatar
             FROM reels
             JOIN users ON reels.user_id = users.id
             ORDER BY reels.created_at DESC
             LIMIT ? OFFSET ?`,
            [parseInt(limit), parseInt(offset)]
        );

        res.json({ reels });
    } catch (err) {
        console.error('Fetch reels error:', err);
        res.status(500).json({ error: 'Failed to fetch short videos.' });
    }
});

// Upload / Create Short Video Reel
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { video_url, thumbnail_url = '', caption = '', hashtags = '' } = req.body;

        if (!video_url || !video_url.trim()) {
            return res.status(400).json({ error: 'Video URL is required.' });
        }

        const result = await dbAsync.run(
            `INSERT INTO reels (user_id, video_url, thumbnail_url, caption, hashtags)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, video_url.trim(), thumbnail_url.trim(), caption.trim(), hashtags.trim()]
        );

        const newReel = await dbAsync.get(
            `SELECT reels.*, users.full_name as author_name, users.username as author_username, users.avatar_url as author_avatar
             FROM reels JOIN users ON reels.user_id = users.id WHERE reels.id = ?`,
            [result.id]
        );

        res.status(201).json({
            message: 'Short video published successfully!',
            reel: newReel
        });
    } catch (err) {
        console.error('Create reel error:', err);
        res.status(500).json({ error: 'Failed to publish video reel.' });
    }
});

// Delete Short Video Reel
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const reelId = parseInt(req.params.id);
        const reel = await dbAsync.get('SELECT * FROM reels WHERE id = ?', [reelId]);

        if (!reel) {
            return res.status(404).json({ error: 'Reel not found.' });
        }

        if (reel.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only delete your own video reels.' });
        }

        await dbAsync.run('DELETE FROM reels WHERE id = ?', [reelId]);

        res.json({ message: 'Reel deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete video reel.' });
    }
});

module.exports = router;
