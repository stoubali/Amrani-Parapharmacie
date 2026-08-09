// ====================================================
// js/admin.js — Admin Panel for Amrani Parapharmacie
// ====================================================

// ---------- SAMPLE DATA (remplacé par Supabase plus tard) ----------
// Replace with Supabase queries later
let products = [
    { id: 1, nameFR: 'Crème Hydratante Visage', nameAR: 'كريم مرطب للوجه', descFR: 'Crème hydratante apaisante pour peau sensible', descAR: 'كريم مرطب مهدئ للبشرة الحساسة', image: '🧴', brand: 'La Roche-Posay', price: 125, categories: ['Skincare'], available: true, featured: true },
    { id: 2, nameFR: 'Vitamine C + Zinc', nameAR: 'فيتامين سي + زنك', descFR: 'Complément alimentaire pour renforcer l\'immunité', descAR: 'مكمل غذائي لتقوية المناعة', image: '💊', brand: 'Nutri&Co', price: 185, categories: ['Vitamins'], available: true, featured: false },
    { id: 3, nameFR: 'Shampoing Douceur', nameAR: 'شامبو لطيف', descFR: 'Shampoing doux à la camomille', descAR: 'شامبو لطيف بالبابونج', image: '🧴', brand: 'Klorane', price: 98, categories: ['Hair Care'], available: false, featured: false },
    { id: 4, nameFR: 'Baume Lèvres Réparateur', nameAR: 'بلسم مرمم للشفاه', descFR: 'Baume réparateur à l\'huile de tournesol', descAR: 'بلسم مرمم بزيت دوار الشمس', image: '💋', brand: 'Nuxe', price: 65, categories: ['Skincare'], available: true, featured: false },
    { id: 5, nameFR: 'Huile de Douche Surgras', nameAR: 'زيت استحمام فائق الدهون', descFR: 'Huile de douche nourrissante pour peaux sèches', descAR: 'زيت استحمام مغذي للبشرة الجافة', image: '🧴', brand: 'Dermophil', price: 112, categories: ['Hygiene'], available: true, featured: false },
];

let categories = [
    { id: 1, nameFR: 'Soins du visage', nameAR: 'العناية بالوجه', image: '🧴', count: 2 },
    { id: 2, nameFR: 'Bébé', nameAR: 'طفل', image: '👶', count: 0 },
    { id: 3, nameFR: 'Vitamines', nameAR: 'فيتامينات', image: '💊', count: 1 },
    { id: 4, nameFR: 'Hygiène', nameAR: 'نظافة', image: '🧼', count: 1 },
    { id: 5, nameFR: 'Cheveux', nameAR: 'شعر', image: '💇', count: 1 },
    { id: 6, nameFR: 'Corps', nameAR: 'جسم', image: '🧖', count: 0 },
];

let promotions = [
    { id: 1, titleFR: 'Offre Rentrée', titleAR: 'عرض العودة للمدارس', descFR: '-20% sur les soins visage', descAR: 'خصم 20% على العناية بالوجه', image: '🎯', start: '2025-09-01', end: '2025-09-30', active: true },
    { id: 2, titleFR: 'Pack Bébé', titleAR: 'حزمة الطفل', descFR: 'Lait + Crème à prix doux', descAR: 'حليب + كريم بسعر لطيف', image: '👶', start: '2025-10-01', end: '2025-10-31', active: true },
    { id: 3, titleFR: 'Vitamines en promo', titleAR: 'فيتامينات بأسعار مخفضة', descFR: 'Achetez 2, obtenez 1 offert', descAR: 'اشتر 2 واحصل على 1 مجاناً', image: '💪', start: '2025-11-01', end: '2025-11-30', active: false },
];

let messages = [
    { id: 1, name: 'Jean Dupont', email: 'jean@email.com', phone: '0612345678', message: 'Bonjour, je souhaite plus d\'informations sur la crème hydratante.', date: '2025-01-15 14:30', status: 'unread' },
    { id: 2, name: 'Fatima Zahra', email: 'fatima@email.com', phone: '0623456789', message: 'Est-ce que vous livrez à Casablanca ?', date: '2025-01-14 10:15', status: 'read' },
    { id: 3, name: 'Mohammed Ali', email: 'mohammed@email.com', phone: '0634567890', message: 'Je cherche un complément vitaminé pour l\'hiver.', date: '2025-01-13 16:45', status: 'unread' },
    { id: 4, name: 'Sophie Martin', email: 'sophie@email.com', phone: '0645678901', message: 'Merci pour votre rapidité de livraison !', date: '2025-01-12 09:20', status: 'read' },
];

