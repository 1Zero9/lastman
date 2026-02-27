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
        rvr: {
          maroon: "#731C2D",
          "maroon-dark": "#5a1624",
          "maroon-light": "#8e2438",
          "maroon-muted": "#f5eaea",
          silver: "#C0C0C0",
          "silver-dark": "#A0A0A0",
          black: "#000000",
        },
      },
    },
  },
  plugins: [],
};
export default config;
