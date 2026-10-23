import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useLocation, Navigate } from "react-router-dom";
import type { Role, User } from "../types/api";
import * as auth from "../services/auth";

type AuthContextValue = { user: User | null; loading: boolean; signIn: (email: string, password: string) => Promise<User>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { auth.restoreSession().then(setUser).finally(() => setLoading(false)); }, []);
  const value = useMemo(() => ({ user, loading, signIn: async (email: string, password: string) => { const next = await auth.login(email, password); setUser(next); return next; }, signOut: async () => { try { await auth.logout(); } finally { setUser(null); } } }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; };
export function Protected({ children, roles }: PropsWithChildren<{ roles?: Role[] }>) { const { user, loading } = useAuth(); const location = useLocation(); if (loading) return <div className="full-loading"><span className="loader" />Loading session…</div>; if (!user) return <Navigate to="/login" state={{ from: location }} replace />; if (roles && !roles.some((role) => user.roles.includes(role))) return <Navigate to="/forbidden" replace />; return <>{children}</>; }
