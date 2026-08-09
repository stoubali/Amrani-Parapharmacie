// ====================================================================
// js/promotions.js — Promotions Module (Amrani Parapharmacie)
// ====================================================================
// STEP 1 SCOPE (unchanged, tested — do not modify): loads promotions
// from Supabase and renders them into the EXISTING #promotionsTable.
//
// STEP 2 (unchanged, tested — do not modify): Create Promotion, using
// the existing Add/Edit Promotion modal.
//
// STEP 3 (unchanged, tested — do not modify): Edit Promotion, reusing
// the SAME modal and the SAME save/upload/validation/notification/reset
// helpers as Create — only the final insert-vs-update Supabase call
// differs, plus the old image is deleted only after a successful
// update that replaced it.
//
// STEP 4 (unchanged, tested — do not modify): Delete Promotion, reusing
// the existing #deleteModal confirmation modal (routed through
// admin.js's existing generic confirmDelete()/'promotion' case — same
// dispatch pattern already used for 'category'/'product'), the
// existing image-deletion helper, and the existing
// loadPromotions()/showPromotionActionNotification() helpers.
//
// STEP 5 ADDITION: Promotion Search (#promotionSearch), debounced
// ~300ms, searching title_fr + title_ar server-side via ilike — the
// real identity text columns on public.promotions (per 01_schema.sql).
// Promotion Filters (#promotionStatusFilter) — the only meaningful
// filter, on the real is_active column, backed by the existing
// idx_promotions_active partial index. loadPromotions() was extended
// with two optional parameters, searchTerm and statusFilter, alongside
// the existing no-argument calls (init(), the sidebar reload, and every
// Create/Edit/Delete success path), which continue to behave exactly as
// before — no filter, full list. Search and the status filter combine
// on the same query (AND) via a shared triggerPromotionsReload()
// helper used by both the search debounce callback and the filter's
// change handler, so neither can overwrite the other's condition.
//
// View is still NOT implemented.
//
// Requires (loaded before this file, in this order):
//   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
//   2. js/supabase-client.js   (creates window.supabaseClient)
//
// Table: public.promotions (id, title_fr [not null], title_ar,
//   description_fr, description_ar, image_url, start_date, end_date,
//   is_active [not null, default true], created_at, updated_at) —
//   see 01_schema.sql. Also enforces:
//     check (end_date is null or start_date is null or end_date >= start_date)
//   No other columns exist; nothing here assumes fields such as
//   "discount" or an unqualified "title"/"description". No table in
//   01_schema.sql declares a foreign key referencing promotions.id, so
//   deletion here has no cascade or restrictive-FK case to defend
//   against (unlike categories/products, which are referenced by
//   product_categories).
// Storage bucket: "promotions" (see 03_storage.sql) — public read,
//   admin-only insert/update/delete, same policy shape as the
//   "categories" and "products" buckets.
// ====================================================================

