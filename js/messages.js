// ====================================================================
// js/messages.js — Messages Module (Amrani Parapharmacie)
// ====================================================================
// STEP 1 SCOPE (this file): loads messages from Supabase and renders
// them into the EXISTING #messagesTable. Same helper shapes, same
// loading/error/empty pattern already established by Categories'/
// Products'/Promotions' own Step 1.
//
// STEP 2 (unchanged, tested — do not modify): View Message Details,
// read-only, reusing the existing #messageModal.
//
// STEP 3 (unchanged, tested — do not modify): Mark as Read, writing
// only public.messages.is_read via the existing #msgMarkRead button
// inside #messageModal.
//
// STEP 5 (unchanged, tested — do not modify): Message Search
// (#messageSearch), debounced ~300ms, searching name + email.
//
// STEP 6 ADDITION: Message Filters — specifically the read-status
// filter (#messageFilter), the only filterable field public.messages
// actually has: is_read (boolean, not null, default false — see
// 01_schema.sql), backed by idx_messages_is_read in 04_indexes.sql.
// loadMessages() was extended with a second optional parameter,
// statusFilter, alongside the existing searchTerm; called with no
// arguments (as every existing CRUD-reload call site still does) it
// behaves exactly as before. Search and the status filter combine on
// the same query (AND) via a shared triggerMessagesReload() helper
// used by both the search debounce callback and the filter's change
// handler, so neither can overwrite the other's condition — mirrors
// triggerProductsReload()/triggerPromotionsReload().
//
// Explicitly NOT implemented here (later steps):
//   - Reply
//   - Edit
//   - Create
//   - Dashboard stats
//   - Any public website changes
//
// Requires (loaded before this file, in this order):
//   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
//   2. js/supabase-client.js   (creates window.supabaseClient)
//
// Table: public.messages (id, name [not null], email [not null],
//   phone, message [not null], is_read [not null, default false],
//   created_at) — see 01_schema.sql. No foreign keys reference or are
//   referenced by this table, so loading it requires no joins/embeds.
//
// RLS (02_rls.sql): SELECT on public.messages requires
// public.is_admin() (policy "messages_admin_select"). The admin panel
// is only reached after login.js's admin check, so an authenticated
// admin session already satisfies this — no policy changes needed.
// ====================================================================

