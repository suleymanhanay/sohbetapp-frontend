import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "https://sohbetapp-backend.onrender.com";
const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 15000 });
api.interceptors.request.use((c) => { const t = localStorage.getItem("token"); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use((r) => r, (e) => { if (e.response?.status === 401) { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/login"; } return Promise.reject(e); });
export default api;
export { API_URL };