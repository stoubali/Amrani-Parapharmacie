/**
 * Amrani Parapharmacie - Products Management Script
 * Handles product CRUD operations with modals and filters
 */

// ==================== DATA STORE ====================
const ProductsData = {
    categories: [
        { id: 1, name_fr: 'Médicaments', name_ar: 'أدوية' },
        { id: 2, name_fr: 'Vitamines', name_ar: 'فيتامينات' },
        { id: 3, name_fr: 'Cosmétiques', name_ar: 'مستحضرات تجميل' },
        { id: 4, name_fr: 'Hygiène', name_ar: 'نظافة' },
        { id: 5, name_fr: 'Nutrition', name_ar: 'تغذية' }
    ],
    products: [
        {
            id: 1,
            name_fr: 'Paracétamol 500mg',
            name_ar: 'باراسيتامول 500 ملغ',
            description_fr: 'Antalgique et antipyrétique pour le traitement des douleurs et de la fièvre.',
            description_ar: 'مسكن للألم وخافض للحرارة لعلاج الآلام والحمى.',
            price: 45.00,
            image_url: '',
            brand: 'Doliprane',
            category_id: 1,
            is_available: true,
            is_featured: true,
            created_at: '2025-01-15T10:30:00'
        },
        {
            id: 2,
            name_fr: 'Ibuprofène 400mg',
            name_ar: 'إيبوبروفين 400 ملغ',
            description_fr: 'Anti-inflammatoire non stéroïdien pour les douleurs et l\'inflammation.',
            description_ar: 'مضاد التهاب غير ستيرويدي للآلام والالتهابات.',
            price: 65.00,
            image_url: '',
            brand: 'Advil',
            category_id: 1,
            is_available: true,
            is_featured: false,
            created_at: '2025-01-14T14:20:00'
        },
        {
            id: 3,
            name_fr: 'Amoxicilline 500mg',
            name_ar: 'أموكسيسيلين 500 ملغ',
            description_fr: 'Antibiotique à large spectre pour les infections bactériennes.',
            description_ar: 'مضاد حيوي واسع الطيف للعدوى البكتيرية.',
            price: 85.00,
            image_url: '',
            brand: 'Clamoxyl',
            category_id: 1,
            is_available: true,
            is_featured: true,
            created_at: '2025-01-13T09:15:00'
        },
        {
            id: 4,
            name_fr: 'Vitamine C 1000mg',
            name_ar: 'فيتامين سي 1000 ملغ',
            description_fr: 'Complément alimentaire pour renforcer le système immunitaire.',
            description_ar: 'مكمل غذائي لتقوية جهاز المناعة.',
            price: 35.00,
            image_url: '',
            brand: 'UPSA',
            category_id: 2,
            is_available: false,
            is_featured: false,
            created_at: '2025-01-12T11:45:00'
        },
        {
            id: 5,
            name_fr: 'Zinc 15mg',
            name_ar: 'زنك 15 ملغ',
            description_fr: 'Complément en zinc pour la santé de la peau et du système immunitaire.',
            description_ar: 'مكمل زنك لصحة الجلد والجهاز المناعي.',
            price: 25.00,
            image_url: '',
            brand: 'Zincor',
            category_id: 2,
            is_available: true,
            is_featured: false,
            created_at: '2025-01-11T16:00:00'
        },
        {
            id: 6,
            name_fr: 'Crème Hydratante Visage',
            name_ar: 'كريم ترطيب للوجه',
            description_fr: 'Crème hydratante pour peau sèche, enrichie en acide hyaluronique.',
            description_ar: 'كريم مرطب للبشرة الجافة، غني بحمض الهيالورونيك.',
            price: 120.00,
            image_url: '',
            brand: 'La Roche-Posay',
            category_id: 3,
            is_available: true,
            is_featured: true,
            created_at: '2025-01-10T08:30:00'
        },
        {
            id: 7,
            name_fr: 'Gel Douche Apaisant',
            name_ar: 'جل استحمام مهدئ',
            description_fr: 'Gel douche sans savon pour peaux sensibles.',
            description_ar: 'جل استحمام خالٍ من الصابون للبشرة الحساسة.',
            price: 55.00,
            image_url: '',
            brand: 'Dermatologique',
            category_id: 4,
            is_available: true,
            is_featured: false,
            created_at: '2025-01-09T13:20:00'
        },
        {
            id: 8,
            name_fr: 'Oméga-3 1000mg',
            name_ar: 'أوميغا-3 1000 ملغ',
            description_fr: 'Complément alimentaire en acides gras essentiels pour le cœur et le cerveau.',
            description_ar: 'مكمل غذائي بالأحماض الدهنية الأساسية للقلب والدماغ.',
            price: 95.00,
            image_url: '',
            brand: 'Nutripharm',
            category_id: 5,
            is_available: false,
            is_featured: false,
            created_at: '2025-01-08T10:00:00'
        }
    ],
    _nextId: 9
};

