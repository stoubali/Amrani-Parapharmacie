// ====================================================================
// js/categories.js — Categories Module (Amrani Parapharmacie)
// ====================================================================
// STEP 1 SCOPE: loads categories from Supabase and renders them into the
// EXISTING #categoriesTable in admin_panel.html. The Edit/Delete buttons
// and the "+ Ajouter" button are left exactly as they were — still wired
// to the old demo-array functions in admin.js (editCategory, saveCategory,
// confirmDelete). They are NOT yet connected to Supabase.
//
// Explicitly NOT implemented here (later steps):
//   - Add category
//   - Edit category
//   - Delete category
//   - Search / filter
//   - Image upload
//
// Requires (loaded before this file, in this order):
//   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
//   2. js/supabase-client.js   (creates window.supabaseClient)
//
// Table: public.categories (id, name_fr, name_ar, image_url, ...)
// Junction: public.product_categories (category_id -> categories.id)
//   used only to show a live product count in the existing "Produits"
//   column — this is a read, not a CRUD feature.
// ====================================================================

(function () {
  'use strict';

  // Only do anything on pages that actually have the Categories section.
  const categoriesSection = document.getElementById('section-categories');
  if (!categoriesSection) return;

  // ------------------------------------------------------------------
  // DOM refs (resolved lazily inside init(), since admin.js calls init()
  // after DOMContentLoaded has already fired)
  // ------------------------------------------------------------------
  let tableBody = null;
  let tableWrapper = null; // the .table-responsive wrapper, used to dim the table while loading
  let loadingEl = null;
  let errorEl = null;

  let initialized = false;
  let hasLoadedOnce = false;

  // Simple inline SVG placeholder (NOT an emoji) used when image_url is empty.
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
  // Render
  // ------------------------------------------------------------------
  function renderRows(categories) {
    if (!categories || categories.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="5" style="text-align:center; color:var(--gray-600); padding:1.5rem 0.8rem;">' +
        'Aucune catégorie trouvée.</td></tr>';
      return;
    }

    tableBody.innerHTML = categories
      .map((cat) => {
        const imgSrc = cat.image_url ? escapeHtml(cat.image_url) : PLACEHOLDER_IMAGE;
        const nameFr = escapeHtml(cat.name_fr || '-');
        const nameAr = cat.name_ar ? escapeHtml(cat.name_ar) : '-';
        const productCount =
          Array.isArray(cat.product_categories) && cat.product_categories[0]
            ? cat.product_categories[0].count || 0
            : 0;

        return (
          '<tr data-id="' + escapeHtml(cat.id) + '">' +
            '<td><img src="' + imgSrc + '" alt="' + nameFr + '" class="category-thumb" ' +
              'onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMAGE + '\';"></td>' +
            '<td>' + nameFr + '</td>' +
            '<td>' + nameAr + '</td>' +
            '<td>' + productCount + '</td>' +
            '<td class="actions">' +
              '<button class="btn-icon edit" onclick="editCategory(\'' + cat.id + '\')" title="Modifier">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
                  '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' +
                '</svg>' +
              '</button>' +
              '<button class="btn-icon delete" onclick="confirmDelete(\'category\', \'' + cat.id + '\')" title="Supprimer">' +
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
  // Load categories from Supabase
  // ------------------------------------------------------------------
  async function loadCategories() {
    if (!window.supabaseClient) {
      showError('Configuration Supabase manquante. Impossible de charger les catégories.');
      console.error('CategoriesModule: window.supabaseClient introuvable. Vérifiez que js/supabase-client.js est chargé avant js/categories.js.');
      return;
    }

    hideError();
    showLoading(true);

    try {
      const { data, error } = await window.supabaseClient
        .from('categories')
        .select('id, name_fr, name_ar, image_url, product_categories(count)')
        .order('name_fr', { ascending: true });

      if (error) throw error;

      renderRows(data);
      hasLoadedOnce = true;
    } catch (err) {
      console.error('Erreur lors du chargement des catégories :', err);
      tableBody.innerHTML = '';
      showError('Impossible de charger les catégories. Vérifiez votre connexion et réessayez.');
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

    tableBody = document.querySelector('#categoriesTable tbody');
    tableWrapper = categoriesSection.querySelector('.table-responsive');
    loadingEl = document.getElementById('categoriesLoading');
    errorEl = document.getElementById('categoriesError');

    if (!tableBody) {
      console.error('CategoriesModule: #categoriesTable tbody introuvable.');
      return;
    }

    // Load once immediately so data is ready the first time the section
    // is shown, and reload every time the Categories tab is opened so
    // the admin always sees fresh data.
    loadCategories();

    const categoriesLink = document.querySelector('.sidebar-link[data-section="categories"]');
    if (categoriesLink) {
      categoriesLink.addEventListener('click', function () {
        loadCategories();
      });
    }
  }

  // Expose a minimal public API — admin.js only calls init().
  window.CategoriesModule = {
    init: init,
    reload: loadCategories, // handy for manual testing from the console
  };
})();
