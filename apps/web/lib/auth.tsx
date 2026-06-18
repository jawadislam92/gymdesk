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

/** Shape returned by POST /platform/support-access/redeem. */
export interface SupportRedeem {
  accessToken: string;
  expiresAt: string;
  grantExpiresAt: string;
  scope: 'read_only' | 'full';
  permissions: string[];
  gym: { id: string; name: string; slug: string };
}

/** The active support session an operator is currently inside (in-memory only). */
export interface SupportSession {
  gymId: string;
  gymName: string;
  scope: 'read_only' | 'full';
  /** When the current session token expires (the practical limit). */
  expiresAt: string;
}

interface AuthState {
  user: MeUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<MeUser>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  /** True when the account is a plain member (no staff role) → member portal. */
  isMemberOnly: boolean;
  /** True for the platform operator (super admin) → platform console. */
  isPlatformAdmin: boolean;
  /** Non-null while the operator is inside a consented support session. */
  support: SupportSession | null;
  /** Swap into a scoped support session (token + synthetic gym-staff identity). */
  enterSupport: (redeem: SupportRedeem) => void;
  /** Leave the support session and restore the operator's own login. */
  exitSupport: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const REFRESH_KEY = 'gymflow_refresh';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [support, setSupport] = useState<SupportSession | null>(null);

  const loadMe = useCallback(async () => {
    const me = await apiFetch<MeUser>('/auth/me');
    setUser(me);
    return me;
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
      return loadMe();
    },
    [applyTokens, loadMe],
  );

  const logout = useCallback(() => {
    void apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAccessToken(null);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  }, []);

  // Enter a support session: keep the operator's refresh token in localStorage
  // untouched, but swap the in-memory access token + identity to the scoped gym
  // one. A full reload (which refreshes from the stored RT) exits the session.
  const enterSupport = useCallback((r: SupportRedeem) => {
    setAccessToken(r.accessToken);
    setUser({
      id: 'support',
      email: null,
      fullName: `Support · ${r.gym.name}`,
      gymId: r.gym.id,
      roles: ['support'],
      permissions: r.permissions,
    });
    setSupport({ gymId: r.gym.id, gymName: r.gym.name, scope: r.scope, expiresAt: r.expiresAt });
  }, []);

  const exitSupport = useCallback(async () => {
    setSupport(null);
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
        return;
      } catch {
        // fall through to a clean logout
      }
    }
    setAccessToken(null);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  }, [applyTokens, loadMe]);

  const hasPermission = useCallback(
    (permission: string) => Boolean(user?.permissions.includes(permission)),
    [user],
  );

  const isMemberOnly = Boolean(
    user && user.roles.includes('member') && !user.roles.some((r) => r !== 'member'),
  );
  const isPlatformAdmin = Boolean(user?.permissions.includes('platform.manage'));

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        hasPermission,
        isMemberOnly,
        isPlatformAdmin,
        support,
        enterSupport,
        exitSupport,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
