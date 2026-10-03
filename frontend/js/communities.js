/* ==========================================================================
   BlogSpace - Communities Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname;
    if (page.includes('communities.html')) {
        initCommunitiesPage();
    } else if (page.includes('community.html')) {
        initSingleCommunityPage();
    }
});

async function initCommunitiesPage() {
    const gridContainer = document.getElementById('communities-grid-container');
    const modal = document.getElementById('create-community-modal');
    const btnCreate = document.getElementById('btn-create-community');
    const btnClose = document.getElementById('close-community-modal-btn');
    const form = document.getElementById('create-community-form');

    if (btnCreate) {
        btnCreate.onclick = () => {
            if (!API.isAuthenticated()) {
                showToast('Please log in to create a sub-community.', 'warning');
                return;
            }
            modal?.classList.add('active');
        };
    }
    if (btnClose) btnClose.onclick = () => modal?.classList.remove('active');

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('comm-name').value.trim();
            const description = document.getElementById('comm-desc').value.trim();
            const icon_url = document.getElementById('comm-icon').value.trim();
            const rules = document.getElementById('comm-rules').value.trim();

            try {
                const res = await API.post('/communities', { name, description, icon_url, rules });
                showToast(res.message, 'success');
                modal?.classList.remove('active');
                form.reset();
                loadCommunitiesGrid();
            } catch (err) {
                showToast(err.message || 'Failed to create community.', 'error');
            }
        };
    }

    await loadCommunitiesGrid();
}

async function loadCommunitiesGrid() {
    const gridContainer = document.getElementById('communities-grid-container');
    if (!gridContainer) return;

    try {
        const data = await API.get('/communities');
        const list = data.communities || [];

        if (list.length === 0) {
            gridContainer.innerHTML = '<p class="empty-state">No communities created yet. Be the first to start one!</p>';
            return;
        }

        gridContainer.innerHTML = list.map(c => `
            <div class="card card-hover" style="padding:1.5rem; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
                        <img src="${c.icon_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80'}" class="avatar" style="width:52px; height:52px;" alt="${escapeHTML(c.name)}">
                        <div>
                            <h3 style="margin:0;"><a href="/community.html?id=${c.id}">${escapeHTML(c.name)}</a></h3>
                            <span style="font-size:0.8rem; color:var(--text-muted);">👥 ${c.members_count || 0} members • 📝 ${c.posts_count || 0} posts</span>
                        </div>
                    </div>
                    <p style="font-size:0.9rem; color:var(--text-secondary); line-clamp:2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHTML(c.description || 'No description provided.')}</p>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.25rem; border-top:1px solid var(--border-color); padding-top:1rem;">
                    <a href="/community.html?id=${c.id}" class="btn btn-secondary btn-sm">View Community</a>
                    <button class="btn ${c.is_joined ? 'btn-secondary' : 'btn-primary'} btn-sm join-comm-btn" data-id="${c.id}">
                        ${c.is_joined ? 'Joined' : '+ Join'}
                    </button>
                </div>
            </div>
        `).join('');

        // Attach join listeners
        gridContainer.querySelectorAll('.join-comm-btn').forEach(btn => {
            btn.onclick = async () => {
                if (!API.isAuthenticated()) {
                    showToast('Please log in to join communities.', 'warning');
                    return;
                }
                const cId = btn.getAttribute('data-id');
                try {
                    const res = await API.post(`/communities/${cId}/join`, {});
                    btn.textContent = res.joined ? 'Joined' : '+ Join';
                    btn.className = `btn ${res.joined ? 'btn-secondary' : 'btn-primary'} btn-sm join-comm-btn`;
                    showToast(res.message, 'success');
                } catch (err) {
                    showToast('Failed to update community membership.', 'error');
                }
            };
        });

    } catch (err) {
        console.error('Error loading communities:', err);
    }
}

async function initSingleCommunityPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const commId = urlParams.get('id') || urlParams.get('slug');

    if (!commId) {
        window.location.href = '/communities.html';
        return;
    }

    const heroContainer = document.getElementById('community-hero-container');
    const postsFeed = document.getElementById('community-posts-feed');

    try {
        const data = await API.get(`/communities/${commId}`);
        const c = data.community;

        document.title = `${c.name} - BlogSpace Community`;

        heroContainer.innerHTML = `
            <div class="card" style="padding:2rem;">
                <div style="display:flex; align-items:center; gap:1.25rem; flex-wrap:wrap;">
                    <img src="${c.icon_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80'}" class="avatar" style="width:72px; height:72px;" alt="${escapeHTML(c.name)}">
                    <div style="flex:1;">
                        <h1 style="margin:0; font-size:1.75rem;">${escapeHTML(c.name)}</h1>
                        <p style="margin:0.25rem 0; color:var(--text-secondary);">${escapeHTML(c.description || '')}</p>
                        <span style="font-size:0.85rem; color:var(--text-muted);">👥 ${c.members_count || 0} members • Created by @${c.creator ? c.creator.username : 'admin'}</span>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <button id="single-comm-join-btn" class="btn ${c.is_joined ? 'btn-secondary' : 'btn-primary'} btn-sm">
                            ${c.is_joined ? 'Joined' : '+ Join Community'}
                        </button>
                        <a href="/create-post.html" class="btn btn-primary btn-sm">Write Post</a>
                    </div>
                </div>
                ${c.rules ? `
                    <div style="margin-top:1.25rem; padding-top:1rem; border-top:1px solid var(--border-color);">
                        <strong>Community Rules:</strong>
                        <p style="font-size:0.85rem; color:var(--text-muted); margin:0.35rem 0 0 0; white-space:pre-line;">${escapeHTML(c.rules)}</p>
                    </div>
                ` : ''}
            </div>
        `;

        const joinBtn = document.getElementById('single-comm-join-btn');
        if (joinBtn) {
            joinBtn.onclick = async () => {
                if (!API.isAuthenticated()) {
                    showToast('Please log in to join communities.', 'warning');
                    return;
                }
                try {
                    const res = await API.post(`/communities/${c.id}/join`, {});
                    joinBtn.textContent = res.joined ? 'Joined' : '+ Join Community';
                    joinBtn.className = `btn ${res.joined ? 'btn-secondary' : 'btn-primary'} btn-sm`;
                    showToast(res.message, 'success');
                } catch (err) {
                    showToast('Failed to update membership.', 'error');
                }
            };
        }

        // Fetch Community Posts
        const postsData = await API.get(`/communities/${c.id}/posts`);
        if (!postsData.posts || postsData.posts.length === 0) {
            postsFeed.innerHTML = '<p class="empty-state">No posts in this community yet. Be the first to write one!</p>';
            return;
        }

        postsFeed.innerHTML = postsData.posts.map(post => createPostCardHTML(post)).join('');
        if (window.initCardEventListeners) window.initCardEventListeners();

    } catch (err) {
        console.error('Error fetching community details:', err);
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
