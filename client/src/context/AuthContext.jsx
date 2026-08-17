// Owns auth state for the whole app: current user, and the
// login/register/logout actions. Reads/writes the JWT to localStorage
// directly (per the spec's chosen storage approach) rather than a
// cookie, so apiFetch (which reads localStorage itself) and this
// context always agree on where the token lives.
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // True until the stored-token check below settles. Route guards must
  // wait on this — without it a page refresh renders with user === null
  // for a tick and redirects a perfectly valid session to /login.
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session from the stored token on mount. The token alone
  // isn't enough — the rest of the app needs `user`, and only the server
  // can tell us whether the token is still valid, so ask /api/auth/me.
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setToken(storedToken);

    // If a login/logout lands while this check is in flight, its result
    // is about a token nobody is using any more — ignore it either way
    // rather than overwriting fresher state.
    const isStale = () => cancelled || localStorage.getItem('token') !== storedToken;

    apiFetch('/api/auth/me')
      .then((data) => {
        if (!isStale()) setUser(data.user);
      })
      .catch(() => {
        // Expired or otherwise rejected — drop it so we don't keep
        // sending a dead token, and fall through to /login.
        if (isStale()) return;
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (username, email, password) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
