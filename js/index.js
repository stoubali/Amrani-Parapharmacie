// ====================================================
// JS/index.js — Amrani Parapharmacie (Landing Page)
// ====================================================
// STEP 1 (Public Website): Settings, Categories, and Promotions are now
// loaded from Supabase (public anon client — see js/supabase-client.js).
// Existing design/markup is untouched; only real data is wired into the
// existing elements/IDs. Products stays on sample data — the Public
// Products page is a later, separate step (out of scope here).
//
// STEP 6 ADDITION: the existing #contactForm now inserts real rows into
// public.messages via the existing anon window.supabaseClient, instead
// of the old alert()-based simulation. Only setupContactForm() changed;
// every other function in this file (Settings/Categories/Promotions
// loading, navigation, back-to-top, animations) is untouched. See the
// STEP 6 comment block above setupContactForm() below for full details.
//
// Requires (loaded before this file, in index.html, in this order):
//   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
//   2. js/supabase-client.js   (creates window.supabaseClient)
//
// Table: public.settings (single row) — see 01_schema.sql. Only the
//   columns actually used below are read; no field is invented.
// Table: public.categories (id, name_fr, name_ar, image_url) — no
//   visibility/active column exists in 01_schema.sql, so every category
//   row is public and is loaded (ordered by name_fr, same as the admin).
// Table: public.promotions (id, title_fr, title_ar, description_fr,
//   description_ar, image_url, start_date, end_date, is_active) — a
//   promotion is shown only when is_active = true AND today falls
//   inside [start_date, end_date], with null bounds treated as
//   unbounded (mirrors the schema's own
//   "end_date is null or start_date is null or end_date >= start_date"
//   check constraint semantics).
// Table: public.messages (id [default], name [not null], email [not
//   null], phone [nullable], message [not null], is_read [default
//   false], created_at [default now()]) — see 01_schema.sql. Step 6
//   inserts ONLY name/email/phone/message; id/is_read/created_at are
//   left to their database defaults, exactly as every other Create flow
//   in this project (Categories/Products/Promotions) already does for
//   its own defaulted columns.
// ====================================================

// ---------- SAMPLE DATA (Produits en vedette — out of scope for this
// step; the Public Products page is implemented in a later step) ----------
const sampleProducts = [
  { id: 1, name: 'Crème Hydratante', brand: 'La Roche-Posay', price: '24,90 €', available: true, icon: 'cream' },
  { id: 2, name: 'Vitamine C + Zinc', brand: 'Nutri&Co', price: '18,50 €', available: true, icon: 'vitamin' },
  { id: 3, name: 'Shampoing Douceur', brand: 'Klorane', price: '12,30 €', available: false, icon: 'shampoo' },
  { id: 4, name: 'Baume Lèvres', brand: 'Nuxe', price: '8,90 €', available: true, icon: 'lip' },
  { id: 5, name: 'Huile de Douche', brand: 'Dermophil', price: '14,20 €', available: true, icon: 'oil' },
];

