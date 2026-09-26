import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://127.0.0.1:5000/api');

const API = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
    }
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
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
