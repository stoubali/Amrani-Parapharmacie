// ====================================================================
// js/settings.js — Admin Settings Module (Amrani Parapharmacie)
// ====================================================================
// Connects ONLY the "Paramètres" (Settings) section of admin_panel.html
// to Supabase. Does not touch Products / Categories / Promotions /
// Messages — those stay exactly as they are.
//
// Requires (loaded before this file, in this order):
//   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
//   2. js/supabase-client.js   (creates window.supabaseClient)
//
// Table: public.settings (single row — see 01_schema.sql)
// Bucket: "logos" (see 03_storage.sql) — used for logo, hero image,
//         AND favicon, each stored in its own sub-folder:
//         logos/logo/, logos/hero/, logos/favicon/
// ====================================================================

(function () {
  'use strict';

  // Only run this module on pages that actually have the settings section
  const settingsSection = document.getElementById('section-settings');
  if (!settingsSection) return;

  const BUCKET_NAME = 'logos';

  // ------------------------------------------------------------------
  // Field maps: HTML input id  ->  settings table column
  // ------------------------------------------------------------------
  const TEXT_FIELDS = {
    settingsPharmacyName: 'pharmacy_name',
    settingsHeroTitleFR: 'hero_title_fr',
    settingsHeroTitleAR: 'hero_title_ar',
    settingsHeroDescFR: 'hero_description_fr',
    settingsHeroDescAR: 'hero_description_ar',
    settingsAboutFR: 'about_fr',
    settingsAboutAR: 'about_ar',
    settingsPhone: 'phone',
    settingsWhatsApp: 'whatsapp',
    settingsEmail: 'email',
    settingsAddress: 'address',
    settingsGoogleMaps: 'google_maps_url',
    settingsInstagram: 'instagram',
    settingsHours: 'opening_hours',
    settingsSeoDesc: 'seo_description',
  };

  // image field config: input(file) / preview(img) / hidden(current url) / db column / storage folder
  const IMAGE_FIELDS = {
    logo: {
      inputId: 'settingsLogo',
      previewId: 'settingsLogoPreview',
      hiddenId: 'settingsLogoUrl',
      column: 'logo_url',
      folder: 'logo',
    },
    heroImage: {
      inputId: 'settingsHeroImage',
      previewId: 'settingsHeroImagePreview',
      hiddenId: 'settingsHeroImageUrl',
      column: 'hero_image_url',
      folder: 'hero',
    },
    favicon: {
      inputId: 'settingsFavicon',
      previewId: 'settingsFaviconPreview',
      hiddenId: 'settingsFaviconUrl',
      column: 'favicon_url',
      folder: 'favicon',
    },
  };

  // Holds File objects the admin picked but hasn't saved yet
  const pendingFiles = { logo: null, heroImage: null, favicon: null };

  // Row id of the single settings record (fetched on load, needed for update)
  let settingsRowId = null;

  // ------------------------------------------------------------------
  // Small DOM helpers
  // ------------------------------------------------------------------
  const qs = (id) => document.getElementById(id);

  function showNotification(message, type) {
    const el = qs('settingsNotification');
    if (!el) {
      // Fallback if the notification element hasn't been added to the HTML
      window.alert(message);
      return;
    }
    el.textContent = message;
    el.className = 'settings-notification settings-notification-' + (type || 'info') + ' visible';
    el.style.display = 'block';
    clearTimeout(showNotification._t);
    showNotification._t = setTimeout(() => {
      el.style.display = 'none';
    }, 4000);
  }

  function setInitialLoading(isLoading) {
    const loader = qs('settingsLoading');
    const form = qs('settingsForm');
    if (loader) loader.style.display = isLoading ? 'block' : 'none';
    if (form) form.style.opacity = isLoading ? '0.5' : '1';
    if (form) {
      Array.from(form.elements).forEach((el) => (el.disabled = isLoading));
    }
  }

  function setSaveLoading(isLoading) {
    const btn = qs('settingsSaveBtn');
    const text = qs('settingsSaveBtnText');
    const loader = qs('settingsSaveBtnLoader');
    if (!btn) return;
    btn.disabled = isLoading;
    if (text) text.style.display = isLoading ? 'none' : 'inline';
    if (loader) loader.style.display = isLoading ? 'inline-block' : 'none';
  }

  // ------------------------------------------------------------------
  // Populate the form with a settings row fetched from Supabase
  // ------------------------------------------------------------------
  function populateForm(row) {
    // Plain text / textarea fields
    Object.entries(TEXT_FIELDS).forEach(([inputId, column]) => {
      const el = qs(inputId);
      if (el) el.value = row[column] || '';
    });

    // Image fields: set hidden "current url" input + show preview if a URL exists
    Object.values(IMAGE_FIELDS).forEach((cfg) => {
      const url = row[cfg.column] || '';
      const hidden = qs(cfg.hiddenId);
      const preview = qs(cfg.previewId);
      if (hidden) hidden.value = url;
      if (preview) {
        if (url) {
          preview.src = url;
          preview.style.display = 'block';
        } else {
          preview.removeAttribute('src');
          preview.style.display = 'none';
        }
      }
    });
  }

  // ------------------------------------------------------------------
  // Load settings (single row) from Supabase
  // ------------------------------------------------------------------
  async function loadSettings() {
    setInitialLoading(true);
    try {
      const { data, error } = await window.supabaseClient
        .from('settings')
        .select('*')
        .single();

      if (error) throw error;

      settingsRowId = data.id;
      populateForm(data);
    } catch (err) {
      console.error('Erreur lors du chargement des paramètres :', err);
      showNotification("Impossible de charger les paramètres. Vérifiez votre connexion.", 'error');
    } finally {
      setInitialLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Live preview when an admin picks a new image file (before saving)
  // ------------------------------------------------------------------
  function setupImagePreviews() {
    Object.entries(IMAGE_FIELDS).forEach(([key, cfg]) => {
      const input = qs(cfg.inputId);
      const preview = qs(cfg.previewId);
      if (!input) return;

      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          showNotification('Veuillez sélectionner un fichier image valide.', 'error');
          input.value = '';
          return;
        }

        pendingFiles[key] = file;

        if (preview) {
          const reader = new FileReader();
          reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // Single reusable uploader used by logo, hero image, and favicon.
  // Uploads into a sub-folder of the "logos" bucket:
  //   logos/logo/...     logos/hero/...     logos/favicon/...
  // Returns the file's public URL.
  // ------------------------------------------------------------------
  async function uploadImage(file, folder) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${folder}/${Date.now()}.${ext}`;

    const { error: uploadError } = await window.supabaseClient
      .storage
      .from(BUCKET_NAME)
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) throw uploadError;

    const { data } = window.supabaseClient
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // ------------------------------------------------------------------
  // Upload any newly-picked images, returning { column: url, ... }
  // Falls back to the existing (hidden input) URL if nothing new picked.
  // ------------------------------------------------------------------
  async function resolveImageUrls() {
    const result = {};

    for (const [key, cfg] of Object.entries(IMAGE_FIELDS)) {
      const hidden = qs(cfg.hiddenId);
      let url = hidden ? hidden.value : '';

      const file = pendingFiles[key];
      if (file) {
        url = await uploadImage(file, cfg.folder);
      }

      result[cfg.column] = url || null;
    }

    return result;
  }

  // ------------------------------------------------------------------
  // Save handler
  // ------------------------------------------------------------------
  async function saveSettings(e) {
    e.preventDefault();
    if (!settingsRowId) {
      showNotification("Paramètres non chargés, réessayez.", 'error');
      return;
    }

    setSaveLoading(true);
    try {
      // 1. Upload any newly selected images first
      const imageUrls = await resolveImageUrls();

      // 2. Build the text-field payload
      const payload = {};
      Object.entries(TEXT_FIELDS).forEach(([inputId, column]) => {
        const el = qs(inputId);
        payload[column] = el ? el.value.trim() || null : null;
      });

      // 3. Merge image URLs
      Object.assign(payload, imageUrls);

      // 4. Update the single settings row
      const { error } = await window.supabaseClient
        .from('settings')
        .update(payload)
        .eq('id', settingsRowId);

      if (error) throw error;

      // Reset pending file state — the URLs are now persisted
      pendingFiles.logo = null;
      pendingFiles.heroImage = null;
      pendingFiles.favicon = null;

      // Sync hidden "current url" inputs with what we just saved
      Object.values(IMAGE_FIELDS).forEach((cfg) => {
        const hidden = qs(cfg.hiddenId);
        if (hidden) hidden.value = payload[cfg.column] || '';
      });

      showNotification('✅ Paramètres enregistrés avec succès.', 'success');
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement des paramètres :', err);
      showNotification("Une erreur est survenue lors de l'enregistrement.", 'error');
    } finally {
      setSaveLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Reset button: reload from Supabase instead of blanking the form
  // ------------------------------------------------------------------
  function setupResetButton() {
    const form = qs('settingsForm');
    if (!form) return;
    const resetBtn = form.querySelector('button[type="reset"]');
    if (!resetBtn) return;

    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      pendingFiles.logo = null;
      pendingFiles.heroImage = null;
      pendingFiles.favicon = null;
      loadSettings();
    });
  }

  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------
  function init() {
    if (!window.supabaseClient) {
      console.error('supabaseClient introuvable. Vérifiez que js/supabase-client.js est chargé avant js/settings.js.');
      showNotification('Configuration Supabase manquante.', 'error');
      return;
    }

    const form = qs('settingsForm');
    if (form) form.addEventListener('submit', saveSettings);

    setupImagePreviews();
    setupResetButton();
    loadSettings();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
