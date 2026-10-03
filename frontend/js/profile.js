/* ==========================================================================
   BlogSpace - Profile & Edit Profile Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('profile.html')) {
        initProfilePage();
    }
});

async function initProfilePage() {
    const profileContainer = document.getElementById('profile-container');
    if (!profileContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id') || urlParams.get('username');

    // If no target ID provided and not logged in, redirect to login
    if (!userId && !API.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    const currentUser = API.getUser();
    const targetIdentifier = userId || (currentUser ? currentUser.id : null);

    try {
        const data = await API.get(`/users/${targetIdentifier}`);
        const user = data.user;

        document.title = `${user.full_name} (@${user.username}) - BlogSpace`;

        const isSelf = user.is_self;
        const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const defaultCover = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';
        const coverSrc = user.cover_url || defaultCover;

        profileContainer.innerHTML = `
            <div class="profile-header-card">
                <div class="profile-cover-banner" style="height:180px; width:100%; border-radius:var(--radius-lg) var(--radius-lg) 0 0; overflow:hidden; background:var(--bg-tertiary);">
                    <img src="${coverSrc}" alt="Profile Cover" style="width:100%; height:100%; object-fit:cover;">
                </div>

                <div class="profile-avatar-wrap" style="margin-top:-50px; text-align:center;">
                    <img src="${user.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + user.username}" alt="${escapeHTML(user.full_name)}" class="avatar avatar-lg" style="border:4px solid var(--bg-secondary); background:var(--bg-primary);">
                </div>

                <h1 class="profile-name">${escapeHTML(user.full_name)}</h1>
                <p class="profile-username">@${escapeHTML(user.username)} ${user.role === 'admin' ? '<span class="badge" style="vertical-align:middle; margin-left:0.25rem;">Admin</span>' : ''}</p>

                <p class="profile-bio">${escapeHTML(user.bio || 'No bio provided yet.')}</p>
                <p style="font-size:0.85rem; color:var(--text-muted);">📅 Joined ${joinDate}</p>

                <div style="margin-top: 1.25rem;">
                    ${isSelf ? `
                        <button id="edit-profile-btn" class="btn btn-secondary btn-sm">⚙️ Edit Profile</button>
                    ` : `
                        <div style="display:flex; justify-content:center; gap:0.5rem;">
                            <button id="profile-follow-btn" class="btn ${user.is_following ? 'btn-secondary' : 'btn-primary'} btn-sm">
                                ${user.is_following ? 'Following' : '+ Follow'}
                            </button>
                            <a href="/messages.html?user=${user.id}" class="btn btn-secondary btn-sm">💬 Message</a>
                        </div>
                    `}
                </div>

                <div class="profile-stats">
                    <div class="stat-item">
                        <span class="stat-value" id="stat-posts">${user.stats.total_posts}</span>
                        <span class="stat-label">Posts</span>
                    </div>
                    <div class="stat-item" id="btn-show-followers" style="cursor:pointer;">
                        <span class="stat-value" id="stat-followers">${user.stats.followers}</span>
                        <span class="stat-label">Followers</span>
                    </div>
                    <div class="stat-item" id="btn-show-following" style="cursor:pointer;">
                        <span class="stat-value" id="stat-following">${user.stats.following}</span>
                        <span class="stat-label">Following</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">👁️ ${user.stats.total_views || 0}</span>
                        <span class="stat-label">Total Views</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">❤️ ${user.stats.total_likes || 0}</span>
                        <span class="stat-label">Total Likes</span>
                    </div>
                </div>
            </div>

            <!-- Followers / Following Modal Container -->
            <div id="users-list-modal" class="modal-overlay">
                <div class="modal-content">
                    <div style="display:flex; justify-space-between; align-items:center; margin-bottom:1rem;">
                        <h3 id="users-modal-title">Followers</h3>
                        <button id="close-users-modal-btn" class="btn-icon">✕</button>
                    </div>
                    <div id="users-modal-body" style="max-height:360px; overflow-y:auto;"></div>
                </div>
            </div>

            <!-- Profile Content Tabs -->
            <div class="profile-tabs">
                <div class="profile-tab active" data-tab="published">Published Blogs</div>
                ${isSelf ? '<div class="profile-tab" data-tab="drafts">Saved Drafts</div>' : ''}
                ${isSelf ? '<div class="profile-tab" data-tab="saved">Saved / Bookmarks</div>' : ''}
                <div class="profile-tab" data-tab="about">About</div>
            </div>

            <div id="profile-tab-content">
                <div id="profile-posts-feed"></div>
            </div>

            <!-- Edit Profile Modal -->
            ${isSelf ? createEditProfileModalHTML(user) : ''}
        `;

        // Follow/Unfollow Event
        const followBtn = document.getElementById('profile-follow-btn');
        if (followBtn) {
            followBtn.onclick = async () => {
                if (!API.isAuthenticated()) {
                    showToast('Please log in to follow users.', 'warning');
                    return;
                }
                try {
                    const isFollowing = followBtn.textContent.includes('Following');
                    const endpoint = `/users/${user.id}/follow`;
                    const res = isFollowing ? await API.delete(endpoint) : await API.post(endpoint, {});

                    followBtn.textContent = res.is_following ? 'Following' : '+ Follow';
                    followBtn.className = `btn ${res.is_following ? 'btn-secondary' : 'btn-primary'} btn-sm`;
                    
                    const statFollowers = document.getElementById('stat-followers');
                    if (statFollowers) statFollowers.textContent = res.followers_count;
                    const statFollowing = document.getElementById('stat-following');
                    if (statFollowing) statFollowing.textContent = res.following_count;

                    showToast(res.message, 'success');
                } catch (err) {
                    showToast('Failed to follow/unfollow.', 'error');
                }
            };
        }

        // Followers & Following Modal Popup Handlers
        const usersModal = document.getElementById('users-list-modal');
        const usersTitle = document.getElementById('users-modal-title');
        const usersBody = document.getElementById('users-modal-body');
        const closeUsersModal = document.getElementById('close-users-modal-btn');

        closeUsersModal?.addEventListener('click', () => usersModal?.classList.remove('active'));

        const showUsersList = async (type) => {
            if (!usersModal || !usersBody) return;
            usersTitle.textContent = type === 'followers' ? 'Followers' : 'Following';
            usersBody.innerHTML = '<div class="skeleton" style="height:150px;"></div>';
            usersModal.classList.add('active');

            try {
                const data = await API.get(`/users/${user.id}/${type}`);
                const list = data[type] || [];

                if (list.length === 0) {
                    usersBody.innerHTML = `<p class="empty-state" style="padding:1rem;">No ${type} found.</p>`;
                    return;
                }

                usersBody.innerHTML = list.map(u => `
                    <div class="follower-item">
                        <a href="/profile.html?id=${u.id}" style="display:flex; align-items:center; gap:0.75rem; text-decoration:none; color:inherit;">
                            <img src="${u.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + u.username}" class="avatar avatar-sm" alt="${u.username}">
                            <div>
                                <div style="font-weight:600; color:var(--text-primary);">${escapeHTML(u.full_name)}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted);">@${escapeHTML(u.username)}</div>
                            </div>
                        </a>
                        <div style="display:flex; align-items:center; gap:0.4rem;">
                            ${!u.is_self && API.isAuthenticated() ? `
                                <button class="btn ${u.is_following ? 'btn-secondary' : 'btn-primary'} btn-sm list-follow-btn" data-user-id="${u.id}" data-is-following="${u.is_following}">
                                    ${u.is_following ? 'Following' : '+ Follow'}
                                </button>
                                <a href="/messages.html?user=${u.id}" class="btn btn-secondary btn-sm" style="padding:0.35rem 0.65rem;" title="Message User">💬</a>
                            ` : ''}
                        </div>
                    </div>
                `).join('');

                // Attach follow toggle event listeners inside modal
                usersBody.querySelectorAll('.list-follow-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const targetId = btn.getAttribute('data-user-id');
                        const isFollowing = btn.getAttribute('data-is-following') === 'true';
                        const endpoint = `/users/${targetId}/follow`;

                        try {
                            const res = isFollowing ? await API.delete(endpoint) : await API.post(endpoint, {});
                            btn.setAttribute('data-is-following', res.is_following);
                            btn.textContent = res.is_following ? 'Following' : '+ Follow';
                            btn.className = `btn ${res.is_following ? 'btn-secondary' : 'btn-primary'} btn-sm list-follow-btn`;
                            showToast(res.message, 'success');

                            const statsFollowers = document.getElementById('stat-followers');
                            if (statsFollowers && parseInt(targetId) === user.id) {
                                statsFollowers.textContent = res.followers_count;
                            }
                        } catch (err) {
                            showToast('Failed to update follow status.', 'error');
                        }
                    });
                });

            } catch (err) {
                usersBody.innerHTML = '<p class="alert-error" style="display:block;">Failed to load user list.</p>';
            }
        };

        document.getElementById('btn-show-followers')?.addEventListener('click', () => showUsersList('followers'));
        document.getElementById('btn-show-following')?.addEventListener('click', () => showUsersList('following'));

        // Edit Profile Modal Events
        if (isSelf) {
            initEditProfileModal(user);
        }

        // Tab Switching Logic
        const tabs = document.querySelectorAll('.profile-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const tabType = tab.getAttribute('data-tab');
                loadProfileTabContent(user.id, tabType, user);
            });
        });

        // Initial Load Published Posts
        loadProfileTabContent(user.id, 'published', user);

    } catch (err) {
        console.error('Profile load error:', err);
        profileContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <h2>User Profile Not Found</h2>
                <p>The requested profile could not be found.</p>
                <a href="/index.html" class="btn btn-primary" style="margin-top:1rem;">Back to Home</a>
            </div>
        `;
    }
}

async function loadProfileTabContent(userId, tabType, user) {
    const feed = document.getElementById('profile-posts-feed');
    if (!feed) return;

    if (tabType === 'about') {
        feed.innerHTML = `
            <div class="card" style="max-width:600px; margin:0 auto; padding:2rem;">
                <h3>About ${escapeHTML(user.full_name)}</h3>
                <p style="margin:1rem 0; color:var(--text-secondary);">${escapeHTML(user.bio || 'No bio written yet.')}</p>
                ${user.email ? `<p><strong>Email:</strong> ${escapeHTML(user.email)}</p>` : ''}
                <p><strong>Member Since:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
            </div>
        `;
        return;
    }

    feed.innerHTML = '<div class="skeleton" style="height: 200px; width: 100%;"></div>';

    try {
        let endpoint = `/users/${userId}/posts?status=published`;
        if (tabType === 'drafts') {
            endpoint = `/users/${userId}/posts?status=draft`;
        } else if (tabType === 'saved') {
            endpoint = `/users/${userId}/bookmarks`;
        }

        const data = await API.get(endpoint);

        if (!data.posts || data.posts.length === 0) {
            feed.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">${tabType === 'saved' ? '🔖' : '✍️'}</div>
                    <p>No ${tabType} posts found.</p>
                </div>
            `;
            return;
        }

        feed.innerHTML = data.posts.map(post => createPostCardHTML(post)).join('');
        initCardEventListeners();
    } catch (err) {
        showToast('Failed to load user posts.', 'error');
    }
}

function createEditProfileModalHTML(user) {
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`;
    const avatarSrc = user.avatar_url || defaultAvatar;

    return `
        <div id="edit-profile-modal" class="modal-overlay">
            <div class="modal-content">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h2>Edit Profile</h2>
                    <button id="close-modal-btn" class="btn-icon">✕</button>
                </div>

                <form id="edit-profile-form">
                    <!-- Profile Photo Selection Header -->
                    <div style="display:flex; align-items:center; gap:1.25rem; margin-bottom:1.5rem; padding:1rem; background:var(--bg-primary); border-radius:var(--radius-md); border:1px solid var(--border-color);">
                        <img id="edit-avatar-preview" src="${avatarSrc}" class="avatar" style="width:76px; height:76px;" alt="Profile Preview">
                        <div style="flex:1;">
                            <label class="form-label" style="margin-bottom:0.4rem; font-weight:700;">Profile Picture</label>
                            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                                <input type="file" id="edit-avatar-file" accept="image/*" style="display:none;">
                                <button type="button" id="btn-upload-avatar" class="btn btn-primary btn-sm">📷 Choose Photo</button>
                                <button type="button" id="btn-remove-avatar" class="btn btn-secondary btn-sm" style="color:var(--accent-danger);">Remove</button>
                            </div>
                            <span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top:0.4rem;">Select an image file from your device.</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" id="edit-name" class="form-input" value="${escapeHTML(user.full_name)}" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Username</label>
                        <input type="text" id="edit-username" class="form-input" value="${escapeHTML(user.username)}" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Cover Image URL (Header Banner)</label>
                        <input type="text" id="edit-cover" class="form-input" value="${escapeHTML(user.cover_url || '')}" placeholder="https://images.unsplash.com/photo-xxx">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Avatar Image URL (Optional)</label>
                        <input type="text" id="edit-avatar" class="form-input" value="${escapeHTML(user.avatar_url || '')}" placeholder="https://example.com/avatar.jpg">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Bio</label>
                        <textarea id="edit-bio" class="form-input" rows="3" placeholder="Write a short bio about yourself...">${escapeHTML(user.bio || '')}</textarea>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
                        <button type="button" id="cancel-edit-btn" class="btn btn-secondary btn-sm">Cancel</button>
                        <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function initEditProfileModal(user) {
    const editBtn = document.getElementById('edit-profile-btn');
    const modal = document.getElementById('edit-profile-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const form = document.getElementById('edit-profile-form');

    const uploadAvatarBtn = document.getElementById('btn-upload-avatar');
    const avatarFileInput = document.getElementById('edit-avatar-file');
    const removeAvatarBtn = document.getElementById('btn-remove-avatar');
    const avatarInput = document.getElementById('edit-avatar');
    const avatarPreview = document.getElementById('edit-avatar-preview');

    if (!modal) return;

    const openModal = () => modal.classList.add('active');
    const closeModal = () => modal.classList.remove('active');

    editBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Photo File Input Trigger
    if (uploadAvatarBtn && avatarFileInput) {
        uploadAvatarBtn.addEventListener('click', () => avatarFileInput.click());

        avatarFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 8 * 1024 * 1024) {
                showToast('Image file size must be less than 8MB.', 'warning');
                avatarFileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                if (avatarInput) avatarInput.value = dataUrl;
                if (avatarPreview) avatarPreview.src = dataUrl;
                showToast('New profile photo selected!', 'info');
            };
            reader.readAsDataURL(file);
        });
    }

    // Live URL Input Sync
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            avatarPreview.src = val || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`;
        });
    }

    // Remove Avatar Photo
    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', () => {
            const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`;
            if (avatarInput) avatarInput.value = defaultAvatar;
            if (avatarPreview) avatarPreview.src = defaultAvatar;
            if (avatarFileInput) avatarFileInput.value = '';
            showToast('Profile photo reset to default.', 'info');
        });
    }

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const full_name = document.getElementById('edit-name').value.trim();
        const username = document.getElementById('edit-username').value.trim();
        const cover_url = document.getElementById('edit-cover').value.trim();
        const avatar_url = document.getElementById('edit-avatar').value.trim();
        const bio = document.getElementById('edit-bio').value.trim();

        try {
            const data = await API.put(`/users/${user.id}`, { full_name, username, avatar_url, cover_url, bio });
            API.setUser(data.user);
            showToast('Profile updated successfully!', 'success');
            closeModal();
            setTimeout(() => location.reload(), 600);
        } catch (err) {
            showToast(err.message || 'Failed to update profile.', 'error');
        }
    });
}
