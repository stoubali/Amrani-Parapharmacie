document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('loginForm');
    const errorBox = document.getElementById('loginError');
    const button = document.getElementById('loginBtn');
    const auth = window.supabaseClient?.auth;

    if (!auth) {
        errorBox.textContent = 'Le système d’authentification est indisponible.';
        errorBox.style.display = 'block';
        return;
    }

    const { data: { session } } = await auth.getSession();
    if (session?.user) {
        window.location.href = '/admin.html';
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        errorBox.style.display = 'none';
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';

        const { data, error } = await auth.signInWithPassword({ email, password });

        if (error) {
            errorBox.textContent = error.message || 'Échec de la connexion';
            errorBox.style.display = 'block';
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            return;
        }

        if (data?.user) {
            window.location.href = '/admin.html';
        }
    });
});