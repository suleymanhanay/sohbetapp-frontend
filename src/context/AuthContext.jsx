import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (token) { api.get("/auth/me").then(r => setUser(r.data.user)).catch(() => logout()).finally(() => setLoading(false)); } else setLoading(false); }, [token]);
  const login = async (username, password) => { const r = await api.post("/auth/login", { username, password }); localStorage.setItem("token", r.data.token); localStorage.setItem("user", JSON.stringify(r.data.user)); setToken(r.data.token); setUser(r.data.user); return r.data.user; };
  const register = async (username, password, displayName) => { const r = await api.post("/auth/register", { username, password, displayName }); localStorage.setItem("token", r.data.token); localStorage.setItem("user", JSON.stringify(r.data.user)); setToken(r.data.token); setUser(r.data.user); return r.data.user; };
  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setToken(null); setUser(null); };
  const updateUser = (d) => { setUser(p => ({...p,...d})); localStorage.setItem("user", JSON.stringify({...user,...d})); };
  return <AuthContext.Provider value={{user,token,loading,login,register,logout,updateUser}}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
