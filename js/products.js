/* products.js copied */

const ProductsPageState = { products: [], categories: [] };

function getUrlParam(name) { return new URLSearchParams(window.location.search).get(name); }

function renderProductCard(product, categoryName) {
    return `...`;
}

async function loadProductsPageData() {
    const [productsRes, categoriesRes] = await Promise.all([
        supabaseClient.from('products').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('categories').select('*').order('name_fr')
    ]);

    ProductsPageState.products = productsRes.data || [];
    ProductsPageState.categories = categoriesRes.data || [];

    populateCategoryFilter();
    renderProductsGrid();
}

document.addEventListener('DOMContentLoaded', async () => {
    const settings = await fetchSettings();
    renderNavbar(settings, 'products');
    renderFooter(settings);

    await loadProductsPageData();

    document.getElementById('searchInput').addEventListener('input', debounce(renderProductsGrid, 250));
    document.getElementById('categoryFilter').addEventListener('change', renderProductsGrid);
});
