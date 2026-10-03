const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Toggle Like / Unlike Post
router.post('/:id/like', authenticateToken, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const userId = req.user.id;

        const post = await dbAsync.get('SELECT id, user_id FROM posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        const existingLike = await dbAsync.get(
            'SELECT * FROM likes WHERE user_id = ? AND post_id = ?',
            [userId, postId]
        );

        let liked = false;
        if (existingLike) {
            // Unlike post
            await dbAsync.run('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
            liked = false;
        } else {
            // Like post
            await dbAsync.run('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
            liked = true;

            // Notify post author if not liking own post
            if (post.user_id !== userId) {
                await dbAsync.run(
                    'INSERT INTO notifications (user_id, sender_id, type, post_id) VALUES (?, ?, ?, ?)',
                    [post.user_id, userId, 'like', postId]
                );
            }
        }

        // Get updated likes count
        const countResult = await dbAsync.get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);
        const likesCount = countResult ? countResult.count : 0;

        res.json({
            liked,
            likes_count: likesCount,
            message: liked ? 'Post liked!' : 'Post unliked!'
        });
    } catch (err) {
        console.error('Like toggle error:', err);
        res.status(500).json({ error: 'Failed to process like.' });
    }
});

// Check if current user liked a post & get like count
router.get('/:id/liked', optionalAuth, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const userId = req.user ? req.user.id : 0;

        const likeRecord = userId 
            ? await dbAsync.get('SELECT * FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId])
            : null;

        const countResult = await dbAsync.get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);
        const likesCount = countResult ? countResult.count : 0;

        res.json({
            liked: Boolean(likeRecord),
            likes_count: likesCount
        });
    } catch (err) {
        console.error('Get liked error:', err);
        res.status(500).json({ error: 'Failed to check like status.' });
    }
});

module.exports = router;
