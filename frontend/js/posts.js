/* ==========================================================================
   BlogSpace - Posts & Editor Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname;

    if (page.includes('index.html') || page === '/') {
        initHomeFeed();
    } else if (page.includes('explore.html')) {
        initExplorePage();
    } else if (page.includes('create-post.html')) {
        initPostEditor();
    } else if (page.includes('post.html')) {
        initPostDetail();
    }
});

/* ==========================================================================
   1. Home Page Feed
   ========================================================================== */

let currentFeedType = 'all';
let currentPage = 1;

function initHomeFeed() {
    const feedContainer = document.getElementById('posts-feed');
    if (!feedContainer) return;

    const tabAll = document.getElementById('tab-feed-all');
    const tabFollowing = document.getElementById('tab-feed-following');
    const tabTrending = document.getElementById('tab-feed-trending');

    if (tabAll) {
        tabAll.addEventListener('click', () => {
            currentFeedType = 'all';
            tabAll.classList.add('active');
            tabFollowing?.classList.remove('active');
            tabTrending?.classList.remove('active');
            currentPage = 1;
            loadHomePosts();
        });
    }

    if (tabFollowing) {
        tabFollowing.addEventListener('click', () => {
            if (!API.isAuthenticated()) {
                showToast('Please log in to view your following feed.', 'warning');
                return;
            }
            currentFeedType = 'following';
            tabFollowing.classList.add('active');
            tabAll?.classList.remove('active');
            tabTrending?.classList.remove('active');
            currentPage = 1;
            loadHomePosts();
        });
    }

    if (tabTrending) {
        tabTrending.addEventListener('click', () => {
            currentFeedType = 'trending';
            tabTrending.classList.add('active');
            tabAll?.classList.remove('active');
            tabFollowing?.classList.remove('active');
            currentPage = 1;
            loadHomePosts();
        });
    }

    loadHomePosts();
}

