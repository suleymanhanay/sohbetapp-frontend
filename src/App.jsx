import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SocketProvider } from "./context/SocketContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0b141a]"><div className="flex flex-col items-center gap-3"><div className="w-12 h-12 border-[3px] border-[#00a884] border-t-transparent rounded-full animate-spin"></div><p className="text-[#8696a0] text-sm mt-2">Yukleniyor...</p></div></div>;
  return user ? children : <Navigate to="/login" />;
}
function AdminRoute({ children }) { const { user, loading } = useAuth(); if (loading) return null; return user?.role === "admin" ? children : <Navigate to="/" />; }
function AppRoutes() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/admin" element={<ProtectedRoute><AdminRoute><SocketProvider><AdminPage /></SocketProvider></AdminRoute></ProtectedRoute>} />
    <Route path="/*" element={<ProtectedRoute><SocketProvider><ChatPage /></SocketProvider></ProtectedRoute>} />
  </Routes></BrowserRouter>;
}
export default function App() {
  return <ThemeProvider><AuthProvider><Toaster position="top-center" toastOptions={{style:{background:"#202c33",color:"#e9edef",borderRadius:"8px",fontSize:"14px",border:"1px solid #2a3942"},duration:3000}} /><AppRoutes /></AuthProvider></ThemeProvider>;
}