// ====================================================
// js/login.js — Admin Login for Amrani Parapharmacie
// Connected to Supabase Authentication
// ====================================================
//
// Requires (loaded in login_admin.html, in this order):
//   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/.../supabase.min.js
//   2. A small inline <script> defining SUPABASE_URL and SUPABASE_ANON_KEY
//   3. This file (js/login.js)
//
// Expected database object:
//   public.admins
//     id  uuid  primary key  references auth.users(id)
//   (Add one row per admin user, using their auth.users id.)
// ====================================================

// ---------- SUPABASE CLIENT ----------
// Holds the single Supabase client instance used across this page.
let supabaseClient = null;

/**
 * initializeSupabase()
 * Creates the Supabase client using the URL/key defined in login_admin.html.
 * Session persistence + auto token refresh are enabled so that a refresh
 * (or reopening the tab) keeps the admin logged in.
 */
function initializeSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library not loaded. Check the CDN <script> tag in login_admin.html.');
        return null;
    }

    if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR-PROJECT-REF') ||
        !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('YOUR-ANON-PUBLIC-KEY')) {
        console.error('Supabase credentials are not set. Paste your URL and anon key in login_admin.html.');
        return null;
    }

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,   // keep session across page refreshes
            autoRefreshToken: true, // silently refresh the access token
            detectSessionInUrl: true,
        },
    });

    return client;
}

