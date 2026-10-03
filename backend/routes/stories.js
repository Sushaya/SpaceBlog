const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Get Active 24-Hour Stories (Grouped by User)
router.get('/', optionalAuth, async (req, res) => {
    try {
        const now = new Date().toISOString();
        const currentUserId = req.user ? req.user.id : 0;

        const stories = await dbAsync.all(
            `SELECT 
                stories.*,
                users.full_name as author_name,
                users.username as author_username,
                users.avatar_url as author_avatar,
                (SELECT COUNT(*) FROM story_views WHERE story_id = stories.id) as views_count,
                (SELECT COUNT(*) FROM story_views WHERE story_id = stories.id AND viewer_id = ?) as is_viewed_by_me
             FROM stories
             JOIN users ON stories.user_id = users.id
             WHERE stories.expires_at > ?
             ORDER BY stories.created_at ASC`,
            [currentUserId, now]
        );

        // Group stories by author
        const groupedMap = {};
        stories.forEach(s => {
            if (!groupedMap[s.user_id]) {
                groupedMap[s.user_id] = {
                    user_id: s.user_id,
                    author_name: s.author_name,
                    author_username: s.author_username,
                    author_avatar: s.author_avatar,
                    has_unviewed: false,
                    stories: []
                };
            }
            const formattedStory = {
                ...s,
                is_viewed_by_me: Boolean(s.is_viewed_by_me)
            };
            if (!formattedStory.is_viewed_by_me) {
                groupedMap[s.user_id].has_unviewed = true;
            }
            groupedMap[s.user_id].stories.push(formattedStory);
        });

        res.json({
            feed: Object.values(groupedMap)
        });
    } catch (err) {
        console.error('Fetch stories error:', err);
        res.status(500).json({ error: 'Failed to fetch stories.' });
    }
});

// Create 24-Hour Story
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { image_url, text_overlay = '', bg_color = '#000000', link_url = '' } = req.body;

        if (!image_url || !image_url.trim()) {
            return res.status(400).json({ error: 'Story image URL is required.' });
        }

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const result = await dbAsync.run(
            `INSERT INTO stories (user_id, image_url, text_overlay, bg_color, link_url, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.id, image_url.trim(), text_overlay.trim(), bg_color.trim(), link_url.trim(), expiresAt]
        );

        const newStory = await dbAsync.get('SELECT * FROM stories WHERE id = ?', [result.id]);

        res.status(201).json({
            message: 'Story published successfully! It will expire in 24 hours.',
            story: newStory
        });
    } catch (err) {
        console.error('Create story error:', err);
        res.status(500).json({ error: 'Failed to create story.' });
    }
});

// Mark Story as Viewed
router.post('/:id/view', authenticateToken, async (req, res) => {
    try {
        const storyId = parseInt(req.params.id);
        const viewerId = req.user.id;

        await dbAsync.run(
            'INSERT OR IGNORE INTO story_views (story_id, viewer_id) VALUES (?, ?)',
            [storyId, viewerId]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record story view.' });
    }
});

// Delete Story
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const storyId = parseInt(req.params.id);
        const story = await dbAsync.get('SELECT * FROM stories WHERE id = ?', [storyId]);

        if (!story) {
            return res.status(404).json({ error: 'Story not found.' });
        }

        if (story.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only delete your own story.' });
        }

        await dbAsync.run('DELETE FROM stories WHERE id = ?', [storyId]);

        res.json({ message: 'Story deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete story.' });
    }
});

module.exports = router;
