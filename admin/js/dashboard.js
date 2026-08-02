/**
 * Amrani Parapharmacie - Dashboard Script
 * Pulls live statistics and recent activity from Supabase.
 */

// ==================== HELPER FUNCTIONS ====================
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} h`;
    if (diffDays < 7) return `${diffDays} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatPrice(price) {
    return Number(price || 0).toFixed(2) + ' DH';
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

// ==================== DATA FETCHING ====================
async function fetchDashboardData() {
    const [
        productsCountRes,
        categoriesCountRes,
        activePromotionsCountRes,
        unreadMessagesCountRes,
        recentProductsRes,
        recentMessagesRes,
        recentPromotionsRes
    ] = await Promise.all([
        supabaseClient.from('products').select('*', { count: 'exact', head: true }),
        supabaseClient.from('categories').select('*', { count: 'exact', head: true }),
        supabaseClient.from('promotions').select('*', { count: 'exact', head: true }).eq('active', true),
        supabaseClient.from('messages').select('*', { count: 'exact', head: true }).eq('read', false),
        supabaseClient.from('products').select('*').order('created_at', { ascending: false }).limit(4),
        supabaseClient.from('messages').select('*').order('created_at', { ascending: false }).limit(3),
        supabaseClient.from('promotions').select('*').order('created_at', { ascending: false }).limit(1)
    ]);

    return {
        totalProducts: productsCountRes.count || 0,
        totalCategories: categoriesCountRes.count || 0,
        activePromotions: activePromotionsCountRes.count || 0,
        unreadMessages: unreadMessagesCountRes.count || 0,
        recentProducts: recentProductsRes.data || [],
        recentMessages: recentMessagesRes.data || [],
        recentPromotions: recentPromotionsRes.data || []
    };
}

// ==================== RENDER FUNCTIONS ====================

function updateStats(data) {
    document.getElementById('totalProducts').textContent = data.totalProducts;
    document.getElementById('totalCategories').textContent = data.totalCategories;
    document.getElementById('activePromotions').textContent = data.activePromotions;
    document.getElementById('unreadMessages').textContent = data.unreadMessages;
}

function renderRecentProducts(products) {
    const tbody = document.getElementById('recentProductsTable');

    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 30px; color: var(--gray-400);">
                    <i class="fas fa-inbox" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                    Aucun produit pour le moment
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td>
                <div class="product-cell">
                    <div class="product-thumb placeholder">
                        <i class="fas fa-capsules"></i>
                    </div>
                    <span>${product.name_fr}</span>
                </div>
            </td>
            <td>${product.brand || '-'}</td>
            <td>${formatPrice(product.price)}</td>
            <td>
                <span class="status-badge ${product.is_available ? 'available' : 'unavailable'}">
                    ${product.is_available ? 'Disponible' : 'Indisponible'}
                </span>
            </td>
        </tr>
    `).join('');
}

function renderRecentMessages(messages) {
    const container = document.getElementById('recentMessagesList');

    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--gray-400);">
                <i class="fas fa-inbox" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                Aucun message pour le moment
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(message => `
        <div class="message-item ${message.read ? '' : 'unread'}">
            <div class="message-avatar">${getInitials(message.name)}</div>
            <div class="message-content">
                <div class="name">${message.name}</div>
                <div class="preview">${message.message.substring(0, 60)}${message.message.length > 60 ? '...' : ''}</div>
            </div>
            <div class="message-time">${formatDate(message.created_at)}</div>
        </div>
    `).join('');
}

function renderActivity(data) {
    const list = document.getElementById('activityList');
    const activities = [];

    if (data.recentProducts[0]) {
        activities.push({ type: 'product', action: 'Dernier produit ajouté', target: data.recentProducts[0].name_fr, time: formatDate(data.recentProducts[0].created_at) });
    }
    if (data.recentPromotions[0]) {
        activities.push({ type: 'promotion', action: 'Dernière promotion', target: data.recentPromotions[0].title_fr, time: formatDate(data.recentPromotions[0].created_at) });
    }
    if (data.recentMessages[0]) {
        activities.push({ type: 'message', action: 'Dernier message de', target: data.recentMessages[0].name, time: formatDate(data.recentMessages[0].created_at) });
    }

    if (activities.length === 0) {
        list.innerHTML = `<li class="activity-item">Aucune activité récente</li>`;
        return;
    }

    const icons = {
        product: 'fa-capsules',
        promotion: 'fa-bullhorn',
        message: 'fa-envelope',
        settings: 'fa-cog'
    };

    list.innerHTML = activities.map(activity => `
        <li class="activity-item">
            <i class="fas ${icons[activity.type] || 'fa-circle'}"></i>
            <span>
                <span class="highlight">${activity.action}</span> ${activity.target}
            </span>
            <span class="time">${activity.time}</span>
        </li>
    `).join('');
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

// ==================== SEARCH ====================
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;

    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = this.value.trim().toLowerCase();
            if (query.length >= 2) {
                console.log('Searching for:', query);
            }
        }, 300);
    });
}

// ==================== QUICK ACTIONS ====================
function initQuickActions() {
    const actionBtns = document.querySelectorAll('.action-btn');
    const addProductBtn = document.getElementById('addProductQuick');

    actionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            const pages = {
                product: 'products.html',
                category: 'categories.html',
                promotion: 'promotions.html',
                message: 'messages.html'
            };
            if (pages[action]) {
                window.location.href = pages[action];
            }
        });
    });

    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            window.location.href = 'products.html';
        });
    }
}

// ==================== REFRESH ====================
function initRefresh() {
    const refreshBtn = document.getElementById('refreshBtn');

    refreshBtn.addEventListener('click', async function() {
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rafraîchissement...';
        this.disabled = true;

        await renderDashboard();

        this.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        this.disabled = false;
        showNotification('✅', 'Données actualisées avec succès', 'success');
    });
}

// ==================== NOTIFICATION SYSTEM ====================
function showNotification(icon, message, type = 'info') {
    const existing = document.querySelector('.notification-toast');
    if (existing) {
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${type}`;
    toast.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
    `;

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: 'var(--white)',
        padding: '16px 20px',
        borderRadius: 'var(--border-radius-sm)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--gray-200)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: '10000',
        maxWidth: '400px',
        animation: 'slideInRight 0.3s ease',
        fontFamily: 'Inter, sans-serif'
    });

    if (type === 'success') {
        toast.style.borderLeft = '4px solid var(--success)';
    } else if (type === 'error') {
        toast.style.borderLeft = '4px solid var(--danger)';
    } else {
        toast.style.borderLeft = '4px solid var(--primary)';
    }

    const closeBtn = toast.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        color: var(--gray-400);
        cursor: pointer;
        padding: 0 4px;
        transition: color var(--transition);
    `;
    closeBtn.addEventListener('click', () => toast.remove());
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = 'var(--gray-600)');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = 'var(--gray-400)');

    const iconSpan = toast.querySelector('.notification-icon');
    iconSpan.style.fontSize = '20px';

    const msgSpan = toast.querySelector('.notification-message');
    msgSpan.style.fontSize = '14px';
    msgSpan.style.color = 'var(--gray-700)';
    msgSpan.style.flex = '1';

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// ==================== RENDER ALL ====================
async function renderDashboard() {
    try {
        const data = await fetchDashboardData();
        updateStats(data);
        renderRecentProducts(data.recentProducts);
        renderRecentMessages(data.recentMessages);
        renderActivity(data);
    } catch (err) {
        console.error('Dashboard load error:', err);
        showNotification('⚠️', 'Erreur lors du chargement des données', 'error');
    }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    renderDashboard();
    initSidebar();
    initSearch();
    initQuickActions();
    initRefresh();

    console.log('🚀 Amrani Parapharmacie Dashboard initialized (Supabase)');
});

window.showNotification = showNotification;
