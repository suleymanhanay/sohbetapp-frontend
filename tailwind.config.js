/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"] },
      colors: {
        brand: { 50:"#eef7ff",100:"#d9ecff",200:"#bcdfff",300:"#8eccff",400:"#58b0ff",500:"#3291ff",600:"#1c72f5",700:"#155ce1",800:"#184ab6",900:"#19418f",950:"#142957" }
      },
      animation: { "fade-in":"fadeIn .3s ease-out","slide-up":"slideUp .3s ease-out","pulse-dot":"pulseDot 2s ease-in-out infinite" },
      keyframes: {
        fadeIn: { "0%":{opacity:"0"},"100%":{opacity:"1"} },
        slideUp: { "0%":{opacity:"0",transform:"translateY(10px)"},"100%":{opacity:"1",transform:"translateY(0)"} },
        pulseDot: { "0%,100%":{opacity:"1"},"50%":{opacity:"0.5"} }
      }
    }
  },
  plugins: []
};
