import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        village: {
          50: "#f2f8f4",
          100: "#dceee1",
          200: "#b8dfc4",
          300: "#88c89c",
          400: "#4eab70",
          500: "#287a4b",
          600: "#1f6540",
          700: "#194f34",
          800: "#14402a",
          900: "#123326",
          950: "#0a1f17",
        },
        sand: "#f5f1e8",
      },
      boxShadow: {
        soft: "0 24px 60px -28px rgba(18, 51, 38, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
