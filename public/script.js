/**
 * Amrani Parapharmacie — Public Website
 * Loads all content live from Supabase. No mock data.
 */

// ==================================================================
// SUPABASE CONFIGURATION — replace these two values only
// ==================================================================
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-KEY";
// ==================================================================

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== STATE ====================
const State = {
    categories: [],
    products: [],
    promotions: [],
    settings: null,
    activeCategory: 'all',
    searchQuery: ''
};

// ==================== HELPERS ====================

function el(id) {
    return document.getElementById(id);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatPrice(price) {
    const value = Number(price);
    if (Number.isNaN(value)) return '';
    return value.toFixed(2) + ' DH';
}

function onImgError(imgEl, fallbackIconHtml) {
    imgEl.onerror = null;
    const wrapper = imgEl.parentElement;
    wrapper.innerHTML = fallbackIconHtml;
}

let toastTimer;
function showToast(message, type = 'success') {
    const toast = el('toast');
    toast.textContent = message;
    toast.className = 'toast show' + (type === 'error' ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function digitsOnly(str) {
    return (str || '').replace(/[^\d+]/g, '');
}

// ==================== SETTINGS ====================

async function loadSettings() {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        State.settings = data || {};
        renderSettings(State.settings);
    } catch (err) {
        console.error('Erreur lors du chargement des paramètres :', err);
        // Fall back gracefully — keep the static placeholders already in the HTML
    }
}

function renderSettings(settings) {
    const pharmacyName = settings.pharmacy_name || 'Amrani Parapharmacie';
    document.title = pharmacyName;
    el('brandName').textContent = pharmacyName;
    el('footerBrandName').textContent = pharmacyName;
    el('footerYear').textContent = new Date().getFullYear();

    if (settings.logo_url) {
        const wrap = el('brandLogoWrap');
        wrap.innerHTML = `<img src="${escapeHtml(settings.logo_url)}" alt="${escapeHtml(pharmacyName)}" />`;
    }

    if (settings.hero_title_fr) el('heroTitleFr').textContent = settings.hero_title_fr;
    if (settings.hero_title_ar) el('heroTitleAr').textContent = settings.hero_title_ar;
    if (settings.hero_description_fr) el('heroDescFr').textContent = settings.hero_description_fr;
    if (settings.hero_description_ar) el('heroDescAr').textContent = settings.hero_description_ar;

    // About / hours card
    el('openingHoursText').textContent = settings.opening_hours || 'Non renseigné';
    el('addressText').textContent = settings.address || 'Non renseignée';

    // Contact section
    const phone = settings.phone || '';
    const whatsapp = settings.whatsapp || '';
    const instagram = settings.instagram || '';

    el('contactPhoneText').textContent = phone || 'Non renseigné';
    el('contactPhone').href = phone ? `tel:${digitsOnly(phone)}` : '#';

    el('contactWhatsappText').textContent = whatsapp || 'Non renseigné';
    const waLink = whatsapp ? `https://wa.me/${digitsOnly(whatsapp).replace(/^0/, '212')}` : '#';
    el('contactWhatsapp').href = waLink;
    el('navWhatsapp').href = waLink;

    el('contactInstagramText').textContent = instagram
        ? (instagram.includes('instagram.com') ? '@' + instagram.split('instagram.com/')[1]?.replace(/\/$/, '') : instagram)
        : 'Non renseigné';
    el('contactInstagram').href = instagram && instagram.startsWith('http') ? instagram : (instagram ? `https://instagram.com/${instagram.replace('@', '')}` : '#');

    el('contactAddressText').textContent = settings.address || 'Non renseignée';
    el('contactHoursText').textContent = settings.opening_hours || 'Non renseignées';
}

// ==================== CATEGORIES ====================

async function loadCategories() {
    const grid = el('categoriesGrid');
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name_fr', { ascending: true });

        if (error) throw error;

        State.categories = data || [];
        renderCategories(State.categories);
        renderCategoryChips(State.categories);
    } catch (err) {
        console.error('Erreur lors du chargement des catégories :', err);
        grid.innerHTML = `<p class="empty-note">Impossible de charger les catégories pour le moment.</p>`;
    }
}

function renderCategories(categories) {
    const grid = el('categoriesGrid');

    if (!categories.length) {
        grid.innerHTML = `<p class="empty-note">Aucune catégorie disponible pour le moment.</p>`;
        return;
    }

    grid.innerHTML = categories.map(cat => `
        <a href="#products" class="category-card" data-category-link="${cat.id}">
            <div class="category-image">
                ${cat.image_url
                    ? `<img src="${escapeHtml(cat.image_url)}" alt="${escapeHtml(cat.name_fr)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-tag\\'></i>'" />`
                    : `<i class="fas fa-tag"></i>`}
            </div>
            <h3>${escapeHtml(cat.name_fr)}</h3>
            <span class="name-ar" dir="rtl" lang="ar">${escapeHtml(cat.name_ar || '')}</span>
        </a>
    `).join('');

    grid.querySelectorAll('[data-category-link]').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveCategory(card.dataset.categoryLink);
            document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

function renderCategoryChips(categories) {
    const container = el('categoryFilterChips');
    const chips = ['<button class="chip active" data-category="all">Tous</button>']
        .concat(categories.map(cat => `<button class="chip" data-category="${cat.id}">${escapeHtml(cat.name_fr)}</button>`));
    container.innerHTML = chips.join('');

    container.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => setActiveCategory(chip.dataset.category));
    });
}

