/**
 * Amrani Parapharmacie - Categories Management Script
 * Full CRUD against the Supabase `categories` table.
 * Product counts per category are computed from the `products` table.
 */

// ==================== STATE ====================
const State = {
    categories: [],
    productCounts: {} // { categoryId: count }
};

// ==================== DOM REFERENCES ====================
const DOM = {
    tableBody: document.getElementById('categoriesTableBody'),
    emptyState: document.getElementById('emptyState'),

    searchInput: document.getElementById('searchInput'),

    addCategoryBtn: document.getElementById('addCategoryBtn'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),

    categoryModal: document.getElementById('categoryModal'),
    modalTitle: document.getElementById('modalTitle'),
    categoryId: document.getElementById('categoryId'),
    nameFr: document.getElementById('nameFr'),
    nameAr: document.getElementById('nameAr'),
    imageUrl: document.getElementById('imageUrl'),
    categoryForm: document.getElementById('categoryForm'),
    saveBtnText: document.getElementById('saveBtnText'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    closeModal: document.getElementById('closeModal'),
    saveCategoryBtn: document.getElementById('saveCategoryBtn'),

    deleteModal: document.getElementById('deleteModal'),
    deleteCategoryName: document.getElementById('deleteCategoryName'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    closeDeleteModal: document.getElementById('closeDeleteModal')
};

// ==================== HELPER FUNCTIONS ====================

function getProductCount(categoryId) {
    return State.productCounts[categoryId] || 0;
}

function showNotification(message, type = 'info') {
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

async function loadCategories() {
    const [categoriesRes, productsRes] = await Promise.all([
        supabaseClient.from('categories').select('*').order('name_fr', { ascending: true }),
        supabaseClient.from('products').select('category_id')
    ]);

    if (categoriesRes.error) {
        showNotification('Erreur lors du chargement des catégories', 'error');
        return;
    }

    State.categories = categoriesRes.data || [];

    // Build product counts per category
    const counts = {};
    (productsRes.data || []).forEach(p => {
        if (p.category_id) {
            counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
    });
    State.productCounts = counts;

    renderCategoriesTable();
}

// ==================== RENDER FUNCTIONS ====================

function getFilteredCategories() {
    const search = DOM.searchInput.value.trim().toLowerCase();
    let categories = [...State.categories];

    if (search) {
        categories = categories.filter(cat =>
            cat.name_fr.toLowerCase().includes(search) ||
            (cat.name_ar || '').includes(search)
        );
    }

    return categories;
}

function renderCategoriesTable() {
    const categories = getFilteredCategories();

    if (categories.length === 0) {
        DOM.tableBody.innerHTML = '';
        DOM.emptyState.style.display = 'block';
        return;
    }
    DOM.emptyState.style.display = 'none';

    DOM.tableBody.innerHTML = categories.map(category => {
        const productCount = getProductCount(category.id);
        const hasProducts = productCount > 0;

        return `
            <tr>
                <td>
                    <div class="category-image-cell">
                        ${category.image_url
                            ? `<img src="${category.image_url}" alt="${category.name_fr}" />`
                            : `<i class="fas fa-tag placeholder-icon"></i>`
                        }
                    </div>
                </td>
                <td>
                    <div class="category-name-cell">
                        ${category.name_fr}
                        <span class="category-name-ar">${category.name_ar}</span>
                    </div>
                </td>
                <td dir="rtl">${category.name_ar}</td>
                <td class="text-center">
                    <span class="product-count-badge ${hasProducts ? '' : 'zero'}">
                        ${productCount}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" data-id="${category.id}" title="Edit">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="action-btn delete-btn" data-id="${category.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
}

// ==================== MODAL FUNCTIONS ====================

function openAddModal() {
    DOM.categoryForm.reset();
    DOM.categoryId.value = '';
    DOM.nameFr.classList.remove('error');
    DOM.nameAr.classList.remove('error');
    DOM.imageUrl.value = '';
    DOM.modalTitle.textContent = 'Add Category';
    DOM.saveBtnText.textContent = 'Save Category';
    DOM.saveCategoryBtn.innerHTML = '<i class="fas fa-save"></i> Save Category';

    DOM.categoryModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        DOM.nameFr.focus();
    }, 150);
}

function openEditModal(id) {
    const category = State.categories.find(c => c.id === id);
    if (!category) {
        showNotification('Category not found', 'error');
        return;
    }

    DOM.categoryId.value = category.id;
    DOM.nameFr.value = category.name_fr;
    DOM.nameAr.value = category.name_ar;
    DOM.imageUrl.value = category.image_url || '';
    DOM.nameFr.classList.remove('error');
    DOM.nameAr.classList.remove('error');
    DOM.modalTitle.textContent = 'Edit Category';
    DOM.saveBtnText.textContent = 'Update Category';
    DOM.saveCategoryBtn.innerHTML = '<i class="fas fa-save"></i> Update Category';

    DOM.categoryModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openDeleteModal(id) {
    const category = State.categories.find(c => c.id === id);
    if (!category) {
        showNotification('Category not found', 'error');
        return;
    }

    DOM.deleteCategoryName.textContent = category.name_fr;
    DOM.confirmDeleteBtn.dataset.id = id;
    DOM.deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAllModals() {
    DOM.categoryModal.classList.remove('active');
    DOM.deleteModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== FORM HANDLING ====================

async function handleCategorySubmit(e) {
    e.preventDefault();

    const nameFr = DOM.nameFr.value.trim();
    const nameAr = DOM.nameAr.value.trim();
    const imageUrl = DOM.imageUrl.value.trim();

    if (!nameFr) {
        DOM.nameFr.classList.add('error');
        DOM.nameFr.focus();
        showNotification('Please enter the French name', 'error');
        return;
    }
    DOM.nameFr.classList.remove('error');

    if (!nameAr) {
        DOM.nameAr.classList.add('error');
        DOM.nameAr.focus();
        showNotification('Please enter the Arabic name', 'error');
        return;
    }
    DOM.nameAr.classList.remove('error');

    const categoryData = {
        name_fr: nameFr,
        name_ar: nameAr,
        image_url: imageUrl
    };

    const categoryId = DOM.categoryId.value;
    const saveBtn = DOM.saveCategoryBtn;
    const originalHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    let error;
    if (categoryId) {
        ({ error } = await supabaseClient.from('categories').update(categoryData).eq('id', categoryId));
        if (!error) showNotification(`✅ Category "${nameFr}" updated successfully!`, 'success');
    } else {
        ({ error } = await supabaseClient.from('categories').insert([categoryData]));
        if (!error) showNotification(`✅ Category "${nameFr}" added successfully!`, 'success');
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;

    if (error) {
        console.error(error);
        showNotification('Error saving category: ' + error.message, 'error');
        return;
    }

    closeAllModals();
    await loadCategories();
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
    await loadCategories();

    initSidebar();

    DOM.addCategoryBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openAddModal();
    });

    DOM.emptyAddBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openAddModal();
    });

    DOM.categoryForm.addEventListener('submit', handleCategorySubmit);

    DOM.cancelModalBtn.addEventListener('click', closeAllModals);
    DOM.closeModal.addEventListener('click', closeAllModals);
    DOM.closeDeleteModal.addEventListener('click', closeAllModals);
    DOM.cancelDeleteBtn.addEventListener('click', closeAllModals);

    DOM.confirmDeleteBtn.addEventListener('click', async function() {
        const id = this.dataset.id;
        const category = State.categories.find(c => c.id === id);
        if (!category) return;

        const productCount = getProductCount(id);
        if (productCount > 0) {
            showNotification(`❌ Cannot delete "${category.name_fr}" - it has ${productCount} product(s)`, 'error');
            closeAllModals();
            return;
        }

        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

        const { error } = await supabaseClient.from('categories').delete().eq('id', id);

        this.disabled = false;
        this.innerHTML = '<i class="fas fa-trash"></i> Delete Category';

        if (error) {
            showNotification('Error deleting category: ' + error.message, 'error');
            return;
        }

        showNotification(`🗑️ Category "${category.name_fr}" deleted successfully!`, 'success');
        closeAllModals();
        await loadCategories();
    });

    let searchTimeout;
    DOM.searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderCategoriesTable();
        }, 300);
    });

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

    console.log('🏷️ Categories Management initialized (Supabase)');
});
