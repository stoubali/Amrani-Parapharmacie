/**
 * Amrani Parapharmacie - Settings Management Script
 * Handles website settings configuration with tabs and live preview
 */

// ==================== DEFAULT SETTINGS ====================
const DEFAULT_SETTINGS = {
    pharmacy_name: 'Amrani Parapharmacie',
    logo_url: '',
    hero_title_fr: 'Bienvenue à la Parapharmacie Amrani',
    hero_title_ar: 'مرحباً بكم في صيدلية العمري',
    hero_description_fr: 'Votre santé est notre priorité. Découvrez nos produits de qualité.',
    hero_description_ar: 'صحتكم هي أولويتنا. اكتشفوا منتجاتنا عالية الجودة.',
    phone: '05 22 33 44 55',
    whatsapp: '06 12 34 56 78',
    instagram: 'https://www.instagram.com/amrani_parapharmacie',
    address: '123 Boulevard Mohammed V, Casablanca, Maroc',
    opening_hours: 'Lun - Sam: 9h - 20h'
};

// ==================== CURRENT SETTINGS ====================
let currentSettings = { ...DEFAULT_SETTINGS };

// ==================== DOM REFERENCES ====================
const DOM = {
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),

    // Pharmacy
    pharmacyName: document.getElementById('pharmacyName'),
    logoUrl: document.getElementById('logoUrl'),
    logoPreview: document.getElementById('logoPreview'),

    // Hero
    heroTitleFr: document.getElementById('heroTitleFr'),
    heroTitleAr: document.getElementById('heroTitleAr'),
    heroDescFr: document.getElementById('heroDescFr'),
    heroDescAr: document.getElementById('heroDescAr'),
    previewTitleFr: document.getElementById('previewTitleFr'),
    previewTitleAr: document.getElementById('previewTitleAr'),
    previewDescFr: document.getElementById('previewDescFr'),
    previewDescAr: document.getElementById('previewDescAr'),
    heroPreviewLogo: document.getElementById('heroPreviewLogo'),

    // Contact
    phone: document.getElementById('phone'),
    whatsapp: document.getElementById('whatsapp'),
    address: document.getElementById('address'),

    // Social
    instagram: document.getElementById('instagram'),
    instagramPreview: document.getElementById('instagramPreview'),
    instagramUsername: document.getElementById('instagramUsername'),
    socialPreview: document.getElementById('socialPreview'),

    // Hours
    openingHours: document.getElementById('openingHours'),
    previewHours: document.getElementById('previewHours'),

    // Actions
    saveBtn: document.getElementById('saveBtn'),
    resetBtn: document.getElementById('resetBtn'),

    // Reset Modal
    resetModal: document.getElementById('resetModal'),
    confirmResetBtn: document.getElementById('confirmResetBtn'),
    cancelResetBtn: document.getElementById('cancelResetBtn'),
    closeResetModal: document.getElementById('closeResetModal'),

    // Search
    searchInput: document.getElementById('searchInput')
};

// ==================== HELPER FUNCTIONS ====================