// ==================== DOM REFERENCES ====================
const DOM = {
    // Table
    tableBody: document.getElementById('productsTableBody'),
    resultsCount: document.getElementById('resultsCount'),
    emptyState: document.getElementById('emptyState'),
    
    // Filters
    searchInput: document.getElementById('searchInput'),
    categoryFilter: document.getElementById('categoryFilter'),
    availabilityFilter: document.getElementById('availabilityFilter'),
    featuredFilter: document.getElementById('featuredFilter'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    
    // Add Button
    addProductBtn: document.getElementById('addProductBtn'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),
    
    // Modal - Product Form
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
    
    // Modal - View
    viewModal: document.getElementById('viewModal'),
    viewProductContent: document.getElementById('viewProductContent'),
    closeViewModal: document.getElementById('closeViewModal'),
    
    // Modal - Delete
    deleteModal: document.getElementById('deleteModal'),
    deleteProductName: document.getElementById('deleteProductName'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    closeDeleteModal: document.getElementById('closeDeleteModal')
};

// ==================== HELPER FUNCTIONS ====================
function formatPrice(price) {
    return price.toFixed(2) + ' DH';
}

function getCategoryName(id) {
    const category = ProductsData.categories.find(c => c.id === parseInt(id));
    return category ? category.name_fr : 'Non catégorisé';
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
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
    // Reuse the notification system from dashboard
    if (window.showNotification) {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback notification
    alert(message);
}

// ==================== PRODUCT CRUD OPERATIONS ====================

// Get all products (with optional filtering)
function getProducts(filters = {}) {
    let products = [...ProductsData.products];
    
    // Search filter
    if (filters.search) {
        const search = filters.search.toLowerCase();
        products = products.filter(p => 
            p.name_fr.toLowerCase().includes(search) ||
            p.name_ar.toLowerCase().includes(search) ||
            p.brand.toLowerCase().includes(search) ||
            p.description_fr.toLowerCase().includes(search)
        );
    }
    
    // Category filter
    if (filters.category && filters.category !== 'all') {
        products = products.filter(p => p.category_id === parseInt(filters.category));
    }
    
    // Availability filter
    if (filters.availability && filters.availability !== 'all') {
        const available = filters.availability === 'available';
        products = products.filter(p => p.is_available === available);
    }
    
    // Featured filter
    if (filters.featured && filters.featured !== 'all') {
        const featured = filters.featured === 'featured';
        products = products.filter(p => p.is_featured === featured);
    }
    
    return products;
}

// Add new product
function addProduct(productData) {
    const newProduct = {
        id: ProductsData._nextId++,
        ...productData,
        created_at: new Date().toISOString()
    };
    ProductsData.products.push(newProduct);
    return newProduct;
}

// Update existing product
function updateProduct(id, productData) {
    const index = ProductsData.products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    ProductsData.products[index] = {
        ...ProductsData.products[index],
        ...productData
    };
    return ProductsData.products[index];
}

// Delete product
function deleteProduct(id) {
    const index = ProductsData.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    ProductsData.products.splice(index, 1);
    return true;
}

// Get product by ID
function getProductById(id) {
    return ProductsData.products.find(p => p.id === id);
}

// ==================== RENDER FUNCTIONS ====================

function renderProductsTable() {
    const search = DOM.searchInput.value.trim();
    const category = DOM.categoryFilter.value;
    const availability = DOM.availabilityFilter.value;
    const featured = DOM.featuredFilter.value;
    
    const filters = { search, category, availability, featured };
    const products = getProducts(filters);
    
    // Update results count
    DOM.resultsCount.textContent = `${products.length} product${products.length > 1 ? 's' : ''}`;
    
    // Show/hide empty state
    if (products.length === 0) {
        DOM.tableBody.innerHTML = '';
        DOM.emptyState.style.display = 'block';
        return;
    }
    DOM.emptyState.style.display = 'none';
    
    // Render table rows
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
            <td>${product.brand}</td>
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
    
    // Attach event listeners to action buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => openViewModal(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)));
    });
}

// ==================== MODAL FUNCTIONS ====================

// Populate category dropdown
function populateCategoryDropdown() {
    const select = DOM.categoryId;
    select.innerHTML = '<option value="">Select a category</option>';
    ProductsData.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name_fr;
        select.appendChild(option);
    });
}

