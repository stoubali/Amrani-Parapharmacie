/**
 * Amrani Parapharmacie - Login Script
 * Signs the user in with Supabase Auth, then verifies they exist
 * in the `admins` table before granting access to the admin panel.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorBox = document.getElementById('loginError');
    const submitBtn = document.getElementById('loginBtn');

    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
    }

    function hideError() {
        errorBox.style.display = 'none';
    }

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.innerHTML = isLoading
            ? '<i class="fas fa-spinner fa-spin"></i> Signing in...'
            : '<i class="fas fa-sign-in-alt"></i> Sign In';
    }

    // If a redirect from auth-guard left an error message, show it
    const storedError = sessionStorage.getItem('authError');
    if (storedError) {
        showError(storedError);
        sessionStorage.removeItem('authError');
    }

    // If already signed in AND an authorized admin, skip straight to dashboard
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        const { data: adminRow } = await supabaseClient
            .from('admins')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();
        if (adminRow) {
            window.location.href = 'dashboard.html';
            return;
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError('Please enter your email and password.');
            return;
        }

        setLoading(true);

        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            setLoading(false);
            showError('Invalid email or password.');
            return;
        }

        // Gate access: the auth user must also have a row in `admins`
        const { data: adminRow, error: adminError } = await supabaseClient
            .from('admins')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle();

        if (adminError || !adminRow) {
            await supabaseClient.auth.signOut();
            setLoading(false);
            showError('This account is not authorized for admin access.');
            return;
        }

        window.location.href = 'dashboard.html';
    });
});
