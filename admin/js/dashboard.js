/**
 * Amrani Parapharmacie - Dashboard Script
 * Handles dashboard functionality, statistics, and real-time data
 */

// ==================== DATA STORE ====================
const AppData = {
    products: [
        {
            id: 1,
            name_fr: 'Paracétamol 500mg',
            name_ar: 'باراسيتامول 500 ملغ',
            brand: 'Doliprane',
            price: 45.00,
            category_id: 1,
            image_url: '',
            is_available: true,
            is_featured: true,
            created_at: '2025-01-15T10:30:00'
        },
        {
            id: 2,
            name_fr: 'Ibuprofène 400mg',
            name_ar: 'إيبوبروفين 400 ملغ',
            brand: 'Advil',
            price: 65.00,
            category_id: 1,
            image_url: '',
            is_available: true,
            is_featured: false,
            created_at: '2025-01-14T14:20:00'
        },
        {
            id: 3,
            name_fr: 'Amoxicilline 500mg',
            name_ar: 'أموكسيسيلين 500 ملغ',
            brand: 'Clamoxyl',
            price: 85.00,
            category_id: 1,
            image_url: '',
            is_available: true,
            is_featured: true,
            created_at: '2025-01-13T09:15:00'
        },
        {
            id: 4,
            name_fr: 'Vitamine C 1000mg',
            name_ar: 'فيتامين سي 1000 ملغ',
            brand: 'UPSA',
            price: 35.00,
            category_id: 2,
            image_url: '',
            is_available: false,
            is_featured: false,
            created_at: '2025-01-12T11:45:00'
        },
        {
            id: 5,
            name_fr: 'Zinc 15mg',
            name_ar: 'زنك 15 ملغ',
            brand: 'Zincor',
            price: 25.00,
            category_id: 2,
            image_url: '',
            is_available: true,
            is_featured: false,
            created_at: '2025-01-11T16:00:00'
        }
    ],
    categories: [
        { id: 1, name_fr: 'Médicaments', name_ar: 'أدوية', image_url: '' },
        { id: 2, name_fr: 'Vitamines', name_ar: 'فيتامينات', image_url: '' },
        { id: 3, name_fr: 'Cosmétiques', name_ar: 'مستحضرات تجميل', image_url: '' }
    ],
    promotions: [
        { id: 1, title_fr: 'Promotion été', title_ar: 'تخفيضات الصيف', description_fr: 'Réduction sur tous les produits', description_ar: 'تخفيض على جميع المنتجات', image_url: '', active: true },
        { id: 2, title_fr: 'Offre spéciale', title_ar: 'عرض خاص', description_fr: 'Sur les vitamines', description_ar: 'على الفيتامينات', image_url: '', active: true }
    ],
    messages: [
        { id: 1, name: 'Ahmed Benali', email: 'ahmed@email.com', phone: '0612345678', message: 'Bonjour, je voudrais des informations sur le produit X.', read: false, created_at: '2025-01-15T09:30:00' },
        { id: 2, name: 'Sofia El Amrani', email: 'sofia@email.com', phone: '0623456789', message: 'Est-ce que vous livrez à Casablanca?', read: false, created_at: '2025-01-14T18:20:00' },
        { id: 3, name: 'Karim Bensaid', email: 'karim@email.com', phone: '0634567890', message: 'J\'ai reçu ma commande, tout est parfait !', read: true, created_at: '2025-01-13T11:10:00' }
    ],
    settings: {
        pharmacy_name: 'Amrani Parapharmacie',
        logo_url: '',
        hero_title_fr: 'Bienvenue à la Parapharmacie Amrani',
        hero_title_ar: 'مرحباً بكم في صيدلية العمري',
        hero_description_fr: 'Votre santé est notre priorité',
        hero_description_ar: 'صحتكم هي أولويتنا',
        phone: '05 22 33 44 55',
        whatsapp: '06 12 34 56 78',
        instagram: '@amrani_parapharmacie',
        address: '123 Boulevard Mohammed V, Casablanca',
        opening_hours: 'Lun - Sam: 9h - 20h'
    }
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
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} h`;
    if (diffDays < 7) return `${diffDays} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatPrice(price) {
    return price.toFixed(2) + ' DH';
}

function getCategoryName(id) {
    const category = AppData.categories.find(c => c.id === id);
    return category ? category.name_fr : 'Non catégorisé';
}

function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

// ==================== DASHBOARD RENDER FUNCTIONS ====================

// 1. Update Statistics Cards
function updateStats() {
    const totalProducts = AppData.products.length;
    const totalCategories = AppData.categories.length;
    const activePromotions = AppData.promotions.filter(p => p.active).length;
    const unreadMessages = AppData.messages.filter(m => !m.read).length;
    
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalCategories').textContent = totalCategories;
    document.getElementById('activePromotions').textContent = activePromotions;
    document.getElementById('unreadMessages').textContent = unreadMessages;
}