// ---------- SVG ICON MAP ----------
const iconMap = {
  face: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="8" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><path d="M9 15c.83.83 2 1.5 3 1.5s2.17-.67 3-1.5"/></svg>`,
  baby: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/><path d="M8 16c1.6 1.6 3.5 2 5 2s3.4-.4 5-2"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>`,
  pill: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4a4 4 0 0 0 0 8h8a4 4 0 0 0 0-8H8z"/><path d="M8 12a4 4 0 0 0 0 8h8a4 4 0 0 0 0-8H8z"/><path d="M12 8v8"/><path d="M8 16h8"/></svg>`,
  soap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10a6 6 0 0 1 12 0v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8z"/><path d="M8 6a4 4 0 0 1 8 0"/><circle cx="12" cy="15" r="1.5"/><circle cx="12" cy="12" r="1"/></svg>`,
  hair: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/><path d="M12 4v16"/><path d="M4 12h16"/><path d="M8 6c1.6 1.6 2.5 3.2 2.5 6"/></svg>`,
  body: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3"/><path d="M8 12c1.6 1.6 2 3 2 5v4h4v-4c0-2 .4-3.4 2-5"/><path d="M8 14c-2.6 0-4 1.6-4 4v2h4"/><path d="M16 14c2.6 0 4 1.6 4 4v2h-4"/></svg>`,
  cream: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16"/><path d="M12 4a8 8 0 0 0 0 16"/><path d="M8 8l8 8"/><path d="M16 8l-8 8"/></svg>`,
  vitamin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8a6 6 0 0 1 6 6 6 6 0 0 1-6 6 6 6 0 0 1-6-6 6 6 0 0 1 6-6z"/><path d="M12 2v6"/><path d="M12 20v2"/><path d="M4 12H2"/><path d="M22 12h-2"/></svg>`,
  shampoo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0V6z"/><path d="M10 6v2"/><path d="M14 6v2"/><path d="M8 16a4 4 0 0 0 8 0"/><path d="M6 8h12"/></svg>`,
  lip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6c-2.8 0-5 2.2-5 5v2c0 2.8 2.2 5 5 5s5-2.2 5-5v-2c0-2.8-2.2-5-5-5z"/><path d="M8 13c0 2.2 1.8 4 4 4s4-1.8 4-4"/><path d="M8 13h8"/></svg>`,
  oil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a6 6 0 0 0-6 6c0 4 6 12 6 12s6-8 6-12a6 6 0 0 0-6-6z"/><circle cx="12" cy="8" r="2"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
};

function getIcon(name) {
  return iconMap[name] || iconMap['pill'];
}

// ---------- SMALL DOM HELPER ----------
// Mirrors the escapeHtml() helper already used by categories.js/
// products.js/promotions.js — same XSS-safe pattern for any text
// pulled from Supabase before it's dropped into innerHTML.
function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

// ---------- RENDER FUNCTIONS ----------

// ------------------------------------------------------------------
// Categories — loaded from public.categories (id, name_fr, name_ar,
// image_url). No visibility/active column exists on this table in
// 01_schema.sql, so every category is public; ordered by name_fr for a
// stable, predictable display order. A category's own image_url is
// used when present; otherwise the existing "pill" icon is reused as a
// neutral fallback (categories have no dedicated "icon" field, unlike
// the old sample data). name_ar is not shown — the existing card design
// only has a single name line (<h4>), so the design is left unchanged.
// ------------------------------------------------------------------
async function loadCategories() {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;

  if (!window.supabaseClient) {
    console.error('index.js: window.supabaseClient introuvable. Vérifiez que js/supabase-client.js est chargé avant js/index.js.');
    return; // Leave the grid as-is — no broken cards, no crash.
  }

  try {
    const { data, error } = await window.supabaseClient
      .from('categories')
      .select('id, name_fr, name_ar, image_url')
      .order('name_fr', { ascending: true });

    if (error) throw error;

    grid.innerHTML = (data || []).map(cat => `
      <div class="category-card">
        <div class="cat-icon">${cat.image_url
          ? `<img src="${escapeHtml(cat.image_url)}" alt="${escapeHtml(cat.name_fr || '')}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
          : getIcon('pill')}</div>
        <h4>${escapeHtml(cat.name_fr || '-')}</h4>
      </div>
    `).join('');

    // Cards were just injected after the page's initial animation setup
    // ran, so they need their own fade-in pass — see setupAnimations().
    setupAnimations('.category-card');
  } catch (err) {
    console.error('Erreur lors du chargement des catégories :', err);
    // Static page stays fully usable; the grid is simply left empty
    // rather than showing broken/fake cards.
  }
}

// ------------------------------------------------------------------
// Promotions — loaded from public.promotions. Visibility mirrors the
// admin's own documented rule (see js/promotions.js): is_active = true
// AND today falls inside [start_date, end_date], where a null bound is
// unbounded — the same semantics as the schema's own check constraint
// (end_date is null or start_date is null or end_date >= start_date).
// title_fr/description_fr are shown, matching the existing card design
// (single title + single description line); image_url replaces the
// decorative icon when present.
// ------------------------------------------------------------------
async function loadPromotions() {
  const grid = document.getElementById('promoGrid');
  if (!grid) return;

  if (!window.supabaseClient) {
    console.error('index.js: window.supabaseClient introuvable. Vérifiez que js/supabase-client.js est chargé avant js/index.js.');
    return;
  }

  try {
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const { data, error } = await window.supabaseClient
      .from('promotions')
      .select('id, title_fr, title_ar, description_fr, image_url, start_date, end_date, is_active')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('start_date', { ascending: true });

    if (error) throw error;

    grid.innerHTML = (data || []).map(promo => `
      <div class="promo-card">
        <div class="promo-icon">${promo.image_url
          ? `<img src="${escapeHtml(promo.image_url)}" alt="${escapeHtml(promo.title_fr || '')}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
          : getIcon('target')}</div>
        <h4>${escapeHtml(promo.title_fr || '-')}</h4>
        <p>${escapeHtml(promo.description_fr || '')}</p>
      </div>
    `).join('');

    // Same async-render timing fix as loadCategories() — see
    // setupAnimations() for why this second pass is needed.
    setupAnimations('.promo-card');
  } catch (err) {
    console.error('Erreur lors du chargement des promotions :', err);
    // No active/current promotions, or a failed request — either way the
    // section is simply left empty rather than showing a broken card.
  }
}