(function () {
  'use strict';

  // Only do anything on pages that actually have the Messages section.
  const messagesSection = document.getElementById('section-messages');
  if (!messagesSection) return;

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

  // Bumped on every loadMessages() call; a response only gets applied if
  // its captured id still matches this counter, i.e. no newer call has
  // started since. Mirrors categoryLoadRequestId / productLoadRequestId /
  // promotionLoadRequestId. Not strictly needed yet (no search/filter in
  // this step means calls can't overlap from user input), but kept for
  // consistency with the other three modules and to protect the one
  // place calls CAN overlap today: init() + the sidebar-link reload
  // firing close together.
  let messageLoadRequestId = 0;

  // --- Step 2: View Message — state ------------------------------------
  let messageViewLoadingEl = null;
  let messageViewErrorEl = null;
  let messageContentEl = null;
  let msgNameEl = null;
  let msgEmailEl = null;
  let msgPhoneEl = null;
  let msgDateEl = null;
  let msgStatusEl = null;
  let msgTextEl = null;

  let isViewingMessage = false; // guards against overlapping View requests

  // --- Step 3: Mark as Read — state -------------------------------------
  let msgMarkReadBtn = null;
  let messageActionNotificationEl = null;
  let currentViewedMessageId = null; // the message currently shown in #messageModal
  let isMarkingRead = false; // guards against duplicate/overlapping mark-as-read requests

  // --- Step 4: Delete Message — duplicate-execution guard ---------------
  // admin.js's generic #confirmDelete handler dispatches synchronously and
  // doesn't itself await/disable anything (same as the category/product/
  // promotion cases), so this module-local guard is what actually
  // prevents a double confirm-click from firing two DELETE requests —
  // mirrors isDeletingProduct/isDeletingPromotion exactly.
  let isDeletingMessage = false;

  // --- Step 5: Message Search — state ------------------------------------
  let messageSearchInput = null;
  let messageSearchDebounceTimer = null;

  // --- Step 6: Message Filters — state ------------------------------------
  let messageStatusFilterSelect = null;

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

  // Friendly date+time formatter for the "Date" column. created_at is a
  // timestamptz — shown as a friendly fr-FR date/time, or '-' when null.
  function formatDateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return escapeHtml(value);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  // ------------------------------------------------------------------
  // Render — reuses the EXISTING #messagesTable columns exactly
  // (Nom, Email, Téléphone, Statut, Date, Actions). Actions renders the
  // View and Delete buttons implemented in Steps 2/4.
  // ------------------------------------------------------------------
  function renderRows(messages) {
    if (!messages || messages.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center; color:var(--gray-600); padding:1.5rem 0.8rem;">' +
        'Aucun message trouvé.</td></tr>';
      return;
    }

    tableBody.innerHTML = messages
      .map((m) => {
        const name = escapeHtml(m.name || '-');
        const email = escapeHtml(m.email || '-');
        const phone = m.phone ? escapeHtml(m.phone) : '-';
        const isRead = !!m.is_read;
        const date = formatDateTime(m.created_at);

        return (
          '<tr data-id="' + escapeHtml(m.id) + '">' +
            '<td>' + name + '</td>' +
            '<td>' + email + '</td>' +
            '<td>' + phone + '</td>' +
            '<td><span class="badge ' + (isRead ? 'badge-success' : 'badge-warning') + '">' +
              (isRead ? 'Lu' : 'Non lu') + '</span></td>' +
            '<td>' + date + '</td>' +
            '<td class="actions">' +
              '<button class="btn-icon view" onclick="window.MessagesModule.viewMessage(\'' + escapeHtml(m.id) + '\')" title="Voir">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' +
                '</svg>' +
              '</button>' +
              '<button class="btn-icon delete" onclick="confirmDelete(\'message\', \'' + escapeHtml(m.id) + '\')" title="Supprimer">' +
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
  // buildCategorySearchFilter()/buildProductSearchFilter()/
  // buildPromotionSearchFilter(). Only name/email are searched — the
  // two columns 04_indexes.sql actually has trigram indexes for
  // (idx_messages_name_trgm, idx_messages_email_trgm); phone and
  // message have no such index and are excluded, the same way Products
  // excludes its non-indexed description columns from search.
  // ------------------------------------------------------------------
  function buildMessageSearchFilter(term) {
    const escaped = term.replace(/[\\%_]/g, '\\$&');
    return 'name.ilike."%' + escaped + '%",email.ilike."%' + escaped + '%"';
  }

  // Load messages from Supabase. searchTerm and statusFilter are both
  // optional — every existing call site (init(), the sidebar reload,
  // and the post-Delete/post-Mark-as-Read success reloads) calls this
  // with no arguments, which behaves exactly as it always has (no
  // filter, full list, newest first). Step 5 added a server-side ilike
  // filter on name/email when a non-empty trimmed searchTerm is passed.
  // Step 6 adds a server-side filter on the real is_read column (backed
  // by idx_messages_is_read) when statusFilter is 'unread' or 'read';
  // both conditions apply together (AND) when both are present.
  async function loadMessages(searchTerm, statusFilter) {
    if (!window.supabaseClient) {
      showError('Configuration Supabase manquante. Impossible de charger les messages.');
      console.error('MessagesModule: window.supabaseClient introuvable. Vérifiez que js/supabase-client.js est chargé avant js/messages.js.');
      return;
    }

    const requestId = ++messageLoadRequestId;

    hideError();
    showLoading(true);

    try {
      let query = window.supabaseClient
        .from('messages')
        .select('id, name, email, phone, message, is_read, created_at');

      const trimmedTerm = (searchTerm || '').trim();
      if (trimmedTerm) {
        query = query.or(buildMessageSearchFilter(trimmedTerm));
      }

      const trimmedStatus = (statusFilter || '').trim();
      if (trimmedStatus === 'unread') {
        query = query.eq('is_read', false);
      } else if (trimmedStatus === 'read') {
        query = query.eq('is_read', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      // A newer loadMessages() call has started since this one was
      // sent (e.g. the user kept typing). Its own response will render
      // instead, so this older one is dropped silently — success or
      // error alike.
      if (requestId !== messageLoadRequestId) return;

      if (error) throw error;

      renderRows(data);
      hasLoadedOnce = true;
    } catch (err) {
      if (requestId !== messageLoadRequestId) return; // stale — a newer call already handled the UI

      console.error('Erreur lors du chargement des messages :', err);
      tableBody.innerHTML = '';
      showError('Impossible de charger les messages. Vérifiez votre connexion et réessayez.');
    } finally {
      if (requestId === messageLoadRequestId) {
        showLoading(false);
      }
    }
  }

  // ====================================================================
  // STEP 2: View Message Details (read-only)
  // ====================================================================

  // ------------------------------------------------------------------
  // DOM refs for the existing #messageModal — resolved once, lazily,
  // mirroring setupProductViewModal()'s pattern in products.js.
  // ------------------------------------------------------------------
  function setupMessageViewModal() {
    messageViewLoadingEl = document.getElementById('messageViewLoading');
    messageViewErrorEl = document.getElementById('messageViewError');
    messageContentEl = document.getElementById('messageContent');
    msgNameEl = document.getElementById('msgName');
    msgEmailEl = document.getElementById('msgEmail');
    msgPhoneEl = document.getElementById('msgPhone');
    msgDateEl = document.getElementById('msgDate');
    msgStatusEl = document.getElementById('msgStatus');
    msgTextEl = document.getElementById('msgText');
    msgMarkReadBtn = document.getElementById('msgMarkRead');
    messageActionNotificationEl = document.getElementById('messagesActionNotification');

    if (msgMarkReadBtn) {
      msgMarkReadBtn.addEventListener('click', function () {
        if (currentViewedMessageId) {
          markMessageAsRead(currentViewedMessageId);
        }
      });
    }
  }

  // ------------------------------------------------------------------
  // Small state helpers for the View modal — loading / error / content
  // are mutually exclusive, so a fetch never shows stale data from a
  // previously opened message alongside a new loading spinner or a new
  // error. Mirrors showProductViewLoading()/Error()/Content().
  // ------------------------------------------------------------------
  function showMessageViewLoading() {
    if (messageViewLoadingEl) messageViewLoadingEl.style.display = 'block';
    if (messageViewErrorEl) messageViewErrorEl.style.display = 'none';
    if (messageContentEl) messageContentEl.style.display = 'none';
  }

  function showMessageViewError(message) {
    if (messageViewLoadingEl) messageViewLoadingEl.style.display = 'none';
    if (messageContentEl) messageContentEl.style.display = 'none';
    if (messageViewErrorEl) {
      messageViewErrorEl.textContent = message;
      messageViewErrorEl.style.display = 'block';
    } else {
      window.alert(message);
    }
  }

  function showMessageViewContent() {
    if (messageViewLoadingEl) messageViewLoadingEl.style.display = 'none';
    if (messageViewErrorEl) messageViewErrorEl.style.display = 'none';
    if (messageContentEl) messageContentEl.style.display = 'block';
  }

  // ------------------------------------------------------------------
  // Populate #messageModal with a message fetched fresh from Supabase.
  // Read-only — no field here is ever written back. Every value is set
  // via textContent (never innerHTML) since message/name/email/phone are
  // all user-submitted content (see messages_public_insert in
  // 02_rls.sql) — this is inherently XSS-safe without needing a separate
  // escapeHtml() call, the same guarantee escapeHtml() gives when used
  // before innerHTML elsewhere in this project.
  // ------------------------------------------------------------------
  function populateMessageViewModal(message) {
    currentViewedMessageId = message.id;

    if (msgNameEl) msgNameEl.textContent = message.name || '-';
    if (msgEmailEl) msgEmailEl.textContent = message.email || '-';
    if (msgPhoneEl) msgPhoneEl.textContent = message.phone || '-';
    if (msgDateEl) msgDateEl.textContent = formatDateTime(message.created_at);

    const isRead = !!message.is_read;

    if (msgStatusEl) {
      // The badge markup itself is fixed, project-controlled text (not
      // user data), so innerHTML here is the same safe pattern already
      // used for status badges in renderRows()/Products/Categories.
      msgStatusEl.innerHTML = '<span class="badge ' + (isRead ? 'badge-success' : 'badge-warning') + '">' +
        (isRead ? 'Lu' : 'Non lu') + '</span>';
    }

    // Step 3: only an unread message gets the "Marquer comme lu" button —
    // an already-read message has nothing left to do here, so no
    // unnecessary update is ever offered from the UI.
    if (msgMarkReadBtn) {
      msgMarkReadBtn.style.display = isRead ? 'none' : 'inline-block';
      msgMarkReadBtn.disabled = false;
      msgMarkReadBtn.textContent = 'Marquer comme lu';
    }

    if (msgTextEl) {
      // Preserve line breaks in the admin's free-text message safely —
      // white-space is a rendering hint, not markup, so this can never
      // introduce HTML/script injection the way inserting <br> tags via
      // innerHTML would if the message content weren't escaped first.
      msgTextEl.style.whiteSpace = 'pre-wrap';
      msgTextEl.textContent = message.message || '';
    }
  }

  // ------------------------------------------------------------------
  // View button click handler. Opens #messageModal immediately in a
  // loading state (never showing stale data from a previously opened
  // message), then fetches the real message fresh from Supabase by its
  // real UUID — never a local array, never a row index/position.
  // Strictly read-only: a single SELECT, nothing else. is_read is never
  // written here — marking a message as read is a separate future step.
  // ------------------------------------------------------------------
  async function handleViewMessageClick(id) {
    if (isViewingMessage) return; // guard against overlapping View requests
    isViewingMessage = true;

    if (typeof window.openModal === 'function') {
      window.openModal('messageModal');
    }
    showMessageViewLoading();

    try {
      if (!window.supabaseClient) {
        showMessageViewError('Configuration Supabase manquante. Impossible de charger le message.');
        console.error('MessagesModule: window.supabaseClient introuvable.');
        return;
      }

      const { data, error } = await window.supabaseClient
        .from('messages')
        .select('id, name, email, phone, message, is_read, created_at')
        .eq('id', id)
        .single();

      if (error) throw error;

      populateMessageViewModal(data);
      showMessageViewContent();
    } catch (err) {
      console.error('Erreur lors du chargement du message à afficher :', err);

      // PGRST116 = PostgREST's "0 rows" error for .single() — the
      // message no longer exists (e.g. deleted by someone else since
      // the table was last loaded). Any other error is a generic
      // failure. Mirrors handleViewProductClick() in products.js.
      if (err && err.code === 'PGRST116') {
        showMessageViewError('Message introuvable.');
      } else {
        showMessageViewError('Impossible de charger ce message. Veuillez réessayer.');
      }
    } finally {
      isViewingMessage = false;
    }
  }

  // ====================================================================
  // STEP 3: Mark as Read
  // ====================================================================

  // ------------------------------------------------------------------
  // Notification helper — mirrors showCategoryActionNotification()/
  // showProductActionNotification()/showPromotionActionNotification()
  // exactly, using the #messagesActionNotification element added to
  // admin_panel.html for this step.
  // ------------------------------------------------------------------
  function showMessageActionNotification(message, type) {
    if (!messageActionNotificationEl) {
      window.alert(message);
      return;
    }
    messageActionNotificationEl.textContent = message;
    messageActionNotificationEl.className =
      'settings-notification settings-notification-' + (type || 'info');
    messageActionNotificationEl.style.display = 'block';
    clearTimeout(showMessageActionNotification._t);
    showMessageActionNotification._t = setTimeout(() => {
      messageActionNotificationEl.style.display = 'none';
    }, 4000);
  }

  // ------------------------------------------------------------------
  // Mark a message as read. Writes ONLY public.messages.is_read (the
  // exact not-null boolean column from 01_schema.sql, default false) to
  // true, scoped to the real UUID passed in — never a row index, name,
  // or email. Permitted by the existing "messages_admin_update" RLS
  // policy (using/with check public.is_admin()), which the admin's
  // authenticated session already satisfies — no policy changes needed.
  //
  // isMarkingRead guards against duplicate/overlapping clicks (the
  // button is also disabled for the duration, same pattern as
  // setCategorySaving()/setProductSaving()).
  // ------------------------------------------------------------------
  async function markMessageAsRead(id) {
    if (isMarkingRead) return; // guard against duplicate/overlapping requests
    isMarkingRead = true;

    if (msgMarkReadBtn) {
      msgMarkReadBtn.disabled = true;
      msgMarkReadBtn.textContent = 'Enregistrement…';
    }

    try {
      if (!window.supabaseClient) {
        showMessageActionNotification('Configuration Supabase manquante. Impossible de marquer ce message comme lu.', 'error');
        console.error('MessagesModule: window.supabaseClient introuvable.');
        return;
      }

      const { error } = await window.supabaseClient
        .from('messages')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      // Success — update the open modal in place (no need to re-fetch:
      // we know exactly what changed) and hide the button, since the
      // message is now read.
      if (msgStatusEl) {
        msgStatusEl.innerHTML = '<span class="badge badge-success">Lu</span>';
      }
      if (msgMarkReadBtn) {
        msgMarkReadBtn.style.display = 'none';
      }

      // Refresh the table so the row's badge reflects the real database
      // state immediately — reuses the existing Step 1 loadMessages(),
      // the same success-refresh pattern Categories/Products/Promotions
      // already use after a write.
      await loadMessages();

      showMessageActionNotification('✅ Message marqué comme lu.', 'success');
    } catch (err) {
      console.error('Erreur lors du marquage du message comme lu :', err);

      // Restore the button so the admin can retry — the UI must not be
      // left showing a message as read when the database write failed.
      if (msgMarkReadBtn) {
        msgMarkReadBtn.disabled = false;
        msgMarkReadBtn.textContent = 'Marquer comme lu';
      }

      showMessageActionNotification("Une erreur est survenue. Impossible de marquer ce message comme lu.", 'error');
    } finally {
      isMarkingRead = false;
    }
  }

  // ====================================================================
  // STEP 4: Delete Message
  // ====================================================================
  // Called from admin.js's existing #confirmDelete click handler (see
  // the 'message' case there, which delegates to this function — the
  // same dispatch pattern already used for 'category'/'product'/
  // 'promotion'). The admin only reaches this after explicitly
  // confirming in the existing #deleteModal; cancelling that modal never
  // calls this function at all.
  //
  // Sequence:
  //   1. Delete the row from public.messages by its real UUID. No other
  //      table in 01_schema.sql declares a foreign key referencing
  //      messages.id, so there is no cascade and no restrictive
  //      constraint that could apply here — messages is not a parent of
  //      anything, unlike categories/products.
  //      - On any delete error, stop: no reload, no success
  //        notification, just a friendly error and a full
  //        console.error(). The message is NOT removed from the
  //        visible table, since the table is only ever refreshed via a
  //        real reload from Supabase (never a local mutation), and no
  //        reload happens on this path.
  //   2. On success: reload the table via the existing loadMessages()
  //      (the same function Step 1 uses), so the deleted row disappears
  //      because Supabase no longer returns it — never a local
  //      splice/filter of fake data.
  //   3. Show the existing success notification via
  //      showMessageActionNotification().
  // ------------------------------------------------------------------
  async function deleteMessage(id) {
    if (!window.supabaseClient) {
      showMessageActionNotification('Configuration Supabase manquante. Impossible de supprimer ce message.', 'error');
      console.error('MessagesModule: window.supabaseClient introuvable.');
      return;
    }

    if (isDeletingMessage) return; // guard against duplicate/overlapping delete calls
    isDeletingMessage = true;

    try {
      const { error: deleteError } = await window.supabaseClient
        .from('messages')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Erreur lors de la suppression du message :', deleteError);
        showMessageActionNotification('Une erreur est survenue lors de la suppression du message.', 'error');
        return; // No reload, no success notification — message stays as-is.
      }

      // Success — refresh the table and confirm.
      await loadMessages();
      showMessageActionNotification('✅ Message supprimé avec succès.', 'success');
    } finally {
      isDeletingMessage = false;
    }
  }

  // ------------------------------------------------------------------
  // Step 6: reads the current search input value and the current status
  // filter value together and issues a single combined loadMessages()
  // call. Used by both the search debounce callback and the filter's
  // change handler, so a search-in-progress and a filter change can
  // never overwrite each other's condition. Mirrors
  // triggerProductsReload()/triggerPromotionsReload().
  // ------------------------------------------------------------------
  function triggerMessagesReload() {
    const searchValue = messageSearchInput ? messageSearchInput.value : '';
    const statusValue = messageStatusFilterSelect ? messageStatusFilterSelect.value : 'all';
    loadMessages(searchValue, statusValue);
  }

  // ------------------------------------------------------------------
  // Step 5: Message Search — debounced ~300ms. Every keystroke cancels
  // the previous timer (clearTimeout) and schedules a new one; only a
  // pause of ~300ms without further typing actually triggers a query,
  // via triggerMessagesReload(). An empty/whitespace-only value
  // naturally reloads the (filter-respecting) full list, since
  // loadMessages() only applies the search condition when the trimmed
  // term is non-empty. Mirrors setupProductSearch()/
  // setupPromotionSearch(). Step 6: the debounced query now also
  // includes the current status filter selection, via
  // triggerMessagesReload(), so search + filter combine instead of
  // overwriting each other.
  // ------------------------------------------------------------------
  function setupMessageSearch() {
    messageSearchInput = document.getElementById('messageSearch');
    if (!messageSearchInput) return;

    messageSearchInput.addEventListener('input', function () {
      clearTimeout(messageSearchDebounceTimer);
      messageSearchDebounceTimer = setTimeout(function () {
        triggerMessagesReload();
      }, 300);
    });
  }

  // ------------------------------------------------------------------
  // Step 6: Message Filters — wire the read-status filter's change
  // event. A filter change applies immediately (no debounce needed for
  // a <select>), and cancels any pending debounced search so the two
  // never race — the combined search+filter query fires right away via
  // the shared triggerMessagesReload() helper. Mirrors
  // setupProductCategoryFilter()/setupPromotionStatusFilter().
  // ------------------------------------------------------------------
  function setupMessageStatusFilter() {
    messageStatusFilterSelect = document.getElementById('messageFilter');
    if (!messageStatusFilterSelect) return;

    messageStatusFilterSelect.addEventListener('change', function () {
      clearTimeout(messageSearchDebounceTimer);
      triggerMessagesReload();
    });
  }

  // ------------------------------------------------------------------
  // Init — called explicitly by admin.js
  // ------------------------------------------------------------------
  function init() {
    if (initialized) return;
    initialized = true;

    tableBody = document.querySelector('#messagesTable tbody');
    tableWrapper = messagesSection.querySelector('.table-responsive');
    loadingEl = document.getElementById('messagesLoading');
    errorEl = document.getElementById('messagesError');

    if (!tableBody) {
      console.error('MessagesModule: #messagesTable tbody introuvable.');
      return;
    }

    // Load once immediately so data is ready the first time the section
    // is shown, and reload every time the Messages tab is opened so the
    // admin always sees fresh data — same pattern as Categories/Products/
    // Promotions.
    loadMessages();

    const messagesLink = document.querySelector('.sidebar-link[data-section="messages"]');
    if (messagesLink) {
      messagesLink.addEventListener('click', function () {
        loadMessages();
      });
    }

    // Step 2: View Message Details
    setupMessageViewModal();

    // Step 5: Message Search
    setupMessageSearch();

    // Step 6: Message Filters
    setupMessageStatusFilter();
  }

  // Expose a minimal public API — admin.js only calls init(). viewMessage
  // is called directly from the row button's onclick (see renderRows);
  // deleteMessage is called from admin.js's generic #confirmDelete
  // handler's 'message' case — same pattern used by
  // CategoriesModule/ProductsModule/PromotionsModule. markMessageAsRead
  // is intentionally NOT exposed here: it's only reachable via the
  // #msgMarkRead button inside the View modal, the same way Create/Edit
  // submit handlers aren't exposed by the other modules either.
  window.MessagesModule = {
    init: init,
    reload: loadMessages,
    viewMessage: handleViewMessageClick,
    deleteMessage: deleteMessage,
  };
})();
