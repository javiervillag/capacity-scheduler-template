import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        line: "#d8dee6",
        panel: "#f6f8fa",
        accent: "#1264a3",
        mint: "#2f8f70",
        amber: "#b7791f",
        rose: "#b8325f"
      }
    }
  },
  plugins: []
};

export default config;
