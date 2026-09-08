import axios from 'axios';

const API = axios.create({
  baseURL: 'https://localhost:7216/api', // Adjust to your .NET backend port
});

// Automatically inject JWT token into headers
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;