// ====================================================
// DOM READY
// ====================================================
document.addEventListener('DOMContentLoaded', async function () {
    // DOM Elements
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginBtnLoader = document.getElementById('loginBtnLoader');
    const loginError = document.getElementById('loginError');
    const loginErrorMessage = document.getElementById('loginErrorMessage');
    const passwordToggle = document.getElementById('passwordToggle');
    const rememberMe = document.getElementById('rememberMe');

    // ---------- INIT SUPABASE ----------
    supabaseClient = initializeSupabase();

    if (!supabaseClient) {
        showError('Configuration Supabase manquante. Contactez l\'administrateur technique.');
        setLoading(false, { disable: true });
        return; // Nothing else can work without a client — stop here.
    }

    // ---------- CHECK IF ALREADY LOGGED IN ----------
    // If a valid admin session already exists, skip the form entirely.
    await checkExistingSession();

    // ---------- PASSWORD VISIBILITY TOGGLE ----------
    passwordToggle.addEventListener('click', function () {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        const icon = this.querySelector('svg');
        if (isPassword) {
            icon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            `;
        } else {
            icon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            `;
        }
    });

    // ---------- REMEMBER ME (email only — never store passwords) ----------
    if (localStorage.getItem('rememberMe') === 'true') {
        rememberMe.checked = true;
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) emailInput.value = savedEmail;
    }

    rememberMe.addEventListener('change', function () {
        if (this.checked) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('savedEmail', emailInput.value);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('savedEmail');
        }
    });

    // ---------- REAL-TIME FIELD VALIDATION ----------
    emailInput.addEventListener('blur', function () {
        const email = this.value.trim();
        emailError.textContent = (email && !isValidEmail(email))
            ? 'Veuillez entrer un email valide'
            : '';
    });

    passwordInput.addEventListener('blur', function () {
        const password = this.value.trim();
        passwordError.textContent = (password && password.length < 6)
            ? 'Le mot de passe doit contenir au moins 6 caractères'
            : '';
    });

    emailInput.addEventListener('input', function () {
        emailError.textContent = '';
        hideError();
    });

    passwordInput.addEventListener('input', function () {
        passwordError.textContent = '';
        hideError();
    });

    // ---------- FORM SUBMIT ----------
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Reset previous errors
        emailError.textContent = '';
        passwordError.textContent = '';
        hideError();

        // ---- Client-side validation ----
        let isValid = true;
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email) {
            emailError.textContent = 'L\'email est requis';
            isValid = false;
        } else if (!isValidEmail(email)) {
            emailError.textContent = 'Veuillez entrer un email valide';
            isValid = false;
        }

        if (!password) {
            passwordError.textContent = 'Le mot de passe est requis';
            isValid = false;
        } else if (password.length < 6) {
            passwordError.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
            isValid = false;
        }

        if (!isValid) return;

        // Remember-me: persist/clear the saved email right away
        if (rememberMe.checked) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('savedEmail', email);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('savedEmail');
        }

        showLoading();

        try {
            // ---- Step 1: Authenticate with Supabase Auth ----
            const { user, error: loginErr } = await login(email, password);

            if (loginErr) {
                hideLoading();
                showError(loginErr);
                form.classList.add('shake');
                setTimeout(() => form.classList.remove('shake'), 500);
                return;
            }

            // ---- Step 2: Verify the user is an authorized admin ----
            const isAdmin = await checkAdmin(user.id);

            if (!isAdmin) {
                // Not authorized — sign them out immediately, never let
                // a non-admin keep an authenticated session on this page.
                await supabaseClient.auth.signOut();
                hideLoading();
                showError('Vous n\'êtes pas autorisé à accéder au panneau d\'administration.');
                return;
            }

            // ---- Step 3: Success — redirect to the admin panel ----
            window.location.href = 'admin_panel.html';

        } catch (err) {
            console.error('Unexpected login error:', err);
            hideLoading();
            showError('Une erreur inattendue est survenue. Veuillez réessayer.');
        }
    });

    // ====================================================
    // CORE AUTH FUNCTIONS
    // ====================================================

    /**
     * login(email, password)
     * Authenticates against Supabase Auth.
     * Returns { user } on success, or { error: "message" } on failure.
     */
    async function login(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { error: mapAuthError(error) };
            }

            if (!data || !data.user) {
                return { error: 'Connexion impossible. Veuillez réessayer.' };
            }

            return { user: data.user };
        } catch (err) {
            console.error('Network/auth error during login:', err);
            return { error: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.' };
        }
    }

    /**
     * checkAdmin(userId)
     * Checks whether the given auth user id exists in public.admins
     * (matched against the admins.user_id column).
     * Returns true if the user is an admin, false otherwise (including
     * on any query error — fail closed for security).
     */
    async function checkAdmin(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('admins')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error checking admin status:', error);
                return false; // Fail closed: any error = not authorized
            }

            return !!data;
        } catch (err) {
            console.error('Unexpected error checking admin status:', err);
            return false;
        }
    }

    /**
     * checkExistingSession()
     * On page load, checks if a valid Supabase session already exists.
     * If it does AND the user is an admin, redirect straight to the
     * admin panel. If a session exists but the user is NOT an admin,
     * sign them out so they land back on a clean login form.
     */
    async function checkExistingSession() {
        try {
            const { data, error } = await supabaseClient.auth.getSession();

            if (error) {
                console.error('Error checking existing session:', error);
                return;
            }

            const session = data && data.session;
            if (!session || !session.user) return; // No session — stay on login page

            const isAdmin = await checkAdmin(session.user.id);

            if (isAdmin) {
                window.location.href = 'admin_panel.html';
            } else {
                // Stale/non-admin session — clear it silently.
                await supabaseClient.auth.signOut();
            }
        } catch (err) {
            console.error('Unexpected error checking session:', err);
        }
    }

    // ====================================================
    // UI HELPERS
    // ====================================================

    /**
     * showError(message)
     * Displays a professional error message in the login form's error box.
     */
    function showError(message) {
        loginError.style.display = 'flex';
        loginErrorMessage.textContent = message;
        loginError.style.background = '#fee2e2';
        loginError.style.color = '#991b1b';
        const svg = loginError.querySelector('svg');
        if (svg) svg.style.stroke = '#991b1b';
    }

    function hideError() {
        loginError.style.display = 'none';
    }

    /**
     * showLoading() / hideLoading()
     * Toggle the button's loading state during async auth calls.
     */
    function showLoading() {
        setLoading(true);
    }

    function hideLoading() {
        setLoading(false);
    }

    function setLoading(isLoading, options = {}) {
        if (isLoading) {
            loginBtnText.style.display = 'none';
            loginBtnLoader.style.display = 'inline-block';
            loginBtn.disabled = true;
            loginBtn.style.opacity = '0.8';
        } else {
            loginBtnText.style.display = 'inline';
            loginBtnLoader.style.display = 'none';
            loginBtn.disabled = !!options.disable;
            loginBtn.style.opacity = options.disable ? '0.6' : '1';
        }
    }

    /**
     * isValidEmail(email)
     * Basic email format check.
     */
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /**
     * mapAuthError(error)
     * Converts raw Supabase Auth error messages into clean, professional
     * French messages shown to the admin.
     */
    function mapAuthError(error) {
        const msg = (error && error.message) ? error.message.toLowerCase() : '';

        if (msg.includes('invalid login credentials')) {
            return 'Email ou mot de passe incorrect. Veuillez réessayer.';
        }
        if (msg.includes('email not confirmed')) {
            return 'Veuillez confirmer votre email avant de vous connecter.';
        }
        if (msg.includes('too many requests') || msg.includes('rate limit')) {
            return 'Trop de tentatives. Veuillez patienter avant de réessayer.';
        }
        if (msg.includes('network') || msg.includes('fetch')) {
            return 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
        }
        return 'Une erreur est survenue lors de la connexion. Veuillez réessayer.';
    }

    // Expose the shake animation (kept from the original design).
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .shake {
            animation: shake 0.5s ease-in-out;
        }
    `;
    document.head.appendChild(style);
});
