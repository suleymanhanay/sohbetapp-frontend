import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";
const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (token) api.get("/auth/me").then(r => setUser(r.data.user)).catch(() => logout()).finally(() => setLoading(false)); else setLoading(false); }, [token]);
  const login = async (u, p) => { const r = await api.post("/auth/login", { username: u, password: p }); localStorage.setItem("token", r.data.token); setToken(r.data.token); setUser(r.data.user); return r.data.user; };
  const register = async (u, p, d) => { const r = await api.post("/auth/register", { username: u, password: p, displayName: d }); localStorage.setItem("token", r.data.token); setToken(r.data.token); setUser(r.data.user); return r.data.user; };
  const logout = () => { localStorage.removeItem("token"); setToken(null); setUser(null); };
  const updateUser = d => setUser(p => ({ ...p, ...d }));
  return <Ctx.Provider value={{ user, token, loading, login, register, logout, updateUser }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
