import { createContext, useState, useEffect } from 'react';
import API from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser && storedUser !== 'undefined') {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
  const response = await API.post('/Auth/login', credentials);
  const data = response.data;

  // Store token and user details
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user || data));
  
  setUser(data.user || data);
  return data.user || data;
};

  const register = async (userData) => {
    const response = await API.post('/Auth/register', userData);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children} {/* Render children directly so React Router never mounts onto an empty tree */}
    </AuthContext.Provider>
  );
};