/**
 * Amrani Parapharmacie - Settings Management Script
 * The `settings` table holds a single row. We load it if it exists,
 * and create it on first save if it doesn't.
 */

// ==================== STATE ====================
let currentSettings = {
    id: null,
    pharmacy_name: '',
    logo_url: '',
    hero_title_fr: '',
    hero_title_ar: '',
    hero_description_fr: '',
    hero_description_ar: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    address: '',
    opening_hours: ''
};

// ==================== DOM REFERENCES ====================
const DOM = {
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),

    pharmacyName: document.getElementById('pharmacyName'),
    logoUrl: document.getElementById('logoUrl'),
    logoPreview: document.getElementById('logoPreview'),

    heroTitleFr: document.getElementById('heroTitleFr'),
    heroTitleAr: document.getElementById('heroTitleAr'),
    heroDescFr: document.getElementById('heroDescFr'),
    heroDescAr: document.getElementById('heroDescAr'),
    previewTitleFr: document.getElementById('previewTitleFr'),
    previewTitleAr: document.getElementById('previewTitleAr'),
    previewDescFr: document.getElementById('previewDescFr'),
    previewDescAr: document.getElementById('previewDescAr'),
    heroPreviewLogo: document.getElementById('heroPreviewLogo'),

    phone: document.getElementById('phone'),
    whatsapp: document.getElementById('whatsapp'),
    address: document.getElementById('address'),

    instagram: document.getElementById('instagram'),
    instagramPreview: document.getElementById('instagramPreview'),
    instagramUsername: document.getElementById('instagramUsername'),
    socialPreview: document.getElementById('socialPreview'),

    openingHours: document.getElementById('openingHours'),
    previewHours: document.getElementById('previewHours'),

    saveBtn: document.getElementById('saveBtn'),
    resetBtn: document.getElementById('resetBtn'),

    resetModal: document.getElementById('resetModal'),
    confirmResetBtn: document.getElementById('confirmResetBtn'),
    cancelResetBtn: document.getElementById('cancelResetBtn'),
    closeResetModal: document.getElementById('closeResetModal'),

    searchInput: document.getElementById('searchInput')
};

// ==================== HELPER FUNCTIONS ====================

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

function extractInstagramUsername(url) {
    if (!url) return null;
    const match = url.match(/instagram\.com\/([^\/?]+)/);
    return match ? match[1] : null;
}

// ==================== DATA FETCHING ====================

async function loadSettingsFromDb() {
    const { data, error } = await supabaseClient
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (error) {
        showNotification('Erreur lors du chargement des paramètres', 'error');
        return;
    }

    if (data) {
        currentSettings = { ...currentSettings, ...data };
    }

    loadSettingsIntoForm();
}

// ==================== FORM <-> STATE ====================

function loadSettingsIntoForm() {
    DOM.pharmacyName.value = currentSettings.pharmacy_name || '';
    DOM.logoUrl.value = currentSettings.logo_url || '';
    updateLogoPreview(currentSettings.logo_url);

    DOM.heroTitleFr.value = currentSettings.hero_title_fr || '';
    DOM.heroTitleAr.value = currentSettings.hero_title_ar || '';
    DOM.heroDescFr.value = currentSettings.hero_description_fr || '';
    DOM.heroDescAr.value = currentSettings.hero_description_ar || '';
    updateHeroPreview();
    updateHeroLogo(currentSettings.logo_url);

    DOM.phone.value = currentSettings.phone || '';
    DOM.whatsapp.value = currentSettings.whatsapp || '';
    DOM.address.value = currentSettings.address || '';

    DOM.instagram.value = currentSettings.instagram || '';
    updateInstagramPreview(currentSettings.instagram);

    DOM.openingHours.value = currentSettings.opening_hours || '';
    updateHoursPreview(currentSettings.opening_hours);
}

function updateLogoPreview(url) {
    const preview = DOM.logoPreview;
    if (url && url.trim()) {
        preview.innerHTML = `<img src="${url}" alt="Logo" />`;
        preview.classList.add('has-logo');
    } else {
        preview.innerHTML = '<i class="fas fa-plus-circle"></i>';
        preview.classList.remove('has-logo');
    }
}

function updateHeroLogo(url) {
    const preview = DOM.heroPreviewLogo;
    if (url && url.trim()) {
        preview.innerHTML = `<img src="${url}" alt="Logo" />`;
        preview.classList.add('has-logo');
    } else {
        preview.innerHTML = '<i class="fas fa-plus-circle"></i>';
        preview.classList.remove('has-logo');
    }
}

function updateHeroPreview() {
    const titleFr = DOM.heroTitleFr.value || 'Hero Title (FR)';
    const titleAr = DOM.heroTitleAr.value || 'Hero Title (AR)';
    const descFr = DOM.heroDescFr.value || 'Description (FR)';
    const descAr = DOM.heroDescAr.value || 'Description (AR)';

    DOM.previewTitleFr.textContent = titleFr;
    DOM.previewTitleAr.textContent = titleAr;
    DOM.previewDescFr.textContent = descFr;
    DOM.previewDescAr.textContent = descAr;
}

function updateInstagramPreview(url) {
    const preview = DOM.instagramPreview;
    const usernameSpan = DOM.instagramUsername;

    if (url && url.trim()) {
        const username = extractInstagramUsername(url);
        if (username) {
            usernameSpan.textContent = `@${username}`;
        } else {
            usernameSpan.textContent = url;
        }
        preview.href = url;
        preview.style.color = 'var(--primary)';
        preview.style.pointerEvents = 'auto';
    } else {
        usernameSpan.textContent = 'No Instagram account linked';
        preview.href = '#';
        preview.style.color = 'var(--gray-400)';
        preview.style.pointerEvents = 'none';
    }
}

