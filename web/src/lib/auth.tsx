import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api";

type LoginResponse = {
  accessToken: string;
  username: string;
  displayName: string;
  roles: string[];
};

export type DonorRegisterPayload = {
  email: string;
  password: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  organizationName?: string;
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
  login: (username: string, password: string, rememberMe?: boolean, twoFactorCode?: string) => Promise<string[]>;
  acceptExternalToken: (accessToken: string) => Promise<string[]>;
  registerDonor: (payload: DonorRegisterPayload) => Promise<string[]>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "intex_access_token";
const REMEMBER_KEY = "intex_remember_me";

function loadStoredToken(): string | null {
  const persistent = localStorage.getItem(TOKEN_KEY);
  if (persistent) return persistent;
  return sessionStorage.getItem(TOKEN_KEY);
}

function persistToken(token: string, rememberMe: boolean) {
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, "true");
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }

  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

function loadInitial(): AuthState {
  const token = loadStoredToken();
  return { token, username: null, displayName: null, roles: [] };
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => loadInitial());

  useEffect(() => {
    const t = loadStoredToken();
    if (!t) return;
    (async () => {
      try {
        const me = await apiFetch<MeResponse>("/api/auth/me", { token: t });
        setState({
          token: t,
          username: me.username,
          displayName: me.displayName,
          roles: me.roles,
        });
      } catch {
        clearStoredToken();
        setState({ token: null, username: null, displayName: null, roles: [] });
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = !!state.token;
    const hasRole = (role: string) => state.roles.includes(role);

    const login = async (username: string, password: string, rememberMe = false, twoFactorCode?: string) => {
      const res = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, twoFactorCode: twoFactorCode?.trim() || null }),
      });
      persistToken(res.accessToken, rememberMe);
      setState({
        token: res.accessToken,
        username: res.username,
        displayName: res.displayName,
        roles: res.roles,
      });
      return res.roles;
    };

    const acceptExternalToken = async (accessToken: string) => {
      const me = await apiFetch<MeResponse>("/api/auth/me", { token: accessToken });
      persistToken(accessToken, localStorage.getItem(REMEMBER_KEY) === "true");
      setState({
        token: accessToken,
        username: me.username,
        displayName: me.displayName,
        roles: me.roles,
      });
      return me.roles;
    };

    const registerDonor = async (payload: DonorRegisterPayload) => {
      const res = await apiFetch<LoginResponse>("/api/auth/register-donor", {
        method: "POST",
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          displayName: payload.displayName ?? null,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          phone: payload.phone ?? null,
          organizationName: payload.organizationName ?? null,
        }),
      });
      persistToken(res.accessToken, false);
      setState({
        token: res.accessToken,
        username: res.username,
        displayName: res.displayName,
        roles: res.roles,
      });
      return res.roles;
    };

    const logout = () => {
      clearStoredToken();
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

    return { ...state, isAuthenticated, hasRole, login, acceptExternalToken, registerDonor, logout, refreshMe };
  }, [state]);

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