// ------------------------------------------------------------------
// Settings (public.settings, singleton row) — connects existing static
// text/links to the real row instead of the hardcoded HTML defaults.
// Every field is optional here: if a column is null/empty, or the
// request fails, the existing hardcoded HTML text is simply left in
// place (never cleared to blank), so the page never looks broken.
// ------------------------------------------------------------------
async function loadSettingsData() {
  if (!window.supabaseClient) {
    console.error('index.js: window.supabaseClient introuvable. Vérifiez que js/supabase-client.js est chargé avant js/index.js.');
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from('settings')
      .select('*')
      .single();

    if (error) throw error;
    if (!data) return;

    // Pharmacy name — both the nav and footer brand labels share the
    // same .brand-name class, so both are updated in one pass without
    // needing two separate ids.
    if (data.pharmacy_name) {
      document.querySelectorAll('.brand-name').forEach((el) => {
        el.textContent = data.pharmacy_name;
      });
    }

    const heroTitleEl = document.getElementById('heroTitle');
    if (heroTitleEl && data.hero_title_fr) heroTitleEl.textContent = data.hero_title_fr;

    const heroDescEl = document.getElementById('heroDescription');
    if (heroDescEl && data.hero_description_fr) heroDescEl.textContent = data.hero_description_fr;

    // Hero image — the existing .hero-image div is a decorative CSS
    // background (gradient + small SVG icons, see style.css). When a
    // real hero_image_url exists, it's swapped in as the background via
    // inline style only, so nothing changes when no image is set.
    const heroImageEl = document.getElementById('heroImage');
    if (heroImageEl && data.hero_image_url) {
      heroImageEl.style.backgroundImage = 'url("' + data.hero_image_url + '")';
      heroImageEl.style.backgroundSize = 'cover';
      heroImageEl.style.backgroundPosition = 'center';
      heroImageEl.style.backgroundRepeat = 'no-repeat';
    }

    const aboutTextEl = document.getElementById('aboutTextFR');
    if (aboutTextEl && data.about_fr) aboutTextEl.textContent = data.about_fr;

    // Contact card values.
    const contactFieldMap = {
      contactPhone: data.phone,
      contactWhatsapp: data.whatsapp,
      contactInstagram: data.instagram,
      contactEmail: data.email,
      contactAddress: data.address,
      contactHours: data.opening_hours,
    };
    Object.entries(contactFieldMap).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el && value) el.textContent = value;
    });

    // Footer social links — point the existing icons at real values
    // instead of the placeholder "#". Left untouched if a field is empty.
    const instagramLinkEl = document.getElementById('footerInstagramLink');
    if (instagramLinkEl && data.instagram) {
      const handle = String(data.instagram).replace(/^@/, '');
      instagramLinkEl.href = 'https://instagram.com/' + encodeURIComponent(handle);
      instagramLinkEl.target = '_blank';
      instagramLinkEl.rel = 'noopener noreferrer';
    }
    const whatsappLinkEl = document.getElementById('footerWhatsappLink');
    if (whatsappLinkEl && data.whatsapp) {
      const digits = String(data.whatsapp).replace(/[^\d]/g, '');
      whatsappLinkEl.href = 'https://wa.me/' + digits;
      whatsappLinkEl.target = '_blank';
      whatsappLinkEl.rel = 'noopener noreferrer';
    }
    const emailLinkEl = document.getElementById('footerEmailLink');
    if (emailLinkEl && data.email) {
      emailLinkEl.href = 'mailto:' + data.email;
    }

    // Favicon — no visual/layout impact when favicon_url is empty (the
    // <link> tag simply keeps no href, same as before this step).
    const faviconEl = document.getElementById('faviconLink');
    if (faviconEl && data.favicon_url) {
      faviconEl.href = data.favicon_url;
    }
  } catch (err) {
    console.error('Erreur lors du chargement des paramètres :', err);
    // All existing hardcoded HTML values remain visible — nothing is
    // cleared or replaced with a broken/blank state on failure.
  }
}

function loadProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  grid.innerHTML = sampleProducts.map(p => `
    <div class="product-card">
      <div class="prod-icon">${getIcon(p.icon)}</div>
      <h4>${p.name}</h4>
      <div class="brand">${p.brand}</div>
      <div class="price">${p.price}</div>
      <span class="badge ${p.available ? 'badge-success' : 'badge-danger'}">
        ${p.available ? 'Disponible' : 'Rupture de stock'}
      </span>
    </div>
  `).join('');
}

// ---------- NAVIGATION (mobile menu + smooth scroll) ----------
function setupNavigation() {
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ====================================================================
// STEP 6: Contact Form → Supabase (public.messages)
// ====================================================================
// Replaces the old alert()-based simulation with a real INSERT into the
// existing public.messages table (01_schema.sql), using ONLY the
// columns that actually exist there: name (not null), email (not
// null), phone (nullable), message (not null). id/is_read/created_at
// are left to their database defaults — never set here, exactly like
// every other Create flow in this project.
//
// Permitted by the existing "messages_public_insert" RLS policy
// (02_rls.sql): `for insert to anon, authenticated with check (true)`.
// The existing anon window.supabaseClient (js/supabase-client.js)
// already satisfies this — no new client, no service-role key, no
// policy change.
//
// Client-side validation is UNCHANGED from before this step (name
// required, email required + format check, message required, phone
// optional) — it already matched the schema's NOT NULL columns exactly,
// so nothing new is invented here.
//
// A guard flag (isSubmittingContactForm) plus disabling the submit
// button for the duration of the request prevents a rapid double-click
// from inserting two rows — same duplicate-submission protection
// pattern already used by every admin Create/Edit form
// (isSavingCategory/isSavingProduct/isSavingPromotion).
// ====================================================================
function setupContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('contactSubmitBtn');
  const notificationEl = document.getElementById('contactFormNotification');

  let isSubmittingContactForm = false; // guards against duplicate/overlapping submissions

  // ------------------------------------------------------------------
  // Notification helper — reuses the EXISTING .settings-notification /
  // .settings-notification-success / .settings-notification-error
  // classes already defined in css/style.css (used by js/settings.js).
  // No new CSS added.
  // ------------------------------------------------------------------
  function showContactNotification(message, type) {
    if (!notificationEl) {
      window.alert(message);
      return;
    }
    notificationEl.textContent = message;
    notificationEl.className = 'settings-notification settings-notification-' + (type || 'info');
    notificationEl.style.display = 'block';
    clearTimeout(showContactNotification._t);
    showContactNotification._t = setTimeout(() => {
      notificationEl.style.display = 'none';
    }, 5000);
  }

  function hideContactNotification() {
    if (notificationEl) notificationEl.style.display = 'none';
  }

  // ------------------------------------------------------------------
  // Submit-button loading state — swaps the label text only (no new
  // spinner markup/CSS), same "disable + relabel" idea already used
  // elsewhere in the project, kept minimal here since the public site
  // has no generic button-loader class to reuse.
  // ------------------------------------------------------------------
  function setContactSubmitLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (isLoading) {
      if (!submitBtn.dataset.originalText) {
        submitBtn.dataset.originalText = submitBtn.textContent;
      }
      submitBtn.textContent = 'Envoi en cours…';
    } else if (submitBtn.dataset.originalText) {
      submitBtn.textContent = submitBtn.dataset.originalText;
    }
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (isSubmittingContactForm) return; // guard against duplicate/overlapping submits

    let isValid = true;

    const name = document.getElementById('name');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const message = document.getElementById('message');
    const nameErr = document.getElementById('nameError');
    const emailErr = document.getElementById('emailError');
    const msgErr = document.getElementById('messageError');

    [nameErr, emailErr, msgErr].forEach(el => el.textContent = '');
    hideContactNotification();

    // Unchanged validation — matches the schema's NOT NULL columns
    // (name, email, message) exactly; phone stays optional (nullable).
    if (!name.value.trim()) {
      nameErr.textContent = 'Nom requis';
      isValid = false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value.trim() || !emailRegex.test(email.value.trim())) {
      emailErr.textContent = 'Email valide requis';
      isValid = false;
    }
    if (!message.value.trim()) {
      msgErr.textContent = 'Message requis';
      isValid = false;
    }

    if (!isValid) return;

    if (!window.supabaseClient) {
      console.error('index.js: window.supabaseClient introuvable. Vérifiez que js/supabase-client.js est chargé avant js/index.js.');
      showContactNotification("Une erreur de configuration empêche l'envoi de votre message. Veuillez réessayer plus tard.", 'error');
      return;
    }

    isSubmittingContactForm = true;
    setContactSubmitLoading(true);

    try {
      // Only real public.messages columns — id/is_read/created_at are
      // left to their database defaults (01_schema.sql).
      const payload = {
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim() || null,
        message: message.value.trim(),
      };

      const { error } = await window.supabaseClient
        .from('messages')
        .insert(payload);

      if (error) throw error;

      // Success — reset the form ONLY now, keep the visitor on the page,
      // restore the button, confirm via the notification banner.
      form.reset();
      showContactNotification('✅ Votre message a été envoyé avec succès. Nous vous répondrons rapidement.', 'success');
    } catch (err) {
      console.error('Erreur lors de l\'envoi du message :', err);
      // Failure — the visitor's entered data is preserved (no form.reset()
      // on this path), and a friendly message is shown instead of the
      // raw Supabase/Postgres error.
      showContactNotification("Une erreur est survenue lors de l'envoi de votre message. Veuillez réessayer.", 'error');
    } finally {
      setContactSubmitLoading(false);
      isSubmittingContactForm = false;
    }
  });
}

