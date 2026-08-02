/**
 * Amrani Parapharmacie - Messages Management Script
 * Handles message CRUD operations with modals and filters
 */

// ==================== DATA STORE ====================
const MessagesData = {
    messages: [
        {
            id: 1,
            name: 'Ahmed Benali',
            email: 'ahmed.benali@email.com',
            phone: '0612345678',
            message: 'Bonjour, je voudrais des informations sur le Paracétamol 500mg. Est-ce qu\'il est disponible en pharmacie ? J\'ai également une question concernant les contre-indications. Merci d\'avance pour votre réponse.',
            read: false,
            created_at: '2025-01-15T09:30:00'
        },
        {
            id: 2,
            name: 'Sofia El Amrani',
            email: 'sofia.elamrani@email.com',
            phone: '0623456789',
            message: 'Est-ce que vous livrez à Casablanca ? Je suis intéressée par plusieurs produits et je voudrais connaître les frais de livraison. Avez-vous aussi des promotions en cours ?',
            read: false,
            created_at: '2025-01-14T18:20:00'
        },
        {
            id: 3,
            name: 'Karim Bensaid',
            email: 'karim.bensaid@email.com',
            phone: '0634567890',
            message: 'J\'ai reçu ma commande aujourd\'hui, tout est parfait ! Les produits sont bien emballés et la livraison a été rapide. Je recommande vivement votre parapharmacie.',
            read: true,
            created_at: '2025-01-13T11:10:00'
        },
        {
            id: 4,
            name: 'Nadia Tazi',
            email: 'nadia.tazi@email.com',
            phone: '0645678901',
            message: 'Bonjour, je cherche une crème hydratante pour peau sensible sans parfum. Pouvez-vous me conseiller ? J\'ai essayé plusieurs marques sans succès.',
            read: false,
            created_at: '2025-01-12T14:45:00'
        },
        {
            id: 5,
            name: 'Youssef Mansouri',
            email: 'youssef.mansouri@email.com',
            phone: '0656789012',
            message: 'Je souhaite commander des vitamines mais je ne sais pas lesquelles choisir. Avez-vous des conseils pour renforcer le système immunitaire en hiver ?',
            read: true,
            created_at: '2025-01-11T09:00:00'
        },
        {
            id: 6,
            name: 'Leila Fassi',
            email: 'leila.fassi@email.com',
            phone: '0667890123',
            message: 'Bonjour, je viens de découvrir votre site et je suis très satisfaite des produits. J\'aimerais savoir si vous avez une application mobile.',
            read: false,
            created_at: '2025-01-10T16:30:00'
        }
    ],
    _nextId: 7
};

