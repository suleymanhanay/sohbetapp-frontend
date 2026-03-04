import { io } from "socket.io-client";
const URL = import.meta.env.VITE_SOCKET_URL || "https://sohbetapp-backend.onrender.com";
let socket = null;
export function connectSocket(token) {
  if (socket?.connected) return socket;
  socket = io(URL, { auth: { token }, transports: ["websocket","polling"], reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 2000 });
  return socket;
}
export function getSocket() { return socket; }
export function disconnectSocket() { if (socket) { socket.disconnect(); socket = null; } }