// ---------- BACK TO TOP ----------
function setupBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---------- SCROLL ANIMATIONS ----------
// Accepts an optional selector so it can be re-run for cards that are
// injected later by an async Supabase render (categories/promotions),
// in addition to the original call for cards that already exist in the
// DOM at page load (products/contact). Without this, cards rendered
// after the initial call would never get an observer attached and
// would stay stuck at opacity:0 forever.
function setupAnimations(selector) {
  const cards = document.querySelectorAll(selector || '.category-card, .product-card, .promo-card, .contact-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(card);
  });
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function() {
  // Settings, Categories, Promotions: real data from Supabase (async).
  loadSettingsData();
  loadCategories();   // fades its own cards in once rendered (see setupAnimations() calls inside)
  loadPromotions();   // same as above

  // Products: still sample data — the Public Products page is a later,
  // separate step (out of scope for this Landing Page step).
  loadProducts();

  setupNavigation();
  setupContactForm();
  setupBackToTop();

  // Cards that already exist synchronously at this point (product-card,
  // contact-card). category-card/promo-card get their own pass above,
  // once their async Supabase data has actually rendered.
  setupAnimations('.product-card, .contact-card');

  console.log('✅ Amrani Parapharmacie — Landing page connectée à Supabase (Settings, Catégories, Promotions, Contact)');
});
