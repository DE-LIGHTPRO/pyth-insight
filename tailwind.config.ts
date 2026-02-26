import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pyth brand palette
        pyth: {
          purple: "#6B21A8",
          blue: "#1E40AF",
          cyan: "#06B6D4",
        },
        // Calibration health colors
        health: {
          good: "#22C55E",
          medium: "#EAB308",
          poor: "#F97316",
          critical: "#EF4444",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "price-up": "priceUp 0.5s ease-out",
        "price-down": "priceDown 0.5s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        priceUp: {
          "0%": { backgroundColor: "rgba(34, 197, 94, 0.3)" },
          "100%": { backgroundColor: "transparent" },
        },
        priceDown: {
          "0%": { backgroundColor: "rgba(239, 68, 68, 0.3)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
