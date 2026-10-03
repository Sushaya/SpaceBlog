const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

// Submit Content / User Report
router.post('/', authenticateToken, async (req, res) => {
    try {
        const reporterId = req.user.id;
        const { target_type, target_id, reason, details = '' } = req.body;

        if (!target_type || !target_id || !reason) {
            return res.status(400).json({ error: 'Target type, target ID, and reason are required.' });
        }

        if (!['post', 'comment', 'user'].includes(target_type)) {
            return res.status(400).json({ error: 'Invalid report target type.' });
        }

        const validReasons = ['Spam', 'Harassment', 'Inappropriate Content', 'Copyright', 'Misleading Content', 'Other'];
        if (!validReasons.includes(reason)) {
            return res.status(400).json({ error: 'Invalid report reason.' });
        }

        const result = await dbAsync.run(
            `INSERT INTO reports (reporter_id, target_type, target_id, reason, details, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [reporterId, target_type, parseInt(target_id), reason, details.trim(), 'pending']
        );

        res.status(201).json({
            message: 'Thank you. Your report has been submitted to the moderation team.',
            report_id: result.id
        });
    } catch (err) {
        console.error('Submit report error:', err);
        res.status(500).json({ error: 'Failed to submit report.' });
    }
});

module.exports = router;
