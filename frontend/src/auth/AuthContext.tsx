import { createContext, useMemo, useState } from "react";

import { authApi } from "../api/auth";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("access_token"),
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,

      async login(username: string, password: string) {
        const tokens = await authApi.login({
          username,
          password,
        });

        localStorage.setItem("access_token", tokens.access);
        localStorage.setItem("refresh_token", tokens.refresh);

        setIsAuthenticated(true);
      },

      logout() {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");

        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
