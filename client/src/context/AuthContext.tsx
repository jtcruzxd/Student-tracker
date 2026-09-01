import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../api/client';

interface AuthUser {
  userId: string;
  username: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // On mount, verify stored token with the server
  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { setLoading(false); return; }

    api.get('/auth/me', {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then(res => {
        setUser(res.data.data.user);
        setToken(stored);
      })
      .catch(() => {
        // Token is expired or invalid — clear it
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    const { token: jwt, user: authUser } = res.data.data;
    localStorage.setItem('token', jwt);
    setToken(jwt);
    setUser(authUser);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
