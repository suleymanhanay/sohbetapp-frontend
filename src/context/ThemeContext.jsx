import { createContext, useContext, useState, useEffect } from "react";
const ThemeContext = createContext(null);
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); localStorage.setItem("theme", theme); }, [theme]);
  const toggleTheme = () => setTheme(p => p === "dark" ? "light" : "dark");
  return <ThemeContext.Provider value={{theme,setTheme,toggleTheme}}>{children}</ThemeContext.Provider>;
}
export function useTheme() { const c = useContext(ThemeContext); if (!c) throw new Error("useTheme must be used within ThemeProvider"); return c; }
