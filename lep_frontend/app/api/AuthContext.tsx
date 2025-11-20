'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch } from "@/app/api/api";

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  accessToken: string | null;
  user: User | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null
  );
  const [user, setUser] = useState<User | null>(
    typeof window !== "undefined" && localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user")!)
      : null
  );

  const login = async (email: string, password: string, rememberMe: boolean) => {
    const data = await apiFetch<{ access: string; refresh: string }>("users/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setAccessToken(data.access);
    setRefreshToken(data.refresh);

    if (rememberMe) {
      localStorage.setItem("accessToken", data.access);
      localStorage.setItem("refreshToken", data.refresh);
    }

    const userData = await apiFetch<User>("users/me/", {
      method: "GET",
      headers: { Authorization: `Bearer ${data.access}` },
    });

    setUser(userData);
    if (rememberMe) {
      localStorage.setItem("user", JSON.stringify(userData));
    }
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  };

  useEffect(() => {
    if (!refreshToken) return;

    const refreshAccess = async () => {
      try {
        const data = await apiFetch<{ access: string; refresh: string }>("users/refresh/", {
          method: "POST",
          body: JSON.stringify({ refresh: refreshToken }),
        });

        setAccessToken(data.access);
        setRefreshToken(data.refresh);
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);

        // Обновляем данные пользователя после обновления токена
        const userData = await apiFetch<User>("users/me/", {
          method: "GET",
          headers: { Authorization: `Bearer ${data.access}` },
        });
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } catch {
        logout();
      }
    };

    const interval = setInterval(refreshAccess, 25 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  return (
    <AuthContext.Provider value={{ accessToken, user, login, logout }}>

        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};