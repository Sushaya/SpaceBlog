const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Get User Profile by ID or Username
router.get('/:identifier', optionalAuth, async (req, res) => {
    try {
        const { identifier } = req.params;
        const isNumeric = /^\d+$/.test(identifier);

        const sql = isNumeric
            ? 'SELECT id, full_name, username, email, bio, avatar_url, cover_url, role, created_at FROM users WHERE id = ?'
            : 'SELECT id, full_name, username, email, bio, avatar_url, cover_url, role, created_at FROM users WHERE LOWER(username) = LOWER(?)';

        const user = await dbAsync.get(sql, [isNumeric ? parseInt(identifier) : identifier]);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const currentUserId = req.user ? req.user.id : 0;

        // Statistics
        const postsCount = await dbAsync.get(
            currentUserId === user.id
                ? "SELECT COUNT(*) as count FROM posts WHERE user_id = ?"
                : "SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND status = 'published'",
            [user.id]
        );
        const followersCount = await dbAsync.get(
            "SELECT COUNT(*) as count FROM followers WHERE following_id = ?",
            [user.id]
        );
        const followingCount = await dbAsync.get(
            "SELECT COUNT(*) as count FROM followers WHERE follower_id = ?",
            [user.id]
        );
        const viewsCount = await dbAsync.get(
            "SELECT SUM(views) as total FROM posts WHERE user_id = ? AND status = 'published'",
            [user.id]
        );
        const likesCount = await dbAsync.get(
            "SELECT COUNT(*) as total FROM likes JOIN posts ON likes.post_id = posts.id WHERE posts.user_id = ?",
            [user.id]
        );

        // Check if current user is following this user
        const followCheck = currentUserId 
            ? await dbAsync.get('SELECT * FROM followers WHERE follower_id = ? AND following_id = ?', [currentUserId, user.id])
            : null;

        // Omit email if viewing another user's profile
        const isSelf = currentUserId === user.id;
        const publicUser = {
            id: user.id,
            full_name: user.full_name,
            username: user.username,
            bio: user.bio,
            avatar_url: user.avatar_url,
            cover_url: user.cover_url || '',
            role: user.role,
            created_at: user.created_at,
            email: isSelf ? user.email : undefined,
            stats: {
                total_posts: postsCount ? postsCount.count : 0,
                followers: followersCount ? followersCount.count : 0,
                following: followingCount ? followingCount.count : 0,
                total_views: viewsCount?.total || 0,
                total_likes: likesCount?.total || 0
            },
            is_following: Boolean(followCheck),
            is_self: isSelf
        };

        res.json({ user: publicUser });
    } catch (err) {
        console.error('Fetch user profile error:', err);
        res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
});

// Update Profile
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only update your own profile.' });
        }

        const { full_name, username, bio, avatar_url, cover_url } = req.body;

        const existingUser = await dbAsync.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Check username uniqueness if changed
        if (username && username.toLowerCase().trim() !== existingUser.username.toLowerCase()) {
            const usernameTaken = await dbAsync.get(
                'SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?',
                [username.trim(), userId]
            );
            if (usernameTaken) {
                return res.status(400).json({ error: 'Username is already taken by another user.' });
            }
        }

        const updatedFullName = full_name !== undefined ? full_name.trim() : existingUser.full_name;
        const updatedUsername = username !== undefined ? username.toLowerCase().trim() : existingUser.username;
        const updatedBio = bio !== undefined ? bio.trim() : existingUser.bio;
        const updatedAvatar = avatar_url !== undefined ? avatar_url.trim() : existingUser.avatar_url;
        const updatedCover = cover_url !== undefined ? cover_url.trim() : (existingUser.cover_url || '');

        await dbAsync.run(
            `UPDATE users 
             SET full_name = ?, username = ?, bio = ?, avatar_url = ?, cover_url = ?
             WHERE id = ?`,
            [updatedFullName, updatedUsername, updatedBio, updatedAvatar, updatedCover, userId]
        );

        const updatedUser = await dbAsync.get(
            'SELECT id, full_name, username, email, bio, avatar_url, cover_url, role, created_at FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            message: 'Profile updated successfully!',
            user: updatedUser
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// Get User's Posts (published, drafts, or all)
router.get('/:id/posts', optionalAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { status } = req.query;
        const currentUserId = req.user ? req.user.id : 0;
        const isSelf = currentUserId === userId || req.user?.role === 'admin';

        let statusCondition = "AND posts.status = 'published'";
        let params = [currentUserId, currentUserId, userId];

        if (status === 'draft') {
            if (!isSelf) {
                return res.status(403).json({ error: 'You cannot view another user\'s drafts.' });
            }
            statusCondition = "AND posts.status = 'draft'";
        } else if (status === 'all' && isSelf) {
            statusCondition = "";
        } else if (status === 'published') {
            statusCondition = "AND posts.status = 'published'";
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
                (SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = posts.id AND bookmarks.user_id = ?) as is_bookmarked_by_me
             FROM posts
             JOIN users ON posts.user_id = users.id
             WHERE posts.user_id = ? ${statusCondition}
             ORDER BY posts.created_at DESC`,
            params
        );

        res.json({
            posts: posts.map(p => ({
                ...p,
                is_liked_by_me: Boolean(p.is_liked_by_me),
                is_bookmarked_by_me: Boolean(p.is_bookmarked_by_me)
            }))
        });
    } catch (err) {
        console.error('Fetch user posts error:', err);
        res.status(500).json({ error: 'Failed to fetch user posts.' });
    }
});

// Follow User
router.post('/:id/follow', authenticateToken, async (req, res) => {
    try {
        const followingId = parseInt(req.params.id);
        const followerId = req.user.id;

        if (followerId === followingId) {
            return res.status(400).json({ error: 'You cannot follow yourself.' });
        }

        const targetUser = await dbAsync.get('SELECT id FROM users WHERE id = ?', [followingId]);
        if (!targetUser) {
            return res.status(404).json({ error: 'User to follow not found.' });
        }

        const existingFollow = await dbAsync.get(
            'SELECT * FROM followers WHERE follower_id = ? AND following_id = ?',
            [followerId, followingId]
        );

        if (!existingFollow) {
            await dbAsync.run(
                'INSERT INTO followers (follower_id, following_id) VALUES (?, ?)',
                [followerId, followingId]
            );

            // Add notification
            await dbAsync.run(
                'INSERT INTO notifications (user_id, sender_id, type) VALUES (?, ?, ?)',
                [followingId, followerId, 'follow']
            );
        }

        const targetFollowers = await dbAsync.get(
            'SELECT COUNT(*) as count FROM followers WHERE following_id = ?',
            [followingId]
        );
        const targetFollowing = await dbAsync.get(
            'SELECT COUNT(*) as count FROM followers WHERE follower_id = ?',
            [followingId]
        );
        const myFollowers = await dbAsync.get(
            'SELECT COUNT(*) as count FROM followers WHERE following_id = ?',
            [followerId]
        );
        const myFollowing = await dbAsync.get(
            'SELECT COUNT(*) as count FROM followers WHERE follower_id = ?',
            [followerId]
        );

        res.json({
            is_following: true,
            followers_count: targetFollowers ? targetFollowers.count : 0,
            following_count: targetFollowing ? targetFollowing.count : 0,
            my_followers_count: myFollowers ? myFollowers.count : 0,
            my_following_count: myFollowing ? myFollowing.count : 0,
            message: 'You are now following this user.'
        });
    } catch (err) {
        console.error('Follow user error:', err);
        res.status(500).json({ error: 'Failed to follow user.' });
    }
});

// Unfollow User
router.delete('/:id/follow', authenticateToken, async (req, res) => {
    try {
        const followingId = parseInt(req.params.id);
        const followerId = req.user.id;

        await dbAsync.run(
            'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
            [followerId, followingId]
        );

        const targetFollowers = await dbAsync.get(
            'SELECT COUNT(*) as count FROM followers WHERE following_id = ?',
            [followingId]
        );
        const targetFollowing = await dbAsync.get(
            'SELECT COUNT(*) as count FROM followers WHERE follower_id = ?',
            [followingId]
        );
        const myFollowers = await dbAsync.get(
            'SELECT COUNT(*) as count FROM followers WHERE following_id = ?',
            [followerId]
        );
        const myFollowing = await dbAsync.get(
            'SELECT COUNT(*) as count FROM followers WHERE follower_id = ?',
            [followerId]
        );

        res.json({
            is_following: false,
            followers_count: targetFollowers ? targetFollowers.count : 0,
            following_count: targetFollowing ? targetFollowing.count : 0,
            my_followers_count: myFollowers ? myFollowers.count : 0,
            my_following_count: myFollowing ? myFollowing.count : 0,
            message: 'You have unfollowed this user.'
        });
    } catch (err) {
        console.error('Unfollow user error:', err);
        res.status(500).json({ error: 'Failed to unfollow user.' });
    }
});

// Get Followers of User
router.get('/:id/followers', optionalAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUserId = req.user ? req.user.id : 0;

        const followers = await dbAsync.all(
            `SELECT users.id, users.full_name, users.username, users.avatar_url, users.bio,
                    (SELECT COUNT(*) FROM followers f WHERE f.follower_id = ? AND f.following_id = users.id) as is_following
             FROM followers
             JOIN users ON followers.follower_id = users.id
             WHERE followers.following_id = ?`,
            [currentUserId, userId]
        );

        res.json({
            followers: followers.map(u => ({
                ...u,
                is_following: Boolean(u.is_following),
                is_self: u.id === currentUserId
            }))
        });
    } catch (err) {
        console.error('Fetch followers error:', err);
        res.status(500).json({ error: 'Failed to fetch followers.' });
    }
});

// Get Following of User
router.get('/:id/following', optionalAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUserId = req.user ? req.user.id : 0;

        const following = await dbAsync.all(
            `SELECT users.id, users.full_name, users.username, users.avatar_url, users.bio,
                    (SELECT COUNT(*) FROM followers f WHERE f.follower_id = ? AND f.following_id = users.id) as is_following
             FROM followers
             JOIN users ON followers.follower_id = users.id
             WHERE followers.follower_id = ?`,
            [currentUserId, userId]
        );

        res.json({
            following: following.map(u => ({
                ...u,
                is_following: Boolean(u.is_following),
                is_self: u.id === currentUserId
            }))
        });
    } catch (err) {
        console.error('Fetch following error:', err);
        res.status(500).json({ error: 'Failed to fetch following users.' });
    }
});

module.exports = router;
