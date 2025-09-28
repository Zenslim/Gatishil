/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      backdropBlur: {
        xs: '2px'
      },
      boxShadow: {
        glow: "0 0 40px rgba(251,191,36,0.15)"
      },
      colors: {
        ink: "#0b0b0c"
      }
    }
  },
  plugins: []
};