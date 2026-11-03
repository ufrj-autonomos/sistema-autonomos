"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: "TRAINEE" | "MANAGEMENT" | "MEMBER" | "ADMIN" | string;
  avatar?: string | null;
  status?: string;
  institutionalMemberId?: number | null;
  profileCompletedAt?: string | Date | null;
}

export interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string; user?: SafeUser; firstLogin?: boolean }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string; user?: SafeUser }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<SafeUser | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CHANGE_EVENT = "autonomos:auth-change";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Consulta sessão atual via /api/auth/me
  const refreshSession = useCallback(async (): Promise<SafeUser | null> => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          return data.user;
        }
      }
      setUser(null);
      return null;
    } catch (err) {
      console.error("[AuthProvider] Erro ao sincronizar sessão:", err);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Escuta eventos entre abas e componentes; a rota sincroniza a sessão inicial.
  useEffect(() => {
    const handleAuthChange = () => {
      refreshSession();
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("focus", handleAuthChange);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("focus", handleAuthChange);
    };
  }, [refreshSession]);

  useEffect(() => { refreshSession(); }, [pathname, refreshSession]);

  useEffect(() => {
    if (!isLoading && !user && !['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname)) {
      router.replace('/login');
      router.refresh();
    }
  }, [isLoading, user, pathname, router]);

  // Função de Login
  const login = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; user?: SafeUser; firstLogin?: boolean }> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsLoading(false);
        return {
          success: false,
          error: data.error || "Falha na autenticação. Verifique suas credenciais.",
        };
      }

      setUser(data.user);
      setIsLoading(false);

      // Dispara evento global para sincronizar navbar e outros componentes
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
      }

      return { success: true, user: data.user, firstLogin: Boolean(data.firstLogin) };
    } catch (err) {
      console.error("[AuthProvider] Exceção durante login:", err);
      setIsLoading(false);
      return {
        success: false,
        error: "Erro de comunicação com o servidor de autenticação.",
      };
    }
  };

  // Função de Cadastro
  const register = async ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; user?: SafeUser }> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsLoading(false);
        return {
          success: false,
          error: data.error || "Não foi possível concluir o cadastro.",
        };
      }

      setUser(null);
      setIsLoading(false);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
      }

      return { success: true };
    } catch (err) {
      console.error("[AuthProvider] Exceção durante registro:", err);
      setIsLoading(false);
      return {
        success: false,
        error: "Erro de comunicação com o servidor durante cadastro.",
      };
    }
  };

  // Clear local state only after the server revokes the session.
  const logout = async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Falha ao encerrar sessão');
      setUser(null);
      window.localStorage.setItem(AUTH_CHANGE_EVENT, String(Date.now()));
      window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
      router.replace('/login');
      router.refresh();
    } catch (err) {
      console.error('[AuthProvider] Falha ao sair:', err);
      window.alert('Não foi possível sair da conta. Tente novamente.');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSession must be used within an AuthProvider");
  }
  return context;
}

export const useAuth = useSession;