let nextProductId = 6;
let nextCategoryId = 7;
let nextPromoId = 4;
let nextMessageId = 5;
let deleteTarget = null;
let deleteType = null;

// ---------- DOM REFS ----------
const sections = {
    dashboard: document.getElementById('section-dashboard'),
    products: document.getElementById('section-products'),
    categories: document.getElementById('section-categories'),
    promotions: document.getElementById('section-promotions'),
    messages: document.getElementById('section-messages'),
    settings: document.getElementById('section-settings'),
};

// ---------- NAVIGATION ----------
function setupNavigation() {
    const links = document.querySelectorAll('.sidebar-link[data-section]');
    const pageTitle = document.getElementById('pageTitle');
    const sectionNames = {
        dashboard: 'Dashboard',
        products: 'Produits',
        categories: 'Catégories',
        promotions: 'Promotions',
        messages: 'Messages',
        settings: 'Paramètres',
    };

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            
            // Update sidebar
            links.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Update sections
            Object.keys(sections).forEach(key => {
                sections[key].classList.remove('active');
            });
            sections[section].classList.add('active');
            
            // Update title
            pageTitle.textContent = sectionNames[section] || 'Dashboard';
            
            // Close sidebar on mobile
            document.getElementById('adminSidebar').classList.remove('open');
        });
    });
}

// ---------- SIDEBAR TOGGLE ----------
function setupSidebarToggle() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('adminSidebar');
    
    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

