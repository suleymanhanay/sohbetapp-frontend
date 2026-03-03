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
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>;
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
  return <ThemeProvider><AuthProvider><Toaster position="top-center" toastOptions={{className:"!bg-slate-800 !text-white !text-sm",duration:3000}} /><AppRoutes /></AuthProvider></ThemeProvider>;
}
