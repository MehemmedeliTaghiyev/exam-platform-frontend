import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { isAiEnabled, normalizeRole } from '../lib/utils';
import { localDb } from '../lib/localDb';
import { Button } from '../components/ui';

export const AuthContext = createContext();

function normalizeUser(raw) {
  if (!raw) return null;
  const user = raw.user || raw;
  const id = user.id || user.userId;
  const rawAi = user.aiEnabled ?? user.AiEnabled;
  const aiEnabled = rawAi != null ? isAiEnabled(user) : Boolean(id && localDb.getTeacherAi(id));
  return {
    ...user,
    id,
    fullName: user.fullName || user.name,
    role: normalizeRole(user.role || user.roles?.[0]),
    email: user.email,
    userName: user.userName || user.username,
    teacherId: user.teacherId ?? user.TeacherId ?? (normalizeRole(user.role || user.roles?.[0]) === 'Teacher' ? id : null),
    groupName: user.groupName || user.GroupName || '',
    groupId: user.groupId ?? user.GroupId ?? null,
    aiEnabled,
    billingPlan: user.billingPlan || user.BillingPlan || '',
    trialEndsAt: user.trialEndsAt || user.TrialEndsAt || null,
    trialStartsAt: user.trialStartsAt || user.TrialStartsAt || null,
    trialDays: user.trialDays ?? user.TrialDays ?? null,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessClosed, setAccessClosed] = useState(false);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    setUser(null);
  };

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

  useEffect(() => {
    const onClosed = () => {
      logout();
      setAccessClosed(true);
    };
    window.addEventListener('access-closed', onClosed);
    return () => window.removeEventListener('access-closed', onClosed);
  }, []);

  const login = async (credentials) => {
    const payload = {
      ...credentials,
      email: String(credentials?.email || '').trim(),
      password: credentials?.password ?? '',
    };
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await API.post('/Auth/login', payload, { timeout: 25000 });
        const data = response.data;
        const token = data.token || data.accessToken;
        const normalized = normalizeUser(data);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(normalized));
        if (normalized?.id) localStorage.setItem('userId', String(normalized.id));
        setAccessClosed(false);
        setUser(normalized);
        return normalized;
      } catch (err) {
        lastError = err;
        const status = err?.response?.status;
        const retryable = !status || status === 502 || status === 503 || status === 504 || err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK';
        if (!retryable || attempt === 2) throw err;
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
    throw lastError;
  };

  const register = async (userData) => {
    const response = await API.post('/Auth/register', userData);
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, accessClosed, setAccessClosed }}>
      {accessClosed && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-slate-900">
            <h1 className="text-2xl font-bold text-ink dark:text-white">Pəncərə bağlıdır</h1>
            <p className="mt-3 text-sm text-gray-500">
              Hesabınızın girişi bağlanıb. Ödəniş edəndən sonra admin pəncərəni açacaq.
            </p>
            <Button
              className="mt-6 w-full"
              onClick={() => {
                setAccessClosed(false);
                navigate('/login');
              }}
            >
              Giriş səhifəsinə qayıt
            </Button>
          </div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};