function setActiveCategory(categoryId) {
    State.activeCategory = String(categoryId);
    document.querySelectorAll('#categoryFilterChips .chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.category === String(categoryId));
    });
    renderProducts();
}

function getCategoryName(categoryId) {
    const cat = State.categories.find(c => String(c.id) === String(categoryId));
    return cat ? cat.name_fr : '';
}

// ==================== PROMOTIONS ====================

async function loadPromotions() {
    const grid = el('promotionsGrid');
    try {
        const { data, error } = await supabase
            .from('promotions')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        State.promotions = data || [];
        renderPromotions(State.promotions);
    } catch (err) {
        console.error('Erreur lors du chargement des promotions :', err);
        grid.innerHTML = `<p class="empty-note">Impossible de charger les promotions pour le moment.</p>`;
    }
}

function renderPromotions(promotions) {
    const grid = el('promotionsGrid');
    const section = document.getElementById('promotions');

    if (!promotions.length) {
        section.style.display = 'none';
        return;
    }
    section.style.display = '';

    grid.innerHTML = promotions.map(promo => `
        <div class="promo-card">
            <span class="promo-tag">Promo</span>
            <div class="promo-image">
                ${promo.image_url
                    ? `<img src="${escapeHtml(promo.image_url)}" alt="${escapeHtml(promo.title_fr)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-bullhorn\\'></i>'" />`
                    : `<i class="fas fa-bullhorn"></i>`}
            </div>
            <div class="promo-body">
                <h3>${escapeHtml(promo.title_fr)}</h3>
                <span class="promo-ar" dir="rtl" lang="ar">${escapeHtml(promo.title_ar || '')}</span>
                ${promo.description_fr ? `<p>${escapeHtml(promo.description_fr)}</p>` : ''}
            </div>
        </div>
    `).join('');
}

// ==================== PRODUCTS ====================

async function loadProducts() {
    const grid = el('productsGrid');
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_available', true)
            .order('is_featured', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        State.products = data || [];
        renderProducts();
    } catch (err) {
        console.error('Erreur lors du chargement des produits :', err);
        grid.innerHTML = `<p class="empty-note">Impossible de charger les produits pour le moment. Veuillez réessayer plus tard.</p>`;
    }
}

function getFilteredProducts() {
    let list = [...State.products];

    if (State.activeCategory !== 'all') {
        list = list.filter(p => String(p.category_id) === State.activeCategory);
    }

    if (State.searchQuery) {
        const q = State.searchQuery.toLowerCase();
        list = list.filter(p =>
            (p.name_fr || '').toLowerCase().includes(q) ||
            (p.name_ar || '').toLowerCase().includes(q) ||
            (p.brand || '').toLowerCase().includes(q)
        );
    }

    return list;
}