function showNotification(message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(message, type);
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

function extractInstagramUsername(url) {
    if (!url) return null;
    const match = url.match(/instagram\.com\/([^\/?]+)/);
    return match ? match[1] : null;
}

// ==================== SETTINGS OPERATIONS ====================

// Load settings into form
function loadSettings() {
    // Pharmacy
    DOM.pharmacyName.value = currentSettings.pharmacy_name;
    DOM.logoUrl.value = currentSettings.logo_url || '';
    updateLogoPreview(currentSettings.logo_url);

    // Hero
    DOM.heroTitleFr.value = currentSettings.hero_title_fr;
    DOM.heroTitleAr.value = currentSettings.hero_title_ar;
    DOM.heroDescFr.value = currentSettings.hero_description_fr || '';
    DOM.heroDescAr.value = currentSettings.hero_description_ar || '';
    updateHeroPreview();
    updateHeroLogo(currentSettings.logo_url);

    // Contact
    DOM.phone.value = currentSettings.phone;
    DOM.whatsapp.value = currentSettings.whatsapp || '';
    DOM.address.value = currentSettings.address;

    // Social
    DOM.instagram.value = currentSettings.instagram || '';
    updateInstagramPreview(currentSettings.instagram);

    // Hours
    DOM.openingHours.value = currentSettings.opening_hours;
    updateHoursPreview(currentSettings.opening_hours);
}

// Update logo preview in pharmacy tab
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

// Update hero logo preview
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

// Update hero preview
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

// Update Instagram preview
function updateInstagramPreview(url) {
    const preview = DOM.instagramPreview;
    const usernameSpan = DOM.instagramUsername;

    if (url && url.trim()) {
        const username = extractInstagramUsername(url);
        if (username) {
            usernameSpan.textContent = `@${username}`;
            preview.href = url;
            preview.style.color = 'var(--primary)';
            preview.style.pointerEvents = 'auto';
        } else {
            usernameSpan.textContent = url;
            preview.href = url;
            preview.style.color = 'var(--primary)';
            preview.style.pointerEvents = 'auto';
        }
    } else {
        usernameSpan.textContent = 'No Instagram account linked';
        preview.href = '#';
        preview.style.color = 'var(--gray-400)';
        preview.style.pointerEvents = 'none';
    }
}

// Update hours preview
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

// Get settings from form
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

// Validate settings
function validateSettings(settings) {
    const errors = [];

    if (!settings.pharmacy_name) {
        errors.push('Pharmacy name is required');
    }
    if (!settings.hero_title_fr) {
        errors.push('Hero title (French) is required');
    }
    if (!settings.hero_title_ar) {
        errors.push('Hero title (Arabic) is required');
    }
    if (!settings.phone) {
        errors.push('Phone number is required');
    }
    if (!settings.address) {
        errors.push('Address is required');
    }
    if (!settings.opening_hours) {
        errors.push('Opening hours are required');
    }

    return errors;
}

// Save settings
function saveSettings() {
    const settings = getSettingsFromForm();
    const errors = validateSettings(settings);

    if (errors.length > 0) {
        showNotification(`❌ Please fix the following errors:\n${errors.join('\n')}`, 'error');
        return false;
    }

    currentSettings = { ...settings };
    // Update all previews
    updateHeroPreview();
    updateHeroLogo(settings.logo_url);
    updateInstagramPreview(settings.instagram);
    updateHoursPreview(settings.opening_hours);
    updateLogoPreview(settings.logo_url);

    showNotification('✅ Settings saved successfully!', 'success');
    return true;
}

// Reset settings to default
function resetSettings() {
    currentSettings = { ...DEFAULT_SETTINGS };
    loadSettings();
    showNotification('↩️ Settings reset to default', 'info');
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
    // Update tab buttons
    DOM.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update tab panels
    DOM.tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
}

// ==================== SEARCH ====================

function searchSettings(query) {
    if (!query.trim()) {
        // Show all tabs and reset field styles
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
            // Check if field value matches search
            if (field.value.toLowerCase().includes(search)) {
                hasMatch = true;
                field.style.borderColor = 'var(--primary)';
                field.style.boxShadow = '0 0 0 3px rgba(46, 125, 50, 0.1)';
            } else {
                field.style.borderColor = '';
                field.style.boxShadow = '';
            }
        });

        // Also check labels
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

document.addEventListener('DOMContentLoaded', function () {
    // Load settings
    loadSettings();

    // Sidebar
    initSidebar();

    // Tab switching
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            switchTab(this.dataset.tab);
        });
    });

    // Live preview updates
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

    // Also update hero preview when logo changes in pharmacy tab
    DOM.pharmacyName.addEventListener('input', function () {
        // Optional: Update hero preview with pharmacy name
    });

    // Save button
    DOM.saveBtn.addEventListener('click', saveSettings);

    // Keyboard shortcut: Ctrl+S to save
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveSettings();
        }
    });

    // Reset button
    DOM.resetBtn.addEventListener('click', openResetModal);

    // Reset modal
    DOM.confirmResetBtn.addEventListener('click', resetSettings);
    DOM.cancelResetBtn.addEventListener('click', closeResetModal);
    DOM.closeResetModal.addEventListener('click', closeResetModal);

    // Click outside modal to close
    DOM.resetModal.addEventListener('click', function (e) {
        if (e.target === this) {
            closeResetModal();
        }
    });

    // Search functionality
    let searchTimeout;
    DOM.searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchSettings(this.value);
        }, 300);
    });

    // Keyboard shortcut: Escape to close modals
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeResetModal();
        }
    });

    console.log('⚙️ Settings Management initialized');
    console.log('📋 Settings loaded:', currentSettings);
});

// ==================== EXPOSE FOR DEBUGGING ====================
window.currentSettings = currentSettings;
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;
window.loadSettings = loadSettings;