// ====================================================================
// js/categories.js — Categories Module (Amrani Parapharmacie)
// ====================================================================
// STEP 1 SCOPE (unchanged, tested — do not modify): loads categories from
// Supabase and renders them into the EXISTING #categoriesTable.
//
// STEP 2 (unchanged, tested): Create Category, using the existing Add/Edit
// Category modal.
//
// STEP 3 (unchanged, tested): Edit Category, reusing the SAME modal and the
// SAME save/upload/validation/notification helpers as Create — only the
// final insert-vs-update Supabase call differs.
//
// STEP 4 ADDITION: Delete Category, reusing the existing #deleteModal
// confirmation modal, the existing image-deletion helper, and the existing
// loadCategories()/showActionNotification() helpers. Handles the
// product_categories foreign-key constraint safely (see deleteCategory()).
//
// Still NOT implemented here (later steps):
//   - Search / filter
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

  // --- Step 2: Create Category — bucket + form state ---------------
  const CATEGORY_BUCKET = 'categories'; // existing bucket from 03_storage.sql

  let actionNotificationEl = null;

  let categoryForm = null;
  let categoryFormError = null;
  let categoryFormIdInput = null;
  let catNameFRInput = null;
  let catNameFRError = null;
  let catNameARInput = null;
  let catImageFileInput = null;
  let catImagePreview = null;
  let catImageUrlHidden = null;
  let catImageError = null;
  let categorySaveBtn = null;
  let categorySaveBtnText = null;
  let categorySaveBtnLoader = null;

  let pendingCategoryImageFile = null;
  let isSavingCategory = false;

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
              '<button class="btn-icon edit" onclick="window.CategoriesModule.editCategory(\'' + cat.id + '\')" title="Modifier">' +
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
  // Step 2: Create Category — notification helpers
  // ------------------------------------------------------------------
  function showActionNotification(message, type) {
    if (!actionNotificationEl) {
      window.alert(message);
      return;
    }
    actionNotificationEl.textContent = message;
    actionNotificationEl.className =
      'settings-notification settings-notification-' + (type || 'info');
    actionNotificationEl.style.display = 'block';
    clearTimeout(showActionNotification._t);
    showActionNotification._t = setTimeout(() => {
      actionNotificationEl.style.display = 'none';
    }, 4000);
  }

  function showFormError(message) {
    if (!categoryFormError) {
      window.alert(message);
      return;
    }
    categoryFormError.textContent = message;
    categoryFormError.style.display = 'block';
  }

  function hideFormError() {
    if (categoryFormError) categoryFormError.style.display = 'none';
  }

  function clearFieldErrors() {
    if (catNameFRError) catNameFRError.textContent = '';
    if (catImageError) catImageError.textContent = '';
  }

  // ------------------------------------------------------------------
  // Step 2: Create Category — form validation
  // ------------------------------------------------------------------
  function validateCategoryForm() {
    let isValid = true;
    clearFieldErrors();

    const nameFr = catNameFRInput.value.trim();
    if (!nameFr) {
      catNameFRError.textContent = 'Le nom de la catégorie (FR) est requis.';
      isValid = false;
    }

    if (pendingCategoryImageFile && !pendingCategoryImageFile.type.startsWith('image/')) {
      catImageError.textContent = 'Veuillez sélectionner un fichier image valide.';
      isValid = false;
    }

    return isValid;
  }

  // ------------------------------------------------------------------
  // Step 2: Create Category — image preview (before upload)
  // ------------------------------------------------------------------
  function setupCategoryImagePreview() {
    if (!catImageFileInput) return;

    catImageFileInput.addEventListener('change', () => {
      const file = catImageFileInput.files && catImageFileInput.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        if (catImageError) catImageError.textContent = 'Veuillez sélectionner un fichier image valide.';
        catImageFileInput.value = '';
        return;
      }

      if (catImageError) catImageError.textContent = '';
      pendingCategoryImageFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        catImagePreview.src = e.target.result;
        catImagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  // ------------------------------------------------------------------
  // Step 2: Create Category — upload image to the "categories" bucket
  // Returns { path, publicUrl } — the path is needed so an orphaned file
  // can be removed if the subsequent database insert fails.
  // ------------------------------------------------------------------
  async function uploadCategoryImage(file) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

    const { error: uploadError } = await window.supabaseClient
      .storage
      .from(CATEGORY_BUCKET)
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) throw uploadError;

    const { data } = window.supabaseClient
      .storage
      .from(CATEGORY_BUCKET)
      .getPublicUrl(path);

    return { path: path, publicUrl: data.publicUrl };
  }

  // ------------------------------------------------------------------
  // Step 2: Create Category — remove an uploaded file that ended up
  // orphaned because the database insert failed after the upload
  // succeeded. Best-effort: failures here are logged, not surfaced to
  // the admin (the insert error is already the message they see).
  // ------------------------------------------------------------------
  async function deleteCategoryImage(path) {
    if (!path || !window.supabaseClient) return;
    try {
      const { error } = await window.supabaseClient
        .storage
        .from(CATEGORY_BUCKET)
        .remove([path]);
      if (error) throw error;
    } catch (cleanupErr) {
      console.error('Impossible de supprimer le fichier orphelin "' + path + '" :', cleanupErr);
    }
  }

  // ------------------------------------------------------------------
  // Step 2: Create Category — save button loading state
  // ------------------------------------------------------------------
  function setCategorySaving(isSaving) {
    isSavingCategory = isSaving;
    if (!categorySaveBtn) return;
    categorySaveBtn.disabled = isSaving;
    if (categorySaveBtnText) categorySaveBtnText.style.display = isSaving ? 'none' : 'inline';
    if (categorySaveBtnLoader) categorySaveBtnLoader.style.display = isSaving ? 'inline-block' : 'none';
  }

  // ------------------------------------------------------------------
  // Step 2/3: reset the modal back to a blank "Add" state. Reused by:
  // the "+ Ajouter" button, after a successful save, and as the first
  // step of populateCategoryForm() before filling in Edit values.
  // ------------------------------------------------------------------
  function resetCategoryForm() {
    if (categoryForm) categoryForm.reset();
    if (categoryFormIdInput) categoryFormIdInput.value = '';
    if (catImageUrlHidden) catImageUrlHidden.value = '';
    if (catImagePreview) {
      catImagePreview.removeAttribute('src');
      catImagePreview.style.display = 'none';
    }
    pendingCategoryImageFile = null;
    clearFieldErrors();
    hideFormError();

    const titleEl = document.getElementById('categoryModalTitle');
    if (titleEl) titleEl.textContent = 'Ajouter une catégorie';
  }

  // ------------------------------------------------------------------
  // Step 3: Edit Category — fill the (already reset) form with the
  // category's current values, loaded fresh from Supabase.
  // ------------------------------------------------------------------
  function populateCategoryForm(cat) {
    resetCategoryForm();

    if (categoryFormIdInput) categoryFormIdInput.value = cat.id;
    if (catNameFRInput) catNameFRInput.value = cat.name_fr || '';
    if (catNameARInput) catNameARInput.value = cat.name_ar || '';

    // Keep the current image URL internally (used by handleCategorySubmit
    // if the admin doesn't pick a replacement file) and show its preview.
    if (catImageUrlHidden) catImageUrlHidden.value = cat.image_url || '';
    if (cat.image_url && catImagePreview) {
      catImagePreview.src = cat.image_url;
      catImagePreview.style.display = 'block';
    }

    const titleEl = document.getElementById('categoryModalTitle');
    if (titleEl) titleEl.textContent = 'Modifier la catégorie';
  }

  // ------------------------------------------------------------------
  // Step 3: recover the storage path from a public URL (e.g. to delete
  // the old image after a successful replace). Returns null if the URL
  // doesn't look like it came from this bucket.
  // ------------------------------------------------------------------
  function getStoragePathFromPublicUrl(url, bucket) {
    if (!url) return null;
    const marker = '/storage/v1/object/public/' + bucket + '/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  }

  // ------------------------------------------------------------------
  // Step 3: Edit Category — Edit button click handler. Loads the
  // selected category fresh from Supabase, then opens the existing
  // Add/Edit modal (via the existing shared openModal helper) already
  // populated.
  // ------------------------------------------------------------------
  async function handleEditCategoryClick(id) {
    if (!window.supabaseClient) {
      showActionNotification('Configuration Supabase manquante. Impossible de charger la catégorie.', 'error');
      return;
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('categories')
        .select('id, name_fr, name_ar, image_url')
        .eq('id', id)
        .single();

      if (error) throw error;

      populateCategoryForm(data);

      if (typeof window.openModal === 'function') {
        window.openModal('categoryModal');
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la catégorie à modifier :', err);
      showActionNotification('Impossible de charger cette catégorie pour modification.', 'error');
    }
  }

  // ------------------------------------------------------------------
  // Step 4: Delete Category — called from admin.js's existing
  // #confirmDelete click handler (see the 'category' case there).
  //
  // Sequence:
  //   1. Look up the category's image_url first (needed before deletion,
  //      since the row won't be queryable afterward).
  //   2. Delete the row from Supabase.
  //      - On a foreign-key violation (Postgres code 23503 — the
  //        category is still referenced in product_categories), stop
  //        here: no image deleted, no table reload, just a friendly
  //        notification and a full console.error.
  //      - On any other delete error, same treatment with a generic
  //        friendly message.
  //   3. Only after the delete succeeds: remove the image file (if any)
  //      via the existing deleteCategoryImage() helper — best-effort,
  //      already fail-safe, never blocks step 4.
  //   4. Reload the table via the existing loadCategories().
  //   5. Show the existing success notification.
  // ------------------------------------------------------------------
  async function deleteCategory(id) {
    if (!window.supabaseClient) {
      showActionNotification('Configuration Supabase manquante. Impossible de supprimer la catégorie.', 'error');
      return;
    }

    // Step 1: grab the image URL (if any) before the row is gone.
    let imageUrl = null;
    try {
      const { data, error } = await window.supabaseClient
        .from('categories')
        .select('image_url')
        .eq('id', id)
        .single();
      if (!error && data) imageUrl = data.image_url;
    } catch (lookupErr) {
      console.error('Impossible de récupérer l\'image de la catégorie avant suppression :', lookupErr);
      // Not fatal — proceed with the delete anyway; image cleanup will
      // simply be skipped if we don't know the URL.
    }

    // Step 2: delete the row.
    const { error: deleteError } = await window.supabaseClient
      .from('categories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erreur lors de la suppression de la catégorie :', deleteError);

      if (deleteError.code === '23503') {
        // product_categories still references this category.
        showActionNotification(
          "Cette catégorie est encore associée à un ou plusieurs produits. Retirez ces associations avant de supprimer la catégorie.",
          'error'
        );
      } else {
        showActionNotification('Une erreur est survenue lors de la suppression de la catégorie.', 'error');
      }
      return; // No image deletion, no reload, no success notification.
    }

    // Step 3: delete succeeded — clean up the image, best-effort.
    if (imageUrl) {
      const path = getStoragePathFromPublicUrl(imageUrl, CATEGORY_BUCKET);
      if (path) {
        await deleteCategoryImage(path);
      }
    }

    // Step 4 + 5: refresh the table and confirm success.
    await loadCategories();
    showActionNotification('✅ Catégorie supprimée avec succès.', 'success');
  }

  // ------------------------------------------------------------------
  // Step 2: Create Category — form submit handler
  // ------------------------------------------------------------------
  async function handleCategorySubmit(e) {
    e.preventDefault();

    // Guard against duplicate submissions (double-click, double-tap, etc.)
    if (isSavingCategory) return;

    hideFormError();

    if (!validateCategoryForm()) return;

    if (!window.supabaseClient) {
      showFormError('Configuration Supabase manquante. Impossible d\'enregistrer la catégorie.');
      return;
    }

    const categoryId = categoryFormIdInput ? categoryFormIdInput.value : '';
    const isEditing = !!categoryId;
    const oldImageUrl = catImageUrlHidden ? catImageUrlHidden.value : '';

    setCategorySaving(true);

    let uploadedImagePath = null; // set only once the upload itself has succeeded

    try {
      let imageUrl = catImageUrlHidden ? catImageUrlHidden.value || null : null;
      if (pendingCategoryImageFile) {
        const uploadResult = await uploadCategoryImage(pendingCategoryImageFile);
        uploadedImagePath = uploadResult.path;
        imageUrl = uploadResult.publicUrl;
      }

      const payload = {
        name_fr: catNameFRInput.value.trim(),
        name_ar: catNameARInput.value.trim() || null,
        image_url: imageUrl,
      };

      let saveError;
      if (isEditing) {
        ({ error: saveError } = await window.supabaseClient
          .from('categories')
          .update(payload)
          .eq('id', categoryId));
      } else {
        ({ error: saveError } = await window.supabaseClient
          .from('categories')
          .insert(payload));
      }

      if (saveError) throw saveError;

      // Update succeeded. If this was an edit and a new image replaced an
      // existing one, remove the old file so it doesn't linger as an
      // orphan. Best-effort: deleteCategoryImage() already only logs on
      // failure, it never throws, so this can never fail the save.
      if (isEditing && pendingCategoryImageFile && oldImageUrl) {
        const oldPath = getStoragePathFromPublicUrl(oldImageUrl, CATEGORY_BUCKET);
        if (oldPath) {
          await deleteCategoryImage(oldPath);
        }
      }

      if (typeof window.closeModal === 'function') {
        window.closeModal('categoryModal');
      }
      resetCategoryForm();
      await loadCategories();
      showActionNotification(
        isEditing ? '✅ Catégorie mise à jour avec succès.' : '✅ Catégorie créée avec succès.',
        'success'
      );
    } catch (err) {
      console.error(
        (isEditing ? 'Erreur lors de la mise à jour de la catégorie :' : 'Erreur lors de la création de la catégorie :'),
        err
      );

      // The image upload succeeded but the DB save failed (or something
      // after it threw) — remove the now-orphaned file from storage so it
      // doesn't accumulate.
      if (uploadedImagePath) {
        await deleteCategoryImage(uploadedImagePath);
      }

      showFormError("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setCategorySaving(false);
    }
  }

  // ------------------------------------------------------------------
  // Step 2: Create Category — wire up the form + the "+ Ajouter" button
  // ------------------------------------------------------------------
  function setupCategoryForm() {
    categoryForm = document.getElementById('categoryForm');
    categoryFormError = document.getElementById('categoryFormError');
    categoryFormIdInput = document.getElementById('categoryFormId');
    catNameFRInput = document.getElementById('catNameFR');
    catNameFRError = document.getElementById('catNameFRError');
    catNameARInput = document.getElementById('catNameAR');
    catImageFileInput = document.getElementById('catImageFile');
    catImagePreview = document.getElementById('catImagePreview');
    catImageUrlHidden = document.getElementById('catImageUrl');
    catImageError = document.getElementById('catImageError');
    categorySaveBtn = document.getElementById('categorySaveBtn');
    categorySaveBtnText = document.getElementById('categorySaveBtnText');
    categorySaveBtnLoader = document.getElementById('categorySaveBtnLoader');

    if (!categoryForm) {
      console.error('CategoriesModule: #categoryForm introuvable.');
      return;
    }

    categoryForm.addEventListener('submit', handleCategorySubmit);

    // Make sure "+ Ajouter" always opens a clean form, even if a previous
    // attempt was left filled in or failed.
    const addBtn = categoriesSection.querySelector('.add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', resetCategoryForm);
    }
  }


  function init() {
    if (initialized) return;
    initialized = true;

    tableBody = document.querySelector('#categoriesTable tbody');
    tableWrapper = categoriesSection.querySelector('.table-responsive');
    loadingEl = document.getElementById('categoriesLoading');
    errorEl = document.getElementById('categoriesError');
    actionNotificationEl = document.getElementById('categoriesActionNotification');

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

    // Step 2: Create Category
    // NOTE: setupCategoryForm() must run first — it assigns catImageFileInput
    // (and the other modal refs). setupCategoryImagePreview() depends on
    // catImageFileInput already being set, otherwise it exits early and the
    // file input's change listener never gets attached.
    setupCategoryForm();
    setupCategoryImagePreview();
  }

  // Expose a minimal public API — admin.js only calls init().
  // editCategory is called directly from the row button's onclick (see
  // renderRows), routed through this module object specifically to avoid
  // colliding with the old global editCategory() still defined in admin.js.
  window.CategoriesModule = {
    init: init,
    reload: loadCategories, // handy for manual testing from the console
    editCategory: handleEditCategoryClick,
    deleteCategory: deleteCategory,
  };
})();
