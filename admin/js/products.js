/**
 * Amrani Parapharmacie - Products Management Script
 * Full CRUD against the Supabase `products` table (joined with `categories`).
 */

// ==================== STATE ====================
const State = {
    products: [],
    categories: []
};

// ==================== DOM REFERENCES ====================
const DOM = {
    tableBody: document.getElementById('productsTableBody'),
    resultsCount: document.getElementById('resultsCount'),
    emptyState: document.getElementById('emptyState'),

    searchInput: document.getElementById('searchInput'),
    categoryFilter: document.getElementById('categoryFilter'),
    availabilityFilter: document.getElementById('availabilityFilter'),
    featuredFilter: document.getElementById('featuredFilter'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),

    addProductBtn: document.getElementById('addProductBtn'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),

    productModal: document.getElementById('productModal'),
    modalTitle: document.getElementById('modalTitle'),
    productId: document.getElementById('productId'),
    nameFr: document.getElementById('nameFr'),
    nameAr: document.getElementById('nameAr'),
    descFr: document.getElementById('descFr'),
    descAr: document.getElementById('descAr'),
    price: document.getElementById('price'),
    brand: document.getElementById('brand'),
    categoryId: document.getElementById('categoryId'),
    imageUrl: document.getElementById('imageUrl'),
    isAvailable: document.getElementById('isAvailable'),
    isFeatured: document.getElementById('isFeatured'),
    productForm: document.getElementById('productForm'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    closeModal: document.getElementById('closeModal'),
    saveProductBtn: document.getElementById('saveProductBtn'),

    viewModal: document.getElementById('viewModal'),
    viewProductContent: document.getElementById('viewProductContent'),
    closeViewModal: document.getElementById('closeViewModal'),

    deleteModal: document.getElementById('deleteModal'),
    deleteProductName: document.getElementById('deleteProductName'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    closeDeleteModal: document.getElementById('closeDeleteModal')
};

// ==================== HELPER FUNCTIONS ====================
function formatPrice(price) {
    return Number(price || 0).toFixed(2) + ' DH';
}

function getCategoryName(categoryId) {
    const category = State.categories.find(c => c.id === categoryId);
    return category ? category.name_fr : 'Non catégorisé';
}

function getStatusBadge(product) {
    if (product.is_available) {
        return '<span class="status-badge available">Disponible</span>';
    }
    return '<span class="status-badge unavailable">Indisponible</span>';
}

function getFeaturedBadge(product) {
    if (product.is_featured) {
        return '<span class="status-badge featured">⭐ Featured</span>';
    }
    return '<span class="status-badge not-featured">—</span>';
}

function showNotification(message, type = 'info') {
    alert(message);
}

// ==================== DATA FETCHING ====================
async function loadCategories() {
    const { data, error } = await supabaseClient
        .from('categories')
        .select('*')
        .order('name_fr', { ascending: true });

    if (error) {
        showNotification('Erreur lors du chargement des catégories', 'error');
        return;
    }

    State.categories = data || [];
    populateCategoryDropdowns();
}

function populateCategoryDropdowns() {
    // Filter dropdown
    const filterSelect = DOM.categoryFilter;
    const currentFilterValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="all">All Categories</option>' +
        State.categories.map(cat => `<option value="${cat.id}">${cat.name_fr}</option>`).join('');
    filterSelect.value = currentFilterValue || 'all';

    // Modal form dropdown
    const modalSelect = DOM.categoryId;
    modalSelect.innerHTML = '<option value="">Select a category</option>' +
        State.categories.map(cat => `<option value="${cat.id}">${cat.name_fr}</option>`).join('');
}

async function loadProducts() {
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        showNotification('Erreur lors du chargement des produits', 'error');
        return;
    }

    State.products = data || [];
    renderProductsTable();
}

// ==================== FILTERING (client-side) ====================
function getFilteredProducts() {
    const search = DOM.searchInput.value.trim().toLowerCase();
    const category = DOM.categoryFilter.value;
    const availability = DOM.availabilityFilter.value;
    const featured = DOM.featuredFilter.value;

    let products = [...State.products];

    if (search) {
        products = products.filter(p =>
            p.name_fr.toLowerCase().includes(search) ||
            (p.name_ar || '').toLowerCase().includes(search) ||
            (p.brand || '').toLowerCase().includes(search) ||
            (p.description_fr || '').toLowerCase().includes(search)
        );
    }

    if (category && category !== 'all') {
        products = products.filter(p => p.category_id === category);
    }

    if (availability && availability !== 'all') {
        const available = availability === 'available';
        products = products.filter(p => p.is_available === available);
    }

    if (featured && featured !== 'all') {
        const isFeatured = featured === 'featured';
        products = products.filter(p => p.is_featured === isFeatured);
    }

    return products;
}

// ==================== RENDER ====================
function renderProductsTable() {
    const products = getFilteredProducts();

    DOM.resultsCount.textContent = `${products.length} product${products.length > 1 ? 's' : ''}`;

    if (products.length === 0) {
        DOM.tableBody.innerHTML = '';
        DOM.emptyState.style.display = 'block';
        return;
    }
    DOM.emptyState.style.display = 'none';

    DOM.tableBody.innerHTML = products.map(product => `
        <tr>
            <td>
                <div class="product-image-cell">
                    ${product.image_url
                        ? `<img src="${product.image_url}" alt="${product.name_fr}" />`
                        : `<i class="fas fa-capsules placeholder-icon"></i>`
                    }
                </div>
            </td>
            <td>
                <div class="product-name-cell">
                    ${product.name_fr}
                    <span class="name-ar">${product.name_ar}</span>
                </div>
            </td>
            <td>${product.brand || '-'}</td>
            <td>${getCategoryName(product.category_id)}</td>
            <td><strong>${formatPrice(product.price)}</strong></td>
            <td>${getStatusBadge(product)}</td>
            <td>${getFeaturedBadge(product)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" data-id="${product.id}" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" data-id="${product.id}" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${product.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => openViewModal(btn.dataset.id));
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
}

// ==================== MODAL FUNCTIONS ====================

function openAddModal() {
    DOM.modalTitle.textContent = 'Add Product';
    DOM.productId.value = '';
    DOM.productForm.reset();
    DOM.isAvailable.checked = true;
    DOM.isFeatured.checked = false;
    DOM.productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => DOM.nameFr.focus(), 100);
}

function openEditModal(id) {
    const product = State.products.find(p => p.id === id);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    DOM.modalTitle.textContent = 'Edit Product';
    DOM.productId.value = product.id;
    DOM.nameFr.value = product.name_fr;
    DOM.nameAr.value = product.name_ar;
    DOM.descFr.value = product.description_fr || '';
    DOM.descAr.value = product.description_ar || '';
    DOM.price.value = product.price;
    DOM.brand.value = product.brand || '';
    DOM.categoryId.value = product.category_id || '';
    DOM.imageUrl.value = product.image_url || '';
    DOM.isAvailable.checked = product.is_available;
    DOM.isFeatured.checked = product.is_featured;

    DOM.productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openViewModal(id) {
    const product = State.products.find(p => p.id === id);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    DOM.viewProductContent.innerHTML = `
        <div class="view-product">
            ${product.image_url ? `
                <div class="view-row">
                    <span class="view-label">Image</span>
                    <span class="view-value">
                        <img src="${product.image_url}" alt="${product.name_fr}" class="view-image" />
                    </span>
                </div>
            ` : ''}
            <div class="view-row">
                <span class="view-label">Name (FR)</span>
                <span class="view-value">${product.name_fr}</span>
            </div>
            <div class="view-row">
                <span class="view-label">Name (AR)</span>
                <span class="view-value" dir="rtl">${product.name_ar}</span>
            </div>
            ${product.description_fr ? `
                <div class="view-row">
                    <span class="view-label">Description (FR)</span>
                    <span class="view-value">${product.description_fr}</span>
                </div>
            ` : ''}
            ${product.description_ar ? `
                <div class="view-row">
                    <span class="view-label">Description (AR)</span>
                    <span class="view-value" dir="rtl">${product.description_ar}</span>
                </div>
            ` : ''}
            <div class="view-row">
                <span class="view-label">Brand</span>
                <span class="view-value">${product.brand || '-'}</span>
            </div>
            <div class="view-row">
                <span class="view-label">Category</span>
                <span class="view-value">${getCategoryName(product.category_id)}</span>
            </div>
            <div class="view-row">
                <span class="view-label">Price</span>
                <span class="view-value"><strong>${formatPrice(product.price)}</strong></span>
            </div>
            <div class="view-row">
                <span class="view-label">Availability</span>
                <span class="view-value">
                    <span class="badge ${product.is_available ? 'available' : 'unavailable'}">
                        ${product.is_available ? '✅ Available' : '❌ Unavailable'}
                    </span>
                </span>
            </div>
            <div class="view-row">
                <span class="view-label">Featured</span>
                <span class="view-value">
                    <span class="badge ${product.is_featured ? 'featured' : 'not-featured'}">
                        ${product.is_featured ? '⭐ Featured' : '—'}
                    </span>
                </span>
            </div>
            <div class="view-row">
                <span class="view-label">Created</span>
                <span class="view-value">${new Date(product.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}</span>
            </div>
        </div>
    `;

    DOM.viewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openDeleteModal(id) {
    const product = State.products.find(p => p.id === id);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    DOM.deleteProductName.textContent = product.name_fr;
    DOM.confirmDeleteBtn.dataset.id = id;
    DOM.deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAllModals() {
    DOM.productModal.classList.remove('active');
    DOM.viewModal.classList.remove('active');
    DOM.deleteModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== FORM HANDLING ====================

async function handleProductSubmit(e) {
    e.preventDefault();

    const requiredFields = ['nameFr', 'nameAr', 'price', 'brand', 'categoryId'];
    let isValid = true;

    requiredFields.forEach(field => {
        const input = DOM[field];
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });

    if (!isValid) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    const productData = {
        name_fr: DOM.nameFr.value.trim(),
        name_ar: DOM.nameAr.value.trim(),
        description_fr: DOM.descFr.value.trim(),
        description_ar: DOM.descAr.value.trim(),
        price: parseFloat(DOM.price.value),
        brand: DOM.brand.value.trim(),
        category_id: DOM.categoryId.value,
        image_url: DOM.imageUrl.value.trim(),
        is_available: DOM.isAvailable.checked,
        is_featured: DOM.isFeatured.checked
    };

    const productId = DOM.productId.value;
    const saveBtn = DOM.saveProductBtn;
    const originalHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    let error;
    if (productId) {
        ({ error } = await supabaseClient.from('products').update(productData).eq('id', productId));
        if (!error) showNotification(`✅ Product "${productData.name_fr}" updated successfully!`, 'success');
    } else {
        ({ error } = await supabaseClient.from('products').insert([productData]));
        if (!error) showNotification(`✅ Product "${productData.name_fr}" added successfully!`, 'success');
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;

    if (error) {
        console.error(error);
        showNotification('Error saving product: ' + error.message, 'error');
        return;
    }

    closeAllModals();
    await loadProducts();
}

// ==================== FILTER HANDLING ====================
function applyFilters() {
    renderProductsTable();
}

function clearFilters() {
    DOM.searchInput.value = '';
    DOM.categoryFilter.value = 'all';
    DOM.availabilityFilter.value = 'all';
    DOM.featuredFilter.value = 'all';
    renderProductsTable();
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
    await loadCategories();
    await loadProducts();

    initSidebar();

    DOM.addProductBtn.addEventListener('click', openAddModal);
    DOM.emptyAddBtn.addEventListener('click', openAddModal);

    DOM.productForm.addEventListener('submit', handleProductSubmit);

    DOM.cancelModalBtn.addEventListener('click', closeAllModals);
    DOM.closeModal.addEventListener('click', closeAllModals);
    DOM.closeViewModal.addEventListener('click', closeAllModals);
    DOM.closeDeleteModal.addEventListener('click', closeAllModals);
    DOM.cancelDeleteBtn.addEventListener('click', closeAllModals);

    DOM.confirmDeleteBtn.addEventListener('click', async function() {
        const id = this.dataset.id;
        const product = State.products.find(p => p.id === id);
        if (!product) return;

        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

        const { error } = await supabaseClient.from('products').delete().eq('id', id);

        this.disabled = false;
        this.innerHTML = '<i class="fas fa-trash"></i> Delete Product';

        if (error) {
            showNotification('Error deleting product: ' + error.message, 'error');
            return;
        }

        showNotification(`🗑️ Product "${product.name_fr}" deleted successfully!`, 'success');
        closeAllModals();
        await loadProducts();
    });

    DOM.searchInput.addEventListener('input', debounce(applyFilters, 300));
    DOM.categoryFilter.addEventListener('change', applyFilters);
    DOM.availabilityFilter.addEventListener('change', applyFilters);
    DOM.featuredFilter.addEventListener('change', applyFilters);
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

    console.log('🚀 Products Management initialized (Supabase)');
});
