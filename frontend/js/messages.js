/* ==========================================================================
   BlogSpace - Direct Messaging Controller (Updated)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('messages.html')) {
        initMessagesPage();
    }
});

let activePartnerId = null;
let pollInterval = null;
let currentAttachment = null; // { url, type, name }

async function initMessagesPage() {
    if (!API.isAuthenticated()) {
        showToast('Please log in to access direct messages.', 'warning');
        window.location.href = '/login.html';
        return;
    }

    await loadConversationsList();

    // Search contacts filter
    const searchInput = document.getElementById('conv-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.conversation-item').forEach(item => {
                const name = item.getAttribute('data-name') || '';
                item.style.display = name.toLowerCase().includes(term) ? 'flex' : 'none';
            });
        });
    }

    // Attachment File Input Trigger & Handler
    const attachBtn = document.getElementById('btn-attach-file');
    const fileInput = document.getElementById('chat-file-input');
    const previewBar = document.getElementById('attachment-preview-bar');
    const previewContent = document.getElementById('attachment-preview-content');
    const removeAttachBtn = document.getElementById('btn-remove-attachment');

    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 15 * 1024 * 1024) { // 15MB limit check
                showToast('File size limit is 15MB.', 'warning');
                fileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                let type = 'file';
                let icon = '📎';

                if (file.type.startsWith('image/')) {
                    type = 'image';
                    icon = '📷';
                } else if (file.type.startsWith('video/')) {
                    type = 'video';
                    icon = '🎥';
                }

                currentAttachment = {
                    url: dataUrl,
                    type: type,
                    name: file.name
                };

                if (previewContent && previewBar) {
                    previewContent.innerHTML = `<span>${icon} <strong>${escapeHTML(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)</span>`;
                    previewBar.style.display = 'flex';
                }
            };
            reader.readAsDataURL(file);
        });
    }

    if (removeAttachBtn) {
        removeAttachBtn.addEventListener('click', clearCurrentAttachment);
    }

    // Quick Emoji React Buttons
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const emoji = btn.getAttribute('data-emoji');
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.value += emoji + ' ';
                chatInput.focus();
            }
        });
    });

    // Clear Chat Button Handler
    const clearBtn = document.getElementById('btn-clear-chat');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (!activePartnerId) return;
            if (confirm('Are you sure you want to clear this entire conversation history?')) {
                try {
                    await API.delete(`/messages/${activePartnerId}`);
                    showToast('Conversation cleared.', 'success');
                    await loadChatHistory(activePartnerId, true);
                    await loadConversationsList();
                } catch (err) {
                    showToast('Failed to clear chat.', 'error');
                }
            }
        });
    }

    // Check if target user passed via URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('user');

    if (targetUserId) {
        openChatWindow(parseInt(targetUserId));
    }

    // Chat Send Form Handler
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const message = input.value.trim();

            if ((!message && !currentAttachment) || !activePartnerId) return;

            try {
                const payload = {
                    message: message,
                    attachment_url: currentAttachment ? currentAttachment.url : null,
                    attachment_type: currentAttachment ? currentAttachment.type : null
                };

                input.value = '';
                clearCurrentAttachment();

                await API.post(`/messages/${activePartnerId}`, payload);
                await loadChatHistory(activePartnerId, true);
                await loadConversationsList();
            } catch (err) {
                showToast(err.message || 'Failed to send message.', 'error');
            }
        });
    }

    // Auto-polling for active chat
    clearInterval(pollInterval);
    pollInterval = setInterval(() => {
        if (activePartnerId) {
            loadChatHistory(activePartnerId, false);
        }
        loadConversationsList(false);
    }, 3000);
}

function clearCurrentAttachment() {
    currentAttachment = null;
    const fileInput = document.getElementById('chat-file-input');
    const previewBar = document.getElementById('attachment-preview-bar');
    if (fileInput) fileInput.value = '';
    if (previewBar) previewBar.style.display = 'none';
}

async function loadConversationsList(showSkeleton = true) {
    const listContainer = document.getElementById('conversations-list');
    if (!listContainer) return;

    if (showSkeleton && listContainer.children.length <= 1) {
        listContainer.innerHTML = '<div class="skeleton" style="height:60px; margin:0.5rem;"></div>';
    }

    try {
        const data = await API.get('/messages/conversations');
        const convs = data.conversations || [];

        if (convs.length === 0) {
            listContainer.innerHTML = '<p class="empty-state" style="padding:1.5rem; font-size:0.9rem;">No conversations yet.</p>';
            return;
        }

        const currentUser = API.getUser();

        listContainer.innerHTML = convs.map(c => {
            const partner = c.partner;
            const isActive = activePartnerId === partner.id;
            const timeStr = c.last_message_time ? new Date(c.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const isMe = c.last_message_sender_id === currentUser.id;
            const prefix = isMe ? 'You: ' : '';

            return `
                <div class="conversation-item ${isActive ? 'active' : ''}" data-name="${escapeHTML(partner.full_name)} @${escapeHTML(partner.username)}" onclick="openChatWindow(${partner.id})">
                    <img src="${partner.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + partner.username}" class="avatar avatar-sm" alt="${partner.username}">
                    <div class="conversation-info">
                        <div class="conversation-name">
                            <span>${escapeHTML(partner.full_name)}</span>
                            <span style="font-size:0.75rem; color:var(--text-muted);">${timeStr}</span>
                        </div>
                        <div class="conversation-preview">
                            ${prefix}${escapeHTML(c.last_message)}
                        </div>
                    </div>
                    ${c.unread_count > 0 ? `<span class="badge" style="background-color:var(--accent-danger); color:white;">${c.unread_count}</span>` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading conversations:', err);
    }
}

async function openChatWindow(partnerId) {
    activePartnerId = partnerId;

    const placeholder = document.getElementById('chat-placeholder');
    const activeWindow = document.getElementById('chat-active-window');

    if (placeholder) placeholder.style.display = 'none';
    if (activeWindow) activeWindow.style.display = 'flex';

    // Highlight selected item in sidebar
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });

    await loadChatHistory(partnerId, true);
}

async function loadChatHistory(partnerId, autoScroll = true) {
    const messagesArea = document.getElementById('chat-messages-area');
    if (!messagesArea) return;

    try {
        const data = await API.get(`/messages/${partnerId}`);
        const partner = data.partner;
        const messages = data.messages || [];

        // Update Partner Header
        document.getElementById('chat-partner-avatar').src = partner.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${partner.username}`;
        document.getElementById('chat-partner-name').textContent = partner.full_name;
        document.getElementById('chat-partner-handle').textContent = `● Online • @${partner.username}`;
        document.getElementById('chat-partner-profile-link').href = `/profile.html?id=${partner.id}`;

        const currentUser = API.getUser();

        if (messages.length === 0) {
            messagesArea.innerHTML = `
                <div class="empty-state" style="margin:auto;">
                    <p>No messages exchanged with <strong>${escapeHTML(partner.full_name)}</strong> yet.</p>
                    <p style="font-size:0.85rem; color:var(--text-muted);">Say hello! 👋</p>
                </div>
            `;
            return;
        }

        messagesArea.innerHTML = messages.map(m => {
            const isSent = m.sender_id === currentUser.id;
            const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const receipt = isSent ? (m.is_read ? ' • ✓✓ Read' : ' • ✓ Delivered') : '';

            let attachmentHtml = '';
            if (m.attachment_url) {
                if (m.attachment_type === 'image') {
                    attachmentHtml = `<img src="${m.attachment_url}" class="chat-attachment-img" alt="Attachment" onclick="window.open('${m.attachment_url}', '_blank')">`;
                } else if (m.attachment_type === 'video') {
                    attachmentHtml = `<video src="${m.attachment_url}" controls class="chat-attachment-video"></video>`;
                } else {
                    attachmentHtml = `
                        <a href="${m.attachment_url}" download="attachment" class="chat-attachment-file">
                            📄 Download Attachment File
                        </a>
                    `;
                }
            }

            const textHtml = m.message ? `<div>${escapeHTML(m.message)}</div>` : '';

            return `
                <div class="message-bubble ${isSent ? 'sent' : 'received'}">
                    ${attachmentHtml}
                    ${textHtml}
                    <div class="message-time">${timeStr}${receipt}</div>
                </div>
            `;
        }).join('');

        if (autoScroll) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    } catch (err) {
        console.error('Error loading chat history:', err);
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

window.openChatWindow = openChatWindow;
