// ====================================================================
// js/public-products.js — Public Products Page (Amrani Parapharmacie)
// ====================================================================
// STEP 2 (unchanged, do not modify): loads real products from Supabase
// and renders them into the EXISTING #productGrid on products.html.
//
// STEP 3 (unchanged, do not modify): Public Product Search (#searchInput).
//
// STEP 4 (unchanged, do not modify): Public Product Category Filter
// (#categoryFilter), combined with Search via triggerProductsReload().
//
// STEP 5 ADDITION: Public Product Details. Reuses the EXISTING
// #productModal / #modalClose / #modalContent already present in
// products.html (previously unwired — see the old comment block that
// used to sit above renderProducts(), now replaced by this
// implementation). Each rendered .product-card now carries an onclick
// that calls window.PublicProductsModule.viewProduct(id) with the
// product's real Supabase UUID (the same id already selected by
// loadProducts() for Steps 2–4 — nothing new is fetched for the list
// itself). viewProduct(id):
//   1. Opens the existing #productModal immediately in a loading state
//      (never shows stale data from a previously opened product).
//   2. Fetches that ONE product fresh from Supabase by its real id,
//      including its linked categories via the real product_categories
//      relationship (product_categories.product_id -> products.id,
//      product_categories.category_id -> categories.id — verified in
//      01_schema.sql), resolving to real category NAMES via the nested
//      embed product_categories(categories(name_fr)).
//   3. Renders the result into the existing #modalContent using the
//      existing .modal-icon/.modal-brand/.modal-price/.modal-desc/
//      .modal-meta CSS classes already defined in style.css section 15
//      ("MODAL") — no new CSS added.
//   4. On a Supabase error, shows a friendly message and logs the raw
//      error via console.error() — never a raw DB error to the visitor.
//   5. On "0 rows" (PostgREST code PGRST116), shows a friendly
//      "produit introuvable" message instead of a broken/undefined UI.
//
// products.html does NOT load admin.js, so the shared
// window.openModal()/window.closeModal() helpers admin.js defines are
// NOT available on this page. Open/close/overlay-click/Escape handling
// for #productModal is therefore implemented locally in this file,
// scoped only to this one modal — mirrors admin.js's own modal pattern
// without touching or depending on admin.js in any way.
//
// Search (#searchInput) and Category Filter (#categoryFilter) are
// completely unchanged: loadProducts()/buildProductSearchFilter()/
// triggerProductsReload()/setupProductSearch()/
// setupProductCategoryFilter()/loadCategoryOptionsForFilter() are all
// untouched. The product id attached to each card always comes from
// whatever loadProducts() most recently rendered, so Details keeps
// working after searching, filtering, or combining both.
//
// Requires (loaded before this file, in products.html, in this order):
//   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
//   2. js/supabase-client.js   (creates window.supabaseClient)
//
// Table: public.products (id, name_fr [not null], name_ar,
//   description_fr, description_ar, image_url, brand, price [not null,
//   check >= 0], is_available, is_featured, created_at, updated_at) —
//   see 01_schema.sql. Every field rendered in the details view is one
//   of these — nothing invented.
// Junction: public.product_categories (product_id -> products.id,
//   category_id -> categories.id) — used only to resolve category
//   NAMES for display, exactly like the admin Products module already
//   does with the same nested embed shape.
//
// RLS (02_rls.sql): SELECT on public.products uses
// "products_public_read" (using (true) — fully public), and SELECT on
// public.product_categories / public.categories uses their own public
// read policies. The existing anon window.supabaseClient already
// satisfies all three — no policy changes, no service-role key, no
// admin credentials.
//
// Storage: only the product's existing image_url is read. No upload,
// no new bucket, no storage policy change.
// ====================================================================

