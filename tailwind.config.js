/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gym: {
          dark: '#1a1a1a',
          darker: '#0f0f0f',
          red: '#e31837',
          'red-dark': '#b8102a',
          gray: '#2d2d2d',
          'gray-light': '#3d3d3d',
        }
      }
    },
  },
  plugins: [],
}