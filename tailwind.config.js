/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rubik', 'Heebo', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd2ff",
          300: "#8eb4ff",
          400: "#598bff",
          500: "#3563eb",
          600: "#244ed1",
          700: "#1e3da8",
          800: "#1f3686",
          900: "#1f316b",
        },
      },
    },
  },
  plugins: [],
};
