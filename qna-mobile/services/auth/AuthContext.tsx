import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import {
  AuthApiError,
  type AuthUser,
  createAuthClient,
  type LoginInput,
  type RegisterInput,
} from './api';
import { useRuntimeApiUrl } from '../config';
import { tokenStorage } from './token-storage';

type AuthContextValue = {
  loading: boolean;
  token: string | null;
  user: AuthUser | null;
  login(input: LoginInput, options?: { returnTo?: string | null }): Promise<void>;
  register(input: RegisterInput, options?: { returnTo?: string | null }): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const apiUrl = useRuntimeApiUrl();
  const authClient = useMemo(() => createAuthClient({ apiUrl }), [apiUrl]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const storedToken = await tokenStorage.get();
      if (!storedToken) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const currentUser = await authClient.me(storedToken);
        if (!mounted) return;
        setToken(storedToken);
        setUser(currentUser);
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 401) {
          await tokenStorage.clear();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadSession();

    return () => {
      mounted = false;
    };
  }, [authClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      token,
      user,
      async login(input, options) {
        const result = await authClient.login(input);
        await tokenStorage.set(result.token);
        setToken(result.token);
        setUser(result.user);
        router.replace(getSafeReturnPath(options?.returnTo));
      },
      async register(input, options) {
        const result = await authClient.register(input);
        await tokenStorage.set(result.token);
        setToken(result.token);
        setUser(result.user);
        router.replace(getSafeReturnPath(options?.returnTo));
      },
      async logout() {
        await tokenStorage.clear();
        setToken(null);
        setUser(null);
        router.replace('/');
      },
    }),
    [authClient, loading, router, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function getSafeReturnPath(returnTo?: string | null): Href {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) return '/';

  return returnTo as Href;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return value;
}
