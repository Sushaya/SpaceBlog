/* ==========================================================================
   BlogSpace - API Client & Session Manager
   ========================================================================== */

const API_BASE_URL = window.location.origin + '/api';

const API = {
    // LocalStorage Keys
    TOKEN_KEY: 'blogspace_token',
    USER_KEY: 'blogspace_user',
    THEME_KEY: 'blogspace_theme',

    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    },

    removeToken() {
        localStorage.removeItem(this.TOKEN_KEY);
    },

    getUser() {
        const user = localStorage.getItem(this.USER_KEY);
        try {
            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    },

    setUser(user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    removeUser() {
        localStorage.removeItem(this.USER_KEY);
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    async logout() {
        if (this.isAuthenticated()) {
            try {
                await this.post('/auth/logout', {});
            } catch (e) {
                console.warn('Could not record logout API log:', e);
            }
        }
        this.removeToken();
        this.removeUser();
        window.location.href = '/login.html';
    },

    async request(endpoint, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

            // Handle 401 & 403 Unauthorized / Expired Token
            if ((response.status === 401 || response.status === 403) && this.isAuthenticated()) {
                const isAuthCheck = endpoint.includes('/auth/me') || endpoint.includes('/notifications');
                if (!isAuthCheck && !window.location.pathname.includes('login.html')) {
                    console.warn('Session expired or unauthorized.');
                    this.removeToken();
                    this.removeUser();
                    if (window.showToast) {
                        window.showToast('Session expired or invalid token. Please log in again.', 'warning');
                    }
                    setTimeout(() => {
                        window.location.href = '/login.html?expired=true';
                    }, 1200);
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'An error occurred during request.');
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    get(endpoint, headers = {}) {
        return this.request(endpoint, { method: 'GET', headers });
    },

    post(endpoint, body, headers = {}) {
        return this.request(endpoint, { method: 'POST', body: JSON.stringify(body), headers });
    },

    put(endpoint, body, headers = {}) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body), headers });
    },

    delete(endpoint, body = null, headers = {}) {
        return this.request(endpoint, { method: 'DELETE', body: body ? JSON.stringify(body) : null, headers });
    },

    async uploadFile(endpoint, formData) {
        const token = this.getToken();
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers,
                body: formData
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload file.');
            }
            return data;
        } catch (error) {
            console.error(`Upload Error [${endpoint}]:`, error);
            throw error;
        }
    }
};

window.API = API;