// Open Add Product Modal
function openAddModal() {
    DOM.modalTitle.textContent = 'Add Product';
    DOM.productId.value = '';
    DOM.productForm.reset();
    DOM.isAvailable.checked = true;
    DOM.isFeatured.checked = false;
    DOM.productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Focus first input
    setTimeout(() => DOM.nameFr.focus(), 100);
}

// Open Edit Product Modal
function openEditModal(id) {
    const product = getProductById(id);
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
    DOM.brand.value = product.brand;
    DOM.categoryId.value = product.category_id;
    DOM.imageUrl.value = product.image_url || '';
    DOM.isAvailable.checked = product.is_available;
    DOM.isFeatured.checked = product.is_featured;
    
    DOM.productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Open View Product Modal
function openViewModal(id) {
    const product = getProductById(id);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    const category = ProductsData.categories.find(c => c.id === product.category_id);
    
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
                <span class="view-value">${product.brand}</span>
            </div>
            <div class="view-row">
                <span class="view-label">Category</span>
                <span class="view-value">${category ? category.name_fr : 'Non catégorisé'}</span>
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
    const product = getProductById(id);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    DOM.deleteProductName.textContent = product.name_fr;
    DOM.confirmDeleteBtn.dataset.id = id;
    DOM.deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close all modals
function closeAllModals() {
    DOM.productModal.classList.remove('active');
    DOM.viewModal.classList.remove('active');
    DOM.deleteModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== FORM HANDLING ====================

function handleProductSubmit(e) {
    e.preventDefault();
    
    // Basic validation
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
        category_id: parseInt(DOM.categoryId.value),
        image_url: DOM.imageUrl.value.trim(),
        is_available: DOM.isAvailable.checked,
        is_featured: DOM.isFeatured.checked
    };
    
    const productId = DOM.productId.value;
    let result;
    
    if (productId) {
        // Update existing product
        result = updateProduct(parseInt(productId), productData);
        if (result) {
            showNotification(`✅ Product "${result.name_fr}" updated successfully!`, 'success');
        }
    } else {
        // Add new product
        result = addProduct(productData);
        showNotification(`✅ Product "${result.name_fr}" added successfully!`, 'success');
    }
    
    closeAllModals();
    renderProductsTable();
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
    // Populate category dropdowns
    populateCategoryDropdown();
    
    // Initial render
    renderProductsTable();
    
    // Sidebar
    initSidebar();
    
    // Event Listeners
    DOM.addProductBtn.addEventListener('click', openAddModal);
    DOM.emptyAddBtn.addEventListener('click', openAddModal);
    
    // Form submission
    DOM.productForm.addEventListener('submit', handleProductSubmit);
    
    // Close modal buttons
    DOM.cancelModalBtn.addEventListener('click', closeAllModals);
    DOM.closeModal.addEventListener('click', closeAllModals);
    DOM.closeViewModal.addEventListener('click', closeAllModals);
    DOM.closeDeleteModal.addEventListener('click', closeAllModals);
    DOM.cancelDeleteBtn.addEventListener('click', closeAllModals);
    
    // Delete confirmation
    DOM.confirmDeleteBtn.addEventListener('click', function() {
        const id = parseInt(this.dataset.id);
        const product = getProductById(id);
        if (product && deleteProduct(id)) {
            showNotification(`🗑️ Product "${product.name_fr}" deleted successfully!`, 'success');
            closeAllModals();
            renderProductsTable();
        }
    });
    
    // Filters
    DOM.searchInput.addEventListener('input', debounce(applyFilters, 300));
    DOM.categoryFilter.addEventListener('change', applyFilters);
    DOM.availabilityFilter.addEventListener('change', applyFilters);
    DOM.featuredFilter.addEventListener('change', applyFilters);
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
    
    console.log('🚀 Products Management initialized');
    console.log(`📦 ${ProductsData.products.length} products loaded`);
});

// ==================== EXPOSE FOR DEBUGGING ====================
window.ProductsData = ProductsData;
window.getProducts = getProducts;
window.addProduct = addProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;