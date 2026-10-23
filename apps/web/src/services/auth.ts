import { api, json, setCsrfToken } from "./api";
import type { User } from "../types/api";

export const restoreSession = async () => {
  try {
    const csrf = await api<{ csrfToken: string }>("/auth/csrf");
    setCsrfToken(csrf.csrfToken);
    return (await api<{ user: User }>("/auth/me")).user;
  } catch { return null; }
};
export const login = async (email: string, password: string) => {
  const result = await api<{ user: User; csrfToken: string }>("/auth/login", json({ email, password }));
  setCsrfToken(result.csrfToken);
  return result.user;
};
export const logout = () => api<void>("/auth/logout", { method: "POST" });
