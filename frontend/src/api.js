import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

// Request interceptor to add the auth token header to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle global errors (like expired tokens)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid, log out the user
            localStorage.removeItem('auth_token');
            localStorage.removeItem('username');
            window.dispatchEvent(new Event('authChange'));
            
            // Redirect to login if not already there
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

// ==========================================
// LYRA SECTION
// ==========================================

export const lyraApi = axios.create({
    baseURL: '/api',
});

// Request interceptor to add the lyra token header to requests
lyraApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('lyra_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle global errors (like expired tokens)
lyraApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('lyra_token');
            // Redirect to login or dispatch event if needed, but LyraTerminal handles its own state mostly.
            // A dispatch event could be useful if we want to bubble this up.
            window.dispatchEvent(new Event('lyraAuthChange'));
        }
        return Promise.reject(error);
    }
);

export const getMessageHistory = (offset, length) => {
    return lyraApi.get('/getMessageHistory', {
        params: { offset, length }
    });
};