(function () {
  'use strict';

  // Only run on pages that actually have the public products grid.
  const productGrid = document.getElementById('productGrid');
  if (!productGrid) return;

  let loadingEl = null;
  let errorEl = null;
  let emptyStateEl = null;

  // --- Step 3: Search — state ------------------------------------------
  let searchInputEl = null;
  let searchDebounceTimer = null;

  // --- Step 4: Category Filter — state ----------------------------------
  let categoryFilterEl = null;

  // --- Step 5: Product Details — state ----------------------------------
  let productModalEl = null;
  let modalContentEl = null;
  let isViewingProductDetails = false; // guards against overlapping View requests

  // Bumped on every loadProducts() call; a response only gets applied if
  // its captured id still matches this counter, i.e. no newer call has
  // started since. Prevents an older (slower) search response from
  // overwriting a newer one's results — mirrors productLoadRequestId in
  // the admin's own js/products.js.
  let loadRequestId = 0;

  // Same inline SVG placeholder (NOT an emoji) already used by
  // categories.js/products.js/promotions.js, shown when a product's
  // image_url is empty. Also reused by the Step 5 details view.
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

  // Same escapeHtml() pattern already used across the project's other
  // modules (categories.js/products.js/promotions.js/messages.js) —
  // each of those is private to its own IIFE, so there's nothing on
  // window to reuse directly; this is the same proven implementation,
  // not a new one.
  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function showLoading(isLoading) {
    if (loadingEl) loadingEl.style.display = isLoading ? 'block' : 'none';
    if (productGrid) productGrid.style.opacity = isLoading ? '0.5' : '1';
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

  // Reuses the EXISTING #emptyState element/text already in
  // products.html. Fires both for a genuinely empty table (Step 2) and
  // for a search with zero matches (Step 3) — same element, same
  // message ("Aucun produit ne correspond à votre recherche."), which
  // already reads correctly for both cases without needing a new UI.
  function showEmptyState(isEmpty) {
    if (emptyStateEl) emptyStateEl.style.display = isEmpty ? 'block' : 'none';
  }

  // ------------------------------------------------------------------
  // Render — reuses the existing .product-card design (see the
  // "9. PRODUCTS" and "14. PRODUCTS PAGE SPECIFIC" rules in style.css)
  // exactly: image, name, brand, price, availability badge. No new
  // fields (name_ar, featured, categories) are added to the CARD since
  // none of them have a slot in the current card design — those now
  // appear in the Step 5 details modal instead.
  //
  // Step 5 addition: each card gets an onclick that opens the existing
  // #productModal via window.PublicProductsModule.viewProduct(id), using
  // the product's real Supabase UUID (already present on every row from
  // loadProducts()). A pointer cursor signals the card is clickable.
  // ------------------------------------------------------------------
  function renderProducts(products) {
    productGrid.innerHTML = products
      .map((p) => {
        const imgSrc = p.image_url ? escapeHtml(p.image_url) : PLACEHOLDER_IMAGE;
        const name = escapeHtml(p.name_fr || '-');
        const brand = escapeHtml(p.brand || '-');
        const price = (p.price === null || p.price === undefined) ? '-' : escapeHtml(p.price) + ' DH';
        const isAvailable = !!p.is_available;
        const productId = escapeHtml(p.id);

        return (
          '<div class="product-card" style="cursor:pointer;" ' +
            'onclick="window.PublicProductsModule.viewProduct(\'' + productId + '\')">' +
            '<img src="' + imgSrc + '" alt="' + name + '" class="prod-icon" ' +
              'style="width:100%;height:auto;object-fit:cover;border-radius:8px;" ' +
              'onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMAGE + '\';">' +
            '<h4>' + name + '</h4>' +
            '<div class="brand">' + brand + '</div>' +
            '<div class="price">' + price + '</div>' +
            '<span class="badge ' + (isAvailable ? 'badge-success' : 'badge-danger') + '">' +
              (isAvailable ? 'Disponible' : 'Rupture de stock') +
            '</span>' +
          '</div>'
        );
      })
      .join('');
  }

  // ------------------------------------------------------------------
  // Step 3: escape ilike wildcard characters and quote the value so a
  // search term containing %, _, \, or a comma/parenthesis is treated
  // literally and can't break PostgREST's .or() filter syntax. This is
  // the exact same escaping/quoting approach as buildProductSearchFilter()
  // in the ADMIN js/products.js (copied, not re-invented, since that
  // module's helper is private to its own IIFE and isn't exposed on
  // window) — same field set too: name_fr, name_ar, brand.
  // ------------------------------------------------------------------
  function buildProductSearchFilter(term) {
    const escaped = term.replace(/[\\%_]/g, '\\$&');
    return 'name_fr.ilike."%' + escaped + '%",name_ar.ilike."%' + escaped + '%",brand.ilike."%' + escaped + '%"';
  }

  // ------------------------------------------------------------------
  // Single source of truth for loading the public product list.
  // UNCHANGED for Step 5 — searchTerm/categoryId behavior, the embed
  // shape, and the request-id staleness guard are exactly as before.
  // ------------------------------------------------------------------
  async function loadProducts(searchTerm, categoryId) {
    if (!window.supabaseClient) {
      showError('Configuration Supabase manquante. Impossible de charger les produits.');
      console.error('public-products.js: window.supabaseClient introuvable. Vérifiez que js/supabase-client.js est chargé avant js/public-products.js.');
      return;
    }

    const requestId = ++loadRequestId;

    hideError();
    showEmptyState(false);
    showLoading(true);

    try {
      const trimmedTerm = (searchTerm || '').trim();
      const trimmedCategoryId = (categoryId || '').trim();
      const hasCategoryFilter = !!trimmedCategoryId && trimmedCategoryId !== 'all';

      const selectColumns = hasCategoryFilter
        ? 'id, name_fr, brand, price, image_url, is_available, product_categories!inner(category_id)'
        : 'id, name_fr, brand, price, image_url, is_available';

      let query = window.supabaseClient
        .from('products')
        .select(selectColumns);

      if (hasCategoryFilter) {
        query = query.eq('product_categories.category_id', trimmedCategoryId);
      }

      if (trimmedTerm) {
        query = query.or(buildProductSearchFilter(trimmedTerm));
      }

      const { data, error } = await query.order('name_fr', { ascending: true });

      if (requestId !== loadRequestId) return;

      if (error) throw error;

      if (!data || data.length === 0) {
        productGrid.innerHTML = '';
        showEmptyState(true);
        return;
      }

      renderProducts(data);
    } catch (err) {
      if (requestId !== loadRequestId) return;

      console.error('Erreur lors du chargement des produits :', err);
      productGrid.innerHTML = '';
      showError('Impossible de charger les produits. Vérifiez votre connexion et réessayez.');
    } finally {
      if (requestId === loadRequestId) {
        showLoading(false);
      }
    }
  }

  // ------------------------------------------------------------------
  // Step 4: reads the current search input value and the current
  // category filter value together and issues a single combined
  // loadProducts() call. UNCHANGED for Step 5.
  // ------------------------------------------------------------------
  function triggerProductsReload() {
    const searchValue = searchInputEl ? searchInputEl.value : '';
    const categoryValue = categoryFilterEl ? categoryFilterEl.value : 'all';
    loadProducts(searchValue, categoryValue);
  }

  // ------------------------------------------------------------------
  // Step 3: Search — UNCHANGED for Step 5.
  // ------------------------------------------------------------------
  function setupProductSearch() {
    searchInputEl = document.getElementById('searchInput');
    if (!searchInputEl) return;

    searchInputEl.addEventListener('input', function () {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        triggerProductsReload();
      }, 300);
    });
  }

  // ------------------------------------------------------------------
  // Step 4: Category Filter — populate #categoryFilter. UNCHANGED for
  // Step 5.
  // ------------------------------------------------------------------
  async function loadCategoryOptionsForFilter() {
    if (!categoryFilterEl || !window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient
        .from('categories')
        .select('id, name_fr')
        .order('name_fr', { ascending: true });

      if (error) throw error;

      const previouslySelected = categoryFilterEl.value || 'all';

      const optionsHtml = (data || [])
        .map((cat) => '<option value="' + escapeHtml(cat.id) + '">' + escapeHtml(cat.name_fr) + '</option>')
        .join('');

      categoryFilterEl.innerHTML = '<option value="all">Toutes les catégories</option>' + optionsHtml;

      const stillExists = Array.from(categoryFilterEl.options).some(
        (opt) => opt.value === previouslySelected
      );
      categoryFilterEl.value = stillExists ? previouslySelected : 'all';
    } catch (err) {
      console.error('Erreur lors du chargement des catégories pour le filtre produit :', err);
    }
  }

  function setupProductCategoryFilter() {
    categoryFilterEl = document.getElementById('categoryFilter');
    if (!categoryFilterEl) return;

    categoryFilterEl.addEventListener('change', function () {
      clearTimeout(searchDebounceTimer);
      triggerProductsReload();
    });
  }

  // ====================================================================
  // STEP 5: Public Product Details
  // ====================================================================

  // ------------------------------------------------------------------
  // Open/close the EXISTING #productModal. products.html does not load
  // admin.js, so window.openModal()/window.closeModal() are not
  // available on this page — this mirrors that same pattern locally,
  // scoped only to this one modal.
  // ------------------------------------------------------------------
  function openProductDetailsModal() {
    if (productModalEl) {
      productModalEl.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeProductDetailsModal() {
    if (productModalEl) {
      productModalEl.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // ------------------------------------------------------------------
  // Extract category names from the nested
  // product_categories(categories(name_fr)) embed. Returns '-' when the
  // product has no linked categories. Mirrors getCategoryNames() in the
  // admin's own js/products.js (private to that file's IIFE, so not
  // reused directly — same proven logic, not re-invented).
  // ------------------------------------------------------------------
  function getCategoryNamesForView(product) {
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
  // Loading / error states — rendered directly into the existing
  // #modalContent, since products.html has no separate dedicated
  // loading/error elements for this modal (unlike the admin View
  // modals). Loading/error/content are mutually exclusive by
  // construction: each simply replaces #modalContent's innerHTML, so a
  // fetch never shows stale data from a previously opened product.
  // ------------------------------------------------------------------
  function showModalLoading() {
    if (!modalContentEl) return;
    modalContentEl.innerHTML =
      '<p style="text-align:center;color:var(--gray-600);padding:2.5rem 0;">Chargement du produit…</p>';
  }

  function showModalError(message) {
    if (!modalContentEl) return;
    modalContentEl.innerHTML =
      '<p style="text-align:center;color:#991b1b;padding:2.5rem 0;">' + escapeHtml(message) + '</p>';
  }

  // ------------------------------------------------------------------
  // Render a fetched product into #modalContent, reusing the EXISTING
  // .modal-icon / h2 / .modal-brand / .modal-price / .modal-meta /
  // .modal-desc classes already defined in style.css (section 15 —
  // MODAL). Only fields that actually exist on public.products
  // (01_schema.sql) are shown, and only where they fit this design:
  // image, name_fr, name_ar, brand, price, availability, featured
  // status, category names, description_fr, description_ar.
  // ------------------------------------------------------------------
  function renderProductDetailsContent(product) {
    if (!modalContentEl) return;

    const imgSrc = product.image_url ? escapeHtml(product.image_url) : PLACEHOLDER_IMAGE;
    const nameFr = escapeHtml(product.name_fr || '-');
    const nameAr = product.name_ar ? escapeHtml(product.name_ar) : '';
    const brand = escapeHtml(product.brand || '-');
    const price = (product.price === null || product.price === undefined)
      ? '-'
      : escapeHtml(product.price) + ' DH';
    const isAvailable = !!product.is_available;
    const isFeatured = !!product.is_featured;
    const descFr = product.description_fr ? escapeHtml(product.description_fr) : '';
    const descAr = product.description_ar ? escapeHtml(product.description_ar) : '';
    const categoryNames = getCategoryNamesForView(product);

    modalContentEl.innerHTML =
      '<img src="' + imgSrc + '" alt="' + nameFr + '" class="modal-icon" ' +
        'style="width:140px;height:140px;object-fit:cover;border-radius:var(--radius-sm);" ' +
        'onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMAGE + '\';">' +
      '<h2>' + nameFr + '</h2>' +
      (nameAr ? '<p style="color:var(--gray-600);margin-top:0.2rem;" dir="rtl">' + nameAr + '</p>' : '') +
      '<div class="modal-brand">' + brand + '</div>' +
      '<div class="modal-price">' + price + '</div>' +
      '<div class="modal-meta">' +
        '<span><span class="badge ' + (isAvailable ? 'badge-success' : 'badge-danger') + '">' +
          (isAvailable ? 'Disponible' : 'Rupture de stock') + '</span></span>' +
        (isFeatured ? '<span><span class="badge badge-warning">★ Vedette</span></span>' : '') +
        (categoryNames !== '-' ? '<span>' + escapeHtml(categoryNames) + '</span>' : '') +
      '</div>' +
      (descFr ? '<p class="modal-desc">' + descFr + '</p>' : '') +
      (descAr ? '<p class="modal-desc" dir="rtl">' + descAr + '</p>' : '');
  }

  // ------------------------------------------------------------------
  // Public entry point. Opens #productModal immediately in a loading
  // state, then fetches the real product fresh from Supabase by its
  // real UUID (never from the already-rendered card's local data, and
  // never a card/array index) — including its linked category names via
  // the real product_categories relationship. Strictly read-only: a
  // single SELECT, nothing else.
  // ------------------------------------------------------------------
  async function handleViewProductClick(id) {
    if (!id) return;
    if (isViewingProductDetails) return; // guard against overlapping View requests
    isViewingProductDetails = true;

    openProductDetailsModal();
    showModalLoading();

    try {
      if (!window.supabaseClient) {
        showModalError('Configuration manquante. Impossible de charger ce produit.');
        console.error('public-products.js: window.supabaseClient introuvable.');
        return;
      }

      const { data, error } = await window.supabaseClient
        .from('products')
        .select('id, name_fr, name_ar, description_fr, description_ar, brand, price, image_url, is_available, is_featured, product_categories(categories(name_fr))')
        .eq('id', id)
        .single();

      if (error) throw error;

      renderProductDetailsContent(data);
    } catch (err) {
      console.error('Erreur lors du chargement des détails du produit :', err);

      // PGRST116 = PostgREST's "0 rows" error for .single() — the
      // product no longer exists (e.g. removed since the grid was last
      // loaded). Any other error is a generic failure. Mirrors
      // handleViewProductClick() in the admin's own js/products.js.
      if (err && err.code === 'PGRST116') {
        showModalError('Ce produit est introuvable. Il a peut-être été retiré.');
      } else {
        showModalError('Impossible de charger les détails de ce produit. Veuillez réessayer.');
      }
    } finally {
      isViewingProductDetails = false;
    }
  }

  // ------------------------------------------------------------------
  // Wire up the EXISTING #productModal's close button, overlay click,
  // and Escape key — the same close interactions already established
  // by admin.js's own modal pattern, reimplemented locally here since
  // admin.js isn't loaded on products.html.
  // ------------------------------------------------------------------
  function setupProductDetailsModal() {
    productModalEl = document.getElementById('productModal');
    modalContentEl = document.getElementById('modalContent');
    const closeBtn = document.getElementById('modalClose');

    if (!productModalEl || !modalContentEl) return;

    if (closeBtn) {
      closeBtn.addEventListener('click', closeProductDetailsModal);
    }

    // Click on the dimmed overlay itself (not the modal box) closes it.
    productModalEl.addEventListener('click', function (e) {
      if (e.target === productModalEl) closeProductDetailsModal();
    });

    // Escape closes it, but only while it's actually open.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && productModalEl.classList.contains('active')) {
        closeProductDetailsModal();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadingEl = document.getElementById('productsLoading');
    errorEl = document.getElementById('productsError');
    emptyStateEl = document.getElementById('emptyState');

    // Default state on load: Search = empty, Category = All — the
    // normal complete public product list. Category options are loaded
    // in parallel (not awaited) rather than before this call, since the
    // initial product load doesn't depend on the filter's options being
    // populated yet.
    loadProducts();
    setupProductSearch();
    setupProductCategoryFilter();
    loadCategoryOptionsForFilter();

    // Step 5: Product Details
    setupProductDetailsModal();
  });

  // Expose a minimal public API so each product-card's onclick can call
  // back into this module — same exposure pattern already used by
  // window.ProductsModule / window.CategoriesModule / etc. in the admin
  // panel, applied here for the public page.
  window.PublicProductsModule = {
    viewProduct: handleViewProductClick,
  };
})();
