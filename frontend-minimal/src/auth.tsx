import { createContext, use, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "./api";

export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  nickname?: string;
  about_me?: string;
  is_public?: boolean;
  followers_count?: number;
  following_count?: number;
};

export type RegisterInput = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  avatar?: string;
  nickname?: string;
  about_me?: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const me = await apiFetch<User>("/auth/me", { signal: controller.signal });
      clearTimeout(id);
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ data: { user: User } }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(res.data.user);
    await refresh();
  };

  const register = async (input: RegisterInput) => {
    await apiFetch("/auth/register", { method: "POST", body: input });
    await login(input.email, input.password);
  };

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
