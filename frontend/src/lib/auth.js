import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "./api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const refresh = () => api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(false));
  useEffect(() => {
    refresh();
  }, []);
  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(false);
  };
  const can = (p) => !!user && user.permissions?.includes(p);
  return <AuthCtx.Provider value={{ user, setUser, logout, can, refresh }}>{children}</AuthCtx.Provider>;
}

export function RequireAuth({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === null) return <div className="admin p-10" data-testid="auth-loading">Checking your session…</div>;
  if (!user) return <Navigate to={`/admin/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return children;
}
