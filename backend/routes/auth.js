const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbAsync } = require('../database/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Register New User
router.post('/register', async (req, res) => {
    try {
        const { full_name, username, email, password, confirm_password } = req.body;

        // Validations
        if (!full_name || !username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        if (password !== confirm_password) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        // Check duplicate email or username
        const existingUser = await dbAsync.get(
            'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
            [username.toLowerCase(), email.toLowerCase()]
        );

        if (existingUser) {
            if (existingUser.username.toLowerCase() === username.toLowerCase()) {
                return res.status(400).json({ error: 'Username is already taken.' });
            }
            if (existingUser.email.toLowerCase() === email.toLowerCase()) {
                return res.status(400).json({ error: 'Email address is already registered.' });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(full_name)}`;

        // Insert user
        const result = await dbAsync.run(
            `INSERT INTO users (full_name, username, email, password, avatar_url, role)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [full_name.trim(), username.toLowerCase().trim(), email.toLowerCase().trim(), hashedPassword, avatarUrl, 'user']
        );

        const newUser = {
            id: result.id,
            full_name: full_name.trim(),
            username: username.toLowerCase().trim(),
            email: email.toLowerCase().trim(),
            role: 'user',
            avatar_url: avatarUrl,
            bio: '',
            created_at: new Date().toISOString()
        };

        // Record register activity log
        const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
        await dbAsync.run(
            'INSERT INTO user_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)',
            [newUser.id, newUser.username, 'register', clientIp]
        ).catch(() => {});

        // Create JWT token
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Registration successful!',
            token,
            user: newUser
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { credential, password } = req.body;

        if (!credential || !password) {
            return res.status(400).json({ error: 'Email/Username and Password are required.' });
        }

        const input = credential.toLowerCase().trim();

        // Find user by email or username
        const user = await dbAsync.get(
            'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?',
            [input, input]
        );

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials. User not found.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Record login activity log
        const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
        await dbAsync.run(
            'INSERT INTO user_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)',
            [user.id, user.username, 'login', clientIp]
        ).catch(() => {});

        // Sanitize password from response
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Login successful!',
            token,
            user: userWithoutPassword
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});

// Logout User Logging
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
        await dbAsync.run(
            'INSERT INTO user_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, req.user.username, 'logout', clientIp]
        );

        res.json({ message: 'Logout activity logged.' });
    } catch (err) {
        console.error('Logout logging error:', err);
        res.status(500).json({ error: 'Failed to record logout log.' });
    }
});

// Get Current Logged-in User Profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await dbAsync.get(
            'SELECT id, full_name, username, email, bio, avatar_url, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'User profile not found.' });
        }

        res.json({ user });
    } catch (err) {
        console.error('Auth /me error:', err);
        res.status(500).json({ error: 'Failed to fetch current user.' });
    }
});

module.exports = router;