// ==================== DOM REFERENCES ====================
const DOM = {
    // Table
    tableBody: document.getElementById('messagesTableBody'),
    resultsCount: document.getElementById('resultsCount'),
    emptyState: document.getElementById('emptyState'),
    
    // Filters
    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    
    // Actions
    refreshBtn: document.getElementById('refreshBtn'),
    markAllReadBtn: document.getElementById('markAllReadBtn'),
    
    // Badges
    unreadBadge: document.getElementById('unreadBadge'),
    notificationBadge: document.getElementById('notificationBadge'),
    
    // Modal - View
    viewModal: document.getElementById('viewModal'),
    viewMessageContent: document.getElementById('viewMessageContent'),
    closeViewBtn: document.getElementById('closeViewBtn'),
    closeViewModal: document.getElementById('closeViewModal'),
    viewToggleReadBtn: document.getElementById('viewToggleReadBtn'),
    viewDeleteBtn: document.getElementById('viewDeleteBtn'),
    
    // Modal - Delete
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
    return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
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
        window.showNotification(message, type);
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

// ==================== MESSAGE CRUD OPERATIONS ====================

// Get all messages (with optional filters)
function getMessages(filters = {}) {
    let messages = [...MessagesData.messages];
    
    // Search filter
    if (filters.search) {
        const search = filters.search.toLowerCase().trim();
        messages = messages.filter(m => 
            m.name.toLowerCase().includes(search) ||
            m.email.toLowerCase().includes(search) ||
            m.phone.includes(search) ||
            m.message.toLowerCase().includes(search)
        );
    }
    
    // Status filter
    if (filters.status && filters.status !== 'all') {
        const read = filters.status === 'read';
        messages = messages.filter(m => m.read === read);
    }
    
    // Sort by created date (newest first)
    messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return messages;
}

// Get message by ID
function getMessageById(id) {
    return MessagesData.messages.find(m => m.id === id);
}

// Mark message as read
function markAsRead(id) {
    const message = getMessageById(id);
    if (!message) return null;
    message.read = true;
    return message;
}

// Mark message as unread
function markAsUnread(id) {
    const message = getMessageById(id);
    if (!message) return null;
    message.read = false;
    return message;
}

// Delete message
function deleteMessage(id) {
    const index = MessagesData.messages.findIndex(m => m.id === id);
    if (index === -1) return false;
    MessagesData.messages.splice(index, 1);
    return true;
}

// Mark all messages as read
function markAllAsRead() {
    let count = 0;
    MessagesData.messages.forEach(m => {
        if (!m.read) {
            m.read = true;
            count++;
        }
    });
    return count;
}

// Get unread count
function getUnreadCount() {
    return MessagesData.messages.filter(m => !m.read).length;
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
    const search = DOM.searchInput.value.trim();
    const status = DOM.statusFilter.value;
    
    const filters = { search, status };
    const messages = getMessages(filters);
    
    // Update results count
    DOM.resultsCount.textContent = `${messages.length} message${messages.length > 1 ? 's' : ''}`;
    
    // Update badges
    updateBadges();
    
    // Show/hide empty state
    if (messages.length === 0) {
        DOM.tableBody.innerHTML = '';
        DOM.emptyState.style.display = 'block';
        return;
    }
    DOM.emptyState.style.display = 'none';
    
    // Render table rows
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
                    <a href="mailto:${message.email}" style="color: var(--gray-600); text-decoration: none; font-size: 13px;">
                        ${message.email}
                    </a>
                </td>
                <td class="phone-hide">
                    <a href="tel:${message.phone}" style="color: var(--gray-600); text-decoration: none; font-size: 13px;">
                        ${message.phone}
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
    
    // Attach event listeners to action buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => openViewModal(parseInt(btn.dataset.id)));
    });
    
    document.querySelectorAll('.read-btn').forEach(btn => {
        btn.addEventListener('click', () => handleMarkRead(parseInt(btn.dataset.id)));
    });
    
    document.querySelectorAll('.unread-btn').forEach(btn => {
        btn.addEventListener('click', () => handleMarkUnread(parseInt(btn.dataset.id)));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)));
    });
}

// ==================== MODAL FUNCTIONS ====================

let currentViewMessageId = null;

