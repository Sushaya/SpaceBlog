# 🚀 BlogSpace — Full-Stack Social Blogging Platform

**BlogSpace** is a production-style, high-performance, full-stack social blogging platform built with **Node.js, Express.js, SQLite3, and Vanilla JavaScript (ES6+)**. It features a modern Glassmorphism visual design system, rich text article editing, real-time notification polling, direct 1-on-1 messaging with media/file attachments, database-backed likes, comments, bookmarks, user follow networks, content moderation reporting, and an administrative control dashboard.

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [Technology Stack](#-technology-stack)
4. [System Architecture](#-system-architecture)
5. [Directory Structure](#-directory-structure)
6. [Database Schema](#-database-schema)
7. [API Documentation](#-api-documentation)
8. [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
9. [Installation & Setup](#-installation--setup)
10. [Environment Variables](#-environment-variables)
11. [Demo Credentials](#-demo-credentials)
12. [Security Features](#-security-features)
13. [Future Enhancements](#-future-enhancements)

---

## 🌟 Project Overview
BlogSpace is designed as a lightweight, zero-framework-overhead social blogging web application. Front-end assets total under 50KB, ensuring sub-second page rendering while delivering rich social interactions.

---

## ✨ Key Features

### 🔐 1. Authentication & Security
* **Flexible Login**: Authenticate using Email OR Username.
* **Secure Passwords**: Bcrypt password hashing (10 salt rounds).
* **JWT Session**: JSON Web Token stored in `localStorage` with auto-expiration detection.
* **Input Validation & Sanitization**: Comprehensive server-side validation and HTML sanitization (`sanitize-html`) preventing Cross-Site Scripting (XSS).

### 📰 2. Social Home Feed & Story Discovery
* **Feed Filters**: Latest Stories, Following Feed (stories from followed authors), Trending, and Recommended.
* **Rich Post Cards**: Author avatars, read time estimation, categories, tags, like counter, comment counter, bookmark button, share link.
* **Pagination & Skeleton Loaders**: Smooth page transitions with zero cumulative layout shifts.

### ✍️ 3. Article Creation & Rich Text Editor
* **Rich Formatting Toolbar**: Bold, Italic, H2, H3, Blockquotes, Lists, Code Blocks, Links.
* **Live Markdown/HTML Preview**: Toggle instantly between Write and Live Preview modes.
* **Word & Read-Time Counter**: Real-time word count and reading time calculations.
* **Draft Auto-Save**: Save articles as private drafts or publish immediately.

### ❤️ 4. Engagement: Likes, Comments & Bookmarks
* **Database-Backed Likes**: Instant toggle with unique database constraints to prevent duplicate likes.
* **Threaded Nested Comments**: Unlimited nesting for user replies.
* **Bookmarks / Saved List**: Save articles to a personal bookmark list accessible under user profiles.

### 👥 5. User Profiles & Follow Networks
* **Public & Owner Profiles**: Cover photo banner, profile avatar, bio, join date, total post views, and total likes.
* **Follow / Unfollow**: Real-time follow status toggle with live follower/following counts.
* **Profile Tabs**: Published Blogs, Saved Drafts (Owner only), Saved Bookmarks (Owner only), and About.

### 💬 6. Direct Messaging (Chat)
* **1-on-1 Chat**: Conversation list, real-time message auto-polling, unread badges.
* **Media & File Attachments**: Attach photos, videos, or documents up to 15MB.
* **Read Receipts & Delivery Indicators**: Real-time status indicators (`✓ Delivered`, `✓✓ Read`).

### 🚩 7. Moderation Reporting & Admin Dashboard
* **Content Flagging**: Report posts, comments, or users for Spam, Harassment, Inappropriate Content, Copyright, or Misleading Information.
* **Admin Dashboard**: Real-time metrics (Total Users, Posts, Comments, Activity Logs, Pending Reports).
* **User & Role Management**: Promote users to Admin, revoke permissions, delete accounts, delete inappropriate posts/comments, resolve moderation flags.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Glassmorphism, Flexbox/Grid), Vanilla JS (ES6+), Fetch API |
| **Backend** | Node.js (v24), Express.js (v4.19) RESTful API Gateway |
| **Database** | SQLite3 (`database/blogspace.db`), `/tmp/blogspace.db` Serverless Auto-Copy Fallback |
| **Security** | Helmet, Express Rate Limit, JWT (`jsonwebtoken`), Bcrypt (`bcryptjs`), Sanitize-HTML |
| **Storage** | Local Disk Storage (`/uploads`), Multer File Engine |

---

## 🏛️ System Architecture

```text
+-----------------------------------------------------------------------+
|                         PRESENTATION LAYER                            |
|  [ Modern HTML5 Pages ] <---> [ Glassmorphism CSS3 ]                  |
|  [ Vanilla JS (ES6+) ]  <---> [ Fetch API Engine & LocalStorage ]     |
+-----------------------------------------------------------------------+
                                   |  HTTP / REST API (JSON)
                                   v
+-----------------------------------------------------------------------+
|                         APPLICATION LAYER                             |
|  [ Express.js REST Router ]  --->  [ JWT Auth & RBAC Middleware ]    |
|  [ Domain Controllers ]      --->  [ Helmet & Rate Limiter ]         |
+-----------------------------------------------------------------------+
                                   |  SQL Queries & FS I/O
                                   v
+-----------------------------------------------------------------------+
|                       DATA & STORAGE LAYER                            |
|  [ SQLite3 Relational DB (blogspace.db / /tmp Fallback) ]            |
|  [ Media Files Directory (/uploads) ]                                 |
+-----------------------------------------------------------------------+
```

---

## 📁 Directory Structure

```text
blogspace/
│
├── frontend/
│   ├── index.html            # Home Social Feed
│   ├── login.html            # Authentication Login
│   ├── register.html         # User Registration
│   ├── create-post.html      # Article Editor (Create / Edit)
│   ├── post.html             # Article Detail Page & Comments
│   ├── profile.html          # User Profile & Saved Bookmarks
│   ├── explore.html          # Search & Category Discovery
│   ├── messages.html         # Direct Messaging Chat
│   ├── admin.html            # Administrator Dashboard
│   │
│   ├── css/
│   │   └── style.css         # Glassmorphism Design System
│   │
│   └── js/
│       ├── api.js            # API Client & Session Manager
│       ├── app.js            # Global UI, Theme, Notifications & Toasts
│       ├── auth.js           # Login & Registration Handlers
│       ├── posts.js          # Feed, Editor & Article Controller
│       ├── profile.js        # Profile & Edit Profile Controller
│       ├── messages.js       # Direct Chat Controller
│       └── admin.js          # Admin Dashboard Controller
│
├── backend/
│   ├── server.js             # Express Server & Gateway Entrypoint
│   ├── package.json          # Backend Dependencies
│   ├── database/
│   │   └── database.js       # SQLite Connection & Seed Manager
│   ├── middleware/
│   │   └── auth.js           # JWT Authentication & RBAC Middleware
│   └── routes/
│       ├── auth.js           # Authentication Endpoints
│       ├── posts.js          # Blog Posts Endpoints
│       ├── likes.js          # Likes Endpoints
│       ├── bookmarks.js      # Bookmarks / Saved Posts Endpoints
│       ├── comments.js       # Comments Endpoints
│       ├── users.js          # User Profiles & Follow Network
│       ├── notifications.js # Notifications Endpoints
│       ├── messages.js       # Direct Messages Endpoints
│       ├── reports.js        # Moderation Reports Endpoints
│       └── admin.js          # Admin Management Endpoints
│
├── database/
│   ├── schema.sql            # SQLite DDL Schema & Indexes
│   └── blogspace.db          # Embedded RDBMS Data File
│
├── .env.example              # Environment Configuration Template
├── package.json              # Workspace Root Scripts
└── README.md                 # Documentation
```

---

## 📊 Database Schema

1. **`users`**: `id`, `full_name`, `username`, `email`, `password`, `bio`, `avatar_url`, `cover_url`, `role`, `created_at`
2. **`posts`**: `id`, `user_id`, `title`, `content`, `summary`, `category`, `cover_image`, `tags`, `status`, `views`, `created_at`, `updated_at`
3. **`comments`**: `id`, `post_id`, `user_id`, `content`, `parent_id`, `created_at`
4. **`likes`**: `id`, `user_id`, `post_id`, `created_at` *(UNIQUE `user_id, post_id`)*
5. **`bookmarks`**: `id`, `user_id`, `post_id`, `created_at` *(UNIQUE `user_id, post_id`)*
6. **`followers`**: `id`, `follower_id`, `following_id`, `created_at` *(UNIQUE `follower_id, following_id`)*
7. **`notifications`**: `id`, `user_id`, `sender_id`, `type`, `post_id`, `is_read`, `created_at`
8. **`messages`**: `id`, `sender_id`, `receiver_id`, `message`, `attachment_url`, `attachment_type`, `is_read`, `created_at`
9. **`user_logs`**: `id`, `user_id`, `username`, `action`, `ip_address`, `created_at`
10. **`reports`**: `id`, `reporter_id`, `target_type`, `target_id`, `reason`, `details`, `status`, `created_at`, `updated_at`

---

## 🔑 Demo Credentials

### 🛡️ Administrator Account
* **Email**: `admin@blogspace.com`
* **Username**: `admin`
* **Password**: `Password123!`

### 👤 Demo Author Accounts
* **Alex Rivera**: Username: `alexrivera` | Password: `Password123!`
* **Sarah Jenkins**: Username: `sarahj` | Password: `Password123!`

---

## 🚀 Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Sushaya/SpaceBlog.git
   cd blogspace
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Start Application**:
   ```bash
   npm start
   ```

5. **Open Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 🛡️ Security Features
* **Rate Limiting**: Express rate limiter restricts IP requests to 300 / 15-min.
* **HTTP Security Headers**: Powered by `helmet`.
* **HTML Sanitization**: All rich text content is sanitized via `sanitize-html` to prevent XSS attacks.
* **SQL Injection Immunity**: 100% parameterized SQL queries using prepared statements.
* **Error Sanitization**: Production server responses never expose raw stack traces.

---

## 📄 License
This project is open-source and available under the MIT License.