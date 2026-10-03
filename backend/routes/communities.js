const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Get All Communities
router.get('/', optionalAuth, async (req, res) => {
    try {
        const currentUserId = req.user ? req.user.id : 0;

        const communities = await dbAsync.all(
            `SELECT 
                communities.*,
                users.full_name as creator_name,
                users.username as creator_username,
                (SELECT COUNT(*) FROM community_members WHERE community_id = communities.id) as members_count,
                (SELECT COUNT(*) FROM posts WHERE community_id = communities.id AND status = 'published') as posts_count,
                (SELECT COUNT(*) FROM community_members WHERE community_id = communities.id AND user_id = ?) as is_joined
             FROM communities
             JOIN users ON communities.creator_id = users.id
             ORDER BY members_count DESC, communities.created_at DESC`,
            [currentUserId]
        );

        res.json({
            communities: communities.map(c => ({
                ...c,
                is_joined: Boolean(c.is_joined)
            }))
        });
    } catch (err) {
        console.error('Fetch communities error:', err);
        res.status(500).json({ error: 'Failed to fetch communities.' });
    }
});

// Get Single Community by ID or Slug
router.get('/:identifier', optionalAuth, async (req, res) => {
    try {
        const { identifier } = req.params;
        const isNumeric = /^\d+$/.test(identifier);
        const currentUserId = req.user ? req.user.id : 0;

        const sql = isNumeric
            ? 'SELECT * FROM communities WHERE id = ?'
            : 'SELECT * FROM communities WHERE slug = ?';

        const community = await dbAsync.get(sql, [isNumeric ? parseInt(identifier) : identifier]);

        if (!community) {
            return res.status(404).json({ error: 'Community not found.' });
        }

        const creator = await dbAsync.get('SELECT id, full_name, username, avatar_url FROM users WHERE id = ?', [community.creator_id]);
        const membersCount = await dbAsync.get('SELECT COUNT(*) as count FROM community_members WHERE community_id = ?', [community.id]);
        const postsCount = await dbAsync.get('SELECT COUNT(*) as count FROM posts WHERE community_id = ? AND status = "published"', [community.id]);
        const isJoined = currentUserId
            ? await dbAsync.get('SELECT * FROM community_members WHERE community_id = ? AND user_id = ?', [community.id, currentUserId])
            : null;

        res.json({
            community: {
                ...community,
                creator,
                members_count: membersCount ? membersCount.count : 0,
                posts_count: postsCount ? postsCount.count : 0,
                is_joined: Boolean(isJoined),
                my_role: isJoined ? isJoined.role : null
            }
        });
    } catch (err) {
        console.error('Fetch community error:', err);
        res.status(500).json({ error: 'Failed to fetch community details.' });
    }
});

// Create New Community
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, description = '', banner_url = '', icon_url = '', rules = '' } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Community name is required.' });
        }

        const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        const existing = await dbAsync.get('SELECT id FROM communities WHERE slug = ? OR LOWER(name) = LOWER(?)', [slug, name.trim()]);
        if (existing) {
            return res.status(400).json({ error: 'A community with this name already exists.' });
        }

        const defaultIcon = icon_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80';

        const result = await dbAsync.run(
            `INSERT INTO communities (creator_id, name, slug, description, banner_url, icon_url, rules)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, name.trim(), slug, description.trim(), banner_url.trim(), defaultIcon, rules.trim()]
        );

        // Auto join creator as admin
        await dbAsync.run(
            'INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, ?)',
            [result.id, req.user.id, 'admin']
        );

        const newCommunity = await dbAsync.get('SELECT * FROM communities WHERE id = ?', [result.id]);

        res.status(201).json({
            message: 'Community created successfully!',
            community: newCommunity
        });
    } catch (err) {
        console.error('Create community error:', err);
        res.status(500).json({ error: 'Failed to create community.' });
    }
});

// Join / Leave Community Toggle
router.post('/:id/join', authenticateToken, async (req, res) => {
    try {
        const communityId = parseInt(req.params.id);
        const userId = req.user.id;

        const community = await dbAsync.get('SELECT id FROM communities WHERE id = ?', [communityId]);
        if (!community) {
            return res.status(404).json({ error: 'Community not found.' });
        }

        const existingMember = await dbAsync.get(
            'SELECT * FROM community_members WHERE community_id = ? AND user_id = ?',
            [communityId, userId]
        );

        let joined = false;
        if (existingMember) {
            // Leave
            await dbAsync.run('DELETE FROM community_members WHERE community_id = ? AND user_id = ?', [communityId, userId]);
            joined = false;
        } else {
            // Join
            await dbAsync.run(
                'INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, ?)',
                [communityId, userId, 'member']
            );
            joined = true;
        }

        const membersCount = await dbAsync.get('SELECT COUNT(*) as count FROM community_members WHERE community_id = ?', [communityId]);

        res.json({
            joined,
            members_count: membersCount ? membersCount.count : 0,
            message: joined ? 'Joined community!' : 'Left community.'
        });
    } catch (err) {
        console.error('Join community error:', err);
        res.status(500).json({ error: 'Failed to update community membership.' });
    }
});

// Get Posts in a Community
router.get('/:id/posts', optionalAuth, async (req, res) => {
    try {
        const communityId = parseInt(req.params.id);
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
             WHERE posts.community_id = ? AND posts.status = 'published'
             ORDER BY posts.created_at DESC`,
            [currentUserId, currentUserId, communityId]
        );

        res.json({
            posts: posts.map(p => ({
                ...p,
                is_liked_by_me: Boolean(p.is_liked_by_me),
                is_bookmarked_by_me: Boolean(p.is_bookmarked_by_me)
            }))
        });
    } catch (err) {
        console.error('Fetch community posts error:', err);
        res.status(500).json({ error: 'Failed to fetch community posts.' });
    }
});

module.exports = router;
