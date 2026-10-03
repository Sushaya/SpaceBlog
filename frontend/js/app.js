/* ==========================================================================
   BlogSpace - Global UI, Navigation & Stories Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavbar();
    initNotifications();
    initMobileNav();
    initReadingProgressBar();
    initReportModalGlobal();
    initStoriesBarGlobal();
});

// Reading Progress Bar Controller
function initReadingProgressBar() {
    let bar = document.getElementById('reading-progress-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'reading-progress-bar';
        document.body.appendChild(bar);
    }

    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        bar.style.width = scrolled + '%';
    });
}

// Theme Management (Light / Dark mode)
function initTheme() {
    const savedTheme = localStorage.getItem(API.THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem(API.THEME_KEY, newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('theme-toggle-icon');
    if (themeIcon) {
        themeIcon.innerHTML = theme === 'dark' 
            ? '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>'
            : '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>';
    }
}

// Navbar Setup
function initNavbar() {
    const user = API.getUser();
    const navUserArea = document.getElementById('nav-user-area');
    const navSearchInput = document.getElementById('nav-search-input');

    if (navSearchInput) {
        navSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && navSearchInput.value.trim()) {
                window.location.href = `/explore.html?search=${encodeURIComponent(navSearchInput.value.trim())}`;
            }
        });
    }

    if (navUserArea) {
        if (user) {
            const isAdmin = user.role === 'admin';
            navUserArea.innerHTML = `
                ${isAdmin ? '<a href="/admin.html" class="nav-link" title="Admin Dashboard">⚙️ Admin</a>' : ''}
                <a href="/messages.html" class="btn-icon" title="Direct Messages" style="position:relative;">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    <span id="msg-badge" class="nav-badge" style="display:none;">0</span>
                </a>
                
                <div class="nav-item-relative">
                    <button id="notif-toggle-btn" class="btn-icon" title="Notifications" aria-label="Notifications">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                        </svg>
                        <span id="notif-badge" class="nav-badge" style="display:none;">0</span>
                    </button>
                    <div id="notif-dropdown" class="notification-dropdown">
                        <div class="notif-header">
                            <span>Notifications</span>
                            <button id="btn-mark-all-read" style="font-size:0.75rem; background:none; border:none; color:var(--accent-primary); font-weight:600; cursor:pointer;">Mark all read</button>
                        </div>
                        <div class="notif-list">
                            <div class="empty-state" style="padding:1.5rem;"><p style="font-size:0.85rem; color:var(--text-muted);">Loading notifications...</p></div>
                        </div>
                    </div>
                </div>

                <a href="/create-post.html" class="btn btn-primary btn-sm" style="display:inline-flex; align-items:center; gap:0.35rem;">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    <span>Create Post</span>
                </a>

                <a href="/profile.html" class="user-menu" title="${user.full_name}">
                    <img src="${user.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + user.username}" alt="${user.username}" class="avatar avatar-sm">
                </a>
                <button id="logout-btn" class="btn-icon" title="Logout">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </button>
            `;

            document.getElementById('logout-btn')?.addEventListener('click', () => {
                API.logout();
            });

            // Initial fetch of unread badges
            updateUnreadBadges();

            // Auto poll for unread notifications and messages every 4 seconds
            setInterval(updateUnreadBadges, 4000);
        } else {
            navUserArea.innerHTML = `
                <a href="/login.html" class="btn btn-secondary btn-sm">Log In</a>
                <a href="/register.html" class="btn btn-primary btn-sm">Sign Up</a>
            `;
        }
    }
}

async function updateUnreadBadges() {
    if (!API.isAuthenticated()) return;

    try {
        const msgRes = await API.get('/messages/unread/count');
        const msgBadge = document.getElementById('msg-badge');
        if (msgBadge) {
            if (msgRes.unread_count > 0) {
                msgBadge.textContent = msgRes.unread_count > 99 ? '99+' : msgRes.unread_count;
                msgBadge.style.display = 'inline-block';
            } else {
                msgBadge.style.display = 'none';
            }
        }

        const notifRes = await API.get('/notifications');
        const notifBadge = document.getElementById('notif-badge');
        if (notifBadge) {
            if (notifRes.unread_count > 0) {
                notifBadge.textContent = notifRes.unread_count > 99 ? '99+' : notifRes.unread_count;
                notifBadge.style.display = 'inline-block';
            } else {
                notifBadge.style.display = 'none';
            }
        }
    } catch (err) {}
}

// Notifications Setup & Toggle
async function initNotifications() {
    if (!API.isAuthenticated()) return;

    const notifBtn = document.getElementById('notif-toggle-btn');
    const dropdown = document.getElementById('notif-dropdown');
    const markReadBtn = document.getElementById('btn-mark-all-read');

    if (notifBtn && dropdown) {
        notifBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isVisible = dropdown.classList.contains('active');
            if (!isVisible) {
                dropdown.classList.add('active');
                await renderNotificationList(dropdown);
            } else {
                dropdown.classList.remove('active');
            }
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });

        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    if (markReadBtn) {
        markReadBtn.addEventListener('click', async () => {
            try {
                await API.put('/notifications/read', {});
                const badge = document.getElementById('notif-badge');
                if (badge) badge.style.display = 'none';
                if (dropdown) await renderNotificationList(dropdown);
                showToast('All notifications marked as read', 'info');
            } catch (err) {
                showToast('Failed to update notifications', 'error');
            }
        });
    }
}

async function renderNotificationList(dropdown) {
    try {
        const data = await API.get('/notifications');
        const listContainer = dropdown.querySelector('.notif-list');

        if (!data.notifications || data.notifications.length === 0) {
            listContainer.innerHTML = '<div class="empty-state" style="padding:1.5rem;"><p style="font-size:0.85rem; color:var(--text-muted);">No notifications yet</p></div>';
            return;
        }

        listContainer.innerHTML = data.notifications.map(n => {
            let actionText = '';
            let typeIcon = '🔔';
            let targetUrl = '#';

            if (n.type === 'like') {
                actionText = 'liked your post';
                typeIcon = '❤️';
                targetUrl = `/post.html?id=${n.post_id}`;
            } else if (n.type === 'comment') {
                actionText = 'commented on your post';
                typeIcon = '💬';
                targetUrl = `/post.html?id=${n.post_id}`;
            } else if (n.type === 'follow') {
                actionText = 'started following you';
                typeIcon = '👤';
                targetUrl = `/profile.html?id=${n.sender_id}`;
            } else if (n.type === 'message') {
                actionText = 'sent you a direct message';
                typeIcon = '📩';
                targetUrl = `/messages.html?user=${n.sender_id}`;
            }

            const postTitle = n.post_title ? `<strong>"${escapeHTML(n.post_title)}"</strong>` : '';
            const senderAvatar = n.sender_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${n.sender_username}`;

            return `
                <a href="${targetUrl}" class="notif-item ${n.is_read ? '' : 'unread'}">
                    <img src="${senderAvatar}" alt="${escapeHTML(n.sender_username)}" class="avatar avatar-sm">
                    <div style="flex:1; min-width:0;">
                        <p style="margin:0; font-size:0.85rem; line-height:1.4;">
                            <strong>${escapeHTML(n.sender_name)}</strong> ${actionText} ${postTitle}
                        </p>
                        <span class="comment-date" style="font-size:0.75rem; color:var(--text-muted);">${timeAgo(n.created_at)}</span>
                    </div>
                    <span style="font-size:1.05rem;">${typeIcon}</span>
                </a>
            `;
        }).join('');

        await API.put('/notifications/read', {});
        const badge = document.getElementById('notif-badge');
        if (badge) badge.style.display = 'none';
    } catch (err) {}
}

// 24-Hour Instagram-Style Stories Bar Initialization
async function initStoriesBarGlobal() {
    const container = document.getElementById('stories-bar-container');
    if (!container) return;

    try {
        const data = await API.get('/stories');
        const feed = data.feed || [];
        const currentUser = API.getUser();

        let storiesHTML = `
            <div class="story-circle-item" id="btn-add-story" style="text-align:center; cursor:pointer;">
                <div style="width:64px; height:64px; border-radius:50%; background:var(--bg-tertiary); border:2px dashed var(--accent-primary); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:var(--accent-primary);">
                    +
                </div>
                <span style="font-size:0.75rem; font-weight:600; display:block; margin-top:0.25rem;">Your Story</span>
            </div>
        `;

        storiesHTML += feed.map(group => `
            <div class="story-circle-item story-group-btn" data-user-id="${group.user_id}" style="text-align:center; cursor:pointer;">
                <div style="width:64px; height:64px; border-radius:50%; padding:2px; background:${group.has_unviewed ? 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' : 'var(--border-color)'}">
                    <img src="${group.author_avatar}" class="avatar" style="width:100%; height:100%; object-fit:cover;" alt="${group.author_name}">
                </div>
                <span style="font-size:0.75rem; font-weight:600; display:block; margin-top:0.25rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:64px;">${escapeHTML(group.author_name.split(' ')[0])}</span>
            </div>
        `).join('');

        container.innerHTML = storiesHTML;

        // Add Story Event
        document.getElementById('btn-add-story')?.addEventListener('click', () => {
            if (!API.isAuthenticated()) {
                showToast('Please log in to share a 24h story.', 'warning');
                return;
            }
            document.getElementById('create-story-modal')?.classList.add('active');
        });

        // Story Form Submit
        const createStoryForm = document.getElementById('create-story-form');
        if (createStoryForm) {
            createStoryForm.onsubmit = async (e) => {
                e.preventDefault();
                const image_url = document.getElementById('story-image-url').value.trim();
                const text_overlay = document.getElementById('story-caption').value.trim();

                try {
                    const res = await API.post('/stories', { image_url, text_overlay });
                    showToast(res.message, 'success');
                    document.getElementById('create-story-modal')?.classList.remove('active');
                    createStoryForm.reset();
                    initStoriesBarGlobal();
                } catch (err) {
                    showToast(err.message || 'Failed to publish story.', 'error');
                }
            };
        }

        // View Story Event
        document.querySelectorAll('.story-group-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const uId = parseInt(btn.getAttribute('data-user-id'));
                const group = feed.find(g => g.user_id === uId);
                if (group) openStoryViewerModal(group);
            });
        });

    } catch (err) {
        console.error('Error loading stories bar:', err);
    }
}

function openStoryViewerModal(group) {
    const modal = document.getElementById('story-viewer-modal');
    const authorArea = document.getElementById('viewer-author-info');
    const contentArea = document.getElementById('viewer-content');
    const closeBtn = document.getElementById('close-viewer-btn');

    if (!modal || !group || !group.stories || group.stories.length === 0) return;

    const story = group.stories[0];

    authorArea.innerHTML = `
        <img src="${group.author_avatar}" class="avatar avatar-sm" alt="${group.author_name}">
        <div>
            <strong>${escapeHTML(group.author_name)}</strong>
            <div style="font-size:0.75rem; opacity:0.8;">@${group.author_username}</div>
        </div>
    `;

    contentArea.innerHTML = `
        <img src="${story.image_url}" style="max-width:100%; max-height:480px; object-fit:contain; border-radius:var(--radius-md);" alt="Story Image">
        ${story.text_overlay ? `<p style="font-size:1.1rem; margin-top:1rem; font-weight:600;">${escapeHTML(story.text_overlay)}</p>` : ''}
    `;

    modal.classList.add('active');

    // Mark as viewed
    if (API.isAuthenticated()) {
        API.post(`/stories/${story.id}/view`, {}).catch(() => {});
    }

    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
}

// Global Content Report Modal Setup
function initReportModalGlobal() {
    let modal = document.getElementById('global-report-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'global-report-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3>🚩 Report Content</h3>
                    <button id="close-report-modal-btn" class="btn-icon">✕</button>
                </div>
                <form id="global-report-form">
                    <input type="hidden" id="report-target-type">
                    <input type="hidden" id="report-target-id">

                    <p id="report-target-label" style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:1rem;"></p>

                    <div class="form-group">
                        <label class="form-label">Reason for reporting</label>
                        <select id="report-reason" class="form-input" required>
                            <option value="Spam">Spam</option>
                            <option value="Harassment">Harassment / Hate Speech</option>
                            <option value="Inappropriate Content">Inappropriate / Explicit Content</option>
                            <option value="Copyright">Copyright Violation</option>
                            <option value="Misleading Content">Misleading Information</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Additional Details (Optional)</label>
                        <textarea id="report-details" class="form-input" rows="3" placeholder="Provide extra context for moderators..."></textarea>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
                        <button type="button" onclick="document.getElementById('global-report-modal').classList.remove('active')" class="btn btn-secondary btn-sm">Cancel</button>
                        <button type="submit" class="btn btn-primary btn-sm">Submit Report</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('close-report-modal-btn').onclick = () => modal.classList.remove('active');

        document.getElementById('global-report-form').onsubmit = async (e) => {
            e.preventDefault();
            if (!API.isAuthenticated()) {
                showToast('Please log in to report content.', 'warning');
                return;
            }

            const target_type = document.getElementById('report-target-type').value;
            const target_id = document.getElementById('report-target-id').value;
            const reason = document.getElementById('report-reason').value;
            const details = document.getElementById('report-details').value;

            try {
                const res = await API.post('/reports', { target_type, target_id, reason, details });
                showToast(res.message, 'success');
                modal.classList.remove('active');
            } catch (err) {
                showToast(err.message || 'Failed to submit report.', 'error');
            }
        };
    }
}

function openReportModal(targetType, targetId, labelText) {
    const modal = document.getElementById('global-report-modal');
    if (!modal) return;

    document.getElementById('report-target-type').value = targetType;
    document.getElementById('report-target-id').value = targetId;
    document.getElementById('report-target-label').textContent = `Reporting ${targetType.toUpperCase()}: ${labelText}`;
    document.getElementById('report-details').value = '';

    modal.classList.add('active');
}

window.openReportModal = openReportModal;

function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Mobile Bottom Navigation
function initMobileNav() {
    const mobileNav = document.getElementById('mobile-nav');
    if (!mobileNav) return;

    const path = window.location.pathname;
    const links = mobileNav.querySelectorAll('.mobile-nav-link');
    links.forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        }
    });
}

// Toast Helper
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

window.showToast = showToast;
