window.supabaseClient = {
    auth: {
        signInWithPassword: async ({ email, password }) => ({
            data: { user: { email } },
            error: email === 'admin@amrani.com' && password === 'admin123' ? null : { message: 'Email ou mot de passe incorrect' }
        })
    }
};