import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-3" style={{background:"#09090B"}}>
      <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
      <p className="mono text-[11px] text-zinc-600 tracking-wider">CONNECTING</p>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  return user?.role === "admin" ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" toastOptions={{
        style: {
          background: "#18181B",
          color: "#FAFAFA",
          borderRadius: "10px",
          fontSize: "13px",
          border: "1px solid #27272A",
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
          fontFamily: "Sora, sans-serif"
        },
        duration: 2500
      }} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={<Protected><AdminOnly><SocketProvider><AdminPage /></SocketProvider></AdminOnly></Protected>} />
          <Route path="/*" element={<Protected><SocketProvider><ChatPage /></SocketProvider></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
