/**
 * Amrani Parapharmacie - Categories Management Script
 * Handles category CRUD operations with modals and search
 */

// ==================== DATA STORE ====================
const CategoriesData = {
    categories: [
        {
            id: 1,
            name_fr: 'Médicaments',
            name_ar: 'أدوية',
            image_url: '',
            created_at: '2025-01-10T08:00:00'
        },
        {
            id: 2,
            name_fr: 'Vitamines',
            name_ar: 'فيتامينات',
            image_url: '',
            created_at: '2025-01-10T08:15:00'
        },
        {
            id: 3,
            name_fr: 'Cosmétiques',
            name_ar: 'مستحضرات تجميل',
            image_url: '',
            created_at: '2025-01-10T08:30:00'
        },
        {
            id: 4,
            name_fr: 'Hygiène',
            name_ar: 'نظافة',
            image_url: '',
            created_at: '2025-01-10T08:45:00'
        },
        {
            id: 5,
            name_fr: 'Nutrition',
            name_ar: 'تغذية',
            image_url: '',
            created_at: '2025-01-10T09:00:00'
        },
        {
            id: 6,
            name_fr: 'Santé Bucco-dentaire',
            name_ar: 'صحة الفم والأسنان',
            image_url: '',
            created_at: '2025-01-10T09:15:00'
        }
    ],
    // Product counts (simulated)
    productCounts: {
        1: 3,  // Médicaments
        2: 2,  // Vitamines
        3: 1,  // Cosmétiques
        4: 1,  // Hygiène
        5: 1,  // Nutrition
        6: 0   // Santé Bucco-dentaire
    },
    _nextId: 7
};

// ==================== DOM REFERENCES ====================
const DOM = {
    // Table
    tableBody: document.getElementById('categoriesTableBody'),
    emptyState: document.getElementById('emptyState'),
    
    // Search
    searchInput: document.getElementById('searchInput'),
    
    // Add Button
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),
    
    // Modal - Category Form
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
    
    // Modal - Delete
    deleteModal: document.getElementById('deleteModal'),
    deleteCategoryName: document.getElementById('deleteCategoryName'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    closeDeleteModal: document.getElementById('closeDeleteModal')
};

// ==================== HELPER FUNCTIONS ====================

function getProductCount(categoryId) {
    return CategoriesData.productCounts[categoryId] || 0;
}

function showNotification(message, type = 'info') {
    // Reuse the notification system from dashboard
    if (window.showNotification) {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback notification with basic styling
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

// ==================== CATEGORY CRUD OPERATIONS ====================

// Get all categories (with optional search)
function getCategories(search = '') {
    let categories = [...CategoriesData.categories];
    
    if (search.trim()) {
        const query = search.toLowerCase().trim();
        categories = categories.filter(cat => 
            cat.name_fr.toLowerCase().includes(query) ||
            cat.name_ar.includes(query) // Arabic search works directly
        );
    }
    
    // Sort by French name
    categories.sort((a, b) => a.name_fr.localeCompare(b.name_fr));
    
    return categories;
}

// Add new category
function addCategory(categoryData) {
    const newCategory = {
        id: CategoriesData._nextId++,
        ...categoryData,
        created_at: new Date().toISOString()
    };
    CategoriesData.categories.push(newCategory);
    // Initialize product count
    CategoriesData.productCounts[newCategory.id] = 0;
    return newCategory;
}

// Update existing category
function updateCategory(id, categoryData) {
    const index = CategoriesData.categories.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    CategoriesData.categories[index] = {
        ...CategoriesData.categories[index],
        ...categoryData
    };
    return CategoriesData.categories[index];
}

// Delete category
function deleteCategory(id) {
    const index = CategoriesData.categories.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    // Check if category has products (using productCounts)
    if (getProductCount(id) > 0) {
        showNotification('Cannot delete category with existing products. Move products to another category first.', 'error');
        return false;
    }
    
    CategoriesData.categories.splice(index, 1);
    delete CategoriesData.productCounts[id];
    return true;
}

// Get category by ID
function getCategoryById(id) {
    return CategoriesData.categories.find(c => c.id === id);
}

// ==================== RENDER FUNCTIONS ====================

function renderCategoriesTable() {
    const search = DOM.searchInput.value.trim();
    const categories = getCategories(search);
    
    // Show/hide empty state
    if (categories.length === 0) {
        DOM.tableBody.innerHTML = '';
        DOM.emptyState.style.display = 'block';
        return;
    }
    DOM.emptyState.style.display = 'none';
    
    // Render table rows
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
    
    // Attach event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)));
    });
}

