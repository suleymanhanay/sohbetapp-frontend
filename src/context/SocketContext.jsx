import { createContext, useContext, useEffect, useState } from "react";
import { connectSocket, disconnectSocket } from "../utils/socket";
import { useAuth } from "./AuthContext";
const SocketContext = createContext(null);
export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  useEffect(() => { if (token && user) { const s = connectSocket(token); setSocket(s); s.on("connect", () => setConnected(true)); s.on("disconnect", () => setConnected(false)); s.on("onlineUsers", (u) => setOnlineUsers(u)); return () => { disconnectSocket(); setSocket(null); setConnected(false); }; } }, [token, user]);
  const isUserOnline = (id) => onlineUsers.some(u => u.id === id);
  return <SocketContext.Provider value={{socket,onlineUsers,connected,isUserOnline}}>{children}</SocketContext.Provider>;
}
export function useSocket() { return useContext(SocketContext); }
