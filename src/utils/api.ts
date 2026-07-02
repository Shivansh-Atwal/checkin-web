import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { db } from '../db/db';
import { enqueueOperation, applyOptimisticUpdate } from '../db/offlineQueue';

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

const resolveLocalGet = async (url: string): Promise<any> => {
  const cleanUrl = url.split('?')[0];

  if (cleanUrl.endsWith('/rooms')) {
    return await db.rooms.toArray();
  }
  if (cleanUrl.includes('/rooms/')) {
    const id = cleanUrl.split('/').pop() || '';
    return await db.rooms.get(id);
  }
  if (cleanUrl.endsWith('/customers')) {
    return await db.customers.toArray();
  }
  if (cleanUrl.includes('/customers/')) {
    const id = cleanUrl.split('/').pop() || '';
    return await db.customers.get(id);
  }
  if (cleanUrl.endsWith('/bookings')) {
    return await db.bookings.toArray();
  }
  if (cleanUrl.includes('/bookings/')) {
    const id = cleanUrl.split('/').pop() || '';
    return await db.bookings.get(id);
  }
  if (cleanUrl.endsWith('/checkins') || cleanUrl.endsWith('/check-in')) {
    return await db.checkins.toArray();
  }
  if (cleanUrl.includes('/checkins/') || cleanUrl.includes('/check-in/')) {
    const id = cleanUrl.split('/').pop() || '';
    return await db.checkins.get(id);
  }
  if (cleanUrl.endsWith('/inventory')) {
    return await db.inventory.toArray();
  }
  if (cleanUrl.endsWith('/auditlogs') || cleanUrl.endsWith('/logs')) {
    return await db.auditlogs.toArray();
  }

  return [];
};

const api = axios.create({
  baseURL: `${getBackendUrl()}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string> | null = null;

// Inject Headers, handle proactive silent token refreshes, and intercept offline state queries
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

        // Proactively refresh if token expires within 30 seconds
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

    // Intercept requests if offline
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const { url, method, data } = config;
      const cleanUrl = url || '';

      if (method === 'get' || method === 'GET') {
        console.log(`[Offline API] Mocking GET from IndexedDB cache: ${cleanUrl}`);
        const localData = await resolveLocalGet(cleanUrl);
        config.adapter = async () => {
          return {
            data: { success: true, data: localData },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        };
      } else {
        console.log(`[Offline API] Mocking Mutation to Sync Queue: ${method} ${cleanUrl}`);
        const uniqueId = 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        let opType: 'CREATE' | 'UPDATE' | 'DELETE' = 'CREATE';
        if (method === 'put' || method === 'PUT') opType = 'UPDATE';
        if (method === 'delete' || method === 'DELETE') opType = 'DELETE';

        await enqueueOperation(opType, cleanUrl, method?.toUpperCase() as any, data, uniqueId);
        await applyOptimisticUpdate({
          operationType: opType,
          endpoint: cleanUrl,
          method: method?.toUpperCase() as any,
          payload: data,
          uniqueSyncId: uniqueId,
        });

        config.adapter = async () => {
          return {
            data: { success: true, message: 'Offline request enqueued.', data: { id: uniqueId, ...data } },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        };
      }
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
