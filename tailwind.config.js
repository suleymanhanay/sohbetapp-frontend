/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Nunito", "system-ui", "sans-serif"] },
      colors: {
        wa: {
          green: "#00a884", greenDark: "#008069", greenLight: "#d9fdd3", teal: "#00a884",
          dark1: "#111b21", dark2: "#1f2c33", dark3: "#2a3942", dark4: "#233138", panel: "#0b141a",
          header: "#202c33", search: "#2a3942", divider: "#2a3942",
          outgoing: "#005c4b", incoming: "#202c33",
          textPrimary: "#e9edef", textSecondary: "#8696a0", unread: "#00a884",
        }
      }
    }
  },
  plugins: []
};