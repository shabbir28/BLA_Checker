import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Auth Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bla_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('bla_token');
      localStorage.removeItem('bla_user');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const dncApi = {
  getStats: () => api.get('/dnc/stats'),
  list: (params) => api.get('/dnc/list', { params }),
  upload: (formData, onProgress) =>
    api.post('/dnc/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }),
  addSingle: (data) => api.post('/dnc/single', data),
  delete: (id) => api.delete(`/dnc/${id}`),
  getExportUrl: (source = 'ALL') => {
    const token = localStorage.getItem('bla_token') || '';
    return `/api/dnc/export?source=${encodeURIComponent(source)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  },
};

export const sessionApi = {
  preview: (formData, onProgress) =>
    api.post('/sessions/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }),
  start: (data) => api.post('/sessions/start', data),
  list: (params) => api.get('/sessions/list', { params }),
  get: (id) => api.get(`/sessions/${id}`),
  getRecords: (id, params) => api.get(`/sessions/${id}/records`, { params }),
  delete: (id) => api.delete(`/sessions/${id}`),
  getCleanExportUrl: (id, format = 'csv') => {
    const token = localStorage.getItem('bla_token') || '';
    return `/api/sessions/${id}/export/clean?format=${format}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  },
  getFullExportUrl: (id, format = 'csv') => {
    const token = localStorage.getItem('bla_token') || '';
    return `/api/sessions/${id}/export/full?format=${format}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  },
};

export const adminApi = {
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getApiConfig: () => api.get('/admin/api-config'),
  updateApiConfig: (data) => api.put('/admin/api-config', data),
  testConnection: (data) => api.post('/admin/test-connection', data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

export default api;
