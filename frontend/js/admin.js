/* ==========================================================================
   BlogSpace - Admin Dashboard Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        initAdminDashboard();
    }
});

async function initAdminDashboard() {
    const user = API.getUser();

    if (!API.isAuthenticated() || user?.role !== 'admin') {
        showToast('Access denied. Administrator privileges required.', 'error');
        window.location.href = '/index.html';
        return;
    }

    await loadAdminStats();
    await loadAdminLogs();

    // Admin Tab Navigation
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-admin-tab');

            if (target === 'logs') loadAdminLogs();
            else if (target === 'users') loadAdminUsers();
            else if (target === 'posts') loadAdminPosts();
            else if (target === 'comments') loadAdminComments();
            else if (target === 'reports') loadAdminReports();
        });
    });
}

async function loadAdminStats() {
    try {
        const data = await API.get('/admin/stats');
        const s = data.stats;

        const elUsers = document.getElementById('stat-total-users');
        const elPosts = document.getElementById('stat-total-posts');
        const elComments = document.getElementById('stat-total-comments');
        const elLogs = document.getElementById('stat-total-logs');
        const elReports = document.getElementById('stat-pending-reports');

        if (elUsers) elUsers.textContent = s.total_users || 0;
        if (elPosts) elPosts.textContent = s.total_posts || 0;
        if (elComments) elComments.textContent = s.total_comments || 0;
        if (elLogs) elLogs.textContent = s.total_logs || 0;
        if (elReports) elReports.textContent = s.pending_reports || 0;
    } catch (err) {
        showToast('Failed to load admin overview statistics.', 'error');
    }
}

async function loadAdminLogs() {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    container.innerHTML = '<div class="skeleton" style="height:250px;"></div>';

    try {
        const data = await API.get('/admin/logs');
        if (!data.logs || data.logs.length === 0) {
            container.innerHTML = '<p class="empty-state">No user activity logs recorded yet.</p>';
            return;
        }

        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Log ID</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>IP Address</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.logs.map(log => {
                        const dateObj = new Date(log.created_at);
                        const dateStr = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                        let badgeColor = 'var(--badge-bg)';
                        let textColor = 'var(--badge-text)';
                        let icon = '🔑';

                        if (log.action === 'login') {
                            badgeColor = 'rgba(16, 185, 129, 0.15)';
                            textColor = '#059669';
                            icon = '🔓';
                        } else if (log.action === 'logout') {
                            badgeColor = 'rgba(239, 68, 68, 0.15)';
                            textColor = '#dc2626';
                            icon = '🔒';
                        } else if (log.action === 'register') {
                            badgeColor = 'rgba(99, 102, 241, 0.15)';
                            textColor = '#4f46e5';
                            icon = '✨';
                        } else if (log.action.includes('post')) {
                            icon = '📝';
                        }

                        return `
                            <tr>
                                <td>#${log.id}</td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:0.5rem;">
                                        <img src="${log.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + log.username}" class="avatar avatar-sm" alt="${log.username}">
                                        <div>
                                            <strong>${escapeHTML(log.full_name || log.username)}</strong>
                                            <div style="font-size:0.8rem; color:var(--text-muted);">@${log.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge" style="background-color:${badgeColor}; color:${textColor}; text-transform:uppercase; font-size:0.75rem;">
                                        ${icon} ${log.action}
                                    </span>
                                </td>
                                <td>📅 ${dateStr}</td>
                                <td>⏰ ${timeStr}</td>
                                <td><code>${escapeHTML(log.ip_address || '127.0.0.1')}</code></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        showToast('Error loading activity logs', 'error');
    }
}

async function loadAdminUsers() {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    container.innerHTML = '<div class="skeleton" style="height:250px;"></div>';

    try {
        const data = await API.get('/admin/users');
        if (!data.users || data.users.length === 0) {
            container.innerHTML = '<p class="empty-state">No registered users found.</p>';
            return;
        }

        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Posts</th>
                        <th>Joined</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.users.map(u => `
                        <tr>
                            <td>#${u.id}</td>
                            <td>
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <img src="${u.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + u.username}" class="avatar avatar-sm" alt="${u.username}">
                                    <div>
                                        <strong>${escapeHTML(u.full_name)}</strong>
                                        <div style="font-size:0.8rem; color:var(--text-muted);">@${u.username}</div>
                                    </div>
                                </div>
                            </td>
                            <td>${escapeHTML(u.email)}</td>
                            <td><span class="badge">${u.role}</span></td>
                            <td>${u.post_count || 0}</td>
                            <td>${new Date(u.created_at).toLocaleDateString()}</td>
                            <td>
                                ${u.id !== API.getUser()?.id ? `
                                    <button class="btn btn-secondary btn-sm admin-role-btn" data-id="${u.id}" data-target-role="${u.role === 'admin' ? 'user' : 'admin'}">
                                        ${u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                                    </button>
                                    <button class="btn btn-danger btn-sm admin-del-user-btn" data-id="${u.id}">Delete User</button>
                                ` : '<span style="color:var(--text-muted);">Current Logged-in Admin</span>'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.querySelectorAll('.admin-role-btn').forEach(btn => {
            btn.onclick = async () => {
                const uId = btn.getAttribute('data-id');
                const newRole = btn.getAttribute('data-target-role');
                if (confirm(`Are you sure you want to set this user's role to ${newRole}?`)) {
                    try {
                        await API.put(`/admin/users/${uId}/role`, { role: newRole });
                        showToast(`User role changed to ${newRole}`, 'success');
                        loadAdminUsers();
                    } catch (err) {
                        showToast(err.message || 'Failed to change role', 'error');
                    }
                }
            };
        });

        document.querySelectorAll('.admin-del-user-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Delete this user account and all their content?')) {
                    const uId = btn.getAttribute('data-id');
                    try {
                        await API.delete(`/admin/users/${uId}`);
                        showToast('User deleted', 'success');
                        loadAdminUsers();
                        loadAdminStats();
                    } catch (err) {
                        showToast(err.message || 'Failed to delete user', 'error');
                    }
                }
            };
        });
    } catch (err) {
        showToast('Error loading users list', 'error');
    }
}

async function loadAdminPosts() {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    container.innerHTML = '<div class="skeleton" style="height:250px;"></div>';

    try {
        const data = await API.get('/admin/posts');
        if (!data.posts || data.posts.length === 0) {
            container.innerHTML = '<p class="empty-state">No blog posts found.</p>';
            return;
        }

        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Likes</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.posts.map(p => `
                        <tr>
                            <td>#${p.id}</td>
                            <td>
                                <a href="/post.html?id=${p.id}" target="_blank"><strong>${escapeHTML(p.title)}</strong></a>
                            </td>
                            <td>${escapeHTML(p.author_name)} (@${p.author_username})</td>
                            <td><span class="badge">${p.category}</span></td>
                            <td>${p.status}</td>
                            <td>❤️ ${p.likes_count || 0}</td>
                            <td>
                                <button class="btn btn-danger btn-sm admin-del-post-btn" data-id="${p.id}">Delete Post</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.querySelectorAll('.admin-del-post-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Delete this post permanently?')) {
                    const pId = btn.getAttribute('data-id');
                    try {
                        await API.delete(`/admin/posts/${pId}`);
                        showToast('Post deleted by admin', 'success');
                        loadAdminPosts();
                        loadAdminStats();
                    } catch (err) {
                        showToast('Failed to delete post', 'error');
                    }
                }
            };
        });
    } catch (err) {
        showToast('Error loading posts list', 'error');
    }
}

async function loadAdminComments() {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    container.innerHTML = '<div class="skeleton" style="height:250px;"></div>';

    try {
        const data = await API.get('/admin/comments');
        if (!data.comments || data.comments.length === 0) {
            container.innerHTML = '<p class="empty-state">No comments found.</p>';
            return;
        }

        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Comment</th>
                        <th>Author</th>
                        <th>On Post</th>
                        <th>Date</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.comments.map(c => `
                        <tr>
                            <td>#${c.id}</td>
                            <td><p style="max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(c.content)}</p></td>
                            <td>${escapeHTML(c.author_name)} (@${c.author_username})</td>
                            <td>${escapeHTML(c.post_title)}</td>
                            <td>${new Date(c.created_at).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-danger btn-sm admin-del-comment-btn" data-id="${c.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.querySelectorAll('.admin-del-comment-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Delete this comment?')) {
                    const cId = btn.getAttribute('data-id');
                    try {
                        await API.delete(`/comments/${cId}`);
                        showToast('Comment deleted by admin', 'success');
                        loadAdminComments();
                        loadAdminStats();
                    } catch (err) {
                        showToast('Failed to delete comment', 'error');
                    }
                }
            };
        });
    } catch (err) {
        showToast('Error loading comments list', 'error');
    }
}

async function loadAdminReports() {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    container.innerHTML = '<div class="skeleton" style="height:250px;"></div>';

    try {
        const data = await API.get('/admin/reports');
        if (!data.reports || data.reports.length === 0) {
            container.innerHTML = '<p class="empty-state">No user reports submitted.</p>';
            return;
        }

        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Reporter</th>
                        <th>Target</th>
                        <th>Reason</th>
                        <th>Details</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.reports.map(r => `
                        <tr>
                            <td>#${r.id}</td>
                            <td>${escapeHTML(r.reporter_name)} (@${r.reporter_username})</td>
                            <td><span class="badge">${r.target_type} #${r.target_id}</span></td>
                            <td><strong>${escapeHTML(r.reason)}</strong></td>
                            <td><p style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(r.details || 'N/A')}</p></td>
                            <td>
                                <span class="badge" style="${r.status === 'pending' ? 'background:rgba(239, 68, 68, 0.15); color:#dc2626;' : 'background:rgba(16, 185, 129, 0.15); color:#059669;'}">
                                    ${r.status}
                                </span>
                            </td>
                            <td>
                                <div style="display:flex; gap:0.25rem;">
                                    ${r.status === 'pending' ? `
                                        <button class="btn btn-primary btn-sm update-report-btn" data-id="${r.id}" data-status="resolved">Resolve</button>
                                        <button class="btn btn-secondary btn-sm update-report-btn" data-id="${r.id}" data-status="dismissed">Dismiss</button>
                                    ` : '<span style="color:var(--text-muted); font-size:0.8rem;">No action needed</span>'}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.querySelectorAll('.update-report-btn').forEach(btn => {
            btn.onclick = async () => {
                const rId = btn.getAttribute('data-id');
                const newStatus = btn.getAttribute('data-status');
                try {
                    await API.put(`/admin/reports/${rId}`, { status: newStatus });
                    showToast(`Report marked as ${newStatus}`, 'success');
                    loadAdminReports();
                    loadAdminStats();
                } catch (err) {
                    showToast('Failed to update report', 'error');
                }
            };
        });

    } catch (err) {
        showToast('Error loading reports list', 'error');
    }
}
