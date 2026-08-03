/* home.js copied */

function categoryIcon(index) {
    const icons = ['fa-pills', 'fa-capsules', 'fa-spa', 'fa-hand-holding-medical', 'fa-tooth', 'fa-heartbeat', 'fa-tag'];
    return icons[index % icons.length];
}

async function renderHero(settings) {
    document.getElementById('heroTitleFr').innerHTML = `
        ${escapeHtml(settings.hero_title_fr || settings.pharmacy_name || 'Bienvenue')}
        ${settings.hero_title_ar ? `<span class="ar" dir="rtl">${escapeHtml(settings.hero_title_ar)}</span>` : ''}
    `;
    document.getElementById('heroDescFr').innerHTML = `
        ${escapeHtml(settings.hero_description_fr || '')}
        ${settings.hero_description_ar ? `<span class="ar" dir="rtl">${escapeHtml(settings.hero_description_ar)}</span>` : ''}
    `;
    document.getElementById('heroHours').textContent = settings.opening_hours || 'Contact us for hours';

    const logoEl = document.getElementById('heroLogo');
    if (settings.logo_url) {
        logoEl.innerHTML = `<img src="${escapeHtml(settings.logo_url)}" alt="${escapeHtml(settings.pharmacy_name || '')}" />`;
    }

    document.title = settings.pharmacy_name ? `${settings.pharmacy_name} - Parapharmacie` : 'Parapharmacie';

    document.getElementById('aboutDescFr').textContent = settings.hero_description_fr ||
        'We combine pharmaceutical expertise with genuine care, offering trusted products and honest advice to every customer who walks through our door.';
    document.getElementById('aboutDescAr').textContent = settings.hero_description_ar || '';
}

// rest omitted for brevity

document.addEventListener('DOMContentLoaded', async () => {
    const settings = await fetchSettings();

    renderNavbar(settings, 'home');
    renderFooter(settings);
    renderHero(settings);
    renderContactInfo(settings);
    initContactForm();

    const [categoryCount, productCount, promoCount] = await Promise.all([
        renderCategories(),
        renderFeaturedProducts(),
        renderPromotions()
    ]);

    document.getElementById('statCategories').textContent = categoryCount;
    document.getElementById('statPromotions').textContent = promoCount;

    const { count: totalProducts } = await supabaseClient.from('products').select('*', { count: 'exact', head: true });
    document.getElementById('statProducts').textContent = totalProducts || productCount;
});