// Open View Message Modal
function openViewModal(id) {
    const message = getMessageById(id);
    if (!message) {
        showNotification('Message not found', 'error');
        return;
    }
    
    currentViewMessageId = id;
    const isUnread = !message.read;
    const statusText = isUnread ? 'Unread' : 'Read';
    const statusClass = isUnread ? 'unread' : 'read';
    const avatarColor = getRandomColor(message.name);
    
    // Update button text
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
                    <a href="mailto:${message.email}" style="color: var(--primary); text-decoration: none;">
                        ${message.email}
                    </a>
                </span>
            </div>
            <div class="view-row">
                <span class="view-label">Phone</span>
                <span class="view-value">
                    <a href="tel:${message.phone}" style="color: var(--gray-700); text-decoration: none;">
                        ${message.phone}
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
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
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

// Open Delete Confirmation Modal
function openDeleteModal(id) {
    const message = getMessageById(id);
    if (!message) {
        showNotification('Message not found', 'error');
        return;
    }
    
    DOM.confirmDeleteBtn.dataset.id = id;
    DOM.deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close all modals
function closeAllModals() {
    DOM.viewModal.classList.remove('active');
    DOM.deleteModal.classList.remove('active');
    document.body.style.overflow = '';
    currentViewMessageId = null;
}

// ==================== ACTION HANDLERS ====================

function handleMarkRead(id) {
    const message = markAsRead(id);
    if (message) {
        showNotification(`✅ Message from "${message.name}" marked as read`, 'success');
        renderMessagesTable();
        // If view modal is open, refresh it
        if (currentViewMessageId === id) {
            openViewModal(id);
        }
    }
}

function handleMarkUnread(id) {
    const message = markAsUnread(id);
    if (message) {
        showNotification(`↩️ Message from "${message.name}" marked as unread`, 'info');
        renderMessagesTable();
        // If view modal is open, refresh it
        if (currentViewMessageId === id) {
            openViewModal(id);
        }
    }
}

function handleDeleteMessage(id) {
    const message = getMessageById(id);
    if (message && deleteMessage(id)) {
        showNotification(`🗑️ Message from "${message.name}" deleted successfully!`, 'success');
        closeAllModals();
        renderMessagesTable();
    }
}

function handleMarkAllRead() {
    const count = markAllAsRead();
    if (count > 0) {
        showNotification(`✅ ${count} message${count > 1 ? 's' : ''} marked as read`, 'success');
        renderMessagesTable();
    } else {
        showNotification('All messages are already read', 'info');
    }
}

function handleRefresh() {
    const btn = DOM.refreshBtn;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    btn.disabled = true;
    
    setTimeout(() => {
        renderMessagesTable();
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        btn.disabled = false;
        showNotification('✅ Messages refreshed successfully', 'success');
    }, 600);
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

// ==================== SEARCH DEBOUNCE ====================

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

document.addEventListener('DOMContentLoaded', function() {
    // Initial render
    renderMessagesTable();
    
    // Sidebar
    initSidebar();
    
    // Event Listeners - View Modal
    DOM.closeViewBtn.addEventListener('click', closeAllModals);
    DOM.closeViewModal.addEventListener('click', closeAllModals);
    
    // View Modal - Toggle Read
    DOM.viewToggleReadBtn.addEventListener('click', function() {
        if (currentViewMessageId) {
            const message = getMessageById(currentViewMessageId);
            if (message) {
                if (message.read) {
                    handleMarkUnread(currentViewMessageId);
                } else {
                    handleMarkRead(currentViewMessageId);
                }
            }
        }
    });
    
    // View Modal - Delete
    DOM.viewDeleteBtn.addEventListener('click', function() {
        if (currentViewMessageId) {
            closeAllModals();
            setTimeout(() => {
                openDeleteModal(currentViewMessageId);
            }, 300);
        }
    });
    
    // Delete Modal
    DOM.confirmDeleteBtn.addEventListener('click', function() {
        const id = parseInt(this.dataset.id);
        handleDeleteMessage(id);
    });
    
    DOM.cancelDeleteBtn.addEventListener('click', closeAllModals);
    DOM.closeDeleteModal.addEventListener('click', closeAllModals);
    
    // Bulk actions
    DOM.markAllReadBtn.addEventListener('click', handleMarkAllRead);
    DOM.refreshBtn.addEventListener('click', handleRefresh);
    
    // Filters
    DOM.searchInput.addEventListener('input', debounce(applyFilters, 300));
    DOM.statusFilter.addEventListener('change', applyFilters);
    DOM.clearFiltersBtn.addEventListener('click', clearFilters);
    
    // Click outside modal to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAllModals();
            }
        });
    });
    
    // Keyboard shortcut: Escape to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    console.log('✉️ Messages Management initialized');
    console.log(`📨 ${MessagesData.messages.length} messages loaded`);
});

// ==================== EXPOSE FOR DEBUGGING ====================
window.MessagesData = MessagesData;
window.getMessages = getMessages;
window.markAsRead = markAsRead;
window.markAsUnread = markAsUnread;
window.deleteMessage = deleteMessage;
window.markAllAsRead = markAllAsRead;