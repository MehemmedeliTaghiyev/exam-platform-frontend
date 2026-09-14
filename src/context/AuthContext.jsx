import { createContext, useState, useEffect } from 'react';
import API from '../api/axios';
import { normalizeRole } from '../lib/utils';

export const AuthContext = createContext();

function normalizeUser(raw) {
  if (!raw) return null;
  const user = raw.user || raw;
  return {
    ...user,
    id: user.id || user.userId,
    fullName: user.fullName || user.name,
    role: normalizeRole(user.role || user.roles?.[0]),
    email: user.email,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (token && storedUser && storedUser !== 'undefined') {
        setUser(normalizeUser(JSON.parse(storedUser)));
      }
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const response = await API.post('/Auth/login', credentials);
    const data = response.data;
    const token = data.token || data.accessToken;
    const normalized = normalizeUser(data);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(normalized));
    if (normalized?.id) localStorage.setItem('userId', String(normalized.id));
    setUser(normalized);
    return normalized;
  };

  const register = async (userData) => {
    const response = await API.post('/Auth/register', userData);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
