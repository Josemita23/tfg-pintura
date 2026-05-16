import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { setAuthToken } from "../../services/api";

export type AuthUser = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_staff: boolean;
};

type StoredAuth = {
  user: AuthUser;
  token: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
};

const storageKey = "pintura-plus-auth-user";

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAuth() {
  const storedAuth = window.localStorage.getItem(storageKey);

  if (!storedAuth) {
    return null;
  }

  try {
    const parsedAuth = JSON.parse(storedAuth) as StoredAuth;

    if (!parsedAuth.user || !parsedAuth.token) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    return parsedAuth;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => {
    const storedAuth = getStoredAuth();
    setAuthToken(storedAuth?.token ?? null);
    return storedAuth;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: auth?.user ?? null,
      token: auth?.token ?? null,
      isAuthenticated: Boolean(auth?.user && auth?.token),
      login: (nextUser, nextToken) => {
        const nextAuth = { user: nextUser, token: nextToken };
        window.localStorage.setItem(storageKey, JSON.stringify(nextAuth));
        setAuthToken(nextToken);
        setAuth(nextAuth);
      },
      updateUser: (nextUser) => {
        if (!auth?.token) {
          return;
        }

        const nextAuth = { user: nextUser, token: auth.token };
        window.localStorage.setItem(storageKey, JSON.stringify(nextAuth));
        setAuth(nextAuth);
      },
      logout: () => {
        window.localStorage.removeItem(storageKey);
        setAuthToken(null);
        setAuth(null);
      },
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