// ==================== MODAL FUNCTIONS ====================

// Open Add Category Modal
function openAddModal() {
    // Reset form completely
    DOM.categoryForm.reset();
    DOM.categoryId.value = '';
    DOM.nameFr.classList.remove('error');
    DOM.nameAr.classList.remove('error');
    DOM.imageUrl.value = '';
    DOM.modalTitle.textContent = 'Add Category';
    DOM.saveBtnText.textContent = 'Save Category';
    DOM.saveCategoryBtn.innerHTML = '<i class="fas fa-save"></i> Save Category';
    
    // Show modal
    DOM.categoryModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus first input after a small delay
    setTimeout(() => {
        DOM.nameFr.focus();
    }, 150);
}

// Open Edit Category Modal
function openEditModal(id) {
    const category = getCategoryById(id);
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

// Open Delete Confirmation Modal
function openDeleteModal(id) {
    const category = getCategoryById(id);
    if (!category) {
        showNotification('Category not found', 'error');
        return;
    }
    
    DOM.deleteCategoryName.textContent = category.name_fr;
    DOM.confirmDeleteBtn.dataset.id = id;
    DOM.deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close all modals
function closeAllModals() {
    DOM.categoryModal.classList.remove('active');
    DOM.deleteModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== FORM HANDLING ====================

function handleCategorySubmit(e) {
    e.preventDefault();
    
    // Get values and trim
    const nameFr = DOM.nameFr.value.trim();
    const nameAr = DOM.nameAr.value.trim();
    const imageUrl = DOM.imageUrl.value.trim();
    
    // Validate French name
    if (!nameFr) {
        DOM.nameFr.classList.add('error');
        DOM.nameFr.focus();
        showNotification('Please enter the French name', 'error');
        return;
    }
    DOM.nameFr.classList.remove('error');
    
    // Validate Arabic name
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
    let result;
    
    if (categoryId) {
        // Update existing category
        result = updateCategory(parseInt(categoryId), categoryData);
        if (result) {
            showNotification(`✅ Category "${result.name_fr}" updated successfully!`, 'success');
        }
    } else {
        // Add new category
        result = addCategory(categoryData);
        showNotification(`✅ Category "${result.name_fr}" added successfully!`, 'success');
    }
    
    closeAllModals();
    renderCategoriesTable();
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
    renderCategoriesTable();
    
    // Sidebar
    initSidebar();
    
    // Event Listeners - Add buttons
    DOM.addCategoryBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openAddModal();
    });
    
    DOM.emptyAddBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openAddModal();
    });
    
    // Form submission
    DOM.categoryForm.addEventListener('submit', handleCategorySubmit);
    
    // Close modal buttons
    DOM.cancelModalBtn.addEventListener('click', closeAllModals);
    DOM.closeModal.addEventListener('click', closeAllModals);
    DOM.closeDeleteModal.addEventListener('click', closeAllModals);
    DOM.cancelDeleteBtn.addEventListener('click', closeAllModals);
    
    // Delete confirmation
    DOM.confirmDeleteBtn.addEventListener('click', function() {
        const id = parseInt(this.dataset.id);
        const category = getCategoryById(id);
        if (category) {
            // Check if category has products
            const productCount = getProductCount(id);
            if (productCount > 0) {
                showNotification(`❌ Cannot delete "${category.name_fr}" - it has ${productCount} product(s)`, 'error');
                closeAllModals();
                return;
            }
            
            if (deleteCategory(id)) {
                showNotification(`🗑️ Category "${category.name_fr}" deleted successfully!`, 'success');
                closeAllModals();
                renderCategoriesTable();
            }
        }
    });
    
    // Search with debounce
    let searchTimeout;
    DOM.searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderCategoriesTable();
        }, 300);
    });
    
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
    
    console.log('🏷️ Categories Management initialized');
    console.log(`📂 ${CategoriesData.categories.length} categories loaded`);
});

// ==================== EXPOSE FOR DEBUGGING ====================
window.CategoriesData = CategoriesData;
window.getCategories = getCategories;
window.addCategory = addCategory;
window.updateCategory = updateCategory;
window.deleteCategory = deleteCategory;