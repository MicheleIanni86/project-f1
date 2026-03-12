/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        f1: {
          red: '#dc0000', // Ferrari Red
          dark: '#15151e', // Asfalto scuro
          darker: '#0a0a0f', // Sfondo più scuro
          panel: '#1f1f2e', // Pannelli
          accent: '#00d2be', // Petronas Green
          orange: '#ff8700', // McLaren Orange
          blue: '#1e41ff', // Alpine/Williams/RedBull blue (generic vibrant)
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
