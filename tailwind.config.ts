import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Toyota brand
        toyota: {
          red: "#EB0A1E",
          dark: "#0A0A0A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
