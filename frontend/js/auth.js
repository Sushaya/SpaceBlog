/* ==========================================================================
   BlogSpace - Authentication Controller (Login & Sign Up)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const isLoginPage = window.location.pathname.includes('login');
    const isRegisterPage = window.location.pathname.includes('register');
    const urlParams = new URLSearchParams(window.location.search);

    // Clear stale token if session expired flag is present
    if (urlParams.has('expired')) {
        API.removeToken();
        API.removeUser();
    }

    // Auto-redirect if already authenticated and valid user session exists
    if (API.isAuthenticated() && !urlParams.has('expired') && (isLoginPage || isRegisterPage)) {
        if (API.getUser()) {
            window.location.href = '/index.html';
            return;
        }
    }

    initPasswordToggles();
    initLoginForm();
    initRegisterForm();
});

// Show/Hide Password Toggle
function initPasswordToggles() {
    const toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const input = toggle.previousElementSibling;
            if (input && input.type === 'password') {
                input.type = 'text';
                toggle.textContent = '🔒';
            } else if (input) {
                input.type = 'password';
                toggle.textContent = '👁️';
            }
        });
    });
}

// Login Form Handling
function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    const alertError = document.getElementById('login-alert');

    if (!loginForm) return;

    // Check query params for session expiration alert
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('expired') && alertError) {
        alertError.textContent = 'Your session has expired. Please log in again.';
        alertError.style.display = 'block';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertError.style.display = 'none';

        const credential = document.getElementById('credential').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        if (!credential || !password) {
            alertError.textContent = 'Please fill in all required fields.';
            alertError.style.display = 'block';
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Logging in...</span>';

            const data = await API.post('/auth/login', { credential, password });

            API.setToken(data.token);
            API.setUser(data.user);

            showToast('Welcome back, ' + data.user.full_name + '!', 'success');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 600);
        } catch (err) {
            alertError.textContent = err.message || 'Login failed. Please check your credentials.';
            alertError.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Log In</span>';
        }
    });
}

// Register Form Handling
function initRegisterForm() {
    const registerForm = document.getElementById('register-form');
    const alertError = document.getElementById('register-alert');

    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertError.style.display = 'none';

        const full_name = document.getElementById('full_name').value.trim();
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirm_password = document.getElementById('confirm_password').value;
        const submitBtn = registerForm.querySelector('button[type="submit"]');

        // Validations
        if (!full_name || !username || !email || !password || !confirm_password) {
            alertError.textContent = 'Please fill in all required fields.';
            alertError.style.display = 'block';
            return;
        }

        if (password !== confirm_password) {
            alertError.textContent = 'Passwords do not match.';
            alertError.style.display = 'block';
            return;
        }

        if (password.length < 6) {
            alertError.textContent = 'Password must be at least 6 characters long.';
            alertError.style.display = 'block';
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Creating Account...</span>';

            const data = await API.post('/auth/register', {
                full_name,
                username,
                email,
                password,
                confirm_password
            });

            API.setToken(data.token);
            API.setUser(data.user);

            showToast('Account created successfully!', 'success');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 600);
        } catch (err) {
            alertError.textContent = err.message || 'Registration failed.';
            alertError.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Sign Up</span>';
        }
    });
}
