/**
 * Amrani Parapharmacie - Messages Management Script
 * Reads/updates/deletes rows in the Supabase `messages` table.
 * New messages are expected to be inserted by the public website's contact form.
 */

// ==================== STATE ====================
const State = {
    messages: []
};

// ==================== DOM REFERENCES ====================
const DOM = {
    tableBody: document.getElementById('messagesTableBody'),
    resultsCount: document.getElementById('resultsCount'),
    emptyState: document.getElementById('emptyState'),

    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),

    refreshBtn: document.getElementById('refreshBtn'),
    markAllReadBtn: document.getElementById('markAllReadBtn'),

    unreadBadge: document.getElementById('unreadBadge'),
    notificationBadge: document.getElementById('notificationBadge'),

    viewModal: document.getElementById('viewModal'),
    viewMessageContent: document.getElementById('viewMessageContent'),
    closeViewBtn: document.getElementById('closeViewBtn'),
    closeViewModal: document.getElementById('closeViewModal'),
    viewToggleReadBtn: document.getElementById('viewToggleReadBtn'),
    viewDeleteBtn: document.getElementById('viewDeleteBtn'),

    deleteModal: document.getElementById('deleteModal'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    closeDeleteModal: document.getElementById('closeDeleteModal')
};

// ==================== HELPER FUNCTIONS ====================

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