async function loadHomePosts() {
    const feedContainer = document.getElementById('posts-feed');
    if (!feedContainer) return;

    // Show Skeleton Loaders
    feedContainer.innerHTML = Array(3).fill(0).map(() => `
        <div class="card post-card">
            <div class="skeleton" style="height: 200px; width: 100%;"></div>
            <div style="padding: 1.5rem;">
                <div class="skeleton" style="height: 24px; width: 60%; margin-bottom: 1rem;"></div>
                <div class="skeleton" style="height: 16px; width: 90%; margin-bottom: 0.5rem;"></div>
                <div class="skeleton" style="height: 16px; width: 75%;"></div>
            </div>
        </div>
    `).join('');

    try {
        let endpoint = `/posts?feed=${currentFeedType}&page=${currentPage}&limit=10`;
        if (currentFeedType === 'trending') {
            endpoint = `/posts?sort=popular&page=${currentPage}&limit=10`;
        }

        const data = await API.get(endpoint);

        if (!data.posts || data.posts.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>No posts found</h3>
                    <p>${currentFeedType === 'following' ? 'Follow authors to see their latest posts here!' : 'Be the first to create and publish a post on BlogSpace!'}</p>
                    <a href="/create-post.html" class="btn btn-primary" style="margin-top:1rem;">Write a Post</a>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = data.posts.map(post => createPostCardHTML(post)).join('');
        initCardEventListeners();

        // Render Load More button if total pages > 1
        const paginationContainer = document.getElementById('pagination-container');
        if (paginationContainer) {
            if (data.pagination.totalPages > currentPage) {
                paginationContainer.innerHTML = `<button id="load-more-btn" class="btn btn-secondary btn-full">Load More Posts</button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => {
                    currentPage++;
                    appendHomePosts();
                });
            } else {
                paginationContainer.innerHTML = '';
            }
        }
    } catch (err) {
        console.error('Error loading posts:', err);
        feedContainer.innerHTML = '<div class="alert-error" style="display:block;">Failed to load posts. Please try again.</div>';
    }
}

async function appendHomePosts() {
    const feedContainer = document.getElementById('posts-feed');
    try {
        let endpoint = `/posts?feed=${currentFeedType}&page=${currentPage}&limit=10`;
        if (currentFeedType === 'trending') {
            endpoint = `/posts?sort=popular&page=${currentPage}&limit=10`;
        }
        const data = await API.get(endpoint);

        if (data.posts && data.posts.length > 0) {
            const newHTML = data.posts.map(post => createPostCardHTML(post)).join('');
            feedContainer.insertAdjacentHTML('beforeend', newHTML);
            initCardEventListeners();

            const paginationContainer = document.getElementById('pagination-container');
            if (data.pagination.totalPages <= currentPage && paginationContainer) {
                paginationContainer.innerHTML = '';
            }
        }
    } catch (err) {
        showToast('Error loading more posts', 'error');
    }
}

/* ==========================================================================
   2. Post Card Generator & Event Handlers
   ========================================================================== */

function createPostCardHTML(post) {
    const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const wordCount = post.content ? post.content.replace(/<[^>]*>?/gm, '').split(/\s+/).length : 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    const tagsHTML = post.tags ? post.tags.split(',').map(t => `<span class="tag-pill">#${t.trim()}</span>`).join('') : '';

    return `
        <article class="card post-card card-hover" data-post-id="${post.id}">
            ${post.cover_image ? `
                <div class="post-cover-wrap">
                    <a href="/post.html?id=${post.id}">
                        <img src="${post.cover_image}" alt="${escapeHTML(post.title)}" class="post-cover-img" loading="lazy">
                    </a>
                </div>
            ` : ''}
            <div class="post-card-body">
                <div class="post-author-meta">
                    <a href="/profile.html?id=${post.user_id}" class="author-info">
                        <img src="${post.author_avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + post.author_username}" alt="${escapeHTML(post.author_name)}" class="avatar avatar-sm">
                        <div class="author-details">
                            <span class="author-name">${escapeHTML(post.author_name)}</span>
                            <div class="post-date">${formattedDate} • ⏱️ ${readTime} min read</div>
                        </div>
                    </a>
                    <span class="badge">${escapeHTML(post.category)}</span>
                </div>

                <h2 class="post-title">
                    <a href="/post.html?id=${post.id}">${escapeHTML(post.title)}</a>
                </h2>

                <p class="post-preview">${escapeHTML(post.summary || '')}</p>

                ${tagsHTML ? `<div class="post-tags">${tagsHTML}</div>` : ''}

                <div class="post-actions">
                    <div class="action-btn-group">
                        <button class="action-btn like-btn ${post.is_liked_by_me ? 'liked' : ''}" data-post-id="${post.id}">
                            <svg width="18" height="18" fill="${post.is_liked_by_me ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                            <span class="like-count">${post.likes_count || 0}</span>
                        </button>

                        <a href="/post.html?id=${post.id}#comments" class="action-btn">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                            <span>${post.comments_count || 0}</span>
                        </a>

                        <button class="action-btn bookmark-btn ${post.is_bookmarked_by_me ? 'bookmarked' : ''}" data-post-id="${post.id}" title="Save / Bookmark Post">
                            <svg width="18" height="18" fill="${post.is_bookmarked_by_me ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                            </svg>
                        </button>

                        <button class="action-btn share-btn" data-url="${window.location.origin}/post.html?id=${post.id}" data-title="${escapeHTML(post.title)}" title="Share Post">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-5.367 3 3 0 000 5.367zm0 8a3 3 0 100-5.367 3 3 0 000 5.367z"></path>
                            </svg>
                        </button>
                    </div>

                    <a href="/post.html?id=${post.id}" class="btn btn-secondary btn-sm">Read More</a>
                </div>
            </div>
        </article>
    `;
}

function initCardEventListeners() {
    // Like buttons
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            if (!API.isAuthenticated()) {
                showToast('Please log in to like posts.', 'warning');
                return;
            }
            const postId = btn.getAttribute('data-post-id');
            try {
                const data = await API.post(`/posts/${postId}/like`, {});
                btn.classList.toggle('liked', data.liked);
                btn.querySelector('.like-count').textContent = data.likes_count;
                btn.querySelector('svg').setAttribute('fill', data.liked ? 'currentColor' : 'none');
            } catch (err) {
                showToast('Failed to update like status', 'error');
            }
        };
    });

    // Bookmark buttons
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            if (!API.isAuthenticated()) {
                showToast('Please log in to save posts.', 'warning');
                return;
            }
            const postId = btn.getAttribute('data-post-id');
            try {
                const data = await API.post(`/posts/${postId}/bookmark`, {});
                btn.classList.toggle('bookmarked', data.bookmarked);
                btn.querySelector('svg').setAttribute('fill', data.bookmarked ? 'currentColor' : 'none');
                showToast(data.message, 'success');
            } catch (err) {
                showToast('Failed to update saved posts status', 'error');
            }
        };
    });

    // Share buttons
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const url = btn.getAttribute('data-url');
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url);
                showToast('Post link copied to clipboard!', 'success');
            } else {
                showToast(url, 'info');
            }
        };
    });
}

