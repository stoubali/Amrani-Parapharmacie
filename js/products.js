// ====================================================================
// js/products.js — Products Module (Amrani Parapharmacie)
// ====================================================================
// LOAD-ONLY SCOPE: loads products from Supabase and renders them into
// the EXISTING #productsTable in admin_panel.html. Architecture is a
// direct structural clone of js/categories.js's initial (Step 1) load
// implementation — same helper shapes, same placeholder image, same
// loading/error notification pattern.
//
// Explicitly NOT implemented here (later steps):
//   - Create product
//   - Edit product
//   - Delete product
//   - Search / filter
//   - Pagination
//   - Dashboard statistics
//   - Landing page integration
//
// Requires (loaded before this file, in this order):
//   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
//   2. js/supabase-client.js   (creates window.supabaseClient)
//
// Table: public.products (id, name_fr, name_ar, brand, price, image_url,
//   is_available, is_featured, ...)
// Junction: public.product_categories (product_id -> products.id,
//   category_id -> categories.id) — used here only to display category
//   NAMES via a nested Supabase embed: product_categories(categories(name_fr)).
// Storage: images are read directly from each product's own image_url
//   column (already a full public URL), exactly like Categories — no
//   direct query against the "products" storage bucket is needed just
//   to display the list.
// ====================================================================

