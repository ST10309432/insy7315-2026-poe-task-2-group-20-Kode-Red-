import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, tokenStore, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

// NFR-21: log out after 30 minutes without activity; keep active users signed in (sliding session).
const IDLE_LIMIT_MS = 30 * 60 * 1000;
const REFRESH_AFTER_MS = 10 * 60 * 1000; // renew the 30-minute token once it is 10 minutes old
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

/** When the current token was issued (from its "iat" claim), in ms. */
function tokenIssuedAt(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).iat * 1000; }
  catch { return 0; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  const [sessionNotice, setSessionNotice] = useState('');
  const lastActivity = useRef(0);
  const logout = useCallback(() => { tokenStore.set(null); setUser(null); }, []);

  // Inactivity timeout + sliding session (NFR-21)
  useEffect(() => {
    if (!user) return undefined;
    lastActivity.current = Date.now();
    const markActive = () => { lastActivity.current = Date.now(); };
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, markActive, { passive: true }));
    const timer = setInterval(async () => {
      const now = Date.now();
      if (now - lastActivity.current >= IDLE_LIMIT_MS) {
        setSessionNotice('You were logged out after 30 minutes of inactivity.');
        logout();
        return;
      }
      const token = tokenStore.get();
      if (token && now - tokenIssuedAt(token) >= REFRESH_AFTER_MS) {
        try { const { token: fresh } = await api.post('/auth/refresh'); tokenStore.set(fresh); }
        catch { /* expired already: the API's 401 handler logs the user out */ }
      }
    }, 60 * 1000);
    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, markActive));
    };
  }, [user, logout]);

  useEffect(() => {
    setUnauthorizedHandler(logout); // expired session -> log out everywhere
    if (!tokenStore.get()) return;
    api.get('/auth/me').then(setUser).catch(logout).finally(() => setLoading(false));
  }, [logout]);

  const handleAuth = ({ token, user }) => { tokenStore.set(token); setUser(user); setSessionNotice(''); return user; };
  const login = async creds => handleAuth(await api.post('/auth/login', creds));
  const register = async data => handleAuth(await api.post('/auth/register', data));
  const refresh = async () => setUser(await api.get('/auth/me'));
  const becomeStudent = async data => handleAuth(await api.post('/auth/me/student', data));
  const changePassword = async data => handleAuth(await api.patch('/auth/me/password', data));

  const value = useMemo(() => ({
    user, loading, login, register, logout, refresh, setUser, becomeStudent, changePassword, sessionNotice,
    isStaff: ['ADMIN', 'VENDOR'].includes(user?.role),
    isAdmin: user?.role === 'ADMIN',
    isStudent: user?.role === 'STUDENT',
  }), [user, loading, logout, sessionNotice]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
