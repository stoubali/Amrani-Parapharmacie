document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const errorBox = document.getElementById('loginError');
    const button = document.getElementById('loginBtn');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        errorBox.style.display = 'none';
        button.disabled = true;
        button.textContent = 'Connexion...';

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            errorBox.textContent = error.message || 'Échec de la connexion';
            errorBox.style.display = 'block';
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            return;
        }

        localStorage.setItem('amrani_admin_session', JSON.stringify(data.user));
        window.location.href = '/admin.html';
    });
});