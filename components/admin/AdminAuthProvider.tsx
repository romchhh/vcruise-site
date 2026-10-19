"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminSession = {
  login: string;
  name: string;
  roleId: string;
  permissions: string[];
};

type AdminAuthContextValue = {
  session: AdminSession | null;
  ready: boolean;
  login: (
    login: string,
    password: string,
    remember: boolean
  ) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/login")
      .then(async (response) => {
        if (!response.ok) {
          setSession(null);
          return;
        }
        const data = await response.json();
        setSession({
          login: data.login,
          name: data.name,
          roleId: data.roleId,
          permissions: data.permissions || [],
        });
      })
      .catch(() => setSession(null))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(
    async (loginValue: string, password: string, remember: boolean) => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginValue, password, remember }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      setSession({
        login: data.login,
        name: data.name,
        roleId: data.roleId,
        permissions: data.permissions || [],
      });
      return true;
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, ready, login, logout }),
    [session, ready, login, logout]
  );

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
