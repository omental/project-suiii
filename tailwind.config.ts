import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        suii: {
          black: "#050505",
          panel: "#111211",
          card: "#171817",
          line: "#2d302d",
          muted: "#a4a7a0",
          lime: "#c6ff24",
          gold: "#d7ac45",
          blue: "#58a8ff",
          amber: "#ffb238"
        }
      },
      fontFamily: {
        display: ["var(--font-oswald)", "Impact", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        suii: "0 20px 60px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
