/**
 * Amrani Parapharmacie - Promotions Management Script
 * Handles promotion CRUD operations with modals and filters
 */

// ==================== DATA STORE ====================
const PromotionsData = {
    promotions: [
        {
            id: 1,
            title_fr: 'Summer Sale',
            title_ar: 'تخفيضات الصيف',
            description_fr: 'Réduction sur tous les produits de la parapharmacie pendant l\'été.',
            description_ar: 'تخفيض على جميع منتجات الصيدلية خلال الصيف.',
            image_url: '',
            active: true,
            created_at: '2025-01-15T10:30:00'
        },
        {
            id: 2,
            title_fr: 'Special Offer - Vitamins',
            title_ar: 'عرض خاص - الفيتامينات',
            description_fr: 'Achetez 2 produits vitamines, obtenez le 3ème gratuit.',
            description_ar: 'اشترِ منتجين من الفيتامينات واحصل على الثالث مجاناً.',
            image_url: '',
            active: true,
            created_at: '2025-01-14T14:20:00'
        },
        {
            id: 3,
            title_fr: 'Winter Wellness',
            title_ar: 'العناية الشتوية',
            description_fr: 'Préparez-vous pour l\'hiver avec notre sélection de produits de santé.',
            description_ar: 'استعدوا للشتاء مع مجموعتنا من المنتجات الصحية.',
            image_url: '',
            active: false,
            created_at: '2024-12-20T09:15:00'
        },
        {
            id: 4,
            title_fr: 'New Year, New You',
            title_ar: 'عام جديد، أنت جديد',
            description_fr: 'Découvrez nos nouveautés pour bien commencer l\'année.',
            description_ar: 'اكتشفوا منتجاتنا الجديدة لبداية ممتازة للسنة.',
            image_url: '',
            active: true,
            created_at: '2025-01-01T08:00:00'
        },
        {
            id: 5,
            title_fr: 'Family Health Bundle',
            title_ar: 'حزمة صحة العائلة',
            description_fr: 'Ensemble de produits pour toute la famille à prix réduit.',
            description_ar: 'مجموعة منتجات للعائلة بأكملها بسعر مخفض.',
            image_url: '',
            active: false,
            created_at: '2024-12-10T11:45:00'
        }
    ],
    _nextId: 6
};