(function () {
  'use strict';

  // Only do anything on pages that actually have the Products section.
  const productsSection = document.getElementById('section-products');
  if (!productsSection) return;

  // ------------------------------------------------------------------
  // DOM refs (resolved lazily inside init(), since admin.js calls init()
  // after DOMContentLoaded has already fired)
  // ------------------------------------------------------------------
  let tableBody = null;
  let tableWrapper = null; // the .table-responsive wrapper, dimmed while loading
  let loadingEl = null;
  let errorEl = null;

  let initialized = false;
  let hasLoadedOnce = false;

  // Same inline SVG placeholder used by Categories (NOT an emoji), used
  // when a product's image_url is empty.
  const PLACEHOLDER_IMAGE =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
      '<rect width="40" height="40" rx="8" fill="#f3f4f6"/>' +
      '<circle cx="15" cy="14" r="3" fill="#d1d5db"/>' +
      '<path d="M6 30l8-9 6 6 6-8 8 11" stroke="#9ca3af" stroke-width="2" ' +
      'fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );

  // ------------------------------------------------------------------
  // Small DOM / text helpers
  // ------------------------------------------------------------------
  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function showLoading(isLoading) {
    if (loadingEl) loadingEl.style.display = isLoading ? 'block' : 'none';
    if (tableWrapper) tableWrapper.style.opacity = isLoading ? '0.5' : '1';
  }

  function showError(message) {
    if (!errorEl) {
      window.alert(message);
      return;
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  function hideError() {
    if (errorEl) errorEl.style.display = 'none';
  }

  // ------------------------------------------------------------------
  // Extract category names from the nested product_categories(categories(...))
  // embed. Returns '-' when a product has no linked categories.
  // ------------------------------------------------------------------
  function getCategoryNames(product) {
    if (!Array.isArray(product.product_categories) || product.product_categories.length === 0) {
      return '-';
    }
    const names = product.product_categories
      .map(function (pc) {
        return pc && pc.categories ? pc.categories.name_fr : null;
      })
      .filter(Boolean);
    return names.length ? names.join(', ') : '-';
  }

  // ------------------------------------------------------------------
  // Render — reuses the EXISTING #productsTable columns exactly
  // (Image, Nom, Marque, Catégories, Prix, Disponible, Actions).
  // Arabic name + featured badge are shown inside the "Nom" cell rather
  // than as new columns, so the table layout itself is never changed.
  // ------------------------------------------------------------------
  function renderRows(products) {
    if (!products || products.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="7" style="text-align:center; color:var(--gray-600); padding:1.5rem 0.8rem;">' +
        'Aucun produit trouvé.</td></tr>';
      return;
    }

    tableBody.innerHTML = products
      .map((p) => {
        const imgSrc = p.image_url ? escapeHtml(p.image_url) : PLACEHOLDER_IMAGE;
        const nameFr = escapeHtml(p.name_fr || '-');
        const nameAr = p.name_ar ? escapeHtml(p.name_ar) : '';
        const brand = escapeHtml(p.brand || '-');
        const categoryNames = escapeHtml(getCategoryNames(p));
        const price = (p.price === null || p.price === undefined) ? '-' : escapeHtml(p.price) + ' DH';
        const isAvailable = !!p.is_available;
        const isFeatured = !!p.is_featured;

        return (
          '<tr data-id="' + escapeHtml(p.id) + '">' +
            '<td><img src="' + imgSrc + '" alt="' + nameFr + '" class="category-thumb" ' +
              'onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMAGE + '\';"></td>' +
            '<td>' +
              '<div>' + nameFr + '</div>' +
              (nameAr ? '<div style="color:var(--gray-600);font-size:0.85rem;" dir="rtl">' + nameAr + '</div>' : '') +
              (isFeatured ? '<span class="badge badge-warning" style="margin-top:2px;display:inline-block;">★ Vedette</span>' : '') +
            '</td>' +
            '<td>' + brand + '</td>' +
            '<td>' + categoryNames + '</td>' +
            '<td>' + price + '</td>' +
            '<td><span class="badge ' + (isAvailable ? 'badge-success' : 'badge-danger') + '">' +
              (isAvailable ? 'Oui' : 'Non') + '</span></td>' +
            '<td class="actions">' +
              '<button class="btn-icon view" disabled title="Disponible dans une prochaine étape">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' +
                '</svg>' +
              '</button>' +
              '<button class="btn-icon edit" disabled title="Disponible dans une prochaine étape">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
                  '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' +
                '</svg>' +
              '</button>' +
              '<button class="btn-icon delete" disabled title="Disponible dans une prochaine étape">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<polyline points="3 6 5 6 21 6"/>' +
                  '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
                '</svg>' +
              '</button>' +
            '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  // ------------------------------------------------------------------
  // Load products from Supabase
  // ------------------------------------------------------------------
  async function loadProducts() {
    if (!window.supabaseClient) {
      showError('Configuration Supabase manquante. Impossible de charger les produits.');
      console.error('ProductsModule: window.supabaseClient introuvable. Vérifiez que js/supabase-client.js est chargé avant js/products.js.');
      return;
    }

    hideError();
    showLoading(true);

    try {
      const { data, error } = await window.supabaseClient
        .from('products')
        .select('id, name_fr, name_ar, brand, price, image_url, is_available, is_featured, product_categories(categories(name_fr))')
        .order('name_fr', { ascending: true });

      if (error) throw error;

      renderRows(data);
      hasLoadedOnce = true;
    } catch (err) {
      console.error('Erreur lors du chargement des produits :', err);
      tableBody.innerHTML = '';
      showError('Impossible de charger les produits. Vérifiez votre connexion et réessayez.');
    } finally {
      showLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Init — called explicitly by admin.js
  // ------------------------------------------------------------------
  function init() {
    if (initialized) return;
    initialized = true;

    tableBody = document.querySelector('#productsTable tbody');
    tableWrapper = productsSection.querySelector('.table-responsive');
    loadingEl = document.getElementById('productsLoading');
    errorEl = document.getElementById('productsError');

    if (!tableBody) {
      console.error('ProductsModule: #productsTable tbody introuvable.');
      return;
    }

    // Load once immediately so data is ready the first time the section
    // is shown, and reload every time the Products tab is opened so the
    // admin always sees fresh data — same pattern as CategoriesModule.
    loadProducts();

    const productsLink = document.querySelector('.sidebar-link[data-section="products"]');
    if (productsLink) {
      productsLink.addEventListener('click', function () {
        loadProducts();
      });
    }
  }

  // Expose a minimal public API — admin.js only calls init().
  window.ProductsModule = {
    init: init,
    reload: loadProducts, // handy for manual testing from the console
  };
})();
