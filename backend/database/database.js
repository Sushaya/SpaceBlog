const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbPath;
if (process.env.VERCEL) {
    dbPath = '/tmp/blogspace.db';
    const seedPath = path.join(__dirname, '../../database/blogspace.db');
    if (!fs.existsSync(dbPath) && fs.existsSync(seedPath)) {
        try {
            fs.copyFileSync(seedPath, dbPath);
            console.log('Copied initial SQLite seed database to /tmp/blogspace.db for Vercel.');
        } catch (e) {
            console.error('Failed copying database seed to /tmp:', e.message);
        }
    }
} else {
    dbPath = process.env.DB_PATH 
        ? path.resolve(__dirname, '..', process.env.DB_PATH)
        : path.join(__dirname, '../../database/blogspace.db');
}

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log(`Connected to SQLite database at ${dbPath}`);
    }
});

// Enable foreign keys safely
try {
    db.run('PRAGMA foreign_keys = ON');
} catch (e) {
    console.warn('PRAGMA foreign_keys warning:', e.message);
}

// Promisified DB helper methods
const dbAsync = {
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }
};

// Initialize schema and seed data
async function initDatabase() {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const statements = schemaSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            await dbAsync.run(statement);
        }
        console.log('Database schema verified/created successfully.');
    }

    // Run safe column migrations for existing databases
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN cover_url TEXT DEFAULT ""'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN is_suspended INTEGER DEFAULT 0'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN suspension_reason TEXT DEFAULT ""'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN profession TEXT DEFAULT ""'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN location TEXT DEFAULT ""'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN website TEXT DEFAULT ""'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN social_links TEXT DEFAULT "{}"'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN skills TEXT DEFAULT ""'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN education TEXT DEFAULT ""'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN privacy_profile TEXT DEFAULT "public"'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE users ADD COLUMN privacy_messages TEXT DEFAULT "everyone"'); } catch (e) {}

    try { await dbAsync.run('ALTER TABLE posts ADD COLUMN community_id INTEGER DEFAULT NULL'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT "public"'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE posts ADD COLUMN scheduled_at DATETIME DEFAULT NULL'); } catch (e) {}

    try { await dbAsync.run('ALTER TABLE bookmarks ADD COLUMN collection_id INTEGER DEFAULT NULL'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE messages ADD COLUMN attachment_url TEXT DEFAULT NULL'); } catch (e) {}
    try { await dbAsync.run('ALTER TABLE messages ADD COLUMN attachment_type TEXT DEFAULT NULL'); } catch (e) {}

    // Seed initial demo data
    await seedInitialData();
}

async function seedInitialData() {
    try {
        const userCount = await dbAsync.get('SELECT COUNT(*) as count FROM users');
        if (userCount.count === 0) {
            console.log('Seeding initial demo data...');
            const hashedPassword = await bcrypt.hash('Password123!', 10);

            // Create admin user
            const admin = await dbAsync.run(
                `INSERT INTO users (full_name, username, email, password, bio, avatar_url, cover_url, role, is_verified, profession, location) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    'BlogSpace Admin',
                    'admin',
                    'admin@blogspace.com',
                    hashedPassword,
                    'Official administrator and content moderator of BlogSpace.',
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
                    'admin',
                    1,
                    'Platform Administrator',
                    'Mumbai, India'
                ]
            );

            // Create regular sample users
            const user1 = await dbAsync.run(
                `INSERT INTO users (full_name, username, email, password, bio, avatar_url, cover_url, role, is_verified, profession, location, skills) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    'Alex Rivera',
                    'alexrivera',
                    'alex@example.com',
                    hashedPassword,
                    'Full-stack developer, UI designer, and tech blogger. Passionate about Web3, AI, and clean code.',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
                    'user',
                    1,
                    'Senior Software Engineer',
                    'San Francisco, CA',
                    'JavaScript, Node.js, React, Express, SQLite, Python'
                ]
            );

            const user2 = await dbAsync.run(
                `INSERT INTO users (full_name, username, email, password, bio, avatar_url, cover_url, role, is_verified, profession, location, skills) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    'Sarah Jenkins',
                    'sarahj',
                    'sarah@example.com',
                    hashedPassword,
                    'Digital nomad, photographer, and travel writer exploring the world one city at a time.',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&auto=format&fit=crop&q=80',
                    'user',
                    0,
                    'Travel Journalist & Photographer',
                    'London, UK',
                    'Photography, Writing, Editing, Lightroom'
                ]
            );

            // Sample Communities
            const comm1 = await dbAsync.run(
                `INSERT INTO communities (creator_id, name, slug, description, icon_url, rules)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    user1.id,
                    'Technology & AI',
                    'technology-ai',
                    'A community for discussing the latest advances in software engineering, AI agents, and web technologies.',
                    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80',
                    '1. Be respectful\n2. Share technical & educational content\n3. No spam'
                ]
            );

            const comm2 = await dbAsync.run(
                `INSERT INTO communities (creator_id, name, slug, description, icon_url, rules)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    user2.id,
                    'Creative Photography',
                    'creative-photography',
                    'Share architectural, landscape, and street photography tips, gear reviews, and photo stories.',
                    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=150&auto=format&fit=crop&q=80',
                    '1. Credit photo authors\n2. High quality image submissions only'
                ]
            );

            // Community members
            await dbAsync.run(`INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, ?)`, [comm1.id, user1.id, 'admin']);
            await dbAsync.run(`INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, ?)`, [comm1.id, user2.id, 'member']);
            await dbAsync.run(`INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, ?)`, [comm2.id, user2.id, 'admin']);

            // Sample Posts
            const post1 = await dbAsync.run(
                `INSERT INTO posts (user_id, community_id, title, content, summary, category, cover_image, tags, status, views)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    user1.id,
                    comm1.id,
                    'The Future of Modern Web Development in 2026',
                    `<h2>Introduction</h2><p>Modern web development has evolved at a breakneck speed over the past few years. From server-driven components to AI-assisted coding tools, the browser ecosystem has never been more vibrant.</p><h3>Key Trends to Watch</h3><ul><li><strong>Edge Computing:</strong> Moving execution closer to users for sub-millisecond response times.</li><li><strong>AI Integration:</strong> Intelligent agentic tools transforming developer productivity.</li><li><strong>Native Web APIs:</strong> Embracing modern CSS container queries, <code>:has()</code> selectors, and View Transitions.</li></ul><blockquote>"The best code is no code, but the second best is clean, accessible, and maintainable code."</blockquote><p>As developers, maintaining focus on performance, accessibility (a11y), and developer experience will remain paramount as we navigate this exciting era.</p>`,
                    'Explore the latest trends, frameworks, and architectural paradigms shaping web development in 2026.',
                    'Technology',
                    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
                    'webdev,javascript,tech,ai',
                    'published',
                    12480
                ]
            );

            const post2 = await dbAsync.run(
                `INSERT INTO posts (user_id, community_id, title, content, summary, category, cover_image, tags, status, views)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    user2.id,
                    comm2.id,
                    '10 Essential Tips for Capturing Stunning Architectural Photography',
                    `<h2>Mastering Light & Structure</h2><p>Architectural photography is about understanding how light interacts with geometric forms. Whether shooting historic cathedrals or modern skyscrapers, structure tells a story.</p><h3>1. Golden Hour vs. Blue Hour</h3><p>Golden hour brings warm, dramatic shadows that highlight building textures. Blue hour, on the other hand, creates stunning contrast between warm interior lights and cool atmospheric skies.</p><h3>2. Perspective Correction</h3><p>Avoid converging verticals by using tilt-shift lenses or post-processing perspective adjustments.</p><blockquote>"Architecture is frozen music. Photography is how we capture its rhythm."</blockquote>`,
                    'Discover expert techniques for composition, lighting, and camera settings in architectural photography.',
                    'Photography',
                    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
                    'photography,travel,art,design',
                    'published',
                    5420
                ]
            );

            const post3 = await dbAsync.run(
                `INSERT INTO posts (user_id, community_id, title, content, summary, category, cover_image, tags, status, views)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    user1.id,
                    comm1.id,
                    'Building High-Performance REST APIs with Node.js and SQLite',
                    `<h2>Why SQLite for Modern Applications?</h2><p>SQLite is often underestimated. With proper WAL mode and indexed schemas, SQLite can handle thousands of requests per second with microsecond query latencies and zero setup overhead.</p><h3>Best Practices</h3><ul><li>Use foreign key constraints strictly.</li><li>Index high-frequency query fields like <code>user_id</code> and <code>created_at</code>.</li><li>Keep query parameters sanitized using prepared statements.</li></ul>`,
                    'Learn how to leverage SQLite and Express.js to build blistering fast, zero-configuration RESTful backends.',
                    'Programming',
                    'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&auto=format&fit=crop&q=80',
                    'nodejs,sqlite,backend,api',
                    'published',
                    8910
                ]
            );

            // Sample Stories (24h expiring)
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            await dbAsync.run(
                `INSERT INTO stories (user_id, image_url, text_overlay, bg_color, expires_at) VALUES (?, ?, ?, ?, ?)`,
                [user1.id, 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=80', 'Coding late night 💻 #webdev', '#1e1b4b', tomorrow]
            );
            await dbAsync.run(
                `INSERT INTO stories (user_id, image_url, text_overlay, bg_color, expires_at) VALUES (?, ?, ?, ?, ?)`,
                [user2.id, 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop&q=80', 'Golden hour in London 🌆', '#831843', tomorrow]
            );

            // Sample Short Video / Reels
            await dbAsync.run(
                `INSERT INTO reels (user_id, video_url, thumbnail_url, caption, hashtags, views) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    user1.id,
                    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=80',
                    'Quick tip: How to optimize SQLite indexes for speed ⚡',
                    'coding,tech,tips',
                    1420
                ]
            );
            await dbAsync.run(
                `INSERT INTO reels (user_id, video_url, thumbnail_url, caption, hashtags, views) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    user2.id,
                    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&auto=format&fit=crop&q=80',
                    'Behind the scenes of architectural photography 📸',
                    'photography,travel,art',
                    2150
                ]
            );

            // Sample Bookmark Collections
            const col1 = await dbAsync.run(
                `INSERT INTO bookmark_collections (user_id, name, description) VALUES (?, ?, ?)`,
                [user1.id, 'Programming & Tech', 'Best technical tutorials and guide articles']
            );

            // Sample Likes, Bookmarks, Followers
            await dbAsync.run(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [user1.id, post2.id]);
            await dbAsync.run(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [user2.id, post1.id]);
            await dbAsync.run(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [user2.id, post3.id]);
            await dbAsync.run(`INSERT INTO bookmarks (user_id, post_id, collection_id) VALUES (?, ?, ?)`, [user1.id, post2.id, col1.id]);

            await dbAsync.run(`INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`, [user1.id, user2.id]);
            await dbAsync.run(`INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`, [user2.id, user1.id]);

            // Sample Post Views for Analytics (time series simulation)
            for (let i = 0; i < 15; i++) {
                await dbAsync.run(`INSERT INTO post_views (post_id, viewer_id) VALUES (?, ?)`, [post1.id, user2.id]);
            }

            // Sample Audit Log
            await dbAsync.run(
                `INSERT INTO audit_logs (admin_id, admin_username, action, target, details) VALUES (?, ?, ?, ?, ?)`,
                [admin.id, 'admin', 'verified_user', 'alexrivera', 'Assigned verified badge to Alex Rivera']
            );

            console.log('Demo data successfully seeded with Stories, Reels, Communities & Analytics.');
        }
    } catch (err) {
        console.error('Error seeding data:', err);
    }
}

// Call database initialization safely without crashing serverless module imports
initDatabase().catch(err => {
    console.error('Database initialization warning (non-fatal):', err ? (err.message || err) : err);
});

module.exports = {
    db,
    dbAsync
};
