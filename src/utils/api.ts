import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const getBackendUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_API_URL || 'https://checkin-backend-70km.onrender.com/api';
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      try {
        const url = new URL(envApiUrl);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          url.hostname = hostname;
        }
        return url.origin;
      } catch (e) {
        console.error('Failed to parse VITE_API_URL:', e);
      }
    }
  }
  return envApiUrl.replace(/\/api$/, '').replace(/\/api\/$/, '');
};

const api = axios.create({
  baseURL: `${getBackendUrl()}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string> | null = null;

// Automatically inject Authorization headers and perform proactive silent refreshes
api.interceptors.request.use(
  async (config) => {
    const tenantId = localStorage.getItem('tenantId') || 'public';
    if (config.headers) {
      config.headers['X-Tenant-Id'] = tenantId;
    }

    let token = useAuthStore.getState().token;
    const refreshToken = useAuthStore.getState().refreshToken;

    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        
        // Proactively refresh if access token expires within 30 seconds
        if (payload.exp && payload.exp * 1000 < Date.now() + 30 * 1000) {
          if (refreshToken) {
            if (!refreshPromise) {
              refreshPromise = (async () => {
                try {
                  const tenantId = localStorage.getItem('tenantId') || 'public';
                  const refreshUrl = `${getBackendUrl()}/api/auth/refresh`;
                  const res = await axios.post(refreshUrl, { refreshToken }, {
                    headers: { 'X-Tenant-Id': tenantId }
                  });
                  if (res.data && res.data.success) {
                    const newAccessToken = res.data.data.accessToken;
                    const user = useAuthStore.getState().user;
                    if (user) {
                      useAuthStore.getState().login(user, newAccessToken, refreshToken);
                    }
                    return newAccessToken;
                  }
                  throw new Error('Proactive refresh failed');
                } catch (err) {
                  useAuthStore.getState().logout();
                  window.location.href = '/login';
                  throw err;
                } finally {
                  refreshPromise = null;
                }
              })();
            }
            token = await refreshPromise;
          }
        }
      } catch (e) {
        console.error('Failed to parse or proactively refresh token:', e);
      }
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Catch 401 Session expirations and refresh tokens silently (Reactive Fallback)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute = originalRequest.url && (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/register-tenant') ||
      originalRequest.url.includes('/auth/refresh')
    );

    if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (!originalRequest.headers) {
              originalRequest.headers = {};
            }
            originalRequest.headers.Authorization = `Bearer ${token}`;
            originalRequest._retry = true;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const tenantId = localStorage.getItem('tenantId') || 'public';
          const refreshUrl = `${getBackendUrl()}/api/auth/refresh`;
          const res = await axios.post(refreshUrl, { refreshToken }, {
            headers: { 'X-Tenant-Id': tenantId }
          });

          if (res.data && res.data.success) {
            const newAccessToken = res.data.data.accessToken;
            const user = useAuthStore.getState().user;
            
            if (user) {
              useAuthStore.getState().login(user, newAccessToken, refreshToken);
            }

            processQueue(null, newAccessToken);
            isRefreshing = false;

            if (!originalRequest.headers) {
              originalRequest.headers = {};
            }
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