function updateHoursPreview(hours) {
    const preview = DOM.previewHours;
    if (hours && hours.trim()) {
        preview.textContent = hours;
        preview.className = '';
    } else {
        preview.textContent = 'No hours set';
        preview.className = 'hours-empty';
    }
}

function getSettingsFromForm() {
    return {
        pharmacy_name: DOM.pharmacyName.value.trim(),
        logo_url: DOM.logoUrl.value.trim(),
        hero_title_fr: DOM.heroTitleFr.value.trim(),
        hero_title_ar: DOM.heroTitleAr.value.trim(),
        hero_description_fr: DOM.heroDescFr.value.trim(),
        hero_description_ar: DOM.heroDescAr.value.trim(),
        phone: DOM.phone.value.trim(),
        whatsapp: DOM.whatsapp.value.trim(),
        instagram: DOM.instagram.value.trim(),
        address: DOM.address.value.trim(),
        opening_hours: DOM.openingHours.value.trim()
    };
}

function validateSettings(settings) {
    const errors = [];

    if (!settings.pharmacy_name) errors.push('Pharmacy name is required');
    if (!settings.hero_title_fr) errors.push('Hero title (French) is required');
    if (!settings.hero_title_ar) errors.push('Hero title (Arabic) is required');
    if (!settings.phone) errors.push('Phone number is required');
    if (!settings.address) errors.push('Address is required');
    if (!settings.opening_hours) errors.push('Opening hours are required');

    return errors;
}

// ==================== SAVE / RESET ====================

async function saveSettings() {
    const formValues = getSettingsFromForm();
    const errors = validateSettings(formValues);

    if (errors.length > 0) {
        showNotification(`❌ ${errors.join(', ')}`, 'error');
        return false;
    }

    const saveBtn = DOM.saveBtn;
    const originalHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    let error, data;

    if (currentSettings.id) {
        ({ data, error } = await supabaseClient
            .from('settings')
            .update(formValues)
            .eq('id', currentSettings.id)
            .select()
            .single());
    } else {
        ({ data, error } = await supabaseClient
            .from('settings')
            .insert([formValues])
            .select()
            .single());
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;

    if (error) {
        console.error(error);
        showNotification('Error saving settings: ' + error.message, 'error');
        return false;
    }

    currentSettings = { ...currentSettings, ...data };
    loadSettingsIntoForm();

    showNotification('✅ Settings saved successfully!', 'success');
    return true;
}

async function resetSettingsToSaved() {
    await loadSettingsFromDb();
    showNotification('↩️ Settings reset to last saved values', 'info');
    closeResetModal();
}

// ==================== MODAL FUNCTIONS ====================

function openResetModal() {
    DOM.resetModal.classList.add('active');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

function closeResetModal() {
    DOM.resetModal.classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
}

// ==================== TAB FUNCTIONS ====================

function switchTab(tabId) {
    DOM.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    DOM.tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
}

// ==================== SEARCH ====================

function searchSettings(query) {
    if (!query.trim()) {
        DOM.tabPanels.forEach(panel => panel.style.display = '');
        document.querySelectorAll('.settings-card-body input, .settings-card-body textarea').forEach(field => {
            field.style.borderColor = '';
            field.style.boxShadow = '';
        });
        return;
    }

    const search = query.toLowerCase().trim();
    const panels = document.querySelectorAll('.tab-panel');
    let found = false;

    panels.forEach(panel => {
        const fields = panel.querySelectorAll('input, textarea');
        let hasMatch = false;

        fields.forEach(field => {
            if (field.value.toLowerCase().includes(search)) {
                hasMatch = true;
                field.style.borderColor = 'var(--primary)';
                field.style.boxShadow = '0 0 0 3px rgba(46, 125, 50, 0.1)';
            } else {
                field.style.borderColor = '';
                field.style.boxShadow = '';
            }
        });

        const labels = panel.querySelectorAll('label');
        labels.forEach(label => {
            if (label.textContent.toLowerCase().includes(search)) {
                hasMatch = true;
            }
        });

        if (hasMatch) {
            panel.style.display = '';
            found = true;
        } else {
            panel.style.display = 'none';
        }
    });

    if (!found && query.length > 0) {
        showNotification('No settings found matching your search', 'info');
    }
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

document.addEventListener('DOMContentLoaded', async function () {
    await loadSettingsFromDb();

    initSidebar();

    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            switchTab(this.dataset.tab);
        });
    });

    DOM.heroTitleFr.addEventListener('input', updateHeroPreview);
    DOM.heroTitleAr.addEventListener('input', updateHeroPreview);
    DOM.heroDescFr.addEventListener('input', updateHeroPreview);
    DOM.heroDescAr.addEventListener('input', updateHeroPreview);

    DOM.logoUrl.addEventListener('input', function () {
        updateLogoPreview(this.value);
        updateHeroLogo(this.value);
    });

    DOM.instagram.addEventListener('input', function () {
        updateInstagramPreview(this.value);
    });

    DOM.openingHours.addEventListener('input', function () {
        updateHoursPreview(this.value);
    });

    DOM.saveBtn.addEventListener('click', saveSettings);

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveSettings();
        }
    });

    DOM.resetBtn.addEventListener('click', openResetModal);

    DOM.confirmResetBtn.addEventListener('click', resetSettingsToSaved);
    DOM.cancelResetBtn.addEventListener('click', closeResetModal);
    DOM.closeResetModal.addEventListener('click', closeResetModal);

    DOM.resetModal.addEventListener('click', function (e) {
        if (e.target === this) {
            closeResetModal();
        }
    });

    let searchTimeout;
    DOM.searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchSettings(this.value);
        }, 300);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeResetModal();
        }
    });

    console.log('⚙️ Settings Management initialized (Supabase)');
});
