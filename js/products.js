// ====================================================================
// js/products.js — Products Module (Amrani Parapharmacie)
// ====================================================================
// STEP 1 SCOPE (unchanged, tested — do not modify): loads products from
// Supabase and renders them into the EXISTING #productsTable. Same
// helper shapes, same placeholder image, same loading/error pattern as
// categories.js's Step 1.
//
// STEP 2 (unchanged, tested — do not modify): Create Product, reusing the
// existing Add/Edit Product modal — image upload with orphan cleanup,
// form validation driven only by the actual DB constraints, and a manual
// "transaction" across public.products + public.product_categories with
// rollback if any later step fails.
//
// STEP 3 (unchanged, tested — do not modify): Edit Product, reusing the
// SAME modal and the SAME save/upload/validation/notification/reset
// helpers as Create — only the final insert-vs-update Supabase calls
// differ, plus a full replace of that product's product_categories rows,
// plus rollback logic to restore the product row and its category links
// if the category update fails after the product update already
// succeeded.
//
// STEP 4 (unchanged, tested — do not modify): Delete Product, reusing the
// existing generic #deleteModal confirmation modal (via the existing
// global confirmDelete()/admin.js dispatch — same pattern as Categories),
// the existing image-deletion helper, and the existing
// loadProducts()/showProductActionNotification() helpers. Per
// 01_schema.sql, public.product_categories.product_id is declared
// "on delete cascade", so deleting a product row automatically removes
// its category links — no manual product_categories delete is performed.
//
// STEP 5 (unchanged, tested — do not modify): Product Search
// (#productSearch), debounced ~300ms, searching name_fr + name_ar +
// brand server-side via ilike — the real text columns on public.products
// that make sense for search (per 01_schema.sql; name_fr and brand are
// trigram-indexed in 04_indexes.sql, name_ar is not, same asymmetry
// Categories already has for its own bilingual fields).
//
// STEP 6 (unchanged, tested — do not modify): Product Filters —
// specifically the Category filter (#productCategoryFilter), the only
// filter control that actually exists in admin_panel.html. Populated
// from real public.categories (id, name_fr) — never demo data.
// loadProducts() was extended with a second optional parameter,
// categoryId, alongside the existing optional searchTerm; called with no
// arguments (as every CRUD-reload call site still does) it behaves
// exactly as before. When a category is selected, the query switches the
// product_categories embed to Supabase's `!inner` join modifier plus
// `.eq('product_categories.category_id', id)`, which is required to
// filter the parent products rows themselves (not just the nested
// array) — 01_schema.sql's product_categories is the only relationship
// linking products to categories. Search and the category filter are
// combined on the same query (AND), via a shared triggerProductsReload()
// helper used by both the search debounce callback and the filter's
// change handler, so neither can overwrite the other's condition.
//
// STEP 7 ADDITION: View Product — strictly read-only. Reuses the new
// #productViewModal (admin_panel.html) rather than the Create/Edit form,
// to guarantee nothing can be accidentally written while viewing.
// Fetches the product fresh via a single SELECT (same field/embed shape
// already proven by Edit/loadProducts), reuses the existing
// getCategoryNames() and PLACEHOLDER_IMAGE helpers, and opens the modal
// immediately in a loading state (never showing stale data from a
// previous View) before swapping in the fetched product's real data.
//
// Explicitly NOT implemented here (later steps):
//   - Other filters (brand / price / availability / featured) — no
//     corresponding UI controls exist in admin_panel.html
//   - Pagination
//   - Dashboard statistics
//   - Landing page integration
//
// Requires (loaded before this file, in this order):
//   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
//   2. js/supabase-client.js   (creates window.supabaseClient)
//
// Table: public.products (id, name_fr [not null], name_ar,
//   description_fr, description_ar, image_url, brand, price [not null,
//   check >= 0], is_available, is_featured, ...) — see 01_schema.sql.
// Junction: public.product_categories (product_id -> products.id,
//   category_id -> categories.id) — used for both displaying category
//   NAMES (nested embed: product_categories(categories(name_fr))) and,
//   in Step 2, for saving the selected categories on Create.
// Storage bucket: "products" (see 03_storage.sql) — public read,
//   admin-only insert/update/delete.
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

  // Bumped on every loadProducts() call; a response only gets applied if
  // its captured id still matches this counter, i.e. no newer call has
  // started since. Prevents an older (slower) search response from
  // overwriting a newer one's results. Mirrors categoryLoadRequestId.
  let productLoadRequestId = 0;

  // --- Step 5: Product Search — state -----------------------------------
  let productSearchInput = null;
  let productSearchDebounceTimer = null;

  // --- Step 6 (Product Filters): Category filter — state --------------
  let productCategoryFilterSelect = null;

  // --- Step 7: View Product — state -------------------------------------
  let productViewLoadingEl = null;
  let productViewErrorEl = null;
  let productViewContentEl = null;
  let pvImage = null;
  let pvNameFR = null;
  let pvNameARRow = null;
  let pvNameAR = null;
  let pvBrand = null;
  let pvPrice = null;
  let pvAvailable = null;
  let pvFeatured = null;
  let pvDescFRRow = null;
  let pvDescFR = null;
  let pvDescARRow = null;
  let pvDescAR = null;
  let pvCategories = null;

  let isViewingProduct = false; // guards against overlapping View requests

  // --- Step 2: Create Product — bucket + form state -------------------
  const PRODUCT_BUCKET = 'products'; // existing bucket from 03_storage.sql

  let productActionNotificationEl = null;

  let productForm = null;
  let productFormError = null;
  let productFormIdInput = null;
  let prodNameFRInput = null;
  let prodNameFRError = null;
  let prodNameARInput = null;
  let prodDescFRInput = null;
  let prodDescARInput = null;
  let prodBrandInput = null;
  let prodPriceInput = null;
  let prodPriceError = null;
  let prodCategoriesSelect = null;
  let prodAvailableInput = null;
  let prodFeaturedInput = null;
  let prodImageFileInput = null;
  let prodImagePreview = null;
  let prodImageUrlHidden = null;
  let prodImageError = null;
  let productSaveBtn = null;
  let productSaveBtnText = null;
  let productSaveBtnLoader = null;

  let pendingProductImageFile = null;
  let isSavingProduct = false;

  // --- Step 3: Edit Product — rollback snapshot state ------------------
  // Captured when the Edit modal is populated, so a failed
  // product_categories update can restore both the product row and its
  // previous category links. Cleared on every resetProductForm() call.
  let editSnapshot = null; // { productId, previousValues, previousCategoryIds }

  // --- Step 4: Delete Product — duplicate-execution guard --------------
  // admin.js's generic #confirmDelete handler already nulls out
  // deleteTarget/deleteType synchronously after dispatching (the same
  // protection Categories relies on), but this flag adds a second,
  // Products-local guard in case deleteProduct() is ever invoked
  // directly (e.g. from the console) while a delete is already in flight.
  let isDeletingProduct = false;

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
              '<button class="btn-icon view" onclick="window.ProductsModule.viewProduct(\'' + p.id + '\')" title="Voir">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' +
                '</svg>' +
              '</button>' +
              '<button class="btn-icon edit" onclick="window.ProductsModule.editProduct(\'' + p.id + '\')" title="Modifier">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
                  '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' +
                '</svg>' +
              '</button>' +
              '<button class="btn-icon delete" onclick="confirmDelete(\'product\', \'' + p.id + '\')" title="Supprimer">' +
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
  // Step 5: escape ilike wildcard characters and quote the value so a
  // search term containing %, _, \, or a comma/parenthesis is treated
  // literally and can't break PostgREST's .or() filter syntax. Mirrors
  // buildCategorySearchFilter() in categories.js, adapted to the real
  // Products text columns that make sense for search: name_fr, name_ar,
  // brand (see 01_schema.sql).
  // ------------------------------------------------------------------
  function buildProductSearchFilter(term) {
    const escaped = term.replace(/[\\%_]/g, '\\$&');
    return 'name_fr.ilike."%' + escaped + '%",name_ar.ilike."%' + escaped + '%",brand.ilike."%' + escaped + '%"';
  }

  // Load products from Supabase.
  // searchTerm and categoryId are both optional — every CRUD-reload call
  // site (init(), the sidebar reload, and every Create/Edit/Delete
  // success path) calls this with no arguments, which behaves exactly as
  // it always has (no filter, full list, same order). Step 5 added a
  // server-side ilike filter on name_fr/name_ar/brand when a non-empty
  // trimmed searchTerm is passed. Step 6 adds a server-side category
  // filter when a non-empty categoryId other than 'all' is passed; both
  // conditions are applied together (AND) when both are present.
  async function loadProducts(searchTerm, categoryId) {
    if (!window.supabaseClient) {
      showError('Configuration Supabase manquante. Impossible de charger les produits.');
      console.error('ProductsModule: window.supabaseClient introuvable. Vérifiez que js/supabase-client.js est chargé avant js/products.js.');
      return;
    }

    const requestId = ++productLoadRequestId;

    hideError();
    showLoading(true);

    try {
      const trimmedTerm = (searchTerm || '').trim();
      const trimmedCategoryId = (categoryId || '').trim();
      const hasCategoryFilter = !!trimmedCategoryId && trimmedCategoryId !== 'all';

      // The nested product_categories(categories(name_fr)) embed is used
      // both for display (the "Catégories" column) and, when a category
      // filter is active, for filtering. Supabase's `!inner` modifier
      // turns the embed into an inner join so only products with a
      // matching product_categories row survive, and .eq() on the
      // joined table narrows that further to the selected category.
      // Without an active filter, the plain embed is used exactly as
      // before, so products with zero categories still appear.
      const selectColumns = hasCategoryFilter
        ? 'id, name_fr, name_ar, brand, price, image_url, is_available, is_featured, product_categories!inner(category_id, categories(name_fr))'
        : 'id, name_fr, name_ar, brand, price, image_url, is_available, is_featured, product_categories(categories(name_fr))';

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

      // A newer loadProducts() call has started since this one was sent
      // (e.g. the user kept typing, or changed the filter). Its own
      // response will render instead, so this older one is dropped
      // silently — success or error alike.
      if (requestId !== productLoadRequestId) return;

      if (error) throw error;

      renderRows(data);
      hasLoadedOnce = true;
    } catch (err) {
      if (requestId !== productLoadRequestId) return; // stale — a newer call already handled the UI

      console.error('Erreur lors du chargement des produits :', err);
      tableBody.innerHTML = '';
      showError('Impossible de charger les produits. Vérifiez votre connexion et réessayez.');
    } finally {
      if (requestId === productLoadRequestId) {
        showLoading(false);
      }
    }
  }

  // ====================================================================
  // STEP 2: Create Product
  // ====================================================================

  // ------------------------------------------------------------------
  // Notification / error helpers — mirror categories.js exactly.
  // ------------------------------------------------------------------
  function showProductActionNotification(message, type) {
    if (!productActionNotificationEl) {
      window.alert(message);
      return;
    }
    productActionNotificationEl.textContent = message;
    productActionNotificationEl.className =
      'settings-notification settings-notification-' + (type || 'info');
    productActionNotificationEl.style.display = 'block';
    clearTimeout(showProductActionNotification._t);
    showProductActionNotification._t = setTimeout(() => {
      productActionNotificationEl.style.display = 'none';
    }, 4000);
  }

  function showFormError(message) {
    if (!productFormError) {
      window.alert(message);
      return;
    }
    productFormError.textContent = message;
    productFormError.style.display = 'block';
  }

  function hideFormError() {
    if (productFormError) productFormError.style.display = 'none';
  }

  function clearFieldErrors() {
    if (prodNameFRError) prodNameFRError.textContent = '';
    if (prodPriceError) prodPriceError.textContent = '';
    if (prodImageError) prodImageError.textContent = '';
  }

  // ------------------------------------------------------------------
  // Validation — driven ONLY by 01_schema.sql constraints on
  // public.products:
  //   name_fr  text not null                     -> required
  //   price    numeric(10,2) not null check(>=0)  -> required, >= 0
  //   brand    text (nullable)                    -> NOT required
  // No other business rules are invented here.
  // ------------------------------------------------------------------
  function validateProductForm() {
    let isValid = true;
    clearFieldErrors();

    const nameFr = prodNameFRInput.value.trim();
    if (!nameFr) {
      prodNameFRError.textContent = 'Le nom du produit (FR) est requis.';
      isValid = false;
    }

    const priceRaw = prodPriceInput.value;
    const price = parseFloat(priceRaw);
    if (priceRaw === '' || isNaN(price)) {
      prodPriceError.textContent = 'Le prix est requis.';
      isValid = false;
    } else if (price < 0) {
      prodPriceError.textContent = 'Le prix doit être supérieur ou égal à 0.';
      isValid = false;
    }

    if (pendingProductImageFile && !pendingProductImageFile.type.startsWith('image/')) {
      prodImageError.textContent = 'Veuillez sélectionner un fichier image valide.';
      isValid = false;
    }

    return isValid;
  }

  // ------------------------------------------------------------------
  // Image preview (before upload) — mirrors setupCategoryImagePreview().
  // ------------------------------------------------------------------
  function setupProductImagePreview() {
    if (!prodImageFileInput) return;

    prodImageFileInput.addEventListener('change', () => {
      const file = prodImageFileInput.files && prodImageFileInput.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        if (prodImageError) prodImageError.textContent = 'Veuillez sélectionner un fichier image valide.';
        prodImageFileInput.value = '';
        return;
      }

      if (prodImageError) prodImageError.textContent = '';
      pendingProductImageFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        prodImagePreview.src = e.target.result;
        prodImagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  // ------------------------------------------------------------------
  // Upload to the existing "products" bucket (03_storage.sql) — mirrors
  // uploadCategoryImage(). Returns { path, publicUrl }; the path is
  // needed so an orphaned file can be removed on rollback.
  // ------------------------------------------------------------------
  async function uploadProductImage(file) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

    const { error: uploadError } = await window.supabaseClient
      .storage
      .from(PRODUCT_BUCKET)
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) throw uploadError;

    const { data } = window.supabaseClient
      .storage
      .from(PRODUCT_BUCKET)
      .getPublicUrl(path);

    return { path: path, publicUrl: data.publicUrl };
  }

  // ------------------------------------------------------------------
  // Best-effort removal of an orphaned upload (rollback helper).
  // Never throws — failures are logged, not surfaced, since the actual
  // save error is already the message the admin sees.
  // ------------------------------------------------------------------
  async function deleteProductImage(path) {
    if (!path || !window.supabaseClient) return;
    try {
      const { error } = await window.supabaseClient
        .storage
        .from(PRODUCT_BUCKET)
        .remove([path]);
      if (error) throw error;
    } catch (cleanupErr) {
      console.error('Impossible de supprimer le fichier orphelin "' + path + '" :', cleanupErr);
    }
  }

  // ------------------------------------------------------------------
  // Recover the storage path from a public URL (e.g. to delete the old
  // image after a successful edit-with-replacement). Returns null if the
  // URL doesn't look like it came from this bucket. Mirrors
  // getStoragePathFromPublicUrl() in categories.js.
  // ------------------------------------------------------------------
  function getStoragePathFromPublicUrl(url, bucket) {
    if (!url) return null;
    const marker = '/storage/v1/object/public/' + bucket + '/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  }

  // ------------------------------------------------------------------
  // Save button loading state — mirrors setCategorySaving().
  // ------------------------------------------------------------------
  function setProductSaving(isSaving) {
    isSavingProduct = isSaving;
    if (!productSaveBtn) return;
    productSaveBtn.disabled = isSaving;
    if (productSaveBtnText) productSaveBtnText.style.display = isSaving ? 'none' : 'inline';
    if (productSaveBtnLoader) productSaveBtnLoader.style.display = isSaving ? 'inline-block' : 'none';
  }

  // ------------------------------------------------------------------
  // Reset the modal back to a blank "Add" state — mirrors
  // resetCategoryForm(). Reused by the "+ Ajouter" button and after a
  // successful save.
  // ------------------------------------------------------------------
  function resetProductForm() {
    if (productForm) productForm.reset();
    if (productFormIdInput) productFormIdInput.value = '';
    if (prodImageUrlHidden) prodImageUrlHidden.value = '';
    if (prodImagePreview) {
      prodImagePreview.removeAttribute('src');
      prodImagePreview.style.display = 'none';
    }
    if (prodCategoriesSelect) {
      Array.from(prodCategoriesSelect.options).forEach((opt) => {
        opt.selected = false;
      });
    }
    if (prodAvailableInput) prodAvailableInput.checked = true;
    if (prodFeaturedInput) prodFeaturedInput.checked = false;
    pendingProductImageFile = null;
    editSnapshot = null;
    clearFieldErrors();
    hideFormError();

    const titleEl = document.getElementById('productModalTitle');
    if (titleEl) titleEl.textContent = 'Ajouter un produit';
  }

  // ------------------------------------------------------------------
  // Populate #prodCategories with REAL rows from public.categories
  // (id, name_fr) — never the old demo array or hardcoded names.
  // Preserves any already-selected options across a refresh.
  // ------------------------------------------------------------------
  async function loadCategoryOptionsForProductForm() {
    if (!prodCategoriesSelect || !window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient
        .from('categories')
        .select('id, name_fr')
        .order('name_fr', { ascending: true });

      if (error) throw error;

      const previouslySelected = new Set(
        Array.from(prodCategoriesSelect.selectedOptions).map((o) => o.value)
      );

      prodCategoriesSelect.innerHTML = (data || [])
        .map((cat) => '<option value="' + escapeHtml(cat.id) + '">' + escapeHtml(cat.name_fr) + '</option>')
        .join('');

      Array.from(prodCategoriesSelect.options).forEach((opt) => {
        opt.selected = previouslySelected.has(opt.value);
      });
    } catch (err) {
      console.error('Erreur lors du chargement des catégories pour le formulaire produit :', err);
    }
  }

  // ------------------------------------------------------------------
  // STEP 3: Edit Product — fill the (already reset) form with the
  // product's current values, loaded fresh from Supabase, and select
  // its currently linked categories in #prodCategories.
  // ------------------------------------------------------------------
  function populateProductForm(product, categoryIds) {
    resetProductForm();

    if (productFormIdInput) productFormIdInput.value = product.id;
    if (prodNameFRInput) prodNameFRInput.value = product.name_fr || '';
    if (prodNameARInput) prodNameARInput.value = product.name_ar || '';
    if (prodDescFRInput) prodDescFRInput.value = product.description_fr || '';
    if (prodDescARInput) prodDescARInput.value = product.description_ar || '';
    if (prodBrandInput) prodBrandInput.value = product.brand || '';
    if (prodPriceInput) prodPriceInput.value = (product.price === null || product.price === undefined) ? '' : product.price;
    if (prodAvailableInput) prodAvailableInput.checked = !!product.is_available;
    if (prodFeaturedInput) prodFeaturedInput.checked = !!product.is_featured;

    // Keep the current image URL internally (used by handleProductSubmit
    // if the admin doesn't pick a replacement file) and show its preview.
    if (prodImageUrlHidden) prodImageUrlHidden.value = product.image_url || '';
    if (product.image_url && prodImagePreview) {
      prodImagePreview.src = product.image_url;
      prodImagePreview.style.display = 'block';
    }

    // Select the product's currently linked categories. Category options
    // are already loaded with real Supabase ids by loadCategoryOptionsForProductForm().
    if (prodCategoriesSelect) {
      const idSet = new Set(categoryIds || []);
      Array.from(prodCategoriesSelect.options).forEach((opt) => {
        opt.selected = idSet.has(opt.value);
      });
    }

    // Rollback snapshot — captured BEFORE any edit is made, so a failed
    // product_categories update can restore both the product row and its
    // previous category links.
    editSnapshot = {
      productId: product.id,
      previousValues: {
        name_fr: product.name_fr,
        name_ar: product.name_ar,
        description_fr: product.description_fr,
        description_ar: product.description_ar,
        image_url: product.image_url,
        brand: product.brand,
        price: product.price,
        is_available: product.is_available,
        is_featured: product.is_featured,
      },
      previousCategoryIds: (categoryIds || []).slice(),
    };

    const titleEl = document.getElementById('productModalTitle');
    if (titleEl) titleEl.textContent = 'Modifier le produit';
  }

  // ------------------------------------------------------------------
  // STEP 3: Edit Product — Edit button click handler. Loads the
  // selected product AND its current category links fresh from
  // Supabase, then opens the existing Add/Edit modal (via the existing
  // shared openModal helper) already populated. Never reads the old
  // demo array.
  // ------------------------------------------------------------------
  async function handleEditProductClick(id) {
    if (!window.supabaseClient) {
      showProductActionNotification('Configuration Supabase manquante. Impossible de charger le produit.', 'error');
      return;
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('products')
        .select('id, name_fr, name_ar, description_fr, description_ar, image_url, brand, price, is_available, is_featured, product_categories(category_id)')
        .eq('id', id)
        .single();

      if (error) throw error;

      const categoryIds = Array.isArray(data.product_categories)
        ? data.product_categories.map((pc) => pc.category_id)
        : [];

      // Make sure the category <select> reflects real, current Supabase
      // data before we try to select any options in it.
      await loadCategoryOptionsForProductForm();

      populateProductForm(data, categoryIds);

      if (typeof window.openModal === 'function') {
        window.openModal('productModal');
      }
    } catch (err) {
      console.error('Erreur lors du chargement du produit à modifier :', err);
      showProductActionNotification('Impossible de charger ce produit pour modification.', 'error');
    }
  }

  // ------------------------------------------------------------------
  // Submit handler — manual "transaction" across public.products and
  // public.product_categories, mirroring the Save Flow / Rollback
  // sections of the task spec. Handles BOTH Create and Edit; which path
  // runs is decided by whether productFormIdInput has a value.
  //
  // CREATE:
  //   1. Upload image (if any).
  //   2. Insert the product row.
  //   3. Insert the product_categories rows for selected categories.
  //   Rollback: image uploaded but insert fails -> delete image.
  //             product inserted but junction insert fails -> delete
  //             the product row AND the image (if one was uploaded).
  //
  // EDIT:
  //   1. Upload the replacement image, if any (existing image_url is
  //      kept untouched otherwise — no upload, no delete).
  //   2. Update the product row.
  //   3. Replace its product_categories rows: delete the existing rows
  //      for this product, then insert the newly selected set, so the
  //      final relationship state exactly matches the modal selection.
  //   4. Only once BOTH the product update and the category replace have
  //      succeeded, delete the OLD image from Storage (best-effort —
  //      failure here does not undo the already-successful DB update).
  //   Rollback:
  //     - New image uploaded but product update fails -> delete the new
  //       image only. Old image and old product row are untouched.
  //     - Product update succeeds but category replace fails -> restore
  //       the product row to its previous values (via a second update
  //       using editSnapshot.previousValues, including the OLD
  //       image_url), re-insert the previous category links, and delete
  //       the newly uploaded image (if any). The old image is never
  //       deleted in this path.
  // ------------------------------------------------------------------
  async function handleProductSubmit(e) {
    e.preventDefault();

    if (isSavingProduct) return; // guard against double submission

    hideFormError();
    if (!validateProductForm()) return;

    if (!window.supabaseClient) {
      showFormError('Configuration Supabase manquante. Impossible d\'enregistrer le produit.');
      return;
    }

    const productId = productFormIdInput ? productFormIdInput.value : '';
    const isEditing = !!productId;

    setProductSaving(true);

    if (isEditing) {
      await saveEditedProduct(productId);
    } else {
      await saveNewProduct();
    }

    setProductSaving(false);
  }

  // ------------------------------------------------------------------
  // CREATE path — unchanged behavior from Step 2.
  // ------------------------------------------------------------------
  async function saveNewProduct() {
    let uploadedImagePath = null; // set only once the upload itself has succeeded
    let insertedProductId = null; // set only once the product row itself has been created

    try {
      // 1. Upload image, if one was selected. Case 3 (no image): imageUrl
      // stays null and nothing is uploaded/deleted.
      let imageUrl = null;
      if (pendingProductImageFile) {
        const uploadResult = await uploadProductImage(pendingProductImageFile);
        uploadedImagePath = uploadResult.path;
        imageUrl = uploadResult.publicUrl;
      }

      // 2. Insert the product row.
      const payload = {
        name_fr: prodNameFRInput.value.trim(),
        name_ar: prodNameARInput.value.trim() || null,
        description_fr: prodDescFRInput.value.trim() || null,
        description_ar: prodDescARInput.value.trim() || null,
        image_url: imageUrl,
        brand: prodBrandInput.value.trim() || null,
        price: parseFloat(prodPriceInput.value),
        is_available: prodAvailableInput.checked,
        is_featured: prodFeaturedInput.checked,
      };

      const { data: insertedProduct, error: insertError } = await window.supabaseClient
        .from('products')
        .insert(payload)
        .select('id')
        .single();

      if (insertError) throw insertError;

      insertedProductId = insertedProduct.id;

      // 3. Insert product_categories rows for the selected categories.
      const selectedCategoryIds = Array.from(prodCategoriesSelect.selectedOptions).map((o) => o.value);

      if (selectedCategoryIds.length > 0) {
        const junctionRows = selectedCategoryIds.map((categoryId) => ({
          product_id: insertedProductId,
          category_id: categoryId,
        }));

        const { error: junctionError } = await window.supabaseClient
          .from('product_categories')
          .insert(junctionRows);

        if (junctionError) throw junctionError;
      }

      // Success — refresh, close, reset, notify.
      if (typeof window.closeModal === 'function') {
        window.closeModal('productModal');
      }
      resetProductForm();
      await loadProducts();
      showProductActionNotification('✅ Produit créé avec succès.', 'success');
    } catch (err) {
      console.error('Erreur lors de la création du produit :', err);

      // Rollback: undo whatever this operation already created, in
      // reverse order — product row first, then the image.
      if (insertedProductId) {
        try {
          const { error: deleteProductError } = await window.supabaseClient
            .from('products')
            .delete()
            .eq('id', insertedProductId);
          if (deleteProductError) {
            console.error('Impossible de supprimer le produit orphelin après échec :', deleteProductError);
          }
        } catch (rollbackErr) {
          console.error('Erreur lors du rollback du produit :', rollbackErr);
        }
      }
      if (uploadedImagePath) {
        await deleteProductImage(uploadedImagePath);
      }

      showFormError("Une erreur est survenue lors de l'enregistrement du produit. Veuillez réessayer.");
    }
  }

  // ------------------------------------------------------------------
  // EDIT path — Step 3.
  // ------------------------------------------------------------------
  async function saveEditedProduct(productId) {
    const oldImageUrl = prodImageUrlHidden ? prodImageUrlHidden.value || null : null;
    const snapshot = editSnapshot; // captured when the modal was populated

    let uploadedImagePath = null; // set only once a replacement upload succeeds
    let productUpdateSucceeded = false;
    let categoriesReplaced = false;

    try {
      // 1. Upload the replacement image, if one was selected. If not,
      // keep using the existing image_url untouched (no upload, no delete).
      let imageUrl = oldImageUrl;
      if (pendingProductImageFile) {
        const uploadResult = await uploadProductImage(pendingProductImageFile);
        uploadedImagePath = uploadResult.path;
        imageUrl = uploadResult.publicUrl;
      }

      // 2. Update the product row.
      const payload = {
        name_fr: prodNameFRInput.value.trim(),
        name_ar: prodNameARInput.value.trim() || null,
        description_fr: prodDescFRInput.value.trim() || null,
        description_ar: prodDescARInput.value.trim() || null,
        image_url: imageUrl,
        brand: prodBrandInput.value.trim() || null,
        price: parseFloat(prodPriceInput.value),
        is_available: prodAvailableInput.checked,
        is_featured: prodFeaturedInput.checked,
      };

      const { error: updateError } = await window.supabaseClient
        .from('products')
        .update(payload)
        .eq('id', productId);

      if (updateError) throw updateError;

      productUpdateSucceeded = true;

      // 3. Replace product_categories: delete the existing rows for this
      // product, then insert the newly selected set, so the final state
      // exactly matches what's selected in the modal (including "no
      // categories selected" -> zero rows, which the schema allows since
      // product_categories has no NOT NULL/min-count constraint on that).
      const selectedCategoryIds = Array.from(prodCategoriesSelect.selectedOptions).map((o) => o.value);

      const { error: deleteJunctionError } = await window.supabaseClient
        .from('product_categories')
        .delete()
        .eq('product_id', productId);

      if (deleteJunctionError) throw deleteJunctionError;

      if (selectedCategoryIds.length > 0) {
        const junctionRows = selectedCategoryIds.map((categoryId) => ({
          product_id: productId,
          category_id: categoryId,
        }));

        const { error: insertJunctionError } = await window.supabaseClient
          .from('product_categories')
          .insert(junctionRows);

        if (insertJunctionError) throw insertJunctionError;
      }

      categoriesReplaced = true;

      // 4. Both the product update and the category replace succeeded.
      // Only now delete the OLD image, if it was actually replaced.
      // Best-effort: a cleanup failure here must NOT be reported as an
      // overall failure, since the database already reflects success.
      if (pendingProductImageFile && oldImageUrl) {
        const oldPath = getStoragePathFromPublicUrl(oldImageUrl, PRODUCT_BUCKET);
        if (oldPath) {
          await deleteProductImage(oldPath);
        }
      }

      // Success — refresh, close, reset, notify.
      if (typeof window.closeModal === 'function') {
        window.closeModal('productModal');
      }
      resetProductForm();
      await loadProducts();
      showProductActionNotification('✅ Produit mis à jour avec succès.', 'success');
    } catch (err) {
      console.error('Erreur lors de la mise à jour du produit :', err);

      if (productUpdateSucceeded && !categoriesReplaced && snapshot) {
        // The product row was updated but the category replace failed
        // partway through. Restore the product row to its previous
        // values (including the OLD image_url — never the new one),
        // and restore its previous category links so the product isn't
        // left in a partially-updated state.
        try {
          const { error: restoreProductError } = await window.supabaseClient
            .from('products')
            .update(snapshot.previousValues)
            .eq('id', productId);
          if (restoreProductError) {
            console.error('Impossible de restaurer le produit après échec de la mise à jour des catégories :', restoreProductError);
          }
        } catch (restoreErr) {
          console.error('Erreur lors de la restauration du produit :', restoreErr);
        }

        try {
          if (snapshot.previousCategoryIds && snapshot.previousCategoryIds.length > 0) {
            const restoreRows = snapshot.previousCategoryIds.map((categoryId) => ({
              product_id: productId,
              category_id: categoryId,
            }));
            const { error: restoreJunctionError } = await window.supabaseClient
              .from('product_categories')
              .insert(restoreRows);
            if (restoreJunctionError) {
              console.error('Impossible de restaurer les catégories précédentes du produit :', restoreJunctionError);
            }
          }
        } catch (restoreJunctionErr) {
          console.error('Erreur lors de la restauration des catégories du produit :', restoreJunctionErr);
        }
      }

      // The newly uploaded replacement image (if any) is always cleaned
      // up on failure — the old image is never touched in any failure
      // branch above.
      if (uploadedImagePath) {
        await deleteProductImage(uploadedImagePath);
      }

      showFormError("Une erreur est survenue lors de la mise à jour du produit. Veuillez réessayer.");
    }
  }

  // ====================================================================
  // STEP 4: Delete Product
  // ====================================================================
  // Called from admin.js's existing #confirmDelete click handler (see
  // the 'product' case there, which delegates to this function — the
  // same dispatch pattern already used for 'category').
  //
  // Sequence:
  //   1. Look up the product's image_url first (needed before deletion,
  //      since the row won't be queryable afterward). If this lookup
  //      fails (product not found / network error), stop here — no
  //      deletion is attempted.
  //   2. Delete the row from public.products.
  //      - public.product_categories.product_id is declared
  //        "on delete cascade" in 01_schema.sql, so this single delete
  //        also removes the product's category links automatically.
  //        No manual product_categories delete is performed — doing so
  //        would be redundant against the same cascade, and 01_schema.sql
  //        defines no OTHER foreign key that references products.id, so
  //        there is no restrictive FK that could block this delete under
  //        the current schema. The 23503 branch below is kept only for
  //        defensive consistency with Categories' delete handler; it is
  //        not reachable given the current schema.
  //      - On any delete error, stop: no image deleted, no table
  //        reload, just a friendly notification and a full console.error.
  //   3. Only after the delete succeeds: remove the image file (if any)
  //      via the existing deleteProductImage() helper — best-effort,
  //      already fail-safe (logs but never throws), never blocks step 4,
  //      and never causes a successful deletion to be reported as failed.
  //   4. Reload the table via the existing loadProducts().
  //   5. Show the existing success notification.
  // ------------------------------------------------------------------
  async function deleteProduct(id) {
    if (!window.supabaseClient) {
      showProductActionNotification('Configuration Supabase manquante. Impossible de supprimer le produit.', 'error');
      return;
    }

    if (isDeletingProduct) return; // guard against duplicate/overlapping delete calls
    isDeletingProduct = true;

    try {
      // Step 1: grab the image URL (if any) before the row is gone. If
      // the product can't be found/read, stop — nothing has been
      // deleted, so there's nothing to roll back.
      let imageUrl = null;
      try {
        const { data, error } = await window.supabaseClient
          .from('products')
          .select('image_url')
          .eq('id', id)
          .single();
        if (error) throw error;
        imageUrl = data.image_url;
      } catch (lookupErr) {
        console.error('Impossible de récupérer le produit avant suppression :', lookupErr);
        showProductActionNotification("Impossible de trouver ce produit. Il a peut-être déjà été supprimé.", 'error');
        return;
      }

      // Step 2: delete the row. Cascade (see comment above) handles
      // product_categories automatically.
      const { error: deleteError } = await window.supabaseClient
        .from('products')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Erreur lors de la suppression du produit :', deleteError);

        if (deleteError.code === '23503') {
          // Defensive only — see note above; not reachable under the
          // current schema, since no restrictive FK targets products.id.
          showProductActionNotification(
            "Ce produit est encore référencé ailleurs et ne peut pas être supprimé.",
            'error'
          );
        } else {
          showProductActionNotification('Une erreur est survenue lors de la suppression du produit.', 'error');
        }
        return; // No image deletion, no reload, no success notification.
      }

      // Step 3: delete succeeded — clean up the image, best-effort. A
      // cleanup failure here is logged but must NOT be reported as an
      // overall failure, since the database deletion already succeeded.
      if (imageUrl) {
        const path = getStoragePathFromPublicUrl(imageUrl, PRODUCT_BUCKET);
        if (path) {
          await deleteProductImage(path);
        }
      }

      // Step 4 + 5: refresh the table and confirm success.
      await loadProducts();
      showProductActionNotification('✅ Produit supprimé avec succès.', 'success');
    } finally {
      isDeletingProduct = false;
    }
  }

  // ====================================================================
  // STEP 7: View Product (read-only)
  // ====================================================================

  // ------------------------------------------------------------------
  // DOM refs for the #productViewModal — resolved once, lazily, mirroring
  // setupProductForm()'s pattern.
  // ------------------------------------------------------------------
  function setupProductViewModal() {
    productViewLoadingEl = document.getElementById('productViewLoading');
    productViewErrorEl = document.getElementById('productViewError');
    productViewContentEl = document.getElementById('productViewContent');
    pvImage = document.getElementById('pvImage');
    pvNameFR = document.getElementById('pvNameFR');
    pvNameARRow = document.getElementById('pvNameARRow');
    pvNameAR = document.getElementById('pvNameAR');
    pvBrand = document.getElementById('pvBrand');
    pvPrice = document.getElementById('pvPrice');
    pvAvailable = document.getElementById('pvAvailable');
    pvFeatured = document.getElementById('pvFeatured');
    pvDescFRRow = document.getElementById('pvDescFRRow');
    pvDescFR = document.getElementById('pvDescFR');
    pvDescARRow = document.getElementById('pvDescARRow');
    pvDescAR = document.getElementById('pvDescAR');
    pvCategories = document.getElementById('pvCategories');
  }

  // ------------------------------------------------------------------
  // Small state helpers for the View modal — loading / error / content
  // are mutually exclusive, so a fetch never shows stale data from a
  // previous View alongside a new loading spinner or a new error.
  // ------------------------------------------------------------------
  function showProductViewLoading() {
    if (productViewLoadingEl) productViewLoadingEl.style.display = 'block';
    if (productViewErrorEl) productViewErrorEl.style.display = 'none';
    if (productViewContentEl) productViewContentEl.style.display = 'none';
  }

  function showProductViewError(message) {
    if (productViewLoadingEl) productViewLoadingEl.style.display = 'none';
    if (productViewContentEl) productViewContentEl.style.display = 'none';
    if (productViewErrorEl) {
      productViewErrorEl.textContent = message;
      productViewErrorEl.style.display = 'block';
    } else {
      window.alert(message);
    }
  }

  function showProductViewContent() {
    if (productViewLoadingEl) productViewLoadingEl.style.display = 'none';
    if (productViewErrorEl) productViewErrorEl.style.display = 'none';
    if (productViewContentEl) productViewContentEl.style.display = 'block';
  }

  // ------------------------------------------------------------------
  // Populate #productViewModal with a product fetched fresh from
  // Supabase. Read-only — no field here is ever written back.
  // ------------------------------------------------------------------
  function populateProductViewModal(product) {
    if (pvImage) {
      pvImage.src = product.image_url ? product.image_url : PLACEHOLDER_IMAGE;
      pvImage.style.display = 'block';
    }

    if (pvNameFR) pvNameFR.textContent = product.name_fr || '-';

    if (product.name_ar) {
      if (pvNameAR) pvNameAR.textContent = product.name_ar;
      if (pvNameARRow) pvNameARRow.style.display = '';
    } else if (pvNameARRow) {
      pvNameARRow.style.display = 'none';
    }

    if (pvBrand) pvBrand.textContent = product.brand || '-';
    if (pvPrice) {
      pvPrice.textContent = (product.price === null || product.price === undefined)
        ? '-'
        : product.price + ' DH';
    }

    if (pvAvailable) {
      pvAvailable.innerHTML = '<span class="badge ' + (product.is_available ? 'badge-success' : 'badge-danger') + '">' +
        (product.is_available ? 'Oui' : 'Non') + '</span>';
    }
    if (pvFeatured) {
      pvFeatured.innerHTML = product.is_featured
        ? '<span class="badge badge-warning">★ Vedette</span>'
        : '<span class="badge badge-danger">Non</span>';
    }

    if (product.description_fr) {
      if (pvDescFR) pvDescFR.textContent = product.description_fr;
      if (pvDescFRRow) pvDescFRRow.style.display = '';
      if (pvDescFR) pvDescFR.style.display = '';
    } else {
      if (pvDescFRRow) pvDescFRRow.style.display = 'none';
      if (pvDescFR) pvDescFR.style.display = 'none';
    }

    if (product.description_ar) {
      if (pvDescAR) pvDescAR.textContent = product.description_ar;
      if (pvDescARRow) pvDescARRow.style.display = '';
      if (pvDescAR) pvDescAR.style.display = '';
    } else {
      if (pvDescARRow) pvDescARRow.style.display = 'none';
      if (pvDescAR) pvDescAR.style.display = 'none';
    }

    // Reuses the existing getCategoryNames() helper (already handles the
    // "no categories" case by returning '-') — no duplicated logic, and
    // the same nested product_categories(categories(name_fr)) shape
    // already used by the table and by Edit.
    if (pvCategories) pvCategories.textContent = getCategoryNames(product);
  }

  // ------------------------------------------------------------------
  // View button click handler. Opens #productViewModal immediately in a
  // loading state (never showing stale data from a previous View), then
  // fetches the real product fresh from Supabase by its real UUID —
  // never the demo array, never a row index/position. Strictly
  // read-only: a single SELECT, nothing else.
  // ------------------------------------------------------------------
  async function handleViewProductClick(id) {
    if (isViewingProduct) return; // guard against overlapping View requests
    isViewingProduct = true;

    if (typeof window.openModal === 'function') {
      window.openModal('productViewModal');
    }
    showProductViewLoading();

    try {
      if (!window.supabaseClient) {
        showProductViewError('Configuration Supabase manquante. Impossible de charger le produit.');
        console.error('ProductsModule: window.supabaseClient introuvable.');
        return;
      }

      const { data, error } = await window.supabaseClient
        .from('products')
        .select('id, name_fr, name_ar, description_fr, description_ar, brand, price, image_url, is_available, is_featured, product_categories(categories(name_fr))')
        .eq('id', id)
        .single();

      if (error) throw error;

      populateProductViewModal(data);
      showProductViewContent();
    } catch (err) {
      console.error('Erreur lors du chargement du produit à afficher :', err);

      // PGRST116 = PostgREST's "0 rows" error for .single() — the
      // product no longer exists (e.g. deleted by someone else since the
      // table was last loaded). Any other error is a generic failure.
      if (err && err.code === 'PGRST116') {
        showProductViewError('Produit introuvable.');
      } else {
        showProductViewError('Impossible de charger ce produit. Veuillez réessayer.');
      }
    } finally {
      isViewingProduct = false;
    }
  }

  // ------------------------------------------------------------------
  // Wire up the form + the "+ Ajouter" button.
  // NOTE: setupProductForm() must run first — it assigns
  // prodImageFileInput (and the other modal refs). setupProductImagePreview()
  // depends on prodImageFileInput already being set, same ordering rule
  // established in categories.js.
  // ------------------------------------------------------------------
  function setupProductForm() {
    productForm = document.getElementById('productForm');
    productFormError = document.getElementById('productFormError');
    productFormIdInput = document.getElementById('productFormId');
    prodNameFRInput = document.getElementById('prodNameFR');
    prodNameFRError = document.getElementById('prodNameFRError');
    prodNameARInput = document.getElementById('prodNameAR');
    prodDescFRInput = document.getElementById('prodDescFR');
    prodDescARInput = document.getElementById('prodDescAR');
    prodBrandInput = document.getElementById('prodBrand');
    prodPriceInput = document.getElementById('prodPrice');
    prodPriceError = document.getElementById('prodPriceError');
    prodCategoriesSelect = document.getElementById('prodCategories');
    prodAvailableInput = document.getElementById('prodAvailable');
    prodFeaturedInput = document.getElementById('prodFeatured');
    prodImageFileInput = document.getElementById('prodImageFile');
    prodImagePreview = document.getElementById('prodImagePreview');
    prodImageUrlHidden = document.getElementById('prodImageUrl');
    prodImageError = document.getElementById('prodImageError');
    productSaveBtn = document.getElementById('productSaveBtn');
    productSaveBtnText = document.getElementById('productSaveBtnText');
    productSaveBtnLoader = document.getElementById('productSaveBtnLoader');
    productActionNotificationEl = document.getElementById('productsActionNotification');

    if (!productForm) {
      console.error('ProductsModule: #productForm introuvable.');
      return;
    }

    productForm.addEventListener('submit', handleProductSubmit);

    // "+ Ajouter" always opens a clean form with fresh category options,
    // even if a previous attempt was left filled in or failed.
    const addBtn = productsSection.querySelector('.add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        resetProductForm();
        loadCategoryOptionsForProductForm();
      });
    }
  }

  // ------------------------------------------------------------------
  // Step 6: reads the current search input value and the current
  // category filter value together and issues a single combined
  // loadProducts() call. Used by both the search debounce callback and
  // the category filter's change handler, so a search-in-progress and a
  // filter change can never overwrite each other's condition.
  // ------------------------------------------------------------------
  function triggerProductsReload() {
    const searchValue = productSearchInput ? productSearchInput.value : '';
    const categoryValue = productCategoryFilterSelect ? productCategoryFilterSelect.value : 'all';
    loadProducts(searchValue, categoryValue);
  }

  // ------------------------------------------------------------------
  // Step 5: Product Search — debounced ~300ms. Every keystroke cancels
  // the previous timer (clearTimeout) and schedules a new one; only a
  // pause of ~300ms without further typing actually triggers a query,
  // via the existing loadProducts(). An empty/whitespace-only value
  // naturally reloads the full list, since loadProducts() only filters
  // when the trimmed term is non-empty. Mirrors setupCategorySearch().
  // Step 6: the debounced query now also includes the current category
  // filter selection, via triggerProductsReload(), so search + filter
  // combine instead of overwriting each other.
  // ------------------------------------------------------------------
  function setupProductSearch() {
    productSearchInput = document.getElementById('productSearch');
    if (!productSearchInput) return;

    productSearchInput.addEventListener('input', function () {
      clearTimeout(productSearchDebounceTimer);
      productSearchDebounceTimer = setTimeout(function () {
        triggerProductsReload();
      }, 300);
    });
  }

  // ------------------------------------------------------------------
  // Step 6: Product Filters — populate #productCategoryFilter with REAL
  // rows from public.categories (id, name_fr), never demo data. Keeps
  // "Toutes catégories" (value="all") as the first option and preserves
  // the currently selected filter across reloads, if it still exists.
  // ------------------------------------------------------------------
  async function loadCategoryOptionsForProductFilter() {
    if (!productCategoryFilterSelect || !window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient
        .from('categories')
        .select('id, name_fr')
        .order('name_fr', { ascending: true });

      if (error) throw error;

      const previouslySelected = productCategoryFilterSelect.value || 'all';

      const optionsHtml = (data || [])
        .map((cat) => '<option value="' + escapeHtml(cat.id) + '">' + escapeHtml(cat.name_fr) + '</option>')
        .join('');

      productCategoryFilterSelect.innerHTML = '<option value="all">Toutes catégories</option>' + optionsHtml;

      const stillExists = Array.from(productCategoryFilterSelect.options).some(
        (opt) => opt.value === previouslySelected
      );
      productCategoryFilterSelect.value = stillExists ? previouslySelected : 'all';
    } catch (err) {
      console.error('Erreur lors du chargement des catégories pour le filtre produit :', err);
    }
  }

  // ------------------------------------------------------------------
  // Step 6: Product Filters — wire the category filter's change event.
  // A filter change applies immediately (no debounce needed for a
  // <select>), and cancels any pending debounced search so the two never
  // race — the combined search+filter query fires right away via the
  // shared triggerProductsReload() helper.
  // ------------------------------------------------------------------
  function setupProductCategoryFilter() {
    productCategoryFilterSelect = document.getElementById('productCategoryFilter');
    if (!productCategoryFilterSelect) return;

    productCategoryFilterSelect.addEventListener('change', function () {
      clearTimeout(productSearchDebounceTimer);
      triggerProductsReload();
    });
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

    // Step 2: Create Product
    setupProductForm();
    setupProductImagePreview();
    loadCategoryOptionsForProductForm();

    // Step 5: Product Search
    setupProductSearch();

    // Step 6: Product Filters (Category)
    setupProductCategoryFilter();
    loadCategoryOptionsForProductFilter();

    // Step 7: View Product
    setupProductViewModal();
  }

  // Expose a minimal public API — admin.js only calls init(). editProduct,
  // deleteProduct, and viewProduct are called directly (editProduct/
  // viewProduct from the row buttons' onclick — see renderRows;
  // deleteProduct from admin.js's generic #confirmDelete handler's
  // 'product' case), routed through this module object specifically to
  // avoid colliding with the old global editProduct()/viewProduct()/
  // demo-array delete still defined in admin.js — same pattern used by
  // CategoriesModule.
  window.ProductsModule = {
    init: init,
    reload: loadProducts, // handy for manual testing from the console
    editProduct: handleEditProductClick,
    deleteProduct: deleteProduct,
    viewProduct: handleViewProductClick,
  };
})();
