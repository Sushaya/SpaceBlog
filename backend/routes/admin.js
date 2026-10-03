const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply admin authentication to all routes in this file
router.use(authenticateToken, requireAdmin);

// Dashboard Overview Statistics
router.get('/stats', async (req, res) => {
    try {
        const usersCount = await dbAsync.get('SELECT COUNT(*) as count FROM users');
        const postsCount = await dbAsync.get('SELECT COUNT(*) as count FROM posts');
        const commentsCount = await dbAsync.get('SELECT COUNT(*) as count FROM comments');
        const likesCount = await dbAsync.get('SELECT COUNT(*) as count FROM likes');
        const logsCount = await dbAsync.get('SELECT COUNT(*) as count FROM user_logs');
        const reportsCount = await dbAsync.get('SELECT COUNT(*) as count FROM reports WHERE status = "pending"');

        res.json({
            stats: {
                total_users: usersCount ? usersCount.count : 0,
                total_posts: postsCount ? postsCount.count : 0,
                total_comments: commentsCount ? commentsCount.count : 0,
                total_likes: likesCount ? likesCount.count : 0,
                total_logs: logsCount ? logsCount.count : 0,
                pending_reports: reportsCount ? reportsCount.count : 0
            }
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ error: 'Failed to fetch admin stats.' });
    }
});

// View User Login / Logout Activity Logs
const fetchActivityLogsHandler = async (req, res) => {
    try {
        const logs = await dbAsync.all(
            `SELECT 
                user_logs.*,
                users.full_name,
                users.avatar_url,
                users.email
             FROM user_logs
             LEFT JOIN users ON user_logs.user_id = users.id
             ORDER BY user_logs.created_at DESC
             LIMIT 100`
        );
        res.json({ logs });
    } catch (err) {
        console.error('Admin fetch logs error:', err);
        res.status(500).json({ error: 'Failed to fetch user activity logs.' });
    }
};

router.get('/logs', fetchActivityLogsHandler);
router.get('/user-logs', fetchActivityLogsHandler);

// View All Users
router.get('/users', async (req, res) => {
    try {
        const users = await dbAsync.all(
            `SELECT id, full_name, username, email, role, avatar_url, created_at,
                    (SELECT COUNT(*) FROM posts WHERE posts.user_id = users.id) as post_count
             FROM users
             ORDER BY created_at DESC`
        );
        res.json({ users });
    } catch (err) {
        console.error('Admin fetch users error:', err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// View All Posts
router.get('/posts', async (req, res) => {
    try {
        const posts = await dbAsync.all(
            `SELECT posts.*, users.full_name as author_name, users.username as author_username,
                    (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as likes_count,
                    (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comments_count
             FROM posts
             JOIN users ON posts.user_id = users.id
             ORDER BY posts.created_at DESC`
        );
        res.json({ posts });
    } catch (err) {
        console.error('Admin fetch posts error:', err);
        res.status(500).json({ error: 'Failed to fetch posts.' });
    }
});

// View All Comments
router.get('/comments', async (req, res) => {
    try {
        const comments = await dbAsync.all(
            `SELECT comments.*, users.full_name as author_name, users.username as author_username, posts.title as post_title
             FROM comments
             JOIN users ON comments.user_id = users.id
             JOIN posts ON comments.post_id = posts.id
             ORDER BY comments.created_at DESC`
        );
        res.json({ comments });
    } catch (err) {
        console.error('Admin fetch comments error:', err);
        res.status(500).json({ error: 'Failed to fetch comments.' });
    }
});

// View All Reports / Moderation Flags
router.get('/reports', async (req, res) => {
    try {
        const reports = await dbAsync.all(
            `SELECT reports.*, users.full_name as reporter_name, users.username as reporter_username
             FROM reports
             JOIN users ON reports.reporter_id = users.id
             ORDER BY reports.created_at DESC`
        );
        res.json({ reports });
    } catch (err) {
        console.error('Admin fetch reports error:', err);
        res.status(500).json({ error: 'Failed to fetch moderation reports.' });
    }
});

// Update Report Status
router.put('/reports/:id', async (req, res) => {
    try {
        const reportId = parseInt(req.params.id);
        const { status } = req.body;

        if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid report status specified.' });
        }

        await dbAsync.run(
            'UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, reportId]
        );

        res.json({ message: `Report status updated to ${status}.` });
    } catch (err) {
        console.error('Admin update report error:', err);
        res.status(500).json({ error: 'Failed to update report status.' });
    }
});

// Toggle/Change User Role (user <-> admin)
router.put('/users/:id/role', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;

        if (userId === req.user.id) {
            return res.status(400).json({ error: 'You cannot change your own admin role.' });
        }

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role specified.' });
        }

        await dbAsync.run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
        res.json({ message: `User role updated to ${role}.` });
    } catch (err) {
        console.error('Admin update user role error:', err);
        res.status(500).json({ error: 'Failed to update user role.' });
    }
});

// Delete User
router.delete('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (userId === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own admin account.' });
        }

        await dbAsync.run('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Admin delete user error:', err);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

// Delete Post
router.delete('/posts/:id', async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        await dbAsync.run('DELETE FROM posts WHERE id = ?', [postId]);
        res.json({ message: 'Post deleted successfully by admin.' });
    } catch (err) {
        console.error('Admin delete post error:', err);
        res.status(500).json({ error: 'Failed to delete post.' });
    }
});

// Delete Comment
router.delete('/comments/:id', async (req, res) => {
    try {
        const commentId = parseInt(req.params.id);
        await dbAsync.run('DELETE FROM comments WHERE id = ?', [commentId]);
        res.json({ message: 'Comment deleted successfully by admin.' });
    } catch (err) {
        console.error('Admin delete comment error:', err);
        res.status(500).json({ error: 'Failed to delete comment.' });
    }
});

module.exports = router;
