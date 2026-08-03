/* Public site common.js (copied) */

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
    const n = Number(price || 0);
    return n.toFixed(2) + ' DH';
}

function waLink(number) {
    if (!number) return null;
    const digits = number.replace(/[^\d]/g, '');
    return `https://wa.me/${digits}`;
}

let siteSettings = null;

async function fetchSettings() {
    if (siteSettings) return siteSettings;
    const { data, error } = await supabaseClient
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error loading settings:', error);
        siteSettings = {};
        return siteSettings;
    }

    siteSettings = data || {};
    return siteSettings;
}

function renderNavbar(settings, activePage) {
    const mount = document.getElementById('siteNavbar');
    if (!mount) return;

    const name = escapeHtml(settings.pharmacy_name || 'Parapharmacie');
    const logo = settings.logo_url
        ? `<img src="${escapeHtml(settings.logo_url)}" alt="${name}" class="nav-logo-img" />`
        : `<i class="fas fa-plus-circle"></i>`;

    mount.innerHTML = `
        <div class="nav-inner">
            <a href="index.html" class="nav-brand">
                <span class="nav-logo">${logo}</span>
                <span class="nav-name">${name}</span>
            </a>

            <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">
                <i class="fas fa-bars"></i>
            </button>

            <nav class="nav-links" id="navLinks">
                <a href="index.html" class="${activePage === 'home' ? 'active' : ''}">Home</a>
                <a href="products.html" class="${activePage === 'products' ? 'active' : ''}">Products</a>
                <a href="index.html#categories">Categories</a>
                <a href="index.html#promotions">Promotions</a>
                <a href="index.html#about">About</a>
                <a href="index.html#contact" class="nav-cta">Contact</a>
            </nav>
        </div>
    `;

    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    toggle.addEventListener('click', () => {
        links.classList.toggle('open');
        toggle.classList.toggle('active');
    });
}

function renderFooter(settings) {
    const mount = document.getElementById('siteFooter');
    if (!mount) return;

    const name = escapeHtml(settings.pharmacy_name || 'Parapharmacie');
    const phone = settings.phone || '';
    const whatsapp = settings.whatsapp || '';
    const instagram = settings.instagram || '';
    const address = settings.address || '';
    const hours = settings.opening_hours || '';
    const year = new Date().getFullYear();

    mount.innerHTML = `
        <div class="footer-inner">
            <div class="footer-col footer-brand">
                <span class="footer-name">${name}</span>
                <p>${escapeHtml(settings.hero_description_fr || '')}</p>
            </div>

            <div class="footer-col">
                <h4>Contact</h4>
                <ul>
                    ${phone ? `<li><i class="fas fa-phone"></i> <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></li>` : ''}
                    ${whatsapp ? `<li><i class="fab fa-whatsapp"></i> <a href="${waLink(whatsapp)}" target="_blank" rel="noopener">${escapeHtml(whatsapp)}</a></li>` : ''}
                    ${address ? `<li><i class="fas fa-map-marker-alt"></i> ${escapeHtml(address)}</li>` : ''}
                </ul>
            </div>

            <div class="footer-col">
                <h4>Hours</h4>
                <p>${escapeHtml(hours) || 'Contact us for hours'}</p>
                ${instagram ? `<a href="${escapeHtml(instagram)}" target="_blank" rel="noopener" class="footer-social"><i class="fab fa-instagram"></i> Instagram</a>` : ''}
            </div>
        </div>
        <div class="footer-bottom">
            <span>&copy; ${year} ${name}. All rights reserved.</span>
        </div>
    `;
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.site-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `site-toast site-toast-${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
