const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

// Block / Unblock User
router.post('/block/:id', authenticateToken, async (req, res) => {
    try {
        const blockerId = req.user.id;
        const blockedId = parseInt(req.params.id);

        if (blockerId === blockedId) {
            return res.status(400).json({ error: 'You cannot block yourself.' });
        }

        const existingBlock = await dbAsync.get(
            'SELECT * FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
            [blockerId, blockedId]
        );

        let blocked = false;
        if (existingBlock) {
            await dbAsync.run('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [blockerId, blockedId]);
            blocked = false;
        } else {
            await dbAsync.run('INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)', [blockerId, blockedId]);
            // Remove follow relationships if blocked
            await dbAsync.run('DELETE FROM followers WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)', [blockerId, blockedId, blockedId, blockerId]);
            blocked = true;
        }

        res.json({
            blocked,
            message: blocked ? 'User blocked successfully.' : 'User unblocked.'
        });
    } catch (err) {
        console.error('Block user error:', err);
        res.status(500).json({ error: 'Failed to process block request.' });
    }
});

// Mute / Unmute User
router.post('/mute/:id', authenticateToken, async (req, res) => {
    try {
        const muterId = req.user.id;
        const mutedId = parseInt(req.params.id);

        if (muterId === mutedId) {
            return res.status(400).json({ error: 'You cannot mute yourself.' });
        }

        const existingMute = await dbAsync.get(
            'SELECT * FROM mutes WHERE muter_id = ? AND muted_id = ?',
            [muterId, mutedId]
        );

        let muted = false;
        if (existingMute) {
            await dbAsync.run('DELETE FROM mutes WHERE muter_id = ? AND muted_id = ?', [muterId, mutedId]);
            muted = false;
        } else {
            await dbAsync.run('INSERT INTO mutes (muter_id, muted_id) VALUES (?, ?)', [muterId, mutedId]);
            muted = true;
        }

        res.json({
            muted,
            message: muted ? 'User muted.' : 'User unmuted.'
        });
    } catch (err) {
        console.error('Mute user error:', err);
        res.status(500).json({ error: 'Failed to process mute request.' });
    }
});

module.exports = router;
