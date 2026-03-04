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
    <div className="h-screen flex flex-col items-center justify-center" style={{ background: "#06080f" }}>
      <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-[10px] font-mono tracking-wider" style={{ color: "#3d4b63" }}>CONNECTING...</p>
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
          background: "#111827", color: "#e8eaed", borderRadius: "10px", fontSize: "13px",
          border: "1px solid rgba(240,185,11,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(240,185,11,0.05)",
          fontFamily: "Lexend"
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
