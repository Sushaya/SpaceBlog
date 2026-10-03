const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const { dbAsync } = require('../database/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Sanitize HTML helper options for rich text blog posts
const sanitizeOptions = {
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
        'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
        'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'iframe', 'img', 'span'
    ],
    allowedAttributes: {
        'a': ['href', 'name', 'target', 'rel'],
        'img': ['src', 'alt', 'title', 'width', 'height', 'loading', 'class'],
        '*': ['class', 'style']
    },
    allowedSchemes: ['http', 'https', 'data', 'mailto']
};

// Get All Posts (with filters, search, sorting, pagination, following feed, and bookmarks)
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { category, search, tag, author_id, feed, sort = 'latest', page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        let whereClauses = ["posts.status = 'published'"];
        let params = [];

        if (category && category !== 'All') {
            whereClauses.push("LOWER(posts.category) = LOWER(?)");
            params.push(category);
        }

        if (tag) {
            whereClauses.push("posts.tags LIKE ?");
            params.push(`%${tag}%`);
        }

        if (author_id) {
            whereClauses.push("posts.user_id = ?");
            params.push(author_id);
        }

        if (search) {
            const searchTerm = `%${search.toLowerCase()}%`;
            whereClauses.push("(LOWER(posts.title) LIKE ? OR LOWER(posts.content) LIKE ? OR LOWER(posts.summary) LIKE ? OR LOWER(users.username) LIKE ?)");
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // If following feed requested and user is logged in
        if (feed === 'following' && req.user) {
            whereClauses.push("posts.user_id IN (SELECT following_id FROM followers WHERE follower_id = ?)");
            params.push(req.user.id);
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Order clause
        let orderBy = "posts.created_at DESC";
        if (sort === 'most_liked' || sort === 'popular') {
            orderBy = "likes_count DESC, posts.created_at DESC";
        } else if (sort === 'most_commented') {
            orderBy = "comments_count DESC, posts.created_at DESC";
        } else if (sort === 'oldest') {
            orderBy = "posts.created_at ASC";
        }

        const currentUserId = req.user ? req.user.id : 0;

        const postsQuery = `
            SELECT 
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
            ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;

        const queryParams = [currentUserId, currentUserId, ...params, limitNum, offset];
        const posts = await dbAsync.all(postsQuery, queryParams);

        // Count total matching posts for pagination
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM posts 
            JOIN users ON posts.user_id = users.id
            ${whereSql}
        `;
        const countResult = await dbAsync.get(countQuery, params);
        const total = countResult ? countResult.total : 0;

        // Process boolean flags
        const formattedPosts = posts.map(post => ({
            ...post,
            is_liked_by_me: Boolean(post.is_liked_by_me),
            is_bookmarked_by_me: Boolean(post.is_bookmarked_by_me)
        }));

        res.json({
            posts: formattedPosts,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (err) {
        console.error('Fetch posts error:', err);
        res.status(500).json({ error: 'Failed to fetch posts.' });
    }
});

// Get Single Post by ID
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID.' });
        }

        const currentUserId = req.user ? req.user.id : 0;

        const post = await dbAsync.get(
            `SELECT 
                posts.*,
                users.full_name as author_name,
                users.username as author_username,
                users.avatar_url as author_avatar,
                users.bio as author_bio,
                (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comments_count,
                (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as is_liked_by_me,
                (SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = posts.id AND bookmarks.user_id = ?) as is_bookmarked_by_me,
                (SELECT COUNT(*) FROM followers WHERE follower_id = ? AND following_id = posts.user_id) as is_following_author
             FROM posts
             JOIN users ON posts.user_id = users.id
             WHERE posts.id = ?`,
            [currentUserId, currentUserId, currentUserId, postId]
        );

        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        // Increment view count asynchronously
        dbAsync.run('UPDATE posts SET views = views + 1 WHERE id = ?', [postId]).catch(() => {});

        res.json({
            post: {
                ...post,
                is_liked_by_me: Boolean(post.is_liked_by_me),
                is_bookmarked_by_me: Boolean(post.is_bookmarked_by_me),
                is_following_author: Boolean(post.is_following_author)
            }
        });
    } catch (err) {
        console.error('Fetch single post error:', err);
        res.status(500).json({ error: 'Failed to fetch post details.' });
    }
});

