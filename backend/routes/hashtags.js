const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { optionalAuth } = require('../middleware/auth');

// Get Trending Hashtags
router.get('/trending', async (req, res) => {
    try {
        const posts = await dbAsync.all("SELECT tags FROM posts WHERE status = 'published' AND tags != ''");
        const tagMap = {};

        posts.forEach(p => {
            const tags = p.tags.split(',');
            tags.forEach(t => {
                const cleanTag = t.trim().toLowerCase().replace(/^#/, '');
                if (cleanTag) {
                    tagMap[cleanTag] = (tagMap[cleanTag] || 0) + 1;
                }
            });
        });

        const sortedTags = Object.keys(tagMap)
            .map(tag => ({ tag, count: tagMap[tag] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);

        res.json({ hashtags: sortedTags });
    } catch (err) {
        console.error('Fetch trending hashtags error:', err);
        res.status(500).json({ error: 'Failed to fetch trending hashtags.' });
    }
});

// Get Posts by Hashtag
router.get('/:tag', optionalAuth, async (req, res) => {
    try {
        const tag = req.params.tag.toLowerCase().replace(/^#/, '');
        const currentUserId = req.user ? req.user.id : 0;

        const posts = await dbAsync.all(
            `SELECT 
                posts.*,
                users.full_name as author_name,
                users.username as author_username,
                users.avatar_url as author_avatar,
                (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comments_count,
                (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as is_liked_by_me,
                (SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = posts.id AND bookmarks.user_id = ?) as is_bookmarked_by_me
             FROM posts
             JOIN users ON posts.user_id = users.id
             WHERE LOWER(posts.tags) LIKE ? AND posts.status = 'published'
             ORDER BY posts.created_at DESC`,
            [currentUserId, currentUserId, `%${tag}%`]
        );

        res.json({
            tag: `#${tag}`,
            total: posts.length,
            posts: posts.map(p => ({
                ...p,
                is_liked_by_me: Boolean(p.is_liked_by_me),
                is_bookmarked_by_me: Boolean(p.is_bookmarked_by_me)
            }))
        });
    } catch (err) {
        console.error('Fetch hashtag posts error:', err);
        res.status(500).json({ error: 'Failed to fetch hashtag posts.' });
    }
});

module.exports = router;