// ---------- MODALS ----------
function setupModals() {
    // Open modals via data-modal attribute
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.dataset.modal;
            openModal(modalId);
        });
    });
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            if (modal) closeModal(modal.id);
        });
    });
    
    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) closeModal(this.id);
        });
    });
    
    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
        }
    });
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ---------- RENDER PRODUCTS ----------
function renderProducts() {
    const tbody = document.querySelector('#productsTable tbody');
    const search = document.getElementById('productSearch').value.toLowerCase();
    const filter = document.getElementById('productCategoryFilter').value;
    
    let filtered = products.filter(p => {
        const matchSearch = p.nameFR.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
        const matchFilter = filter === 'all' || p.categories.includes(filter);
        return matchSearch && matchFilter;
    });
    
    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td class="emoji-icon">${p.image}</td>
            <td>${p.nameFR}</td>
            <td>${p.brand}</td>
            <td>${p.categories.join(', ')}</td>
            <td>${p.price} DH</td>
            <td><span class="badge ${p.available ? 'badge-success' : 'badge-danger'}">${p.available ? 'Oui' : 'Non'}</span></td>
            <td class="actions">
                <button class="btn-icon view" onclick="viewProduct(${p.id})" title="Voir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                <button class="btn-icon edit" onclick="editProduct(${p.id})" title="Modifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="btn-icon delete" onclick="confirmDelete('product', ${p.id})" title="Supprimer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </td>
        </tr>
    `).join('');
    
    updateStats();
}

function viewProduct(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    alert(`📦 ${p.nameFR}\nMarque: ${p.brand}\nPrix: ${p.price} DH\nCatégories: ${p.categories.join(', ')}\nDisponible: ${p.available ? 'Oui' : 'Non'}\n\nDescription: ${p.descFR}`);
}

function editProduct(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    
    document.getElementById('productModalTitle').textContent = 'Modifier le produit';
    document.getElementById('productFormId').value = p.id;
    document.getElementById('prodNameFR').value = p.nameFR;
    document.getElementById('prodNameAR').value = p.nameAR || '';
    document.getElementById('prodDescFR').value = p.descFR;
    document.getElementById('prodDescAR').value = p.descAR || '';
    document.getElementById('prodImage').value = p.image;
    document.getElementById('prodBrand').value = p.brand;
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodAvailable').checked = p.available;
    document.getElementById('prodFeatured').checked = p.featured || false;
    
    // Select categories
    const select = document.getElementById('prodCategories');
    Array.from(select.options).forEach(opt => {
        opt.selected = p.categories.includes(opt.value);
    });
    
    openModal('productModal');
}

function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('productFormId').value;
    const data = {
        nameFR: document.getElementById('prodNameFR').value,
        nameAR: document.getElementById('prodNameAR').value,
        descFR: document.getElementById('prodDescFR').value,
        descAR: document.getElementById('prodDescAR').value,
        image: document.getElementById('prodImage').value || '🧴',
        brand: document.getElementById('prodBrand').value,
        price: parseFloat(document.getElementById('prodPrice').value),
        categories: Array.from(document.getElementById('prodCategories').selectedOptions).map(o => o.value),
        available: document.getElementById('prodAvailable').checked,
        featured: document.getElementById('prodFeatured').checked,
    };
    
    if (id) {
        // Edit
        const index = products.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            products[index] = { ...products[index], ...data };
        }
    } else {
        // Add
        data.id = nextProductId++;
        products.push(data);
    }
    
    closeModal('productModal');
    renderProducts();
    document.getElementById('productForm').reset();
    document.getElementById('productFormId').value = '';
    document.getElementById('productModalTitle').textContent = 'Ajouter un produit';
}

// ---------- RENDER CATEGORIES ----------
function renderCategories() {
    const tbody = document.querySelector('#categoriesTable tbody');
    tbody.innerHTML = categories.map(c => `
        <tr>
            <td class="emoji-icon">${c.image}</td>
            <td>${c.nameFR}</td>
            <td>${c.nameAR || '-'}</td>
            <td>${c.count || 0}</td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editCategory(${c.id})" title="Modifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="btn-icon delete" onclick="confirmDelete('category', ${c.id})" title="Supprimer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </td>
        </tr>
    `).join('');
}

function editCategory(id) {
    const c = categories.find(cat => cat.id === id);
    if (!c) return;
    document.getElementById('categoryModalTitle').textContent = 'Modifier la catégorie';
    document.getElementById('categoryFormId').value = c.id;
    document.getElementById('catNameFR').value = c.nameFR;
    document.getElementById('catNameAR').value = c.nameAR || '';
    document.getElementById('catImage').value = c.image;
    openModal('categoryModal');
}

function saveCategory(e) {
    e.preventDefault();
    const id = document.getElementById('categoryFormId').value;
    const data = {
        nameFR: document.getElementById('catNameFR').value,
        nameAR: document.getElementById('catNameAR').value,
        image: document.getElementById('catImage').value || '📁',
        count: 0,
    };
    
    if (id) {
        const index = categories.findIndex(c => c.id === parseInt(id));
        if (index !== -1) {
            categories[index] = { ...categories[index], ...data };
        }
    } else {
        data.id = nextCategoryId++;
        categories.push(data);
    }
    
    closeModal('categoryModal');
    renderCategories();
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryFormId').value = '';
    document.getElementById('categoryModalTitle').textContent = 'Ajouter une catégorie';
}

// ---------- RENDER PROMOTIONS ----------
function renderPromotions() {
    const tbody = document.querySelector('#promotionsTable tbody');
    tbody.innerHTML = promotions.map(p => `
        <tr>
            <td class="emoji-icon">${p.image}</td>
            <td>${p.titleFR}</td>
            <td><span class="badge ${p.active ? 'badge-success' : 'badge-danger'}">${p.active ? 'Active' : 'Inactive'}</span></td>
            <td>${p.start}</td>
            <td>${p.end}</td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editPromotion(${p.id})" title="Modifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="btn-icon delete" onclick="confirmDelete('promotion', ${p.id})" title="Supprimer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </td>
        </tr>
    `).join('');
}

function editPromotion(id) {
    const p = promotions.find(promo => promo.id === id);
    if (!p) return;
    document.getElementById('promoModalTitle').textContent = 'Modifier la promotion';
    document.getElementById('promoFormId').value = p.id;
    document.getElementById('promoTitleFR').value = p.titleFR;
    document.getElementById('promoTitleAR').value = p.titleAR || '';
    document.getElementById('promoDescFR').value = p.descFR;
    document.getElementById('promoDescAR').value = p.descAR || '';
    document.getElementById('promoImage').value = p.image;
    document.getElementById('promoStart').value = p.start;
    document.getElementById('promoEnd').value = p.end;
    document.getElementById('promoActive').checked = p.active;
    openModal('promoModal');
}

function savePromotion(e) {
    e.preventDefault();
    const id = document.getElementById('promoFormId').value;
    const data = {
        titleFR: document.getElementById('promoTitleFR').value,
        titleAR: document.getElementById('promoTitleAR').value,
        descFR: document.getElementById('promoDescFR').value,
        descAR: document.getElementById('promoDescAR').value,
        image: document.getElementById('promoImage').value || '🎯',
        start: document.getElementById('promoStart').value,
        end: document.getElementById('promoEnd').value,
        active: document.getElementById('promoActive').checked,
    };
    
    if (id) {
        const index = promotions.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            promotions[index] = { ...promotions[index], ...data };
        }
    } else {
        data.id = nextPromoId++;
        promotions.push(data);
    }
    
    closeModal('promoModal');
    renderPromotions();
    document.getElementById('promoForm').reset();
    document.getElementById('promoFormId').value = '';
    document.getElementById('promoModalTitle').textContent = 'Ajouter une promotion';
}

// ---------- RENDER MESSAGES ----------
function renderMessages() {
    const tbody = document.querySelector('#messagesTable tbody');
    const search = document.getElementById('messageSearch').value.toLowerCase();
    const filter = document.getElementById('messageFilter').value;
    
    let filtered = messages.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search);
        const matchFilter = filter === 'all' || m.status === filter;
        return matchSearch && matchFilter;
    });
    
    tbody.innerHTML = filtered.map(m => `
        <tr>
            <td>${m.name}</td>
            <td>${m.email}</td>
            <td>${m.phone || '-'}</td>
            <td><span class="badge ${m.status === 'unread' ? 'badge-warning' : 'badge-success'}">${m.status === 'unread' ? 'Non lu' : 'Lu'}</span></td>
            <td>${m.date}</td>
            <td class="actions">
                <button class="btn-icon view" onclick="viewMessage(${m.id})" title="Voir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                <button class="btn-icon delete" onclick="confirmDelete('message', ${m.id})" title="Supprimer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </td>
        </tr>
    `).join('');
}

function viewMessage(id) {
    const m = messages.find(msg => msg.id === id);
    if (!m) return;
    
    document.getElementById('msgName').textContent = m.name;
    document.getElementById('msgEmail').textContent = m.email;
    document.getElementById('msgPhone').textContent = m.phone || '-';
    document.getElementById('msgDate').textContent = m.date;
    document.getElementById('msgStatus').innerHTML = `<span class="badge ${m.status === 'unread' ? 'badge-warning' : 'badge-success'}">${m.status === 'unread' ? 'Non lu' : 'Lu'}</span>`;
    document.getElementById('msgText').textContent = m.message;
    
    // Mark as read button
    const markBtn = document.getElementById('msgMarkRead');
    if (m.status === 'unread') {
        markBtn.style.display = 'inline-block';
        markBtn.onclick = function() {
            m.status = 'read';
            renderMessages();
            viewMessage(id);
        };
    } else {
        markBtn.style.display = 'none';
    }
    
    openModal('messageModal');
}

// ---------- DELETE ----------
function confirmDelete(type, id) {
    deleteTarget = id;
    deleteType = type;
    openModal('deleteModal');
}

document.getElementById('confirmDelete').addEventListener('click', function() {
    if (deleteTarget === null || deleteType === null) return;
    
    switch(deleteType) {
        case 'product':
            if (window.ProductsModule && typeof window.ProductsModule.deleteProduct === 'function') {
                window.ProductsModule.deleteProduct(deleteTarget);
            }
            break;
        case 'category':
            if (window.CategoriesModule && typeof window.CategoriesModule.deleteCategory === 'function') {
                window.CategoriesModule.deleteCategory(deleteTarget);
            }
            break;
        case 'promotion':
            if (window.PromotionsModule && typeof window.PromotionsModule.deletePromotion === 'function') {
                window.PromotionsModule.deletePromotion(deleteTarget);
            }
            break;
        case 'message':
            if (window.MessagesModule && typeof window.MessagesModule.deleteMessage === 'function') {
                window.MessagesModule.deleteMessage(deleteTarget);
            }
            break;
    }
    
    deleteTarget = null;
    deleteType = null;
    closeModal('deleteModal');
});

// ---------- UPDATE STATS ----------
function updateStats() {
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('totalCategories').textContent = categories.length;
    document.getElementById('totalPromotions').textContent = promotions.filter(p => p.active).length;
    document.getElementById('totalMessages').textContent = messages.filter(m => m.status === 'unread').length;
    
    // Recent products (last 3)
    const recentProducts = products.slice(-3).reverse();
    const recentTbody = document.querySelector('#recentProductsTable tbody');
    recentTbody.innerHTML = recentProducts.map(p => `
        <tr>
            <td>${p.nameFR}</td>
            <td>${p.brand}</td>
            <td>${p.price} DH</td>
            <td><span class="badge ${p.available ? 'badge-success' : 'badge-danger'}">${p.available ? 'Disponible' : 'Rupture'}</span></td>
        </tr>
    `).join('');
    
    // Recent messages
    const recentMessages = messages.slice(-3).reverse();
    const msgTbody = document.querySelector('#recentMessagesTable tbody');
    msgTbody.innerHTML = recentMessages.map(m => `
        <tr>
            <td>${m.name}</td>
            <td>${m.email}</td>
            <td><span class="badge ${m.status === 'unread' ? 'badge-warning' : 'badge-success'}">${m.status === 'unread' ? 'Non lu' : 'Lu'}</span></td>
            <td>${m.date}</td>
        </tr>
    `).join('');
}

// ---------- POPULATE CATEGORY SELECTS ----------
function populateCategorySelects() {
    // NOTE: 'productCategoryFilter' is intentionally NOT in this list.
    // It is populated with real Supabase categories by
    // ProductsModule (see js/products.js, loadCategoryOptionsForProductFilter()).
    const selects = ['prodCategories'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = categories.map(c => 
            `<option value="${c.nameFR}">${c.nameFR}</option>`
        ).join('');
        if (currentVal) select.value = currentVal;
    });
}

// ---------- SETUP EVENTS ----------
function setupEvents() {
    // Category form
    document.getElementById('categoryForm').addEventListener('submit', saveCategory);

    // Promotion form is now owned by PromotionsModule (js/promotions.js),
    // which binds its own real Supabase submit handler to #promoForm.
    // The old demo savePromotion() listener was removed from here: if
    // left in place it would have fired alongside the real handler on
    // every submit (a form's submit event doesn't stop other listeners
    // just because one of them calls preventDefault()), pushing a fake
    // row into the local demo array and re-rendering the table with
    // renderPromotions() — silently overwriting the real Supabase data
    // that PromotionsModule had just saved and reloaded.

    // Product search & category filter are now owned by ProductsModule
    // (real Supabase search + real category filter) — see js/products.js.

    // Message search & filter are NOT wired to the demo renderMessages()
    // anymore. Messages are now loaded from Supabase by MessagesModule
    // (js/messages.js). Leaving these listeners pointed at renderMessages()
    // would silently overwrite the real Supabase-rendered table with the
    // fake demo `messages` array on every keystroke/change — the exact
    // dual-execution bug already found and fixed for Promotions. Real
    // search/filter for Messages will be wired up in a later step.
    
    // Settings form
    document.getElementById('settingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        alert('✅ Paramètres enregistrés avec succès !');
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            window.location.href = 'login_admin.html';
        }
    });
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    setupSidebarToggle();
    setupModals();
    populateCategorySelects();
    setupEvents();
    updateStats();

    // Categories table is now loaded from Supabase — see js/categories.js
    if (window.CategoriesModule && typeof window.CategoriesModule.init === 'function') {
        window.CategoriesModule.init();
    }

    // Products table is now loaded from Supabase — see js/products.js
    if (window.ProductsModule?.init) {
        window.ProductsModule.init();
    }

    // Promotions table is now loaded from Supabase (Step 1: read-only)
    // — see js/promotions.js. renderPromotions() removed above since it
    // was writing the fake demo array over the real Supabase table on
    // every page load.
    if (window.PromotionsModule?.init) {
        window.PromotionsModule.init();
    }

    // Messages table is now loaded from Supabase (Step 1: read-only) —
    // see js/messages.js. The demo renderMessages() call was removed
    // above, and its search/filter listeners were disconnected in
    // setupEvents(), for the same reason the old demo promotion
    // listener was removed: to prevent the fake array from silently
    // overwriting the real Supabase-rendered table.
    if (window.MessagesModule?.init) {
        window.MessagesModule.init();
    }

    console.log('✅ Admin panel loaded — Données samples (remplacées par Supabase plus tard)');
});