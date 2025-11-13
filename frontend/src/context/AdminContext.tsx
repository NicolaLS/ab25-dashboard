import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { API_BASE_URL } from "../config";

const ADMIN_TOKEN_KEY = "dashboard_admin_token";

interface AdminContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(ADMIN_TOKEN_KEY);
    }
    return null;
  });

  useEffect(() => {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  }, [token]);

  const login = async (newToken: string): Promise<boolean> => {
    // Validate token by trying to use it
    try {
      const base =
        API_BASE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");
      const url = new URL("/v1/admin/auth/login", base);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: newToken }),
      });

      if (response.ok) {
        setToken(newToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AdminContext.Provider
      value={{
        token,
        isAuthenticated: Boolean(token),
        login,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
}