function getRandomColor(name) {
    const colors = [
        '#2E7D32', '#1565C0', '#E65100', '#6A1B9A', '#00838F',
        '#AD1457', '#2E4053', '#1A237E', '#BF360C', '#1B5E20'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function showNotification(message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️', message, type);
        return;
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: var(--white);
        padding: 16px 20px;
        border-radius: var(--border-radius-sm);
        box-shadow: var(--shadow-xl);
        border: 1px solid var(--gray-200);
        border-left: 4px solid ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
        z-index: 10000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        color: var(--gray-700);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// ==================== DATA FETCHING ====================

async function loadMessages() {
    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        showNotification('Erreur lors du chargement des messages', 'error');
        return;
    }

    State.messages = data || [];
    renderMessagesTable();
}

// ==================== FILTERING ====================

function getFilteredMessages() {
    const search = DOM.searchInput.value.trim().toLowerCase();
    const status = DOM.statusFilter.value;

    let messages = [...State.messages];

    if (search) {
        messages = messages.filter(m =>
            m.name.toLowerCase().includes(search) ||
            (m.email || '').toLowerCase().includes(search) ||
            (m.phone || '').includes(search) ||
            m.message.toLowerCase().includes(search)
        );
    }

    if (status && status !== 'all') {
        const read = status === 'read';
        messages = messages.filter(m => m.read === read);
    }

    return messages;
}

function getUnreadCount() {
    return State.messages.filter(m => !m.read).length;
}

// ==================== RENDER FUNCTIONS ====================

function updateBadges() {
    const unreadCount = getUnreadCount();
    const badge = DOM.unreadBadge;
    const notifBadge = DOM.notificationBadge;

    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline';
        notifBadge.textContent = unreadCount;
        notifBadge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
        notifBadge.style.display = 'none';
    }
}

function renderMessagesTable() {
    const messages = getFilteredMessages();

    DOM.resultsCount.textContent = `${messages.length} message${messages.length > 1 ? 's' : ''}`;

    updateBadges();

    if (messages.length === 0) {
        DOM.tableBody.innerHTML = '';
        DOM.emptyState.style.display = 'block';
        return;
    }
    DOM.emptyState.style.display = 'none';

    DOM.tableBody.innerHTML = messages.map(message => {
        const isUnread = !message.read;
        const statusClass = isUnread ? 'unread' : 'read';
        const statusText = isUnread ? 'Unread' : 'Read';
        const avatarColor = getRandomColor(message.name);

        return `
            <tr class="${isUnread ? 'unread' : ''}">
                <td>
                    <div class="customer-cell">
                        <div class="customer-avatar ${isUnread ? 'unread-avatar' : 'read-avatar'}"
                             style="background: ${isUnread ? avatarColor : 'var(--gray-400)'}">
                            ${getInitials(message.name)}
                        </div>
                        <span class="customer-name">${message.name}</span>
                    </div>
                </td>
                <td>
                    <a href="mailto:${message.email || ''}" style="color: var(--gray-600); text-decoration: none; font-size: 13px;">
                        ${message.email || '-'}
                    </a>
                </td>
                <td class="phone-hide">
                    <a href="tel:${message.phone || ''}" style="color: var(--gray-600); text-decoration: none; font-size: 13px;">
                        ${message.phone || '-'}
                    </a>
                </td>
                <td>
                    <div class="message-preview" title="${message.message}">
                        ${message.message.length > 60 ? message.message.substring(0, 60) + '...' : message.message}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <span class="status-dot"></span>
                        ${statusText}
                    </span>
                </td>
                <td style="font-size: 13px; color: var(--gray-500); white-space: nowrap;">
                    ${formatDate(message.created_at)}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view-btn" data-id="${message.id}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn ${isUnread ? 'read-btn' : 'unread-btn'}"
                                data-id="${message.id}"
                                title="${isUnread ? 'Mark as Read' : 'Mark as Unread'}">
                            <i class="fas ${isUnread ? 'fa-check' : 'fa-undo'}"></i>
                        </button>
                        <button class="action-btn delete-btn" data-id="${message.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => openViewModal(btn.dataset.id));
    });

    document.querySelectorAll('.read-btn').forEach(btn => {
        btn.addEventListener('click', () => handleMarkRead(btn.dataset.id));
    });

    document.querySelectorAll('.unread-btn').forEach(btn => {
        btn.addEventListener('click', () => handleMarkUnread(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
}

// ==================== MODAL FUNCTIONS ====================

let currentViewMessageId = null;

function openViewModal(id) {
    const message = State.messages.find(m => m.id === id);
    if (!message) {
        showNotification('Message not found', 'error');
        return;
    }

    currentViewMessageId = id;
    const isUnread = !message.read;
    const statusText = isUnread ? 'Unread' : 'Read';
    const statusClass = isUnread ? 'unread' : 'read';
    const avatarColor = getRandomColor(message.name);

    DOM.viewToggleReadBtn.innerHTML = isUnread
        ? '<i class="fas fa-check"></i> Mark as Read'
        : '<i class="fas fa-undo"></i> Mark as Unread';
    DOM.viewToggleReadBtn.className = `btn ${isUnread ? 'btn-primary' : 'btn-outline'}`;

    DOM.viewMessageContent.innerHTML = `
        <div class="view-message">
            <div class="view-row">
                <span class="view-label">Name</span>
                <span class="view-value">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="customer-avatar ${isUnread ? 'unread-avatar' : 'read-avatar'}"
                             style="background: ${isUnread ? avatarColor : 'var(--gray-400)'}; width: 36px; height: 36px; font-size: 14px;">
                            ${getInitials(message.name)}
                        </div>
                        <strong>${message.name}</strong>
                    </div>
                </span>
            </div>
            <div class="view-row">
                <span class="view-label">Email</span>
                <span class="view-value">
                    <a href="mailto:${message.email || ''}" style="color: var(--primary); text-decoration: none;">
                        ${message.email || '-'}
                    </a>
                </span>
            </div>
            <div class="view-row">
                <span class="view-label">Phone</span>
                <span class="view-value">
                    <a href="tel:${message.phone || ''}" style="color: var(--gray-700); text-decoration: none;">
                        ${message.phone || '-'}
                    </a>
                </span>
            </div>
            <div class="view-row">
                <span class="view-label">Status</span>
                <span class="view-value">
                    <span class="view-status-badge ${statusClass}">
                        <span class="status-dot"></span>
                        ${statusText}
                    </span>
                </span>
            </div>
            <div class="view-row">
                <span class="view-label">Date</span>
                <span class="view-value" style="color: var(--gray-500);">
                    ${new Date(message.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                </span>
            </div>
            <div class="view-row" style="flex-direction: column; align-items: stretch; gap: 8px;">
                <span class="view-label" style="width: 100%;">Message</span>
                <div class="view-message-full">${message.message}</div>
            </div>
        </div>
    `;

    DOM.viewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openDeleteModal(id) {
    const message = State.messages.find(m => m.id === id);
    if (!message) {
        showNotification('Message not found', 'error');
        return;
    }

    DOM.confirmDeleteBtn.dataset.id = id;
    DOM.deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAllModals() {
    DOM.viewModal.classList.remove('active');
    DOM.deleteModal.classList.remove('active');
    document.body.style.overflow = '';
    currentViewMessageId = null;
}

// ==================== ACTION HANDLERS ====================

async function handleMarkRead(id) {
    const message = State.messages.find(m => m.id === id);
    if (!message) return;

    const { error } = await supabaseClient.from('messages').update({ read: true }).eq('id', id);
    if (error) {
        showNotification('Error updating message: ' + error.message, 'error');
        return;
    }

    showNotification(`✅ Message from "${message.name}" marked as read`, 'success');
    await loadMessages();
    if (currentViewMessageId === id) {
        openViewModal(id);
    }
}

async function handleMarkUnread(id) {
    const message = State.messages.find(m => m.id === id);
    if (!message) return;

    const { error } = await supabaseClient.from('messages').update({ read: false }).eq('id', id);
    if (error) {
        showNotification('Error updating message: ' + error.message, 'error');
        return;
    }

    showNotification(`↩️ Message from "${message.name}" marked as unread`, 'info');
    await loadMessages();
    if (currentViewMessageId === id) {
        openViewModal(id);
    }
}

async function handleDeleteMessage(id) {
    const message = State.messages.find(m => m.id === id);
    if (!message) return;

    const { error } = await supabaseClient.from('messages').delete().eq('id', id);
    if (error) {
        showNotification('Error deleting message: ' + error.message, 'error');
        return;
    }

    showNotification(`🗑️ Message from "${message.name}" deleted successfully!`, 'success');
    closeAllModals();
    await loadMessages();
}

async function handleMarkAllRead() {
    const unreadIds = State.messages.filter(m => !m.read).map(m => m.id);

    if (unreadIds.length === 0) {
        showNotification('All messages are already read', 'info');
        return;
    }

    const { error } = await supabaseClient.from('messages').update({ read: true }).in('id', unreadIds);
    if (error) {
        showNotification('Error updating messages: ' + error.message, 'error');
        return;
    }

    showNotification(`✅ ${unreadIds.length} message${unreadIds.length > 1 ? 's' : ''} marked as read`, 'success');
    await loadMessages();
}

async function handleRefresh() {
    const btn = DOM.refreshBtn;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    btn.disabled = true;

    await loadMessages();

    btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
    btn.disabled = false;
    showNotification('✅ Messages refreshed successfully', 'success');
}

// ==================== FILTER HANDLING ====================

function applyFilters() {
    renderMessagesTable();
}

function clearFilters() {
    DOM.searchInput.value = '';
    DOM.statusFilter.value = 'all';
    renderMessagesTable();
}

function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ==================== SIDEBAR TOGGLE ====================

function initSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    document.body.appendChild(overlay);

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        document.body.classList.toggle('sidebar-open');
    }

    menuToggle.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    });
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function() {
    await loadMessages();

    initSidebar();

    DOM.closeViewBtn.addEventListener('click', closeAllModals);
    DOM.closeViewModal.addEventListener('click', closeAllModals);

    DOM.viewToggleReadBtn.addEventListener('click', function() {
        if (currentViewMessageId) {
            const message = State.messages.find(m => m.id === currentViewMessageId);
            if (message) {
                if (message.read) {
                    handleMarkUnread(currentViewMessageId);
                } else {
                    handleMarkRead(currentViewMessageId);
                }
            }
        }
    });

    DOM.viewDeleteBtn.addEventListener('click', function() {
        if (currentViewMessageId) {
            const id = currentViewMessageId;
            closeAllModals();
            setTimeout(() => {
                openDeleteModal(id);
            }, 300);
        }
    });

    DOM.confirmDeleteBtn.addEventListener('click', function() {
        const id = this.dataset.id;
        handleDeleteMessage(id);
    });

    DOM.cancelDeleteBtn.addEventListener('click', closeAllModals);
    DOM.closeDeleteModal.addEventListener('click', closeAllModals);

    DOM.markAllReadBtn.addEventListener('click', handleMarkAllRead);
    DOM.refreshBtn.addEventListener('click', handleRefresh);

    DOM.searchInput.addEventListener('input', debounce(applyFilters, 300));
    DOM.statusFilter.addEventListener('change', applyFilters);
    DOM.clearFiltersBtn.addEventListener('click', clearFilters);

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAllModals();
            }
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    console.log('✉️ Messages Management initialized (Supabase)');
});
