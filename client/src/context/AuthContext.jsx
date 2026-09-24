import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  const logout = useCallback(() => { tokenStore.set(null); setUser(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout); // expired session -> log out everywhere
    if (!tokenStore.get()) return;
    api.get('/auth/me').then(setUser).catch(logout).finally(() => setLoading(false));
  }, [logout]);

  const handleAuth = ({ token, user }) => { tokenStore.set(token); setUser(user); return user; };
  const login = async creds => handleAuth(await api.post('/auth/login', creds));
  const register = async data => handleAuth(await api.post('/auth/register', data));
  const refresh = async () => setUser(await api.get('/auth/me'));

  const value = useMemo(() => ({
    user, loading, login, register, logout, refresh, setUser,
    isStaff: ['ADMIN', 'VENDOR'].includes(user?.role),
    isAdmin: user?.role === 'ADMIN',
    isStudent: user?.role === 'STUDENT',
  }), [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
