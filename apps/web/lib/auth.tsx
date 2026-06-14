'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, setAccessToken } from './api';

export interface MeUser {
  id: string;
  email: string | null;
  fullName: string;
  gymId: string | null;
  roles: string[];
  permissions: string[];
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: MeUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);
const REFRESH_KEY = 'gymflow_refresh';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const me = await apiFetch<MeUser>('/auth/me');
    setUser(me);
  }, []);

  const applyTokens = useCallback((tokens: Tokens) => {
    setAccessToken(tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }, []);

  // On first load, try to restore a session from the stored refresh token.
  useEffect(() => {
    (async () => {
      const rt = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
      if (rt) {
        try {
          const tokens = await apiFetch<Tokens>('/auth/refresh', {
            method: 'POST',
            auth: false,
            body: JSON.stringify({ refreshToken: rt }),
          });
          applyTokens(tokens);
          await loadMe();
        } catch {
          localStorage.removeItem(REFRESH_KEY);
        }
      }
      setLoading(false);
    })();
  }, [applyTokens, loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await apiFetch<Tokens>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email, password }),
      });
      applyTokens(tokens);
      await loadMe();
    },
    [applyTokens, loadMe],
  );

  const logout = useCallback(() => {
    void apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAccessToken(null);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (permission: string) => Boolean(user?.permissions.includes(permission)),
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
