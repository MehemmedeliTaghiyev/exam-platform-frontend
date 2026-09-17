import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

const API = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err?.response?.data;
    const code = data instanceof Blob ? undefined : data?.code;
    const url = String(err?.config?.url || '');
    const isLogin = url.includes('/Auth/login');
    if (!isLogin && err?.response?.status === 403 && code === 'ACCESS_CLOSED') {
      window.dispatchEvent(new CustomEvent('access-closed'));
    }
    return Promise.reject(err);
  },
);

export default API;