(function () {
  'use strict';

  const promotionsSection = document.getElementById('section-promotions');
  if (!promotionsSection) return;

  let tableBody = null;
  let tableWrapper = null;
  let loadingEl = null;
  let errorEl = null;

  let initialized = false;
  let hasLoadedOnce = false;

  // Mirrors categoryLoadRequestId / productLoadRequestId — discards a
  // stale response if a newer loadPromotions() call has started since.
  let promotionLoadRequestId = 0;

  // --- Step 2: Create Promotion — bucket + form state ---------------
  const PROMOTION_BUCKET = 'promotions'; // existing bucket from 03_storage.sql

  let promotionActionNotificationEl = null;

  let promoForm = null;
  let promoFormError = null;
  let promoFormIdInput = null;
  let promoTitleFRInput = null;
  let promoTitleFRError = null;
  let promoTitleARInput = null;
  let promoDescFRInput = null;
  let promoDescARInput = null;
  let promoImageFileInput = null;
  let promoImagePreview = null;
  let promoImageUrlHidden = null;
  let promoImageError = null;
  let promoStartInput = null;
  let promoEndInput = null;
  let promoDatesError = null;
  let promoActiveInput = null;
  let promoSaveBtn = null;
  let promoSaveBtnText = null;
  let promoSaveBtnLoader = null;

  let pendingPromotionImageFile = null;
  let isSavingPromotion = false;

  // --- Step 4: Delete Promotion — duplicate-execution guard ----------
  // admin.js's generic #confirmDelete handler already nulls out
  // deleteTarget/deleteType synchronously after dispatching (the same
  // protection Categories/Products rely on), but this flag adds a
  // second, Promotions-local guard in case deletePromotion() is ever
  // invoked directly (e.g. from the console) while a delete is already
  // in flight.
  let isDeletingPromotion = false;

  // --- Step 5: Search & Filters — state -------------------------------
  let promotionSearchInput = null;
  let promotionSearchDebounceTimer = null;
  let promotionStatusFilterSelect = null;

  // Same inline SVG placeholder used by Categories/Products (NOT an
  // emoji), shown when a promotion's image_url is empty.
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

  // Simple date formatter for the "Début"/"Fin" columns. start_date and
  // end_date are plain SQL `date` columns (no time component) — shown
  // as a friendly fr-FR date, or '-' when null.
  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return escapeHtml(value);
    return d.toLocaleDateString('fr-FR');
  }

  // ------------------------------------------------------------------
  // Render — reuses the EXISTING #promotionsTable columns exactly
  // (Image, Titre, Statut, Début, Fin, Actions). title_ar is shown
  // inside the "Titre" cell (like name_ar in Products), not as a new
  // column, so the table layout itself is never changed.
  //
  // Edit is wired to window.PromotionsModule.editPromotion(id). Delete
  // is wired to the existing GLOBAL confirmDelete('promotion', id) —
  // the same admin.js-owned function Categories/Products rows already
  // call, which opens the shared #deleteModal and, on confirmation,
  // dispatches to window.PromotionsModule.deletePromotion() (see the
  // 'promotion' case in admin.js's #confirmDelete click handler).
  // Neither button reaches admin.js's old demo editPromotion()/local
  // array delete anymore.
  // ------------------------------------------------------------------
  function renderRows(promotions) {
    if (!promotions || promotions.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center; color:var(--gray-600); padding:1.5rem 0.8rem;">' +
        'Aucune promotion trouvée.</td></tr>';
      return;
    }

    tableBody.innerHTML = promotions
      .map((promo) => {
        const imgSrc = promo.image_url ? escapeHtml(promo.image_url) : PLACEHOLDER_IMAGE;
        const titleFr = escapeHtml(promo.title_fr || '-');
        const titleAr = promo.title_ar ? escapeHtml(promo.title_ar) : '';
        const isActive = !!promo.is_active;
        const startDate = formatDate(promo.start_date);
        const endDate = formatDate(promo.end_date);

        return (
          '<tr data-id="' + escapeHtml(promo.id) + '">' +
            '<td><img src="' + imgSrc + '" alt="' + titleFr + '" class="category-thumb" ' +
              'onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMAGE + '\';"></td>' +
            '<td>' +
              '<div>' + titleFr + '</div>' +
              (titleAr ? '<div style="color:var(--gray-600);font-size:0.85rem;" dir="rtl">' + titleAr + '</div>' : '') +
            '</td>' +
            '<td><span class="badge ' + (isActive ? 'badge-success' : 'badge-danger') + '">' +
              (isActive ? 'Active' : 'Inactive') + '</span></td>' +
            '<td>' + startDate + '</td>' +
            '<td>' + endDate + '</td>' +
            '<td class="actions">' +
              '<button class="btn-icon edit" onclick="window.PromotionsModule.editPromotion(\'' + promo.id + '\')" title="Modifier">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
                  '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' +
                '</svg>' +
              '</button>' +
              '<button class="btn-icon delete" onclick="confirmDelete(\'promotion\', \'' + promo.id + '\')" title="Supprimer">' +
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

  // ====================================================================
  // STEP 2: Create Promotion
  // ====================================================================

  // ------------------------------------------------------------------
  // Notification / error helpers — mirror categories.js exactly.
  // ------------------------------------------------------------------
  function showPromotionActionNotification(message, type) {
    if (!promotionActionNotificationEl) {
      window.alert(message);
      return;
    }
    promotionActionNotificationEl.textContent = message;
    promotionActionNotificationEl.className =
      'settings-notification settings-notification-' + (type || 'info');
    promotionActionNotificationEl.style.display = 'block';
    clearTimeout(showPromotionActionNotification._t);
    showPromotionActionNotification._t = setTimeout(() => {
      promotionActionNotificationEl.style.display = 'none';
    }, 4000);
  }

  function showFormError(message) {
    if (!promoFormError) {
      window.alert(message);
      return;
    }
    promoFormError.textContent = message;
    promoFormError.style.display = 'block';
  }

  function hideFormError() {
    if (promoFormError) promoFormError.style.display = 'none';
  }

  function clearFieldErrors() {
    if (promoTitleFRError) promoTitleFRError.textContent = '';
    if (promoDatesError) promoDatesError.textContent = '';
    if (promoImageError) promoImageError.textContent = '';
  }

  // ------------------------------------------------------------------
  // Validation — driven ONLY by 01_schema.sql constraints on
  // public.promotions:
  //   title_fr    text not null                              -> required
  //   end_date    check (end_date is null or start_date is null
  //                       or end_date >= start_date)          -> only
  //               enforced when BOTH dates are provided
  //   title_ar, description_fr/ar, image_url, start_date,
  //   end_date    all nullable                                -> NOT required
  //   is_active   not null default true                       -> the
  //               checkbox always has a boolean value, nothing to
  //               validate
  // No other business rules (no min/max dates, no required image, no
  // required Arabic title) are invented here.
  // ------------------------------------------------------------------
  function validatePromotionForm() {
    let isValid = true;
    clearFieldErrors();

    const titleFr = promoTitleFRInput.value.trim();
    if (!titleFr) {
      promoTitleFRError.textContent = 'Le titre de la promotion (FR) est requis.';
      isValid = false;
    }

    const startValue = promoStartInput.value; // '' when empty, else 'YYYY-MM-DD'
    const endValue = promoEndInput.value;
    if (startValue && endValue && endValue < startValue) {
      promoDatesError.textContent = 'La date de fin doit être postérieure ou égale à la date de début.';
      isValid = false;
    }

    if (pendingPromotionImageFile && !pendingPromotionImageFile.type.startsWith('image/')) {
      promoImageError.textContent = 'Veuillez sélectionner un fichier image valide.';
      isValid = false;
    }

    return isValid;
  }

  // ------------------------------------------------------------------
  // Image preview (before upload) — mirrors setupCategoryImagePreview().
  // ------------------------------------------------------------------
  function setupPromotionImagePreview() {
    if (!promoImageFileInput) return;

    promoImageFileInput.addEventListener('change', () => {
      const file = promoImageFileInput.files && promoImageFileInput.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        if (promoImageError) promoImageError.textContent = 'Veuillez sélectionner un fichier image valide.';
        promoImageFileInput.value = '';
        return;
      }

      if (promoImageError) promoImageError.textContent = '';
      pendingPromotionImageFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        promoImagePreview.src = e.target.result;
        promoImagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  // ------------------------------------------------------------------
  // Upload to the existing "promotions" bucket (03_storage.sql) —
  // mirrors uploadCategoryImage(). Returns { path, publicUrl }; the
  // path is needed so an orphaned file can be removed if the
  // subsequent INSERT fails.
  // ------------------------------------------------------------------
  async function uploadPromotionImage(file) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

    const { error: uploadError } = await window.supabaseClient
      .storage
      .from(PROMOTION_BUCKET)
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) throw uploadError;

    const { data } = window.supabaseClient
      .storage
      .from(PROMOTION_BUCKET)
      .getPublicUrl(path);

    return { path: path, publicUrl: data.publicUrl };
  }

  // ------------------------------------------------------------------
  // Best-effort removal of an orphaned upload (rollback helper) — an
  // image uploaded successfully but whose promotion INSERT then
  // failed. Never throws — failures are logged, not surfaced, since
  // the actual save error is already the message the admin sees.
  // Mirrors deleteCategoryImage().
  // ------------------------------------------------------------------
  async function deletePromotionImage(path) {
    if (!path || !window.supabaseClient) return;
    try {
      const { error } = await window.supabaseClient
        .storage
        .from(PROMOTION_BUCKET)
        .remove([path]);
      if (error) throw error;
    } catch (cleanupErr) {
      console.error('Impossible de supprimer le fichier orphelin "' + path + '" :', cleanupErr);
    }
  }

  // ------------------------------------------------------------------
  // Recover the storage path from a public URL (e.g. to delete the old
  // image after a successful replace). Returns null if the URL doesn't
  // look like it came from this bucket. Mirrors
  // getStoragePathFromPublicUrl() in categories.js/products.js.
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
  function setPromotionSaving(isSaving) {
    isSavingPromotion = isSaving;
    if (!promoSaveBtn) return;
    promoSaveBtn.disabled = isSaving;
    if (promoSaveBtnText) promoSaveBtnText.style.display = isSaving ? 'none' : 'inline';
    if (promoSaveBtnLoader) promoSaveBtnLoader.style.display = isSaving ? 'inline-block' : 'none';
  }

  // ------------------------------------------------------------------
  // Reset the modal back to a blank "Add" state — mirrors
  // resetCategoryForm(). Reused by the "+ Ajouter" button, after a
  // successful save (Create or Edit), and as the first step of
  // populatePromotionForm() before filling in Edit values.
  // ------------------------------------------------------------------
  function resetPromotionForm() {
    if (promoForm) promoForm.reset();
    if (promoFormIdInput) promoFormIdInput.value = '';
    if (promoImageUrlHidden) promoImageUrlHidden.value = '';
    if (promoImagePreview) {
      promoImagePreview.removeAttribute('src');
      promoImagePreview.style.display = 'none';
    }
    if (promoActiveInput) promoActiveInput.checked = true;
    pendingPromotionImageFile = null;
    clearFieldErrors();
    hideFormError();

    const titleEl = document.getElementById('promoModalTitle');
    if (titleEl) titleEl.textContent = 'Ajouter une promotion';
  }

  // ------------------------------------------------------------------
  // STEP 3: Edit Promotion — fill the (already reset) form with the
  // promotion's current values, loaded fresh from Supabase.
  // ------------------------------------------------------------------
  function populatePromotionForm(promo) {
    resetPromotionForm();

    if (promoFormIdInput) promoFormIdInput.value = promo.id;
    if (promoTitleFRInput) promoTitleFRInput.value = promo.title_fr || '';
    if (promoTitleARInput) promoTitleARInput.value = promo.title_ar || '';
    if (promoDescFRInput) promoDescFRInput.value = promo.description_fr || '';
    if (promoDescARInput) promoDescARInput.value = promo.description_ar || '';
    if (promoStartInput) promoStartInput.value = promo.start_date || '';
    if (promoEndInput) promoEndInput.value = promo.end_date || '';
    if (promoActiveInput) promoActiveInput.checked = !!promo.is_active;

    // Keep the current image URL internally (used by handlePromotionSubmit
    // if the admin doesn't pick a replacement file) and show its preview.
    if (promoImageUrlHidden) promoImageUrlHidden.value = promo.image_url || '';
    if (promo.image_url && promoImagePreview) {
      promoImagePreview.src = promo.image_url;
      promoImagePreview.style.display = 'block';
    }

    const titleEl = document.getElementById('promoModalTitle');
    if (titleEl) titleEl.textContent = 'Modifier la promotion';
  }

  // ------------------------------------------------------------------
  // STEP 3: Edit Promotion — Edit button click handler. Loads the
  // selected promotion fresh from Supabase (never the local table row
  // or any demo data), then opens the existing Add/Edit modal (via the
  // existing shared openModal helper) already populated.
  // ------------------------------------------------------------------
  async function handleEditPromotionClick(id) {
    if (!window.supabaseClient) {
      showPromotionActionNotification('Configuration Supabase manquante. Impossible de charger la promotion.', 'error');
      return;
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('promotions')
        .select('id, title_fr, title_ar, description_fr, description_ar, image_url, start_date, end_date, is_active')
        .eq('id', id)
        .single();

      if (error) throw error;

      populatePromotionForm(data);

      if (typeof window.openModal === 'function') {
        window.openModal('promoModal');
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la promotion à modifier :', err);
      showPromotionActionNotification('Impossible de charger cette promotion pour modification.', 'error');
    }
  }

  // ====================================================================
  // STEP 4: Delete Promotion
  // ====================================================================
  // Called from admin.js's existing #confirmDelete click handler (see
  // the 'promotion' case there, which delegates to this function — the
  // same dispatch pattern already used for 'category'/'product').
  //
  // Sequence:
  //   1. Look up the promotion's image_url first (needed before
  //      deletion, since the row won't be queryable afterward). If this
  //      lookup fails, proceed with the delete anyway — image cleanup
  //      is simply skipped, mirroring deleteCategory()'s approach.
  //   2. Delete the row from public.promotions. No table in
  //      01_schema.sql declares a foreign key referencing
  //      promotions.id, so there's no cascade and no restrictive
  //      constraint that could apply here — unlike categories/products,
  //      which are referenced by product_categories, promotions is not
  //      a parent of anything.
  //      - On any delete error, stop here: no image deleted, no table
  //        reload, just a friendly notification and a full console.error.
  //   3. Only after the delete succeeds: remove the image file (if any)
  //      via the existing deletePromotionImage() helper — best-effort,
  //      already fail-safe (logs but never throws), never blocks step 4,
  //      and never causes a successful deletion to be reported as failed.
  //   4. Reload the table via the existing loadPromotions().
  //   5. Show the existing success notification.
  // ------------------------------------------------------------------
  async function deletePromotion(id) {
    if (!window.supabaseClient) {
      showPromotionActionNotification('Configuration Supabase manquante. Impossible de supprimer la promotion.', 'error');
      return;
    }

    if (isDeletingPromotion) return; // guard against duplicate/overlapping delete calls
    isDeletingPromotion = true;

    try {
      // Step 1: grab the image URL (if any) before the row is gone.
      let imageUrl = null;
      try {
        const { data, error } = await window.supabaseClient
          .from('promotions')
          .select('image_url')
          .eq('id', id)
          .single();
        if (!error && data) imageUrl = data.image_url;
      } catch (lookupErr) {
        console.error("Impossible de récupérer l'image de la promotion avant suppression :", lookupErr);
        // Not fatal — proceed with the delete anyway; image cleanup will
        // simply be skipped if we don't know the URL.
      }

      // Step 2: delete the row.
      const { error: deleteError } = await window.supabaseClient
        .from('promotions')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Erreur lors de la suppression de la promotion :', deleteError);
        showPromotionActionNotification('Une erreur est survenue lors de la suppression de la promotion.', 'error');
        return; // No image deletion, no reload, no success notification.
      }

      // Step 3: delete succeeded — clean up the image, best-effort. A
      // cleanup failure here is logged but must NOT be reported as an
      // overall failure, since the database deletion already succeeded.
      if (imageUrl) {
        const path = getStoragePathFromPublicUrl(imageUrl, PROMOTION_BUCKET);
        if (path) {
          await deletePromotionImage(path);
        }
      }

      // Step 4 + 5: refresh the table and confirm success.
      await loadPromotions();
      showPromotionActionNotification('✅ Promotion supprimée avec succès.', 'success');
    } finally {
      isDeletingPromotion = false;
    }
  }

  // ------------------------------------------------------------------
  // Unified Create/Edit submit handler. Which path runs is decided by
  // whether #promoFormId has a value — mirrors handleCategorySubmit()
  // exactly (single-table update, no junction rows, so no rollback
  // machinery is needed the way Products' multi-table edit requires).
  //
  // CREATE (promoFormId empty):
  //   1. Upload image (if any).
  //   2. Insert the row.
  //   Rollback: image uploaded but insert fails -> delete the image.
  //
  // EDIT (promoFormId has a UUID):
  //   1. Upload the replacement image, if any (existing image_url is
  //      kept untouched otherwise — no upload, no delete).
  //   2. Update the row.
  //   3. Only once the update has succeeded, delete the OLD image from
  //      Storage (best-effort — a cleanup failure here does NOT undo
  //      the already-successful update, and is only logged).
  //   Rollback: new image uploaded but the update fails -> delete the
  //   new image only. The old image and the old row are untouched.
  // ------------------------------------------------------------------
  async function handlePromotionSubmit(e) {
    e.preventDefault();

    // Guard against duplicate submissions (double-click, double-tap, etc.)
    if (isSavingPromotion) return;

    hideFormError();

    if (!validatePromotionForm()) return;

    if (!window.supabaseClient) {
      showFormError("Configuration Supabase manquante. Impossible d'enregistrer la promotion.");
      return;
    }

    const promotionId = promoFormIdInput ? promoFormIdInput.value : '';
    const isEditing = !!promotionId;
    const oldImageUrl = promoImageUrlHidden ? promoImageUrlHidden.value : '';

    setPromotionSaving(true);

    let uploadedImagePath = null; // set only once the upload itself has succeeded

    try {
      // Case "no new file selected": keep whichever URL is already in
      // the hidden input — empty on Create, the existing image_url on
      // Edit. Case "new file selected": upload it and use its URL.
      let imageUrl = promoImageUrlHidden ? promoImageUrlHidden.value || null : null;
      if (pendingPromotionImageFile) {
        const uploadResult = await uploadPromotionImage(pendingPromotionImageFile);
        uploadedImagePath = uploadResult.path;
        imageUrl = uploadResult.publicUrl;
      }

      const payload = {
        title_fr: promoTitleFRInput.value.trim(),
        title_ar: promoTitleARInput.value.trim() || null,
        description_fr: promoDescFRInput.value.trim() || null,
        description_ar: promoDescARInput.value.trim() || null,
        image_url: imageUrl,
        start_date: promoStartInput.value || null,
        end_date: promoEndInput.value || null,
        is_active: promoActiveInput.checked,
      };

      let saveError;
      if (isEditing) {
        ({ error: saveError } = await window.supabaseClient
          .from('promotions')
          .update(payload)
          .eq('id', promotionId));
      } else {
        ({ error: saveError } = await window.supabaseClient
          .from('promotions')
          .insert(payload));
      }

      if (saveError) throw saveError;

      // Update/insert succeeded. If this was an edit and a new image
      // replaced an existing one, remove the old file now so it
      // doesn't linger as an orphan. Best-effort: deletePromotionImage()
      // only logs on failure, it never throws, so this can never fail
      // the save that already succeeded in the database.
      if (isEditing && pendingPromotionImageFile && oldImageUrl) {
        const oldPath = getStoragePathFromPublicUrl(oldImageUrl, PROMOTION_BUCKET);
        if (oldPath) {
          await deletePromotionImage(oldPath);
        }
      }

      // Success — refresh, close, reset, notify. loadPromotions() is
      // the SAME function Step 1 uses, so the table is guaranteed to
      // reflect the real Supabase state, never the old demo array.
      if (typeof window.closeModal === 'function') {
        window.closeModal('promoModal');
      }
      resetPromotionForm();
      await loadPromotions();
      showPromotionActionNotification(
        isEditing ? '✅ Promotion mise à jour avec succès.' : '✅ Promotion créée avec succès.',
        'success'
      );
    } catch (err) {
      console.error(
        (isEditing ? 'Erreur lors de la mise à jour de la promotion :' : 'Erreur lors de la création de la promotion :'),
        err
      );

      // The image upload succeeded but the save failed (insert or
      // update) — remove the now-orphaned file from Storage so it
      // doesn't accumulate. On Edit, the OLD image is never touched in
      // this failure branch — only the newly uploaded replacement is
      // cleaned up, and the database row remains exactly as it was.
      if (uploadedImagePath) {
        await deletePromotionImage(uploadedImagePath);
      }

      showFormError("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setPromotionSaving(false);
    }
  }

  // ------------------------------------------------------------------
  // Wire up the form + the "+ Ajouter" button.
  // NOTE: setupPromotionForm() must run first — it assigns
  // promoImageFileInput (and the other modal refs). The image-preview
  // setup depends on promoImageFileInput already being set, otherwise
  // it exits early and the file input's change listener never gets
  // attached — same ordering rule established in categories.js.
  // ------------------------------------------------------------------
  function setupPromotionForm() {
    promoForm = document.getElementById('promoForm');
    promoFormError = document.getElementById('promoFormError');
    promoFormIdInput = document.getElementById('promoFormId');
    promoTitleFRInput = document.getElementById('promoTitleFR');
    promoTitleFRError = document.getElementById('promoTitleFRError');
    promoTitleARInput = document.getElementById('promoTitleAR');
    promoDescFRInput = document.getElementById('promoDescFR');
    promoDescARInput = document.getElementById('promoDescAR');
    promoImageFileInput = document.getElementById('promoImageFile');
    promoImagePreview = document.getElementById('promoImagePreview');
    promoImageUrlHidden = document.getElementById('promoImageUrl');
    promoImageError = document.getElementById('promoImageError');
    promoStartInput = document.getElementById('promoStart');
    promoEndInput = document.getElementById('promoEnd');
    promoDatesError = document.getElementById('promoDatesError');
    promoActiveInput = document.getElementById('promoActive');
    promoSaveBtn = document.getElementById('promoSaveBtn');
    promoSaveBtnText = document.getElementById('promoSaveBtnText');
    promoSaveBtnLoader = document.getElementById('promoSaveBtnLoader');
    promotionActionNotificationEl = document.getElementById('promotionsActionNotification');

    if (!promoForm) {
      console.error('PromotionsModule: #promoForm introuvable.');
      return;
    }

    promoForm.addEventListener('submit', handlePromotionSubmit);

    // Make sure "+ Ajouter" always opens a clean form, even if a
    // previous attempt was left filled in or failed.
    const addBtn = promotionsSection.querySelector('.add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', resetPromotionForm);
    }
  }

  // ------------------------------------------------------------------
  // Step 5: escape ilike wildcard characters and quote the value so a
  // search term containing %, _, \, or a comma/parenthesis is treated
  // literally and can't break PostgREST's .or() filter syntax. Mirrors
  // buildCategorySearchFilter()/buildProductSearchFilter(). Only
  // title_fr/title_ar are searched — the real identity text columns on
  // public.promotions (see 01_schema.sql); description_fr/description_ar
  // exist but aren't identity fields, so they're excluded, matching how
  // Products searches name_fr/name_ar/brand rather than its description
  // columns.
  // ------------------------------------------------------------------
  function buildPromotionSearchFilter(term) {
    const escaped = term.replace(/[\\%_]/g, '\\$&');
    return 'title_fr.ilike."%' + escaped + '%",title_ar.ilike."%' + escaped + '%"';
  }

  // ------------------------------------------------------------------
  // Load promotions from Supabase. searchTerm and statusFilter are both
  // optional — every CRUD-reload call site (init(), the sidebar reload,
  // and every Create/Edit/Delete success path) calls this with no
  // arguments, which behaves exactly as it always has (no filter, full
  // list, newest first). Step 5 adds a server-side ilike filter on
  // title_fr/title_ar when a non-empty trimmed searchTerm is passed, and
  // a server-side filter on the real is_active column (backed by the
  // existing idx_promotions_active partial index) when statusFilter is
  // 'active' or 'inactive'; both conditions apply together (AND) when
  // both are present. There is no trigram index on title_fr/title_ar
  // for promotions (unlike products' name_fr/brand), so ilike here runs
  // as a sequential scan rather than an index scan — the same
  // pre-existing situation categories.js's search already has; adding
  // an index is a schema change and out of scope for this step.
  // ------------------------------------------------------------------
  async function loadPromotions(searchTerm, statusFilter) {
    if (!window.supabaseClient) {
      showError('Configuration Supabase manquante. Impossible de charger les promotions.');
      console.error('PromotionsModule: window.supabaseClient introuvable. Vérifiez que js/supabase-client.js est chargé avant js/promotions.js.');
      return;
    }

    const requestId = ++promotionLoadRequestId;

    hideError();
    showLoading(true);

    try {
      let query = window.supabaseClient
        .from('promotions')
        .select('id, title_fr, title_ar, image_url, start_date, end_date, is_active');

      const trimmedTerm = (searchTerm || '').trim();
      if (trimmedTerm) {
        query = query.or(buildPromotionSearchFilter(trimmedTerm));
      }

      const trimmedStatus = (statusFilter || '').trim();
      if (trimmedStatus === 'active') {
        query = query.eq('is_active', true);
      } else if (trimmedStatus === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      // A newer loadPromotions() call has started since this one was
      // sent (e.g. the user kept typing, or changed the filter). Its
      // own response will render instead, so this older one is dropped
      // silently — success or error alike.
      if (requestId !== promotionLoadRequestId) return;

      if (error) throw error;

      renderRows(data);
      hasLoadedOnce = true;
    } catch (err) {
      if (requestId !== promotionLoadRequestId) return; // stale — newer call already handled the UI

      console.error('Erreur lors du chargement des promotions :', err);
      tableBody.innerHTML = '';
      showError('Impossible de charger les promotions. Vérifiez votre connexion et réessayez.');
    } finally {
      if (requestId === promotionLoadRequestId) {
        showLoading(false);
      }
    }
  }

  // ------------------------------------------------------------------
  // Step 5: reads the current search input value and the current status
  // filter value together and issues a single combined loadPromotions()
  // call. Used by both the search debounce callback and the filter's
  // change handler, so a search-in-progress and a filter change can
  // never overwrite each other's condition. Mirrors
  // triggerProductsReload() in products.js.
  // ------------------------------------------------------------------
  function triggerPromotionsReload() {
    const searchValue = promotionSearchInput ? promotionSearchInput.value : '';
    const statusValue = promotionStatusFilterSelect ? promotionStatusFilterSelect.value : 'all';
    loadPromotions(searchValue, statusValue);
  }

  // ------------------------------------------------------------------
  // Step 5: Promotion Search — debounced ~300ms. Every keystroke
  // cancels the previous timer (clearTimeout) and schedules a new one;
  // only a pause of ~300ms without further typing actually triggers a
  // query, via triggerPromotionsReload(). An empty/whitespace-only
  // value naturally reloads the full (filter-respecting) list, since
  // loadPromotions() only applies the search condition when the
  // trimmed term is non-empty. Mirrors setupProductSearch().
  // ------------------------------------------------------------------
  function setupPromotionSearch() {
    promotionSearchInput = document.getElementById('promotionSearch');
    if (!promotionSearchInput) return;

    promotionSearchInput.addEventListener('input', function () {
      clearTimeout(promotionSearchDebounceTimer);
      promotionSearchDebounceTimer = setTimeout(function () {
        triggerPromotionsReload();
      }, 300);
    });
  }

  // ------------------------------------------------------------------
  // Step 5: Promotion Filters — wire the status filter's change event.
  // A filter change applies immediately (no debounce needed for a
  // <select>), and cancels any pending debounced search so the two
  // never race — the combined search+filter query fires right away via
  // the shared triggerPromotionsReload() helper. Mirrors
  // setupProductCategoryFilter().
  // ------------------------------------------------------------------
  function setupPromotionStatusFilter() {
    promotionStatusFilterSelect = document.getElementById('promotionStatusFilter');
    if (!promotionStatusFilterSelect) return;

    promotionStatusFilterSelect.addEventListener('change', function () {
      clearTimeout(promotionSearchDebounceTimer);
      triggerPromotionsReload();
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;

    tableBody = document.querySelector('#promotionsTable tbody');
    tableWrapper = promotionsSection.querySelector('.table-responsive');
    loadingEl = document.getElementById('promotionsLoading');
    errorEl = document.getElementById('promotionsError');

    if (!tableBody) {
      console.error('PromotionsModule: #promotionsTable tbody introuvable.');
      return;
    }

    // Load once immediately so data is ready the first time the
    // section is shown, and reload every time the Promotions tab is
    // opened — same pattern as CategoriesModule/ProductsModule.
    loadPromotions();

    const promotionsLink = document.querySelector('.sidebar-link[data-section="promotions"]');
    if (promotionsLink) {
      promotionsLink.addEventListener('click', function () {
        loadPromotions();
      });
    }

    // Step 2: Create Promotion
    setupPromotionForm();
    setupPromotionImagePreview();

    // Step 5: Search & Filters
    setupPromotionSearch();
    setupPromotionStatusFilter();
  }

  // Expose a minimal public API — admin.js only calls init(). editProduct-
  // style routing: editPromotion is called directly from the row
  // button's onclick (see renderRows); deletePromotion is called from
  // admin.js's generic #confirmDelete handler's 'promotion' case — same
  // pattern used by CategoriesModule/ProductsModule. No
  // viewPromotion exposed yet: that doesn't exist until its own future
  // step.
  window.PromotionsModule = {
    init: init,
    reload: loadPromotions, // handy for manual testing from the console
    editPromotion: handleEditPromotionClick,
    deletePromotion: deletePromotion,
  };
})();
