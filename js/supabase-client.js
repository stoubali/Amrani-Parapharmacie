(function () {
    const STORAGE_KEY = 'amrani_admin_session';
    const VALID_CREDENTIALS = {
        email: 'admin@amrani.com',
        password: 'admin123'
    };

    function readSession() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    }

    const auth = {
        async signInWithPassword({ email, password }) {
            if (email === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password) {
                const user = { email, role: 'admin' };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
                return { data: { user }, error: null };
            }

            return {
                data: { user: null },
                error: { message: 'Email ou mot de passe incorrect' }
            };
        },

        async signOut() {
            localStorage.removeItem(STORAGE_KEY);
            return { error: null };
        },

        async getSession() {
            const session = readSession();
            return {
                data: { session: session ? { user: session } : null },
                error: null
            };
        },

        onAuthStateChange(callback) {
            return callback;
        }
    };

    const client = {
        auth,
        from() {
            return {
                select() {
                    return {
                        eq() {
                            return {
                                maybeSingle() {
                                    return Promise.resolve({ data: { id: 1 }, error: null });
                                }
                            };
                        }
                    };
                }
            };
        }
    };

    window.supabaseClient = client;
    window.authManager = {
        getSession: auth.getSession,
        signIn: auth.signInWithPassword,
        signOut: auth.signOut
    };
})();