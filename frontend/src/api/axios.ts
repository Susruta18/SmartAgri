import axios from 'axios';

// ── API Base URL ──────────────────────────────────────────────────────────────
// In production (Android APK): VITE_API_BASE_URL is set in .env.production
//   and baked into the bundle at build time. It must point to the permanent
//   Render backend URL (e.g. https://smartagri-backend.onrender.com/api).
//
// In development: falls back to '/api' which is proxied by Vite to localhost:5000.
//
// NEVER add a localhost fallback for production — the Android device cannot
// reach your laptop's localhost.
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  console.error(
    '[AgriSmart] CRITICAL: VITE_API_BASE_URL is not set in the production build. ' +
    'All API calls will fail. Set this variable in frontend/.env.production before building the APK.'
  );
}

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '#/auth/login';
    }
    return Promise.reject(error);
  }
);

export default api;
