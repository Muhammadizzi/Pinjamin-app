"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useT } from "./i18n";
import type { PublicAdmin } from "./auth-types";

type LoginResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  user: PublicAdmin | null;
  loading: boolean;
  login: (
    username: string,
    password: string,
    remember?: boolean
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: PublicAdmin | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isPublicPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/login");
}

function cacheUsername(username: string) {
  try {
    if (username) sessionStorage.setItem("pinjamin_admin_username", username);
    else sessionStorage.removeItem("pinjamin_admin_username");
  } catch {
    /* ignore */
  }
}

export function getCachedAdminUsername() {
  try {
    return sessionStorage.getItem("pinjamin_admin_username") || "admin";
  } catch {
    return "admin";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // AuthProvider dipasang DI DALAM I18nProvider (lihat app/layout.tsx),
  // jadi pesan error login bisa ikut bahasa aktif.
  const { t, serverError } = useT();
  const [user, setUserState] = useState<PublicAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((u: PublicAdmin | null) => {
    setUserState(u);
    cacheUsername(u?.username || "");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const json = await res.json();
      if (json?.profile) setUser(json.profile);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    if (user && pathname.startsWith("/login")) {
      router.replace("/dashboard");
      return;
    }
    if (!user && !isPublicPath(pathname)) {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  const login = useCallback(
    async (username: string, password: string, remember = true) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, remember }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false as const,
            error: serverError(data, t("loginFailed")),
          };
        }
        if (data.profile) setUser(data.profile);
        window.dispatchEvent(new Event("pinjamin:session"));
        return { ok: true as const };
      } catch {
        return {
          ok: false as const,
          error: t("serverUnreachableRetry"),
        };
      }
    },
    [setUser, t, serverError]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      /* cookie tetap dibersihkan server-side jika request sampai */
    }
    setUser(null);
    window.dispatchEvent(new Event("pinjamin:session-end"));
    window.location.replace("/login");
  }, [setUser]);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh, setUser }),
    [user, loading, login, logout, refresh, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
