/**
 * Amrani Parapharmacie - Promotions Management Script
 * Full CRUD against the Supabase `promotions` table.
 */

// ==================== STATE ====================
const State = {
    promotions: []
};

// ==================== DOM REFERENCES ====================
const DOM = {
    tableBody: document.getElementById('promotionsTableBody'),
    resultsCount: document.getElementById('resultsCount'),
    emptyState: document.getElementById('emptyState'),

    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),

    addPromotionBtn: document.getElementById('addPromotionBtn'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),

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

    viewModal: document.getElementById('viewModal'),
    viewPromotionContent: document.getElementById('viewPromotionContent'),
    closeViewModal: document.getElementById('closeViewModal'),

    deleteModal: document.getElementById('deleteModal'),
    deletePromotionTitle: document.getElementById('deletePromotionTitle'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    closeDeleteModal: document.getElementById('closeDeleteModal')
};

// ==================== HELPER FUNCTIONS ====================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
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

async function loadPromotions() {
    const { data, error } = await supabaseClient
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        showNotification('Erreur lors du chargement des promotions', 'error');
        return;
    }

    State.promotions = data || [];
    renderPromotionsTable();
}

// ==================== FILTERING ====================

function getFilteredPromotions() {
    const search = DOM.searchInput.value.trim().toLowerCase();
    const status = DOM.statusFilter.value;

    let promotions = [...State.promotions];

    if (search) {
        promotions = promotions.filter(p =>
            p.title_fr.toLowerCase().includes(search) ||
            (p.title_ar || '').includes(search) ||
            (p.description_fr || '').toLowerCase().includes(search)
        );
    }

    if (status && status !== 'all') {
        const active = status === 'active';
        promotions = promotions.filter(p => p.active === active);
    }

    return promotions;
}

// ==================== RENDER FUNCTIONS ====================

function renderPromotionsTable() {
    const promotions = getFilteredPromotions();

    DOM.resultsCount.textContent = `${promotions.length} promotion${promotions.length > 1 ? 's' : ''}`;

    if (promotions.length === 0) {
        DOM.tableBody.innerHTML = '';
        DOM.emptyState.style.display = 'block';
        return;
    }
    DOM.emptyState.style.display = 'none';

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

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => openViewModal(btn.dataset.id));
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.toggle-status-btn').forEach(btn => {
        btn.addEventListener('click', () => handleToggleStatus(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
}

// ==================== MODAL FUNCTIONS ====================

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

function openEditModal(id) {
    const promotion = State.promotions.find(p => p.id === id);
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

function openViewModal(id) {
    const promotion = State.promotions.find(p => p.id === id);
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
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}</span>
            </div>
        </div>
    `;

    DOM.viewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openDeleteModal(id) {
    const promotion = State.promotions.find(p => p.id === id);
    if (!promotion) {
        showNotification('Promotion not found', 'error');
        return;
    }

    DOM.deletePromotionTitle.textContent = promotion.title_fr;
    DOM.confirmDeleteBtn.dataset.id = id;
    DOM.deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAllModals() {
    DOM.promotionModal.classList.remove('active');
    DOM.viewModal.classList.remove('active');
    DOM.deleteModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== STATUS TOGGLE ====================

async function handleToggleStatus(id) {
    const promotion = State.promotions.find(p => p.id === id);
    if (!promotion) return;

    const newStatus = !promotion.active;
    const { error } = await supabaseClient.from('promotions').update({ active: newStatus }).eq('id', id);

    if (error) {
        showNotification('Error updating status: ' + error.message, 'error');
        return;
    }

    const status = newStatus ? 'activated' : 'deactivated';
    showNotification(`✅ Promotion "${promotion.title_fr}" ${status}!`, 'success');
    await loadPromotions();
}

// ==================== FORM HANDLING ====================

async function handlePromotionSubmit(e) {
    e.preventDefault();

    const titleFr = DOM.titleFr.value.trim();
    const titleAr = DOM.titleAr.value.trim();
    const descFr = DOM.descFr.value.trim();
    const descAr = DOM.descAr.value.trim();
    const imageUrl = DOM.imageUrl.value.trim();
    const isActive = DOM.isActive.checked;

    if (!titleFr) {
        DOM.titleFr.classList.add('error');
        DOM.titleFr.focus();
        showNotification('Please enter the French title', 'error');
        return;
    }
    DOM.titleFr.classList.remove('error');

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
    const saveBtn = DOM.savePromotionBtn;
    const originalHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    let error;
    if (promotionId) {
        ({ error } = await supabaseClient.from('promotions').update(promotionData).eq('id', promotionId));
        if (!error) showNotification(`✅ Promotion "${titleFr}" updated successfully!`, 'success');
    } else {
        ({ error } = await supabaseClient.from('promotions').insert([promotionData]));
        if (!error) showNotification(`✅ Promotion "${titleFr}" added successfully!`, 'success');
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;

    if (error) {
        console.error(error);
        showNotification('Error saving promotion: ' + error.message, 'error');
        return;
    }

    closeAllModals();
    await loadPromotions();
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
    await loadPromotions();

    initSidebar();

    DOM.addPromotionBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openAddModal();
    });

    DOM.emptyAddBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openAddModal();
    });

    DOM.promotionForm.addEventListener('submit', handlePromotionSubmit);

    DOM.cancelModalBtn.addEventListener('click', closeAllModals);
    DOM.closeModal.addEventListener('click', closeAllModals);
    DOM.closeViewModal.addEventListener('click', closeAllModals);
    DOM.closeDeleteModal.addEventListener('click', closeAllModals);
    DOM.cancelDeleteBtn.addEventListener('click', closeAllModals);

    DOM.confirmDeleteBtn.addEventListener('click', async function() {
        const id = this.dataset.id;
        const promotion = State.promotions.find(p => p.id === id);
        if (!promotion) return;

        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

        const { error } = await supabaseClient.from('promotions').delete().eq('id', id);

        this.disabled = false;
        this.innerHTML = '<i class="fas fa-trash"></i> Delete Promotion';

        if (error) {
            showNotification('Error deleting promotion: ' + error.message, 'error');
            return;
        }

        showNotification(`🗑️ Promotion "${promotion.title_fr}" deleted successfully!`, 'success');
        closeAllModals();
        await loadPromotions();
    });

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

    console.log('📢 Promotions Management initialized (Supabase)');
});
