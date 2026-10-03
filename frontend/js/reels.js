/* ==========================================================================
   BlogSpace - Short Video Reels Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('reels.html')) {
        initReelsPage();
    }
});

async function initReelsPage() {
    const feedContainer = document.getElementById('reels-feed-container');
    const modal = document.getElementById('create-reel-modal');
    const btnCreate = document.getElementById('btn-create-reel');
    const btnClose = document.getElementById('close-reel-modal-btn');
    const form = document.getElementById('create-reel-form');

    if (btnCreate) {
        btnCreate.onclick = () => {
            if (!API.isAuthenticated()) {
                showToast('Please log in to upload short video reels.', 'warning');
                return;
            }
            modal?.classList.add('active');
        };
    }
    if (btnClose) btnClose.onclick = () => modal?.classList.remove('active');

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const video_url = document.getElementById('reel-video-url').value.trim();
            const thumbnail_url = document.getElementById('reel-thumb-url').value.trim();
            const caption = document.getElementById('reel-caption').value.trim();
            const hashtags = document.getElementById('reel-hashtags').value.trim();

            try {
                const res = await API.post('/reels', { video_url, thumbnail_url, caption, hashtags });
                showToast(res.message, 'success');
                modal?.classList.remove('active');
                form.reset();
                loadReelsFeed();
            } catch (err) {
                showToast(err.message || 'Failed to upload reel.', 'error');
            }
        };
    }

    await loadReelsFeed();
}

async function loadReelsFeed() {
    const feedContainer = document.getElementById('reels-feed-container');
    if (!feedContainer) return;

    try {
        const data = await API.get('/reels');
        const reels = data.reels || [];

        if (reels.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state" style="padding:4rem 1rem;">
                    <div class="empty-state-icon">🎥</div>
                    <h3>No Short Videos Yet</h3>
                    <p>Be the first creator to share a short video reel on BlogSpace!</p>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = reels.map(r => `
            <div class="reel-card" style="position:relative; width:100%; height:620px; background:#000; border-radius:var(--radius-lg); overflow:hidden; margin-bottom:1.5rem;">
                <video src="${r.video_url}" poster="${r.thumbnail_url || ''}" controls muted loop style="width:100%; height:100%; object-fit:cover;"></video>
                
                <div style="position:absolute; bottom:1rem; left:1rem; right:1rem; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.8); z-index:2;">
                    <a href="/profile.html?id=${r.user_id}" style="display:flex; align-items:center; gap:0.5rem; color:#fff; text-decoration:none; margin-bottom:0.5rem;">
                        <img src="${r.author_avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + r.author_username}" class="avatar avatar-sm" alt="${r.author_name}">
                        <strong>${escapeHTML(r.author_name)}</strong>
                        <span style="font-size:0.8rem; opacity:0.8;">@${r.author_username}</span>
                    </a>
                    <p style="margin:0 0 0.35rem 0; font-size:0.95rem;">${escapeHTML(r.caption)}</p>
                    ${r.hashtags ? `<div style="font-size:0.8rem; color:var(--accent-primary);">${r.hashtags.split(',').map(h => '#' + h.trim()).join(' ')}</div>` : ''}
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error loading reels:', err);
        feedContainer.innerHTML = '<p class="alert-error">Failed to load short videos.</p>';
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