function renderProducts() {
    const grid = el('productsGrid');
    const emptyNote = el('productsEmpty');
    const products = getFilteredProducts();

    if (!State.products.length) {
        grid.innerHTML = '';
        emptyNote.hidden = false;
        emptyNote.textContent = 'Aucun produit disponible pour le moment.';
        return;
    }

    if (!products.length) {
        grid.innerHTML = '';
        emptyNote.hidden = false;
        emptyNote.textContent = 'Aucun produit ne correspond à votre recherche.';
        return;
    }

    emptyNote.hidden = true;

    grid.innerHTML = products.map(product => `
        <div class="product-card ${product.is_featured ? 'featured' : ''}">
            ${product.is_featured ? '<span class="product-badge">⭐ Vedette</span>' : ''}
            <div class="product-image">
                ${product.image_url
                    ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name_fr)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-capsules\\'></i>'" />`
                    : `<i class="fas fa-capsules"></i>`}
            </div>
            <div class="product-body">
                <span class="product-brand">${escapeHtml(product.brand || '')}</span>
                <span class="product-name">${escapeHtml(product.name_fr)}</span>
                <span class="product-name-ar" dir="rtl" lang="ar">${escapeHtml(product.name_ar || '')}</span>
                <div class="product-footer">
                    <span class="product-price">${formatPrice(product.price)}</span>
                    <span class="product-avail">Disponible</span>
                </div>
            </div>
        </div>
    `).join('');
}

function initProductControls() {
    const searchInput = el('productSearch');
    let debounceTimer;
    searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            State.searchQuery = this.value.trim();
            renderProducts();
        }, 250);
    });
}

// ==================== CONTACT FORM ====================

function initContactForm() {
    const form = el('contactForm');
    const submitBtn = el('cfSubmit');
    const note = el('cfNote');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = el('cfName').value.trim();
        const email = el('cfEmail').value.trim();
        const phone = el('cfPhone').value.trim();
        const message = el('cfMessage').value.trim();

        const fields = [
            { input: el('cfName'), value: name },
            { input: el('cfEmail'), value: email },
            { input: el('cfMessage'), value: message }
        ];

        let hasError = false;
        fields.forEach(f => {
            if (!f.value) {
                f.input.classList.add('error');
                hasError = true;
            } else {
                f.input.classList.remove('error');
            }
        });

        if (hasError) {
            showFormNote('Merci de remplir tous les champs obligatoires.', 'error');
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            el('cfEmail').classList.add('error');
            showFormNote('Merci de saisir une adresse email valide.', 'error');
            return;
        }

        submitBtn.disabled = true;
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Envoi en cours...</span>';

        try {
            const { error } = await supabase
                .from('messages')
                .insert([{ name, email, phone, message }]);

            if (error) throw error;

            form.reset();
            showFormNote('✅ Message envoyé avec succès. Nous vous répondrons rapidement.', 'success');
            showToast('Message envoyé avec succès !', 'success');
        } catch (err) {
            console.error('Erreur lors de l\'envoi du message :', err);
            showFormNote("❌ Une erreur est survenue. Merci de réessayer dans un instant.", 'error');
            showToast("Erreur lors de l'envoi du message", 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHtml;
        }
    });

    function showFormNote(text, type) {
        note.textContent = text;
        note.className = `form-note ${type}`;
        note.hidden = false;
    }
}

// ==================== NAVBAR ====================

function initNavbar() {
    const toggle = el('navToggle');
    const navbar = el('navbar');

    toggle.addEventListener('click', () => {
        navbar.classList.toggle('nav-open');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => navbar.classList.remove('nav-open'));
    });
}

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initProductControls();
    initContactForm();

    // Load everything from Supabase in parallel — independent sections
    // so one failure doesn't block the rest of the page.
    loadSettings();
    loadCategories().then(loadProducts); // products render needs category names loaded for filtering
    loadPromotions();
});