window.createPostCardHTML = createPostCardHTML;
window.initCardEventListeners = initCardEventListeners;

/* ==========================================================================
   3. Explore & Search Page
   ========================================================================== */

function initExplorePage() {
    const searchInput = document.getElementById('explore-search');
    const sortSelect = document.getElementById('explore-sort');
    const categoryPills = document.querySelectorAll('.filter-pill');
    const resultsCountSpan = document.getElementById('explore-results-count');

    const viewGridBtn = document.getElementById('view-grid-btn');
    const viewListBtn = document.getElementById('view-list-btn');
    const feedContainer = document.getElementById('explore-results');

    let activeCategory = 'All';

    if (viewGridBtn && viewListBtn && feedContainer) {
        viewGridBtn.onclick = () => {
            viewGridBtn.classList.add('active');
            viewListBtn.classList.remove('active');
            feedContainer.className = 'posts-grid-layout';
        };
        viewListBtn.onclick = () => {
            viewListBtn.classList.add('active');
            viewGridBtn.classList.remove('active');
            feedContainer.className = 'posts-list-layout';
        };
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('search') && searchInput) {
        searchInput.value = urlParams.get('search');
    }
    if (urlParams.has('category')) {
        activeCategory = urlParams.get('category');
    }

    const fetchExplore = async () => {
        const query = searchInput ? searchInput.value.trim() : '';
        const sort = sortSelect ? sortSelect.value : 'latest';

        if (!feedContainer) return;

        feedContainer.innerHTML = '<div class="skeleton" style="height: 300px; width: 100%;"></div>';

        try {
            const endpoint = `/posts?search=${encodeURIComponent(query)}&category=${encodeURIComponent(activeCategory)}&sort=${sort}&limit=20`;
            const data = await API.get(endpoint);

            if (resultsCountSpan) {
                resultsCountSpan.textContent = `Showing ${data.pagination?.total || 0} stories`;
            }

            if (!data.posts || data.posts.length === 0) {
                feedContainer.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <div class="empty-state-icon">🔍</div>
                        <h3>No matching posts found</h3>
                        <p>Try refining your search terms or selecting a different category filter.</p>
                    </div>
                `;
                return;
            }

            feedContainer.innerHTML = data.posts.map(post => createPostCardHTML(post)).join('');
            initCardEventListeners();
        } catch (err) {
            console.error('Explore error:', err);
        }
    };

    if (searchInput) searchInput.addEventListener('input', debounce(fetchExplore, 400));
    if (sortSelect) sortSelect.addEventListener('change', fetchExplore);

    categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            categoryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.getAttribute('data-category');
            fetchExplore();
        });
    });

    fetchExplore();
}

/* ==========================================================================
   4. Blog Post Editor (Create / Edit)
   ========================================================================== */

function initPostEditor() {
    if (!API.isAuthenticated()) {
        showToast('Please log in to create or edit blog posts.', 'warning');
        window.location.href = '/login.html';
        return;
    }

    const titleInput = document.getElementById('editor-title');
    const categorySelect = document.getElementById('editor-category');
    const coverInput = document.getElementById('editor-cover');
    const tagsInput = document.getElementById('editor-tags');
    const contentInput = document.getElementById('editor-content');

    const btnPublish = document.getElementById('btn-publish');
    const btnDraft = document.getElementById('btn-draft');

    const tabWrite = document.getElementById('tab-write');
    const tabPreview = document.getElementById('tab-preview');
    const writeBox = document.getElementById('box-write');
    const previewBox = document.getElementById('box-preview');

    if (tabWrite && tabPreview) {
        tabWrite.addEventListener('click', () => {
            tabWrite.classList.add('active');
            tabPreview.classList.remove('active');
            writeBox.style.display = 'block';
            previewBox.style.display = 'none';
        });

        tabPreview.addEventListener('click', () => {
            tabPreview.classList.add('active');
            tabWrite.classList.remove('active');
            writeBox.style.display = 'none';
            previewBox.style.display = 'block';
            previewBox.innerHTML = `
                <h2>${escapeHTML(titleInput.value || 'Post Title')}</h2>
                <div class="post-content-body" style="margin-top:1rem;">
                    ${contentInput.value || '<p><em>Nothing to preview yet. Start typing your blog content!</em></p>'}
                </div>
            `;
        });
    }

    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.getAttribute('data-format');
            insertFormatting(contentInput, format);
            updateWordCount();
        });
    });

    document.querySelectorAll('.preset-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const url = pill.getAttribute('data-url');
            if (coverInput) coverInput.value = url;
        });
    });

    const updateWordCount = () => {
        if (!contentInput) return;
        const text = contentInput.value.trim();
        const wordCount = text ? text.split(/\s+/).length : 0;
        const charCount = text.length;
        const readTime = Math.max(1, Math.ceil(wordCount / 200));

        const countSpan = document.getElementById('editor-word-count');
        const readSpan = document.getElementById('editor-read-time');

        if (countSpan) countSpan.textContent = `${wordCount} words • ${charCount} characters`;
        if (readSpan) readSpan.textContent = `⏱️ ${readTime} min read`;
    };

    if (contentInput) {
        contentInput.addEventListener('input', updateWordCount);
        updateWordCount();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const editPostId = urlParams.get('edit');

    if (editPostId) {
        loadPostForEdit(editPostId);
    }

    btnPublish?.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        submitPost('published', editPostId);
    });
    btnDraft?.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        submitPost('draft', editPostId);
    });
}

function insertFormatting(textarea, format) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || 'Sample Text';

    let replacement = '';
    switch (format) {
        case 'bold': replacement = `<strong>${selectedText}</strong>`; break;
        case 'italic': replacement = `<em>${selectedText}</em>`; break;
        case 'h2': replacement = `\n<h2>${selectedText}</h2>\n`; break;
        case 'h3': replacement = `\n<h3>${selectedText}</h3>\n`; break;
        case 'quote': replacement = `\n<blockquote>"${selectedText}"</blockquote>\n`; break;
        case 'ul': replacement = `\n<ul>\n  <li>${selectedText}</li>\n  <li>Item 2</li>\n</ul>\n`; break;
        case 'ol': replacement = `\n<ol>\n  <li>${selectedText}</li>\n  <li>Item 2</li>\n</ol>\n`; break;
        case 'link': replacement = `<a href="https://example.com" target="_blank">${selectedText}</a>`; break;
    }

    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    textarea.focus();
}

async function loadPostForEdit(postId) {
    try {
        const data = await API.get(`/posts/${postId}`);
        const post = data.post;

        document.getElementById('editor-title').value = post.title;
        document.getElementById('editor-category').value = post.category;
        document.getElementById('editor-cover').value = post.cover_image;
        document.getElementById('editor-tags').value = post.tags;
        document.getElementById('editor-content').value = post.content;

        document.querySelector('.auth-title').textContent = 'Edit Blog Post';
    } catch (err) {
        showToast('Failed to load post for editing.', 'error');
    }
}

async function submitPost(status, editPostId) {
    const title = document.getElementById('editor-title').value.trim();
    const category = document.getElementById('editor-category').value;
    const cover_image = document.getElementById('editor-cover').value.trim();
    const tags = document.getElementById('editor-tags').value.trim();
    const content = document.getElementById('editor-content').value.trim();

    if (!title || !content) {
        showToast('Post title and content are required.', 'error');
        return;
    }

    try {
        const payload = { title, category, cover_image, tags, content, status };
        let response;

        if (editPostId) {
            response = await API.put(`/posts/${editPostId}`, payload);
        } else {
            response = await API.post('/posts', payload);
        }

        showToast(response.message, 'success');
        setTimeout(() => {
            window.location.href = `/post.html?id=${response.post.id}`;
        }, 800);
    } catch (err) {
        showToast(err.message || 'Failed to save post.', 'error');
    }
}

/* ==========================================================================
   5. Single Blog Post Detail Page
   ========================================================================== */

async function initPostDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        window.location.href = '/index.html';
        return;
    }

    const detailContainer = document.getElementById('post-detail-container');
    if (!detailContainer) return;

    try {
        const data = await API.get(`/posts/${postId}`);
        const post = data.post;

        document.title = `${post.title} - BlogSpace`;

        const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        const currentUser = API.getUser();
        const isAuthorOrAdmin = currentUser && (currentUser.id === post.user_id || currentUser.role === 'admin');

        const tagsHTML = post.tags ? post.tags.split(',').map(t => `<span class="tag-pill">#${t.trim()}</span>`).join('') : '';

        detailContainer.innerHTML = `
            <div class="post-detail-hero">
                <span class="badge" style="font-size:0.875rem; margin-bottom:1rem;">${escapeHTML(post.category)}</span>
                <h1 class="post-detail-title">${escapeHTML(post.title)}</h1>

                <div class="post-detail-author-row">
                    <a href="/profile.html?id=${post.user_id}" class="author-info">
                        <img src="${post.author_avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + post.author_username}" alt="${escapeHTML(post.author_name)}" class="avatar">
                        <div class="author-details">
                            <div class="author-name" style="font-size:1.05rem;">${escapeHTML(post.author_name)}</div>
                            <div class="post-date">Published on ${formattedDate} • 👁️ ${post.views || 0} views</div>
                        </div>
                    </a>

                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                        ${!isAuthorOrAdmin && currentUser ? `
                            <button id="detail-follow-btn" class="btn ${post.is_following_author ? 'btn-secondary' : 'btn-primary'} btn-sm">
                                ${post.is_following_author ? 'Following' : '+ Follow Author'}
                            </button>
                        ` : ''}

                        ${isAuthorOrAdmin ? `
                            <a href="/create-post.html?edit=${post.id}" class="btn btn-secondary btn-sm">Edit Post</a>
                            <button id="delete-post-btn" class="btn btn-danger btn-sm">Delete</button>
                        ` : ''}

                        ${currentUser ? `
                            <button id="detail-report-btn" class="btn btn-secondary btn-sm" style="color:var(--accent-warning);" title="Report Post">🚩 Report</button>
                        ` : ''}
                    </div>
                </div>

                ${post.cover_image ? `<img src="${post.cover_image}" alt="${escapeHTML(post.title)}" class="post-detail-cover">` : ''}
            </div>

            <div class="post-content-body">
                ${post.content}
            </div>

            ${tagsHTML ? `<div class="post-tags" style="margin-bottom: 2rem;">${tagsHTML}</div>` : ''}

            <div class="post-actions" style="border-bottom: 1px solid var(--border-color); padding-bottom:1.5rem; margin-bottom: 2.5rem;">
                <div class="action-btn-group">
                    <button id="detail-like-btn" class="action-btn like-btn ${post.is_liked_by_me ? 'liked' : ''}" style="font-size:1.1rem;">
                        <svg width="24" height="24" fill="${post.is_liked_by_me ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                        <span id="detail-like-count">${post.likes_count || 0} Likes</span>
                    </button>

                    <button id="detail-bookmark-btn" class="action-btn bookmark-btn ${post.is_bookmarked_by_me ? 'bookmarked' : ''}" style="font-size:1.1rem;">
                        <svg width="24" height="24" fill="${post.is_bookmarked_by_me ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                        </svg>
                        <span>${post.is_bookmarked_by_me ? 'Saved' : 'Save'}</span>
                    </button>

                    <button class="action-btn share-btn" data-url="${window.location.href}">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-5.367 3 3 0 000 5.367zm0 8a3 3 0 100-5.367 3 3 0 000 5.367z"></path>
                        </svg>
                        <span>Share Article</span>
                    </button>
                </div>
            </div>

            <!-- Comments Section -->
            <section id="comments" class="comments-section">
                <h3 style="font-size:1.5rem; margin-bottom:1.5rem;">Comments (<span id="comments-total-count">0</span>)</h3>

                <div id="comment-form-container">
                    ${currentUser ? `
                        <form id="add-comment-form" style="margin-bottom:2rem;">
                            <div class="form-group">
                                <textarea id="comment-text" class="form-input" rows="3" placeholder="Share your thoughts on this article..." required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary btn-sm">Post Comment</button>
                        </form>
                    ` : `
                        <div class="card" style="text-align:center; padding:1.5rem; margin-bottom:2rem;">
                            <p style="color:var(--text-secondary);">Want to join the conversation?</p>
                            <a href="/login.html" class="btn btn-secondary btn-sm" style="margin-top:0.5rem;">Log In to Comment</a>
                        </div>
                    `}
                </div>

                <div id="comments-list"></div>
            </section>
        `;

        const followBtn = document.getElementById('detail-follow-btn');
        if (followBtn) {
            followBtn.onclick = async () => {
                try {
                    const isFollowing = followBtn.textContent.includes('Following');
                    const endpoint = `/users/${post.user_id}/follow`;
                    const response = isFollowing ? await API.delete(endpoint) : await API.post(endpoint, {});

                    followBtn.textContent = response.is_following ? 'Following' : '+ Follow Author';
                    followBtn.className = `btn ${response.is_following ? 'btn-secondary' : 'btn-primary'} btn-sm`;
                    showToast(response.message, 'success');
                } catch (err) {
                    showToast('Failed to follow/unfollow author.', 'error');
                }
            };
        }

        const reportBtn = document.getElementById('detail-report-btn');
        if (reportBtn) {
            reportBtn.onclick = () => {
                if (window.openReportModal) {
                    window.openReportModal('post', post.id, post.title);
                }
            };
        }

        const deleteBtn = document.getElementById('delete-post-btn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                if (confirm('Are you sure you want to permanently delete this post?')) {
                    try {
                        await API.delete(`/posts/${post.id}`);
                        showToast('Post deleted successfully.', 'success');
                        setTimeout(() => window.location.href = '/index.html', 800);
                    } catch (err) {
                        showToast('Failed to delete post.', 'error');
                    }
                }
            };
        }

        const detailLikeBtn = document.getElementById('detail-like-btn');
        if (detailLikeBtn) {
            detailLikeBtn.onclick = async () => {
                if (!API.isAuthenticated()) {
                    showToast('Please log in to like this post.', 'warning');
                    return;
                }
                try {
                    const data = await API.post(`/posts/${post.id}/like`, {});
                    detailLikeBtn.classList.toggle('liked', data.liked);
                    document.getElementById('detail-like-count').textContent = `${data.likes_count} Likes`;
                    detailLikeBtn.querySelector('svg').setAttribute('fill', data.liked ? 'currentColor' : 'none');
                } catch (err) {
                    showToast('Failed to update like status', 'error');
                }
            };
        }

        const detailBookmarkBtn = document.getElementById('detail-bookmark-btn');
        if (detailBookmarkBtn) {
            detailBookmarkBtn.onclick = async () => {
                if (!API.isAuthenticated()) {
                    showToast('Please log in to save this post.', 'warning');
                    return;
                }
                try {
                    const data = await API.post(`/posts/${post.id}/bookmark`, {});
                    detailBookmarkBtn.classList.toggle('bookmarked', data.bookmarked);
                    detailBookmarkBtn.querySelector('span').textContent = data.bookmarked ? 'Saved' : 'Save';
                    detailBookmarkBtn.querySelector('svg').setAttribute('fill', data.bookmarked ? 'currentColor' : 'none');
                    showToast(data.message, 'success');
                } catch (err) {
                    showToast('Failed to update bookmark status', 'error');
                }
            };
        }

        loadComments(post.id);

        const commentForm = document.getElementById('add-comment-form');
        if (commentForm) {
            commentForm.onsubmit = async (e) => {
                e.preventDefault();
                const contentInput = document.getElementById('comment-text');
                const content = contentInput.value.trim();

                if (!content) return;

                try {
                    await API.post(`/posts/${post.id}/comments`, { content });
                    contentInput.value = '';
                    showToast('Comment posted!', 'success');
                    loadComments(post.id);
                } catch (err) {
                    showToast(err.message || 'Failed to post comment.', 'error');
                }
            };
        }

    } catch (err) {
        console.error('Error loading post detail:', err);
        detailContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h2>Post Not Found</h2>
                <p>The post you are looking for does not exist or has been removed.</p>
                <a href="/index.html" class="btn btn-primary" style="margin-top:1rem;">Back to Home</a>
            </div>
        `;
    }
}

async function loadComments(postId) {
    const commentsList = document.getElementById('comments-list');
    const totalCountSpan = document.getElementById('comments-total-count');
    if (!commentsList) return;

    try {
        const data = await API.get(`/posts/${postId}/comments`);
        totalCountSpan.textContent = data.total || 0;

        if (!data.comments || data.comments.length === 0) {
            commentsList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1.5rem;">No comments yet. Be the first to share your thoughts!</p>';
            return;
        }

        const currentUser = API.getUser();

        const renderCommentTree = (comment, isReply = false) => {
            const canDelete = currentUser && (currentUser.id === comment.user_id || currentUser.role === 'admin');
            const dateStr = new Date(comment.created_at).toLocaleDateString();

            const repliesHTML = comment.replies && comment.replies.length > 0 
                ? `<div class="comment-replies" style="margin-left: 2.5rem; margin-top:0.75rem; border-left: 2px solid var(--border-color); padding-left: 1rem;">
                    ${comment.replies.map(r => renderCommentTree(r, true)).join('')}
                   </div>`
                : '';

            return `
                <div class="comment-card" data-comment-id="${comment.id}">
                    <img src="${comment.author_avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + comment.author_username}" alt="${escapeHTML(comment.author_name)}" class="avatar avatar-sm">
                    <div class="comment-body">
                        <div class="comment-header">
                            <div>
                                <a href="/profile.html?id=${comment.user_id}" class="comment-author-name">${escapeHTML(comment.author_name)}</a>
                                <span class="comment-date"> • ${dateStr}</span>
                            </div>
                            <div style="display:flex; gap:0.25rem;">
                                ${currentUser ? `
                                    <button class="btn-icon report-comment-btn" data-id="${comment.id}" title="Report comment" style="font-size:0.85rem;">
                                        🚩
                                    </button>
                                ` : ''}
                                ${canDelete ? `
                                    <button class="btn-icon delete-comment-btn" data-id="${comment.id}" title="Delete comment" style="color:var(--accent-danger);">
                                        🗑️
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <p class="comment-text">${escapeHTML(comment.content)}</p>

                        ${repliesHTML}
                    </div>
                </div>
            `;
        };

        commentsList.innerHTML = data.comments.map(c => renderCommentTree(c)).join('');

        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Delete this comment?')) {
                    const cId = btn.getAttribute('data-id');
                    try {
                        await API.delete(`/comments/${cId}`);
                        showToast('Comment deleted', 'success');
                        loadComments(postId);
                    } catch (err) {
                        showToast('Failed to delete comment', 'error');
                    }
                }
            };
        });

        document.querySelectorAll('.report-comment-btn').forEach(btn => {
            btn.onclick = () => {
                const cId = btn.getAttribute('data-id');
                if (window.openReportModal) {
                    window.openReportModal('comment', cId, 'Comment #' + cId);
                }
            };
        });

    } catch (err) {
        console.error('Error fetching comments:', err);
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