// 2. Render Recent Products
function renderRecentProducts() {
    const tbody = document.getElementById('recentProductsTable');
    const recent = AppData.products.slice(0, 4);
    
    if (recent.length === 0) {
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
    
    tbody.innerHTML = recent.map(product => `
        <tr>
            <td>
                <div class="product-cell">
                    <div class="product-thumb placeholder">
                        <i class="fas fa-capsules"></i>
                    </div>
                    <span>${product.name_fr}</span>
                </div>
            </td>
            <td>${product.brand}</td>
            <td>${formatPrice(product.price)}</td>
            <td>
                <span class="status-badge ${product.is_available ? 'available' : 'unavailable'}">
                    ${product.is_available ? 'Disponible' : 'Indisponible'}
                </span>
            </td>
        </tr>
    `).join('');
}

// 3. Render Recent Messages
function renderRecentMessages() {
    const container = document.getElementById('recentMessagesList');
    const recent = AppData.messages.slice(0, 3);
    
    if (recent.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--gray-400);">
                <i class="fas fa-inbox" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                Aucun message pour le moment
            </div>
        `;
        return;
    }
    
    container.innerHTML = recent.map(message => `
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

// 4. Render Activity Feed
function renderActivity() {
    const list = document.getElementById('activityList');
    const activities = [
        { type: 'product', action: 'a ajouté', target: AppData.products[0]?.name_fr || 'un produit', time: 'Il y a 5 min' },
        { type: 'promotion', action: 'a créé', target: AppData.promotions[0]?.title_fr || 'une promotion', time: 'Il y a 2 h' },
        { type: 'message', action: 'a reçu', target: 'un message de ' + AppData.messages[0]?.name || 'un client', time: 'Il y a 4 h' },
        { type: 'product', action: 'a modifié', target: AppData.products[1]?.name_fr || 'un produit', time: 'Il y a 6 h' },
        { type: 'settings', action: 'a mis à jour', target: 'les horaires', time: 'Il y a 8 h' }
    ];
    
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
    const mainWrapper = document.querySelector('.main-wrapper');
    
    // Create overlay for mobile
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
    
    // Close sidebar on escape key
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
                // Simulate search - just log for now
                console.log('Searching for:', query);
                // In a real app, you'd filter and display results
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
            const actions = {
                product: () => showNotification('📦', 'Ouvrir le formulaire d\'ajout de produit', 'info'),
                category: () => showNotification('🏷️', 'Ouvrir le formulaire d\'ajout de catégorie', 'info'),
                promotion: () => showNotification('📢', 'Ouvrir le formulaire de promotion', 'info'),
                message: () => {
                    window.location.href = 'messages.html';
                }
            };
            
            if (actions[action]) {
                actions[action]();
            }
        });
    });
    
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            showNotification('📦', 'Redirection vers l\'ajout de produit', 'info');
            // In a real app: window.location.href = 'products.html?action=add';
        });
    }
}

// ==================== REFRESH ====================
function initRefresh() {
    const refreshBtn = document.getElementById('refreshBtn');
    
    refreshBtn.addEventListener('click', function() {
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rafraîchissement...';
        this.disabled = true;
        
        setTimeout(() => {
            renderDashboard();
            this.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            this.disabled = false;
            showNotification('✅', 'Données actualisées avec succès', 'success');
        }, 800);
    });
}

// ==================== NOTIFICATION SYSTEM ====================
function showNotification(icon, message, type = 'info') {
    // Remove existing notification
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
    
    // Styles
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
    
    // Add styles for dark variants
    if (type === 'success') {
        toast.style.borderLeft = '4px solid var(--success)';
    } else if (type === 'error') {
        toast.style.borderLeft = '4px solid var(--danger)';
    } else {
        toast.style.borderLeft = '4px solid var(--primary)';
    }
    
    // Close button
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
    
    // Icon styles
    const iconSpan = toast.querySelector('.notification-icon');
    iconSpan.style.fontSize = '20px';
    
    // Message styles
    const msgSpan = toast.querySelector('.notification-message');
    msgSpan.style.fontSize = '14px';
    msgSpan.style.color = 'var(--gray-700)';
    msgSpan.style.flex = '1';
    
    document.body.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// ==================== RENDER ALL ====================
function renderDashboard() {
    updateStats();
    renderRecentProducts();
    renderRecentMessages();
    renderActivity();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Initialize all components
    renderDashboard();
    initSidebar();
    initSearch();
    initQuickActions();
    initRefresh();
    
    console.log('🚀 Amrani Parapharmacie Dashboard initialized');
    console.log(`📦 ${AppData.products.length} products, ${AppData.messages.length} messages`);
});

// ==================== EXPOSE FOR DEBUGGING ====================
window.AppData = AppData;
window.showNotification = showNotification;