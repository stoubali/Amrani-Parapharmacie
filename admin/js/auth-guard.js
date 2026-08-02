/**
 * Amrani Parapharmacie - Auth Guard
 * Include on every protected admin page, AFTER js/supabase-client.js
 * and BEFORE the page's own script.
 *
 * Pages should have `<style>body{visibility:hidden;}</style>` in <head>
 * so protected content never flashes before the auth check completes.
 */
(async function guard() {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        window.location.href = 'login.html';
        return;
    }

    // Confirm this authenticated user is a registered admin
    const { data: adminRow, error: adminError } = await supabaseClient
        .from('admins')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (adminError || !adminRow) {
        await supabaseClient.auth.signOut();
        sessionStorage.setItem('authError', 'This account is not authorized for admin access.');
        window.location.href = 'login.html';
        return;
    }

    // Reveal the page now that the user is confirmed
    document.documentElement.style.visibility = '';
    document.body.style.visibility = 'visible';

    document.addEventListener('DOMContentLoaded', () => {
        // Show the signed-in admin's email in the sidebar if present
        const userNameEl = document.querySelector('.user-name');
        if (userNameEl && session.user.email) {
            userNameEl.textContent = session.user.email;
            userNameEl.title = session.user.email;
        }

        // Wire up every "Logout" button on the page
        document.querySelectorAll('[title="Logout"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            });
        });
    });

    // Keep pages in sync if the session ends elsewhere (e.g. another tab)
    supabaseClient.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = 'login.html';
        }
    });
})();
