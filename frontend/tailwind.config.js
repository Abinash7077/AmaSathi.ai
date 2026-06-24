/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefaf4",
          100: "#d6f3e3",
          500: "#1f9d6b",
          600: "#178356",
          700: "#126844",
        },
      },
    },
  },
  plugins: [],
};
