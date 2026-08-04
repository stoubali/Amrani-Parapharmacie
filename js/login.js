// ====================================================
// js/login.js — Admin Login for Amrani Parapharmacie
// ====================================================

document.addEventListener('DOMContentLoaded', function() {
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

    // Password visibility toggle
    passwordToggle.addEventListener('click', function() {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        // Change icon
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

    // Form validation & submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Reset errors
        clearErrors();
        hideLoginError();

        // Validate
        let isValid = true;

        // Email validation
        const email = emailInput.value.trim();
        if (!email) {
            emailError.textContent = 'L\'email est requis';
            isValid = false;
        } else if (!isValidEmail(email)) {
            emailError.textContent = 'Veuillez entrer un email valide';
            isValid = false;
        }

        // Password validation
        const password = passwordInput.value.trim();
        if (!password) {
            passwordError.textContent = 'Le mot de passe est requis';
            isValid = false;
        } else if (password.length < 6) {
            passwordError.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
            isValid = false;
        }

        if (!isValid) return;

        // Show loading state
        setLoading(true);

        // Simulate API call (Replace with Supabase Auth later)
        setTimeout(() => {
            // Fake authentication
            // Replace with Supabase Auth later
            if (email === 'admin@amrani.ma' && password === 'admin123') {
                // Success - redirect to admin dashboard (placeholder)
                setLoading(false);
                showLoginError('Connexion réussie ! Redirection en cours...', 'success');
                setTimeout(() => {
                    // Redirect to dashboard (placeholder)
                    // window.location.href = 'admin_dashboard.html';
                    alert('Connexion réussie ! (Redirection vers le tableau de bord)');
                    setLoading(false);
                }, 1500);
            } else {
                setLoading(false);
                showLoginError('Email ou mot de passe incorrect. Veuillez réessayer.');
                // Shake animation on error
                form.classList.add('shake');
                setTimeout(() => form.classList.remove('shake'), 500);
            }
        }, 1500);
    });

    // Email format validation
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Clear all error messages
    function clearErrors() {
        emailError.textContent = '';
        passwordError.textContent = '';
        // Remove error class from inputs
        document.querySelectorAll('.input-wrapper input').forEach(input => {
            input.style.borderColor = '';
        });
    }

    // Show login error message
    function showLoginError(message, type = 'error') {
        loginError.style.display = 'flex';
        loginErrorMessage.textContent = message;
        if (type === 'success') {
            loginError.style.background = '#d1fae5';
            loginError.style.color = '#065f46';
            loginError.querySelector('svg').style.stroke = '#065f46';
        } else {
            loginError.style.background = '#fee2e2';
            loginError.style.color = '#991b1b';
            loginError.querySelector('svg').style.stroke = '#991b1b';
        }
    }

    function hideLoginError() {
        loginError.style.display = 'none';
    }

    // Set loading state on button
    function setLoading(isLoading) {
        if (isLoading) {
            loginBtnText.style.display = 'none';
            loginBtnLoader.style.display = 'inline-block';
            loginBtn.disabled = true;
            loginBtn.style.opacity = '0.8';
        } else {
            loginBtnText.style.display = 'inline';
            loginBtnLoader.style.display = 'none';
            loginBtn.disabled = false;
            loginBtn.style.opacity = '1';
        }
    }

    // Real-time validation on input blur
    emailInput.addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !isValidEmail(email)) {
            emailError.textContent = 'Veuillez entrer un email valide';
        } else {
            emailError.textContent = '';
        }
    });

    passwordInput.addEventListener('blur', function() {
        const password = this.value.trim();
        if (password && password.length < 6) {
            passwordError.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
        } else {
            passwordError.textContent = '';
        }
    });

    // Clear errors on input
    emailInput.addEventListener('input', function() {
        emailError.textContent = '';
        hideLoginError();
    });

    passwordInput.addEventListener('input', function() {
        passwordError.textContent = '';
        hideLoginError();
    });

    // Remember me functionality (localStorage)
    if (localStorage.getItem('rememberMe') === 'true') {
        rememberMe.checked = true;
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) {
            emailInput.value = savedEmail;
        }
    }

    rememberMe.addEventListener('change', function() {
        if (this.checked) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('savedEmail', emailInput.value);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('savedEmail');
        }
    });

    // Add shake animation CSS
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