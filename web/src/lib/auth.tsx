import React, { createContext, useContext, useMemo, useState } from "react";
import { apiFetch } from "./api";

type LoginResponse = {
  accessToken: string;
  username: string;
  displayName: string;
  roles: string[];
};

type MeResponse = {
  username: string;
  displayName: string;
  roles: string[];
};

type AuthState = {
  token: string | null;
  username: string | null;
  displayName: string | null;
  roles: string[];
};

type AuthContextValue = AuthState & {
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "intex_access_token";

function loadInitial(): AuthState {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return { token, username: null, displayName: null, roles: [] };
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => loadInitial());

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = !!state.token;
    const hasRole = (role: string) => state.roles.includes(role);

    const login = async (username: string, password: string) => {
      const res = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      sessionStorage.setItem(TOKEN_KEY, res.accessToken);
      setState({
        token: res.accessToken,
        username: res.username,
        displayName: res.displayName,
        roles: res.roles,
      });
    };

    const logout = () => {
      sessionStorage.removeItem(TOKEN_KEY);
      setState({ token: null, username: null, displayName: null, roles: [] });
    };

    const refreshMe = async () => {
      if (!state.token) return;
      const me = await apiFetch<MeResponse>("/api/auth/me", { token: state.token });
      setState((prev) => ({
        ...prev,
        username: me.username,
        displayName: me.displayName,
        roles: me.roles,
      }));
    };

    return { ...state, isAuthenticated, hasRole, login, logout, refreshMe };
  }, [state]);

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

