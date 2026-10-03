/* ==========================================================================
   BlogSpace - Creator Dashboard & Analytics Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        initDashboardPage();
    }
});

async function initDashboardPage() {
    if (!API.isAuthenticated()) {
        showToast('Please log in to access your creator analytics dashboard.', 'warning');
        window.location.href = '/login.html';
        return;
    }

    const selectTimeframe = document.getElementById('analytics-timeframe');
    if (selectTimeframe) {
        selectTimeframe.addEventListener('change', () => {
            loadDashboardMetrics(selectTimeframe.value);
        });
    }

    await loadDashboardMetrics(selectTimeframe ? selectTimeframe.value : '30d');
}

async function loadDashboardMetrics(timeframe = '30d') {
    try {
        const data = await API.get(`/analytics/dashboard?timeframe=${timeframe}`);
        const m = data.metrics;

        document.getElementById('dash-stat-views').textContent = (m.total_views || 0).toLocaleString();
        document.getElementById('dash-stat-likes').textContent = (m.total_likes || 0).toLocaleString();
        document.getElementById('dash-stat-comments').textContent = (m.total_comments || 0).toLocaleString();
        document.getElementById('dash-stat-followers').textContent = (m.followers || 0).toLocaleString();
        document.getElementById('dash-stat-engagement').textContent = `${m.engagement_rate || 0}%`;

        // Render Bar Chart Visualization
        renderBarChart(data.time_series || []);

        // Render Top Performing Posts Table
        renderTopPosts(data.top_posts || []);
    } catch (err) {
        console.error('Error loading analytics:', err);
        showToast('Failed to load dashboard metrics.', 'error');
    }
}

function renderBarChart(series) {
    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) return;

    if (!series || series.length === 0) {
        chartContainer.innerHTML = '<p class="empty-state">No trend data for this timeframe.</p>';
        return;
    }

    const maxViews = Math.max(...series.map(s => s.views), 10);

    chartContainer.innerHTML = series.map(s => {
        const heightPct = Math.max(8, Math.min(100, Math.round((s.views / maxViews) * 100)));
        const dateLabel = new Date(s.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

        return `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
                <div style="width:100%; max-width:24px; height:${heightPct}%; background:var(--accent-primary); border-radius:4px 4px 0 0;" title="${s.views} views on ${dateLabel}"></div>
                <span style="font-size:0.65rem; color:var(--text-muted); margin-top:0.35rem;">${dateLabel}</span>
            </div>
        `;
    }).join('');
}

function renderTopPosts(posts) {
    const container = document.getElementById('dash-top-posts-container');
    if (!container) return;

    if (!posts || posts.length === 0) {
        container.innerHTML = '<p class="empty-state">No published stories yet.</p>';
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Views</th>
                    <th>Likes</th>
                    <th>Comments</th>
                </tr>
            </thead>
            <tbody>
                ${posts.map(p => `
                    <tr>
                        <td><a href="/post.html?id=${p.id}" target="_blank"><strong>${escapeHTML(p.title)}</strong></a></td>
                        <td><span class="badge">${p.category}</span></td>
                        <td>👁️ ${p.views || 0}</td>
                        <td>❤️ ${p.likes_count || 0}</td>
                        <td>💬 ${p.comments_count || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
