import sqlite3

db_path = r'C:\Users\ACER\.gemini\antigravity\scratch\blogspace\database\blogspace.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, username FROM users WHERE username = 'sushaya'")
row = cursor.fetchone()

if row:
    user_id = row[0]
    print(f"Found user 'sushaya' with ID: {user_id}")

    # Published Post 1
    cursor.execute('''
        INSERT INTO posts (user_id, title, content, summary, category, cover_image, tags, status, views)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        user_id,
        'Welcome to BlogSpace: Building Full-Stack Apps with Node.js and SQLite3',
        '<h2>Welcome to my official blog!</h2><p>BlogSpace is a modern, high-performance social blogging and direct messaging platform built with Node.js, Express.js, SQLite3, HTML5, CSS3, and Vanilla JavaScript.</p><h3>Key Highlights</h3><ul><li>Zero-dependency client-side architecture</li><li>Real-time direct messaging with file attachments</li><li>Stateless JWT authentication & Bcrypt security</li></ul>',
        'An introductory article showcasing the architecture and capabilities of the BlogSpace platform.',
        'Technology',
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
        'blogspace,nodejs,sqlite,fullstack',
        'published',
        45
    ))

    # Published Post 2
    cursor.execute('''
        INSERT INTO posts (user_id, title, content, summary, category, cover_image, tags, status, views)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        user_id,
        'Mastering Direct Messaging & File Attachments in Express.js',
        '<h2>Building Real-Time DM Engines</h2><p>Direct messaging is an essential feature for modern content platforms. Learn how we built a secure, asynchronous file upload engine using Multer and Express.js.</p>',
        'A technical deep dive into implementing direct messaging with media file attachments in Express.js.',
        'Programming',
        'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&auto=format&fit=crop&q=80',
        'express,javascript,multer,backend',
        'published',
        82
    ))

    # Saved Draft Post
    cursor.execute('''
        INSERT INTO posts (user_id, title, content, summary, category, cover_image, tags, status, views)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        user_id,
        'Draft: Scalable Cloud Architecture with Vercel and Render',
        '<h2>Serverless vs Persistent Hosting</h2><p>Drafting insights on dual cloud deployment across Vercel Serverless Edge Cloud and Render Persistent Web Services...</p>',
        'Draft article exploring dual cloud deployment strategies.',
        'AI',
        'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80',
        'cloud,vercel,render,serverless',
        'draft',
        0
    ))

    conn.commit()
    print("Inserted sample posts for user 'sushaya' successfully!")

cursor.execute("SELECT id, user_id, title, status FROM posts WHERE user_id = ?", (user_id,))
for p in cursor.fetchall():
    print(" - Post:", p)

conn.close()