// ==================== DOM REFERENCES ====================
const DOM = {
    // Table
    tableBody: document.getElementById('promotionsTableBody'),
    resultsCount: document.getElementById('resultsCount'),
    emptyState: document.getElementById('emptyState'),
    
    // Filters
    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    
    // Add Button
    addPromotionBtn: document.getElementById('addPromotionBtn'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),
    
    // Modal - Promotion Form
    promotionModal: document.getElementById('promotionModal'),
    modalTitle: document.getElementById('modalTitle'),
    promotionId: document.getElementById('promotionId'),
    titleFr: document.getElementById('titleFr'),
    titleAr: document.getElementById('titleAr'),
    descFr: document.getElementById('descFr'),
    descAr: document.getElementById('descAr'),
    imageUrl: document.getElementById('imageUrl'),
    isActive: document.getElementById('isActive'),
    promotionForm: document.getElementById('promotionForm'),
    saveBtnText: document.getElementById('saveBtnText'),
    savePromotionBtn: document.getElementById('savePromotionBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    closeModal: document.getElementById('closeModal'),
    
    // Modal - View
    viewModal: document.getElementById('viewModal'),
    viewPromotionContent: document.getElementById('viewPromotionContent'),
    closeViewModal: document.getElementById('closeViewModal'),
    
    // Modal - Delete
    deleteModal: document.getElementById('deleteModal'),
    deletePromotionTitle: document.getElementById('deletePromotionTitle'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    closeDeleteModal: document.getElementById('closeDeleteModal')
};

// ==================== HELPER FUNCTIONS ====================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function showNotification(message, type = 'info') {
    // Reuse the notification system from dashboard
    if (window.showNotification) {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback notification
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

// ==================== PROMOTION CRUD OPERATIONS ====================

// Get all promotions (with optional filters)
function getPromotions(filters = {}) {
    let promotions = [...PromotionsData.promotions];
    
    // Search filter
    if (filters.search) {
        const search = filters.search.toLowerCase();
        promotions = promotions.filter(p => 
            p.title_fr.toLowerCase().includes(search) ||
            p.title_ar.includes(search) ||
            p.description_fr.toLowerCase().includes(search)
        );
    }
    
    // Status filter
    if (filters.status && filters.status !== 'all') {
        const active = filters.status === 'active';
        promotions = promotions.filter(p => p.active === active);
    }
    
    // Sort by created date (newest first)
    promotions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return promotions;
}

// Add new promotion
function addPromotion(promotionData) {
    const newPromotion = {
        id: PromotionsData._nextId++,
        ...promotionData,
        created_at: new Date().toISOString()
    };
    PromotionsData.promotions.push(newPromotion);
    return newPromotion;
}

// Update existing promotion
function updatePromotion(id, promotionData) {
    const index = PromotionsData.promotions.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    PromotionsData.promotions[index] = {
        ...PromotionsData.promotions[index],
        ...promotionData
    };
    return PromotionsData.promotions[index];
}

// Delete promotion
function deletePromotion(id) {
    const index = PromotionsData.promotions.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    PromotionsData.promotions.splice(index, 1);
    return true;
}

// Get promotion by ID
function getPromotionById(id) {
    return PromotionsData.promotions.find(p => p.id === id);
}

// Toggle promotion status
function togglePromotionStatus(id) {
    const promotion = getPromotionById(id);
    if (!promotion) return null;
    
    promotion.active = !promotion.active;
    return promotion;
}

// ==================== RENDER FUNCTIONS ====================

function renderPromotionsTable() {
    const search = DOM.searchInput.value.trim();
    const status = DOM.statusFilter.value;
    
    const filters = { search, status };
    const promotions = getPromotions(filters);
    
    // Update results count
    DOM.resultsCount.textContent = `${promotions.length} promotion${promotions.length > 1 ? 's' : ''}`;
    
    // Show/hide empty state
    if (promotions.length === 0) {
        DOM.tableBody.innerHTML = '';
        DOM.emptyState.style.display = 'block';
        return;
    }
    DOM.emptyState.style.display = 'none';
    
    // Render table rows
    DOM.tableBody.innerHTML = promotions.map(promotion => {
        const statusClass = promotion.active ? 'active' : 'inactive';
        const statusText = promotion.active ? 'Active' : 'Inactive';
        
        return `
            <tr>
                <td>
                    <div class="promotion-image-cell">
                        ${promotion.image_url 
                            ? `<img src="${promotion.image_url}" alt="${promotion.title_fr}" />` 
                            : `<i class="fas fa-bullhorn placeholder-icon"></i>`
                        }
                    </div>
                </td>
                <td>
                    <div class="promotion-title-cell">
                        ${promotion.title_fr}
                        <span class="promotion-title-ar">${promotion.title_ar}</span>
                    </div>
                </td>
                <td dir="rtl">${promotion.title_ar}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <span class="status-dot"></span>
                        ${statusText}
                    </span>
                </td>
                <td>${formatDate(promotion.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view-btn" data-id="${promotion.id}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit-btn" data-id="${promotion.id}" title="Edit">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="action-btn toggle-status-btn ${statusClass}" data-id="${promotion.id}" title="Toggle Status">
                            ${promotion.active ? '🔴' : '🟢'}
                        </button>
                        <button class="action-btn delete-btn" data-id="${promotion.id}" title="Delete">
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
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.toggle-status-btn').forEach(btn => {
        btn.addEventListener('click', () => handleToggleStatus(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)));
    });
}

// ==================== MODAL FUNCTIONS ====================

// Open Add Promotion Modal
function openAddModal() {
    DOM.promotionForm.reset();
    DOM.promotionId.value = '';
    DOM.isActive.checked = true;
    DOM.titleFr.classList.remove('error');
    DOM.titleAr.classList.remove('error');
    DOM.modalTitle.textContent = 'Add Promotion';
    DOM.saveBtnText.textContent = 'Save Promotion';
    DOM.savePromotionBtn.innerHTML = '<i class="fas fa-save"></i> Save Promotion';
    
    DOM.promotionModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        DOM.titleFr.focus();
    }, 150);
}

// Open Edit Promotion Modal
function openEditModal(id) {
    const promotion = getPromotionById(id);
    if (!promotion) {
        showNotification('Promotion not found', 'error');
        return;
    }
    
    DOM.promotionId.value = promotion.id;
    DOM.titleFr.value = promotion.title_fr;
    DOM.titleAr.value = promotion.title_ar;
    DOM.descFr.value = promotion.description_fr || '';
    DOM.descAr.value = promotion.description_ar || '';
    DOM.imageUrl.value = promotion.image_url || '';
    DOM.isActive.checked = promotion.active;
    DOM.titleFr.classList.remove('error');
    DOM.titleAr.classList.remove('error');
    DOM.modalTitle.textContent = 'Edit Promotion';
    DOM.saveBtnText.textContent = 'Update Promotion';
    DOM.savePromotionBtn.innerHTML = '<i class="fas fa-save"></i> Update Promotion';
    
    DOM.promotionModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Open View Promotion Modal
function openViewModal(id) {
    const promotion = getPromotionById(id);
    if (!promotion) {
        showNotification('Promotion not found', 'error');
        return;
    }
    
    DOM.viewPromotionContent.innerHTML = `
        <div class="view-promotion">
            ${promotion.image_url ? `
                <div class="view-row">
                    <span class="view-label">Image</span>
                    <span class="view-value">
                        <img src="${promotion.image_url}" alt="${promotion.title_fr}" class="view-image" />
                    </span>
                </div>
            ` : ''}
            <div class="view-row">
                <span class="view-label">Title (FR)</span>
                <span class="view-value">${promotion.title_fr}</span>
            </div>
            <div class="view-row">
                <span class="view-label">Title (AR)</span>
                <span class="view-value" dir="rtl">${promotion.title_ar}</span>
            </div>
            ${promotion.description_fr ? `
                <div class="view-row">
                    <span class="view-label">Description (FR)</span>
                    <span class="view-value">${promotion.description_fr}</span>
                </div>
            ` : ''}
            ${promotion.description_ar ? `
                <div class="view-row">
                    <span class="view-label">Description (AR)</span>
                    <span class="view-value" dir="rtl">${promotion.description_ar}</span>
                </div>
            ` : ''}
            <div class="view-row">
                <span class="view-label">Status</span>
                <span class="view-value">
                    <span class="badge ${promotion.active ? 'active' : 'inactive'}">
                        ${promotion.active ? '✅ Active' : '❌ Inactive'}
                    </span>
                </span>
            </div>
            <div class="view-row">
                <span class="view-label">Created</span>
                <span class="view-value">${new Date(promotion.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</span>
            </div>
        </div>
    `;
    
    DOM.viewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Open Delete Confirmation Modal
function openDeleteModal(id) {
    const promotion = getPromotionById(id);
    if (!promotion) {
        showNotification('Promotion not found', 'error');
        return;
    }
    
    DOM.deletePromotionTitle.textContent = promotion.title_fr;
    DOM.confirmDeleteBtn.dataset.id = id;
    DOM.deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close all modals
function closeAllModals() {
    DOM.promotionModal.classList.remove('active');
    DOM.viewModal.classList.remove('active');
    DOM.deleteModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== STATUS TOGGLE ====================

function handleToggleStatus(id) {
    const promotion = togglePromotionStatus(id);
    if (promotion) {
        const status = promotion.active ? 'activated' : 'deactivated';
        showNotification(`✅ Promotion "${promotion.title_fr}" ${status}!`, 'success');
        renderPromotionsTable();
    }
}

// ==================== FORM HANDLING ====================

function handlePromotionSubmit(e) {
    e.preventDefault();
    
    // Get values and trim
    const titleFr = DOM.titleFr.value.trim();
    const titleAr = DOM.titleAr.value.trim();
    const descFr = DOM.descFr.value.trim();
    const descAr = DOM.descAr.value.trim();
    const imageUrl = DOM.imageUrl.value.trim();
    const isActive = DOM.isActive.checked;
    
    // Validate French title
    if (!titleFr) {
        DOM.titleFr.classList.add('error');
        DOM.titleFr.focus();
        showNotification('Please enter the French title', 'error');
        return;
    }
    DOM.titleFr.classList.remove('error');
    
    // Validate Arabic title
    if (!titleAr) {
        DOM.titleAr.classList.add('error');
        DOM.titleAr.focus();
        showNotification('Please enter the Arabic title', 'error');
        return;
    }
    DOM.titleAr.classList.remove('error');
    
    const promotionData = {
        title_fr: titleFr,
        title_ar: titleAr,
        description_fr: descFr,
        description_ar: descAr,
        image_url: imageUrl,
        active: isActive
    };
    
    const promotionId = DOM.promotionId.value;
    let result;
    
    if (promotionId) {
        // Update existing promotion
        result = updatePromotion(parseInt(promotionId), promotionData);
        if (result) {
            showNotification(`✅ Promotion "${result.title_fr}" updated successfully!`, 'success');
        }
    } else {
        // Add new promotion
        result = addPromotion(promotionData);
        showNotification(`✅ Promotion "${result.title_fr}" added successfully!`, 'success');
    }
    
    closeAllModals();
    renderPromotionsTable();
}

// ==================== FILTER HANDLING ====================

function applyFilters() {
    renderPromotionsTable();
}

function clearFilters() {
    DOM.searchInput.value = '';
    DOM.statusFilter.value = 'all';
    renderPromotionsTable();
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
    renderPromotionsTable();
    
    // Sidebar
    initSidebar();
    
    // Event Listeners - Add buttons
    DOM.addPromotionBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openAddModal();
    });
    
    DOM.emptyAddBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openAddModal();
    });
    
    // Form submission
    DOM.promotionForm.addEventListener('submit', handlePromotionSubmit);
    
    // Close modal buttons
    DOM.cancelModalBtn.addEventListener('click', closeAllModals);
    DOM.closeModal.addEventListener('click', closeAllModals);
    DOM.closeViewModal.addEventListener('click', closeAllModals);
    DOM.closeDeleteModal.addEventListener('click', closeAllModals);
    DOM.cancelDeleteBtn.addEventListener('click', closeAllModals);
    
    // Delete confirmation
    DOM.confirmDeleteBtn.addEventListener('click', function() {
        const id = parseInt(this.dataset.id);
        const promotion = getPromotionById(id);
        if (promotion && deletePromotion(id)) {
            showNotification(`🗑️ Promotion "${promotion.title_fr}" deleted successfully!`, 'success');
            closeAllModals();
            renderPromotionsTable();
        }
    });
    
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
    
    console.log('📢 Promotions Management initialized');
    console.log(`🎯 ${PromotionsData.promotions.length} promotions loaded`);
});

// ==================== EXPOSE FOR DEBUGGING ====================
window.PromotionsData = PromotionsData;
window.getPromotions = getPromotions;
window.addPromotion = addPromotion;
window.updatePromotion = updatePromotion;
window.deletePromotion = deletePromotion;
window.togglePromotionStatus = togglePromotionStatus;