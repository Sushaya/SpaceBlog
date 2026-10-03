const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Toggle Bookmark / Save Post
router.post('/posts/:id/bookmark', authenticateToken, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const userId = req.user.id;

        const post = await dbAsync.get('SELECT id FROM posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        const existingBookmark = await dbAsync.get(
            'SELECT * FROM bookmarks WHERE user_id = ? AND post_id = ?',
            [userId, postId]
        );

        let bookmarked = false;
        if (existingBookmark) {
            // Remove bookmark
            await dbAsync.run('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?', [userId, postId]);
            bookmarked = false;
        } else {
            // Save bookmark
            await dbAsync.run('INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)', [userId, postId]);
            bookmarked = true;
        }

        const countResult = await dbAsync.get('SELECT COUNT(*) as count FROM bookmarks WHERE post_id = ?', [postId]);
        const bookmarksCount = countResult ? countResult.count : 0;

        res.json({
            bookmarked,
            bookmarks_count: bookmarksCount,
            message: bookmarked ? 'Post saved to your bookmarks!' : 'Post removed from saved bookmarks.'
        });
    } catch (err) {
        console.error('Bookmark toggle error:', err);
        res.status(500).json({ error: 'Failed to process bookmark.' });
    }
});

// Get User's Saved / Bookmarked Posts
router.get('/users/:id/bookmarks', optionalAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUserId = req.user ? req.user.id : 0;

        // Privacy check: Only the profile owner or admin can view saved posts
        if (currentUserId !== userId && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'You cannot view another user\'s saved bookmarks.' });
        }

        const posts = await dbAsync.all(
            `SELECT 
                posts.*,
                users.full_name as author_name,
                users.username as author_username,
                users.avatar_url as author_avatar,
                (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comments_count,
                (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as is_liked_by_me,
                1 as is_bookmarked_by_me
             FROM bookmarks
             JOIN posts ON bookmarks.post_id = posts.id
             JOIN users ON posts.user_id = users.id
             WHERE bookmarks.user_id = ? AND posts.status = 'published'
             ORDER BY bookmarks.created_at DESC`,
            [currentUserId, userId]
        );

        res.json({
            posts: posts.map(p => ({
                ...p,
                is_liked_by_me: Boolean(p.is_liked_by_me),
                is_bookmarked_by_me: true
            }))
        });
    } catch (err) {
        console.error('Fetch bookmarks error:', err);
        res.status(500).json({ error: 'Failed to fetch saved posts.' });
    }
});

module.exports = router;
