const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const { dbAsync } = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

const sanitizeOptions = {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'code'],
    allowedAttributes: { 'a': ['href', 'target'] },
    allowedSchemes: ['http', 'https', 'mailto']
};

// Get Comments for a Post
router.get('/posts/:id/comments', async (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        const comments = await dbAsync.all(
            `SELECT 
                comments.*,
                users.full_name as author_name,
                users.username as author_username,
                users.avatar_url as author_avatar
             FROM comments
             JOIN users ON comments.user_id = users.id
             WHERE comments.post_id = ?
             ORDER BY comments.created_at ASC`,
            [postId]
        );

        // Organize into threaded hierarchy (parent & replies)
        const commentMap = {};
        const rootComments = [];

        comments.forEach(c => {
            commentMap[c.id] = { ...c, replies: [] };
        });

        comments.forEach(c => {
            if (c.parent_id && commentMap[c.parent_id]) {
                commentMap[c.parent_id].replies.push(commentMap[c.id]);
            } else {
                rootComments.push(commentMap[c.id]);
            }
        });

        res.json({
            comments: rootComments,
            total: comments.length
        });
    } catch (err) {
        console.error('Fetch comments error:', err);
        res.status(500).json({ error: 'Failed to fetch comments.' });
    }
});

// Add Comment to Post
router.post('/posts/:id/comments', authenticateToken, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const { content, parent_id } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Comment content cannot be empty.' });
        }

        const post = await dbAsync.get('SELECT id, user_id FROM posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        const validParentId = parent_id ? parseInt(parent_id) : null;
        const cleanContent = sanitizeHtml(content.trim(), sanitizeOptions);

        const result = await dbAsync.run(
            `INSERT INTO comments (post_id, user_id, content, parent_id)
             VALUES (?, ?, ?, ?)`,
            [postId, req.user.id, cleanContent, validParentId]
        );

        // Notify post author if not commenting on own post
        if (post.user_id !== req.user.id) {
            await dbAsync.run(
                'INSERT INTO notifications (user_id, sender_id, type, post_id) VALUES (?, ?, ?, ?)',
                [post.user_id, req.user.id, 'comment', postId]
            );
        }

        // Record comment activity log
        await dbAsync.run(
            'INSERT INTO user_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, req.user.username, 'create_comment', req.ip || '127.0.0.1']
        ).catch(() => {});

        const newComment = await dbAsync.get(
            `SELECT comments.*, users.full_name as author_name, users.username as author_username, users.avatar_url as author_avatar
             FROM comments JOIN users ON comments.user_id = users.id WHERE comments.id = ?`,
            [result.id]
        );

        res.status(201).json({
            message: 'Comment posted successfully!',
            comment: { ...newComment, replies: [] }
        });
    } catch (err) {
        console.error('Add comment error:', err);
        res.status(500).json({ error: 'Failed to add comment.' });
    }
});

// Delete Comment
router.delete('/comments/:id', authenticateToken, async (req, res) => {
    try {
        const commentId = parseInt(req.params.id);

        const comment = await dbAsync.get(
            `SELECT comments.*, posts.user_id as post_author_id 
             FROM comments 
             JOIN posts ON comments.post_id = posts.id 
             WHERE comments.id = ?`,
            [commentId]
        );

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found.' });
        }

        // Authorization: Comment author, Post author, or Admin can delete
        const isCommentAuthor = comment.user_id === req.user.id;
        const isPostAuthor = comment.post_author_id === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
            return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
        }

        await dbAsync.run('DELETE FROM comments WHERE id = ?', [commentId]);

        // Record comment deletion log
        await dbAsync.run(
            'INSERT INTO user_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, req.user.username, 'delete_comment', req.ip || '127.0.0.1']
        ).catch(() => {});

        res.json({ message: 'Comment deleted successfully.' });
    } catch (err) {
        console.error('Delete comment error:', err);
        res.status(500).json({ error: 'Failed to delete comment.' });
    }
});

module.exports = router;