// Create Blog Post
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, content, summary, category, cover_image, tags, status = 'published' } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Post title is required.' });
        }
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Post content is required.' });
        }

        const cleanContent = sanitizeHtml(content.trim(), sanitizeOptions);
        const postSummary = summary && summary.trim() 
            ? sanitizeHtml(summary.trim(), { allowedTags: [], allowedAttributes: {} })
            : cleanContent.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...';

        const postCategory = category || 'Technology';
        const coverImg = cover_image && cover_image.trim() 
            ? cover_image.trim() 
            : 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80';

        const result = await dbAsync.run(
            `INSERT INTO posts (user_id, title, content, summary, category, cover_image, tags, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, title.trim(), cleanContent, postSummary, postCategory, coverImg, tags || '', status]
        );

        // Record user log action
        await dbAsync.run(
            'INSERT INTO user_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, req.user.username, 'create_post', req.ip || '127.0.0.1']
        ).catch(() => {});

        const newPost = await dbAsync.get(
            `SELECT posts.*, users.full_name as author_name, users.username as author_username, users.avatar_url as author_avatar
             FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id = ?`,
            [result.id]
        );

        res.status(201).json({
            message: status === 'draft' ? 'Draft saved successfully!' : 'Post published successfully!',
            post: newPost
        });
    } catch (err) {
        console.error('Create post error:', err);
        res.status(500).json({ error: 'Failed to create post.' });
    }
});

// Update Blog Post
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const { title, content, summary, category, cover_image, tags, status } = req.body;

        const existingPost = await dbAsync.get('SELECT * FROM posts WHERE id = ?', [postId]);
        if (!existingPost) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        // Check ownership or admin status
        if (existingPost.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only edit your own posts.' });
        }

        const updatedTitle = title !== undefined ? title.trim() : existingPost.title;
        const updatedContent = content !== undefined ? sanitizeHtml(content.trim(), sanitizeOptions) : existingPost.content;
        const updatedSummary = summary !== undefined 
            ? sanitizeHtml(summary.trim(), { allowedTags: [], allowedAttributes: {} }) 
            : existingPost.summary;
        const updatedCategory = category !== undefined ? category : existingPost.category;
        const updatedCover = cover_image !== undefined ? cover_image : existingPost.cover_image;
        const updatedTags = tags !== undefined ? tags : existingPost.tags;
        const updatedStatus = status !== undefined ? status : existingPost.status;

        await dbAsync.run(
            `UPDATE posts 
             SET title = ?, content = ?, summary = ?, category = ?, cover_image = ?, tags = ?, status = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [updatedTitle, updatedContent, updatedSummary, updatedCategory, updatedCover, updatedTags, updatedStatus, postId]
        );

        // Record update post user log
        await dbAsync.run(
            'INSERT INTO user_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, req.user.username, 'update_post', req.ip || '127.0.0.1']
        ).catch(() => {});

        const updatedPost = await dbAsync.get(
            `SELECT posts.*, users.full_name as author_name, users.username as author_username, users.avatar_url as author_avatar
             FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id = ?`,
            [postId]
        );

        res.json({
            message: 'Post updated successfully!',
            post: updatedPost
        });
    } catch (err) {
        console.error('Update post error:', err);
        res.status(500).json({ error: 'Failed to update post.' });
    }
});

// Delete Blog Post
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const existingPost = await dbAsync.get('SELECT * FROM posts WHERE id = ?', [postId]);

        if (!existingPost) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        if (existingPost.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only delete your own posts.' });
        }

        await dbAsync.run('DELETE FROM posts WHERE id = ?', [postId]);

        // Record delete post user log
        await dbAsync.run(
            'INSERT INTO user_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, req.user.username, 'delete_post', req.ip || '127.0.0.1']
        ).catch(() => {});

        res.json({ message: 'Post deleted successfully.' });
    } catch (err) {
        console.error('Delete post error:', err);
        res.status(500).json({ error: 'Failed to delete post.' });
    }
});

module.exports = router;
