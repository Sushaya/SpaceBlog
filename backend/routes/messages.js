const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

// Apply strict authentication to all direct messaging routes
router.use(authenticateToken);

// Get Total Unread Messages Count
router.get('/unread/count', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await dbAsync.get(
            'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
            [userId]
        );

        res.json({ unread_count: result ? result.count : 0 });
    } catch (err) {
        console.error('Fetch unread messages count error:', err);
        res.status(500).json({ error: 'Failed to fetch unread messages count.' });
    }
});

// Get Conversations List
router.get('/conversations', async (req, res) => {
    try {
        const userId = req.user.id;

        // Query all distinct users with whom req.user.id has exchanged messages
        const partners = await dbAsync.all(
            `SELECT DISTINCT 
                CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as partner_id
             FROM messages
             WHERE sender_id = ? OR receiver_id = ?`,
            [userId, userId, userId]
        );

        const conversations = [];

        for (const p of partners) {
            const partnerId = p.partner_id;

            // Partner details
            const partner = await dbAsync.get(
                'SELECT id, full_name, username, avatar_url FROM users WHERE id = ?',
                [partnerId]
            );

            if (!partner) continue;

            // Latest message
            const lastMsg = await dbAsync.get(
                `SELECT message, attachment_url, attachment_type, created_at, sender_id 
                 FROM messages
                 WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
                 ORDER BY created_at DESC LIMIT 1`,
                [userId, partnerId, partnerId, userId]
            );

            // Unread count from this partner
            const unread = await dbAsync.get(
                'SELECT COUNT(*) as count FROM messages WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
                [partnerId, userId]
            );

            let previewText = lastMsg ? (lastMsg.message || '') : '';
            if (!previewText && lastMsg && lastMsg.attachment_type) {
                if (lastMsg.attachment_type === 'image') previewText = '📷 Photo';
                else if (lastMsg.attachment_type === 'video') previewText = '🎥 Video';
                else previewText = '📎 File';
            }

            conversations.push({
                partner,
                last_message: previewText,
                last_message_time: lastMsg ? lastMsg.created_at : null,
                last_message_sender_id: lastMsg ? lastMsg.sender_id : null,
                unread_count: unread ? unread.count : 0
            });
        }

        // Sort by latest message time DESC
        conversations.sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0));

        res.json({ conversations });
    } catch (err) {
        console.error('Fetch conversations error:', err);
        res.status(500).json({ error: 'Failed to fetch conversations.' });
    }
});

// Get Messages History with a Specific User
router.get('/:user_id', async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = parseInt(req.params.user_id);

        if (isNaN(targetUserId)) {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        // Target user info
        const targetUser = await dbAsync.get(
            'SELECT id, full_name, username, avatar_url, bio FROM users WHERE id = ?',
            [targetUserId]
        );

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Mark incoming unread messages as read
        await dbAsync.run(
            'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?',
            [targetUserId, currentUserId]
        );

        // Fetch full chat transcript
        const messages = await dbAsync.all(
            `SELECT * FROM messages
             WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
             ORDER BY created_at ASC`,
            [currentUserId, targetUserId, targetUserId, currentUserId]
        );

        res.json({
            partner: targetUser,
            messages
        });
    } catch (err) {
        console.error('Fetch messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages transcript.' });
    }
});

// Send Direct Message to User (Supports Text & Media/File Attachments)
router.post('/:user_id', async (req, res) => {
    try {
        const senderId = req.user.id;
        const receiverId = parseInt(req.params.user_id);
        const { message, attachment_url, attachment_type } = req.body;

        if (senderId === receiverId) {
            return res.status(400).json({ error: 'You cannot send a message to yourself.' });
        }

        const cleanMsg = message ? message.trim() : '';
        const cleanAttachmentUrl = attachment_url ? attachment_url.trim() : null;
        const cleanAttachmentType = attachment_type ? attachment_type.trim() : null;

        if (!cleanMsg && !cleanAttachmentUrl) {
            return res.status(400).json({ error: 'Message content or attachment is required.' });
        }

        const receiver = await dbAsync.get('SELECT id FROM users WHERE id = ?', [receiverId]);
        if (!receiver) {
            return res.status(404).json({ error: 'Message recipient user not found.' });
        }

        const result = await dbAsync.run(
            'INSERT INTO messages (sender_id, receiver_id, message, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?)',
            [senderId, receiverId, cleanMsg, cleanAttachmentUrl, cleanAttachmentType]
        );

        // Create notification for receiver
        await dbAsync.run(
            'INSERT INTO notifications (user_id, sender_id, type) VALUES (?, ?, ?)',
            [receiverId, senderId, 'message']
        );

        const newMsg = await dbAsync.get('SELECT * FROM messages WHERE id = ?', [result.id]);

        res.status(201).json({
            message: 'Message sent successfully!',
            data: newMsg
        });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Failed to send message.' });
    }
});

// Clear / Delete Conversation History with User
router.delete('/:user_id', async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = parseInt(req.params.user_id);

        await dbAsync.run(
            'DELETE FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
            [currentUserId, targetUserId, targetUserId, currentUserId]
        );

        res.json({ message: 'Conversation cleared successfully.' });
    } catch (err) {
        console.error('Delete conversation error:', err);
        res.status(500).json({ error: 'Failed to delete conversation.' });
    }
});

module.exports = router;
