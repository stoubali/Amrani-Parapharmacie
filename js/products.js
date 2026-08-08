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
// STEP 3 ADDITION: Edit Product, reusing the SAME modal and the SAME
// save/upload/validation/notification/reset helpers as Create — only the
// final insert-vs-update Supabase calls differ, plus a full replace of
// that product's product_categories rows, plus rollback logic to restore
// the product row and its category links if the category update fails
// after the product update already succeeded.
//
// Explicitly NOT implemented here (later steps):
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
              '<button class="btn-icon edit" onclick="window.ProductsModule.editProduct(\'' + p.id + '\')" title="Modifier">' +
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
  }

  // Expose a minimal public API — admin.js only calls init(). editProduct
  // is called directly from the row button's onclick (see renderRows),
  // routed through this module object specifically to avoid colliding
  // with the old global editProduct() still defined in admin.js — same
  // pattern used by CategoriesModule.editCategory.
  window.ProductsModule = {
    init: init,
    reload: loadProducts, // handy for manual testing from the console
    editProduct: handleEditProductClick,
  };
})();
